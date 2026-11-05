/**
 * Secure-storage key constants and validation.
 *
 * Kept free of React Native imports so the invariants can be regression-tested
 * with Node. `expo-secure-store` only accepts simple alphanumeric keys with
 * dots, underscores, and hyphens; an invalid key makes initialization fail.
 */
export const SECURE_STORAGE_KEYS = {
  cachedProfile: 'otwo_cached_auth_profile',
  databaseKey: 'otwo_db_key',
} as const;

const SECURE_KEY_PATTERN = /^[A-Za-z0-9._-]+$/;

export function isValidSecureStorageKey(key: string): boolean {
  return SECURE_KEY_PATTERN.test(key);
}
