import { useState } from 'react';
import { View, Text, Pressable, StyleSheet, ScrollView, Alert } from 'react-native';
import { useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { authService } from '@/services/auth.service';
import { useColors } from '@/hooks/useColorScheme';
import type { Colors } from '@/constants/colors';
import { type } from '@/constants/typography';

export default function EmailAuthScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const colors = useColors();
  const styles = makeStyles(colors);

  const [mode, setMode] = useState<'signin' | 'signup'>('signin');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleSubmit = async () => {
    if (!email || !password) return;
    setLoading(true);
    setError('');
    try {
      if (mode === 'signin') {
        await authService.signInWithEmail(email, password);
      } else {
        await authService.createAccount(email, password);
      }
      router.replace('/(tabs)/search');
    } catch (err: any) {
      const msg = err?.message ?? 'Something went wrong';
      if (msg.includes('user-not-found') || msg.includes('wrong-password') || msg.includes('invalid-credential')) {
        setError('Invalid email or password.');
      } else if (msg.includes('email-already-in-use')) {
        setError('An account with this email already exists.');
      } else if (msg.includes('weak-password')) {
        setError('Password must be at least 6 characters.');
      } else if (msg.includes('invalid-email')) {
        setError('Please enter a valid email address.');
      } else {
        setError(msg);
      }
    } finally {
      setLoading(false);
    }
  };

  const handleForgotPassword = async () => {
    if (!email) {
      Alert.alert('Enter email', 'Enter your email address above first.');
      return;
    }
    try {
      await authService.sendPasswordReset(email);
      Alert.alert('Email sent', 'Check your inbox for a password reset link.');
    } catch {
      Alert.alert('Error', 'Could not send reset email. Check the address and try again.');
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

      <Text style={styles.title}>{mode === 'signin' ? 'Sign in' : 'Create account'}</Text>
      <Text style={styles.body}>
        {mode === 'signin' ? 'Welcome back to SarthiGo' : 'Start planning your next trip'}
      </Text>

      <View style={styles.toggleRow}>
        <Pressable
          style={[styles.toggleBtn, mode === 'signin' && styles.toggleBtnActive]}
          onPress={() => { setMode('signin'); setError(''); }}
        >
          <Text style={[styles.toggleText, mode === 'signin' && styles.toggleTextActive]}>Sign In</Text>
        </Pressable>
        <Pressable
          style={[styles.toggleBtn, mode === 'signup' && styles.toggleBtnActive]}
          onPress={() => { setMode('signup'); setError(''); }}
        >
          <Text style={[styles.toggleText, mode === 'signup' && styles.toggleTextActive]}>Sign Up</Text>
        </Pressable>
      </View>

      <Input
        label="Email"
        placeholder="you@example.com"
        value={email}
        onChangeText={setEmail}
        keyboardType="email-address"
        autoCapitalize="none"
      />

      <Input
        label="Password"
        placeholder={mode === 'signup' ? 'At least 6 characters' : 'Your password'}
        value={password}
        onChangeText={setPassword}
        secureTextEntry
      />

      {error ? <Text style={styles.error}>{error}</Text> : null}

      <Button
        label={mode === 'signin' ? 'Sign In →' : 'Create Account →'}
        onPress={handleSubmit}
        loading={loading}
        disabled={!email || !password}
      />

      {mode === 'signin' && (
        <Pressable onPress={handleForgotPassword} style={styles.forgotBtn}>
          <Text style={styles.forgotText}>Forgot password?</Text>
        </Pressable>
      )}
    </ScrollView>
  );
}

function makeStyles(colors: Colors) {
  return StyleSheet.create({
    container: { flexGrow: 1, backgroundColor: colors.bgBase, paddingHorizontal: 20 },
    back: { width: 36, height: 36, borderRadius: 10, backgroundColor: colors.bgSurface, alignItems: 'center', justifyContent: 'center', marginBottom: 20 },
    backIcon: { fontSize: 16, color: colors.textPrimary },
    logoRow: { alignItems: 'center', marginBottom: 28 },
    logoIcon: { width: 36, height: 36, borderRadius: 10, backgroundColor: colors.primary500, alignItems: 'center', justifyContent: 'center' },
    title: { ...type.screenTitle, color: colors.textPrimary, marginBottom: 6 },
    body: { ...type.body, color: colors.textSecondary, marginBottom: 24 },
    toggleRow: { flexDirection: 'row', backgroundColor: colors.bgSurface, borderRadius: 10, padding: 4, marginBottom: 20, gap: 4 },
    toggleBtn: { flex: 1, paddingVertical: 8, borderRadius: 8, alignItems: 'center' },
    toggleBtnActive: { backgroundColor: colors.bgCard, shadowColor: '#000', shadowOpacity: 0.08, shadowRadius: 4, elevation: 2 },
    toggleText: { ...type.body, color: colors.textTertiary, fontFamily: 'Inter_500Medium' },
    toggleTextActive: { color: colors.textPrimary, fontFamily: 'Inter_600SemiBold' },
    error: { ...type.caption, color: colors.danger, marginBottom: 12 },
    forgotBtn: { alignItems: 'center', marginTop: 16 },
    forgotText: { ...type.body, color: colors.primary500 },
  });
}
