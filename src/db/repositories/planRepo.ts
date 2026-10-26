/**
 * Daily Plan and Recovery State Repository
 * Handles daily checklist items and adaptive recovery mode after missed days.
 */
import { Platform } from 'react-native';
import { getDatabase, getTableRecords, setTableRecords, DailyPlanRow, RecoveryStateRow } from '../sqlite';

export const planRepo = {
  async getPlansByDate(date: string): Promise<DailyPlanRow[]> {
    if (Platform.OS === 'web') {
      const all = await getTableRecords<DailyPlanRow>('daily_plans');
      return all.filter((p) => p.date === date);
    }
    const db = await getDatabase();
    if (!db) return [];
    return db.getAllAsync<DailyPlanRow>(
      'SELECT * FROM daily_plans WHERE date = ? ORDER BY is_completed ASC, category ASC',
      [date]
    );
  },

  async insertPlans(plans: DailyPlanRow[]): Promise<void> {
    if (Platform.OS === 'web') {
      const all = await getTableRecords<DailyPlanRow>('daily_plans');
      const filtered = all.filter((existing) => !plans.some((p) => p.id === existing.id));
      await setTableRecords('daily_plans', [...filtered, ...plans]);
      return;
    }
    const db = await getDatabase();
    if (!db) return;
    for (const p of plans) {
      await db.runAsync(
        `INSERT OR REPLACE INTO daily_plans (id, date, category, title, description, is_completed, completion_time, notes, is_recovery_item)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        [
          p.id,
          p.date,
          p.category,
          p.title,
          p.description || null,
          p.is_completed,
          p.completion_time || null,
          p.notes || null,
          p.is_recovery_item,
        ]
      );
    }
  },

  async updatePlanStatus(
    id: string,
    isCompleted: number, // 0 = pending, 1 = completed, 2 = skipped
    notes?: string
  ): Promise<void> {
    const completionTime = isCompleted === 1 ? new Date().toISOString() : null;
    if (Platform.OS === 'web') {
      const all = await getTableRecords<DailyPlanRow>('daily_plans');
      const updated = all.map((p) =>
        p.id === id ? { ...p, is_completed: isCompleted, completion_time: completionTime || undefined, notes } : p
      );
      await setTableRecords('daily_plans', updated);
      return;
    }
    const db = await getDatabase();
    if (!db) return;
    await db.runAsync(
      `UPDATE daily_plans 
       SET is_completed = ?, completion_time = ?, notes = coalesce(?, notes)
       WHERE id = ?`,
      [isCompleted, completionTime, notes || null, id]
    );
  },

  async getRecentCompletionRate(days: number = 7): Promise<{ date: string; rate: number }[]> {
    const dates: string[] = [];
    const now = new Date();
    for (let i = days - 1; i >= 0; i--) {
      const d = new Date(now);
      d.setDate(d.getDate() - i);
      dates.push(d.toISOString().split('T')[0]);
    }

    const result: { date: string; rate: number }[] = [];
    for (const date of dates) {
      const plans = await this.getPlansByDate(date);
      if (plans.length === 0) {
        result.push({ date, rate: 0 });
      } else {
        const completed = plans.filter((p) => p.is_completed === 1).length;
        result.push({ date, rate: Math.round((completed / plans.length) * 100) });
      }
    }
    return result;
  },

  // Recovery state
  async getRecoveryState(): Promise<RecoveryStateRow> {
    if (Platform.OS === 'web') {
      const list = await getTableRecords<RecoveryStateRow>('recovery_state');
      return (
        list[0] || {
          id: 1,
          consecutive_missed_days: 0,
          recovery_active: 0,
          recovery_days_remaining: 0,
        }
      );
    }
    const db = await getDatabase();
    if (!db) {
      return { id: 1, consecutive_missed_days: 0, recovery_active: 0, recovery_days_remaining: 0 };
    }
    const row = await db.getFirstAsync<RecoveryStateRow>('SELECT * FROM recovery_state WHERE id = 1');
    return row || { id: 1, consecutive_missed_days: 0, recovery_active: 0, recovery_days_remaining: 0 };
  },

  async setRecoveryState(state: Partial<RecoveryStateRow>): Promise<void> {
    if (Platform.OS === 'web') {
      const current = await this.getRecoveryState();
      const updated = [{ ...current, ...state, id: 1 }];
      await setTableRecords('recovery_state', updated);
      return;
    }
    const db = await getDatabase();
    if (!db) return;
    const current = await this.getRecoveryState();
    const merged = { ...current, ...state };
    await db.runAsync(
      `INSERT OR REPLACE INTO recovery_state (id, consecutive_missed_days, recovery_active, recovery_start_date, recovery_days_remaining)
       VALUES (1, ?, ?, ?, ?)`,
      [
        merged.consecutive_missed_days,
        merged.recovery_active,
        merged.recovery_start_date || null,
        merged.recovery_days_remaining,
      ]
    );
  },
};
