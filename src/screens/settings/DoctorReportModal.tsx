import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Modal,
  ScrollView,
  Share,
  TouchableOpacity,
  Alert,
  Platform,
} from 'react-native';
import { Colors } from '../../constants/colors';
import { Layout } from '../../constants/layout';
import { Button } from '../../components/common/Button';
import { DoctorReportData } from '../../services/reportGenerator';

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

  if (!reportData) return null;

  const handleShare = async () => {
    try {
      await Share.share({
        title: 'OTwo - Self-Logged Health Routine Summary',
        message: reportData.reportText,
      });
    } catch {
      // Ignored
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
        <View style={styles.container}>
          <View style={styles.header}>
            <View>
              <Text style={styles.title}>Doctor Visit Summary</Text>
              <Text style={styles.subtitle}>Self-reported habit & symptom log</Text>
            </View>
            <TouchableOpacity onPress={onClose} hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}>
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
                <Text style={styles.statLabel}>Avg Comfort</Text>
              </View>
            </View>

            <View style={styles.textContainer}>
              <Text style={styles.rawText}>{reportData.reportText}</Text>
            </View>
          </ScrollView>

          <View style={styles.footerRow}>
            <Button
              title="Share / Export Summary"
              size="lg"
              onPress={handleShare}
              style={{ flex: 1 }}
            />
            <Button
              title="Done"
              variant="outline"
              size="lg"
              onPress={onClose}
              style={{ marginLeft: Layout.spacing.sm, paddingHorizontal: Layout.spacing.lg }}
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
    alignItems: 'center',
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
  },
  closeIcon: {
    fontSize: 20,
    color: Colors.textMuted,
  },
  scrollArea: {
    marginVertical: Layout.spacing.sm,
  },
  statsRow: {
    flexDirection: 'row',
    gap: Layout.spacing.sm,
    marginBottom: Layout.spacing.md,
  },
  statBox: {
    flex: 1,
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
    fontSize: Layout.fontSize.caption - 1,
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
    fontSize: 11,
    lineHeight: 16,
    color: Colors.textPrimary,
  },
  footerRow: {
    flexDirection: 'row',
    marginTop: Layout.spacing.md,
  },
});
