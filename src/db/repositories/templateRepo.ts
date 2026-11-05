/**
 * Plan Templates Repository
 * Serves as the source of truth for the Daily Plan Engine.
 * Created from onboarding responses and customizable by the user.
 * All rows are scoped to the active local account.
 */
import { Platform } from 'react-native';
import {
  getScopedDatabase,
  getTableRecords,
  setTableRecords,
  PlanTemplateRow,
} from '../sqlite';

export const templateRepo = {
  async getAll(): Promise<PlanTemplateRow[]> {
    if (Platform.OS === 'web') {
      const all = await getTableRecords<PlanTemplateRow>('plan_templates');
      return all
        .filter((t) => t.is_active === 1)
        .sort((a, b) => a.category.localeCompare(b.category));
    }
    const scoped = await getScopedDatabase();
    if (!scoped) return [];
    return scoped.db.getAllAsync<PlanTemplateRow>(
      'SELECT * FROM plan_templates WHERE user_id = ? AND is_active = 1 ORDER BY category ASC',
      [scoped.userId]
    );
  },

  async countAll(): Promise<number> {
    if (Platform.OS === 'web') {
      const all = await getTableRecords<PlanTemplateRow>('plan_templates');
      return all.length;
    }
    const scoped = await getScopedDatabase();
    if (!scoped) return 0;
    const row = await scoped.db.getFirstAsync<{ count: number }>(
      'SELECT COUNT(*) AS count FROM plan_templates WHERE user_id = ?',
      [scoped.userId]
    );
    return row?.count ?? 0;
  },

  async insertMany(templates: PlanTemplateRow[]): Promise<void> {
    if (templates.length === 0) return;
    if (Platform.OS === 'web') {
      const existing = await getTableRecords<PlanTemplateRow>('plan_templates');
      const filtered = existing.filter((e) => !templates.some((t) => t.id === e.id));
      await setTableRecords('plan_templates', [...filtered, ...templates]);
      return;
    }
    const scoped = await getScopedDatabase();
    if (!scoped) return;

    for (const t of templates) {
      await scoped.db.runAsync(
        `INSERT OR REPLACE INTO plan_templates
          (id, user_id, category, title, description, default_time, is_active, source)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
        [
          t.id,
          scoped.userId,
          t.category,
          t.title,
          t.description,
          t.default_time || null,
          t.is_active,
          t.source,
        ]
      );
    }
  },

  async toggleActive(id: string, isActive: boolean): Promise<void> {
    if (Platform.OS === 'web') {
      const items = await getTableRecords<PlanTemplateRow>('plan_templates');
      const updated = items.map((item) =>
        item.id === id ? { ...item, is_active: isActive ? 1 : 0 } : item
      );
      await setTableRecords('plan_templates', updated);
      return;
    }
    const scoped = await getScopedDatabase();
    if (!scoped) return;
    await scoped.db.runAsync(
      'UPDATE plan_templates SET is_active = ? WHERE id = ? AND user_id = ?',
      [isActive ? 1 : 0, id, scoped.userId]
    );
  },
};
