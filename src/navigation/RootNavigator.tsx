import React from 'react';
import { View, ActivityIndicator, StyleSheet } from 'react-native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { Colors } from '../constants/colors';
import { useAuthStore } from '../store/useAuthStore';
import { AuthNavigator } from './AuthNavigator';
import { OnboardingScreen } from '../screens/auth/OnboardingScreen';
import { RestoreScreen } from '../screens/auth/RestoreScreen';
import { ResetPasswordScreen } from '../screens/auth/ResetPasswordScreen';
import { TabNavigator } from './TabNavigator';

const Stack = createNativeStackNavigator();

export const RootNavigator = () => {
  const { user, isLoading, needsRestore, passwordRecovery } = useAuthStore();

  if (isLoading) {
    return (
      <View
        style={styles.loadingContainer}
        accessible
        accessibilityLabel="Opening OTwo"
        accessibilityLiveRegion="polite"
      >
        <ActivityIndicator size="large" color={Colors.primary} />
      </View>
    );
  }

  return (
    <Stack.Navigator screenOptions={{ headerShown: false, animation: 'fade' }}>
      {passwordRecovery ? (
        <Stack.Screen name="ResetPassword" component={ResetPasswordScreen} />
      ) : !user ? (
        <Stack.Screen name="Auth" component={AuthNavigator} />
      ) : needsRestore ? (
        <Stack.Screen name="Restore" component={RestoreScreen} />
      ) : !user.isOnboarded ? (
        <Stack.Screen name="Onboarding" component={OnboardingScreen} />
      ) : (
        <Stack.Screen name="MainTabs" component={TabNavigator} />
      )}
    </Stack.Navigator>
  );
};

const styles = StyleSheet.create({
  loadingContainer: {
    flex: 1,
    backgroundColor: Colors.background,
    justifyContent: 'center',
    alignItems: 'center',
  },
});
