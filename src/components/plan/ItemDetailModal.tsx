import React, { useState } from 'react';
import { View, Text, StyleSheet, Modal, TouchableOpacity, ScrollView } from 'react-native';
import { Colors } from '../../constants/colors';
import { Layout } from '../../constants/layout';
import { DailyPlanRow } from '../../db/sqlite';
import { Button } from '../common/Button';
import { Input } from '../common/Input';

export interface ItemDetailModalProps {
  item: DailyPlanRow | null;
  visible: boolean;
  onClose: () => void;
  onUpdateStatus: (id: string, isCompleted: number, notes?: string) => void;
}

export const ItemDetailModal: React.FC<ItemDetailModalProps> = ({
  item,
  visible,
  onClose,
  onUpdateStatus,
}) => {
  const [note, setNote] = useState('');

  if (!item) return null;

  const handleComplete = () => {
    onUpdateStatus(item.id, 1, note.trim() || undefined);
    setNote('');
    onClose();
  };

  const handleSkip = () => {
    onUpdateStatus(item.id, 2, note.trim() || 'Skipped for today');
    setNote('');
    onClose();
  };

  return (
    <Modal
      transparent
      animationType="fade"
      visible={visible}
      onRequestClose={onClose}
    >
      <View style={styles.overlay}>
        <View style={styles.content} accessibilityViewIsModal role="dialog" aria-modal>
          <View style={styles.headerRow}>
            <Text style={styles.title} accessibilityRole="header">
              {item.title}
            </Text>
            <TouchableOpacity
              onPress={onClose}
              hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
              accessibilityRole="button"
              accessibilityLabel="Close item details"
              style={styles.closeButton}
            >
              <Text style={styles.closeIcon}>✕</Text>
            </TouchableOpacity>
          </View>

          <ScrollView keyboardShouldPersistTaps="handled" showsVerticalScrollIndicator={false}>
            {item.description ? (
              <Text style={styles.description}>{item.description}</Text>
            ) : null}

            <Input
              label="Personal Note or Reason (Optional)"
              placeholder="e.g. Completed after breakfast, or felt tired today..."
              value={note}
              onChangeText={setNote}
              multiline
              numberOfLines={2}
              containerStyle={{ marginTop: Layout.spacing.md }}
            />

            <View style={styles.actionButtons}>
              <Button
                title="Mark as Completed ✓"
                variant="primary"
                size="lg"
                onPress={handleComplete}
                style={{ width: '100%' }}
              />
              <Button
                title="Skip Item for Today"
                variant="outline"
                size="md"
                onPress={handleSkip}
                style={{ width: '100%', borderColor: Colors.border }}
              />
            </View>
          </ScrollView>
        </View>
      </View>
    </Modal>
  );
};

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: Layout.spacing.lg,
  },
  content: {
    backgroundColor: Colors.surface,
    borderRadius: Layout.borderRadius.xl,
    padding: Layout.spacing.xl,
    width: '100%',
    maxWidth: 420,
    maxHeight: '90%',
    ...Layout.shadow.card,
  },
  headerRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: Layout.spacing.sm,
  },
  title: {
    flex: 1,
    fontSize: Layout.fontSize.heading,
    fontWeight: Layout.fontWeight.bold,
    color: Colors.textPrimary,
  },
  closeButton: {
    minWidth: Layout.touchTarget.minWidth,
    minHeight: Layout.touchTarget.minHeight,
    alignItems: 'flex-end',
    justifyContent: 'center',
  },
  closeIcon: {
    fontSize: 18,
    color: Colors.textMuted,
  },
  description: {
    fontSize: Layout.fontSize.bodySm,
    color: Colors.textSecondary,
    lineHeight: Layout.lineHeight.bodySm,
  },
  actionButtons: {
    gap: Layout.spacing.sm,
    marginTop: Layout.spacing.lg,
  },
});
