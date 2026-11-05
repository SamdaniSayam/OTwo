/**
 * Web storage implementation.
 *
 * Metro resolves this file for `react-native-web`, so the browser bundle never
 * imports the native expo-sqlite module. Storage keys are namespaced per
 * account and every record is filtered by user_id.
 */
import AsyncStorage from '@react-native-async-storage/async-storage';
import { getActiveLocalUserId } from '../utils/localScope';

export type {
  PlanTemplateRow,
  DailyPlanRow,
  RecoveryStateRow,
  MedicationReminderRow,
  HabitRow,
  SymptomLogRow,
  EnvironmentCacheRow,
  SensitiveNoteRow,
} from './sqlite';

export type WebTableName =
  | 'plan_templates'
  | 'daily_plans'
  | 'recovery_state'
  | 'medication_reminders'
  | 'habits'
  | 'symptom_logs'
  | 'environment_cache'
  | 'sensitive_notes';

function webStorageKey(tableName: WebTableName, userId: string): string {
  return `@web_${encodeURIComponent(userId)}_${tableName}`;
}

export async function getDatabase(): Promise<null> {
  return null;
}

export async function resetDatabaseInstance(): Promise<void> {
  // No native database on web.
}

export async function initDatabase(): Promise<void> {
  // No global seed data is created. Each account gets its own keys lazily.
}

export async function getTableRecords<T>(tableName: WebTableName): Promise<T[]> {
  const userId = getActiveLocalUserId();
  if (!userId) return [];
  const data = await AsyncStorage.getItem(webStorageKey(tableName, userId));
  if (!data) return [];
  try {
    const parsed: unknown = JSON.parse(data);
    if (!Array.isArray(parsed)) return [];
    return parsed.filter(
      (record): record is T =>
        Boolean(record) &&
        typeof record === 'object' &&
        (record as { user_id?: string }).user_id === userId
    );
  } catch {
    return [];
  }
}

export async function setTableRecords<T extends { user_id?: string }>(
  tableName: WebTableName,
  records: T[]
): Promise<void> {
  const userId = getActiveLocalUserId();
  if (!userId) return;
  const scoped = records.map((record) => ({ ...record, user_id: userId }));
  await AsyncStorage.setItem(webStorageKey(tableName, userId), JSON.stringify(scoped));
}

export async function getScopedDatabase(): Promise<null> {
  return null;
}

export function requireScopedUserId(): string {
  const userId = getActiveLocalUserId();
  if (!userId) throw new Error('No active local account');
  return userId;
}
