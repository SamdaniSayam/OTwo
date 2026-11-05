import { strict as assert } from 'node:assert';
import { test } from 'node:test';
import { averageBreathingRating, summarizeAdherence } from '../src/services/reportMath';

test('adherence uses total completed items over total planned items', () => {
  const summary = summarizeAdherence([
    { date: '2026-11-01', total: 1, completed: 1 },
    { date: '2026-11-02', total: 5, completed: 1 },
  ]);

  assert.equal(summary.plannedItems, 6);
  assert.equal(summary.completedItems, 2);
  assert.equal(summary.consistencyRate, 33);
});

test('adherence is zero when nothing was planned instead of dividing by zero', () => {
  const summary = summarizeAdherence([]);

  assert.deepEqual(summary, {
    plannedItems: 0,
    completedItems: 0,
    consistencyRate: 0,
  });
});

test('adherence ignores impossible completion counts', () => {
  const summary = summarizeAdherence([
    { date: '2026-11-01', total: 3, completed: 5 },
    { date: '2026-11-02', total: -2, completed: 1 },
  ]);

  assert.equal(summary.plannedItems, 3);
  assert.equal(summary.completedItems, 3);
  assert.equal(summary.consistencyRate, 100);
});

test('average breathing rating is rounded to one decimal', () => {
  assert.equal(
    averageBreathingRating([
      { breathing_difficulty: 1 },
      { breathing_difficulty: 2 },
      { breathing_difficulty: 2 },
    ]),
    1.7
  );
});

test('average breathing rating stays missing when there are no logs', () => {
  assert.equal(averageBreathingRating([]), null);
});
