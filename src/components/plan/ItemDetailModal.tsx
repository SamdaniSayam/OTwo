import React, { useState } from 'react';
import { View, Text, StyleSheet, Modal, TouchableOpacity } from 'react-native';
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
        <View style={styles.content}>
          <View style={styles.headerRow}>
            <Text style={styles.title}>{item.title}</Text>
            <TouchableOpacity onPress={onClose} hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}>
              <Text style={styles.closeIcon}>✕</Text>
            </TouchableOpacity>
          </View>

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
  closeIcon: {
    fontSize: 18,
    color: Colors.textMuted,
    paddingLeft: Layout.spacing.sm,
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
