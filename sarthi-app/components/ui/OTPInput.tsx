import React, { useRef } from 'react';
import { View, Text, TextInput, Pressable, StyleSheet } from 'react-native';
import { lightColors } from '@/constants/colors';
import { type } from '@/constants/typography';

const OTP_LENGTH = 6;

interface OTPInputProps {
  value: string;
  onChange: (value: string) => void;
  hasError?: boolean;
  testID?: string;
}

export function OTPInput({ value, onChange, hasError, testID }: OTPInputProps) {
  const inputRef = useRef<TextInput>(null);

  const digits = value.split('');

  return (
    <Pressable onPress={() => inputRef.current?.focus()}>
      <View style={styles.row}>
        {Array.from({ length: OTP_LENGTH }).map((_, i) => {
          const filled = i < digits.length;
          const active = i === digits.length;
          return (
            <View
              key={i}
              testID={`${testID}-box-${i}`}
              style={[
                styles.box,
                (filled || active) && !hasError && styles.boxActive,
                hasError && styles.boxError,
              ]}
            >
              {filled ? (
                <Text style={styles.digit}>{digits[i]}</Text>
              ) : active ? (
                <View style={styles.cursor} />
              ) : null}
            </View>
          );
        })}
      </View>
      <TextInput
        ref={inputRef}
        testID={`${testID}-hidden-input`}
        value={value}
        onChangeText={text => onChange(text.replace(/\D/g, '').slice(0, OTP_LENGTH))}
        keyboardType="number-pad"
        maxLength={OTP_LENGTH}
        style={styles.hiddenInput}
        caretHidden
      />
    </Pressable>
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: 'row', gap: 10, justifyContent: 'center' },
  box: {
    width: 46, height: 54,
    borderRadius: 12, borderWidth: 1.5,
    borderColor: lightColors.border,
    backgroundColor: lightColors.bgCard,
    alignItems: 'center', justifyContent: 'center',
  },
  boxActive: {
    borderColor: lightColors.primary500,
    shadowColor: lightColors.primary500,
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.1,
    shadowRadius: 3,
  },
  boxError: { borderColor: lightColors.danger },
  digit: { ...type.screenTitle, color: lightColors.textPrimary },
  cursor: { width: 2, height: 26, borderRadius: 2, backgroundColor: lightColors.primary500 },
  hiddenInput: { position: 'absolute', opacity: 0, width: 1, height: 1 },
});
