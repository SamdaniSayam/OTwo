/**
 * Daily Plan Store (Zustand)
 * Manages daily checklists, item completion/skips, notes, and adaptive recovery mode.
 */
import { create } from 'zustand';
import { planRepo } from '../db/repositories/planRepo';
import { templateRepo } from '../db/repositories/templateRepo';
import { habitRepo } from '../db/repositories/habitRepo';
import { DailyPlanRow, RecoveryStateRow } from '../db/sqlite';

interface PlanState {
  todayDate: string;
  plans: DailyPlanRow[];
  recoveryState: RecoveryStateRow;
  isLoading: boolean;
  loadTodayPlan: () => Promise<void>;
  markItemStatus: (id: string, isCompleted: number, notes?: string) => Promise<void>;
  activateRecoveryPlan: () => Promise<void>;
  dismissRecoveryPlan: () => Promise<void>;
}

export const usePlanStore = create<PlanState>((set, get) => ({
  todayDate: new Date().toISOString().split('T')[0],
  plans: [],
  recoveryState: {
    id: 1,
    consecutive_missed_days: 0,
    recovery_active: 0,
    recovery_days_remaining: 0,
  },
  isLoading: true,

  loadTodayPlan: async () => {
    try {
      set({ isLoading: true });
      const today = new Date().toISOString().split('T')[0];
      set({ todayDate: today });

      let currentPlans = await planRepo.getPlansByDate(today);
      let recovery = await planRepo.getRecoveryState();

      // Check yesterday's plans to evaluate consecutive missed days
      const yesterday = new Date();
      yesterday.setDate(yesterday.getDate() - 1);
      const yesterdayStr = yesterday.toISOString().split('T')[0];
      const yesterdayPlans = await planRepo.getPlansByDate(yesterdayStr);

      if (yesterdayPlans.length > 0) {
        const completedYesterday = yesterdayPlans.filter((p) => p.is_completed === 1).length;
        if (completedYesterday === 0) {
          const missed = recovery.consecutive_missed_days + 1;
          await planRepo.setRecoveryState({ consecutive_missed_days: missed });
          recovery.consecutive_missed_days = missed;

          // Adaptive rule: If 2+ consecutive days missed, trigger simplified recovery
          if (missed >= 2 && !recovery.recovery_active) {
            await planRepo.setRecoveryState({
              recovery_active: 1,
              recovery_start_date: today,
              recovery_days_remaining: 3,
            });
            recovery.recovery_active = 1;
            recovery.recovery_days_remaining = 3;
          }
        } else {
          // Reset missed count if completed yesterday
          await planRepo.setRecoveryState({ consecutive_missed_days: 0 });
          recovery.consecutive_missed_days = 0;
        }
      }

      // If no plans generated for today, generate from templates or recovery mode
      if (currentPlans.length === 0) {
        if (recovery.recovery_active && recovery.recovery_days_remaining > 0) {
          // Generate simplified 3-item Recovery Routine
          const recoveryItems: DailyPlanRow[] = [
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
              description: 'Calm and soothe your airways.',
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
          await planRepo.insertPlans(recoveryItems);
          currentPlans = recoveryItems;
        } else {
          // Generate normal plans from active templates
          const templates = await templateRepo.getAll();
          if (templates.length > 0) {
            const newPlans: DailyPlanRow[] = templates.map((t) => ({
              id: `plan-${today}-${t.id}`,
              date: today,
              category: t.category,
              title: t.title,
              description: t.description,
              is_completed: 0,
              is_recovery_item: 0,
            }));
            await planRepo.insertPlans(newPlans);
            currentPlans = newPlans;
          }
        }
      }

      set({ plans: currentPlans, recoveryState: recovery, isLoading: false });
    } catch {
      set({ isLoading: false });
    }
  },

  markItemStatus: async (id: string, isCompleted: number, notes?: string) => {
    await planRepo.updatePlanStatus(id, isCompleted, notes);
    const updated = get().plans.map((p) =>
      p.id === id ? { ...p, is_completed: isCompleted, notes: notes || p.notes } : p
    );
    set({ plans: updated });

    // If completed, increment habit streaks
    if (isCompleted === 1) {
      const today = get().todayDate;
      await habitRepo.incrementStreak('habit-consistency', today);
    }
  },

  activateRecoveryPlan: async () => {
    const today = get().todayDate;
    await planRepo.setRecoveryState({
      recovery_active: 1,
      recovery_start_date: today,
      recovery_days_remaining: 3,
    });
    await get().loadTodayPlan();
  },

  dismissRecoveryPlan: async () => {
    await planRepo.setRecoveryState({
      recovery_active: 0,
      recovery_days_remaining: 0,
      consecutive_missed_days: 0,
    });
    await get().loadTodayPlan();
  },
}));
