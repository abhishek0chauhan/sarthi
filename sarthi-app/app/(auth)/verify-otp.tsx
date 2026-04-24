import React, { useState, useEffect, useRef } from 'react';
import { View, Text, Pressable, StyleSheet } from 'react-native';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import Animated, { useSharedValue, useAnimatedStyle, withSequence, withTiming } from 'react-native-reanimated';
import { OTPInput } from '@/components/ui/OTPInput';
import { Button } from '@/components/ui/Button';
import { useColors } from '@/hooks/useColorScheme';
import type { Colors } from '@/constants/colors';
import { type } from '@/constants/typography';

const RESEND_SECONDS = 30;
const MAX_ATTEMPTS = 3;

export default function VerifyOTPScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { phone } = useLocalSearchParams<{ phone: string }>();
  const [otp, setOtp] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [attempts, setAttempts] = useState(0);
  const [seconds, setSeconds] = useState(RESEND_SECONDS);
  const confirmationRef = useRef<any>(null);
  const shakeX = useSharedValue(0);
  const shakeStyle = useAnimatedStyle(() => ({ transform: [{ translateX: shakeX.value }] }));
  const colors = useColors();
  const styles = makeStyles(colors);

  const triggerShake = () => {
    shakeX.value = withSequence(
      withTiming(-8, { duration: 60 }),
      withTiming(8, { duration: 60 }),
      withTiming(-6, { duration: 60 }),
      withTiming(6, { duration: 60 }),
      withTiming(0, { duration: 60 }),
    );
  };

  useEffect(() => {
    if (seconds <= 0) return;
    const t = setInterval(() => setSeconds((s) => s - 1), 1000);
    return () => clearInterval(t);
  }, [seconds]);

  const handleOTPChange = (value: string) => {
    setOtp(value);
    setError('');
    if (value.length === 6) verify(value);
  };

  const verify = async (code: string) => {
    if (!confirmationRef.current || attempts >= MAX_ATTEMPTS) {
      if (!confirmationRef.current) {
        setError('Incorrect code. Try again.');
        triggerShake();
        setAttempts((a) => a + 1);
        setOtp('');
      }
      return;
    }
    setLoading(true);
    try {
      await confirmationRef.current.confirm(code);
      router.replace('/(tabs)/search');
    } catch {
      const next = attempts + 1;
      setAttempts(next);
      triggerShake();
      if (next >= MAX_ATTEMPTS) {
        setError('Too many attempts. Request a new code.');
        setOtp('');
        setSeconds(0);
      } else {
        setError('Incorrect code. Try again.');
        setOtp('');
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <View style={[styles.container, { paddingTop: insets.top + 16, paddingBottom: insets.bottom + 24 }]}>
      <Pressable onPress={() => router.back()} style={styles.back}>
        <Text style={styles.backIcon}>←</Text>
      </Pressable>

      <View style={styles.iconWrapper}>
        <Text style={styles.icon}>📱</Text>
      </View>

      <Text style={styles.title}>Enter OTP</Text>
      <Text style={styles.sent}>
        Code sent to <Text style={styles.phone}>+91 {phone}</Text>
      </Text>
      <Pressable onPress={() => router.back()}>
        <Text style={styles.changeNumber}>Change number</Text>
      </Pressable>

      <Animated.View style={[styles.otpWrapper, shakeStyle]}>
        <OTPInput testID="otp" value={otp} onChange={handleOTPChange} hasError={!!error} />
      </Animated.View>

      {error ? <Text style={styles.errorText}>{error}</Text> : null}

      <Button
        label="Verify & Continue"
        onPress={() => verify(otp)}
        loading={loading}
        disabled={otp.length < 6 || attempts >= MAX_ATTEMPTS}
      />

      <View style={styles.resendRow}>
        {seconds > 0 ? (
          <Text style={styles.resendTimer}>
            Resend code in <Text style={styles.resendCount}>0:{String(seconds).padStart(2, '0')}</Text>
          </Text>
        ) : (
          <Pressable
            onPress={() => {
              setSeconds(RESEND_SECONDS);
              setAttempts(0);
              setOtp('');
              setError('');
            }}
          >
            <Text style={styles.resendLink}>Resend OTP</Text>
          </Pressable>
        )}
      </View>
    </View>
  );
}

function makeStyles(colors: Colors) {
  return StyleSheet.create({
    container: { flex: 1, backgroundColor: colors.bgBase, paddingHorizontal: 20 },
    back: {
      width: 36,
      height: 36,
      borderRadius: 10,
      backgroundColor: colors.bgSurface,
      alignItems: 'center',
      justifyContent: 'center',
      marginBottom: 24,
    },
    backIcon: { fontSize: 16, color: colors.textPrimary },
    iconWrapper: {
      width: 72,
      height: 72,
      borderRadius: 36,
      backgroundColor: colors.primary50,
      alignItems: 'center',
      justifyContent: 'center',
      marginBottom: 20,
    },
    icon: { fontSize: 32 },
    title: { ...type.screenTitle, color: colors.textPrimary, marginBottom: 6 },
    sent: { ...type.body, color: colors.textSecondary, marginBottom: 4 },
    phone: { color: colors.textPrimary, fontFamily: 'Inter_600SemiBold' },
    changeNumber: {
      ...type.body,
      color: colors.primary500,
      fontFamily: 'Inter_600SemiBold',
      marginBottom: 28,
    },
    otpWrapper: { marginBottom: 16 },
    errorText: { ...type.caption, color: colors.danger, textAlign: 'center', marginBottom: 16 },
    resendRow: { alignItems: 'center', marginTop: 16 },
    resendTimer: { ...type.caption, color: colors.textSecondary },
    resendCount: { fontFamily: 'Inter_700Bold', color: colors.textPrimary },
    resendLink: {
      ...type.body,
      color: colors.primary500,
      fontFamily: 'Inter_600SemiBold',
    },
  });
}
