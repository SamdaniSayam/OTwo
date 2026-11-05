import { strict as assert } from 'node:assert';
import { test } from 'node:test';
import {
  buildInitialDailyPlans,
  buildOnboardingTemplates,
  buildStarterHabits,
} from '../src/services/onboardingPlan';
import type { OnboardingPlanInput } from '../src/services/onboardingPlan';

const baseInput: OnboardingPlanInput = {
  age: 30,
  medicationReminders: [
    { label: 'Inhaler', time: '08:00', frequency: 'daily' },
  ],
  baselineHabits: {
    sleepHours: 7,
    movementLevel: 'light',
    hydrationGoalGlasses: 6,
    stressLevel: 'moderate',
  },
  personalGoals: [],
};

function findTemplate(
  templates: ReturnType<typeof buildOnboardingTemplates>,
  category: string
) {
  const template = templates.find((entry) => entry.category === category);
  assert.ok(template, `expected a ${category} template`);
  return template;
}

test('older adults get a gentler default movement block', () => {
  const templates = buildOnboardingTemplates({ ...baseInput, age: 70 });
  const movement = findTemplate(templates, 'movement');

  assert.equal(movement.title, 'Gentle 10-Minute Walk');
  assert.equal(movement.default_time, '10:30');
  assert.equal(movement.source, 'onboarding');
});

test('children get an age-appropriate activity label', () => {
  const templates = buildOnboardingTemplates({ ...baseInput, age: 12 });
  const movement = findTemplate(templates, 'movement');

  assert.equal(movement.title, '15-Minute Active Play or Walk');
});

test('movement goal and active baseline select a longer mindful movement block', () => {
  const templates = buildOnboardingTemplates({
    ...baseInput,
    baselineHabits: { ...baseInput.baselineHabits, movementLevel: 'active' },
    personalGoals: ['Morning movement'],
  });

  assert.equal(findTemplate(templates, 'movement').title, '30-Minute Mindful Movement');
});

test('hydration goal is reflected in the generated template', () => {
  const templates = buildOnboardingTemplates({
    ...baseInput,
    baselineHabits: { ...baseInput.baselineHabits, hydrationGoalGlasses: 9 },
    personalGoals: ['Better hydration'],
  });
  const hydration = findTemplate(templates, 'hydration');

  assert.match(hydration.title, /9 Glasses/);
  assert.match(hydration.description, /selected hydration goal/);
});

test('trigger-awareness template appears only when the user selected that goal', () => {
  const withoutTrigger = buildOnboardingTemplates(baseInput);
  assert.equal(
    withoutTrigger.some((template) => template.category === 'trigger_awareness'),
    false
  );

  const withTrigger = buildOnboardingTemplates({
    ...baseInput,
    personalGoals: ['Understand my environmental triggers'],
  });
  assert.equal(
    withTrigger.some((template) => template.category === 'trigger_awareness'),
    true
  );
});

test('wind-down copy follows an evening or sleep goal', () => {
  const templates = buildOnboardingTemplates({
    ...baseInput,
    personalGoals: ['Better evening wind-down'],
  });

  assert.match(findTemplate(templates, 'wind_down').title, /Sleep Routine/);
});

test('starter habits begin at zero instead of claiming an earned streak', () => {
  const habits = buildStarterHabits('2026-11-04');

  assert.equal(habits.length, 2);
  for (const habit of habits) {
    assert.equal(habit.current_streak, 0);
    assert.equal(habit.best_streak, 0);
  }
});

test('initial daily plans contain one pending item per template', () => {
  const templates = buildOnboardingTemplates(baseInput);
  const plans = buildInitialDailyPlans(templates, '2026-11-04');

  assert.equal(plans.length, templates.length);
  for (const [index, plan] of plans.entries()) {
    assert.equal(plan.date, '2026-11-04');
    assert.equal(plan.category, templates[index].category);
    assert.equal(plan.is_completed, 0);
    assert.equal(plan.is_recovery_item, 0);
  }
});
