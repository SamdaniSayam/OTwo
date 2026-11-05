/**
 * Local-only doctor advice notes.
 *
 * These notes are never uploaded. They are stored in the account-scoped local
 * database so they survive navigation and app restarts on this device.
 */
import { Platform } from 'react-native';
import {
  getScopedDatabase,
  getTableRecords,
  setTableRecords,
  SensitiveNoteRow,
} from '../sqlite';

export const notesRepo = {
  async getDoctorRecommendations(): Promise<string | null> {
    if (Platform.OS === 'web') {
      const rows = await getTableRecords<SensitiveNoteRow>('sensitive_notes');
      return rows[0]?.doctor_recommendations || null;
    }
    const scoped = await getScopedDatabase();
    if (!scoped) return null;
    const row = await scoped.db.getFirstAsync<SensitiveNoteRow>(
      'SELECT * FROM sensitive_notes WHERE user_id = ?',
      [scoped.userId]
    );
    return row?.doctor_recommendations || null;
  },

  async saveDoctorRecommendations(text: string): Promise<void> {
    const trimmed = text.trim();
    if (!trimmed) return;
    const updatedAt = new Date().toISOString();
    if (Platform.OS === 'web') {
      await setTableRecords<SensitiveNoteRow>('sensitive_notes', [
        {
          user_id: '',
          doctor_recommendations: trimmed,
          updated_at: updatedAt,
        },
      ]);
      return;
    }
    const scoped = await getScopedDatabase();
    if (!scoped) return;
    await scoped.db.runAsync(
      `INSERT OR REPLACE INTO sensitive_notes (user_id, doctor_recommendations, updated_at)
       VALUES (?, ?, ?)`,
      [scoped.userId, trimmed, updatedAt]
    );
  },

  async deleteDoctorRecommendations(): Promise<void> {
    if (Platform.OS === 'web') {
      await setTableRecords<SensitiveNoteRow>('sensitive_notes', []);
      return;
    }
    const scoped = await getScopedDatabase();
    if (!scoped) return;
    await scoped.db.runAsync('DELETE FROM sensitive_notes WHERE user_id = ?', [scoped.userId]);
  },
};
