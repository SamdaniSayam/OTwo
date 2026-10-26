/**
 * Local Database Management - Offline First
 * Uses expo-sqlite on native (Android/iOS) with AsyncStorage fallback for web PWA.
 */
import { Platform } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import * as SQLite from 'expo-sqlite';

export interface PlanTemplateRow {
  id: string;
  category: string;
  title: string;
  description: string;
  default_time?: string;
  is_active: number;
  source: string; // 'onboarding', 'user', 'recovery'
}

export interface DailyPlanRow {
  id: string;
  date: string;
  category: string;
  title: string;
  description?: string;
  is_completed: number; // 0 = pending, 1 = completed, 2 = skipped
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
  breathing_difficulty: number; // 1 - 5
  cough_presence: number;       // 0 = none, 1 = mild, 2 = persistent
  triggers: string;             // comma separated
  notes?: string;
}

export interface EnvironmentCacheRow {
  id: number;
  aqi_level: number;
  weather_summary: string;
  temp_c: number;
  updated_at: string;
}

let dbInstance: SQLite.SQLiteDatabase | null = null;

export async function getDatabase(): Promise<SQLite.SQLiteDatabase | null> {
  if (Platform.OS === 'web') {
    return null; // Handled by web storage adapter
  }
  if (!dbInstance) {
    dbInstance = await SQLite.openDatabaseAsync('otwo.db');
  }
  return dbInstance;
}

/**
 * Initialize all local SQLite tables
 */
export async function initDatabase(): Promise<void> {
  if (Platform.OS === 'web') {
    await initWebStorage();
    return;
  }

  const db = await getDatabase();
  if (!db) return;

  await db.execAsync(`
    PRAGMA journal_mode = WAL;

    -- 1. Plan Templates (Source of truth for Daily Plan Engine)
    CREATE TABLE IF NOT EXISTS plan_templates (
      id TEXT PRIMARY KEY,
      category TEXT NOT NULL,
      title TEXT NOT NULL,
      description TEXT,
      default_time TEXT,
      is_active INTEGER DEFAULT 1,
      source TEXT DEFAULT 'onboarding'
    );

    -- 2. Daily Checklist Plans
    CREATE TABLE IF NOT EXISTS daily_plans (
      id TEXT PRIMARY KEY,
      date TEXT NOT NULL,
      category TEXT NOT NULL,
      title TEXT NOT NULL,
      description TEXT,
      is_completed INTEGER DEFAULT 0,
      completion_time TEXT,
      notes TEXT,
      is_recovery_item INTEGER DEFAULT 0
    );
    CREATE INDEX IF NOT EXISTS idx_daily_plans_date ON daily_plans(date);

    -- 3. Adaptive Recovery State
    CREATE TABLE IF NOT EXISTS recovery_state (
      id INTEGER PRIMARY KEY CHECK (id = 1),
      consecutive_missed_days INTEGER DEFAULT 0,
      recovery_active INTEGER DEFAULT 0,
      recovery_start_date TEXT,
      recovery_days_remaining INTEGER DEFAULT 0
    );

    -- 4. Medication Reminders (User defined, reminder only)
    CREATE TABLE IF NOT EXISTS medication_reminders (
      id TEXT PRIMARY KEY,
      label TEXT NOT NULL,
      time TEXT NOT NULL,
      frequency TEXT NOT NULL,
      is_active INTEGER DEFAULT 1
    );

    -- 5. Habits & Streaks
    CREATE TABLE IF NOT EXISTS habits (
      id TEXT PRIMARY KEY,
      name TEXT NOT NULL,
      category TEXT NOT NULL,
      target_frequency TEXT NOT NULL,
      current_streak INTEGER DEFAULT 0,
      best_streak INTEGER DEFAULT 0,
      last_completed_date TEXT
    );

    -- 6. Symptom Logs (Non-diagnostic personal observations)
    CREATE TABLE IF NOT EXISTS symptom_logs (
      id TEXT PRIMARY KEY,
      date TEXT NOT NULL,
      timestamp TEXT NOT NULL,
      breathing_difficulty INTEGER NOT NULL,
      cough_presence INTEGER DEFAULT 0,
      triggers TEXT,
      notes TEXT
    );
    CREATE INDEX IF NOT EXISTS idx_symptom_logs_date ON symptom_logs(date);

    -- 7. Environment Cache
    CREATE TABLE IF NOT EXISTS environment_cache (
      id INTEGER PRIMARY KEY CHECK (id = 1),
      aqi_level INTEGER,
      weather_summary TEXT,
      temp_c REAL,
      updated_at TEXT
    );

    -- Seed initial recovery state if missing
    INSERT OR IGNORE INTO recovery_state (id, consecutive_missed_days, recovery_active, recovery_days_remaining)
    VALUES (1, 0, 0, 0);
  `);
}

/**
 * Web PWA Storage Adapter using AsyncStorage
 */
const WEB_TABLES = [
  'plan_templates',
  'daily_plans',
  'recovery_state',
  'medication_reminders',
  'habits',
  'symptom_logs',
  'environment_cache',
] as const;

type WebTableName = typeof WEB_TABLES[number];

async function initWebStorage() {
  const recoveryState = await AsyncStorage.getItem('@web_recovery_state');
  if (!recoveryState) {
    await AsyncStorage.setItem(
      '@web_recovery_state',
      JSON.stringify([{ id: 1, consecutive_missed_days: 0, recovery_active: 0, recovery_days_remaining: 0 }])
    );
  }
}

export async function getTableRecords<T>(tableName: WebTableName): Promise<T[]> {
  if (Platform.OS === 'web') {
    const data = await AsyncStorage.getItem(`@web_${tableName}`);
    return data ? JSON.parse(data) : [];
  }
  const db = await getDatabase();
  if (!db) return [];
  const rows = await db.getAllAsync<T>(`SELECT * FROM ${tableName}`);
  return rows;
}

export async function setTableRecords<T>(tableName: WebTableName, records: T[]): Promise<void> {
  if (Platform.OS === 'web') {
    await AsyncStorage.setItem(`@web_${tableName}`, JSON.stringify(records));
  }
}
