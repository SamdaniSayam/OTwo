/**
 * Web local-data wipe used by account deletion.
 *
 * The browser build never imports expo-sqlite. AsyncStorage.clear() removes the
 * per-account tables, cached guest id, Supabase session material, and settings.
 *
 * A failed clear is surfaced to the caller. Account deletion must not report
 * success while health data remains in browser storage.
 */
import AsyncStorage from '@react-native-async-storage/async-storage';
import { clearKnownSecureItems } from './secureStorage';
import { performLocalWipe } from './localWipe';
import { setActiveLocalUserId } from '../utils/localScope';

export async function wipeAllLocalData(): Promise<void> {
  await performLocalWipe({
    clearAppStorage: async () => {
      await AsyncStorage.clear();

      if (typeof sessionStorage !== 'undefined') {
        try {
          sessionStorage.clear();
        } catch {
          // sessionStorage is not used for health data; private-mode
          // restrictions must not block removal of persistent storage above.
        }
      }
    },
    clearSecureItems: clearKnownSecureItems,
    clearActiveAccount: () => setActiveLocalUserId(null),
  });
}
