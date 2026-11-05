import React, { useCallback, useEffect, useState } from 'react';
import { Linking, View, Text, StyleSheet, ActivityIndicator } from 'react-native';
import { StatusBar } from 'expo-status-bar';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { NavigationContainer } from '@react-navigation/native';
import { initDatabase } from './src/db/sqlite';
import { useAuthStore } from './src/store/useAuthStore';
import { useSettingsStore } from './src/store/useSettingsStore';
import { RootNavigator } from './src/navigation/RootNavigator';
import { AppErrorBoundary } from './src/components/common/AppErrorBoundary';
import { useAuthAutoRefresh } from './src/hooks/useAuthAutoRefresh';
import { Button } from './src/components/common/Button';
import { Colors } from './src/constants/colors';
import { Layout } from './src/constants/layout';

export default function App() {
  useAuthAutoRefresh();
  const initializeAuth = useAuthStore((state) => state.initializeAuth);
  const loadEmergencyNumber = useSettingsStore((state) => state.loadEmergencyNumber);
  const [bootstrapError, setBootstrapError] = useState<string | null>(null);
  const [isBootstrapping, setIsBootstrapping] = useState(true);

  const runSetup = useCallback(async () => {
    setIsBootstrapping(true);
    setBootstrapError(null);
    try {
      await initDatabase();
      await loadEmergencyNumber();
      await initializeAuth();
    } catch (error) {
      setBootstrapError(
        error instanceof Error
          ? error.message
          : 'The local database could not be initialized.'
      );
    } finally {
      setIsBootstrapping(false);
    }
  }, [initializeAuth, loadEmergencyNumber]);

  useEffect(() => {
    runSetup();
  }, [runSetup]);

  useEffect(() => {
    if (isBootstrapping) return;
    let active = true;

    const handleUrl = async (url: string | null | undefined) => {
      if (!url || !active) return;
      await useAuthStore.getState().handleAuthDeepLink(url);
    };

    Linking.getInitialURL()
      .then(handleUrl)
      .catch(() => undefined);
    const subscription = Linking.addEventListener('url', (event) => {
      handleUrl(event.url);
    });

    return () => {
      active = false;
      subscription.remove();
    };
  }, [isBootstrapping]);

  if (isBootstrapping) {
    return (
      <SafeAreaProvider>
        <View
          style={styles.centered}
          accessible
          accessibilityLabel="Opening your local routine"
          accessibilityLiveRegion="polite"
        >
          <ActivityIndicator size="large" color={Colors.primary} />
          <Text style={styles.loadingText}>Opening your local routine…</Text>
        </View>
      </SafeAreaProvider>
    );
  }

  if (bootstrapError) {
    return (
      <SafeAreaProvider>
        <View style={styles.centered}>
          <Text style={styles.errorTitle} accessibilityRole="header">
            Local storage could not be opened
          </Text>
          <Text
            style={styles.errorBody}
            accessibilityRole="alert"
            accessibilityLiveRegion="assertive"
          >
            {bootstrapError}
          </Text>
          <Button title="Try Again" size="lg" onPress={runSetup} style={styles.retryButton} />
        </View>
      </SafeAreaProvider>
    );
  }

  return (
    <AppErrorBoundary>
      <SafeAreaProvider>
        <NavigationContainer>
          <StatusBar style="dark" />
          <RootNavigator />
        </NavigationContainer>
      </SafeAreaProvider>
    </AppErrorBoundary>
  );
}

const styles = StyleSheet.create({
  centered: {
    flex: 1,
    backgroundColor: Colors.background,
    justifyContent: 'center',
    alignItems: 'center',
    padding: Layout.spacing.xl,
  },
  loadingText: {
    fontSize: Layout.fontSize.bodySm,
    color: Colors.textSecondary,
    marginTop: Layout.spacing.md,
  },
  errorTitle: {
    fontSize: Layout.fontSize.heading,
    fontWeight: Layout.fontWeight.bold,
    color: Colors.primaryDark,
    textAlign: 'center',
  },
  errorBody: {
    fontSize: Layout.fontSize.bodySm,
    color: Colors.textSecondary,
    lineHeight: Layout.lineHeight.bodySm,
    textAlign: 'center',
    marginTop: Layout.spacing.md,
  },
  retryButton: {
    marginTop: Layout.spacing.xl,
    minWidth: 180,
  },
});
