/**
 * Local Database Management - Local First
 * Uses expo-sqlite on native (Android/iOS) with an AsyncStorage adapter on web.
 *
 * Every row is scoped by user_id. There is no global/shared table data.
 */
import { Platform } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import * as SQLite from 'expo-sqlite';
import * as Crypto from 'expo-crypto';
import {
  getSecureItem,
  SECURE_STORAGE_KEYS,
  setSecureItem,
} from '../services/secureStorage';
import {
  getActiveLocalUserId,
  LEGACY_UNSCOPED_USER_ID,
  requireActiveLocalUserId,
} from '../utils/localScope';

export interface PlanTemplateRow {
  id: string;
  user_id?: string;
  category: string;
  title: string;
  description: string;
  default_time?: string;
  is_active: number;
  source: string; // 'onboarding', 'user', 'recovery'
}

export interface DailyPlanRow {
  id: string;
  user_id?: string;
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
  id?: number;
  user_id?: string;
  consecutive_missed_days: number;
  recovery_active: number;
  recovery_start_date?: string;
  recovery_days_remaining: number;
  /** Local date the state was last evaluated; makes daily evaluation idempotent. */
  last_evaluated_date?: string;
}

export interface MedicationReminderRow {
  id: string;
  user_id?: string;
  label: string;
  time: string;
  frequency: string;
  is_active: number;
}

export interface HabitRow {
  id: string;
  user_id?: string;
  name: string;
  category: string;
  target_frequency: string;
  current_streak: number;
  best_streak: number;
  last_completed_date?: string;
}

export interface SymptomLogRow {
  id: string;
  user_id?: string;
  date: string;
  timestamp: string;
  breathing_difficulty: number; // 1 - 5
  cough_presence: number;       // 0 = none, 1 = mild, 2 = persistent
  triggers: string;             // comma separated
  notes?: string;
}

export interface EnvironmentCacheRow {
  user_id?: string;
  aqi_level: number;
  weather_summary: string;
  temp_c: number;
  updated_at: string;
}

export interface SensitiveNoteRow {
  user_id: string;
  doctor_recommendations: string;
  updated_at: string;
}

let dbInstance: SQLite.SQLiteDatabase | null = null;
let dbOpening: Promise<SQLite.SQLiteDatabase | null> | null = null;
let pendingLegacyRows: Record<string, unknown[]> | null = null;

const DB_NAME = 'otwo.db';
const DB_KEY_SECURE_ITEM = SECURE_STORAGE_KEYS.databaseKey;
const DB_KEY_PATTERN = /^[0-9a-f]{64}$/;

const LOCAL_TABLES = [
  'plan_templates',
  'daily_plans',
  'recovery_state',
  'medication_reminders',
  'habits',
  'symptom_logs',
  'environment_cache',
  'sensitive_notes',
] as const;

/**
 * Generate (or load) the SQLCipher key. The key never leaves SecureStore: it is
 * not part of the database, exports, cloud sync, or logs.
 */
async function getOrCreateDatabaseKey(): Promise<string> {
  const existing = await getSecureItem(DB_KEY_SECURE_ITEM);
  if (existing && DB_KEY_PATTERN.test(existing)) return existing;

  const bytes = await Crypto.getRandomBytesAsync(32);
  const key = Array.from(bytes)
    .map((byte) => byte.toString(16).padStart(2, '0'))
    .join('');
  await setSecureItem(DB_KEY_SECURE_ITEM, key);
  return key;
}

/**
 * A SQLCipher build can read an existing plaintext database without a key.
 * Detect that legacy file and copy its rows into memory before replacing it
 * with an encrypted database. A normal encrypted file cannot be read without
 * its key, so the same probe returns null for it.
 */
