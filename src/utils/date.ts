/**
 * Local calendar-date utilities.
 *
 * Calendar dates in this app (plans, symptom logs, streaks, recovery, reports)
 * must always represent the user's local day. Never derive them from
 * `Date#toISOString()`, because that converts to UTC and can move the date
 * across midnight for users outside UTC.
 *
 * Instants (audit/completion timestamps) still use ISO-8601 UTC strings; those
 * are intentionally not handled by this module.
 */

const LOCAL_DATE_PATTERN = /^(\d{4})-(\d{2})-(\d{2})$/;

/** Format a Date as YYYY-MM-DD using local time components. */
export function getLocalDateString(date: Date = new Date()): string {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

/**
 * Parse a local YYYY-MM-DD string into a Date at local noon.
 * Noon avoids DST transitions that can otherwise shift the calendar day.
 */
export function parseLocalDate(value: string): Date {
  const match = LOCAL_DATE_PATTERN.exec(value);
  if (!match) {
    throw new Error(`Invalid local date: ${value}`);
  }
  const year = Number(match[1]);
  const month = Number(match[2]);
  const day = Number(match[3]);
  const date = new Date(year, month - 1, day, 12, 0, 0, 0);
  if (
    date.getFullYear() !== year ||
    date.getMonth() !== month - 1 ||
    date.getDate() !== day
  ) {
    throw new Error(`Invalid local date: ${value}`);
  }
  return date;
}

export function isValidLocalDateString(value: string): boolean {
  try {
    parseLocalDate(value);
    return true;
  } catch {
    return false;
  }
}

/** Add/subtract calendar days without crossing through UTC. */
export function addLocalDays(date: Date, days: number): Date {
  const result = new Date(date.getFullYear(), date.getMonth(), date.getDate(), 12, 0, 0, 0);
  result.setDate(result.getDate() + days);
  return result;
}

/** Local calendar date for N days ago (0 = today). */
export function getLocalDateStringDaysAgo(days: number, now: Date = new Date()): string {
  return getLocalDateString(addLocalDays(now, -days));
}

/** Inclusive list of local dates ending today, oldest first. */
export function getRecentLocalDates(days: number, now: Date = new Date()): string[] {
  const dates: string[] = [];
  for (let offset = days - 1; offset >= 0; offset -= 1) {
    dates.push(getLocalDateString(addLocalDays(now, -offset)));
  }
  return dates;
}

/** Whole-day difference between two local calendar dates (b - a). */
export function daysBetweenLocalDates(from: string, to: string): number {
  const fromDate = parseLocalDate(from);
  const toDate = parseLocalDate(to);
  return Math.round((toDate.getTime() - fromDate.getTime()) / 86_400_000);
}

/** Format a stored local date for display, without UTC conversion. */
export function formatLocalDate(
  value: string,
  options: Intl.DateTimeFormatOptions = { month: 'short', day: 'numeric' },
  locale?: string
): string {
  try {
    return parseLocalDate(value).toLocaleDateString(locale, options);
  } catch {
    return value;
  }
}
