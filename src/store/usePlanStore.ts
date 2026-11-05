/**
 * Daily Plan Store (Zustand)
 * Manages daily checklists, item completion/skips, notes, and adaptive recovery mode.
 */
import { create } from 'zustand';
import { planRepo } from '../db/repositories/planRepo';
import { templateRepo } from '../db/repositories/templateRepo';
import { habitRepo } from '../db/repositories/habitRepo';
import { DailyPlanRow, RecoveryStateRow } from '../db/sqlite';
import {
  addLocalDays,
  getLocalDateString,
  getLocalDateStringDaysAgo,
} from '../utils/date';
import {
  evaluateRecoveryForDay,
  RECOVERY_DURATION_DAYS,
  EMPTY_RECOVERY_STATE,
} from '../services/recovery';
import { calculateFullDayStreak } from '../services/streaks';

interface PlanState {
  todayDate: string;
  plans: DailyPlanRow[];
  recoveryState: RecoveryStateRow;
  isLoading: boolean;
  loadTodayPlan: () => Promise<void>;
  markItemStatus: (id: string, isCompleted: number, notes?: string) => Promise<void>;
  activateRecoveryPlan: () => Promise<void>;
  dismissRecoveryPlan: () => Promise<void>;
  reset: () => void;
}

const ROUTINE_STREAK_HABIT_ID = 'habit-consistency';

function buildRecoveryItems(today: string): DailyPlanRow[] {
  return [
    {
      id: `recovery-med-${today}`,
      date: today,
      category: 'medication_reminder',
      title: 'Prescribed Controller Inhaler',
      description: 'Stay steady with your doctor-prescribed routine today.',
      is_completed: 0,
      is_recovery_item: 1,
    },
    {
      id: `recovery-hydration-${today}`,
      date: today,
      category: 'hydration',
      title: 'Gentle Hydration (Warm Water / Herbal Tea)',
      description: 'A small, low-pressure hydration step.',
      is_completed: 0,
      is_recovery_item: 1,
    },
    {
      id: `recovery-rest-${today}`,
      date: today,
      category: 'wind_down',
      title: '10-Minute Quiet Rest or Paced Breathing',
      description: 'A reset without any pressure.',
      is_completed: 0,
      is_recovery_item: 1,
    },
  ];
}

async function refreshRoutineStreak(): Promise<void> {
  const today = getLocalDateString();
  const history = await planRepo.getCompletionHistory(getLocalDateStringDaysAgo(365), today);
  const streak = calculateFullDayStreak(history, today);
  await habitRepo.setRoutineStreak(ROUTINE_STREAK_HABIT_ID, streak);
}

async function insertTodayTemplates(today: string): Promise<DailyPlanRow[]> {
  const templates = await templateRepo.getAll();
  if (templates.length === 0) return [];
  const newPlans: DailyPlanRow[] = templates.map((template) => ({
    id: `plan-${today}-${template.id}`,
    date: today,
    category: template.category,
    title: template.title,
    description: template.description,
    is_completed: 0,
    is_recovery_item: 0,
  }));
  await planRepo.insertPlans(newPlans);
  return newPlans;
}

export const usePlanStore = create<PlanState>((set, get) => ({
  todayDate: getLocalDateString(),
  plans: [],
  recoveryState: { ...EMPTY_RECOVERY_STATE },
  isLoading: true,

  loadTodayPlan: async () => {
    try {
      set({ isLoading: true });
      const today = getLocalDateString();
      set({ todayDate: today });

      const yesterday = getLocalDateString(addLocalDays(new Date(), -1));
      const [recovery, yesterdayPlans, todayPlans] = await Promise.all([
        planRepo.getRecoveryState(),
        planRepo.getPlansByDate(yesterday),
        planRepo.getPlansByDate(today),
      ]);

      const evaluation = evaluateRecoveryForDay({
        recovery,
        today,
        yesterdayPlanCount: yesterdayPlans.length,
        yesterdayCompletedCount: yesterdayPlans.filter((plan) => plan.is_completed === 1)
          .length,
      });

      if (evaluation.changed) {
        await planRepo.setRecoveryState(evaluation.state);
      }

      let plans = todayPlans;
      const recoveryActive =
        evaluation.state.recovery_active === 1 &&
        evaluation.state.recovery_days_remaining > 0;

      if (recoveryActive) {
        const hasRecoveryItems = plans.some((plan) => plan.is_recovery_item === 1);
        const hasCompletedNormalItem = plans.some(
          (plan) => plan.is_recovery_item === 0 && plan.is_completed === 1
        );

        if (!hasRecoveryItems && !hasCompletedNormalItem) {
          // Recovery starts gently: unfinished normal items are replaced with
          // the smaller recovery checklist, while completed items are preserved.
          await planRepo.removePendingNormalPlans(today);
          await planRepo.insertPlans(buildRecoveryItems(today));
          plans = await planRepo.getPlansByDate(today);
        }
      } else {
        const hasPendingRecovery = plans.some(
          (plan) => plan.is_recovery_item === 1 && plan.is_completed === 0
        );
        if (hasPendingRecovery) {
          await planRepo.removePendingRecoveryPlans(today);
          plans = await planRepo.getPlansByDate(today);
        }

        if (!plans.some((plan) => plan.is_recovery_item === 0)) {
          const generated = await insertTodayTemplates(today);
          if (generated.length > 0) {
            plans = await planRepo.getPlansByDate(today);
          }
        }
      }

      set({
        plans,
        recoveryState: evaluation.state,
        isLoading: false,
      });

      await refreshRoutineStreak();
    } catch {
      set({ isLoading: false });
    }
  },

  markItemStatus: async (id: string, isCompleted: number, notes?: string) => {
    await planRepo.updatePlanStatus(id, isCompleted, notes);
    const today = get().todayDate;
    const plans = await planRepo.getPlansByDate(today);
    set({ plans });
    await refreshRoutineStreak();
  },

  activateRecoveryPlan: async () => {
    const today = get().todayDate;
    await planRepo.setRecoveryState({
      recovery_active: 1,
      recovery_start_date: today,
      recovery_days_remaining: RECOVERY_DURATION_DAYS,
      last_evaluated_date: today,
    });
    await planRepo.removePendingNormalPlans(today);
    await planRepo.insertPlans(buildRecoveryItems(today));
    const plans = await planRepo.getPlansByDate(today);
    set({
      plans,
      recoveryState: {
        ...get().recoveryState,
        recovery_active: 1,
        recovery_start_date: today,
        recovery_days_remaining: RECOVERY_DURATION_DAYS,
        last_evaluated_date: today,
      },
    });
    await refreshRoutineStreak();
  },

  dismissRecoveryPlan: async () => {
    const today = get().todayDate;
    await planRepo.setRecoveryState({
      recovery_active: 0,
      recovery_days_remaining: 0,
      recovery_start_date: undefined,
      consecutive_missed_days: 0,
      last_evaluated_date: today,
    });
    await planRepo.removePendingRecoveryPlans(today);
    let plans = await planRepo.getPlansByDate(today);
    if (!plans.some((plan) => plan.is_recovery_item === 0)) {
      await insertTodayTemplates(today);
      plans = await planRepo.getPlansByDate(today);
    }
    set({
      plans,
      recoveryState: {
        ...EMPTY_RECOVERY_STATE,
        last_evaluated_date: today,
      },
    });
    await refreshRoutineStreak();
  },

  reset: () =>
    set({
      todayDate: getLocalDateString(),
      plans: [],
      recoveryState: { ...EMPTY_RECOVERY_STATE },
      isLoading: false,
    }),
}));