async function probeLegacyPlaintextDatabase(): Promise<void> {
  let probe: SQLite.SQLiteDatabase | null = null;
  try {
    probe = await SQLite.openDatabaseAsync(DB_NAME, { useNewConnection: true });

    const cipher = await probe.getFirstAsync<{ cipher_version?: string }>(
      'PRAGMA cipher_version'
    );
    if (!cipher?.cipher_version) {
      throw new Error(
        'Encrypted local storage is not available in this build. Use a development or production build with the SQLCipher expo-sqlite configuration; health data is not written to an unencrypted database.'
      );
    }

    try {
      await probe.getFirstAsync('SELECT name FROM sqlite_master LIMIT 1');
    } catch {
      // The file is already encrypted. The keyed connection below opens it.
      return;
    }

    const rows: Record<string, unknown[]> = {};
    for (const table of LOCAL_TABLES) {
      try {
        rows[table] = await probe.getAllAsync<Record<string, unknown>>(
          `SELECT * FROM ${table}`
        );
      } catch {
        // Table did not exist in the legacy schema.
        rows[table] = [];
      }
    }

    await probe.closeAsync();
    probe = null;

    await SQLite.deleteDatabaseAsync(DB_NAME);
    pendingLegacyRows = rows;
  } finally {
    if (probe) {
      await probe.closeAsync().catch(() => undefined);
    }
  }
}

async function openDatabaseInternal(): Promise<SQLite.SQLiteDatabase> {
  const key = await getOrCreateDatabaseKey();
  await probeLegacyPlaintextDatabase();

  const db = await SQLite.openDatabaseAsync(DB_NAME);
  await db.execAsync(`PRAGMA key = "x'${key}'";`);
  try {
    // Reading the schema verifies the key. A wrong key or an unreadable file
    // fails here rather than silently creating a second empty database.
    await db.getFirstAsync('SELECT count(*) AS count FROM sqlite_master');
  } catch (error) {
    await db.closeAsync().catch(() => undefined);
    throw new Error(
      'The encrypted local database could not be opened. The stored key may have been removed by a device restore; local health data cannot be read safely.',
      { cause: error }
    );
  }
  return db;
}

export async function getDatabase(): Promise<SQLite.SQLiteDatabase | null> {
  if (Platform.OS === 'web') {
    return null; // Handled by web storage adapter
  }
  if (dbInstance) return dbInstance;
  if (!dbOpening) {
    dbOpening = openDatabaseInternal()
      .then((db) => {
        dbInstance = db;
        return db;
      })
      .finally(() => {
        dbOpening = null;
      });
  }
  return dbOpening;
}

export function resetDatabaseInstance(): void {
  dbInstance = null;
}

/**
 * Close the open database before deleting its file.
 *
 * expo-sqlite refuses to delete a database that is still cached by the native
 * module, so account deletion must close it first. Any close failure is left to
 * the caller: deletion will then fail loudly instead of claiming success.
 */
export async function closeDatabase(): Promise<void> {
  const current = dbInstance;
  dbInstance = null;
  if (!current) return;
  try {
    await current.closeAsync();
  } catch {
    // The connection may already be closed. Deletion below verifies the result.
  }
}

async function getTableColumns(
  db: SQLite.SQLiteDatabase,
  tableName: string
): Promise<string[]> {
  const rows = await db.getAllAsync<{ name: string }>(`PRAGMA table_info(${tableName})`);
  return rows.map((row) => row.name);
}

async function addUserColumnIfMissing(
  db: SQLite.SQLiteDatabase,
  tableName: string
): Promise<void> {
  const columns = await getTableColumns(db, tableName);
  if (columns.length > 0 && !columns.includes('user_id')) {
    await db.execAsync(
      `ALTER TABLE ${tableName} ADD COLUMN user_id TEXT NOT NULL DEFAULT '${LEGACY_UNSCOPED_USER_ID}'`
    );
  }
}

async function addColumnIfMissing(
  db: SQLite.SQLiteDatabase,
  tableName: string,
  columnName: string,
  definition: string
): Promise<void> {
  const columns = await getTableColumns(db, tableName);
  if (columns.length > 0 && !columns.includes(columnName)) {
    await db.execAsync(`ALTER TABLE ${tableName} ADD COLUMN ${columnName} ${definition}`);
  }
}

