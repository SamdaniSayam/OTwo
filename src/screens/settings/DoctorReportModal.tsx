import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Modal,
  ScrollView,
  TouchableOpacity,
  Platform,
} from 'react-native';
import { Colors } from '../../constants/colors';
import { Layout } from '../../constants/layout';
import { Button } from '../../components/common/Button';
import { DoctorReportData } from '../../services/reportGenerator';
import { exportReportText } from '../../services/reportExport';

export interface DoctorReportModalProps {
  visible: boolean;
  onClose: () => void;
  reportData: DoctorReportData | null;
}

export const DoctorReportModal: React.FC<DoctorReportModalProps> = ({
  visible,
  onClose,
  reportData,
}) => {
  const [copied, setCopied] = useState(false);
  const [isExporting, setIsExporting] = useState(false);
  const [exportError, setExportError] = useState('');

  if (!reportData) return null;

  const handleShare = async () => {
    setIsExporting(true);
    setExportError('');
    setCopied(false);
    try {
      await exportReportText(reportData.reportText);
      setCopied(true);
    } catch (error) {
      setExportError(
        error instanceof Error
          ? `Export failed: ${error.message}`
          : 'Export failed. The report was not shared.'
      );
    } finally {
      setIsExporting(false);
    }
  };

  return (
    <Modal
      transparent
      animationType="slide"
      visible={visible}
      onRequestClose={onClose}
    >
      <View style={styles.overlay}>
        <View style={styles.container} accessibilityViewIsModal role="dialog" aria-modal>
          <View style={styles.header}>
            <View style={styles.headerText}>
              <Text style={styles.title} accessibilityRole="header">
                Doctor Visit Summary
              </Text>
              <Text style={styles.subtitle}>Self-reported habit & symptom log</Text>
            </View>
            <TouchableOpacity
              onPress={onClose}
              hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
              accessibilityRole="button"
              accessibilityLabel="Close doctor visit summary"
              style={styles.closeButton}
            >
              <Text style={styles.closeIcon}>✕</Text>
            </TouchableOpacity>
          </View>

          <ScrollView style={styles.scrollArea} showsVerticalScrollIndicator={false}>
            <View style={styles.statsRow}>
              <View style={styles.statBox}>
                <Text style={styles.statVal}>{reportData.consistencyRate7d}%</Text>
                <Text style={styles.statLabel}>7-Day Adherence</Text>
              </View>
              <View style={styles.statBox}>
                <Text style={styles.statVal}>{reportData.totalLogs30d}</Text>
                <Text style={styles.statLabel}>Check-ins (30d)</Text>
              </View>
              <View style={styles.statBox}>
                <Text style={styles.statVal}>{reportData.averageBreathingComfort}</Text>
                <Text style={styles.statLabel}>Avg Breathing</Text>
              </View>
            </View>

            <Text style={styles.exportNotice}>
              Export creates a temporary text file on this device. Free-text symptom notes are{' '}
              {reportData.symptomNotesIncluded ? 'included' : 'excluded'} for this report. Doctor
              advice notes are never included.
            </Text>

            {exportError ? (
              <Text
                style={styles.exportError}
                accessibilityLiveRegion="assertive"
                accessibilityRole="alert"
              >
                {exportError}
              </Text>
            ) : null}
            {copied ? (
              <Text
                style={styles.exportSuccess}
                accessibilityLiveRegion="polite"
                accessibilityRole="alert"
              >
                Report file exported.
              </Text>
            ) : null}

            <View style={styles.textContainer}>
              <Text style={styles.rawText} selectable>
                {reportData.reportText}
              </Text>
            </View>
          </ScrollView>

          <View style={styles.footerRow}>
            <Button
              title="Share / Export Summary"
              size="lg"
              onPress={handleShare}
              loading={isExporting}
              style={{ flex: 1 }}
            />
            <Button
              title="Done"
              variant="outline"
              size="lg"
              onPress={onClose}
              style={{ paddingHorizontal: Layout.spacing.lg }}
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
    maxHeight: '88%',
    padding: Layout.spacing.xl,
    ...Layout.shadow.floating,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: Layout.spacing.md,
  },
  headerText: {
    flex: 1,
    paddingRight: Layout.spacing.sm,
  },
  title: {
    fontSize: Layout.fontSize.heading,
    fontWeight: Layout.fontWeight.bold,
    color: Colors.textPrimary,
  },
  subtitle: {
    fontSize: Layout.fontSize.caption,
    color: Colors.textSecondary,
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
  exportNotice: {
    fontSize: Layout.fontSize.caption,
    color: Colors.textSecondary,
    lineHeight: Layout.lineHeight.caption,
    marginBottom: Layout.spacing.sm,
  },
  exportError: {
    fontSize: Layout.fontSize.bodySm,
    color: Colors.error,
    backgroundColor: Colors.errorLight,
    borderRadius: Layout.borderRadius.sm,
    padding: Layout.spacing.sm,
    marginBottom: Layout.spacing.sm,
  },
  exportSuccess: {
    fontSize: Layout.fontSize.bodySm,
    color: Colors.primaryDark,
    backgroundColor: Colors.successLight,
    borderRadius: Layout.borderRadius.sm,
    padding: Layout.spacing.sm,
    marginBottom: Layout.spacing.sm,
  },
  statsRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: Layout.spacing.sm,
    marginBottom: Layout.spacing.md,
  },
  statBox: {
    flexGrow: 1,
    flexBasis: 96,
    minWidth: 96,
    backgroundColor: Colors.surfaceSubtle,
    borderRadius: Layout.borderRadius.md,
    padding: Layout.spacing.md,
    alignItems: 'center',
  },
  statVal: {
    fontSize: Layout.fontSize.subheading,
    fontWeight: Layout.fontWeight.bold,
    color: Colors.primaryDark,
  },
  statLabel: {
    fontSize: Layout.fontSize.caption,
    lineHeight: Layout.lineHeight.caption,
    color: Colors.textSecondary,
    marginTop: 2,
  },
  textContainer: {
    backgroundColor: '#F8FAF8',
    borderRadius: Layout.borderRadius.md,
    padding: Layout.spacing.md,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  rawText: {
    fontFamily: Platform.OS === 'ios' ? 'Courier' : 'monospace',
    fontSize: Layout.fontSize.caption,
    lineHeight: Layout.lineHeight.caption,
    color: Colors.textPrimary,
  },
  footerRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: Layout.spacing.sm,
    marginTop: Layout.spacing.md,
  },
});
