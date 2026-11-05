/**
 * Habit and Medication Reminders Repository
 * Tracks streaks and user-defined medication reminder schedules (reminder-only).
 * All rows are scoped to the active local account.
 */
import { Platform } from 'react-native';
import {
  getScopedDatabase,
  getTableRecords,
  setTableRecords,
  HabitRow,
  MedicationReminderRow,
} from '../sqlite';

export const habitRepo = {
  // Habits
  async getHabits(): Promise<HabitRow[]> {
    if (Platform.OS === 'web') {
      const all = await getTableRecords<HabitRow>('habits');
      return all.sort((a, b) => b.current_streak - a.current_streak);
    }
    const scoped = await getScopedDatabase();
    if (!scoped) return [];
    return scoped.db.getAllAsync<HabitRow>(
      'SELECT * FROM habits WHERE user_id = ? ORDER BY current_streak DESC',
      [scoped.userId]
    );
  },

  async insertHabits(habits: HabitRow[]): Promise<void> {
    if (habits.length === 0) return;
    if (Platform.OS === 'web') {
      const all = await getTableRecords<HabitRow>('habits');
      const filtered = all.filter((h) => !habits.some((newH) => newH.id === h.id));
      await setTableRecords('habits', [...filtered, ...habits]);
      return;
    }
    const scoped = await getScopedDatabase();
    if (!scoped) return;
    for (const h of habits) {
      await scoped.db.runAsync(
        `INSERT OR REPLACE INTO habits
          (id, user_id, name, category, target_frequency, current_streak, best_streak, last_completed_date)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
        [
          h.id,
          scoped.userId,
          h.name,
          h.category,
          h.target_frequency,
          h.current_streak,
          h.best_streak,
          h.last_completed_date || null,
        ]
      );
    }
  },

  /**
   * Persist a derived routine streak. Unlike an increment, this corrects the
   * value after an item is unchecked or a day is found to have a gap.
   */
  async setRoutineStreak(
    id: string,
    streak: { current: number; best: number; lastCompletedDate?: string }
  ): Promise<void> {
    const habits = await this.getHabits();
    let habit = habits.find((h) => h.id === id);
    if (!habit) {
      habit = {
        id,
        name: 'Daily Routine Consistency',
        category: 'routine',
        target_frequency: 'daily',
        current_streak: 0,
        best_streak: 0,
      };
      await this.insertHabits([habit]);
    }

    if (Platform.OS === 'web') {
      const updated = habits.some((h) => h.id === id)
        ? habits.map((h) =>
            h.id === id
              ? {
                  ...h,
                  current_streak: streak.current,
                  best_streak: Math.max(h.best_streak, streak.best),
                  last_completed_date: streak.lastCompletedDate,
                }
              : h
          )
        : [
            ...habits,
            {
              ...habit,
              current_streak: streak.current,
              best_streak: streak.best,
              last_completed_date: streak.lastCompletedDate,
            },
          ];
      await setTableRecords('habits', updated);
      return;
    }

    const scoped = await getScopedDatabase();
    if (!scoped) return;
    await scoped.db.runAsync(
      `UPDATE habits
       SET current_streak = ?, best_streak = max(best_streak, ?), last_completed_date = ?
       WHERE id = ? AND user_id = ?`,
      [streak.current, streak.best, streak.lastCompletedDate || null, id, scoped.userId]
    );
  },

  // Medication Reminders (strictly reminder-only)
  async getMedicationReminders(): Promise<MedicationReminderRow[]> {
    if (Platform.OS === 'web') {
      const all = await getTableRecords<MedicationReminderRow>('medication_reminders');
      return all.sort((a, b) => a.time.localeCompare(b.time));
    }
    const scoped = await getScopedDatabase();
    if (!scoped) return [];
    return scoped.db.getAllAsync<MedicationReminderRow>(
      'SELECT * FROM medication_reminders WHERE user_id = ? ORDER BY time ASC',
      [scoped.userId]
    );
  },

  async insertMedicationReminders(reminders: MedicationReminderRow[]): Promise<void> {
    if (reminders.length === 0) return;
    if (Platform.OS === 'web') {
      const all = await getTableRecords<MedicationReminderRow>('medication_reminders');
      const filtered = all.filter((r) => !reminders.some((newR) => newR.id === r.id));
      await setTableRecords('medication_reminders', [...filtered, ...reminders]);
      return;
    }
    const scoped = await getScopedDatabase();
    if (!scoped) return;
    for (const r of reminders) {
      await scoped.db.runAsync(
        `INSERT OR REPLACE INTO medication_reminders
          (id, user_id, label, time, frequency, is_active)
         VALUES (?, ?, ?, ?, ?, ?)`,
        [r.id, scoped.userId, r.label, r.time, r.frequency, r.is_active]
      );
    }
  },

  async toggleReminder(id: string, isActive: boolean): Promise<void> {
    if (Platform.OS === 'web') {
      const all = await getTableRecords<MedicationReminderRow>('medication_reminders');
      const updated = all.map((r) =>
        r.id === id ? { ...r, is_active: isActive ? 1 : 0 } : r
      );
      await setTableRecords('medication_reminders', updated);
      return;
    }
    const scoped = await getScopedDatabase();
    if (!scoped) return;
    await scoped.db.runAsync(
      'UPDATE medication_reminders SET is_active = ? WHERE id = ? AND user_id = ?',
      [isActive ? 1 : 0, id, scoped.userId]
    );
  },
};
