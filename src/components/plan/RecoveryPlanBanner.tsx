import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { Layout } from '../../constants/layout';

export interface RecoveryPlanBannerProps {
  daysRemaining: number;
  onDismiss: () => void;
}

export const RecoveryPlanBanner: React.FC<RecoveryPlanBannerProps> = ({
  daysRemaining,
  onDismiss,
}) => {
  return (
    <View style={styles.banner}>
      <View style={styles.content}>
        <View style={styles.headerRow}>
          <Text style={styles.badgeText}>🌿 Recovery Routine Active</Text>
          <TouchableOpacity
            onPress={onDismiss}
            hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
            accessibilityRole="button"
            accessibilityLabel="Switch to standard plan"
            accessibilityHint="Ends the simplified recovery routine and restores your regular checklist."
            style={styles.dismissButton}
          >
            <Text style={styles.dismissText}>Switch to Standard Plan ✕</Text>
          </TouchableOpacity>
        </View>
        <Text style={styles.title} accessibilityRole="header">
          Simplified Focus ({daysRemaining} {daysRemaining === 1 ? 'day' : 'days'} left)
        </Text>
        <Text style={styles.description}>
          We simplified your checklist to 3 gentle essentials so you can reset with zero pressure.
        </Text>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  banner: {
    backgroundColor: '#F0F9FF',
    borderRadius: Layout.borderRadius.lg,
    borderWidth: 1.5,
    borderColor: '#BAE6FD',
    padding: Layout.spacing.base,
    marginVertical: Layout.spacing.sm,
  },
  content: {
    gap: 4,
  },
  headerRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    flexWrap: 'wrap',
    gap: 4,
    marginBottom: 4,
  },
  badgeText: {
    flexShrink: 1,
    fontSize: Layout.fontSize.caption,
    fontWeight: Layout.fontWeight.bold,
    color: '#0369A1',
    textTransform: 'uppercase',
  },
  dismissButton: {
    minHeight: 44,
    justifyContent: 'center',
    flexShrink: 1,
  },
  dismissText: {
    flexShrink: 1,
    fontSize: Layout.fontSize.caption,
    color: '#0284C7',
    fontWeight: Layout.fontWeight.medium,
  },
  title: {
    fontSize: Layout.fontSize.subheading,
    fontWeight: Layout.fontWeight.bold,
    color: '#0C4A6E',
  },
  description: {
    fontSize: Layout.fontSize.bodySm,
    color: '#334155',
    lineHeight: Layout.lineHeight.bodySm,
  },
});
