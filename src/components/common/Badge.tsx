import React from 'react';
import { View, Text, StyleSheet, ViewStyle, TextStyle } from 'react-native';
import { Colors } from '../../constants/colors';
import { Layout } from '../../constants/layout';

export interface BadgeProps {
  label: string;
  variant?: 'mint' | 'forest' | 'sage' | 'warning' | 'recovery';
  style?: ViewStyle;
}

export const Badge: React.FC<BadgeProps> = ({ label, variant = 'mint', style }) => {
  const getBadgeStyle = (): { container: ViewStyle; text: TextStyle } => {
    switch (variant) {
      case 'forest':
        return {
          container: { backgroundColor: Colors.primary },
          text: { color: Colors.textInverse },
        };
      case 'sage':
        return {
          container: { backgroundColor: Colors.secondaryLight },
          text: { color: Colors.primaryDark },
        };
      case 'warning':
        return {
          container: { backgroundColor: Colors.warningLight },
          text: { color: Colors.warning },
        };
      case 'recovery':
        return {
          container: { backgroundColor: Colors.recoveryBadge },
          text: { color: Colors.recoveryBadgeText },
        };
      case 'mint':
      default:
        return {
          container: { backgroundColor: Colors.accent },
          text: { color: Colors.primaryDark },
        };
    }
  };

  const badgeStyle = getBadgeStyle();

  return (
    <View style={[styles.badge, badgeStyle.container, style]}>
      <Text style={[styles.label, badgeStyle.text]}>{label}</Text>
    </View>
  );
};

const styles = StyleSheet.create({
  badge: {
    paddingHorizontal: Layout.spacing.sm + 2,
    paddingVertical: Layout.spacing.xs,
    borderRadius: Layout.borderRadius.full,
    alignSelf: 'flex-start',
    justifyContent: 'center',
    alignItems: 'center',
  },
  label: {
    fontSize: Layout.fontSize.caption,
    fontWeight: Layout.fontWeight.semiBold,
  },
});
