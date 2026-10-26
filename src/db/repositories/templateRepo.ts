/**
 * Plan Templates Repository
 * Serves as the source of truth for the Daily Plan Engine.
 * Created from onboarding responses and customizable by the user.
 */
import { Platform } from 'react-native';
import { getDatabase, getTableRecords, setTableRecords, PlanTemplateRow } from '../sqlite';

export const templateRepo = {
  async getAll(): Promise<PlanTemplateRow[]> {
    if (Platform.OS === 'web') {
      return getTableRecords<PlanTemplateRow>('plan_templates');
    }
    const db = await getDatabase();
    if (!db) return [];
    return db.getAllAsync<PlanTemplateRow>(
      'SELECT * FROM plan_templates WHERE is_active = 1 ORDER BY category ASC'
    );
  },

  async insertMany(templates: PlanTemplateRow[]): Promise<void> {
    if (Platform.OS === 'web') {
      const existing = await getTableRecords<PlanTemplateRow>('plan_templates');
      const filtered = existing.filter((e) => !templates.some((t) => t.id === e.id));
      await setTableRecords('plan_templates', [...filtered, ...templates]);
      return;
    }
    const db = await getDatabase();
    if (!db) return;

    for (const t of templates) {
      await db.runAsync(
        `INSERT OR REPLACE INTO plan_templates (id, category, title, description, default_time, is_active, source)
         VALUES (?, ?, ?, ?, ?, ?, ?)`,
        [t.id, t.category, t.title, t.description, t.default_time || null, t.is_active, t.source]
      );
    }
  },

  async toggleActive(id: string, isActive: boolean): Promise<void> {
    if (Platform.OS === 'web') {
      const items = await getTableRecords<PlanTemplateRow>('plan_templates');
      const updated = items.map((item) => (item.id === id ? { ...item, is_active: isActive ? 1 : 0 } : item));
      await setTableRecords('plan_templates', updated);
      return;
    }
    const db = await getDatabase();
    if (!db) return;
    await db.runAsync('UPDATE plan_templates SET is_active = ? WHERE id = ?', [isActive ? 1 : 0, id]);
  },
};
