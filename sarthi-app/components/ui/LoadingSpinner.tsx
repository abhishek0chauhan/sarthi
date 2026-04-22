import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { lightColors } from '@/constants/colors';
import { type } from '@/constants/typography';

interface LoadingSpinnerProps {
  message?: string;
  subtitle?: string;
}

export function LoadingSpinner({ message = 'Sarthi is thinking...', subtitle }: LoadingSpinnerProps) {
  return (
    <View style={styles.container}>
      <View style={styles.icon}>
        <Text style={styles.emoji}>🧭</Text>
      </View>
      <Text style={styles.message}>{message}</Text>
      {subtitle ? <Text style={styles.subtitle}>{subtitle}</Text> : null}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { alignItems: 'center', padding: 24 },
  icon: {
    width: 72, height: 72, borderRadius: 36,
    backgroundColor: lightColors.primary50,
    alignItems: 'center', justifyContent: 'center',
    marginBottom: 16,
  },
  emoji: { fontSize: 32 },
  message:  { ...type.sectionLabel, color: lightColors.textPrimary, marginBottom: 6, textAlign: 'center' },
  subtitle: { ...type.body, color: lightColors.textSecondary, textAlign: 'center' },
});
