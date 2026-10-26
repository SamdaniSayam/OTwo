/**
 * Authentication & Profile State Management (Zustand)
 * Offline-first: Supports guest mode, offline caching, and Supabase Auth.
 */
import { create } from 'zustand';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { supabase, isSupabaseConfigured } from '../db/supabase';
import { templateRepo } from '../db/repositories/templateRepo';
import { habitRepo } from '../db/repositories/habitRepo';
import { planRepo } from '../db/repositories/planRepo';
import { encryptSensitiveText } from '../services/encryption';
import { PlanTemplateRow } from '../db/sqlite';

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

interface AuthState {
  user: UserProfile | null;
  isLoading: boolean;
  error: string | null;
  initializeAuth: () => Promise<void>;
  login: (email: string, pass: string) => Promise<{ success: boolean; error?: string }>;
  signup: (email: string, pass: string) => Promise<{ success: boolean; error?: string }>;
  continueAsGuest: () => Promise<void>;
  completeOnboarding: (data: OnboardingData) => Promise<{ success: boolean; error?: string }>;
  logout: () => Promise<void>;
  deleteAccount: () => Promise<void>;
  clearError: () => void;
}

const AUTH_STORAGE_KEY = '@otwo_cached_auth_profile';

export const useAuthStore = create<AuthState>((set, get) => ({
  user: null,
  isLoading: true,
  error: null,

  clearError: () => set({ error: null }),

  initializeAuth: async () => {
    try {
      set({ isLoading: true });
      const cached = await AsyncStorage.getItem(AUTH_STORAGE_KEY);
      if (cached) {
        set({ user: JSON.parse(cached), isLoading: false });
        return;
      }

      if (isSupabaseConfigured) {
        const { data } = await supabase.auth.getSession();
        if (data?.session?.user) {
          const userProfile: UserProfile = {
            id: data.session.user.id,
            email: data.session.user.email || 'user@example.com',
            isGuest: false,
            isOnboarded: false,
          };
          // Check onboarding status
          const { data: onboarding } = await supabase
            .from('onboarding_responses')
            .select('id')
            .eq('user_id', userProfile.id)
            .maybeSingle();

          if (onboarding) {
            userProfile.isOnboarded = true;
          }
          await AsyncStorage.setItem(AUTH_STORAGE_KEY, JSON.stringify(userProfile));
          set({ user: userProfile });
        }
      }
    } catch {
      // Offline fallback
    } finally {
      set({ isLoading: false });
    }
  },

  login: async (email, password) => {
    try {
      set({ isLoading: true, error: null });
      if (isSupabaseConfigured) {
        const { data, error } = await supabase.auth.signInWithPassword({ email, password });
        if (error) {
          set({ error: error.message, isLoading: false });
          return { success: false, error: error.message };
        }
        if (data.user) {
          const profile: UserProfile = {
            id: data.user.id,
            email: data.user.email || email,
            isGuest: false,
            isOnboarded: false,
          };
          const { data: onboarding } = await supabase
            .from('onboarding_responses')
            .select('id')
            .eq('user_id', profile.id)
            .maybeSingle();

          if (onboarding) {
            profile.isOnboarded = true;
          }
          await AsyncStorage.setItem(AUTH_STORAGE_KEY, JSON.stringify(profile));
          set({ user: profile, isLoading: false });
          return { success: true };
        }
      }

      // Offline / Demo Mode
      const offlineProfile: UserProfile = {
        id: 'local-user-' + Date.now(),
        email,
        isGuest: false,
        isOnboarded: false,
      };
      await AsyncStorage.setItem(AUTH_STORAGE_KEY, JSON.stringify(offlineProfile));
      set({ user: offlineProfile, isLoading: false });
      return { success: true };
    } catch (e: any) {
      const msg = e.message || 'Login failed';
      set({ error: msg, isLoading: false });
      return { success: false, error: msg };
    }
  },

  signup: async (email, password) => {
    try {
      set({ isLoading: true, error: null });
      if (isSupabaseConfigured) {
        const { data, error } = await supabase.auth.signUp({ email, password });
        if (error) {
          set({ error: error.message, isLoading: false });
          return { success: false, error: error.message };
        }
        if (data.user) {
          const profile: UserProfile = {
            id: data.user.id,
            email: data.user.email || email,
            isGuest: false,
            isOnboarded: false,
          };
          await AsyncStorage.setItem(AUTH_STORAGE_KEY, JSON.stringify(profile));
          set({ user: profile, isLoading: false });
          return { success: true };
        }
      }

      // Offline / Demo Mode
      const offlineProfile: UserProfile = {
        id: 'local-user-' + Date.now(),
        email,
        isGuest: false,
        isOnboarded: false,
      };
      await AsyncStorage.setItem(AUTH_STORAGE_KEY, JSON.stringify(offlineProfile));
      set({ user: offlineProfile, isLoading: false });
      return { success: true };
    } catch (e: any) {
      const msg = e.message || 'Signup failed';
      set({ error: msg, isLoading: false });
      return { success: false, error: msg };
    }
  },

  continueAsGuest: async () => {
    const guestProfile: UserProfile = {
      id: 'guest-' + Date.now(),
      email: 'guest@otwo.local',
      isGuest: true,
      isOnboarded: false,
    };
    await AsyncStorage.setItem(AUTH_STORAGE_KEY, JSON.stringify(guestProfile));
    set({ user: guestProfile });
  },

  completeOnboarding: async (data: OnboardingData) => {
    const currentUser = get().user;
    if (!currentUser) return { success: false, error: 'No user session' };

    try {
      set({ isLoading: true });

      // 1. Build template items derived from user onboarding answers and goals
      const templates: PlanTemplateRow[] = [];

      // Medication reminders from onboarding (reminder-only)
      data.medicationReminders.forEach((med, idx) => {
        templates.push({
          id: `template-med-${idx}-${Date.now()}`,
          category: 'medication_reminder',
          title: med.label,
          description: `Reminder scheduled for ${med.time} (${med.frequency})`,
          default_time: med.time,
          is_active: 1,
          source: 'onboarding',
        });
      });

      // Movement focus based on baseline
      templates.push({
        id: `template-movement-${Date.now()}`,
        category: 'movement',
        title: data.baselineHabits.movementLevel === 'light' ? 'Gentle 15-Minute Walk' : '20-30 Minute Mindful Movement',
        description: 'Paced movement as permitted by your doctor-prescribed routine.',
        default_time: '10:00',
        is_active: 1,
        source: 'onboarding',
      });

      // Hydration focus
      templates.push({
        id: `template-hydration-${Date.now()}`,
        category: 'hydration',
        title: `Hydration (${data.baselineHabits.hydrationGoalGlasses || 8} Glasses)`,
        description: 'Keep water nearby to support clear airways and general vitality.',
        default_time: '12:00',
        is_active: 1,
        source: 'onboarding',
      });

      // Nutrition & Wind-down
      templates.push({
        id: `template-nutrition-${Date.now()}`,
        category: 'nutrition',
        title: 'Airway-Friendly Nutrition Focus',
        description: 'Fresh fruits and anti-inflammatory whole foods.',
        default_time: '13:00',
        is_active: 1,
        source: 'onboarding',
      });

      templates.push({
        id: `template-winddown-${Date.now()}`,
        category: 'wind_down',
        title: 'Calm Breathing & Wind-Down',
        description: 'Relaxation routine 30 mins before sleep to ease airway tension.',
        default_time: '21:30',
        is_active: 1,
        source: 'onboarding',
      });

      // 2. Persist templates to local SQLite plan_templates table
      await templateRepo.insertMany(templates);

      // 3. Persist medication reminders to local repo
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

      // 4. Seed initial habits
      await habitRepo.insertHabits([
        {
          id: 'habit-consistency',
          name: 'Morning Routine Consistency',
          category: 'routine',
          target_frequency: 'daily',
          current_streak: 1,
          best_streak: 1,
          last_completed_date: new Date().toISOString().split('T')[0],
        },
        {
          id: 'habit-hydration',
          name: 'Daily Hydration Target',
          category: 'hydration',
          target_frequency: 'daily',
          current_streak: 1,
          best_streak: 1,
          last_completed_date: new Date().toISOString().split('T')[0],
        },
      ]);

      // 5. Generate Today's initial daily plan from templates
      const todayDate = new Date().toISOString().split('T')[0];
      await planRepo.insertPlans(
        templates.map((t) => ({
          id: `plan-${todayDate}-${t.id}`,
          date: todayDate,
          category: t.category,
          title: t.title,
          description: t.description,
          is_completed: 0,
          is_recovery_item: 0,
        }))
      );

      // 6. Encrypt sensitive doctor recommendations client-side if present
      let encryptedRecommendations = '';
      if (data.doctorRecommendationsText) {
        encryptedRecommendations = await encryptSensitiveText(
          data.doctorRecommendationsText,
          currentUser.id
        );
      }

      // 7. Sync onboarding record to Supabase if configured and online
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
            doctor_recommendations_encrypted: encryptedRecommendations,
            medication_reminders_setup: data.medicationReminders,
            baseline_habits: data.baselineHabits,
            personal_goals: data.personalGoals,
          });

          await supabase.from('audit_logs').insert({
            user_id: currentUser.id,
            action: 'ONBOARDING_COMPLETED',
          });
        } catch {
          // Handled gracefully offline
        }
      }

      // Update state
      const updatedProfile: UserProfile = {
        ...currentUser,
        age: data.age,
        isOnboarded: true,
      };
      await AsyncStorage.setItem(AUTH_STORAGE_KEY, JSON.stringify(updatedProfile));
      set({ user: updatedProfile, isLoading: false });
      return { success: true };
    } catch (err: any) {
      set({ isLoading: false });
      return { success: false, error: err.message || 'Onboarding save failed' };
    }
  },

  logout: async () => {
    if (isSupabaseConfigured) {
      try {
        await supabase.auth.signOut();
      } catch {
        // Ignore
      }
    }
    await AsyncStorage.removeItem(AUTH_STORAGE_KEY);
    set({ user: null });
  },

  deleteAccount: async () => {
    const user = get().user;
    if (user && isSupabaseConfigured && !user.isGuest) {
      try {
        await supabase.from('audit_logs').insert({
          user_id: user.id,
          action: 'ACCOUNT_DELETION',
        });
        await supabase.from('profiles').delete().eq('id', user.id);
      } catch {
        // Ignore
      }
    }
    await AsyncStorage.clear();
    set({ user: null });
  },
}));
