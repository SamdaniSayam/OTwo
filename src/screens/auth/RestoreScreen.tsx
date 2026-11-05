import React from 'react';
import { Text, StyleSheet, SafeAreaView, ScrollView } from 'react-native';
import { Colors } from '../../constants/colors';
import { Layout } from '../../constants/layout';
import { Button } from '../../components/common/Button';
import { Card } from '../../components/common/Card';
import { DisclaimerBanner } from '../../components/common/DisclaimerBanner';
import { useAuthStore } from '../../store/useAuthStore';

/**
 * Shown when the signed-in cloud account has onboarding data but this device
 * has no local plan. The user must explicitly restore or start fresh; they are
 * never dropped into an "onboarded but empty" main screen.
 */
export const RestoreScreen = () => {
  const {
    user,
    restoreAvailable,
    restoreSavedPlan,
    startFreshOnboarding,
    isLoading,
    error,
  } = useAuthStore();

  const handleRestore = async () => {
    await restoreSavedPlan();
  };

  return (
    <SafeAreaView style={styles.safeArea}>
      <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
        <Text style={styles.title} accessibilityRole="header">
          Restore Your Routine
        </Text>
        <Text style={styles.subtitle}>
          You are signed in, but this device does not have a local routine plan yet.
        </Text>

        <DisclaimerBanner style={{ marginVertical: Layout.spacing.md }} />

        <Card style={styles.card}>
          <Text style={styles.cardHeader} accessibilityRole="header">
            Saved plan found
          </Text>
          <Text style={styles.body}>
            {restoreAvailable
              ? 'Your non-sensitive onboarding preferences (routine inputs, goals, and reminder times) are available in your cloud account. You can rebuild your daily plan from them.'
              : 'No saved cloud plan was found for this account. Start onboarding to build a local plan.'}
          </Text>
          <Text style={styles.notice}>
            Doctor advice notes are stored only on the device where they were entered. They are never
            uploaded and cannot be restored after a reinstall.
          </Text>

          {error ? (
            <Text
              style={styles.errorText}
              accessibilityLiveRegion="assertive"
              accessibilityRole="alert"
            >
              {error}
            </Text>
          ) : null}

          {restoreAvailable ? (
            <Button
              title="Rebuild My Plan From Saved Profile"
              size="lg"
              loading={isLoading}
              onPress={handleRestore}
              style={styles.primaryButton}
            />
          ) : null}

          <Button
            title="Start Fresh Onboarding"
            variant={restoreAvailable ? 'outline' : 'primary'}
            size="lg"
            onPress={startFreshOnboarding}
            style={styles.secondaryButton}
          />
        </Card>

        <Text style={styles.accountText}>
          Signed in as {user?.email || 'your account'}
        </Text>
      </ScrollView>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: Colors.background,
  },
  scrollContent: {
    flexGrow: 1,
    paddingHorizontal: Layout.spacing.lg,
    paddingVertical: Layout.spacing.xl,
    justifyContent: 'center',
  },
  title: {
    fontSize: Layout.fontSize.title,
    fontWeight: Layout.fontWeight.bold,
    color: Colors.primaryDark,
  },
  subtitle: {
    fontSize: Layout.fontSize.bodySm,
    color: Colors.textSecondary,
    marginTop: Layout.spacing.xs,
    lineHeight: Layout.lineHeight.bodySm,
  },
  card: {
    marginVertical: Layout.spacing.sm,
  },
  cardHeader: {
    fontSize: Layout.fontSize.subheading,
    fontWeight: Layout.fontWeight.bold,
    color: Colors.textPrimary,
    marginBottom: Layout.spacing.sm,
  },
  body: {
    fontSize: Layout.fontSize.bodySm,
    color: Colors.textPrimary,
    lineHeight: Layout.lineHeight.bodySm,
  },
  notice: {
    fontSize: Layout.fontSize.caption,
    color: Colors.textSecondary,
    lineHeight: Layout.lineHeight.caption,
    backgroundColor: Colors.surfaceSubtle,
    borderRadius: Layout.borderRadius.sm,
    padding: Layout.spacing.sm,
    marginTop: Layout.spacing.md,
  },
  errorText: {
    fontSize: Layout.fontSize.bodySm,
    color: Colors.error,
    backgroundColor: Colors.errorLight,
    borderRadius: Layout.borderRadius.sm,
    padding: Layout.spacing.sm,
    marginTop: Layout.spacing.md,
  },
  primaryButton: {
    marginTop: Layout.spacing.lg,
  },
  secondaryButton: {
    marginTop: Layout.spacing.sm,
  },
  accountText: {
    fontSize: Layout.fontSize.caption,
    color: Colors.textMuted,
    textAlign: 'center',
    marginTop: Layout.spacing.lg,
  },
});
