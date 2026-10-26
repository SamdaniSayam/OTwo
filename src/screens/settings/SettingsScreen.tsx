import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  SafeAreaView,
  ScrollView,
  Switch,
  Alert,
  TouchableOpacity,
} from 'react-native';
import { Colors } from '../../constants/colors';
import { Layout } from '../../constants/layout';
import { Button } from '../../components/common/Button';
import { Card } from '../../components/common/Card';
import { DisclaimerBanner } from '../../components/common/DisclaimerBanner';
import { DoctorReportModal } from './DoctorReportModal';
import { useAuthStore } from '../../store/useAuthStore';
import { useEnvStore } from '../../store/useEnvStore';
import { generateDoctorReport, DoctorReportData } from '../../services/reportGenerator';
import { APP_NAME, APP_VERSION } from '../../constants/app';
import { Disclaimers } from '../../constants/disclaimers';

export const SettingsScreen = () => {
  const { user, logout, deleteAccount } = useAuthStore();
  const { enabled: envEnabled, toggleEnabled: toggleEnv } = useEnvStore();

  const [notifications, setNotifications] = useState(true);
  const [reportModalVisible, setReportModalVisible] = useState(false);
  const [reportData, setReportData] = useState<DoctorReportData | null>(null);
  const [isGenerating, setIsGenerating] = useState(false);

  const handleOpenDoctorReport = async () => {
    setIsGenerating(true);
    const data = await generateDoctorReport(user?.age);
    setReportData(data);
    setIsGenerating(false);
    setReportModalVisible(true);
  };

  const handleConfirmDelete = () => {
    Alert.alert(
      'Delete Account & Data',
      'This will permanently delete all your local routine plans, symptom check-ins, reminders, and online account records. This action cannot be undone.',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete Everything',
          style: 'destructive',
          onPress: async () => {
            await deleteAccount();
          },
        },
      ]
    );
  };

  return (
    <SafeAreaView style={styles.safeArea}>
      <ScrollView
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        <Text style={styles.screenTitle}>Settings & Privacy</Text>
        <Text style={styles.screenSubtitle}>Manage your profile, routine alerts, and local data</Text>

        <DisclaimerBanner style={{ marginVertical: Layout.spacing.sm }} />

        {/* Profile Card */}
        <Card style={styles.card}>
          <Text style={styles.cardHeader}>Profile & Account</Text>
          <View style={styles.infoRow}>
            <Text style={styles.infoLabel}>Account Status</Text>
            <Text style={styles.infoValue}>
              {user?.isGuest ? 'Guest (Local Offline Mode)' : user?.email || 'Logged In'}
            </Text>
          </View>
          {user?.age ? (
            <View style={styles.infoRow}>
              <Text style={styles.infoLabel}>Age</Text>
              <Text style={styles.infoValue}>{user.age} years old</Text>
            </View>
          ) : null}
          <View style={styles.infoRow}>
            <Text style={styles.infoLabel}>App Version</Text>
            <Text style={styles.infoValue}>{APP_VERSION}</Text>
          </View>
        </Card>

        {/* Doctor Sharing Card */}
        <Card style={styles.card}>
          <Text style={styles.cardHeader}>Doctor Sharing</Text>
          <Text style={styles.cardSub}>
            Compile your self-logged habit consistency, logged triggers, and breathing comfort observations into an easily readable summary.
          </Text>
          <Button
            title="Generate Doctor Visit Summary"
            variant="primary"
            size="lg"
            loading={isGenerating}
            onPress={handleOpenDoctorReport}
            style={{ marginTop: Layout.spacing.md }}
          />
        </Card>

        {/* Preferences Card */}
        <Card style={styles.card}>
          <Text style={styles.cardHeader}>App Preferences</Text>
          <View style={styles.settingRow}>
            <View style={{ flex: 1, paddingRight: Layout.spacing.md }}>
              <Text style={styles.settingTitle}>Medication & Routine Reminders</Text>
              <Text style={styles.settingSubtitle}>Local notifications for your daily checklist</Text>
            </View>
            <Switch
              value={notifications}
              onValueChange={setNotifications}
              trackColor={{ false: Colors.border, true: Colors.secondary }}
              thumbColor={notifications ? Colors.primary : '#F4F4F4'}
            />
          </View>

          <View style={[styles.settingRow, { borderTopWidth: 1, borderTopColor: Colors.borderLight, paddingTop: Layout.spacing.md }]}>
            <View style={{ flex: 1, paddingRight: Layout.spacing.md }}>
              <Text style={styles.settingTitle}>Public Air Quality / Weather Display</Text>
              <Text style={styles.settingSubtitle}>
                Read-only public environmental conditions widget on Today's screen
              </Text>
            </View>
            <Switch
              value={envEnabled}
              onValueChange={toggleEnv}
              trackColor={{ false: Colors.border, true: Colors.secondary }}
              thumbColor={envEnabled ? Colors.primary : '#F4F4F4'}
            />
          </View>
        </Card>

        {/* Safety & Boundaries Statement */}
        <Card style={[styles.card, { backgroundColor: Colors.surfaceSubtle }]}>
          <Text style={styles.cardHeader}>Safety & Medical Boundaries</Text>
          <Text style={styles.disclaimerText}>{Disclaimers.general}</Text>
        </Card>

        {/* Account Actions */}
        <View style={styles.actionContainer}>
          <Button
            title="Sign Out"
            variant="outline"
            size="lg"
            onPress={logout}
            style={{ width: '100%', borderColor: Colors.border }}
          />
          <TouchableOpacity
            activeOpacity={0.7}
            onPress={handleConfirmDelete}
            style={styles.deleteBtn}
          >
            <Text style={styles.deleteText}>Delete Account & Wipe All Local Data</Text>
          </TouchableOpacity>
        </View>
      </ScrollView>

      <DoctorReportModal
        visible={reportModalVisible}
        onClose={() => setReportModalVisible(false)}
        reportData={reportData}
      />
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: Colors.background,
  },
  scrollContent: {
    paddingHorizontal: Layout.spacing.base,
    paddingVertical: Layout.spacing.md,
  },
  screenTitle: {
    fontSize: Layout.fontSize.title,
    fontWeight: Layout.fontWeight.bold,
    color: Colors.primaryDark,
  },
  screenSubtitle: {
    fontSize: Layout.fontSize.bodySm,
    color: Colors.textSecondary,
    marginBottom: Layout.spacing.xs,
  },
  card: {
    marginVertical: Layout.spacing.xs,
  },
  cardHeader: {
    fontSize: Layout.fontSize.body,
    fontWeight: Layout.fontWeight.bold,
    color: Colors.textPrimary,
    marginBottom: Layout.spacing.xs,
  },
  cardSub: {
    fontSize: Layout.fontSize.caption,
    color: Colors.textSecondary,
    lineHeight: Layout.lineHeight.caption,
  },
  infoRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: Layout.spacing.xs + 2,
    borderBottomWidth: 1,
    borderBottomColor: Colors.borderLight,
  },
  infoLabel: {
    fontSize: Layout.fontSize.bodySm,
    color: Colors.textSecondary,
  },
  infoValue: {
    fontSize: Layout.fontSize.bodySm,
    fontWeight: Layout.fontWeight.medium,
    color: Colors.textPrimary,
  },
  settingRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginVertical: Layout.spacing.xs,
  },
  settingTitle: {
    fontSize: Layout.fontSize.bodySm,
    fontWeight: Layout.fontWeight.semiBold,
    color: Colors.textPrimary,
  },
  settingSubtitle: {
    fontSize: Layout.fontSize.caption,
    color: Colors.textSecondary,
    marginTop: 2,
  },
  disclaimerText: {
    fontSize: Layout.fontSize.caption,
    color: Colors.textSecondary,
    lineHeight: Layout.lineHeight.caption,
    marginTop: 4,
  },
  actionContainer: {
    marginTop: Layout.spacing.xl,
    gap: Layout.spacing.md,
    alignItems: 'center',
  },
  deleteBtn: {
    paddingVertical: Layout.spacing.md,
  },
  deleteText: {
    fontSize: Layout.fontSize.bodySm,
    color: Colors.error,
    fontWeight: Layout.fontWeight.medium,
  },
});
