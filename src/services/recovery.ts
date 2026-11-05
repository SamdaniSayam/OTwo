/**
 * Adaptive recovery state transitions.
 *
 * Recovery evaluation must be idempotent: loading the Today screen repeatedly
 * on the same day must not increment the missed-day counter again. The state
 * also needs a real countdown so a simplified recovery plan ends after its
 * configured duration instead of staying active forever.
 */
import type { RecoveryStateRow } from '../db/sqlite';
import { daysBetweenLocalDates } from '../utils/date';

export const RECOVERY_DURATION_DAYS = 3;

export const EMPTY_RECOVERY_STATE: RecoveryStateRow = {
  consecutive_missed_days: 0,
  recovery_active: 0,
  recovery_days_remaining: 0,
};

export interface RecoveryEvaluationInput {
  recovery: RecoveryStateRow;
  today: string;
  yesterdayPlanCount: number;
  yesterdayCompletedCount: number;
}

export interface RecoveryEvaluation {
  changed: boolean;
  state: RecoveryStateRow;
  /** True when an active recovery window ended on this evaluation. */
  recoveryExpired: boolean;
  /** True when this evaluation started a recovery window. */
  recoveryStarted: boolean;
}

/**
 * Evaluate the previous day and the recovery countdown exactly once per local
 * calendar day. Callers should persist `state` whenever `changed` is true.
 */
export function evaluateRecoveryForDay(
  input: RecoveryEvaluationInput
): RecoveryEvaluation {
  const state: RecoveryStateRow = {
    ...EMPTY_RECOVERY_STATE,
    ...input.recovery,
  };

  if (state.last_evaluated_date === input.today) {
    return {
      changed: false,
      state,
      recoveryExpired: false,
      recoveryStarted: false,
    };
  }

  let recoveryExpired = false;
  let recoveryStarted = false;

  // Count down an active recovery window from its start date. This is derived
  // from the date rather than decremented on each load, so repeated loads and
  // missed app launches cannot leave recovery active indefinitely.
  if (state.recovery_active === 1 && state.recovery_start_date) {
    const elapsed = Math.max(
      0,
      daysBetweenLocalDates(state.recovery_start_date, input.today)
    );
    const remaining = Math.max(0, RECOVERY_DURATION_DAYS - elapsed);

    if (remaining !== state.recovery_days_remaining) {
      state.recovery_days_remaining = remaining;
    }

    if (remaining === 0) {
      state.recovery_active = 0;
      state.recovery_days_remaining = 0;
      state.recovery_start_date = undefined;
      state.consecutive_missed_days = 0;
      recoveryExpired = true;
    }
  }

  // Only count a missed day when yesterday actually had a plan. A day without
  // a generated plan is not evidence that the user missed their routine.
  if (!recoveryExpired && input.yesterdayPlanCount > 0) {
    if (input.yesterdayCompletedCount === 0) {
      const missed = state.consecutive_missed_days + 1;
      state.consecutive_missed_days = missed;

      // Two consecutive missed days trigger a gentle, time-limited recovery
      // plan. Never start a second window while one is already active.
      if (missed >= 2 && state.recovery_active !== 1) {
        state.recovery_active = 1;
        state.recovery_start_date = input.today;
        state.recovery_days_remaining = RECOVERY_DURATION_DAYS;
        recoveryStarted = true;
      }
    } else if (state.consecutive_missed_days !== 0) {
      state.consecutive_missed_days = 0;
    }
  }

  // Record the evaluation date even when nothing else changed. This is what
  // makes repeated same-day loads a no-op.
  state.last_evaluated_date = input.today;

  return { changed: true, state, recoveryExpired, recoveryStarted };
}
