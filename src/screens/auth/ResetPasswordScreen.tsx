import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  SafeAreaView,
  ScrollView,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import { Colors } from '../../constants/colors';
import { Layout } from '../../constants/layout';
import { Button } from '../../components/common/Button';
import { Input } from '../../components/common/Input';
import { DisclaimerBanner } from '../../components/common/DisclaimerBanner';
import { useAuthStore } from '../../store/useAuthStore';
import { APP_NAME } from '../../constants/app';

export const ResetPasswordScreen = () => {
  const { updatePassword, logout, isLoading } = useAuthStore();
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [error, setError] = useState('');

  const handleSubmit = async () => {
    setError('');
    if (password.length < 6) {
      setError('Password should be at least 6 characters.');
      return;
    }
    if (password !== confirmPassword) {
      setError('Passwords do not match.');
      return;
    }
    const result = await updatePassword(password);
    if (!result.success) {
      setError(result.error || 'Password could not be updated.');
    }
  };

  return (
    <SafeAreaView style={styles.safeArea}>
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        style={styles.keyboardAvoid}
      >
        <ScrollView
          contentContainerStyle={styles.scrollContent}
          keyboardShouldPersistTaps="handled"
        >
          <View style={styles.header}>
            <View style={styles.logoBadge}>
              <Text style={styles.logoText} accessibilityElementsHidden importantForAccessibility="no">
                🔐
              </Text>
            </View>
            <Text style={styles.title} accessibilityRole="header">
              Choose a New Password
            </Text>
            <Text style={styles.subtitle}>
              Your reset link was verified. Set a new password for {APP_NAME}.
            </Text>
          </View>

          <DisclaimerBanner style={styles.disclaimer} />

          <View style={styles.formCard}>
            {error ? (
              <Text
                style={styles.errorBanner}
                accessibilityLiveRegion="assertive"
                accessibilityRole="alert"
              >
                {error}
              </Text>
            ) : null}

            <Input
              label="New Password (min 6 chars)"
              placeholder="••••••••"
              isPassword
              value={password}
              onChangeText={setPassword}
              textContentType="newPassword"
            />
            <Input
              label="Confirm New Password"
              placeholder="••••••••"
              isPassword
              value={confirmPassword}
              onChangeText={setConfirmPassword}
              textContentType="newPassword"
            />

            <Button
              title="Save New Password"
              size="lg"
              loading={isLoading}
              onPress={handleSubmit}
              style={styles.actionButton}
            />

            <Button
              title="Use a Different Account"
              variant="ghost"
              size="md"
              onPress={logout}
              disabled={isLoading}
              style={styles.secondaryButton}
            />
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: Colors.background,
  },
  keyboardAvoid: {
    flex: 1,
  },
  scrollContent: {
    flexGrow: 1,
    paddingHorizontal: Layout.spacing.lg,
    paddingVertical: Layout.spacing.xl,
    justifyContent: 'center',
  },
  header: {
    alignItems: 'center',
    marginBottom: Layout.spacing.lg,
  },
  logoBadge: {
    width: 64,
    height: 64,
    borderRadius: 32,
    backgroundColor: Colors.accent,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: Layout.spacing.sm,
  },
  logoText: {
    fontSize: 30,
  },
  title: {
    fontSize: Layout.fontSize.heading,
    fontWeight: Layout.fontWeight.bold,
    color: Colors.primaryDark,
    textAlign: 'center',
  },
  subtitle: {
    fontSize: Layout.fontSize.bodySm,
    color: Colors.textSecondary,
    marginTop: Layout.spacing.xs,
    textAlign: 'center',
  },
  disclaimer: {
    marginBottom: Layout.spacing.lg,
  },
  formCard: {
    backgroundColor: Colors.surface,
    borderRadius: Layout.borderRadius.xl,
    padding: Layout.spacing.xl,
    borderWidth: 1,
    borderColor: Colors.border,
    ...Layout.shadow.card,
  },
  errorBanner: {
    backgroundColor: Colors.errorLight,
    color: Colors.error,
    padding: Layout.spacing.sm,
    borderRadius: Layout.borderRadius.sm,
    fontSize: Layout.fontSize.bodySm,
    marginBottom: Layout.spacing.md,
  },
  actionButton: {
    marginTop: Layout.spacing.md,
  },
  secondaryButton: {
    marginTop: Layout.spacing.sm,
  },
});
