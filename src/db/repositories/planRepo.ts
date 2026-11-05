/**
 * Daily Plan and Recovery State Repository
 * Handles daily checklist items and adaptive recovery mode after missed days.
 * All rows are scoped to the active local account.
 */
import { Platform } from 'react-native';
import {
  getScopedDatabase,
  getTableRecords,
  setTableRecords,
  DailyPlanRow,
  RecoveryStateRow,
} from '../sqlite';
import { getLocalDateString, getRecentLocalDates } from '../../utils/date';

const EMPTY_RECOVERY_STATE: RecoveryStateRow = {
  consecutive_missed_days: 0,
  recovery_active: 0,
  recovery_days_remaining: 0,
};

export interface DailyCompletionStat {
  date: string;
  total: number;
  completed: number;
}

export const planRepo = {
  async getPlansByDate(date: string): Promise<DailyPlanRow[]> {
    if (Platform.OS === 'web') {
      const all = await getTableRecords<DailyPlanRow>('daily_plans');
      return all
        .filter((p) => p.date === date)
        .sort((a, b) => a.is_completed - b.is_completed || a.category.localeCompare(b.category));
    }
    const scoped = await getScopedDatabase();
    if (!scoped) return [];
    return scoped.db.getAllAsync<DailyPlanRow>(
      'SELECT * FROM daily_plans WHERE user_id = ? AND date = ? ORDER BY is_completed ASC, category ASC',
      [scoped.userId, date]
    );
  },

  async insertPlans(plans: DailyPlanRow[]): Promise<void> {
    if (plans.length === 0) return;
    if (Platform.OS === 'web') {
      const all = await getTableRecords<DailyPlanRow>('daily_plans');
      const filtered = all.filter((existing) => !plans.some((p) => p.id === existing.id));
      await setTableRecords('daily_plans', [...filtered, ...plans]);
      return;
    }
    const scoped = await getScopedDatabase();
    if (!scoped) return;
    for (const p of plans) {
      await scoped.db.runAsync(
        `INSERT OR REPLACE INTO daily_plans
          (id, user_id, date, category, title, description, is_completed, completion_time, notes, is_recovery_item)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        [
          p.id,
          scoped.userId,
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
        p.id === id
          ? { ...p, is_completed: isCompleted, completion_time: completionTime || undefined, notes }
          : p
      );
      await setTableRecords('daily_plans', updated);
      return;
    }
    const scoped = await getScopedDatabase();
    if (!scoped) return;
    await scoped.db.runAsync(
      `UPDATE daily_plans
       SET is_completed = ?, completion_time = ?, notes = coalesce(?, notes)
       WHERE id = ? AND user_id = ?`,
      [isCompleted, completionTime, notes || null, id, scoped.userId]
    );
  },

  async getRecentCompletionRate(days: number = 7): Promise<{ date: string; rate: number }[]> {
    const dates = getRecentLocalDates(days);
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

  /**
   * Full-day completion totals across a date range. Reports must divide total
   * completed items by total planned items, not average daily percentages.
   */
  async getCompletionHistory(
    fromDate: string,
    toDate: string
  ): Promise<DailyCompletionStat[]> {
    if (Platform.OS === 'web') {
      const all = await getTableRecords<DailyPlanRow>('daily_plans');
      const grouped = new Map<string, DailyCompletionStat>();
      for (const plan of all) {
        if (plan.date < fromDate || plan.date > toDate) continue;
        const existing = grouped.get(plan.date) || {
          date: plan.date,
          total: 0,
          completed: 0,
        };
        existing.total += 1;
        if (plan.is_completed === 1) existing.completed += 1;
        grouped.set(plan.date, existing);
      }
      return Array.from(grouped.values()).sort((a, b) => a.date.localeCompare(b.date));
    }

    const scoped = await getScopedDatabase();
    if (!scoped) return [];
    const rows = await scoped.db.getAllAsync<{
      date: string;
      total: number;
      completed: number | null;
    }>(
      `SELECT date,
              COUNT(*) AS total,
              SUM(CASE WHEN is_completed = 1 THEN 1 ELSE 0 END) AS completed
       FROM daily_plans
       WHERE user_id = ? AND date >= ? AND date <= ?
       GROUP BY date
       ORDER BY date ASC`,
      [scoped.userId, fromDate, toDate]
    );
    return rows.map((row) => ({
      date: row.date,
      total: row.total,
      completed: row.completed || 0,
    }));
  },

  /** Remove today's still-pending normal items when recovery mode starts. */
  async removePendingNormalPlans(date: string): Promise<void> {
    if (Platform.OS === 'web') {
      const all = await getTableRecords<DailyPlanRow>('daily_plans');
      const kept = all.filter(
        (plan) =>
          !(plan.date === date && plan.is_completed === 0 && plan.is_recovery_item === 0)
      );
      await setTableRecords('daily_plans', kept);
      return;
    }
    const scoped = await getScopedDatabase();
    if (!scoped) return;
    await scoped.db.runAsync(
      `DELETE FROM daily_plans
       WHERE user_id = ? AND date = ? AND is_completed = 0 AND is_recovery_item = 0`,
      [scoped.userId, date]
    );
  },

  /** Remove unfinished recovery items when recovery mode ends or is dismissed. */
  async removePendingRecoveryPlans(date: string): Promise<void> {
    if (Platform.OS === 'web') {
      const all = await getTableRecords<DailyPlanRow>('daily_plans');
      const kept = all.filter(
        (plan) =>
          !(plan.date === date && plan.is_completed === 0 && plan.is_recovery_item === 1)
      );
      await setTableRecords('daily_plans', kept);
      return;
    }
    const scoped = await getScopedDatabase();
    if (!scoped) return;
    await scoped.db.runAsync(
      `DELETE FROM daily_plans
       WHERE user_id = ? AND date = ? AND is_completed = 0 AND is_recovery_item = 1`,
      [scoped.userId, date]
    );
  },

  // Recovery state (one row per active account)
  async getRecoveryState(): Promise<RecoveryStateRow> {
    if (Platform.OS === 'web') {
      const list = await getTableRecords<RecoveryStateRow>('recovery_state');
      return list[0] || { ...EMPTY_RECOVERY_STATE };
    }
    const scoped = await getScopedDatabase();
    if (!scoped) return { ...EMPTY_RECOVERY_STATE };
    const row = await scoped.db.getFirstAsync<RecoveryStateRow>(
      'SELECT * FROM recovery_state WHERE user_id = ?',
      [scoped.userId]
    );
    return row || { ...EMPTY_RECOVERY_STATE };
  },

  async setRecoveryState(state: Partial<RecoveryStateRow>): Promise<void> {
    const current = await this.getRecoveryState();
    const merged = { ...current, ...state };
    if (Platform.OS === 'web') {
      await setTableRecords('recovery_state', [{ ...merged }]);
      return;
    }
    const scoped = await getScopedDatabase();
    if (!scoped) return;
    await scoped.db.runAsync(
      `INSERT OR REPLACE INTO recovery_state
        (user_id, consecutive_missed_days, recovery_active, recovery_start_date, recovery_days_remaining, last_evaluated_date)
       VALUES (?, ?, ?, ?, ?, ?)`,
      [
        scoped.userId,
        merged.consecutive_missed_days,
        merged.recovery_active,
        merged.recovery_start_date || null,
        merged.recovery_days_remaining,
        merged.last_evaluated_date || null,
      ]
    );
  },

  async getTodayDate(): Promise<string> {
    return getLocalDateString();
  },
};
