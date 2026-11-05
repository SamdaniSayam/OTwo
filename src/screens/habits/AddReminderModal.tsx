import React, { useState } from 'react';
import { View, Text, StyleSheet, Modal, TouchableOpacity, ScrollView } from 'react-native';
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

const REMINDER_TIME_PATTERN = /^([01]\d|2[0-3]):([0-5]\d)$/;

export const AddReminderModal: React.FC<AddReminderModalProps> = ({
  visible,
  onClose,
  onAdd,
}) => {
  const [label, setLabel] = useState('');
  const [time, setTime] = useState('08:00');
  const [frequency] = useState('daily');
  const [error, setError] = useState('');

  const handleSave = () => {
    setError('');
    if (!label.trim()) {
      setError('Enter a reminder label.');
      return;
    }
    if (!REMINDER_TIME_PATTERN.test(time.trim())) {
      setError('Enter a valid 24-hour time, such as 08:00 or 20:30.');
      return;
    }
    onAdd(label.trim(), time.trim(), frequency);
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
        <View style={styles.content} accessibilityViewIsModal role="dialog" aria-modal>
          <View style={styles.headerRow}>
            <Text style={styles.title} accessibilityRole="header">
              Add Time-of-Day Reminder
            </Text>
            <TouchableOpacity
              onPress={onClose}
              hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
              accessibilityRole="button"
              accessibilityLabel="Close add reminder dialog"
              style={styles.closeButton}
            >
              <Text style={styles.closeIcon}>✕</Text>
            </TouchableOpacity>
          </View>

          <ScrollView keyboardShouldPersistTaps="handled" showsVerticalScrollIndicator={false}>
            <Text style={styles.disclaimer}>{Disclaimers.medicationReminder}</Text>

            <Input
              label="Reminder Label"
              placeholder="e.g. Evening Controller Inhaler"
              value={label}
              onChangeText={setLabel}
              autoCapitalize="sentences"
            />

            <Input
              label="Scheduled Time (24-hour HH:mm)"
              placeholder="e.g. 20:00"
              value={time}
              onChangeText={setTime}
              keyboardType="numbers-and-punctuation"
              maxLength={5}
              helperText="Local time on this device. Reminders are alerts only; they do not record medication use."
            />

            {error ? (
              <Text style={styles.errorText} accessibilityLiveRegion="polite" accessibilityRole="alert">
                {error}
              </Text>
            ) : null}

            <View style={styles.buttonRow}>
              <Button title="Cancel" variant="ghost" onPress={onClose} style={{ flex: 1 }} />
              <Button
                title="Save Reminder"
                size="lg"
                onPress={handleSave}
                style={{ flex: 2, marginLeft: Layout.spacing.sm }}
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
    marginBottom: Layout.spacing.xs,
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
  disclaimer: {
    fontSize: Layout.fontSize.caption,
    color: Colors.textSecondary,
    backgroundColor: Colors.surfaceSubtle,
    padding: Layout.spacing.sm,
    borderRadius: Layout.borderRadius.sm,
    marginVertical: Layout.spacing.sm,
    lineHeight: Layout.lineHeight.caption,
  },
  errorText: {
    fontSize: Layout.fontSize.bodySm,
    color: Colors.error,
    backgroundColor: Colors.errorLight,
    borderRadius: Layout.borderRadius.sm,
    padding: Layout.spacing.sm,
    marginTop: Layout.spacing.sm,
  },
  buttonRow: {
    flexDirection: 'row',
    marginTop: Layout.spacing.lg,
  },
});
