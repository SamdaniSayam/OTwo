import React, { useEffect, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  SafeAreaView,
  ScrollView,
  Switch,
  TouchableOpacity,
  Platform,
} from 'react-native';
import { Colors } from '../../constants/colors';
import { Layout } from '../../constants/layout';
import { Button } from '../../components/common/Button';
import { Card } from '../../components/common/Card';
import { Input } from '../../components/common/Input';
import { DisclaimerBanner } from '../../components/common/DisclaimerBanner';
import { DoctorReportModal } from './DoctorReportModal';
import { DoctorNotesModal } from './DoctorNotesModal';
import { DeleteAccountModal } from './DeleteAccountModal';
import { useAuthStore } from '../../store/useAuthStore';
import { useEnvStore } from '../../store/useEnvStore';
import { useHabitStore } from '../../store/useHabitStore';
import { useSettingsStore } from '../../store/useSettingsStore';
import { generateDoctorReport, DoctorReportData } from '../../services/reportGenerator';
import { openNotificationSettings } from '../../services/notifications';
import { APP_VERSION } from '../../constants/app';
import { Disclaimers } from '../../constants/disclaimers';

export const SettingsScreen = () => {
  const { user, logout, deleteAccount } = useAuthStore();
  const { enabled: envEnabled, toggleEnabled: toggleEnv } = useEnvStore();
  const {
    emergencyNumber,
    loadEmergencyNumber,
    setEmergencyNumber,
  } = useSettingsStore();
  const notificationPermission = useHabitStore((state) => state.notificationPermission);
  const scheduledReminderCount = useHabitStore((state) => state.scheduledReminderCount);
  const enableNotifications = useHabitStore((state) => state.enableNotifications);

  const [reportModalVisible, setReportModalVisible] = useState(false);
  const [reportData, setReportData] = useState<DoctorReportData | null>(null);
  const [includeSymptomNotes, setIncludeSymptomNotes] = useState(false);
  const [isGenerating, setIsGenerating] = useState(false);
  const [notesModalVisible, setNotesModalVisible] = useState(false);
  const [deleteModalVisible, setDeleteModalVisible] = useState(false);
  const [emergencyInput, setEmergencyInput] = useState(emergencyNumber);
  const [lastEmergencyNumber, setLastEmergencyNumber] = useState(emergencyNumber);
  const [emergencyMessage, setEmergencyMessage] = useState('');

  useEffect(() => {
    loadEmergencyNumber();
  }, [loadEmergencyNumber]);

  // Adjust the editable field when the persisted value loads. This is React's
  // documented "adjust state when a value changes" pattern and avoids a
  // cascading render from a state-setting effect.
  if (emergencyNumber !== lastEmergencyNumber) {
    setLastEmergencyNumber(emergencyNumber);
    setEmergencyInput(emergencyNumber);
  }

  const handleOpenDoctorReport = async () => {
    setIsGenerating(true);
    const data = await generateDoctorReport({
      userAge: user?.age,
      includeSymptomNotes,
    });
    setReportData(data);
    setIsGenerating(false);
    setReportModalVisible(true);
  };

  const handleSaveEmergencyNumber = async () => {
    const result = await setEmergencyNumber(emergencyInput);
    setEmergencyMessage(result.success ? 'Emergency number saved.' : result.error || 'Could not save.');
    setTimeout(() => setEmergencyMessage(''), 3500);
  };

  return (
    <SafeAreaView style={styles.safeArea}>
      <ScrollView
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        <Text style={styles.screenTitle} accessibilityRole="header">
          Settings & Privacy
        </Text>
        <Text style={styles.screenSubtitle}>Manage your profile, safety number, and local data</Text>

        <DisclaimerBanner style={{ marginVertical: Layout.spacing.sm }} />

        {/* Profile Card */}
        <Card style={styles.card}>
          <Text style={styles.cardHeader} accessibilityRole="header">Profile & Account</Text>
          <View style={styles.infoRow}>
            <Text style={styles.infoLabel}>Account Status</Text>
            <Text style={styles.infoValue}>
              {user?.isGuest ? 'Guest (local-only)' : user?.email || 'Logged In'}
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
          <Text style={styles.cardHeader} accessibilityRole="header">Doctor Sharing</Text>
          <Text style={styles.cardSub}>
            Compile your self-logged habit consistency, logged triggers, and breathing comfort observations into an easily readable summary.
          </Text>
          <View style={styles.settingRow}>
            <View style={{ flex: 1, paddingRight: Layout.spacing.md }}>
              <Text style={styles.settingTitle}>Include free-text symptom notes</Text>
              <Text style={styles.settingSubtitle}>
                Off by default. Notes may contain sensitive details. Doctor advice notes are never
                included in an export.
              </Text>
            </View>
            <Switch
              value={includeSymptomNotes}
              onValueChange={setIncludeSymptomNotes}
              trackColor={{ false: Colors.border, true: Colors.primaryLight }}
              thumbColor={Colors.surface}
              accessibilityLabel="Include free-text symptom notes in the doctor report"
              accessibilityState={{ checked: includeSymptomNotes }}
            />
          </View>
          <Button
            title="Generate Doctor Visit Summary"
            variant="primary"
            size="lg"
            loading={isGenerating}
            onPress={handleOpenDoctorReport}
            style={{ marginTop: Layout.spacing.md }}
          />
        </Card>

        {/* Doctor advice notes */}
        <Card style={styles.card}>
          <Text style={styles.cardHeader} accessibilityRole="header">Doctor Advice Notes</Text>
          <Text style={styles.cardSub}>
            {"Your doctor's written instructions are stored only on this device and in this account. You can review, edit, or delete them at any time."}
          </Text>
          <Button
            title="View / Edit Doctor Advice Notes"
            variant="outline"
            size="md"
            onPress={() => setNotesModalVisible(true)}
            style={{ marginTop: Layout.spacing.md }}
          />
        </Card>

        {/* Preferences Card */}
        <Card style={styles.card}>
          <Text style={styles.cardHeader} accessibilityRole="header">App Preferences</Text>

          <View style={styles.settingRow}>
            <View style={{ flex: 1, paddingRight: Layout.spacing.md }}>
              <Text style={styles.settingTitle}>Medication & Routine Reminders</Text>
              <Text style={styles.settingSubtitle}>
                {notificationPermission === 'granted'
                  ? scheduledReminderCount > 0
                    ? `${scheduledReminderCount} active reminder${scheduledReminderCount === 1 ? '' : 's'} scheduled locally on this device.`
                    : 'Notifications are allowed, but there are no active reminder times to schedule.'
                  : notificationPermission === 'denied'
                    ? 'Notifications are blocked in device settings. Reminder times remain visible in the Habits tab.'
                    : notificationPermission === 'unsupported'
                      ? 'System notifications are not available on this platform. Reminder times remain visible in the Habits tab.'
                      : 'Allow local notifications to receive reminder times on this device.'}
              </Text>
              {notificationPermission === 'undetermined' ? (
                <Button
                  title="Enable Notifications"
                  variant="outline"
                  size="md"
                  onPress={() => enableNotifications()}
                  style={{ marginTop: Layout.spacing.sm }}
                />
              ) : null}
              {notificationPermission === 'denied' ? (
                <Button
                  title="Open Device Settings"
                  variant="outline"
                  size="md"
                  onPress={() => openNotificationSettings()}
                  style={{ marginTop: Layout.spacing.sm }}
                />
              ) : null}
            </View>
          </View>

          <View style={[styles.settingRow, { borderTopWidth: 1, borderTopColor: Colors.borderLight, paddingTop: Layout.spacing.md }]}>
            <View style={{ flex: 1, paddingRight: Layout.spacing.md }}>
              <Text style={styles.settingTitle}>Public Air Quality Display</Text>
              <Text style={styles.settingSubtitle}>
                {"Read-only public air-quality widget on Today's screen. Hidden when live data is unavailable."}
              </Text>
            </View>
            <Switch
              value={envEnabled}
              onValueChange={toggleEnv}
              trackColor={{ false: Colors.border, true: Colors.primaryLight }}
              thumbColor={Colors.surface}
              accessibilityLabel="Public air quality display"
              accessibilityState={{ checked: envEnabled }}
              accessibilityHint="Shows or hides the local air-quality widget. Location permission is requested separately when you enable the widget."
            />
          </View>

          <View style={[styles.emergencyBlock, { borderTopWidth: 1, borderTopColor: Colors.borderLight }]}>
            <Text style={styles.settingTitle}>Emergency Number</Text>
            <Text style={styles.settingSubtitle}>
              Used by in-app emergency notices. The default is based on your device region; verify it
              matches your local emergency services.
            </Text>
            <View style={styles.emergencyRow}>
              <Input
                label="Number"
                value={emergencyInput}
                onChangeText={setEmergencyInput}
                keyboardType="phone-pad"
                containerStyle={{ flex: 1, minWidth: 160, marginVertical: 0 }}
              />
              <Button
                title="Save"
                size="md"
                variant="outline"
                onPress={handleSaveEmergencyNumber}
                style={styles.emergencySave}
              />
            </View>
            {emergencyMessage ? (
              <Text
                style={styles.savedText}
                accessibilityLiveRegion="polite"
                accessibilityRole="alert"
              >
                {emergencyMessage}
              </Text>
            ) : null}
          </View>
        </Card>

        {/* Local data statement */}
        <Card style={[styles.card, { backgroundColor: Colors.surfaceSubtle }]}>
          <Text style={styles.cardHeader} accessibilityRole="header">Local Data</Text>
          <Text style={styles.disclaimerText}>
            Plans, symptom check-ins, habit streaks, chat history, and reminders are stored on this
            device and separated by account. Doctor advice notes are stored only on this device and
            are never uploaded.
            {'\n\n'}
            {Platform.OS === 'web'
              ? 'Web build: data is kept in this browser profile. The web app does not add its own encryption at rest, so protect your device and browser profile. Browser storage can be cleared by the browser or by clearing site data.'
              : 'Native builds use an encrypted local database (SQLCipher). The database key is kept in the device Keychain/Keystore, not in the database. If encrypted storage is unavailable, the app refuses to open an unencrypted health database. iOS excludes the database directory from device backups, and Android backups are disabled.'}
            {'\n\n'}
            Cloud sync, when configured, contains only the non-sensitive onboarding inputs needed to
            rebuild a plan. It is never used as the source of truth for symptom logs or doctor
            advice notes.
          </Text>
        </Card>

        {/* Safety & Boundaries Statement */}
        <Card style={[styles.card, { backgroundColor: Colors.surfaceSubtle }]}>
          <Text style={styles.cardHeader} accessibilityRole="header">Safety & Medical Boundaries</Text>
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
            onPress={() => setDeleteModalVisible(true)}
            style={styles.deleteBtn}
            accessibilityRole="button"
            accessibilityLabel="Delete account and wipe all local data"
            accessibilityHint="Opens a confirmation dialog. This permanently deletes your account and local health data."
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

      <DoctorNotesModal
        visible={notesModalVisible}
        onClose={() => setNotesModalVisible(false)}
      />

      <DeleteAccountModal
        visible={deleteModalVisible}
        isGuest={Boolean(user?.isGuest)}
        email={user?.email}
        onClose={() => setDeleteModalVisible(false)}
        onConfirm={deleteAccount}
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
    flexWrap: 'wrap',
    justifyContent: 'space-between',
    gap: 4,
    paddingVertical: Layout.spacing.xs + 2,
    borderBottomWidth: 1,
    borderBottomColor: Colors.borderLight,
  },
  infoLabel: {
    fontSize: Layout.fontSize.bodySm,
    color: Colors.textSecondary,
    marginRight: Layout.spacing.sm,
  },
  infoValue: {
    flexShrink: 1,
    fontSize: Layout.fontSize.bodySm,
    fontWeight: Layout.fontWeight.medium,
    color: Colors.textPrimary,
    textAlign: 'right',
  },
  settingRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    flexWrap: 'wrap',
    gap: Layout.spacing.sm,
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
    lineHeight: Layout.lineHeight.caption,
  },
  emergencyBlock: {
    marginTop: Layout.spacing.md,
    paddingTop: Layout.spacing.md,
  },
  emergencyRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    alignItems: 'flex-end',
    gap: Layout.spacing.sm,
    marginTop: Layout.spacing.sm,
  },
  emergencySave: {
    marginBottom: Layout.spacing.sm,
  },
  savedText: {
    fontSize: Layout.fontSize.caption,
    color: Colors.primaryDark,
    marginTop: Layout.spacing.xs,
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
    minHeight: Layout.touchTarget.minHeight,
    justifyContent: 'center',
    paddingVertical: Layout.spacing.md,
  },
  deleteText: {
    fontSize: Layout.fontSize.bodySm,
    color: Colors.error,
    fontWeight: Layout.fontWeight.medium,
  },
});
