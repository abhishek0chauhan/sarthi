import React from 'react';
import { View, Text, StyleSheet, ViewStyle } from 'react-native';
import { lightColors } from '@/constants/colors';
import { type } from '@/constants/typography';

type BadgeVariant = 'match' | 'gem' | 'success' | 'missing' | 'warning' | 'dietary';

interface BadgeProps {
  label: string;
  variant?: BadgeVariant;
  style?: ViewStyle;
}

const variantStyles: Record<BadgeVariant, { bg: string; text: string }> = {
  match:    { bg: lightColors.primary50,  text: lightColors.primary500 },
  gem:      { bg: lightColors.primary500, text: '#fff' },
  success:  { bg: lightColors.successBg,  text: lightColors.success },
  missing:  { bg: lightColors.bgSurface,  text: lightColors.textTertiary },
  warning:  { bg: lightColors.warningBg,  text: lightColors.warning },
  dietary:  { bg: '#FFF3E0',              text: '#E65100' },
};

export function Badge({ label, variant = 'match', style }: BadgeProps) {
  const v = variantStyles[variant];
  return (
    <View style={[styles.badge, { backgroundColor: v.bg }, style]}>
      <Text style={[styles.label, { color: v.text }]}>{label}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  badge: { borderRadius: 20, paddingHorizontal: 10, paddingVertical: 4, alignSelf: 'flex-start' },
  label: { ...type.caption, fontFamily: 'Inter_700Bold' },
});
