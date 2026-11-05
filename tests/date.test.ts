import { strict as assert } from 'node:assert';
import { test } from 'node:test';
import {
  addLocalDays,
  daysBetweenLocalDates,
  formatLocalDate,
  getLocalDateString,
  getLocalDateStringDaysAgo,
  getRecentLocalDates,
  isValidLocalDateString,
  parseLocalDate,
} from '../src/utils/date';

test('formats the local calendar day, never the UTC day', () => {
  assert.equal(getLocalDateString(new Date(2026, 0, 1, 0, 5)), '2026-01-01');
  assert.equal(getLocalDateString(new Date(2026, 0, 1, 23, 55)), '2026-01-01');
  assert.equal(getLocalDateString(new Date(2026, 11, 31, 23, 55)), '2026-12-31');
});

test('handles month and year boundaries', () => {
  assert.deepEqual(getRecentLocalDates(3, new Date(2026, 0, 1, 12)), [
    '2025-12-30',
    '2025-12-31',
    '2026-01-01',
  ]);
  assert.equal(getLocalDateStringDaysAgo(1, new Date(2026, 2, 1, 12)), '2026-02-28');
  assert.equal(getLocalDateString(addLocalDays(new Date(2024, 1, 28, 12), 1)), '2024-02-29');
});

test('parses local dates at noon and rejects impossible dates', () => {
  const parsed = parseLocalDate('2026-03-08');
  assert.equal(parsed.getFullYear(), 2026);
  assert.equal(parsed.getMonth(), 2);
  assert.equal(parsed.getDate(), 8);
  assert.equal(parsed.getHours(), 12);

  assert.equal(isValidLocalDateString('2026-02-30'), false);
  assert.equal(isValidLocalDateString('2026-13-01'), false);
  assert.equal(isValidLocalDateString('not-a-date'), false);
  assert.equal(isValidLocalDateString('2024-02-29'), true);
  assert.throws(() => parseLocalDate('2026-02-30'));
});

test('computes whole-day differences without UTC conversion', () => {
  assert.equal(daysBetweenLocalDates('2026-03-01', '2026-03-03'), 2);
  assert.equal(daysBetweenLocalDates('2026-12-31', '2027-01-01'), 1);
  assert.equal(daysBetweenLocalDates('2026-03-03', '2026-03-01'), -2);
});

test('formats stored local dates safely', () => {
  const formatted = formatLocalDate('2026-01-02', {
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  });
  assert.match(formatted, /2026/);
  assert.equal(formatLocalDate('invalid'), 'invalid');
});
