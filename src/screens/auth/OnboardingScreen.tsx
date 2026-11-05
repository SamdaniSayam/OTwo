import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  SafeAreaView,
  ScrollView,
  TouchableOpacity,
  KeyboardAvoidingView,
  Platform,
  BackHandler,
  AccessibilityInfo,
} from 'react-native';
import { Colors } from '../../constants/colors';
import { Layout } from '../../constants/layout';
import { Button } from '../../components/common/Button';
import { Input } from '../../components/common/Input';
import { DisclaimerBanner } from '../../components/common/DisclaimerBanner';
import { useAuthStore, OnboardingData, MedicationSetupItem } from '../../store/useAuthStore';
import { APP_NAME } from '../../constants/app';

const GOAL_OPTIONS = [
  'Never miss my prescribed daily controller inhaler',
  'Recognize and log daily environmental triggers',
  'Build a calm evening breathing routine',
  'Maintain steady light daily movement',
  'Stay well hydrated throughout the day',
  'Improve sleep consistency and airway rest',
];

export const OnboardingScreen = () => {
  const [step, setStep] = useState<1 | 2 | 3 | 4>(1);

  // Step 1: Age
  const [age, setAge] = useState('28');

  // Step 2: Doctor recommendations & medication timing
  const [doctorNotes, setDoctorNotes] = useState('');
  const [medReminders, setMedReminders] = useState<MedicationSetupItem[]>([
    { id: '1', label: 'Morning Inhaler Reminder', time: '08:00', frequency: 'daily' },
    { id: '2', label: 'Evening Inhaler Reminder', time: '20:00', frequency: 'daily' },
  ]);
  const [newMedLabel, setNewMedLabel] = useState('');
  const [newMedTime, setNewMedTime] = useState('14:00');

  // Step 3: Baseline habits
  const [sleepHours, setSleepHours] = useState('7');
  const [movementLevel, setMovementLevel] = useState<'light' | 'moderate' | 'active'>('light');
  const [hydrationGoal, setHydrationGoal] = useState('8');
  const [stressLevel, setStressLevel] = useState<'low' | 'moderate' | 'high'>('moderate');

  // Step 4: Personal goals
  const [selectedGoals, setSelectedGoals] = useState<string[]>([
    'Never miss my prescribed daily controller inhaler',
    'Stay well hydrated throughout the day',
  ]);

  const { completeOnboarding, isLoading, error } = useAuthStore();
  const [saveError, setSaveError] = useState('');

  useEffect(() => {
    const onBackPress = () => {
      if (step > 1) {
        setStep((prev) => (prev - 1) as 1 | 2 | 3);
        return true;
      }
      return false;
    };

    const subscription = BackHandler.addEventListener('hardwareBackPress', onBackPress);
    return () => subscription.remove();
  }, [step]);

  useEffect(() => {
    AccessibilityInfo.announceForAccessibility(`Step ${step} of 4`);
  }, [step]);

  const handleAddMedication = () => {
    if (!newMedLabel.trim()) return;
    setMedReminders((prev) => [
      ...prev,
      {
        id: Date.now().toString(),
        label: newMedLabel.trim(),
        time: newMedTime.trim() || '12:00',
        frequency: 'daily',
      },
    ]);
    setNewMedLabel('');
    setNewMedTime('14:00');
  };

  const handleRemoveMedication = (id: string) => {
    setMedReminders((prev) => prev.filter((m) => m.id !== id));
  };

  const toggleGoal = (goal: string) => {
    setSelectedGoals((prev) =>
      prev.includes(goal) ? prev.filter((g) => g !== goal) : [...prev, goal]
    );
  };

  const handleFinish = async () => {
    setSaveError('');
    const parsedAge = parseInt(age, 10) || 25;
    const data: OnboardingData = {
      age: parsedAge,
      doctorRecommendationsText: doctorNotes.trim() || undefined,
      medicationReminders: medReminders,
      baselineHabits: {
        sleepHours: parseInt(sleepHours, 10) || 7,
        movementLevel,
        hydrationGoalGlasses: parseInt(hydrationGoal, 10) || 8,
        stressLevel,
      },
      personalGoals: selectedGoals,
    };
    const result = await completeOnboarding(data);
    if (!result.success) {
      setSaveError(result.error || 'Could not save your plan. Please try again.');
    }
  };

  return (
    <SafeAreaView style={styles.safeArea}>
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        style={styles.keyboardAvoid}
      >
        <ScrollView
          contentContainerStyle={styles.scrollContent}
          showsVerticalScrollIndicator={false}
        >
          {/* Header & Step Indicator */}
          <View style={styles.header}>
            <Text style={styles.stepIndicator} accessibilityLiveRegion="polite">
              Step {step} of 4
            </Text>
            <View
              style={styles.progressBar}
              accessibilityRole="progressbar"
              accessibilityLabel="Onboarding progress"
              accessibilityValue={{ min: 1, max: 4, now: step, text: `Step ${step} of 4` }}
            >
              <View style={[styles.progressFill, { width: `${(step / 4) * 100}%` }]} />
            </View>
          </View>

          <DisclaimerBanner style={styles.disclaimer} />

          {/* Step 1: Age */}
          {step === 1 && (
            <View style={styles.card}>
              <Text style={styles.title} accessibilityRole="header">Your Profile Baseline</Text>
              <Text style={styles.description}>
                To tailor your daily routine checklist realistically, let us know your age.
              </Text>
              <Input
                label="Your Age"
                placeholder="e.g. 32"
                keyboardType="numeric"
                value={age}
                onChangeText={setAge}
                helperText="Stored on this device and used solely to calibrate routine pace."
              />
              <Button
                title="Next: Doctor Recommendations"
                size="lg"
                onPress={() => setStep(2)}
                style={styles.nextBtn}
              />
            </View>
          )}

          {/* Step 2: Doctor recommendations & Medication timing */}
          {step === 2 && (
            <View style={styles.card}>
              <Text style={styles.title} accessibilityRole="header">Doctor Recommendations</Text>
              <Text style={styles.description}>
                Enter the instructions your physician gave you. Notes are stored only on this device and are never uploaded. {APP_NAME} will never alter or question them.
              </Text>
              <Input
                label="Doctor Advice & Action Plan Notes (Optional)"
                placeholder="e.g., Take controller twice daily, carry rescue inhaler during exercise..."
                multiline
                numberOfLines={3}
                value={doctorNotes}
                onChangeText={setDoctorNotes}
              />
              <Text style={styles.subtext}>
                These notes cannot be restored after a reinstall. Keep a copy in your own records.
              </Text>

              <Text style={styles.sectionHeader} accessibilityRole="header">
                Medication Timing Reminders
              </Text>
              <Text style={styles.subtext}>
                Set up time-of-day reminders based on your prescription (reminder-only).
              </Text>

              {medReminders.map((med) => (
                <View key={med.id} style={styles.medItem}>
                  <View style={{ flex: 1 }}>
                    <Text style={styles.medLabel}>{med.label}</Text>
                    <Text style={styles.medDetails}>
                      Scheduled for {med.time} ({med.frequency})
                    </Text>
                  </View>
                  <TouchableOpacity
                    onPress={() => handleRemoveMedication(med.id)}
                    style={styles.removeBtn}
                    accessibilityRole="button"
                    accessibilityLabel={`Remove ${med.label} reminder`}
                  >
                    <Text style={styles.removeBtnText}>Remove</Text>
                  </TouchableOpacity>
                </View>
              ))}

              <View style={styles.addMedRow}>
                <Input
                  label="Reminder Label"
                  placeholder="e.g., Morning Inhaler"
                  value={newMedLabel}
                  onChangeText={setNewMedLabel}
                  containerStyle={{ flex: 2 }}
                />
                <Input
                  label="Time"
                  placeholder="08:00"
                  value={newMedTime}
                  onChangeText={setNewMedTime}
                  containerStyle={{ flex: 1, marginLeft: Layout.spacing.sm }}
                />
              </View>
              <Button
                title="+ Add Another Reminder"
                variant="outline"
                size="md"
                onPress={handleAddMedication}
                style={styles.addMedBtn}
              />

              <View style={styles.navRow}>
                <Button
                  title="Back"
                  variant="ghost"
                  onPress={() => setStep(1)}
                  style={{ flex: 1 }}
                />
                <Button
                  title="Next: Daily Habits"
                  size="lg"
                  onPress={() => setStep(3)}
                  style={{ flex: 2, marginLeft: Layout.spacing.sm }}
                />
              </View>
            </View>
          )}

          {/* Step 3: Current Daily Habits */}
          {step === 3 && (
            <View style={styles.card}>
              <Text style={styles.title} accessibilityRole="header">Current Daily Habits</Text>
              <Text style={styles.description}>
                Help us calibrate your hydration, rest, and movement checklists.
              </Text>

              <Input
                label="Typical Sleep Hours per Night"
                placeholder="e.g. 7"
                keyboardType="numeric"
                value={sleepHours}
                onChangeText={setSleepHours}
              />

              <Text style={styles.inputLabel}>Current Movement Level</Text>
              <View style={styles.chipRow}>
                {(['light', 'moderate', 'active'] as const).map((lvl) => (
                  <TouchableOpacity
                    key={lvl}
                    onPress={() => setMovementLevel(lvl)}
                    style={[
                      styles.chip,
                      movementLevel === lvl && styles.chipActive,
                    ]}
                    accessibilityRole="radio"
                    accessibilityState={{ selected: movementLevel === lvl }}
                    aria-checked={movementLevel === lvl}
                    accessibilityLabel={`Movement level: ${lvl}`}
                  >
                    <Text
                      style={[
                        styles.chipText,
                        movementLevel === lvl && styles.chipTextActive,
                      ]}
                    >
                      {lvl.charAt(0).toUpperCase() + lvl.slice(1)}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>

              <Input
                label="Daily Water Goal (Glasses)"
                placeholder="e.g. 8"
                keyboardType="numeric"
                value={hydrationGoal}
                onChangeText={setHydrationGoal}
                containerStyle={{ marginTop: Layout.spacing.md }}
              />

              <Text style={styles.inputLabel}>General Stress Level</Text>
              <View style={styles.chipRow}>
                {(['low', 'moderate', 'high'] as const).map((lvl) => (
                  <TouchableOpacity
                    key={lvl}
                    onPress={() => setStressLevel(lvl)}
                    style={[
                      styles.chip,
                      stressLevel === lvl && styles.chipActive,
                    ]}
                    accessibilityRole="radio"
                    accessibilityState={{ selected: stressLevel === lvl }}
                    aria-checked={stressLevel === lvl}
                    accessibilityLabel={`Stress level: ${lvl}`}
                  >
                    <Text
                      style={[
                        styles.chipText,
                        stressLevel === lvl && styles.chipTextActive,
                      ]}
                    >
                      {lvl.charAt(0).toUpperCase() + lvl.slice(1)}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>

              <View style={styles.navRow}>
                <Button
                  title="Back"
                  variant="ghost"
                  onPress={() => setStep(2)}
                  style={{ flex: 1 }}
                />
                <Button
                  title="Next: Goals"
                  size="lg"
                  onPress={() => setStep(4)}
                  style={{ flex: 2, marginLeft: Layout.spacing.sm }}
                />
              </View>
            </View>
          )}

          {/* Step 4: Personal Goals */}
          {step === 4 && (
            <View style={styles.card}>
              <Text style={styles.title} accessibilityRole="header">Your Personal Goals</Text>
              <Text style={styles.description}>
                Select the routines you want {APP_NAME} to support you in maintaining.
              </Text>

              {GOAL_OPTIONS.map((goal) => {
                const isSelected = selectedGoals.includes(goal);
                return (
                  <TouchableOpacity
                    key={goal}
                    activeOpacity={0.8}
                    onPress={() => toggleGoal(goal)}
                    style={[styles.goalItem, isSelected && styles.goalItemActive]}
                    accessibilityRole="checkbox"
                    accessibilityState={{ checked: isSelected }}
                    aria-checked={isSelected}
                    accessibilityLabel={goal}
                  >
                    <Text
                      style={styles.goalCheckbox}
                      accessibilityElementsHidden
                      importantForAccessibility="no"
                    >
                      {isSelected ? '☑' : '☐'}
                    </Text>
                    <Text style={[styles.goalText, isSelected && styles.goalTextActive]}>
                      {goal}
                    </Text>
                  </TouchableOpacity>
                );
              })}

              {saveError || error ? (
                <Text
                  style={styles.errorText}
                  accessibilityLiveRegion="assertive"
                  accessibilityRole="alert"
                >
                  {saveError || error}
                </Text>
              ) : null}

              <View style={styles.navRow}>
                <Button
                  title="Back"
                  variant="ghost"
                  onPress={() => setStep(3)}
                  style={{ flex: 1 }}
                />
                <Button
                  title="Build My Daily Plan"
                  size="lg"
                  loading={isLoading}
                  onPress={handleFinish}
                  style={{ flex: 2, marginLeft: Layout.spacing.sm }}
                />
              </View>
            </View>
          )}
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: Colors.background,
  },
  keyboardAvoid: {
    flex: 1,
  },
  scrollContent: {
    flexGrow: 1,
    paddingHorizontal: Layout.spacing.lg,
    paddingVertical: Layout.spacing.lg,
  },
  header: {
    marginBottom: Layout.spacing.md,
  },
  stepIndicator: {
    fontSize: Layout.fontSize.bodySm,
    fontWeight: Layout.fontWeight.bold,
    color: Colors.primary,
    marginBottom: Layout.spacing.xs,
    textTransform: 'uppercase',
  },
  progressBar: {
    height: 6,
    backgroundColor: Colors.border,
    borderRadius: 3,
    overflow: 'hidden',
  },
  progressFill: {
    height: '100%',
    backgroundColor: Colors.primary,
  },
  disclaimer: {
    marginVertical: Layout.spacing.md,
  },
  card: {
    backgroundColor: Colors.surface,
    borderRadius: Layout.borderRadius.xl,
    padding: Layout.spacing.xl,
    borderWidth: 1,
    borderColor: Colors.border,
    ...Layout.shadow.card,
  },
  title: {
    fontSize: Layout.fontSize.heading,
    fontWeight: Layout.fontWeight.bold,
    color: Colors.textPrimary,
    marginBottom: Layout.spacing.xs,
  },
  description: {
    fontSize: Layout.fontSize.bodySm,
    color: Colors.textSecondary,
    lineHeight: Layout.lineHeight.bodySm,
    marginBottom: Layout.spacing.lg,
  },
  sectionHeader: {
    fontSize: Layout.fontSize.subheading,
    fontWeight: Layout.fontWeight.bold,
    color: Colors.textPrimary,
    marginTop: Layout.spacing.lg,
    marginBottom: Layout.spacing.xs,
  },
  subtext: {
    fontSize: Layout.fontSize.caption,
    color: Colors.textMuted,
    marginBottom: Layout.spacing.md,
  },
  medItem: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.surfaceSubtle,
    borderWidth: 1,
    borderColor: Colors.borderLight,
    borderRadius: Layout.borderRadius.md,
    padding: Layout.spacing.md,
    marginBottom: Layout.spacing.sm,
  },
  medLabel: {
    fontSize: Layout.fontSize.body,
    fontWeight: Layout.fontWeight.semiBold,
    color: Colors.textPrimary,
  },
  medDetails: {
    fontSize: Layout.fontSize.caption,
    color: Colors.textSecondary,
    marginTop: 2,
  },
  removeBtn: {
    minHeight: 44,
    justifyContent: 'center',
    paddingHorizontal: Layout.spacing.sm,
    paddingVertical: Layout.spacing.xs,
  },
  removeBtnText: {
    fontSize: Layout.fontSize.caption,
    color: Colors.error,
    fontWeight: Layout.fontWeight.medium,
  },
  addMedRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: Layout.spacing.sm,
  },
  addMedBtn: {
    marginVertical: Layout.spacing.md,
  },
  inputLabel: {
    fontSize: Layout.fontSize.bodySm,
    fontWeight: Layout.fontWeight.medium,
    color: Colors.textPrimary,
    marginTop: Layout.spacing.md,
    marginBottom: Layout.spacing.xs,
  },
  chipRow: {
    flexDirection: 'row',
    gap: Layout.spacing.sm,
  },
  chip: {
    flex: 1,
    minHeight: Layout.touchTarget.minHeight,
    borderRadius: Layout.borderRadius.md,
    borderWidth: 1.5,
    borderColor: Colors.border,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: Layout.spacing.xs,
    paddingVertical: Layout.spacing.xs,
    backgroundColor: Colors.surface,
  },
  chipActive: {
    borderColor: Colors.primary,
    backgroundColor: Colors.secondaryLight,
  },
  chipText: {
    fontSize: Layout.fontSize.bodySm,
    fontWeight: Layout.fontWeight.medium,
    color: Colors.textPrimary,
  },
  chipTextActive: {
    color: Colors.primaryDark,
    fontWeight: Layout.fontWeight.bold,
  },
  goalItem: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: Layout.spacing.md,
    borderRadius: Layout.borderRadius.md,
    borderWidth: 1.5,
    borderColor: Colors.border,
    marginBottom: Layout.spacing.sm,
    minHeight: Layout.touchTarget.minHeight,
  },
  goalItemActive: {
    borderColor: Colors.primary,
    backgroundColor: Colors.surfaceSubtle,
  },
  goalCheckbox: {
    fontSize: 20,
    color: Colors.primary,
    marginRight: Layout.spacing.sm,
  },
  goalText: {
    flex: 1,
    fontSize: Layout.fontSize.bodySm,
    color: Colors.textPrimary,
  },
  goalTextActive: {
    fontWeight: Layout.fontWeight.semiBold,
    color: Colors.primaryDark,
  },
  nextBtn: {
    marginTop: Layout.spacing.xl,
  },
  errorText: {
    fontSize: Layout.fontSize.bodySm,
    color: Colors.error,
    backgroundColor: Colors.errorLight,
    borderRadius: Layout.borderRadius.sm,
    padding: Layout.spacing.sm,
    marginTop: Layout.spacing.md,
  },
  navRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: Layout.spacing.xl,
  },
});
