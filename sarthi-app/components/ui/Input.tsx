import React, { useState } from 'react';
import { View, TextInput, Text, StyleSheet, TextInputProps } from 'react-native';
import { useColors } from '@/hooks/useColorScheme';
import type { Colors } from '@/constants/colors';
import { type } from '@/constants/typography';

interface InputProps extends TextInputProps {
  label?: string;
  error?: string;
  testID?: string;
}

export function Input({ label, error, style, testID, ...rest }: InputProps) {
  const colors = useColors();
  const styles = makeStyles(colors);

  const [focused, setFocused] = useState(false);

  return (
    <View style={styles.wrapper}>
      {label ? (
        <Text style={[styles.label, focused && styles.labelFocused, error && styles.labelError]}>
          {label}
        </Text>
      ) : null}
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
        placeholderTextColor={colors.textTertiary}
        {...rest}
      />
      {error ? <Text style={styles.errorText}>{error}</Text> : null}
    </View>
  );
}

function makeStyles(colors: Colors) {
  return StyleSheet.create({
    wrapper: { marginBottom: 16 },
    label: { ...type.overline, color: colors.textSecondary, marginBottom: 6 },
    labelFocused: { color: colors.primary500 },
    labelError:   { color: colors.danger },
    input: {
      backgroundColor: colors.bgCard,
      borderRadius: 12,
      borderWidth: 1.5,
      borderColor: colors.border,
      paddingHorizontal: 14,
      paddingVertical: 13,
      ...type.body,
      color: colors.textPrimary,
    },
    inputFocused: {
      borderColor: colors.borderFocus,
      shadowColor: colors.primary500,
      shadowOffset: { width: 0, height: 0 },
      shadowOpacity: 0.1,
      shadowRadius: 3,
    },
    inputError: { borderColor: colors.danger },
    errorText: { ...type.caption, color: colors.danger, marginTop: 4 },
  });
}
