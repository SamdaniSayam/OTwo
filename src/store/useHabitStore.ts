/**
 * Habit & Medication Reminder Store (Zustand)
 * Reminder-only tracking. Generates consistency insights.
 */
import { create } from 'zustand';
import { habitRepo } from '../db/repositories/habitRepo';
import { planRepo } from '../db/repositories/planRepo';
import { HabitRow, MedicationReminderRow } from '../db/sqlite';

interface HabitState {
  habits: HabitRow[];
  medicationReminders: MedicationReminderRow[];
  weeklyConsistency: { date: string; rate: number }[];
  insights: string[];
  isLoading: boolean;
  loadHabits: () => Promise<void>;
  addReminder: (label: string, time: string, frequency: string) => Promise<void>;
  toggleReminder: (id: string, isActive: boolean) => Promise<void>;
}

export const useHabitStore = create<HabitState>((set, get) => ({
  habits: [],
  medicationReminders: [],
  weeklyConsistency: [],
  insights: [],
  isLoading: true,

  loadHabits: async () => {
    try {
      set({ isLoading: true });
      const habits = await habitRepo.getHabits();
      const reminders = await habitRepo.getMedicationReminders();
      const weekly = await planRepo.getRecentCompletionRate(7);

      // Generate supportive behavioral insights
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

      insightsList.push('⏰ Tip: Morning routines tend to be completed with higher consistency when linked to brushing teeth.');

      set({
        habits,
        medicationReminders: reminders,
        weeklyConsistency: weekly,
        insights: insightsList,
        isLoading: false,
      });
    } catch {
      set({ isLoading: false });
    }
  },

  addReminder: async (label: string, time: string, frequency: string) => {
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

  toggleReminder: async (id: string, isActive: boolean) => {
    await habitRepo.toggleReminder(id, isActive);
    await get().loadHabits();
  },
}));
