import React, { useEffect, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  SafeAreaView,
  ScrollView,
  Switch,
  RefreshControl,
} from 'react-native';
import { Colors } from '../../constants/colors';
import { Layout } from '../../constants/layout';
import { Button } from '../../components/common/Button';
import { Card } from '../../components/common/Card';
import { Badge } from '../../components/common/Badge';
import { DisclaimerBanner } from '../../components/common/DisclaimerBanner';
import { useHabitStore } from '../../store/useHabitStore';
import { AddReminderModal } from './AddReminderModal';
import { Disclaimers } from '../../constants/disclaimers';
import { parseLocalDate } from '../../utils/date';
import { openNotificationSettings } from '../../services/notifications';

export const HabitsScreen = () => {
  const {
    habits,
    medicationReminders,
    weeklyConsistency,
    insights,
    notificationPermission,
    scheduledReminderCount,
    isLoading,
    loadHabits,
    addReminder,
    toggleReminder,
    enableNotifications,
    disableNotifications,
  } = useHabitStore();

  const [addModalVisible, setAddModalVisible] = useState(false);

  useEffect(() => {
    loadHabits();
  }, [loadHabits]);

  return (
    <SafeAreaView style={styles.safeArea}>
      <ScrollView
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl refreshing={isLoading} onRefresh={loadHabits} colors={[Colors.primary]} />
        }
      >
        <Text style={styles.screenTitle} accessibilityRole="header">
          Habits & Routine Consistency
        </Text>
        <Text style={styles.screenSubtitle}>
          Building steady daily rhythms without pressure
        </Text>

        <DisclaimerBanner style={{ marginVertical: Layout.spacing.sm }} />

        {/* Weekly Consistency Card */}
        <Card style={styles.card}>
          <Text style={styles.cardHeader} accessibilityRole="header">
            7-Day Routine Consistency
          </Text>
          <View style={styles.weeklyRow}>
            {weeklyConsistency.map((day) => {
              const dayName = parseLocalDate(day.date).toLocaleDateString('en-US', {
                weekday: 'narrow',
              });
              return (
                <View
                  key={day.date}
                  style={styles.dayCol}
                  accessible
                  accessibilityRole="progressbar"
                  accessibilityValue={{
                    min: 0,
                    max: 100,
                    now: day.rate,
                    text: `${day.rate}% of planned items completed`,
                  }}
                  accessibilityLabel={parseLocalDate(day.date).toLocaleDateString('en-US', {
                    weekday: 'long',
                  })}
                >
                  <View style={styles.barTrack}>
                    <View style={[styles.barFill, { height: `${Math.max(day.rate, 8)}%` }]} />
                  </View>
                  <Text style={styles.dayLabel}>{dayName}</Text>
                  <Text style={styles.rateLabel}>{day.rate}%</Text>
                </View>
              );
            })}
          </View>
        </Card>

        {/* Behavioral Insights */}
        {insights.length > 0 && (
          <Card style={styles.insightsCard}>
            <Text style={styles.insightsTitle} accessibilityRole="header">
              Gentle Insights
            </Text>
            {insights.map((insight, idx) => (
              <Text key={idx} style={styles.insightText}>
                {insight}
              </Text>
            ))}
          </Card>
        )}

        {/* Habit Streaks */}
        <View style={styles.sectionHeaderRow}>
          <Text style={styles.sectionTitle} accessibilityRole="header">
            Active Habit Streaks
          </Text>
        </View>

        {habits.map((habit) => (
          <Card key={habit.id} style={styles.habitCard}>
            <View style={{ flex: 1 }}>
              <Text style={styles.habitName}>{habit.name}</Text>
              <Text style={styles.habitFreq}>{habit.target_frequency.toUpperCase()}</Text>
            </View>
            <View
              style={styles.streakContainer}
              accessible
              accessibilityLabel={`Current streak ${habit.current_streak} days. Best streak ${habit.best_streak} days.`}
            >
              <Text style={styles.fireIcon} accessibilityElementsHidden importantForAccessibility="no">
                🔥
              </Text>
              <View>
                <Text style={styles.streakCount}>{habit.current_streak} days</Text>
                <Text style={styles.bestStreak}>Best: {habit.best_streak}d</Text>
              </View>
            </View>
          </Card>
        ))}

        {/* Medication Reminders Section */}
        <View style={styles.sectionHeaderRow}>
          <View style={{ flex: 1 }}>
            <Text style={styles.sectionTitle} accessibilityRole="header">
              Time-of-Day Reminders
            </Text>
            <Text style={styles.reminderSubtitle}>{"Reminder-only alerts based on your doctor's plan"}</Text>
          </View>
          <Button
            title="+ Add"
            variant="outline"
            size="md"
            onPress={() => setAddModalVisible(true)}
            style={styles.addBtn}
          />
        </View>

        <Text style={styles.reminderNotice}>{Disclaimers.medicationReminder}</Text>

        <Card style={styles.reminderCard}>
          <View style={{ flex: 1, paddingRight: Layout.spacing.md }}>
            <Text style={styles.cardHeader}>System Reminder Notifications</Text>
            <Text style={styles.reminderStatus} accessibilityLiveRegion="polite">
              {notificationPermission === 'granted'
                ? scheduledReminderCount > 0
                  ? `${scheduledReminderCount} active reminder${scheduledReminderCount === 1 ? '' : 's'} scheduled on this device.`
                  : 'Notifications are allowed, but there are no active reminder times to schedule.'
                : notificationPermission === 'denied'
                  ? 'Notifications are blocked for OTwo in device settings. Reminder times are still shown here.'
                  : notificationPermission === 'unsupported'
                    ? 'System notifications are not available on this platform. Reminder times remain visible in the app.'
                    : 'Allow local notifications to receive your reminder times on this device.'}
            </Text>
            {notificationPermission === 'undetermined' ? (
              <Button
                title="Enable Reminder Notifications"
                size="md"
                onPress={() => enableNotifications()}
                style={{ marginTop: Layout.spacing.sm }}
              />
            ) : null}
            {notificationPermission === 'denied' ? (
              <Button
                title="Open Device Settings"
                variant="outline"
                size="md"
                onPress={() => openNotificationSettings()}
                style={{ marginTop: Layout.spacing.sm }}
              />
            ) : null}
            {notificationPermission === 'granted' && scheduledReminderCount > 0 ? (
              <Button
                title="Turn Off System Reminders"
                variant="ghost"
                size="md"
                onPress={() => disableNotifications()}
                style={{ marginTop: Layout.spacing.xs }}
              />
            ) : null}
          </View>
        </Card>

        {medicationReminders.map((rem) => (
          <Card key={rem.id} style={styles.reminderCard}>
            <View style={{ flex: 1 }}>
              <View style={{ flexDirection: 'row', alignItems: 'center', flexWrap: 'wrap', gap: 4 }}>
                <Text style={styles.medLabel}>{rem.label}</Text>
                <Badge label={rem.time} variant="sage" style={{ marginLeft: 4 }} />
              </View>
              <Text style={styles.medFreq}>Frequency: {rem.frequency}</Text>
            </View>
            <Switch
              value={rem.is_active === 1}
              onValueChange={(val) => toggleReminder(rem.id, val)}
              trackColor={{ false: Colors.border, true: Colors.primaryLight }}
              thumbColor={Colors.surface}
              accessibilityLabel={`${rem.label} reminder`}
              accessibilityState={{ checked: rem.is_active === 1 }}
              accessibilityHint="Turns this reminder time on or off. It does not record whether medication was taken."
            />
          </Card>
        ))}
      </ScrollView>

      <AddReminderModal
        visible={addModalVisible}
        onClose={() => setAddModalVisible(false)}
        onAdd={addReminder}
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
  card: {
    marginVertical: Layout.spacing.xs,
  },
  cardHeader: {
    fontSize: Layout.fontSize.body,
    fontWeight: Layout.fontWeight.semiBold,
    color: Colors.textPrimary,
    marginBottom: Layout.spacing.md,
  },
  weeklyRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-end',
    minHeight: 120,
    paddingTop: Layout.spacing.sm,
  },
  dayCol: {
    alignItems: 'center',
    flex: 1,
  },
  barTrack: {
    width: 14,
    height: 80,
    backgroundColor: Colors.borderLight,
    borderRadius: 7,
    justifyContent: 'flex-end',
    overflow: 'hidden',
  },
  barFill: {
    width: '100%',
    backgroundColor: Colors.primary,
    borderRadius: 7,
  },
  dayLabel: {
    fontSize: Layout.fontSize.caption,
    fontWeight: Layout.fontWeight.bold,
    color: Colors.textSecondary,
    marginTop: Layout.spacing.xs,
  },
  rateLabel: {
    fontSize: Layout.fontSize.caption,
    lineHeight: Layout.lineHeight.caption,
    color: Colors.textMuted,
  },
  insightsCard: {
    backgroundColor: Colors.surfaceSubtle,
    borderWidth: 1,
    borderColor: Colors.borderLight,
    marginVertical: Layout.spacing.xs,
  },
  insightsTitle: {
    fontSize: Layout.fontSize.bodySm,
    fontWeight: Layout.fontWeight.bold,
    color: Colors.primaryDark,
    marginBottom: 4,
  },
  insightText: {
    fontSize: Layout.fontSize.bodySm,
    color: Colors.textPrimary,
    lineHeight: Layout.lineHeight.bodySm,
    marginVertical: 2,
  },
  sectionHeaderRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    flexWrap: 'wrap',
    gap: Layout.spacing.sm,
    marginTop: Layout.spacing.lg,
    marginBottom: Layout.spacing.xs,
  },
  sectionTitle: {
    fontSize: Layout.fontSize.subheading,
    fontWeight: Layout.fontWeight.bold,
    color: Colors.textPrimary,
  },
  reminderSubtitle: {
    fontSize: Layout.fontSize.caption,
    color: Colors.textSecondary,
  },
  addBtn: {
    paddingHorizontal: Layout.spacing.md,
  },
  reminderNotice: {
    fontSize: Layout.fontSize.caption,
    color: Colors.textMuted,
    fontStyle: 'italic',
    marginBottom: Layout.spacing.xs,
  },
  reminderStatus: {
    fontSize: Layout.fontSize.caption,
    color: Colors.textSecondary,
    lineHeight: Layout.lineHeight.caption,
    marginTop: Layout.spacing.xs,
  },
  habitCard: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    alignItems: 'center',
    gap: Layout.spacing.sm,
    marginVertical: Layout.spacing.xs,
  },
  habitName: {
    fontSize: Layout.fontSize.body,
    fontWeight: Layout.fontWeight.semiBold,
    color: Colors.textPrimary,
  },
  habitFreq: {
    fontSize: Layout.fontSize.caption,
    color: Colors.textMuted,
    marginTop: 2,
  },
  streakContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.streakBadge,
    paddingHorizontal: Layout.spacing.md,
    paddingVertical: Layout.spacing.xs,
    borderRadius: Layout.borderRadius.md,
  },
  fireIcon: {
    fontSize: 18,
    marginRight: 6,
  },
  streakCount: {
    fontSize: Layout.fontSize.bodySm,
    fontWeight: Layout.fontWeight.bold,
    color: Colors.streakBadgeText,
  },
  bestStreak: {
    fontSize: Layout.fontSize.caption,
    lineHeight: Layout.lineHeight.caption,
    color: Colors.streakBadgeText,
  },
  reminderCard: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    alignItems: 'center',
    gap: Layout.spacing.sm,
    marginVertical: Layout.spacing.xs,
  },
  medLabel: {
    fontSize: Layout.fontSize.body,
    fontWeight: Layout.fontWeight.semiBold,
    color: Colors.textPrimary,
  },
  medFreq: {
    fontSize: Layout.fontSize.caption,
    color: Colors.textSecondary,
    marginTop: 2,
  },
});
