import { strict as assert } from 'node:assert';
import { test } from 'node:test';
import {
  EMPTY_RECOVERY_STATE,
  RECOVERY_DURATION_DAYS,
  evaluateRecoveryForDay,
} from '../src/services/recovery';

test('re-evaluating the same local day is a no-op', () => {
  const first = evaluateRecoveryForDay({
    recovery: { ...EMPTY_RECOVERY_STATE },
    today: '2026-11-02',
    yesterdayPlanCount: 4,
    yesterdayCompletedCount: 0,
  });

  assert.equal(first.changed, true);
  assert.equal(first.state.consecutive_missed_days, 1);
  assert.equal(first.state.last_evaluated_date, '2026-11-02');

  const second = evaluateRecoveryForDay({
    recovery: first.state,
    today: '2026-11-02',
    yesterdayPlanCount: 4,
    yesterdayCompletedCount: 0,
  });

  assert.equal(second.changed, false);
  assert.equal(second.state.consecutive_missed_days, 1);
  assert.equal(second.recoveryStarted, false);
});

test('a day without a plan does not count as a missed day', () => {
  const result = evaluateRecoveryForDay({
    recovery: { ...EMPTY_RECOVERY_STATE },
    today: '2026-11-02',
    yesterdayPlanCount: 0,
    yesterdayCompletedCount: 0,
  });

  assert.equal(result.state.consecutive_missed_days, 0);
  assert.equal(result.recoveryStarted, false);
  assert.equal(result.changed, true);
});

test('two consecutive missed days start a time-limited recovery window', () => {
  const result = evaluateRecoveryForDay({
    recovery: {
      ...EMPTY_RECOVERY_STATE,
      consecutive_missed_days: 1,
      last_evaluated_date: '2026-11-01',
    },
    today: '2026-11-02',
    yesterdayPlanCount: 3,
    yesterdayCompletedCount: 0,
  });

  assert.equal(result.state.consecutive_missed_days, 2);
  assert.equal(result.state.recovery_active, 1);
  assert.equal(result.state.recovery_start_date, '2026-11-02');
  assert.equal(result.state.recovery_days_remaining, RECOVERY_DURATION_DAYS);
  assert.equal(result.recoveryStarted, true);
});

test('an active recovery window counts down and expires on schedule', () => {
  const dayTwo = evaluateRecoveryForDay({
    recovery: {
      ...EMPTY_RECOVERY_STATE,
      consecutive_missed_days: 2,
      recovery_active: 1,
      recovery_start_date: '2026-11-02',
      recovery_days_remaining: 3,
      last_evaluated_date: '2026-11-02',
    },
    today: '2026-11-04',
    yesterdayPlanCount: 2,
    yesterdayCompletedCount: 2,
  });

  assert.equal(dayTwo.recoveryExpired, false);
  assert.equal(dayTwo.state.recovery_days_remaining, 1);
  assert.equal(dayTwo.state.recovery_active, 1);

  const expired = evaluateRecoveryForDay({
    recovery: dayTwo.state,
    today: '2026-11-05',
    yesterdayPlanCount: 2,
    yesterdayCompletedCount: 2,
  });

  assert.equal(expired.recoveryExpired, true);
  assert.equal(expired.state.recovery_active, 0);
  assert.equal(expired.state.recovery_days_remaining, 0);
  assert.equal(expired.state.recovery_start_date, undefined);
  assert.equal(expired.state.consecutive_missed_days, 0);
});

test('completing any item resets the missed-day counter', () => {
  const result = evaluateRecoveryForDay({
    recovery: {
      ...EMPTY_RECOVERY_STATE,
      consecutive_missed_days: 1,
      last_evaluated_date: '2026-11-01',
    },
    today: '2026-11-02',
    yesterdayPlanCount: 3,
    yesterdayCompletedCount: 1,
  });

  assert.equal(result.state.consecutive_missed_days, 0);
  assert.equal(result.recoveryStarted, false);
});
