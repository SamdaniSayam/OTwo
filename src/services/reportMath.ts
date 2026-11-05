/**
 * Pure report arithmetic.
 *
 * Keeping these calculations independent of the database makes the reporting
 * rules directly testable: adherence is total completed items divided by total
 * planned items, and a missing measurement stays missing instead of becoming a
 * misleading zero.
 */
export interface DailyCompletionStat {
  date: string;
  total: number;
  completed: number;
}

export interface AdherenceSummary {
  plannedItems: number;
  completedItems: number;
  consistencyRate: number;
}

export function summarizeAdherence(stats: DailyCompletionStat[]): AdherenceSummary {
  const plannedItems = stats.reduce(
    (total, day) => total + Math.max(0, day.total),
    0
  );
  const completedItems = stats.reduce(
    (total, day) => total + Math.max(0, Math.min(day.completed, day.total)),
    0
  );
  const consistencyRate =
    plannedItems > 0 ? Math.round((completedItems / plannedItems) * 100) : 0;

  return { plannedItems, completedItems, consistencyRate };
}

export function averageBreathingRating(
  logs: { breathing_difficulty: number }[]
): number | null {
  if (logs.length === 0) return null;
  const total = logs.reduce((sum, log) => sum + log.breathing_difficulty, 0);
  return Math.round((total / logs.length) * 10) / 10;
}
