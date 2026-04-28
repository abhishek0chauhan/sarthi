import React, { useEffect, useRef } from 'react';
import { View, Text, StyleSheet, Animated } from 'react-native';
import { useColors } from '@/hooks/useColorScheme';
import type { Colors } from '@/constants/colors';
import { type } from '@/constants/typography';

interface LoadingSpinnerProps {
  message?: string;
  subtitle?: string;
}

export function LoadingSpinner({ message = 'SarthiGo is thinking...', subtitle }: LoadingSpinnerProps) {
  const colors = useColors();
  const styles = makeStyles(colors);
  const rotation = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    Animated.loop(
      Animated.timing(rotation, {
        toValue: 1,
        duration: 900,
        useNativeDriver: true,
      }),
    ).start();
  }, [rotation]);

  const spin = rotation.interpolate({ inputRange: [0, 1], outputRange: ['0deg', '360deg'] });

  return (
    <View style={styles.container}>
      <View style={styles.spinnerWrapper}>
        {/* Track ring */}
        <View style={styles.track} />
        {/* Spinning arc */}
        <Animated.View style={[styles.arc, { transform: [{ rotate: spin }] }]} />
        {/* Center dot */}
        <View style={styles.dot} />
      </View>

      <Text style={styles.message}>{message}</Text>
      {subtitle ? <Text style={styles.subtitle}>{subtitle}</Text> : null}
    </View>
  );
}

function makeStyles(colors: Colors) {
  const SIZE = 64;
  const STROKE = 4;

  return StyleSheet.create({
    container: {
      flex: 1,
      alignItems: 'center',
      justifyContent: 'center',
      backgroundColor: colors.bgBase,
      padding: 32,
    },
    spinnerWrapper: {
      width: SIZE,
      height: SIZE,
      alignItems: 'center',
      justifyContent: 'center',
      marginBottom: 28,
    },
    track: {
      position: 'absolute',
      width: SIZE,
      height: SIZE,
      borderRadius: SIZE / 2,
      borderWidth: STROKE,
      borderColor: colors.primary50,
    },
    arc: {
      position: 'absolute',
      width: SIZE,
      height: SIZE,
      borderRadius: SIZE / 2,
      borderWidth: STROKE,
      borderColor: 'transparent',
      borderTopColor: colors.primary500,
      borderRightColor: colors.primary500,
    },
    dot: {
      width: 8,
      height: 8,
      borderRadius: 4,
      backgroundColor: colors.primary500,
    },
    message: {
      ...type.sectionLabel,
      color: colors.textPrimary,
      textAlign: 'center',
      marginBottom: 6,
    },
    subtitle: {
      ...type.body,
      color: colors.textSecondary,
      textAlign: 'center',
    },
  });
}
