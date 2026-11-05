/**
 * Habit & Medication Reminder Store (Zustand)
 * Reminder-only tracking. Generates consistency insights.
 */
import { create } from 'zustand';
import { habitRepo } from '../db/repositories/habitRepo';
import { planRepo } from '../db/repositories/planRepo';
import { HabitRow, MedicationReminderRow } from '../db/sqlite';
import {
  cancelReminderNotifications,
  getNotificationPermission,
  NotificationPermissionState,
  requestNotificationPermission,
  syncReminderNotifications,
} from '../services/notifications';

interface HabitState {
  habits: HabitRow[];
  medicationReminders: MedicationReminderRow[];
  weeklyConsistency: { date: string; rate: number }[];
  insights: string[];
  notificationPermission: NotificationPermissionState;
  scheduledReminderCount: number;
  isLoading: boolean;
  loadHabits: () => Promise<void>;
  addReminder: (label: string, time: string, frequency: string) => Promise<void>;
  toggleReminder: (id: string, isActive: boolean) => Promise<void>;
  enableNotifications: () => Promise<NotificationPermissionState>;
  disableNotifications: () => Promise<void>;
  refreshNotificationStatus: () => Promise<void>;
  reset: () => void;
}

export const useHabitStore = create<HabitState>((set, get) => ({
  habits: [],
  medicationReminders: [],
  weeklyConsistency: [],
  insights: [],
  notificationPermission: 'undetermined',
  scheduledReminderCount: 0,
  isLoading: true,

  loadHabits: async () => {
    try {
      set({ isLoading: true });
      const habits = await habitRepo.getHabits();
      const reminders = await habitRepo.getMedicationReminders();
      const weekly = await planRepo.getRecentCompletionRate(7);
      const permission = await getNotificationPermission();
      let scheduledReminderCount = 0;
      if (permission === 'granted') {
        scheduledReminderCount = await syncReminderNotifications(reminders);
      }

      const insightsList: string[] = [];
      const avgRate =
        weekly.length > 0
          ? Math.round(weekly.reduce((acc, curr) => acc + curr.rate, 0) / weekly.length)
          : 0;

      if (avgRate >= 70) {
        insightsList.push('🌟 Strong adherence! Your consistency is helping solidify healthy habits.');
      } else if (avgRate > 0) {
        insightsList.push('🌱 Gentle progress: You are taking active steps each day.');
      } else {
        insightsList.push('🌿 Every day is a fresh starting point. Focus on just one small step today.');
      }

      insightsList.push(
        '⏰ Tip: Morning routines tend to be completed with higher consistency when linked to brushing teeth.'
      );

      set({
        habits,
        medicationReminders: reminders,
        weeklyConsistency: weekly,
        insights: insightsList,
        notificationPermission: permission,
        scheduledReminderCount,
        isLoading: false,
      });
    } catch {
      set({ isLoading: false });
    }
  },

  addReminder: async (label, time, frequency) => {
    const item: MedicationReminderRow = {
      id: `rem-${Date.now()}`,
      label,
      time,
      frequency,
      is_active: 1,
    };
    await habitRepo.insertMedicationReminders([item]);
    await get().loadHabits();
  },

  toggleReminder: async (id, isActive) => {
    await habitRepo.toggleReminder(id, isActive);
    await get().loadHabits();
  },

  enableNotifications: async () => {
    const permission = await requestNotificationPermission();
    let scheduledReminderCount = 0;
    if (permission === 'granted') {
      scheduledReminderCount = await syncReminderNotifications(get().medicationReminders);
    }
    set({ notificationPermission: permission, scheduledReminderCount });
    return permission;
  },

  disableNotifications: async () => {
    await cancelReminderNotifications();
    set({ scheduledReminderCount: 0 });
  },

  refreshNotificationStatus: async () => {
    const permission = await getNotificationPermission();
    let scheduledReminderCount = get().scheduledReminderCount;
    if (permission === 'granted') {
      scheduledReminderCount = await syncReminderNotifications(get().medicationReminders);
    }
    set({ notificationPermission: permission, scheduledReminderCount });
  },

  reset: () =>
    set({
      habits: [],
      medicationReminders: [],
      weeklyConsistency: [],
      insights: [],
      notificationPermission: 'undetermined',
      scheduledReminderCount: 0,
      isLoading: false,
    }),
}));
