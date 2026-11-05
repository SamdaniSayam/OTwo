/**
 * Shared onboarding/restore plan builder.
 *
 * Keeps the initial local plan deterministic enough to recreate from saved
 * non-sensitive onboarding data after a reinstall or on a second device.
 */
import type { DailyPlanRow, HabitRow, PlanTemplateRow } from '../db/sqlite';

export interface OnboardingPlanInput {
  age: number;
  doctorRecommendationsText?: string;
  medicationReminders: { id?: string; label: string; time: string; frequency: string }[];
  baselineHabits: {
    sleepHours: number;
    movementLevel: 'light' | 'moderate' | 'active';
    hydrationGoalGlasses: number;
    stressLevel: 'low' | 'moderate' | 'high';
  };
  personalGoals: string[];
}

export function buildOnboardingTemplates(input: OnboardingPlanInput): PlanTemplateRow[] {
  const templates: PlanTemplateRow[] = [];
  const stamp = Date.now();
  const goalText = input.personalGoals.join(' ').toLowerCase();
  const wantsMovement = /movement|walk|exercise|active/.test(goalText);
  const wantsHydration = /hydrat|water/.test(goalText);
  const wantsTriggerLog = /trigger|environment|pollen|air quality/.test(goalText);
  const wantsWindDown = /evening|breathing|sleep|rest|wind/.test(goalText);

  input.medicationReminders.forEach((med, idx) => {
    templates.push({
      id: `template-med-${idx}-${stamp}`,
      category: 'medication_reminder',
      title: med.label,
      description: `Reminder scheduled for ${med.time} (${med.frequency})`,
      default_time: med.time,
      is_active: 1,
      source: 'onboarding',
    });
  });

  // Movement intensity is framed as a comfort range, never a prescription.
  // Age changes the default pace, while the user's clinician remains the
  // authority on what activity is appropriate.
  const movementTitle =
    input.age >= 65
      ? 'Gentle 10-Minute Walk'
      : input.age > 0 && input.age < 18
        ? '15-Minute Active Play or Walk'
        : input.baselineHabits.movementLevel === 'light'
          ? 'Gentle 15-Minute Walk'
          : input.baselineHabits.movementLevel === 'active' && wantsMovement
            ? '30-Minute Mindful Movement'
            : '20-30 Minute Mindful Movement';

  templates.push({
    id: `template-movement-${stamp}`,
    category: 'movement',
    title: movementTitle,
    description:
      'Choose a comfortable pace that follows your doctor-approved activity plan. Stop if breathing becomes difficult.',
    default_time: input.age >= 65 ? '10:30' : '10:00',
    is_active: 1,
    source: 'onboarding',
  });

  templates.push({
    id: `template-hydration-${stamp}`,
    category: 'hydration',
    title: `Hydration (${input.baselineHabits.hydrationGoalGlasses || 8} Glasses)`,
    description: wantsHydration
      ? 'Your selected hydration goal is split across the day. Keep water nearby.'
      : 'Keep water nearby to support general daily comfort.',
    default_time: '12:00',
    is_active: 1,
    source: 'onboarding',
  });

  templates.push({
    id: `template-nutrition-${stamp}`,
    category: 'nutrition',
    title: 'Balanced Meal Check-in',
    description: 'A simple reminder to eat regular meals that fit your usual routine.',
    default_time: '13:00',
    is_active: 1,
    source: 'onboarding',
  });

  templates.push({
    id: `template-winddown-${stamp}`,
    category: 'wind_down',
    title: wantsWindDown ? 'Evening Wind-Down & Sleep Routine' : 'Calm Breathing & Wind-Down',
    description: wantsWindDown
      ? 'A quiet routine before bed, aligned with your selected sleep and breathing goal.'
      : 'Relaxation routine 30 minutes before sleep to ease into rest.',
    default_time: '21:30',
    is_active: 1,
    source: 'onboarding',
  });

  if (wantsTriggerLog) {
    templates.push({
      id: `template-triggers-${stamp}`,
      category: 'trigger_awareness',
      title: 'Note Today’s Environmental Triggers',
      description:
        'A quick note about smoke, pollen, dust, fragrance, or weather changes you noticed.',
      default_time: '18:00',
      is_active: 1,
      source: 'onboarding',
    });
  }

  return templates;
}

export function buildStarterHabits(_today: string): HabitRow[] {
  // Streaks start at zero and are derived from completed daily plans. Seeding a
  // fake streak would tell users they had done something they had not.
  return [
    {
      id: 'habit-consistency',
      name: 'Daily Routine Consistency',
      category: 'routine',
      target_frequency: 'daily',
      current_streak: 0,
      best_streak: 0,
    },
    {
      id: 'habit-hydration',
      name: 'Daily Hydration Target',
      category: 'hydration',
      target_frequency: 'daily',
      current_streak: 0,
      best_streak: 0,
    },
  ];
}

export function buildInitialDailyPlans(
  templates: PlanTemplateRow[],
  today: string
): DailyPlanRow[] {
  return templates.map((template) => ({
    id: `plan-${today}-${template.id}`,
    date: today,
    category: template.category,
    title: template.title,
    description: template.description,
    is_completed: 0,
    is_recovery_item: 0,
  }));
}
