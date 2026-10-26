import React, { useEffect } from 'react';
import { StatusBar } from 'expo-status-bar';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { NavigationContainer } from '@react-navigation/native';
import { initDatabase } from './src/db/sqlite';
import { useAuthStore } from './src/store/useAuthStore';
import { RootNavigator } from './src/navigation/RootNavigator';
import { Colors } from './src/constants/colors';

export default function App() {
  const { initializeAuth } = useAuthStore();

  useEffect(() => {
    async function setup() {
      await initDatabase();
      await initializeAuth();
    }
    setup();
  }, []);

  return (
    <SafeAreaProvider>
      <NavigationContainer>
        <StatusBar style="dark" />
        <RootNavigator />
      </NavigationContainer>
    </SafeAreaProvider>
  );
}
