import React, { useEffect, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Modal,
  ScrollView,
  TouchableOpacity,
  Alert,
} from 'react-native';
import { Colors } from '../../constants/colors';
import { Layout } from '../../constants/layout';
import { Button } from '../../components/common/Button';
import { Input } from '../../components/common/Input';
import { notesRepo } from '../../db/repositories/notesRepo';

export interface DoctorNotesModalProps {
  visible: boolean;
  onClose: () => void;
}

export const DoctorNotesModal: React.FC<DoctorNotesModalProps> = ({ visible, onClose }) => {
  const [notes, setNotes] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');

  useEffect(() => {
    if (!visible) return;
    let cancelled = false;
    /* eslint-disable react-hooks/set-state-in-effect -- resetting transient modal UI before starting the async load */
    setIsLoading(true);
    setMessage('');
    setError('');
    /* eslint-enable react-hooks/set-state-in-effect */
    notesRepo
      .getDoctorRecommendations()
      .then((value) => {
        if (!cancelled) setNotes(value || '');
      })
      .catch(() => {
        if (!cancelled) setError('Could not load the saved doctor advice notes.');
      })
      .finally(() => {
        if (!cancelled) setIsLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [visible]);

  const handleSave = async () => {
    setError('');
    setMessage('');
    if (!notes.trim()) {
      setError('Enter a note, or use Delete to remove the saved note.');
      return;
    }
    setIsSaving(true);
    try {
      await notesRepo.saveDoctorRecommendations(notes);
      setNotes(notes.trim());
      setMessage('Saved on this device.');
    } catch {
      setError('Could not save the note. Please try again.');
    } finally {
      setIsSaving(false);
    }
  };

  const handleDelete = () => {
    Alert.alert(
      'Delete doctor advice notes?',
      'This removes the note from this device. It cannot be undone, and the note cannot be restored from the cloud.',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: async () => {
            setError('');
            setMessage('');
            try {
              await notesRepo.deleteDoctorRecommendations();
              setNotes('');
              setMessage('Doctor advice notes deleted.');
            } catch {
              setError('Could not delete the note. Please try again.');
            }
          },
        },
      ]
    );
  };

  return (
    <Modal transparent animationType="slide" visible={visible} onRequestClose={onClose}>
      <View style={styles.overlay}>
        <View style={styles.container} accessibilityViewIsModal role="dialog" aria-modal>
          <View style={styles.header}>
            <View style={{ flex: 1 }}>
              <Text style={styles.title} accessibilityRole="header">
                Doctor Advice Notes
              </Text>
              <Text style={styles.subtitle}>
                Local-only. These notes are never uploaded or included in exports.
              </Text>
            </View>
            <TouchableOpacity
              onPress={onClose}
              hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}
              accessibilityRole="button"
              accessibilityLabel="Close doctor advice notes"
              style={styles.closeButton}
            >
              <Text style={styles.closeIcon}>✕</Text>
            </TouchableOpacity>
          </View>

          <ScrollView
            style={styles.scrollArea}
            keyboardShouldPersistTaps="handled"
            showsVerticalScrollIndicator={false}
          >
            <Input
              label="Your doctor's instructions"
              placeholder="e.g., Take controller twice daily, carry rescue inhaler during exercise..."
              value={notes}
              onChangeText={setNotes}
              multiline
              numberOfLines={5}
              editable={!isLoading && !isSaving}
              helperText="Stored only in this account's local database on this device."
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
            {message ? (
              <Text
                style={styles.successText}
                accessibilityLiveRegion="polite"
                accessibilityRole="alert"
              >
                {message}
              </Text>
            ) : null}

            <Text style={styles.notice}>
              This app does not provide medical advice. Follow the instructions from your licensed
              healthcare provider.
            </Text>
          </ScrollView>

          <View style={styles.footerRow}>
            <Button
              title="Delete"
              variant="danger"
              size="lg"
              onPress={handleDelete}
              disabled={isLoading || isSaving}
              style={styles.deleteButton}
            />
            <Button
              title="Save Notes"
              size="lg"
              onPress={handleSave}
              loading={isSaving}
              disabled={isLoading}
              style={{ flex: 2 }}
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
    backgroundColor: 'rgba(0,0,0,0.6)',
    justifyContent: 'flex-end',
  },
  container: {
    backgroundColor: Colors.surface,
    borderTopLeftRadius: Layout.borderRadius.xl,
    borderTopRightRadius: Layout.borderRadius.xl,
    maxHeight: '90%',
    padding: Layout.spacing.xl,
    ...Layout.shadow.floating,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    marginBottom: Layout.spacing.md,
  },
  title: {
    fontSize: Layout.fontSize.heading,
    fontWeight: Layout.fontWeight.bold,
    color: Colors.textPrimary,
  },
  subtitle: {
    fontSize: Layout.fontSize.caption,
    color: Colors.textSecondary,
    marginTop: 2,
    lineHeight: Layout.lineHeight.caption,
  },
  closeButton: {
    minWidth: Layout.touchTarget.minWidth,
    minHeight: Layout.touchTarget.minHeight,
    alignItems: 'flex-end',
    justifyContent: 'center',
  },
  closeIcon: {
    fontSize: 20,
    color: Colors.textMuted,
  },
  scrollArea: {
    marginVertical: Layout.spacing.sm,
  },
  errorText: {
    fontSize: Layout.fontSize.bodySm,
    color: Colors.error,
    backgroundColor: Colors.errorLight,
    borderRadius: Layout.borderRadius.sm,
    padding: Layout.spacing.sm,
    marginTop: Layout.spacing.sm,
  },
  successText: {
    fontSize: Layout.fontSize.bodySm,
    color: Colors.primaryDark,
    backgroundColor: Colors.successLight,
    borderRadius: Layout.borderRadius.sm,
    padding: Layout.spacing.sm,
    marginTop: Layout.spacing.sm,
  },
  notice: {
    fontSize: Layout.fontSize.caption,
    color: Colors.textSecondary,
    lineHeight: Layout.lineHeight.caption,
    marginTop: Layout.spacing.md,
  },
  footerRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    marginTop: Layout.spacing.md,
    gap: Layout.spacing.sm,
  },
  deleteButton: {
    flex: 1,
  },
});
