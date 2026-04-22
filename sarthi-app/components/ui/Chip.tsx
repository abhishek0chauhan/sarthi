import React from 'react';
import { Pressable, Text, StyleSheet } from 'react-native';
import { lightColors } from '@/constants/colors';
import { type } from '@/constants/typography';

interface ChipProps {
  label: string;
  selected?: boolean;
  onPress: () => void;
}

export function Chip({ label, selected, onPress }: ChipProps) {
  return (
    <Pressable
      onPress={onPress}
      style={[styles.chip, selected && styles.chipSelected]}
    >
      <Text style={[styles.label, selected && styles.labelSelected]}>{label}</Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  chip: {
    borderRadius: 20, paddingHorizontal: 14, paddingVertical: 7,
    backgroundColor: lightColors.bgCard,
    borderWidth: 1.5, borderColor: lightColors.border,
  },
  chipSelected: {
    backgroundColor: lightColors.primary500, borderColor: lightColors.primary500,
    shadowColor: lightColors.primary500,
    shadowOffset: { width: 0, height: 3 }, shadowOpacity: 0.25, shadowRadius: 6,
  },
  label:         { ...type.caption, fontFamily: 'Inter_500Medium', color: lightColors.textSecondary },
  labelSelected: { color: '#fff', fontFamily: 'Inter_700Bold' },
});
