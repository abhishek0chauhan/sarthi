import React, { useState, useRef } from 'react';
import { View, Text, ScrollView, Pressable, Dimensions, StyleSheet, NativeScrollEvent } from 'react-native';
import { useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Button } from '@/components/ui/Button';
import { lightColors } from '@/constants/colors';
import { type } from '@/constants/typography';

const { width: SCREEN_WIDTH } = Dimensions.get('window');

const SLIDES = [
  { emoji: '🏔', label: 'Traveler on mountain' },
  { emoji: '🚂', label: 'Train through landscape' },
  { emoji: '🏕', label: 'Campfire with friends' },
];

export default function WelcomeScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const [activeSlide, setActiveSlide] = useState(0);
  const scrollRef = useRef<ScrollView>(null);

  const onScroll = (e: { nativeEvent: NativeScrollEvent }) => {
    const slide = Math.round(e.nativeEvent.contentOffset.x / SCREEN_WIDTH);
    setActiveSlide(slide);
  };

  const goToSlide = (i: number) => {
    scrollRef.current?.scrollTo({ x: i * SCREEN_WIDTH, animated: true });
  };

  return (
    <View style={[styles.container, { paddingTop: insets.top, paddingBottom: insets.bottom }]}>
      {/* Decorative circles */}
      <View style={styles.circle1} />
      <View style={styles.circle2} />

      {/* Logo */}
      <View style={styles.logo}>
        <View style={styles.logoIcon}><Text style={styles.logoEmoji}>🧭</Text></View>
        <Text style={styles.logoText}>Sarthi</Text>
      </View>

      {/* Illustration carousel */}
      <ScrollView
        ref={scrollRef}
        horizontal pagingEnabled showsHorizontalScrollIndicator={false}
        onScroll={onScroll} scrollEventThrottle={16}
        style={styles.carousel}
      >
        {SLIDES.map((slide, i) => (
          <View key={i} style={[styles.slide, { width: SCREEN_WIDTH - 40 }]}>
            <Text style={styles.slideEmoji}>{slide.emoji}</Text>
            <Text style={styles.slideLabel}>{slide.label}</Text>
          </View>
        ))}
      </ScrollView>

      {/* Dot indicators */}
      <View style={styles.dots}>
        {SLIDES.map((_, i) => (
          <Pressable key={i} testID={`slide-dot-${i}`} onPress={() => goToSlide(i)}>
            <View style={[styles.dot, activeSlide === i && styles.dotActive]} />
          </Pressable>
        ))}
      </View>

      {/* Text */}
      <View style={styles.textBlock}>
        <Text style={styles.overline}>EXPLORE INDIA YOUR WAY</Text>
        <Text style={styles.title}>Your personal travel companion</Text>
        <Text style={styles.body}>
          AI-powered destination finder, itineraries, and food guides — built for Indian travelers.
        </Text>
      </View>

      {/* CTA */}
      <Button label="Get Started" onPress={() => router.push('/(auth)/login')} />
      <Pressable onPress={() => router.push('/(auth)/login')} style={styles.signInRow}>
        <Text style={styles.signInText}>
          Already have an account? <Text style={styles.signInLink}>Sign in</Text>
        </Text>
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: lightColors.bgBase, paddingHorizontal: 20 },
  circle1: { position: 'absolute', top: -40, right: -40, width: 180, height: 180, borderRadius: 90, backgroundColor: 'rgba(232,96,28,0.06)' },
  circle2: { position: 'absolute', bottom: 80, left: -60, width: 220, height: 220, borderRadius: 110, backgroundColor: 'rgba(232,96,28,0.04)' },
  logo: { flexDirection: 'row', alignItems: 'center', gap: 10, marginBottom: 32, marginTop: 8 },
  logoIcon: { width: 40, height: 40, borderRadius: 12, backgroundColor: lightColors.primary500, alignItems: 'center', justifyContent: 'center' },
  logoEmoji: { fontSize: 20 },
  logoText: { ...type.cardHeading, fontFamily: 'Inter_800ExtraBold', color: lightColors.textPrimary },
  carousel: { flexGrow: 0, marginBottom: 16, marginHorizontal: -20 },
  slide: { marginHorizontal: 20, height: 200, backgroundColor: lightColors.bgSurface, borderRadius: 16, alignItems: 'center', justifyContent: 'center', gap: 8 },
  slideEmoji: { fontSize: 48 },
  slideLabel: { ...type.caption, color: lightColors.textSecondary },
  dots: { flexDirection: 'row', gap: 6, justifyContent: 'center', marginBottom: 28 },
  dot: { width: 8, height: 8, borderRadius: 4, backgroundColor: lightColors.border },
  dotActive: { width: 20, height: 8, borderRadius: 4, backgroundColor: lightColors.primary500 },
  textBlock: { marginBottom: 28 },
  overline: { ...type.overline, color: lightColors.textSecondary, marginBottom: 6 },
  title: { ...type.screenTitle, color: lightColors.textPrimary, marginBottom: 10 },
  body: { ...type.body, color: lightColors.textSecondary, lineHeight: 22 },
  signInRow: { alignItems: 'center', marginTop: 12 },
  signInText: { ...type.caption, color: lightColors.textSecondary },
  signInLink: { color: lightColors.primary500, fontFamily: 'Inter_600SemiBold' },
});
