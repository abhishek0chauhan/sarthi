import React from 'react';
import { Pressable, Text, StyleSheet } from 'react-native';
import { useColors } from '@/hooks/useColorScheme';
import type { Colors } from '@/constants/colors';
import { type } from '@/constants/typography';

interface ChipProps {
  label: string;
  selected?: boolean;
  onPress: () => void;
}

export function Chip({ label, selected, onPress }: ChipProps) {
  const colors = useColors();
  const styles = makeStyles(colors);

  return (
    <Pressable
      onPress={onPress}
      style={[styles.chip, selected && styles.chipSelected]}
    >
      <Text style={[styles.label, selected && styles.labelSelected]}>{label}</Text>
    </Pressable>
  );
}

function makeStyles(colors: Colors) {
  return StyleSheet.create({
    chip: {
      borderRadius: 20, paddingHorizontal: 14, paddingVertical: 7,
      backgroundColor: colors.bgCard,
      borderWidth: 1.5, borderColor: colors.border,
    },
    chipSelected: {
      backgroundColor: colors.primary500, borderColor: colors.primary500,
      shadowColor: colors.primary500,
      shadowOffset: { width: 0, height: 3 }, shadowOpacity: 0.25, shadowRadius: 6,
    },
    label:         { ...type.caption, fontFamily: 'Inter_500Medium', color: colors.textSecondary },
    labelSelected: { color: '#fff', fontFamily: 'Inter_700Bold' },
  });
}
