/**
 * Clears in-memory account data when the active account changes.
 * Persisted data remains in the account-scoped store for that account.
 */
import { usePlanStore } from './usePlanStore';
import { useSymptomStore } from './useSymptomStore';
import { useHabitStore } from './useHabitStore';
import { useCompanionStore } from './useCompanionStore';
import { useEnvStore } from './useEnvStore';

export function resetInMemoryStores(): void {
  usePlanStore.getState().reset();
  useSymptomStore.getState().reset();
  useHabitStore.getState().reset();
  useCompanionStore.getState().reset();
  useEnvStore.getState().reset();
}
