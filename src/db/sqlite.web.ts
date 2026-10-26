/**
 * Web PWA Storage Implementation
 * Powered by AsyncStorage (IndexedDB in browser) with zero native SQLite dependencies.
 */
import AsyncStorage from '@react-native-async-storage/async-storage';

export interface PlanTemplateRow {
  id: string;
  category: string;
  title: string;
  description: string;
  default_time?: string;
  is_active: number;
  source: string;
}

export interface DailyPlanRow {
  id: string;
  date: string;
  category: string;
  title: string;
  description?: string;
  is_completed: number;
  completion_time?: string;
  notes?: string;
  is_recovery_item: number;
}

export interface RecoveryStateRow {
  id: number;
  consecutive_missed_days: number;
  recovery_active: number;
  recovery_start_date?: string;
  recovery_days_remaining: number;
}

export interface MedicationReminderRow {
  id: string;
  label: string;
  time: string;
  frequency: string;
  is_active: number;
}

export interface HabitRow {
  id: string;
  name: string;
  category: string;
  target_frequency: string;
  current_streak: number;
  best_streak: number;
  last_completed_date?: string;
}

export interface SymptomLogRow {
  id: string;
  date: string;
  timestamp: string;
  breathing_difficulty: number;
  cough_presence: number;
  triggers: string;
  notes?: string;
}

export interface EnvironmentCacheRow {
  id: number;
  aqi_level: number;
  weather_summary: string;
  temp_c: number;
  updated_at: string;
}

const WEB_TABLES = [
  'plan_templates',
  'daily_plans',
  'recovery_state',
  'medication_reminders',
  'habits',
  'symptom_logs',
  'environment_cache',
] as const;

export type WebTableName = typeof WEB_TABLES[number];

export async function getDatabase(): Promise<null> {
  return null;
}

export async function initDatabase(): Promise<void> {
  const recoveryState = await AsyncStorage.getItem('@web_recovery_state');
  if (!recoveryState) {
    await AsyncStorage.setItem(
      '@web_recovery_state',
      JSON.stringify([{ id: 1, consecutive_missed_days: 0, recovery_active: 0, recovery_days_remaining: 0 }])
    );
  }
}

export async function getTableRecords<T>(tableName: WebTableName): Promise<T[]> {
  const data = await AsyncStorage.getItem(`@web_${tableName}`);
  return data ? JSON.parse(data) : [];
}

export async function setTableRecords<T>(tableName: WebTableName, records: T[]): Promise<void> {
  await AsyncStorage.setItem(`@web_${tableName}`, JSON.stringify(records));
}
