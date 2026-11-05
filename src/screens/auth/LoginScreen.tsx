import React, { useEffect, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  SafeAreaView,
  ScrollView,
  KeyboardAvoidingView,
  Platform,
  TouchableOpacity,
} from 'react-native';
import { Colors } from '../../constants/colors';
import { Layout } from '../../constants/layout';
import { Button } from '../../components/common/Button';
import { Input } from '../../components/common/Input';
import { DisclaimerBanner } from '../../components/common/DisclaimerBanner';
import { useAuthStore } from '../../store/useAuthStore';
import { isSupabaseConfigured } from '../../db/supabase';
import { APP_NAME, APP_SUBTITLE } from '../../constants/app';

export const LoginScreen = ({ navigation }: any) => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [errorMsg, setErrorMsg] = useState('');
  const [noticeMsg, setNoticeMsg] = useState('');
  const [isResetting, setIsResetting] = useState(false);
  const {
    login,
    requestPasswordReset,
    continueAsGuest,
    isLoading,
    deletionNotice,
    clearDeletionNotice,
  } = useAuthStore();

  useEffect(() => {
    if (!deletionNotice) return;
    const timer = setTimeout(() => clearDeletionNotice(), 8000);
    return () => clearTimeout(timer);
  }, [deletionNotice, clearDeletionNotice]);

  const handleLogin = async () => {
    if (!email.trim() || !password.trim()) {
      setErrorMsg('Please enter both email and password.');
      return;
    }
    setErrorMsg('');
    setNoticeMsg('');
    const res = await login(email.trim(), password);
    if (!res.success && res.error) {
      setErrorMsg(res.error);
    }
  };

  const handlePasswordReset = async () => {
    setErrorMsg('');
    setNoticeMsg('');
    if (!email.trim()) {
      setErrorMsg('Enter your email address above, then request a reset link.');
      return;
    }
    setIsResetting(true);
    const res = await requestPasswordReset(email.trim());
    setIsResetting(false);
    if (!res.success) {
      setErrorMsg(res.error || 'Password reset could not be started.');
      return;
    }
    setNoticeMsg(
      res.message ||
        'If an account exists for that address, a password reset link has been sent.'
    );
  };

  return (
    <SafeAreaView style={styles.safeArea}>
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        style={styles.keyboardAvoid}
      >
        <ScrollView
          contentContainerStyle={styles.scrollContent}
          showsVerticalScrollIndicator={false}
        >
          <View style={styles.header}>
            <View style={styles.logoBadge}>
              <Text style={styles.logoText} accessibilityElementsHidden importantForAccessibility="no">
                🌿
              </Text>
            </View>
            <Text style={styles.appName} accessibilityRole="header">
              {APP_NAME}
            </Text>
            <Text style={styles.subtitle}>{APP_SUBTITLE}</Text>
          </View>

          <DisclaimerBanner style={styles.disclaimer} />

          <View style={styles.formCard}>
            <Text style={styles.cardTitle} accessibilityRole="header">
              Welcome Back
            </Text>
            <Text style={styles.cardSubtitle}>Sign in to access your daily routines</Text>

            {deletionNotice ? (
              <Text
                style={styles.successBanner}
                accessibilityLiveRegion="polite"
                accessibilityRole="alert"
              >
                Your account and all local data have been deleted.
              </Text>
            ) : null}

            {!isSupabaseConfigured ? (
              <Text style={styles.infoBanner}>
                Cloud sign-in is not configured in this build. Guest mode stores everything on this
                device only.
              </Text>
            ) : null}

            {errorMsg ? (
              <Text
                style={styles.errorBanner}
                accessibilityLiveRegion="assertive"
                accessibilityRole="alert"
              >
                {errorMsg}
              </Text>
            ) : null}
            {noticeMsg ? (
              <Text
                style={styles.successBanner}
                accessibilityLiveRegion="polite"
                accessibilityRole="alert"
              >
                {noticeMsg}
              </Text>
            ) : null}

            <Input
              label="Email Address"
              placeholder="you@example.com"
              keyboardType="email-address"
              autoCapitalize="none"
              autoComplete="email"
              textContentType="emailAddress"
              value={email}
              onChangeText={setEmail}
            />

            <Input
              label="Password"
              placeholder="••••••••"
              isPassword
              autoComplete="current-password"
              textContentType="password"
              value={password}
              onChangeText={setPassword}
            />

            {isSupabaseConfigured ? (
              <TouchableOpacity
                onPress={handlePasswordReset}
                disabled={isResetting || isLoading}
                accessibilityRole="button"
                accessibilityLabel="Send a password reset link"
                style={styles.forgotButton}
              >
                <Text style={styles.forgotText}>
                  {isResetting ? 'Sending reset link…' : 'Forgot password?'}
                </Text>
              </TouchableOpacity>
            ) : null}

            <Button
              title="Sign In"
              onPress={handleLogin}
              loading={isLoading}
              size="lg"
              style={styles.actionButton}
            />

            <View style={styles.dividerRow}>
              <View style={styles.dividerLine} />
              <Text style={styles.dividerText}>or</Text>
              <View style={styles.dividerLine} />
            </View>

            <Button
              title="Continue as Guest (Local-only)"
              variant="outline"
              size="md"
              onPress={continueAsGuest}
              style={styles.guestButton}
            />

            <View style={styles.footerRow}>
              <Text style={styles.footerText}>{"Don't have an account? "}</Text>
              <TouchableOpacity
                onPress={() => navigation.navigate('Signup')}
                accessibilityRole="button"
              >
                <Text style={styles.signupLink}>Sign Up</Text>
              </TouchableOpacity>
            </View>
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
    fontSize: 32,
  },
  appName: {
    fontSize: Layout.fontSize.display,
    fontWeight: Layout.fontWeight.bold,
    color: Colors.primaryDark,
    letterSpacing: -0.5,
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
  cardTitle: {
    fontSize: Layout.fontSize.heading,
    fontWeight: Layout.fontWeight.bold,
    color: Colors.textPrimary,
  },
  cardSubtitle: {
    fontSize: Layout.fontSize.bodySm,
    color: Colors.textSecondary,
    marginBottom: Layout.spacing.lg,
  },
  errorBanner: {
    backgroundColor: Colors.errorLight,
    color: Colors.error,
    padding: Layout.spacing.sm,
    borderRadius: Layout.borderRadius.sm,
    fontSize: Layout.fontSize.bodySm,
    marginBottom: Layout.spacing.md,
  },
  successBanner: {
    backgroundColor: Colors.successLight,
    color: Colors.primaryDark,
    padding: Layout.spacing.sm,
    borderRadius: Layout.borderRadius.sm,
    fontSize: Layout.fontSize.bodySm,
    fontWeight: Layout.fontWeight.semiBold,
    marginBottom: Layout.spacing.md,
  },
  infoBanner: {
    backgroundColor: Colors.surfaceSubtle,
    color: Colors.textSecondary,
    padding: Layout.spacing.sm,
    borderRadius: Layout.borderRadius.sm,
    fontSize: Layout.fontSize.caption,
    lineHeight: Layout.lineHeight.caption,
    marginBottom: Layout.spacing.md,
  },
  actionButton: {
    marginTop: Layout.spacing.md,
  },
  forgotButton: {
    alignSelf: 'flex-end',
    minHeight: Layout.touchTarget.minHeight,
    justifyContent: 'center',
    paddingHorizontal: Layout.spacing.xs,
  },
  forgotText: {
    fontSize: Layout.fontSize.bodySm,
    fontWeight: Layout.fontWeight.medium,
    color: Colors.primary,
  },
  dividerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginVertical: Layout.spacing.lg,
  },
  dividerLine: {
    flex: 1,
    height: 1,
    backgroundColor: Colors.border,
  },
  dividerText: {
    paddingHorizontal: Layout.spacing.md,
    fontSize: Layout.fontSize.caption,
    color: Colors.textMuted,
    textTransform: 'uppercase',
  },
  guestButton: {
    width: '100%',
  },
  footerRow: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: Layout.spacing.xl,
  },
  footerText: {
    fontSize: Layout.fontSize.bodySm,
    color: Colors.textSecondary,
  },
  signupLink: {
    fontSize: Layout.fontSize.bodySm,
    fontWeight: Layout.fontWeight.bold,
    color: Colors.primary,
  },
});
