import Svg, { Rect, Path, Circle } from 'react-native-svg';
import { View, Text, StyleSheet } from 'react-native';
import { useColors } from '@/hooks/useColorScheme';
import { fonts } from '@/constants/typography';

interface SarthiGoLogoProps {
  size?: number;
  showWordmark?: boolean;
  wordmarkSize?: number;
}

export function SarthiGoLogo({ size = 40, showWordmark = true, wordmarkSize = 22 }: SarthiGoLogoProps) {
  const colors = useColors();

  return (
    <View style={styles.row}>
      {/* Compass mark on orange rounded square */}
      <Svg width={size} height={size} viewBox="0 0 48 48">
        <Rect width="48" height="48" rx="12" fill={colors.primary500} />

        {/* North pointer — solid white */}
        <Path d="M24 7 L28.5 24 L19.5 24 Z" fill="white" />
        {/* South pointer — semi-transparent (shadow side) */}
        <Path d="M24 41 L28.5 24 L19.5 24 Z" fill="rgba(255,255,255,0.35)" />
        {/* East pointer — semi-transparent (shadow side) */}
        <Path d="M41 24 L24 19.5 L24 28.5 Z" fill="rgba(255,255,255,0.35)" />
        {/* West pointer — solid white */}
        <Path d="M7 24 L24 19.5 L24 28.5 Z" fill="white" />

        {/* Center pivot dot */}
        <Circle cx="24" cy="24" r="2.8" fill={colors.primary500} />
      </Svg>

      {showWordmark && (
        <Text>
          <Text style={[styles.wordmark, { color: colors.textPrimary, fontSize: wordmarkSize }]}>Sarthi</Text>
          <Text style={[styles.wordmark, { color: colors.primary500, fontSize: wordmarkSize }]}>Go</Text>
        </Text>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  wordmark: { fontFamily: fonts.extraBold, letterSpacing: -0.5 },
});
