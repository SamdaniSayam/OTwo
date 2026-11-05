/**
 * Symptom Logging Repository
 * Strictly for personal observation and doctor discussion.
 * Never used for clinical scoring or diagnosis.
 * All rows are scoped to the active local account.
 */
import { Platform } from 'react-native';
import {
  getScopedDatabase,
  getTableRecords,
  setTableRecords,
  SymptomLogRow,
} from '../sqlite';
import { getLocalDateString, getLocalDateStringDaysAgo } from '../../utils/date';

export const symptomRepo = {
  async getRecentLogs(limit: number = 30): Promise<SymptomLogRow[]> {
    if (Platform.OS === 'web') {
      const all = await getTableRecords<SymptomLogRow>('symptom_logs');
      return all
        .sort((a, b) => b.timestamp.localeCompare(a.timestamp))
        .slice(0, limit);
    }
    const scoped = await getScopedDatabase();
    if (!scoped) return [];
    return scoped.db.getAllAsync<SymptomLogRow>(
      `SELECT * FROM symptom_logs WHERE user_id = ? ORDER BY timestamp DESC LIMIT ?`,
      [scoped.userId, limit]
    );
  },

  /**
   * Logs whose local calendar date falls inside the inclusive report window.
   * This is deliberately date-based: "last 30 days" must not mean "the latest
   * 30 rows", which could span months.
   */
  async getLogsInRange(fromDate: string, toDate: string): Promise<SymptomLogRow[]> {
    if (Platform.OS === 'web') {
      const all = await getTableRecords<SymptomLogRow>('symptom_logs');
      return all
        .filter((log) => log.date >= fromDate && log.date <= toDate)
        .sort((a, b) => b.timestamp.localeCompare(a.timestamp));
    }
    const scoped = await getScopedDatabase();
    if (!scoped) return [];
    return scoped.db.getAllAsync<SymptomLogRow>(
      `SELECT * FROM symptom_logs
       WHERE user_id = ? AND date >= ? AND date <= ?
       ORDER BY timestamp DESC`,
      [scoped.userId, fromDate, toDate]
    );
  },

  async insertLog(log: SymptomLogRow): Promise<void> {
    if (Platform.OS === 'web') {
      const all = await getTableRecords<SymptomLogRow>('symptom_logs');
      await setTableRecords('symptom_logs', [log, ...all]);
      return;
    }
    const scoped = await getScopedDatabase();
    if (!scoped) return;
    await scoped.db.runAsync(
      `INSERT INTO symptom_logs
        (id, user_id, date, timestamp, breathing_difficulty, cough_presence, triggers, notes)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        log.id,
        scoped.userId,
        log.date,
        log.timestamp,
        log.breathing_difficulty,
        log.cough_presence,
        log.triggers,
        log.notes || null,
      ]
    );
  },

  async getTriggerFrequency(days: number = 30): Promise<{ trigger: string; count: number }[]> {
    const toDate = getLocalDateString();
    const fromDate = getLocalDateStringDaysAgo(Math.max(days - 1, 0));
    const logs = await this.getLogsInRange(fromDate, toDate);
    const frequencyMap: Record<string, number> = {};

    for (const log of logs) {
      if (!log.triggers) continue;
      const list = log.triggers.split(',').map((t) => t.trim().toLowerCase());
      for (const item of list) {
        if (!item) continue;
        frequencyMap[item] = (frequencyMap[item] || 0) + 1;
      }
    }

    return Object.entries(frequencyMap)
      .map(([trigger, count]) => ({ trigger, count }))
      .sort((a, b) => b.count - a.count);
  },
};
