import React from 'react';
import { View, Text, StyleSheet, ViewStyle } from 'react-native';
import { Colors } from '../../constants/colors';
import { Layout } from '../../constants/layout';
import { Disclaimers } from '../../constants/disclaimers';

export interface DisclaimerBannerProps {
  customText?: string;
  style?: ViewStyle;
}

export const DisclaimerBanner: React.FC<DisclaimerBannerProps> = ({
  customText,
  style,
}) => {
  return (
    <View style={[styles.container, style]}>
      <Text style={styles.icon}>🌿</Text>
      <Text style={styles.text}>{customText || Disclaimers.shortBanner}</Text>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.surfaceSubtle,
    borderWidth: 1,
    borderColor: Colors.borderLight,
    paddingHorizontal: Layout.spacing.md,
    paddingVertical: Layout.spacing.sm,
    borderRadius: Layout.borderRadius.md,
    marginVertical: Layout.spacing.xs,
  },
  icon: {
    fontSize: 14,
    marginRight: Layout.spacing.xs,
  },
  text: {
    flex: 1,
    fontSize: Layout.fontSize.caption,
    color: Colors.textSecondary,
    lineHeight: Layout.lineHeight.caption,
  },
});