function quoteIdentifier(identifier: string): string {
  return `"${identifier.replace(/"/g, '""')}"`;
}

/**
 * Re-insert rows copied from a legacy plaintext database after the encrypted
 * schema exists. Column names are allow-listed by the actual row shape and
 * quoted, so legacy data cannot inject SQL.
 */
async function flushPendingLegacyRows(db: SQLite.SQLiteDatabase): Promise<void> {
  if (!pendingLegacyRows) return;

  for (const table of LOCAL_TABLES) {
    const rows = pendingLegacyRows[table] || [];
    for (const row of rows) {
      if (!row || typeof row !== 'object') continue;
      const columns = Object.keys(row);
      if (columns.length === 0) continue;
      const placeholders = columns.map(() => '?').join(', ');
      const values = columns.map((column): SQLite.SQLiteBindValue => {
        const value = (row as Record<string, unknown>)[column];
        if (value === undefined || value === null) return null;
        if (
          typeof value === 'string' ||
          typeof value === 'number' ||
          typeof value === 'boolean'
        ) {
          return value;
        }
        if (value instanceof Uint8Array) return value;
        // Legacy rows are JSON-decoded, so objects/arrays are not expected.
        // Store a stable string representation rather than passing an
        // unsupported bind value into SQLite.
        return JSON.stringify(value);
      });
      await db.runAsync(
        `INSERT OR REPLACE INTO ${table} (${columns
          .map(quoteIdentifier)
          .join(', ')}) VALUES (${placeholders})`,
        values
      );
    }
  }

  pendingLegacyRows = null;
}

async function rebuildSingletonTable(
  db: SQLite.SQLiteDatabase,
  tableName: string,
  createSql: string
): Promise<void> {
  const columns = await getTableColumns(db, tableName);
  if (columns.length > 0 && !columns.includes('user_id')) {
    await db.execAsync(`
      ALTER TABLE ${tableName} RENAME TO ${tableName}_legacy;
      ${createSql}
      DROP TABLE ${tableName}_legacy;
    `);
  } else if (columns.length === 0) {
    await db.execAsync(createSql);
  }
}

