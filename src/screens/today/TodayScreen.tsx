import React, { useEffect, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  SafeAreaView,
  ScrollView,
  RefreshControl,
} from 'react-native';
import { Colors } from '../../constants/colors';
import { Layout } from '../../constants/layout';
import { ChecklistItem } from '../../components/plan/ChecklistItem';
import { RecoveryPlanBanner } from '../../components/plan/RecoveryPlanBanner';
import { ItemDetailModal } from '../../components/plan/ItemDetailModal';
import { AirQualityWidget } from '../../components/environment/AirQualityWidget';
import { DisclaimerBanner } from '../../components/common/DisclaimerBanner';
import { usePlanStore } from '../../store/usePlanStore';
import { useEnvStore } from '../../store/useEnvStore';
import { DailyPlanRow } from '../../db/sqlite';
import { APP_NAME } from '../../constants/app';

export const TodayScreen = () => {
  const { plans, recoveryState, isLoading, loadTodayPlan, markItemStatus, dismissRecoveryPlan } =
    usePlanStore();
  const { loadPreferences } = useEnvStore();
  const [selectedItem, setSelectedItem] = useState<DailyPlanRow | null>(null);

  useEffect(() => {
    loadTodayPlan();
    loadPreferences();
  }, [loadTodayPlan, loadPreferences]);

  const completedCount = plans.filter((p) => p.is_completed === 1).length;
  const totalCount = plans.length;
  const progressPercent = totalCount > 0 ? Math.round((completedCount / totalCount) * 100) : 0;

  const handleToggleComplete = (item: DailyPlanRow) => {
    const nextStatus = item.is_completed === 1 ? 0 : 1;
    markItemStatus(item.id, nextStatus);
  };

  return (
    <SafeAreaView style={styles.safeArea}>
      <ScrollView
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl refreshing={isLoading} onRefresh={loadTodayPlan} colors={[Colors.primary]} />
        }
      >
        {/* Header */}
        <View style={styles.header}>
          <View>
            <Text style={styles.appTitle} accessibilityRole="header">
              {APP_NAME}
            </Text>
            <Text style={styles.subtitle}>
              {new Date().toLocaleDateString('en-US', {
                weekday: 'long',
                month: 'short',
                day: 'numeric',
              })}
            </Text>
          </View>
          <View
            style={styles.progressBadge}
            accessible
            accessibilityLabel={`${completedCount} of ${totalCount} routine items completed`}
          >
            <Text style={styles.progressText}>
              {completedCount} / {totalCount} Done
            </Text>
          </View>
        </View>

        <DisclaimerBanner style={{ marginVertical: Layout.spacing.sm }} />

        {/* Adaptive Recovery Banner if active */}
        {recoveryState.recovery_active === 1 && (
          <RecoveryPlanBanner
            daysRemaining={recoveryState.recovery_days_remaining}
            onDismiss={dismissRecoveryPlan}
          />
        )}

        {/* Air Quality Widget */}
        <AirQualityWidget />

        {/* Daily Progress Bar */}
        <View style={styles.progressContainer}>
          <View
            style={styles.progressBar}
            accessibilityRole="progressbar"
            accessibilityLabel="Today's routine adherence"
            accessibilityValue={{
              min: 0,
              max: 100,
              now: progressPercent,
              text: `${completedCount} of ${totalCount} items completed`,
            }}
          >
            <View style={[styles.progressFill, { width: `${progressPercent}%` }]} />
          </View>
          <Text style={styles.progressLabel}>{progressPercent}% Routine Adherence</Text>
        </View>

        {/* Checklist Section */}
        <View style={styles.sectionHeaderRow}>
          <Text style={styles.sectionTitle} accessibilityRole="header">
            {"Today's Routine Checklist"}
          </Text>
          <Text style={styles.sectionSubtitle}>
            Tap an item to add a note or skip it for today
          </Text>
        </View>

        {plans.length === 0 ? (
          <View style={styles.emptyCard}>
            <Text style={styles.emptyTitle}>No checklist items for today</Text>
            <Text style={styles.emptySubtitle}>
              Pull down to refresh or check your onboarding plan templates.
            </Text>
          </View>
        ) : (
          plans.map((item) => (
            <ChecklistItem
              key={item.id}
              item={item}
              onToggleComplete={() => handleToggleComplete(item)}
              onOpenDetails={() => setSelectedItem(item)}
            />
          ))
        )}
      </ScrollView>

      {/* Item Action & Note Modal */}
      <ItemDetailModal
        item={selectedItem}
        visible={Boolean(selectedItem)}
        onClose={() => setSelectedItem(null)}
        onUpdateStatus={(id, status, notes) => markItemStatus(id, status, notes)}
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
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    flexWrap: 'wrap',
    gap: Layout.spacing.sm,
    marginBottom: Layout.spacing.xs,
  },
  appTitle: {
    fontSize: Layout.fontSize.title,
    fontWeight: Layout.fontWeight.bold,
    color: Colors.primaryDark,
  },
  subtitle: {
    fontSize: Layout.fontSize.bodySm,
    color: Colors.textSecondary,
  },
  progressBadge: {
    backgroundColor: Colors.accent,
    paddingHorizontal: Layout.spacing.md,
    paddingVertical: Layout.spacing.xs + 2,
    borderRadius: Layout.borderRadius.full,
  },
  progressText: {
    fontSize: Layout.fontSize.bodySm,
    fontWeight: Layout.fontWeight.bold,
    color: Colors.primaryDark,
  },
  progressContainer: {
    marginVertical: Layout.spacing.sm,
  },
  progressBar: {
    height: 8,
    backgroundColor: Colors.border,
    borderRadius: 4,
    overflow: 'hidden',
  },
  progressFill: {
    height: '100%',
    backgroundColor: Colors.primary,
  },
  progressLabel: {
    fontSize: Layout.fontSize.caption,
    color: Colors.textSecondary,
    marginTop: 4,
    textAlign: 'right',
  },
  sectionHeaderRow: {
    marginTop: Layout.spacing.md,
    marginBottom: Layout.spacing.xs,
  },
  sectionTitle: {
    fontSize: Layout.fontSize.subheading,
    fontWeight: Layout.fontWeight.bold,
    color: Colors.textPrimary,
  },
  sectionSubtitle: {
    fontSize: Layout.fontSize.caption,
    color: Colors.textSecondary,
  },
  emptyCard: {
    backgroundColor: Colors.surface,
    padding: Layout.spacing.xl,
    borderRadius: Layout.borderRadius.lg,
    alignItems: 'center',
    marginVertical: Layout.spacing.md,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  emptyTitle: {
    fontSize: Layout.fontSize.body,
    fontWeight: Layout.fontWeight.semiBold,
    color: Colors.textPrimary,
  },
  emptySubtitle: {
    fontSize: Layout.fontSize.bodySm,
    color: Colors.textSecondary,
    textAlign: 'center',
    marginTop: Layout.spacing.xs,
  },
});
