/**
 * Native local-data wipe used by account deletion.
 *
 * This removes the SQLite database, all AsyncStorage entries (including cached
 * Supabase session material), and known SecureStore entries. It is intentionally
 * broader than a logout. The web build uses localData.web.ts instead, so the
 * browser bundle never imports expo-sqlite.
 *
 * Deletion fails loudly if any store cannot be cleared. The caller then keeps
 * the account signed in and shows an error, so the user can retry instead of
 * receiving a false success while health data remains on disk.
 */
import AsyncStorage from '@react-native-async-storage/async-storage';
import * as SQLite from 'expo-sqlite';
import { closeDatabase, resetDatabaseInstance } from '../db/sqlite';
import { clearKnownSecureItems } from './secureStorage';
import { performLocalWipe } from './localWipe';
import { setActiveLocalUserId } from '../utils/localScope';

export async function wipeAllLocalData(): Promise<void> {
  await performLocalWipe({
    closeDatabase,
    deleteDatabase: async () => {
      try {
        // Opening first also covers a fresh install where the file may not exist,
        // because expo-sqlite throws "database not found" when deleting a missing file.
        const database = await SQLite.openDatabaseAsync('otwo.db');
        await database.closeAsync();
        await SQLite.deleteDatabaseAsync('otwo.db');
      } finally {
        resetDatabaseInstance();
      }
    },
    clearAppStorage: () => AsyncStorage.clear(),
    clearSecureItems: clearKnownSecureItems,
    clearActiveAccount: () => setActiveLocalUserId(null),
  });
}
