/**
 * Shared local-wipe orchestration.
 *
 * Native and web deletion both use this so the same rules apply: every step is
 * attempted, and any failure is reported to the caller instead of being
 * swallowed. A deletion flow must never report success while local data
 * remains on disk.
 */
export interface LocalWipeSteps {
  /** Close a native database before its file is deleted. */
  closeDatabase?: () => Promise<void>;
  /** Delete the native database file. */
  deleteDatabase?: () => Promise<void>;
  /** Clear key-value application storage. */
  clearAppStorage: () => Promise<void>;
  /** Clear known secure-store entries. */
  clearSecureItems: () => Promise<void>;
  /** Forget the active account id in memory. */
  clearActiveAccount: () => void;
}

export async function performLocalWipe(steps: LocalWipeSteps): Promise<void> {
  const failures: string[] = [];

  if (steps.closeDatabase) {
    try {
      await steps.closeDatabase();
    } catch {
      failures.push('local database');
    }
  }

  if (steps.deleteDatabase) {
    try {
      await steps.deleteDatabase();
    } catch {
      failures.push('local database');
    }
  }

  try {
    await steps.clearAppStorage();
  } catch {
    failures.push('app storage');
  }

  try {
    await steps.clearSecureItems();
  } catch {
    failures.push('secure storage');
  }

  steps.clearActiveAccount();

  if (failures.length > 0) {
    const unique = Array.from(new Set(failures));
    throw new Error(
      `Could not fully delete local ${unique.join(' and ')}. Please retry.`
    );
  }
}
