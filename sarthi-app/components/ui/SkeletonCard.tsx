import React from 'react';
import { View, StyleSheet } from 'react-native';
import Animated, {
  useAnimatedStyle,
  useSharedValue,
  withRepeat,
  withTiming,
} from 'react-native-reanimated';
import { useEffect } from 'react';
import { useColors } from '@/hooks/useColorScheme';
import type { Colors } from '@/constants/colors';

function SkeletonBlock({ style, colors }: { style?: object; colors: Colors }) {
  const opacity = useSharedValue(0.3);

  useEffect(() => {
    opacity.value = withRepeat(withTiming(1, { duration: 800 }), -1, true);
  }, [opacity]);

  const animatedStyle = useAnimatedStyle(() => ({ opacity: opacity.value }));
  const blockStyle = { backgroundColor: colors.border, borderRadius: 4 };

  return <Animated.View style={[blockStyle, style, animatedStyle]} />;
}

interface SkeletonCardProps {
  lines?: number;
}

export function SkeletonCard({ lines = 3 }: SkeletonCardProps) {
  const colors = useColors();
  const styles = makeStyles(colors);

  return (
    <View style={styles.card}>
      <SkeletonBlock style={styles.titleLine} colors={colors} />
      <SkeletonBlock style={styles.subtitleLine} colors={colors} />
      {Array.from({ length: lines }).map((_, i) => (
        <SkeletonBlock key={i} style={i === lines - 1 ? styles.shortLine : styles.fullLine} colors={colors} />
      ))}
    </View>
  );
}

function makeStyles(colors: Colors) {
  return StyleSheet.create({
    card: {
      backgroundColor: colors.bgCard,
      borderRadius: 12,
      padding: 16,
      marginBottom: 12,
      shadowColor: '#000',
      shadowOffset: { width: 0, height: 1 },
      shadowOpacity: 0.05,
      shadowRadius: 2,
      elevation: 1,
    },
    titleLine: { height: 20, width: '75%', marginBottom: 12 },
    subtitleLine: { height: 16, width: '50%', marginBottom: 8 },
    fullLine: { height: 12, width: '100%', marginBottom: 8 },
    shortLine: { height: 12, width: '66%', marginBottom: 8 },
  });
}
