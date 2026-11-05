import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { Colors } from '../../constants/colors';
import { Layout } from '../../constants/layout';
import { DailyPlanRow } from '../../db/sqlite';
import { Badge } from '../common/Badge';

export interface ChecklistItemProps {
  item: DailyPlanRow;
  onToggleComplete: () => void;
  onOpenDetails: () => void;
}

export const ChecklistItem: React.FC<ChecklistItemProps> = ({
  item,
  onToggleComplete,
  onOpenDetails,
}) => {
  const isCompleted = item.is_completed === 1;
  const isSkipped = item.is_completed === 2;

  const getCategoryIcon = (category: string) => {
    switch (category) {
      case 'medication_reminder':
        return '💊';
      case 'movement':
        return '🚶';
      case 'hydration':
        return '💧';
      case 'nutrition':
        return '🥗';
      case 'wind_down':
        return '🌙';
      default:
        return '🌿';
    }
  };

  return (
    <View
      style={[
        styles.card,
        isCompleted && styles.cardCompleted,
        isSkipped && styles.cardSkipped,
      ]}
    >
      <TouchableOpacity
        activeOpacity={0.7}
        onPress={onToggleComplete}
        style={styles.checkboxTouch}
        accessibilityRole="checkbox"
        accessibilityState={{ checked: isSkipped ? 'mixed' : isCompleted }}
        aria-checked={isSkipped ? 'mixed' : isCompleted}
        accessibilityLabel={`${item.title}, ${isCompleted ? 'completed' : isSkipped ? 'skipped' : 'pending'}`}
        accessibilityHint={
          isCompleted
            ? 'Marks this item as pending again.'
            : 'Marks this item as completed.'
        }
      >
        <View
          style={[
            styles.checkbox,
            isCompleted && styles.checkboxChecked,
            isSkipped && styles.checkboxSkipped,
          ]}
        >
          {isCompleted && (
            <Text style={styles.checkMark} accessibilityElementsHidden importantForAccessibility="no">
              ✓
            </Text>
          )}
          {isSkipped && (
            <Text style={styles.skipMark} accessibilityElementsHidden importantForAccessibility="no">
              –
            </Text>
          )}
        </View>
      </TouchableOpacity>

      <TouchableOpacity
        activeOpacity={0.7}
        onPress={onOpenDetails}
        style={styles.contentTouch}
        accessibilityRole="button"
        accessibilityLabel={`Open details for ${item.title}`}
        accessibilityHint="Lets you add a note, mark the item completed, or skip it for today."
      >
        <View style={styles.titleRow}>
          <Text
            style={styles.categoryIcon}
            accessibilityElementsHidden
            importantForAccessibility="no"
          >
            {getCategoryIcon(item.category)}
          </Text>
          <Text
            style={[
              styles.title,
              isCompleted && styles.titleCompleted,
              isSkipped && styles.titleSkipped,
            ]}
          >
            {item.title}
          </Text>
          {item.is_recovery_item === 1 && (
            <Badge label="Recovery" variant="recovery" style={{ marginLeft: 6 }} />
          )}
        </View>

        {item.description ? (
          <Text style={styles.description}>{item.description}</Text>
        ) : null}

        {item.notes ? (
          <Text style={styles.notesText}>Note: {item.notes}</Text>
        ) : null}
      </TouchableOpacity>
    </View>
  );
};

const styles = StyleSheet.create({
  card: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.surface,
    borderRadius: Layout.borderRadius.lg,
    borderWidth: 1.5,
    borderColor: Colors.border,
    paddingVertical: Layout.spacing.sm,
    paddingHorizontal: Layout.spacing.md,
    marginVertical: Layout.spacing.xs,
    minHeight: Layout.touchTarget.minHeight + 10,
    ...Layout.shadow.subtle,
  },
  cardCompleted: {
    backgroundColor: Colors.surfaceSubtle,
    borderColor: Colors.accent,
  },
  cardSkipped: {
    backgroundColor: '#F9FAFB',
    borderColor: Colors.borderLight,
    opacity: 0.8,
  },
  checkboxTouch: {
    width: Layout.touchTarget.minWidth,
    height: Layout.touchTarget.minHeight,
    justifyContent: 'center',
    alignItems: 'center',
  },
  checkbox: {
    width: 26,
    height: 26,
    borderRadius: 7,
    borderWidth: 2,
    borderColor: Colors.primary,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: Colors.surface,
  },
  checkboxChecked: {
    backgroundColor: Colors.primary,
    borderColor: Colors.primary,
  },
  checkboxSkipped: {
    backgroundColor: Colors.border,
    borderColor: Colors.border,
  },
  checkMark: {
    color: Colors.textInverse,
    fontSize: 16,
    fontWeight: 'bold',
  },
  skipMark: {
    color: Colors.textSecondary,
    fontSize: 16,
    fontWeight: 'bold',
  },
  contentTouch: {
    flex: 1,
    paddingLeft: Layout.spacing.xs,
    paddingVertical: Layout.spacing.xs,
  },
  titleRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  categoryIcon: {
    fontSize: 16,
    marginRight: Layout.spacing.xs,
  },
  title: {
    flex: 1,
    fontSize: Layout.fontSize.body,
    fontWeight: Layout.fontWeight.semiBold,
    color: Colors.textPrimary,
  },
  titleCompleted: {
    color: Colors.textSecondary,
    textDecorationLine: 'line-through',
  },
  titleSkipped: {
    color: Colors.textMuted,
  },
  description: {
    fontSize: Layout.fontSize.caption,
    color: Colors.textSecondary,
    marginTop: 2,
  },
  notesText: {
    fontSize: Layout.fontSize.caption,
    color: Colors.primaryDark,
    fontStyle: 'italic',
    marginTop: 3,
  },
});
