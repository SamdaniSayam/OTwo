/**
 * Habit and Medication Reminders Repository
 * Tracks streaks and user-defined medication reminder schedules (reminder-only).
 */
import { Platform } from 'react-native';
import { getDatabase, getTableRecords, setTableRecords, HabitRow, MedicationReminderRow } from '../sqlite';

export const habitRepo = {
  // Habits
  async getHabits(): Promise<HabitRow[]> {
    if (Platform.OS === 'web') {
      return getTableRecords<HabitRow>('habits');
    }
    const db = await getDatabase();
    if (!db) return [];
    return db.getAllAsync<HabitRow>('SELECT * FROM habits ORDER BY current_streak DESC');
  },

  async insertHabits(habits: HabitRow[]): Promise<void> {
    if (Platform.OS === 'web') {
      const all = await getTableRecords<HabitRow>('habits');
      const filtered = all.filter((h) => !habits.some((newH) => newH.id === h.id));
      await setTableRecords('habits', [...filtered, ...habits]);
      return;
    }
    const db = await getDatabase();
    if (!db) return;
    for (const h of habits) {
      await db.runAsync(
        `INSERT OR REPLACE INTO habits (id, name, category, target_frequency, current_streak, best_streak, last_completed_date)
         VALUES (?, ?, ?, ?, ?, ?, ?)`,
        [h.id, h.name, h.category, h.target_frequency, h.current_streak, h.best_streak, h.last_completed_date || null]
      );
    }
  },

  async incrementStreak(id: string, todayDate: string): Promise<void> {
    const habits = await this.getHabits();
    const habit = habits.find((h) => h.id === id);
    if (!habit) return;

    if (habit.last_completed_date === todayDate) {
      return; // Already completed today
    }

    const newCurrent = habit.current_streak + 1;
    const newBest = Math.max(habit.best_streak, newCurrent);

    if (Platform.OS === 'web') {
      const updated = habits.map((h) =>
        h.id === id ? { ...h, current_streak: newCurrent, best_streak: newBest, last_completed_date: todayDate } : h
      );
      await setTableRecords('habits', updated);
      return;
    }

    const db = await getDatabase();
    if (!db) return;
    await db.runAsync(
      `UPDATE habits 
       SET current_streak = ?, best_streak = ?, last_completed_date = ?
       WHERE id = ?`,
      [newCurrent, newBest, todayDate, id]
    );
  },

  // Medication Reminders (strictly reminder-only)
  async getMedicationReminders(): Promise<MedicationReminderRow[]> {
    if (Platform.OS === 'web') {
      return getTableRecords<MedicationReminderRow>('medication_reminders');
    }
    const db = await getDatabase();
    if (!db) return [];
    return db.getAllAsync<MedicationReminderRow>('SELECT * FROM medication_reminders ORDER BY time ASC');
  },

  async insertMedicationReminders(reminders: MedicationReminderRow[]): Promise<void> {
    if (Platform.OS === 'web') {
      const all = await getTableRecords<MedicationReminderRow>('medication_reminders');
      const filtered = all.filter((r) => !reminders.some((newR) => newR.id === r.id));
      await setTableRecords('medication_reminders', [...filtered, ...reminders]);
      return;
    }
    const db = await getDatabase();
    if (!db) return;
    for (const r of reminders) {
      await db.runAsync(
        `INSERT OR REPLACE INTO medication_reminders (id, label, time, frequency, is_active)
         VALUES (?, ?, ?, ?, ?)`,
        [r.id, r.label, r.time, r.frequency, r.is_active]
      );
    }
  },

  async toggleReminder(id: string, isActive: boolean): Promise<void> {
    if (Platform.OS === 'web') {
      const all = await getTableRecords<MedicationReminderRow>('medication_reminders');
      const updated = all.map((r) => (r.id === id ? { ...r, is_active: isActive ? 1 : 0 } : r));
      await setTableRecords('medication_reminders', updated);
      return;
    }
    const db = await getDatabase();
    if (!db) return;
    await db.runAsync('UPDATE medication_reminders SET is_active = ? WHERE id = ?', [isActive ? 1 : 0, id]);
  },
};
