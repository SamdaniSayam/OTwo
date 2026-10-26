/**
 * Symptom Logging Repository
 * Strictly for personal observation and doctor discussion.
 * Never used for clinical scoring or diagnosis.
 */
import { Platform } from 'react-native';
import { getDatabase, getTableRecords, setTableRecords, SymptomLogRow } from '../sqlite';

export const symptomRepo = {
  async getRecentLogs(limit: number = 30): Promise<SymptomLogRow[]> {
    if (Platform.OS === 'web') {
      const all = await getTableRecords<SymptomLogRow>('symptom_logs');
      return all.sort((a, b) => b.timestamp.localeCompare(a.timestamp)).slice(0, limit);
    }
    const db = await getDatabase();
    if (!db) return [];
    return db.getAllAsync<SymptomLogRow>(
      `SELECT * FROM symptom_logs ORDER BY timestamp DESC LIMIT ?`,
      [limit]
    );
  },

  async insertLog(log: SymptomLogRow): Promise<void> {
    if (Platform.OS === 'web') {
      const all = await getTableRecords<SymptomLogRow>('symptom_logs');
      await setTableRecords('symptom_logs', [log, ...all]);
      return;
    }
    const db = await getDatabase();
    if (!db) return;
    await db.runAsync(
      `INSERT INTO symptom_logs (id, date, timestamp, breathing_difficulty, cough_presence, triggers, notes)
       VALUES (?, ?, ?, ?, ?, ?, ?)`,
      [
        log.id,
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
    const logs = await this.getRecentLogs(days);
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
