import React, { useState } from 'react';
import { View, TextInput, Text, StyleSheet, TextInputProps } from 'react-native';
import { lightColors } from '@/constants/colors';
import { type } from '@/constants/typography';

interface InputProps extends TextInputProps {
  label: string;
  error?: string;
  testID?: string;
}

export function Input({ label, error, style, testID, ...rest }: InputProps) {
  const [focused, setFocused] = useState(false);

  return (
    <View style={styles.wrapper}>
      <Text style={[styles.label, focused && styles.labelFocused, error && styles.labelError]}>
        {label}
      </Text>
      <TextInput
        testID={testID}
        style={[
          styles.input,
          focused && styles.inputFocused,
          error && styles.inputError,
          style,
        ]}
        onFocus={() => setFocused(true)}
        onBlur={() => setFocused(false)}
        placeholderTextColor={lightColors.textTertiary}
        {...rest}
      />
      {error ? <Text style={styles.errorText}>{error}</Text> : null}
    </View>
  );
}

const styles = StyleSheet.create({
  wrapper: { marginBottom: 16 },
  label: { ...type.overline, color: lightColors.textSecondary, marginBottom: 6 },
  labelFocused: { color: lightColors.primary500 },
  labelError:   { color: lightColors.danger },
  input: {
    backgroundColor: lightColors.bgCard,
    borderRadius: 12,
    borderWidth: 1.5,
    borderColor: lightColors.border,
    paddingHorizontal: 14,
    paddingVertical: 13,
    ...type.body,
    color: lightColors.textPrimary,
  },
  inputFocused: {
    borderColor: lightColors.borderFocus,
    shadowColor: lightColors.primary500,
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.1,
    shadowRadius: 3,
  },
  inputError: { borderColor: lightColors.danger },
  errorText: { ...type.caption, color: lightColors.danger, marginTop: 4 },
});
