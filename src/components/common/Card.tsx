import React from 'react';
import { View, StyleSheet, ViewStyle, StyleProp, TouchableOpacity } from 'react-native';
import { Colors } from '../../constants/colors';
import { Layout } from '../../constants/layout';

export interface CardProps {
  children: React.ReactNode;
  style?: StyleProp<ViewStyle>;
  onPress?: () => void;
  variant?: 'elevated' | 'flat' | 'subtle';
  accessible?: boolean;
  accessibilityLabel?: string;
}

export const Card: React.FC<CardProps> = ({
  children,
  style,
  onPress,
  variant = 'flat',
  accessible,
  accessibilityLabel,
}) => {
  const getVariantStyle = (): ViewStyle => {
    switch (variant) {
      case 'elevated':
        return {
          backgroundColor: Colors.surface,
          ...Layout.shadow.card,
        };
      case 'subtle':
        return {
          backgroundColor: Colors.surfaceSubtle,
          borderWidth: 1,
          borderColor: Colors.borderLight,
        };
      case 'flat':
      default:
        return {
          backgroundColor: Colors.surface,
          borderWidth: 1,
          borderColor: Colors.border,
        };
    }
  };

  if (onPress) {
    return (
      <TouchableOpacity
        activeOpacity={0.7}
        onPress={onPress}
        style={[styles.base, getVariantStyle(), style]}
        accessibilityRole="button"
        accessible={accessible}
        accessibilityLabel={accessibilityLabel}
      >
        {children}
      </TouchableOpacity>
    );
  }

  return (
    <View
      style={[styles.base, getVariantStyle(), style]}
      accessible={accessible}
      accessibilityLabel={accessibilityLabel}
    >
      {children}
    </View>
  );
};

const styles = StyleSheet.create({
  base: {
    borderRadius: Layout.borderRadius.lg,
    padding: Layout.spacing.base,
    marginVertical: Layout.spacing.xs,
  },
});
