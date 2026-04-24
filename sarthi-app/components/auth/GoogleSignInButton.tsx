import React from 'react';
import { Pressable, Text, StyleSheet } from 'react-native';
import { useColors } from '@/hooks/useColorScheme';
import type { Colors } from '@/constants/colors';
import { type } from '@/constants/typography';

interface GoogleSignInButtonProps {
  onPress: () => void;
  loading?: boolean;
}

export function GoogleSignInButton({ onPress, loading }: GoogleSignInButtonProps) {
  const colors = useColors();
  const styles = makeStyles(colors);

  return (
    <Pressable
      onPress={loading ? undefined : onPress}
      style={[styles.btn, loading && styles.disabled]}
    >
      <Text style={styles.label}>Continue with Google</Text>
    </Pressable>
  );
}

function makeStyles(colors: Colors) {
  return StyleSheet.create({
    btn: {
      height: 48, borderRadius: 12, borderWidth: 1.5,
      borderColor: colors.border, backgroundColor: colors.bgCard,
      alignItems: 'center', justifyContent: 'center', marginBottom: 10,
    },
    disabled: { opacity: 0.7 },
    label: { ...type.body, fontFamily: 'Inter_600SemiBold', color: colors.textPrimary },
  });
}
