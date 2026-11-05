import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Modal,
  TouchableOpacity,
  ActivityIndicator,
  ScrollView,
} from 'react-native';
import { Colors } from '../../constants/colors';
import { Layout } from '../../constants/layout';
import { Button } from '../../components/common/Button';
import { Input } from '../../components/common/Input';

export interface DeleteAccountModalProps {
  visible: boolean;
  isGuest: boolean;
  email?: string;
  onClose: () => void;
  onConfirm: () => Promise<{ success: boolean; error?: string }>;
}

export const DeleteAccountModal: React.FC<DeleteAccountModalProps> = ({
  visible,
  isGuest,
  email,
  onClose,
  onConfirm,
}) => {
  const [confirmation, setConfirmation] = useState('');
  const [status, setStatus] = useState<'idle' | 'deleting' | 'error'>('idle');
  const [error, setError] = useState('');

  // Reset transient form state when the dialog closes. Resetting in the close
  // handler avoids a state-setting effect and guarantees a clean next open.
  const handleClose = () => {
    if (status === 'deleting') return;
    setConfirmation('');
    setStatus('idle');
    setError('');
    onClose();
  };

  const canDelete = confirmation.trim().toUpperCase() === 'DELETE' && status !== 'deleting';

  const handleDelete = async () => {
    if (!canDelete) return;
    setStatus('deleting');
    setError('');
    const result = await onConfirm();
    if (!result.success) {
      setStatus('error');
      setError(result.error || 'Account deletion failed.');
    }
    // On success the auth store clears the user and this screen unmounts.
  };

  return (
    <Modal transparent animationType="fade" visible={visible} onRequestClose={handleClose}>
      <View style={styles.overlay}>
        <View style={styles.content} accessibilityViewIsModal role="dialog" aria-modal>
          <ScrollView showsVerticalScrollIndicator={false} keyboardShouldPersistTaps="handled">
            <Text style={styles.title} accessibilityRole="header">
              Delete Account & Data
            </Text>
            <Text style={styles.warning}>
              {isGuest
                ? 'This permanently deletes the guest data stored on this device.'
                : `This permanently deletes the account ${email || ''}, all related server rows, and all local health data on this device.`}
            </Text>
            <Text style={styles.detail}>
              The action cannot be undone. If the server deletion fails, nothing is removed locally so
              you can retry safely.
            </Text>

            <Input
              label="Type DELETE to confirm"
              placeholder="DELETE"
              autoCapitalize="characters"
              autoCorrect={false}
              value={confirmation}
              onChangeText={setConfirmation}
              editable={status !== 'deleting'}
            />

            {error ? (
              <Text
                style={styles.errorText}
                accessibilityLiveRegion="assertive"
                accessibilityRole="alert"
              >
                {error}
              </Text>
            ) : null}

            <View style={styles.buttonRow}>
              <Button
                title="Cancel"
                variant="ghost"
                onPress={handleClose}
                disabled={status === 'deleting'}
                style={{ flex: 1 }}
              />
              <Button
                title={status === 'deleting' ? 'Deleting…' : 'Delete Everything'}
                variant="danger"
                size="lg"
                onPress={handleDelete}
                disabled={!canDelete}
                loading={status === 'deleting'}
                style={{ flex: 2, marginLeft: Layout.spacing.sm }}
              />
            </View>

            {status === 'deleting' ? (
              <View style={styles.deletingRow} accessibilityLiveRegion="polite">
                <ActivityIndicator size="small" color={Colors.error} />
                <Text style={styles.deletingText}>
                  Deleting server account and local data…
                </Text>
              </View>
            ) : null}
          </ScrollView>

          <TouchableOpacity
            onPress={handleClose}
            disabled={status === 'deleting'}
            style={styles.closeButton}
            accessibilityRole="button"
            accessibilityLabel="Close delete account dialog"
          >
            <Text style={styles.closeText}>✕</Text>
          </TouchableOpacity>
        </View>
      </View>
    </Modal>
  );
};

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.6)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: Layout.spacing.lg,
  },
  content: {
    backgroundColor: Colors.surface,
    borderRadius: Layout.borderRadius.xl,
    padding: Layout.spacing.xl,
    width: '100%',
    maxWidth: 460,
    maxHeight: '90%',
    ...Layout.shadow.floating,
  },
  title: {
    fontSize: Layout.fontSize.heading,
    fontWeight: Layout.fontWeight.bold,
    color: Colors.error,
    marginBottom: Layout.spacing.sm,
    paddingRight: Layout.touchTarget.minWidth,
  },
  warning: {
    fontSize: Layout.fontSize.bodySm,
    color: Colors.textPrimary,
    lineHeight: Layout.lineHeight.bodySm,
    fontWeight: Layout.fontWeight.semiBold,
  },
  detail: {
    fontSize: Layout.fontSize.caption,
    color: Colors.textSecondary,
    lineHeight: Layout.lineHeight.caption,
    marginTop: Layout.spacing.sm,
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
  deletingRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: Layout.spacing.md,
  },
  deletingText: {
    fontSize: Layout.fontSize.caption,
    color: Colors.textSecondary,
    marginLeft: Layout.spacing.sm,
  },
  closeButton: {
    position: 'absolute',
    top: Layout.spacing.md,
    right: Layout.spacing.md,
    width: Layout.touchTarget.minWidth,
    height: Layout.touchTarget.minHeight,
    justifyContent: 'center',
    alignItems: 'center',
  },
  closeText: {
    fontSize: 20,
    color: Colors.textMuted,
  },
});
