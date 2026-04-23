import React, { useState } from 'react';
import { View, Text, Pressable, StyleSheet, ScrollView } from 'react-native';
import { useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Button } from '@/components/ui/Button';
import { PhoneInput } from '@/components/auth/PhoneInput';
import { GoogleSignInButton } from '@/components/auth/GoogleSignInButton';
import { authService } from '@/services/auth.service';
import { lightColors } from '@/constants/colors';
import { type } from '@/constants/typography';

export default function LoginScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const [phone, setPhone] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleSendOTP = async () => {
    if (phone.length < 10) return;
    setLoading(true);
    setError('');
    try {
      const confirmation = await authService.sendOTP(`+91${phone}`);
      router.push({ pathname: '/(auth)/verify-otp', params: { phone, confirmation: JSON.stringify(confirmation) } });
    } catch (error) {
      console.error('OTP send failed:', error);
      setError('Failed to send OTP. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <ScrollView
      contentContainerStyle={[styles.container, { paddingTop: insets.top + 16, paddingBottom: insets.bottom + 24 }]}
      keyboardShouldPersistTaps="handled"
    >
      <Pressable onPress={() => router.back()} style={styles.back}>
        <Text style={styles.backIcon}>←</Text>
      </Pressable>
      <View style={styles.logoRow}>
        <View style={styles.logoIcon}><Text>🧭</Text></View>
      </View>

      <Text style={styles.title}>Welcome back</Text>
      <Text style={styles.body}>Sign in to continue planning your trips</Text>

      <Text style={styles.label}>PHONE NUMBER</Text>
      <PhoneInput value={phone} onChangeText={setPhone} />
      {error ? <Text style={styles.error}>{error}</Text> : null}

      <Button
        testID="send-otp-btn"
        label="Send OTP →"
        onPress={handleSendOTP}
        loading={loading}
        disabled={phone.length < 10}
      />

      <View style={styles.dividerRow}>
        <View style={styles.dividerLine} />
        <Text style={styles.dividerText}>or continue with</Text>
        <View style={styles.dividerLine} />
      </View>

      <GoogleSignInButton onPress={() => { /* TODO: implement Google sign-in */ }} />
      <Pressable style={styles.altBtn} onPress={() => router.push('/(auth)/email')}>
        <Text style={styles.altBtnText}>Continue with Email</Text>
      </Pressable>

      <Text style={styles.terms}>
        By continuing you agree to our{' '}
        <Text style={styles.termsLink}>Terms</Text> &{' '}
        <Text style={styles.termsLink}>Privacy</Text>
      </Text>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flexGrow: 1, backgroundColor: lightColors.bgBase, paddingHorizontal: 20 },
  back: { width: 36, height: 36, borderRadius: 10, backgroundColor: lightColors.bgSurface, alignItems: 'center', justifyContent: 'center', marginBottom: 20 },
  backIcon: { fontSize: 16, color: lightColors.textPrimary },
  logoRow: { alignItems: 'center', marginBottom: 28 },
  logoIcon: { width: 36, height: 36, borderRadius: 10, backgroundColor: lightColors.primary500, alignItems: 'center', justifyContent: 'center' },
  title: { ...type.screenTitle, color: lightColors.textPrimary, marginBottom: 6 },
  body: { ...type.body, color: lightColors.textSecondary, marginBottom: 24 },
  label: { ...type.overline, color: lightColors.textSecondary, marginBottom: 6 },
  error: { ...type.caption, color: lightColors.danger, marginTop: -8, marginBottom: 12 },
  dividerRow: { flexDirection: 'row', alignItems: 'center', gap: 10, marginVertical: 20 },
  dividerLine: { flex: 1, height: 1, backgroundColor: lightColors.border },
  dividerText: { ...type.caption, color: lightColors.textTertiary },
  altBtn: { height: 48, borderRadius: 12, borderWidth: 1.5, borderColor: lightColors.border, backgroundColor: lightColors.bgCard, alignItems: 'center', justifyContent: 'center', marginBottom: 10 },
  altBtnText: { ...type.body, fontFamily: 'Inter_600SemiBold', color: lightColors.textPrimary },
  terms: { ...type.caption, color: lightColors.textTertiary, textAlign: 'center', marginTop: 'auto', paddingTop: 24 },
  termsLink: { color: lightColors.primary500 },
});
