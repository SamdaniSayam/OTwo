import React, { useState } from 'react';
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
import { APP_NAME } from '../../constants/app';

export const SignupScreen = ({ navigation }: any) => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [errorMsg, setErrorMsg] = useState('');
  const { signup, isLoading } = useAuthStore();

  const handleSignup = async () => {
    if (!email.trim() || !password.trim()) {
      setErrorMsg('Please complete all fields.');
      return;
    }
    if (password.length < 6) {
      setErrorMsg('Password should be at least 6 characters.');
      return;
    }
    if (password !== confirmPassword) {
      setErrorMsg('Passwords do not match.');
      return;
    }
    setErrorMsg('');
    const res = await signup(email.trim(), password);
    if (!res.success && res.error) {
      setErrorMsg(res.error);
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
          showsVerticalScrollIndicator={false}
        >
          <View style={styles.header}>
            <View style={styles.logoBadge}>
              <Text style={styles.logoText}>🌱</Text>
            </View>
            <Text style={styles.title}>Join {APP_NAME}</Text>
            <Text style={styles.subtitle}>Begin your calm daily routine support</Text>
          </View>

          <DisclaimerBanner style={styles.disclaimer} />

          <View style={styles.formCard}>
            <Text style={styles.cardTitle}>Create Account</Text>
            <Text style={styles.cardSubtitle}>Your health data remains private and local</Text>

            {errorMsg ? <Text style={styles.errorBanner}>{errorMsg}</Text> : null}

            <Input
              label="Email Address"
              placeholder="you@example.com"
              keyboardType="email-address"
              autoCapitalize="none"
              value={email}
              onChangeText={setEmail}
            />

            <Input
              label="Password (min 6 chars)"
              placeholder="••••••••"
              isPassword
              value={password}
              onChangeText={setPassword}
            />

            <Input
              label="Confirm Password"
              placeholder="••••••••"
              isPassword
              value={confirmPassword}
              onChangeText={setConfirmPassword}
            />

            <Button
              title="Create Account & Continue"
              onPress={handleSignup}
              loading={isLoading}
              size="lg"
              style={styles.actionButton}
            />

            <View style={styles.footerRow}>
              <Text style={styles.footerText}>Already have an account? </Text>
              <TouchableOpacity
                onPress={() => navigation.navigate('Login')}
                accessibilityRole="button"
              >
                <Text style={styles.loginLink}>Sign In</Text>
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
    backgroundColor: Colors.secondaryLight,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: Layout.spacing.sm,
  },
  logoText: {
    fontSize: 32,
  },
  title: {
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
  actionButton: {
    marginTop: Layout.spacing.md,
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
  loginLink: {
    fontSize: Layout.fontSize.bodySm,
    fontWeight: Layout.fontWeight.bold,
    color: Colors.primary,
  },
});
