/**
 * Tracks the local account whose data may be read or written.
 *
 * Every local table row and every user-specific AsyncStorage key is scoped to
 * this id. The id is set by the auth store before any authenticated screen can
 * mount and cleared on logout/deletion. When no account is active, reads return
 * empty and writes are no-ops (fail closed) instead of falling back to shared
 * storage.
 */

let activeUserId: string | null = null;

export const LEGACY_UNSCOPED_USER_ID = '__legacy_unscoped__';

export function setActiveLocalUserId(userId: string | null): void {
  activeUserId = userId;
}

export function getActiveLocalUserId(): string | null {
  return activeUserId;
}

export function requireActiveLocalUserId(): string {
  if (!activeUserId) {
    throw new Error('No active local account');
  }
  return activeUserId;
}

/** Build a storage key that cannot collide with another account. */
export function scopedStorageKey(baseKey: string, userId: string | null = activeUserId): string {
  if (!userId) {
    throw new Error('No active local account');
  }
  return `${baseKey}::${encodeURIComponent(userId)}`;
}

export function isRecordForActiveUser(record: { user_id?: string } | null | undefined): boolean {
  return Boolean(activeUserId && record && record.user_id === activeUserId);
}
