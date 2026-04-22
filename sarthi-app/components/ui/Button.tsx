import React from 'react';
import { TouchableOpacity, Text, ActivityIndicator, StyleSheet, ViewStyle } from 'react-native';
import { lightColors } from '@/constants/colors';
import { type } from '@/constants/typography';

type Variant = 'primary' | 'secondary' | 'ghost' | 'destructive';

interface ButtonProps {
  label: string;
  onPress: () => void;
  variant?: Variant;
  loading?: boolean;
  disabled?: boolean;
  testID?: string;
}

export function Button({ label, onPress, variant = 'primary', loading, disabled, testID }: ButtonProps) {
  const isDisabled = disabled || loading;

  const handlePress = () => {
    if (!isDisabled) {
      onPress();
    }
  };

  return (
    <TouchableOpacity
      testID={testID}
      onPress={handlePress}
      disabled={isDisabled}
      style={[styles.base, styles[variant], isDisabled && styles.disabled]}
      activeOpacity={0.8}
    >
      {loading ? (
        <ActivityIndicator color={variant === 'primary' ? '#fff' : lightColors.primary500} size="small" />
      ) : null}
      <Text style={[styles.label, styles[`${variant}Label`]]}>
        {loading ? `${label}...` : label}
      </Text>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  base: {
    height: 48,
    borderRadius: 12,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    paddingHorizontal: 20,
  },
  disabled: { opacity: 0.7 },

  primary:     { backgroundColor: lightColors.primary500, shadowColor: lightColors.primary500, shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.3, shadowRadius: 8, elevation: 4 },
  secondary:   { backgroundColor: lightColors.primary50, borderWidth: 1.5, borderColor: lightColors.primary200 },
  ghost:       { backgroundColor: 'transparent', borderWidth: 1.5, borderColor: lightColors.border },
  destructive: { backgroundColor: lightColors.dangerBg, borderWidth: 1.5, borderColor: '#FFCDD2' },

  label:            { ...type.body, fontFamily: 'Inter_700Bold' },
  primaryLabel:     { color: '#fff' },
  secondaryLabel:   { color: lightColors.primary500 },
  ghostLabel:       { color: lightColors.textPrimary },
  destructiveLabel: { color: lightColors.danger },
});
