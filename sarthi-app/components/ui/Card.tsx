import React from 'react';
import { View, StyleSheet, ViewProps } from 'react-native';
import { useColors } from '@/hooks/useColorScheme';
import type { Colors } from '@/constants/colors';

export function Card({ children, style, ...rest }: ViewProps) {
  const colors = useColors();
  const styles = makeStyles(colors);

  return (
    <View style={[styles.card, style]} {...rest}>
      {children}
    </View>
  );
}

function makeStyles(colors: Colors) {
  return StyleSheet.create({
    card: {
      backgroundColor: colors.bgCard,
      borderRadius: 16,
      shadowColor: '#000',
      shadowOffset: { width: 0, height: 4 },
      shadowOpacity: 0.08,
      shadowRadius: 10,
      elevation: 4,
      overflow: 'hidden',
    },
  });
}
