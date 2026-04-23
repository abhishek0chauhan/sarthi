import React from 'react';
import { View, Text, TextInput, Pressable, StyleSheet } from 'react-native';
import { lightColors } from '@/constants/colors';
import { type } from '@/constants/typography';

interface PhoneInputProps {
  value: string;
  onChangeText: (text: string) => void;
  dialCode?: string;
  flag?: string;
}

export function PhoneInput({ value, onChangeText, dialCode = '+91', flag = '🇮🇳' }: PhoneInputProps) {
  return (
    <View style={styles.container}>
      <Pressable style={styles.dialCode}>
        <Text style={styles.flag}>{flag}</Text>
        <Text style={styles.code}>{dialCode}</Text>
        <Text style={styles.chevron}>▾</Text>
      </Pressable>
      <View style={styles.divider} />
      <TextInput
        value={value}
        onChangeText={text => onChangeText(text.replace(/\D/g, '').slice(0, 10))}
        placeholder="98765 XXXXX"
        placeholderTextColor={lightColors.textTertiary}
        keyboardType="phone-pad"
        style={styles.input}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row', alignItems: 'center',
    backgroundColor: lightColors.bgCard,
    borderRadius: 12, borderWidth: 1.5, borderColor: lightColors.border,
    paddingHorizontal: 14, height: 50,
  },
  dialCode: { flexDirection: 'row', alignItems: 'center', gap: 6, paddingRight: 12 },
  flag: { fontSize: 18 },
  code: { ...type.body, fontFamily: 'Inter_600SemiBold', color: lightColors.textPrimary },
  chevron: { ...type.caption, color: lightColors.textTertiary },
  divider: { width: 1, height: 20, backgroundColor: lightColors.border, marginRight: 12 },
  input: { flex: 1, ...type.body, color: lightColors.textPrimary },
});
