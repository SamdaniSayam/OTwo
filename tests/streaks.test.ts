import { strict as assert } from 'node:assert';
import { test } from 'node:test';
import { calculateFullDayStreak } from '../src/services/streaks';

test('counts consecutive full days ending today', () => {
  const result = calculateFullDayStreak(
    [
      { date: '2026-11-02', total: 3, completed: 3 },
      { date: '2026-11-03', total: 4, completed: 4 },
      { date: '2026-11-04', total: 2, completed: 2 },
    ],
    '2026-11-04'
  );

  assert.equal(result.current, 3);
  assert.equal(result.best, 3);
  assert.equal(result.isTodayComplete, true);
  assert.equal(result.lastCompletedDate, '2026-11-04');
});

test('keeps yesterday-anchored streak when today is still incomplete', () => {
  const result = calculateFullDayStreak(
    [
      { date: '2026-11-01', total: 2, completed: 2 },
      { date: '2026-11-02', total: 2, completed: 2 },
      { date: '2026-11-03', total: 2, completed: 2 },
      { date: '2026-11-04', total: 2, completed: 1 },
    ],
    '2026-11-04'
  );

  assert.equal(result.current, 3);
  assert.equal(result.isTodayComplete, false);
});

test('a partially completed day breaks the streak', () => {
  const result = calculateFullDayStreak(
    [
      { date: '2026-11-01', total: 2, completed: 2 },
      { date: '2026-11-02', total: 2, completed: 1 },
      { date: '2026-11-03', total: 2, completed: 2 },
      { date: '2026-11-04', total: 2, completed: 2 },
    ],
    '2026-11-04'
  );

  assert.equal(result.current, 2);
  assert.equal(result.best, 2);
});

test('a missing calendar day is not hidden by later completions', () => {
  const result = calculateFullDayStreak(
    [
      { date: '2026-10-01', total: 1, completed: 1 },
      { date: '2026-10-02', total: 1, completed: 1 },
      { date: '2026-10-03', total: 1, completed: 1 },
      { date: '2026-10-05', total: 1, completed: 1 },
    ],
    '2026-10-05'
  );

  assert.equal(result.current, 1);
  assert.equal(result.best, 3);
});

test('duplicate history rows are merged before evaluating completion', () => {
  const result = calculateFullDayStreak(
    [
      { date: '2026-11-04', total: 1, completed: 1 },
      { date: '2026-11-04', total: 1, completed: 0 },
    ],
    '2026-11-04'
  );

  // The second row for the same date leaves one planned item incomplete, so
  // the day must not count just because one duplicate row looked complete.
  assert.equal(result.current, 0);
  assert.equal(result.best, 0);
  assert.equal(result.isTodayComplete, false);
});

test('returns an empty streak for no eligible history', () => {
  const result = calculateFullDayStreak([], '2026-11-04');

  assert.equal(result.current, 0);
  assert.equal(result.best, 0);
  assert.equal(result.isTodayComplete, false);
  assert.equal(result.lastCompletedDate, undefined);
});
