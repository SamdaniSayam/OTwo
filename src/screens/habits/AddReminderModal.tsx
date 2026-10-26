import React, { useState } from 'react';
import { View, Text, StyleSheet, Modal, TouchableOpacity } from 'react-native';
import { Colors } from '../../constants/colors';
import { Layout } from '../../constants/layout';
import { Button } from '../../components/common/Button';
import { Input } from '../../components/common/Input';
import { Disclaimers } from '../../constants/disclaimers';

export interface AddReminderModalProps {
  visible: boolean;
  onClose: () => void;
  onAdd: (label: string, time: string, frequency: string) => void;
}

export const AddReminderModal: React.FC<AddReminderModalProps> = ({
  visible,
  onClose,
  onAdd,
}) => {
  const [label, setLabel] = useState('');
  const [time, setTime] = useState('08:00');
  const [frequency, setFrequency] = useState('daily');

  const handleSave = () => {
    if (!label.trim()) return;
    onAdd(label.trim(), time.trim() || '08:00', frequency);
    setLabel('');
    setTime('08:00');
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
            <Text style={styles.title}>Add Time-of-Day Reminder</Text>
            <TouchableOpacity onPress={onClose} hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}>
              <Text style={styles.closeIcon}>✕</Text>
            </TouchableOpacity>
          </View>

          <Text style={styles.disclaimer}>{Disclaimers.medicationReminder}</Text>

          <Input
            label="Reminder Label"
            placeholder="e.g. Evening Controller Inhaler"
            value={label}
            onChangeText={setLabel}
          />

          <Input
            label="Scheduled Time (HH:mm)"
            placeholder="e.g. 20:00"
            value={time}
            onChangeText={setTime}
          />

          <View style={styles.buttonRow}>
            <Button
              title="Cancel"
              variant="ghost"
              onPress={onClose}
              style={{ flex: 1 }}
            />
            <Button
              title="Save Reminder"
              size="lg"
              onPress={handleSave}
              style={{ flex: 2, marginLeft: Layout.spacing.sm }}
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
    alignItems: 'center',
    marginBottom: Layout.spacing.xs,
  },
  title: {
    fontSize: Layout.fontSize.heading,
    fontWeight: Layout.fontWeight.bold,
    color: Colors.textPrimary,
  },
  closeIcon: {
    fontSize: 18,
    color: Colors.textMuted,
  },
  disclaimer: {
    fontSize: Layout.fontSize.caption,
    color: Colors.textSecondary,
    backgroundColor: Colors.surfaceSubtle,
    padding: Layout.spacing.sm,
    borderRadius: Layout.borderRadius.sm,
    marginVertical: Layout.spacing.sm,
  },
  buttonRow: {
    flexDirection: 'row',
    marginTop: Layout.spacing.lg,
  },
});
