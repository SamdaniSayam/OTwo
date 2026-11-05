/**
 * Full-day routine streak calculation.
 *
 * A streak day counts only when every planned item for that day is completed.
 * The calculation is derived from stored plans instead of incrementing a
 * counter, so unchecking an item corrects the streak immediately and a missed
 * calendar day cannot be hidden by later completions.
 */
import { addLocalDays, parseLocalDate, getLocalDateString } from '../utils/date';

export interface DailyCompletionStat {
  date: string;
  total: number;
  completed: number;
}

export interface StreakResult {
  current: number;
  best: number;
  lastCompletedDate?: string;
  isTodayComplete: boolean;
}

function isComplete(stat: DailyCompletionStat): boolean {
  return stat.total > 0 && stat.completed >= stat.total;
}

function previousDate(date: string): string {
  return getLocalDateString(addLocalDays(parseLocalDate(date), -1));
}

/**
 * @param history Daily totals. Dates may be unsorted or duplicated.
 * @param today Local YYYY-MM-DD date.
 */
export function calculateFullDayStreak(
  history: DailyCompletionStat[],
  today: string
): StreakResult {
  const byDate = new Map<string, DailyCompletionStat>();
  for (const stat of history) {
    if (!stat || !stat.date || stat.total <= 0) continue;
    const existing = byDate.get(stat.date);
    if (existing) {
      existing.total += stat.total;
      existing.completed += stat.completed;
    } else {
      byDate.set(stat.date, { ...stat });
    }
  }

  const completeDates = Array.from(byDate.values())
    .filter(isComplete)
    .map((stat) => stat.date)
    .sort((a, b) => a.localeCompare(b));
  const completeSet = new Set(completeDates);

  const isTodayComplete = completeSet.has(today);
  const anchor = isTodayComplete ? today : previousDate(today);
  let current = 0;
  let cursor = anchor;
  while (completeSet.has(cursor)) {
    current += 1;
    cursor = previousDate(cursor);
  }

  let best = 0;
  let run = 0;
  let previous: string | null = null;
  for (const date of completeDates) {
    if (previous && previousDate(date) === previous) {
      run += 1;
    } else {
      run = 1;
    }
    best = Math.max(best, run);
    previous = date;
  }

  return {
    current,
    best,
    lastCompletedDate: completeDates.length > 0 ? completeDates[completeDates.length - 1] : undefined,
    isTodayComplete,
  };
}
