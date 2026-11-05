/**
 * Authentication & Profile State Management (Zustand)
 *
 * Cloud authentication is fail-closed: if Supabase is not configured, no fake
 * account is created. Guest mode remains available and is always local-only.
 * Every local read/write is scoped to the account id set here.
 */
import { create } from 'zustand';
import AsyncStorage from '@react-native-async-storage/async-storage';
import * as Crypto from 'expo-crypto';
import * as Linking from 'expo-linking';
import { supabase, isSupabaseConfigured } from '../db/supabase';
import { templateRepo } from '../db/repositories/templateRepo';
import { habitRepo } from '../db/repositories/habitRepo';
import { planRepo } from '../db/repositories/planRepo';
import { notesRepo } from '../db/repositories/notesRepo';
import { buildInitialDailyPlans, buildOnboardingTemplates, buildStarterHabits } from '../services/onboardingPlan';
import { wipeAllLocalData } from '../services/localData';
import { getSecureItem, setSecureItem, deleteSecureItem, SECURE_STORAGE_KEYS } from '../services/secureStorage';
import { cancelReminderNotifications } from '../services/notifications';
import { setActiveLocalUserId } from '../utils/localScope';
import { getLocalDateString } from '../utils/date';
import { resetInMemoryStores } from './resetStores';
import { describeAuthError } from '../services/supabaseErrors';
import { withRetry } from '../services/supabaseRetry';

export interface BaselineHabits {
  sleepHours: number;
  movementLevel: 'light' | 'moderate' | 'active';
  hydrationGoalGlasses: number;
  stressLevel: 'low' | 'moderate' | 'high';
}

export interface MedicationSetupItem {
  id: string;
  label: string;
  time: string;
  frequency: string;
}

export interface OnboardingData {
  age: number;
  doctorRecommendationsText?: string;
  medicationReminders: MedicationSetupItem[];
  baselineHabits: BaselineHabits;
  personalGoals: string[];
}

export interface UserProfile {
  id: string;
  email: string;
  age?: number;
  isGuest: boolean;
  isOnboarded: boolean;
}

interface CloudProfileResult {
  profile: UserProfile;
  needsRestore: boolean;
  restoreAvailable: boolean;
}

interface AuthState {
  user: UserProfile | null;
  isLoading: boolean;
  error: string | null;
  needsRestore: boolean;
  restoreAvailable: boolean;
  deletionNotice: boolean;
  passwordRecovery: boolean;
  initializeAuth: () => Promise<void>;
  login: (email: string, pass: string) => Promise<{ success: boolean; error?: string; message?: string }>;
  signup: (email: string, pass: string) => Promise<{ success: boolean; error?: string; message?: string }>;
  requestPasswordReset: (email: string) => Promise<{ success: boolean; error?: string; message?: string }>;
  updatePassword: (password: string) => Promise<{ success: boolean; error?: string }>;
  handleAuthDeepLink: (url: string) => Promise<{ handled: boolean; error?: string }>;
  continueAsGuest: () => Promise<void>;
  completeOnboarding: (data: OnboardingData) => Promise<{ success: boolean; error?: string }>;
  restoreSavedPlan: () => Promise<{ success: boolean; error?: string }>;
  startFreshOnboarding: () => Promise<void>;
  logout: () => Promise<void>;
  deleteAccount: () => Promise<{ success: boolean; error?: string }>;
  clearError: () => void;
  clearDeletionNotice: () => void;
}

const GUEST_ID_KEY = '@otwo_guest_id';

async function getOrCreateGuestId(): Promise<string> {
  const existing = await AsyncStorage.getItem(GUEST_ID_KEY);
  if (existing) return existing;
  const id = `guest-${Crypto.randomUUID()}`;
  await AsyncStorage.setItem(GUEST_ID_KEY, id);
  return id;
}

async function loadCachedProfile(): Promise<UserProfile | null> {
  try {
    const raw = await getSecureItem(SECURE_STORAGE_KEYS.cachedProfile);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as UserProfile;
    if (!parsed || typeof parsed.id !== 'string') return null;
    return parsed;
  } catch {
    return null;
  }
}

