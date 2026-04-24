import React from 'react';
import { View, Text, StyleSheet, ViewStyle } from 'react-native';
import { useColors } from '@/hooks/useColorScheme';
import type { Colors } from '@/constants/colors';
import { type } from '@/constants/typography';

type BadgeVariant = 'match' | 'gem' | 'success' | 'missing' | 'warning' | 'dietary';

interface BadgeProps {
  label: string;
  variant?: BadgeVariant;
  style?: ViewStyle;
}

export function Badge({ label, variant = 'match', style }: BadgeProps) {
  const colors = useColors();
  const styles = makeStyles(colors);

  const variantStyles: Record<BadgeVariant, { bg: string; text: string }> = {
    match:    { bg: colors.primary50,  text: colors.primary500 },
    gem:      { bg: colors.primary500, text: '#fff' },
    success:  { bg: colors.successBg,  text: colors.success },
    missing:  { bg: colors.bgSurface,  text: colors.textTertiary },
    warning:  { bg: colors.warningBg,  text: colors.warning },
    dietary:  { bg: '#FFF3E0',         text: '#E65100' },
  };

  const v = variantStyles[variant];
  return (
    <View style={[styles.badge, { backgroundColor: v.bg }, style]}>
      <Text style={[styles.label, { color: v.text }]}>{label}</Text>
    </View>
  );
}

function makeStyles(colors: Colors) {
  return StyleSheet.create({
    badge: { borderRadius: 20, paddingHorizontal: 10, paddingVertical: 4, alignSelf: 'flex-start' },
    label: { ...type.caption, fontFamily: 'Inter_700Bold' },
  });
}
