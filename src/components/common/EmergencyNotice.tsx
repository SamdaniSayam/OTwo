import React from 'react';
import { View, Text, StyleSheet, Modal, Linking, Platform } from 'react-native';
import { Colors } from '../../constants/colors';
import { Layout } from '../../constants/layout';
import { Button } from './Button';
import { Disclaimers } from '../../constants/disclaimers';

export interface EmergencyNoticeProps {
  visible: boolean;
  onDismiss: () => void;
  customMessage?: string;
}

export const EmergencyNotice: React.FC<EmergencyNoticeProps> = ({
  visible,
  onDismiss,
  customMessage,
}) => {
  const handleCallEmergency = () => {
    const emergencyNumber = Platform.OS === 'ios' ? 'telprompt:911' : 'tel:911';
    Linking.openURL(emergencyNumber).catch(() => {
      // Fallback
    });
  };

  return (
    <Modal
      transparent
      animationType="fade"
      visible={visible}
      onRequestClose={onDismiss}
    >
      <View style={styles.overlay}>
        <View style={styles.modalContent}>
          <View style={styles.iconContainer}>
            <Text style={styles.warningIcon}>🚨</Text>
          </View>
          <Text style={styles.title}>Emergency Medical Notice</Text>
          <Text style={styles.message}>
            {customMessage || Disclaimers.emergencyEscalation}
          </Text>

          <View style={styles.buttonGroup}>
            <Button
              title="Call Emergency (911)"
              variant="danger"
              size="lg"
              onPress={handleCallEmergency}
              style={styles.emergencyButton}
            />
            <Button
              title="I am Safe / Close Notice"
              variant="outline"
              size="md"
              onPress={onDismiss}
              style={styles.dismissButton}
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
    backgroundColor: 'rgba(0, 0, 0, 0.65)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: Layout.spacing.lg,
  },
  modalContent: {
    backgroundColor: Colors.surface,
    borderRadius: Layout.borderRadius.xl,
    padding: Layout.spacing.xl,
    width: '100%',
    maxWidth: 420,
    alignItems: 'center',
    ...Layout.shadow.floating,
  },
  iconContainer: {
    width: 64,
    height: 64,
    borderRadius: 32,
    backgroundColor: Colors.errorLight,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: Layout.spacing.md,
  },
  warningIcon: {
    fontSize: 32,
  },
  title: {
    fontSize: Layout.fontSize.heading,
    fontWeight: Layout.fontWeight.bold,
    color: Colors.error,
    textAlign: 'center',
    marginBottom: Layout.spacing.sm,
  },
  message: {
    fontSize: Layout.fontSize.body,
    lineHeight: Layout.lineHeight.body,
    color: Colors.textPrimary,
    textAlign: 'center',
    marginBottom: Layout.spacing.xl,
  },
  buttonGroup: {
    width: '100%',
    gap: Layout.spacing.md,
  },
  emergencyButton: {
    width: '100%',
  },
  dismissButton: {
    width: '100%',
    borderColor: Colors.border,
  },
});