/**
 * Initialize all local SQLite tables and migrate pre-isolation databases.
 * Legacy rows are quarantined under LEGACY_UNSCOPED_USER_ID and are never read
 * by an account.
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
      user_id TEXT NOT NULL,
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
      user_id TEXT NOT NULL,
      date TEXT NOT NULL,
      category TEXT NOT NULL,
      title TEXT NOT NULL,
      description TEXT,
      is_completed INTEGER DEFAULT 0,
      completion_time TEXT,
      notes TEXT,
      is_recovery_item INTEGER DEFAULT 0
    );

    -- 3. Adaptive Recovery State (one row per account)
    CREATE TABLE IF NOT EXISTS recovery_state (
      user_id TEXT PRIMARY KEY,
      consecutive_missed_days INTEGER DEFAULT 0,
      recovery_active INTEGER DEFAULT 0,
      recovery_start_date TEXT,
      recovery_days_remaining INTEGER DEFAULT 0,
      last_evaluated_date TEXT
    );

    -- 4. Medication Reminders (User defined, reminder only)
    CREATE TABLE IF NOT EXISTS medication_reminders (
      id TEXT PRIMARY KEY,
      user_id TEXT NOT NULL,
      label TEXT NOT NULL,
      time TEXT NOT NULL,
      frequency TEXT NOT NULL,
      is_active INTEGER DEFAULT 1
    );

    -- 5. Habits & Streaks
    CREATE TABLE IF NOT EXISTS habits (
      id TEXT PRIMARY KEY,
      user_id TEXT NOT NULL,
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
      user_id TEXT NOT NULL,
      date TEXT NOT NULL,
      timestamp TEXT NOT NULL,
      breathing_difficulty INTEGER NOT NULL,
      cough_presence INTEGER DEFAULT 0,
      triggers TEXT,
      notes TEXT
    );

    -- 7. Environment Cache (one row per account)
    CREATE TABLE IF NOT EXISTS environment_cache (
      user_id TEXT PRIMARY KEY,
      aqi_level INTEGER,
      weather_summary TEXT,
      temp_c REAL,
      updated_at TEXT
    );

    -- 8. Doctor advice notes (local-only; never uploaded)
    CREATE TABLE IF NOT EXISTS sensitive_notes (
      user_id TEXT PRIMARY KEY,
      doctor_recommendations TEXT NOT NULL,
      updated_at TEXT NOT NULL
    );
  `);

  // Migrate tables created by versions that had no user_id column.
  await addUserColumnIfMissing(db, 'plan_templates');
  await addUserColumnIfMissing(db, 'daily_plans');
  await addUserColumnIfMissing(db, 'medication_reminders');
  await addUserColumnIfMissing(db, 'habits');
  await addUserColumnIfMissing(db, 'symptom_logs');
  await addUserColumnIfMissing(db, 'sensitive_notes');

  await rebuildSingletonTable(
    db,
    'recovery_state',
    `CREATE TABLE recovery_state (
      user_id TEXT PRIMARY KEY,
      consecutive_missed_days INTEGER DEFAULT 0,
      recovery_active INTEGER DEFAULT 0,
      recovery_start_date TEXT,
      recovery_days_remaining INTEGER DEFAULT 0,
      last_evaluated_date TEXT
    );`
  );

  await addColumnIfMissing(db, 'recovery_state', 'last_evaluated_date', 'TEXT');

  await rebuildSingletonTable(
    db,
    'environment_cache',
    `CREATE TABLE environment_cache (
      user_id TEXT PRIMARY KEY,
      aqi_level INTEGER,
      weather_summary TEXT,
      temp_c REAL,
      updated_at TEXT
    );`
  );

  await db.execAsync(`
    CREATE INDEX IF NOT EXISTS idx_plan_templates_user ON plan_templates(user_id);
    CREATE INDEX IF NOT EXISTS idx_daily_plans_user_date ON daily_plans(user_id, date);
    CREATE INDEX IF NOT EXISTS idx_medication_reminders_user ON medication_reminders(user_id);
    CREATE INDEX IF NOT EXISTS idx_habits_user ON habits(user_id);
    CREATE INDEX IF NOT EXISTS idx_symptom_logs_user_date ON symptom_logs(user_id, date);
  `);

  await flushPendingLegacyRows(db);
}

/**
 * Web PWA Storage Adapter using AsyncStorage.
 * Keys are namespaced per account and records are additionally filtered by
 * user_id, so one browser profile can hold multiple accounts safely.
 */
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

async function initWebStorage(): Promise<void> {
  // No global seed data is created. Each account gets its own keys lazily.
}

export async function getTableRecords<T>(tableName: WebTableName): Promise<T[]> {
  if (Platform.OS === 'web') {
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
  const db = await getDatabase();
  if (!db) return [];
  const userId = getActiveLocalUserId();
  if (!userId) return [];
  const rows = await db.getAllAsync<T>(
    `SELECT * FROM ${tableName} WHERE user_id = ?`,
    [userId]
  );
  return rows;
}

export async function setTableRecords<T extends { user_id?: string }>(
  tableName: WebTableName,
  records: T[]
): Promise<void> {
  if (Platform.OS !== 'web') return;
  const userId = getActiveLocalUserId();
  if (!userId) return;
  const scoped = records.map((record) => ({ ...record, user_id: userId }));
  await AsyncStorage.setItem(webStorageKey(tableName, userId), JSON.stringify(scoped));
}

/**
 * SQL helper for native repositories. Returns null when no account is active,
 * which callers must treat as an empty read / no-op write.
 */
export async function getScopedDatabase(): Promise<{
  db: SQLite.SQLiteDatabase;
  userId: string;
} | null> {
  if (Platform.OS === 'web') return null;
  const userId = getActiveLocalUserId();
  if (!userId) return null;
  const db = await getDatabase();
  if (!db) return null;
  return { db, userId };
}

export function requireScopedUserId(): string {
  return requireActiveLocalUserId();
}