async function saveCachedProfile(profile: UserProfile): Promise<void> {
  await setSecureItem(SECURE_STORAGE_KEYS.cachedProfile, JSON.stringify(profile));
}

async function deleteCachedProfile(): Promise<void> {
  try {
    await deleteSecureItem(SECURE_STORAGE_KEYS.cachedProfile);
  } catch {
    // Ignore.
  }
}

function normalizeAge(value: unknown): number | undefined {
  return typeof value === 'number' && Number.isFinite(value) ? value : undefined;
}

function readLinkParam(url: string, name: string): string | null {
  const pattern = new RegExp(`[?&#]${name}=([^&#]*)`);
  const match = pattern.exec(url);
  if (!match) return null;
  try {
    return decodeURIComponent(match[1].replace(/\+/g, ' '));
  } catch {
    return match[1];
  }
}

function isPasswordRecoveryLink(url: string): boolean {
  return /(?:^|[/#?&])auth\/reset(?:[/?#&]|$)/i.test(url) || readLinkParam(url, 'type') === 'recovery';
}

function authRedirectUrl(): string {
  return Linking.createURL('auth/confirm');
}

function passwordRecoveryRedirectUrl(): string {
  return Linking.createURL('auth/reset');
}

/**
 * Build the local profile for a signed-in Supabase user.
 * Cloud onboarding data only restores non-sensitive plan inputs; doctor notes
 * are never uploaded and cannot be restored from the cloud.
 */
async function buildCloudProfile(user: {
  id: string;
  email?: string;
}): Promise<CloudProfileResult> {
  let cloudOnboarding = false;
  let age: number | undefined;

  try {
    const { data: onboarding } = await supabase
      .from('onboarding_responses')
      .select('id')
      .eq('user_id', user.id)
      .maybeSingle();
    cloudOnboarding = Boolean(onboarding);
  } catch {
    // Offline: rely on local data.
  }

  try {
    const { data: profileRow } = await supabase
      .from('profiles')
      .select('age')
      .eq('id', user.id)
      .maybeSingle();
    age = normalizeAge(profileRow?.age);
  } catch {
    // Offline: age is optional.
  }

  setActiveLocalUserId(user.id);
  const localTemplateCount = await templateRepo.countAll();
  const needsRestore = cloudOnboarding && localTemplateCount === 0;
  const isOnboarded = localTemplateCount > 0;

  return {
    profile: {
      id: user.id,
      email: user.email || 'user@example.com',
      age,
      isGuest: false,
      isOnboarded,
    },
    needsRestore,
    restoreAvailable: needsRestore,
  };
}

export const useAuthStore = create<AuthState>((set, get) => ({
  user: null,
  isLoading: true,
  error: null,
  needsRestore: false,
  restoreAvailable: false,
  deletionNotice: false,
  passwordRecovery: false,

  clearError: () => set({ error: null }),
  clearDeletionNotice: () => set({ deletionNotice: false }),

  initializeAuth: async () => {
    set({ isLoading: true });
    try {
      if (isSupabaseConfigured) {
        const { data, error } = await withRetry(() => supabase.auth.getSession());
        if (!error && data.session?.user) {
          const result = await buildCloudProfile(data.session.user);
          resetInMemoryStores();
          await saveCachedProfile(result.profile);
          set({
            user: result.profile,
            needsRestore: result.needsRestore,
            restoreAvailable: result.restoreAvailable,
            passwordRecovery: false,
            isLoading: false,
          });
          return;
        }
      }

      // Only guest profiles may be restored without a verified cloud session.
      const cached = await loadCachedProfile();
      if (cached?.isGuest) {
        setActiveLocalUserId(cached.id);
        resetInMemoryStores();
        set({ user: cached, needsRestore: false, restoreAvailable: false, isLoading: false });
        return;
      }

      await cancelReminderNotifications();
      setActiveLocalUserId(null);
      resetInMemoryStores();
      set({ user: null, needsRestore: false, restoreAvailable: false, isLoading: false });
    } catch {
      const cached = await loadCachedProfile().catch(() => null);
      if (cached?.isGuest) {
        setActiveLocalUserId(cached.id);
        resetInMemoryStores();
        set({ user: cached, needsRestore: false, restoreAvailable: false, isLoading: false });
      } else {
        await cancelReminderNotifications();
        setActiveLocalUserId(null);
        resetInMemoryStores();
        set({ user: null, isLoading: false });
      }
    }
  },

  login: async (email, password) => {
    if (!isSupabaseConfigured) {
      const error =
        'Cloud sign-in is not configured in this build. Continue as a guest, or configure Supabase credentials.';
      set({ error, isLoading: false });
      return { success: false, error };
    }

    try {
      set({ isLoading: true, error: null });
      const { data, error } = await withRetry(() =>
        supabase.auth.signInWithPassword({ email, password })
      );
      if (error) {
        const message = describeAuthError(error, error.message);
        set({ error: message, isLoading: false });
        return { success: false, error: message };
      }
      if (!data.session || !data.user) {
        const message = 'Please confirm your email address before signing in.';
        set({ error: message, isLoading: false });
        return { success: false, error: message };
      }

      const result = await buildCloudProfile(data.user);
      await cancelReminderNotifications();
      resetInMemoryStores();
      await saveCachedProfile(result.profile);
      set({
        user: result.profile,
        needsRestore: result.needsRestore,
        restoreAvailable: result.restoreAvailable,
        passwordRecovery: false,
        isLoading: false,
      });
      return { success: true };
    } catch (e) {
      const msg = describeAuthError(e, 'Login failed');
      set({ error: msg, isLoading: false });
      return { success: false, error: msg };
    }
  },

  signup: async (email, password) => {
    if (!isSupabaseConfigured) {
      const error =
        'Cloud account creation is not configured in this build. Continue as a guest, or configure Supabase credentials.';
      set({ error, isLoading: false });
      return { success: false, error };
    }

    try {
      set({ isLoading: true, error: null });
      const { data, error } = await withRetry(() =>
        supabase.auth.signUp({
          email,
          password,
          options: { emailRedirectTo: authRedirectUrl() },
        })
      );
      if (error) {
        const message = describeAuthError(error, error.message);
        set({ error: message, isLoading: false });
        return { success: false, error: message };
      }
      if (!data.session || !data.user) {
        const message =
          'Account created. Check your email to confirm your address, then sign in.';
        set({ error: null, isLoading: false });
        return { success: true, message };
      }

      const profile: UserProfile = {
        id: data.user.id,
        email: data.user.email || email,
        isGuest: false,
        isOnboarded: false,
      };
      await cancelReminderNotifications();
      setActiveLocalUserId(profile.id);
      resetInMemoryStores();
      await saveCachedProfile(profile);
      set({
        user: profile,
        needsRestore: false,
        restoreAvailable: false,
        passwordRecovery: false,
        isLoading: false,
      });
      return { success: true };
    } catch (e) {
      const msg = describeAuthError(e, 'Signup failed');
      set({ error: msg, isLoading: false });
      return { success: false, error: msg };
    }
  },

  requestPasswordReset: async (email) => {
    if (!isSupabaseConfigured) {
      return {
        success: false,
        error: 'Cloud password reset is not configured in this build.',
      };
    }
    if (!email.trim()) {
      return { success: false, error: 'Enter the email address for your account.' };
    }

    try {
      set({ isLoading: true, error: null });
      const { error } = await withRetry(() =>
        supabase.auth.resetPasswordForEmail(email.trim(), {
          redirectTo: passwordRecoveryRedirectUrl(),
        })
      );
      if (error) {
        const message = describeAuthError(error, error.message);
        set({ error: message, isLoading: false });
        return { success: false, error: message };
      }
      set({ isLoading: false });
      return {
        success: true,
        message:
          'If an account exists for that address, a password reset link has been sent. Open the link on this device to choose a new password.',
      };
    } catch (e) {
      const message = describeAuthError(e, 'Password reset could not be started.');
      set({ error: message, isLoading: false });
      return { success: false, error: message };
    }
  },

  updatePassword: async (password) => {
    if (!isSupabaseConfigured) {
      return { success: false, error: 'Cloud password reset is not configured in this build.' };
    }
    if (password.length < 6) {
      return { success: false, error: 'Password should be at least 6 characters.' };
    }

    try {
      set({ isLoading: true, error: null });
      const { data, error } = await withRetry(() => supabase.auth.updateUser({ password }));
      if (error) {
        const message = describeAuthError(error, error.message);
        set({ error: message, isLoading: false });
        return { success: false, error: message };
      }
      if (!data.user) {
        const message = 'The reset session has expired. Request a new reset link.';
        set({ error: message, isLoading: false });
        return { success: false, error: message };
      }

      const result = await buildCloudProfile(data.user);
      await cancelReminderNotifications();
      resetInMemoryStores();
      await saveCachedProfile(result.profile);
      set({
        user: result.profile,
        needsRestore: result.needsRestore,
        restoreAvailable: result.restoreAvailable,
        passwordRecovery: false,
        isLoading: false,
        error: null,
      });
      return { success: true };
    } catch (e) {
      const message = describeAuthError(e, 'Password could not be updated.');
      set({ error: message, isLoading: false });
      return { success: false, error: message };
    }
  },

  handleAuthDeepLink: async (url) => {
    const looksLikeAuthLink =
      /auth\/(?:confirm|reset)/i.test(url) ||
      Boolean(readLinkParam(url, 'code')) ||
      Boolean(readLinkParam(url, 'access_token'));
    if (!looksLikeAuthLink) return { handled: false };
    if (!isSupabaseConfigured) {
      return { handled: true, error: 'Cloud authentication is not configured in this build.' };
    }

    const recovery = isPasswordRecoveryLink(url);
    const linkError = readLinkParam(url, 'error_description') || readLinkParam(url, 'error');
    if (linkError) {
      set({ error: linkError, isLoading: false });
      return { handled: true, error: linkError };
    }

    try {
      set({ isLoading: true, error: null });
      const code = readLinkParam(url, 'code');
      const accessToken = readLinkParam(url, 'access_token');
      const refreshToken = readLinkParam(url, 'refresh_token');

      let sessionUser: { id: string; email?: string } | null = null;

      if (code) {
        const { data, error } = await withRetry(() => supabase.auth.exchangeCodeForSession(code));
        if (error) {
          const message = describeAuthError(error, error.message);
          set({ error: message, isLoading: false });
          return { handled: true, error: message };
        }
        sessionUser = data.session?.user
          ? { id: data.session.user.id, email: data.session.user.email }
          : null;
      } else if (accessToken && refreshToken) {
        const { data, error } = await withRetry(() =>
          supabase.auth.setSession({
            access_token: accessToken,
            refresh_token: refreshToken,
          })
        );
        if (error) {
          const message = describeAuthError(error, error.message);
          set({ error: message, isLoading: false });
          return { handled: true, error: message };
        }
        sessionUser = data.session?.user
          ? { id: data.session.user.id, email: data.session.user.email }
          : null;
      }

      if (!sessionUser) {
        const message =
          'The sign-in link could not be verified. Request a new link and try again on this device.';
        set({ error: message, isLoading: false });
        return { handled: true, error: message };
      }

      const result = await buildCloudProfile(sessionUser);
      await cancelReminderNotifications();
      resetInMemoryStores();
      await saveCachedProfile(result.profile);
      set({
        user: result.profile,
        needsRestore: result.needsRestore,
        restoreAvailable: result.restoreAvailable,
        passwordRecovery: recovery,
        isLoading: false,
        error: null,
      });
      return { handled: true };
    } catch (e) {
      const message = describeAuthError(e, 'The sign-in link could not be processed.');
      set({ error: message, isLoading: false });
      return { handled: true, error: message };
    }
  },

  continueAsGuest: async () => {
    const guestId = await getOrCreateGuestId();
    const guestProfile: UserProfile = {
      id: guestId,
      email: 'guest@otwo.local',
      isGuest: true,
      isOnboarded: false,
    };
    setActiveLocalUserId(guestId);
    resetInMemoryStores();
    await cancelReminderNotifications();
    await saveCachedProfile(guestProfile);
    set({
      user: guestProfile,
      needsRestore: false,
      restoreAvailable: false,
      passwordRecovery: false,
      error: null,
    });
  },

  completeOnboarding: async (data) => {
    const currentUser = get().user;
    if (!currentUser) return { success: false, error: 'No user session' };

    try {
      set({ isLoading: true });

      const templates = buildOnboardingTemplates(data);
      await templateRepo.insertMany(templates);

      if (data.medicationReminders.length > 0) {
        await habitRepo.insertMedicationReminders(
          data.medicationReminders.map((m) => ({
            id: m.id || `med-${Date.now()}-${Math.random()}`,
            label: m.label,
            time: m.time,
            frequency: m.frequency,
            is_active: 1,
          }))
        );
      }

      const todayDate = getLocalDateString();
      await habitRepo.insertHabits(buildStarterHabits(todayDate));
      await planRepo.insertPlans(buildInitialDailyPlans(templates, todayDate));

      // Doctor advice is sensitive and stays on this device only.
      if (data.doctorRecommendationsText) {
        await notesRepo.saveDoctorRecommendations(data.doctorRecommendationsText);
      }

      // Cloud sync is limited to non-sensitive inputs used for restore.
      if (isSupabaseConfigured && !currentUser.isGuest) {
        try {
          await supabase.from('profiles').upsert({
            id: currentUser.id,
            email: currentUser.email,
            age: data.age,
            notification_enabled: true,
          });

          await supabase.from('onboarding_responses').upsert({
            user_id: currentUser.id,
            medication_reminders_setup: data.medicationReminders,
            baseline_habits: data.baselineHabits,
            personal_goals: data.personalGoals,
          });
        } catch {
          // Local onboarding still succeeds offline.
        }
      }

      const updatedProfile: UserProfile = {
        ...currentUser,
        age: data.age,
        isOnboarded: true,
      };
      await saveCachedProfile(updatedProfile);
      set({
        user: updatedProfile,
        needsRestore: false,
        restoreAvailable: false,
        isLoading: false,
      });
      return { success: true };
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Onboarding save failed';
      set({ isLoading: false, error: message });
      return { success: false, error: message };
    }
  },

  restoreSavedPlan: async () => {
    const currentUser = get().user;
    if (!currentUser || currentUser.isGuest) {
      return { success: false, error: 'Sign in with a cloud account to restore a saved plan.' };
    }
    if (!isSupabaseConfigured) {
      return { success: false, error: 'Cloud restore is not configured in this build.' };
    }

    try {
      set({ isLoading: true, error: null });
      const { data: onboarding, error } = await supabase
        .from('onboarding_responses')
        .select('baseline_habits, personal_goals, medication_reminders_setup')
        .eq('user_id', currentUser.id)
        .maybeSingle();

      if (error) {
        const message =
          'Could not reach the cloud to restore this plan. Check your connection and try again.';
        set({ error: message, isLoading: false });
        return { success: false, error: message };
      }
      if (!onboarding) {
        const message = 'No saved plan was found for this account.';
        set({ error: message, isLoading: false });
        return { success: false, error: message };
      }

      const baseline = onboarding.baseline_habits || {};
      const meds = Array.isArray(onboarding.medication_reminders_setup)
        ? onboarding.medication_reminders_setup
        : [];
      const goals = Array.isArray(onboarding.personal_goals)
        ? onboarding.personal_goals
        : [];

      const templates = buildOnboardingTemplates({
        age: currentUser.age || 0,
        medicationReminders: meds,
        baselineHabits: {
          sleepHours: Number(baseline.sleepHours) || 7,
          movementLevel:
            baseline.movementLevel === 'moderate' || baseline.movementLevel === 'active'
              ? baseline.movementLevel
              : 'light',
          hydrationGoalGlasses: Number(baseline.hydrationGoalGlasses) || 8,
          stressLevel:
            baseline.stressLevel === 'low' || baseline.stressLevel === 'high'
              ? baseline.stressLevel
              : 'moderate',
        },
        personalGoals: goals,
      });

      await templateRepo.insertMany(templates);
      if (meds.length > 0) {
        await habitRepo.insertMedicationReminders(
          meds.map((m: MedicationSetupItem, index: number) => ({
            id: m.id || `restored-med-${index}-${Date.now()}`,
            label: m.label || `Medication reminder ${index + 1}`,
            time: m.time || '08:00',
            frequency: m.frequency || 'daily',
            is_active: 1,
          }))
        );
      }
      const today = getLocalDateString();
      await habitRepo.insertHabits(buildStarterHabits(today));
      await planRepo.insertPlans(buildInitialDailyPlans(templates, today));

      const updatedProfile: UserProfile = { ...currentUser, isOnboarded: true };
      await saveCachedProfile(updatedProfile);
      set({
        user: updatedProfile,
        needsRestore: false,
        restoreAvailable: false,
        isLoading: false,
      });
      return { success: true };
    } catch {
      const message =
        'Could not restore the saved plan. Check your connection and try again.';
      set({ error: message, isLoading: false });
      return { success: false, error: message };
    }
  },

  startFreshOnboarding: async () => {
    const currentUser = get().user;
    if (!currentUser) return;
    const updatedProfile: UserProfile = { ...currentUser, isOnboarded: false };
    await saveCachedProfile(updatedProfile);
    set({ user: updatedProfile, needsRestore: false, restoreAvailable: false });
  },

  logout: async () => {
    if (isSupabaseConfigured) {
      try {
        await supabase.auth.signOut();
      } catch {
        // Local logout still proceeds.
      }
    }
    await cancelReminderNotifications();
    setActiveLocalUserId(null);
    resetInMemoryStores();
    await deleteCachedProfile();
    set({
      user: null,
      needsRestore: false,
      restoreAvailable: false,
      passwordRecovery: false,
      error: null,
    });
  },

  deleteAccount: async () => {
    const currentUser = get().user;
    if (!currentUser) {
      return { success: false, error: 'No active account to delete.' };
    }

    // Remote deletion must be verified before local data is destroyed.
    if (isSupabaseConfigured && !currentUser.isGuest) {
      try {
        const { data, error } = await supabase.functions.invoke('delete-account', {
          body: { confirm: true },
        });
        if (error) {
          return {
            success: false,
            error:
              error.message ||
              'The server could not delete your account. Nothing was removed locally. Please try again.',
          };
        }
        if (data && data.success === false) {
          return {
            success: false,
            error: data.error || 'The server refused to delete your account.',
          };
        }
      } catch (e) {
        const message = e instanceof Error ? e.message : 'Account deletion failed.';
        return {
          success: false,
          error: `${message} Nothing was removed locally. Please try again.`,
        };
      }

      try {
        await supabase.auth.signOut({ scope: 'global' });
      } catch {
        // The auth user is already gone; local cleanup continues.
      }
    }

    try {
      await cancelReminderNotifications();
      await wipeAllLocalData();
    } catch (e) {
      const message = e instanceof Error ? e.message : 'Local data could not be fully cleared.';
      return { success: false, error: message };
    }

    resetInMemoryStores();
    set({
      user: null,
      needsRestore: false,
      restoreAvailable: false,
      deletionNotice: true,
      passwordRecovery: false,
      error: null,
    });
    return { success: true };
  },
}));
