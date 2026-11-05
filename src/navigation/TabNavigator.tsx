import React, { useEffect } from 'react';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { Text, Platform, StyleSheet } from 'react-native';
import { Colors } from '../constants/colors';
import { Layout } from '../constants/layout';
import { useHabitStore } from '../store/useHabitStore';
import { TodayScreen } from '../screens/today/TodayScreen';
import { HabitsScreen } from '../screens/habits/HabitsScreen';
import { SymptomLogScreen } from '../screens/symptoms/SymptomLogScreen';
import { CompanionScreen } from '../screens/companion/CompanionScreen';
import { SettingsScreen } from '../screens/settings/SettingsScreen';

const Tab = createBottomTabNavigator();

export const TabNavigator = () => {
  const loadHabits = useHabitStore((state) => state.loadHabits);

  useEffect(() => {
    // Load once when the signed-in app shell mounts so notification schedules
    // follow the active account, even if the Habits tab is not opened.
    loadHabits();
  }, [loadHabits]);

  return (
    <Tab.Navigator
      screenOptions={{
        headerShown: false,
        tabBarActiveTintColor: Colors.primary,
        tabBarInactiveTintColor: Colors.textMuted,
        tabBarStyle: styles.tabBar,
        tabBarLabelStyle: styles.tabLabel,
        tabBarItemStyle: styles.tabItem,
      }}
    >
      <Tab.Screen
        name="Today"
        component={TodayScreen}
        options={{
          title: 'Today – OTwo',
          tabBarLabel: 'Today',
          tabBarAccessibilityLabel: 'Today',
          tabBarIcon: ({ color }) => <Text style={{ fontSize: 20 }}>🌿</Text>,
        }}
      />
      <Tab.Screen
        name="Habits"
        component={HabitsScreen}
        options={{
          title: 'Habits – OTwo',
          tabBarLabel: 'Habits',
          tabBarAccessibilityLabel: 'Habits and reminders',
          tabBarIcon: ({ color }) => <Text style={{ fontSize: 20 }}>🔥</Text>,
        }}
      />
      <Tab.Screen
        name="Symptoms"
        component={SymptomLogScreen}
        options={{
          title: 'Check-in – OTwo',
          tabBarLabel: 'Check-in',
          tabBarAccessibilityLabel: 'Symptom check-in',
          tabBarIcon: ({ color }) => <Text style={{ fontSize: 20 }}>📋</Text>,
        }}
      />
      <Tab.Screen
        name="Companion"
        component={CompanionScreen}
        options={{
          title: 'Mentor – OTwo',
          tabBarLabel: 'Mentor',
          tabBarAccessibilityLabel: 'Companion',
          tabBarIcon: ({ color }) => <Text style={{ fontSize: 20 }}>💬</Text>,
        }}
      />
      <Tab.Screen
        name="Settings"
        component={SettingsScreen}
        options={{
          title: 'Settings – OTwo',
          tabBarLabel: 'Settings',
          tabBarAccessibilityLabel: 'Settings and privacy',
          tabBarIcon: ({ color }) => <Text style={{ fontSize: 20 }}>⚙️</Text>,
        }}
      />
    </Tab.Navigator>
  );
};

const styles = StyleSheet.create({
  tabBar: {
    backgroundColor: Colors.surface,
    borderTopWidth: 1,
    borderTopColor: Colors.border,
    minHeight: Platform.OS === 'ios' ? 88 : 64,
    paddingBottom: Platform.OS === 'ios' ? 24 : 8,
    paddingTop: 8,
    ...Layout.shadow.subtle,
  },
  tabLabel: {
    fontSize: 12,
    fontWeight: Layout.fontWeight.medium,
  },
  tabItem: {
    minHeight: Layout.touchTarget.minHeight,
  },
});
