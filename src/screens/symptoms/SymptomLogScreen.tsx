import React, { useEffect, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  SafeAreaView,
  ScrollView,
  TouchableOpacity,
} from 'react-native';
import { Colors } from '../../constants/colors';
import { Layout } from '../../constants/layout';
import { Button } from '../../components/common/Button';
import { Card } from '../../components/common/Card';
import { Input } from '../../components/common/Input';
import { Badge } from '../../components/common/Badge';
import { DisclaimerBanner } from '../../components/common/DisclaimerBanner';
import { EmergencyNotice } from '../../components/common/EmergencyNotice';
import { useSymptomStore } from '../../store/useSymptomStore';
import { Disclaimers } from '../../constants/disclaimers';

const COMMON_TRIGGERS = [
  'Cold Air',
  'Dust / Dust Mites',
  'Pollen',
  'Exercise / Physical Exertion',
  'Smoke',
  'Fragrance / Perfume',
  'Pet Dander',
  'Weather / Humidity Change',
  'Stress / Anxiety',
];

export const SymptomLogScreen = () => {
  const { logs, topTriggers, loadSymptoms, logSymptom, emergencyAlert, dismissEmergencyAlert } =
    useSymptomStore();

  const [difficulty, setDifficulty] = useState<number>(1);
  const [cough, setCough] = useState<number>(0); // 0 = none, 1 = mild, 2 = persistent
  const [selectedTriggers, setSelectedTriggers] = useState<string[]>([]);
  const [notes, setNotes] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [successMsg, setSuccessMsg] = useState('');

  useEffect(() => {
    loadSymptoms();
  }, [loadSymptoms]);

  const toggleTrigger = (trigger: string) => {
    setSelectedTriggers((prev) =>
      prev.includes(trigger) ? prev.filter((t) => t !== trigger) : [...prev, trigger]
    );
  };

  const handleSaveLog = async () => {
    setIsSubmitting(true);
    setSuccessMsg('');
    const res = await logSymptom(difficulty, cough, selectedTriggers, notes);
    setIsSubmitting(false);

    if (res.isCritical) {
      // Escalation handled by EmergencyNotice modal
    } else {
      setSuccessMsg('✓ Log recorded for your doctor discussion.');
      setNotes('');
      setSelectedTriggers([]);
      setTimeout(() => setSuccessMsg(''), 4000);
    }
  };

  return (
    <SafeAreaView style={styles.safeArea}>
      <ScrollView
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        <Text style={styles.screenTitle} accessibilityRole="header">
          Symptom Check-in
        </Text>
        <Text style={styles.screenSubtitle}>
          Personal observations for your next doctor appointment
        </Text>

        <DisclaimerBanner
          customText={Disclaimers.symptomLog}
          style={{ marginVertical: Layout.spacing.sm }}
        />

        {successMsg ? (
          <Text
            style={styles.successBanner}
            accessibilityLiveRegion="polite"
            accessibilityRole="alert"
          >
            {successMsg}
          </Text>
        ) : null}

        {/* Check-in Form Card */}
        <Card style={styles.formCard}>
          <Text style={styles.sectionTitle} accessibilityRole="header">
            1. How is your breathing feeling today?
          </Text>
          <Text style={styles.helperText}>
            1 = Completely comfortable, 5 = Severe difficulty / struggling
          </Text>

          <View style={styles.ratingRow} accessibilityRole="radiogroup">
            {[1, 2, 3, 4, 5].map((num) => {
              const isSelected = difficulty === num;
              return (
                <TouchableOpacity
                  key={num}
                  activeOpacity={0.7}
                  onPress={() => setDifficulty(num)}
                  style={[
                    styles.ratingCircle,
                    isSelected && styles.ratingCircleSelected,
                    num === 5 && styles.ratingCircleDanger,
                    isSelected && num === 5 && styles.ratingCircleDangerSelected,
                  ]}
                  accessibilityRole="radio"
                  accessibilityState={{ selected: isSelected }}
                  aria-checked={isSelected}
                  accessibilityLabel={`Breathing difficulty ${num} of 5`}
                  accessibilityHint={
                    num === 1
                      ? 'Completely comfortable'
                      : num === 5
                        ? 'Severe difficulty or struggling to breathe'
                        : 'Select this rating'
                  }
                >
                  <Text
                    style={[
                      styles.ratingNumber,
                      isSelected && styles.ratingNumberSelected,
                    ]}
                  >
                    {num}
                  </Text>
                </TouchableOpacity>
              );
            })}
          </View>
          <View style={styles.ratingLabels}>
            <Text style={styles.ratingLabelText}>Easy / Normal</Text>
            <Text style={[styles.ratingLabelText, { color: Colors.error }]}>Severe (Alert)</Text>
          </View>

          {/* Cough Level */}
          <Text
            style={[styles.sectionTitle, { marginTop: Layout.spacing.lg }]}
            accessibilityRole="header"
          >
            2. Cough Presence
          </Text>
          <View style={styles.chipRow}>
            {[
              { label: 'None', val: 0 },
              { label: 'Mild / Occasional', val: 1 },
              { label: 'Persistent', val: 2 },
            ].map((c) => (
              <TouchableOpacity
                key={c.val}
                onPress={() => setCough(c.val)}
                style={[styles.chip, cough === c.val && styles.chipActive]}
                accessibilityRole="radio"
                accessibilityState={{ selected: cough === c.val }}
                aria-checked={cough === c.val}
                accessibilityLabel={`Cough: ${c.label}`}
              >
                <Text style={[styles.chipText, cough === c.val && styles.chipTextActive]}>
                  {c.label}
                </Text>
              </TouchableOpacity>
            ))}
          </View>

          {/* Environmental Triggers */}
          <Text
            style={[styles.sectionTitle, { marginTop: Layout.spacing.lg }]}
            accessibilityRole="header"
          >
            3. Triggers Noticed Today (Optional)
          </Text>
          <View style={styles.triggerWrap}>
            {COMMON_TRIGGERS.map((t) => {
              const isSelected = selectedTriggers.includes(t);
              return (
                <TouchableOpacity
                  key={t}
                  onPress={() => toggleTrigger(t)}
                  style={[styles.triggerChip, isSelected && styles.triggerChipActive]}
                  accessibilityRole="checkbox"
                  accessibilityState={{ checked: isSelected }}
                  aria-checked={isSelected}
                  accessibilityLabel={`Trigger: ${t}`}
                >
                  <Text
                    style={[
                      styles.triggerChipText,
                      isSelected && styles.triggerChipTextActive,
                    ]}
                  >
                    {isSelected ? '✓ ' : '+ '}
                    {t}
                  </Text>
                </TouchableOpacity>
              );
            })}
          </View>

          {/* Notes */}
          <Input
            label="Personal Notes (Optional)"
            placeholder="e.g. Mild shortness of breath while climbing stairs..."
            value={notes}
            onChangeText={setNotes}
            multiline
            numberOfLines={2}
            containerStyle={{ marginTop: Layout.spacing.md }}
          />

          <Button
            title="Save Today's Check-in"
            size="lg"
            loading={isSubmitting}
            onPress={handleSaveLog}
            style={styles.saveBtn}
          />
        </Card>

        {/* Top Recurring Triggers Card */}
        {topTriggers.length > 0 && (
          <Card style={styles.triggersCard}>
            <Text style={styles.cardHeader} accessibilityRole="header">
              Frequently Noticed Triggers
            </Text>
            <Text style={styles.cardSub}>Observation only – share with your physician.</Text>
            <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 6, marginTop: 8 }}>
              {topTriggers.slice(0, 6).map((item) => (
                <Badge
                  key={item.trigger}
                  label={`${item.trigger} (${item.count})`}
                  variant="sage"
                />
              ))}
            </View>
          </Card>
        )}

        {/* Recent Logs List */}
        <Text
          style={[
            styles.sectionTitle,
            { marginTop: Layout.spacing.xl, marginBottom: Layout.spacing.xs },
          ]}
          accessibilityRole="header"
        >
          Recent Logs ({logs.length})
        </Text>

        {logs.slice(0, 5).map((log) => (
          <Card
            key={log.id}
            style={styles.historyCard}
            accessible
            accessibilityLabel={`Check-in from ${log.date}. Breathing difficulty ${log.breathing_difficulty} of 5.${
              log.triggers ? ` Triggers: ${log.triggers}.` : ''
            }${
              log.notes
                ? ` Note: ${log.notes}${/[.!?]$/.test(log.notes.trim()) ? '' : '.'}`
                : ''
            }`}
          >
            <View style={styles.historyHeader}>
              <Text style={styles.historyDate}>{log.date}</Text>
              <Badge
                label={`Breathing: ${log.breathing_difficulty}/5`}
                variant={log.breathing_difficulty >= 4 ? 'warning' : 'mint'}
              />
            </View>
            {log.triggers ? (
              <Text style={styles.historyTriggers}>Triggers: {log.triggers}</Text>
            ) : null}
            {log.notes ? (
              <Text style={styles.historyNotes}>{`"${log.notes}"`}</Text>
            ) : null}
          </Card>
        ))}
      </ScrollView>

      {/* Immediate Emergency Escalation Notice */}
      <EmergencyNotice
        visible={emergencyAlert}
        onDismiss={dismissEmergencyAlert}
      />
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: Colors.background,
  },
  scrollContent: {
    paddingHorizontal: Layout.spacing.base,
    paddingVertical: Layout.spacing.md,
  },
  screenTitle: {
    fontSize: Layout.fontSize.title,
    fontWeight: Layout.fontWeight.bold,
    color: Colors.primaryDark,
  },
  screenSubtitle: {
    fontSize: Layout.fontSize.bodySm,
    color: Colors.textSecondary,
    marginBottom: Layout.spacing.xs,
  },
  successBanner: {
    backgroundColor: Colors.successLight,
    color: Colors.primaryDark,
    padding: Layout.spacing.sm,
    borderRadius: Layout.borderRadius.sm,
    fontSize: Layout.fontSize.bodySm,
    fontWeight: Layout.fontWeight.bold,
    marginVertical: Layout.spacing.xs,
  },
  formCard: {
    marginVertical: Layout.spacing.xs,
  },
  sectionTitle: {
    fontSize: Layout.fontSize.body,
    fontWeight: Layout.fontWeight.bold,
    color: Colors.textPrimary,
  },
  helperText: {
    fontSize: Layout.fontSize.caption,
    color: Colors.textSecondary,
    marginTop: 2,
    marginBottom: Layout.spacing.md,
  },
  ratingRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  ratingCircle: {
    minWidth: 52,
    minHeight: 52,
    borderRadius: 26,
    borderWidth: 2,
    borderColor: Colors.border,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: Layout.spacing.xs,
    paddingVertical: 4,
    backgroundColor: Colors.surface,
  },
  ratingCircleSelected: {
    borderColor: Colors.primary,
    backgroundColor: Colors.primary,
  },
  ratingCircleDanger: {
    borderColor: Colors.border,
  },
  ratingCircleDangerSelected: {
    borderColor: Colors.error,
    backgroundColor: Colors.error,
  },
  ratingNumber: {
    fontSize: Layout.fontSize.subheading,
    fontWeight: Layout.fontWeight.bold,
    color: Colors.textPrimary,
  },
  ratingNumberSelected: {
    color: Colors.textInverse,
  },
  ratingLabels: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: Layout.spacing.xs,
  },
  ratingLabelText: {
    fontSize: Layout.fontSize.caption,
    color: Colors.textMuted,
  },
  chipRow: {
    flexDirection: 'row',
    gap: Layout.spacing.sm,
    marginTop: Layout.spacing.xs,
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
    fontSize: Layout.fontSize.caption,
    fontWeight: Layout.fontWeight.medium,
    color: Colors.textPrimary,
    textAlign: 'center',
  },
  chipTextActive: {
    color: Colors.primaryDark,
    fontWeight: Layout.fontWeight.bold,
  },
  triggerWrap: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    marginTop: Layout.spacing.sm,
  },
  triggerChip: {
    minHeight: 44,
    justifyContent: 'center',
    paddingHorizontal: Layout.spacing.md,
    paddingVertical: Layout.spacing.sm,
    borderRadius: Layout.borderRadius.full,
    borderWidth: 1,
    borderColor: Colors.border,
    backgroundColor: Colors.surface,
  },
  triggerChipActive: {
    borderColor: Colors.primary,
    backgroundColor: Colors.surfaceSubtle,
  },
  triggerChipText: {
    fontSize: Layout.fontSize.caption,
    color: Colors.textPrimary,
  },
  triggerChipTextActive: {
    color: Colors.primaryDark,
    fontWeight: Layout.fontWeight.bold,
  },
  saveBtn: {
    marginTop: Layout.spacing.lg,
  },
  triggersCard: {
    backgroundColor: Colors.surfaceSubtle,
    borderWidth: 1,
    borderColor: Colors.borderLight,
    marginTop: Layout.spacing.md,
  },
  cardHeader: {
    fontSize: Layout.fontSize.bodySm,
    fontWeight: Layout.fontWeight.bold,
    color: Colors.primaryDark,
  },
  cardSub: {
    fontSize: Layout.fontSize.caption,
    color: Colors.textSecondary,
    marginTop: 2,
  },
  historyCard: {
    marginVertical: Layout.spacing.xs,
  },
  historyHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    flexWrap: 'wrap',
    gap: 4,
    marginBottom: 4,
  },
  historyDate: {
    fontSize: Layout.fontSize.bodySm,
    fontWeight: Layout.fontWeight.bold,
    color: Colors.textPrimary,
  },
  historyTriggers: {
    fontSize: Layout.fontSize.caption,
    color: Colors.textSecondary,
    marginTop: 2,
  },
  historyNotes: {
    fontSize: Layout.fontSize.caption,
    color: Colors.primaryDark,
    fontStyle: 'italic',
    marginTop: 4,
  },
});
