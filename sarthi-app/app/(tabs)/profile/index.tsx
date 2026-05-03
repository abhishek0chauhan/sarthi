import { View, Text, Pressable, StyleSheet, Alert, ScrollView, Switch } from 'react-native';
import { useState, useEffect } from 'react';
import { SafeAreaView } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import { useRouter } from 'expo-router';
import { useAuthStore } from '@/stores/auth.store';
import { authService } from '@/services/auth.service';
import { useThemeStore } from '@/stores/theme.store';
import { useColors } from '@/hooks/useColorScheme';
import { useProfile } from '@/hooks/useProfile';
import type { Colors } from '@/constants/colors';
import { type } from '@/constants/typography';
import { apiRequest } from '@/services/api';

// ─── Sub-components ──────────────────────────────────────────────────────────

interface SwitchMenuItemProps {
  icon: string;
  label: string;
  value: boolean;
  onValueChange: (v: boolean) => void;
  trackColor: { true: string; false: string };
  thumbColor: string;
  styles: ReturnType<typeof makeStyles>;
  colors: Colors;
  testID?: string;
  isFirst?: boolean;
}

function SwitchMenuItem({ icon, label, value, onValueChange, trackColor, thumbColor, styles, testID, isFirst }: SwitchMenuItemProps) {
  return (
    <View style={[styles.menuRow, isFirst && styles.menuRowFirst]}>
      <Text style={styles.menuIcon}>{icon}</Text>
      <Text style={styles.menuLabel}>{label}</Text>
      <Switch
        value={value}
        onValueChange={onValueChange}
        trackColor={trackColor}
        thumbColor={thumbColor}
        testID={testID}
      />
    </View>
  );
}

interface ChevronMenuItemProps {
  icon: string;
  label: string;
  value?: string;
  onPress: () => void;
  destructive?: boolean;
  styles: ReturnType<typeof makeStyles>;
  colors: Colors;
}

function ChevronMenuItem({ icon, label, value, onPress, destructive, styles }: ChevronMenuItemProps) {
  return (
    <Pressable onPress={onPress} style={styles.menuRow}>
      <Text style={styles.menuIcon}>{icon}</Text>
      <Text style={[styles.menuLabel, destructive && styles.menuLabelDestructive]}>{label}</Text>
      {value ? <Text style={styles.menuValue}>{value}</Text> : null}
      <Text style={styles.chevron}>›</Text>
    </Pressable>
  );
}

// ─── Screen ──────────────────────────────────────────────────────────────────

export default function ProfileScreen() {
  const user = useAuthStore((s) => s.user);
  const { override, setOverride } = useThemeStore();
  const colors = useColors();
  const styles = makeStyles(colors);
  const router = useRouter();
  const { data: profile } = useProfile();

  // OLD: const [notifs, setNotifs] = useState(true);
  // NEW: Separate toggles for morning briefing and meal nudges
  const [morningBriefing, setMorningBriefing] = useState(true);
  const [mealNudges, setMealNudges] = useState(true);
  const [prefsLoading, setPrefsLoading] = useState(true);

  const initial = (user?.displayName?.[0] ?? user?.email?.[0] ?? '?').toUpperCase();

  // Fetch notification prefs on mount
  useEffect(() => {
    apiRequest<{ notificationPrefs: { morningBriefing: boolean; mealNudges: boolean } }>('/users/me/notification-prefs')
      .then(({ notificationPrefs }) => {
        setMorningBriefing(notificationPrefs.morningBriefing);
        setMealNudges(notificationPrefs.mealNudges);
      })
      .catch((err) => console.warn('[Profile] Failed to fetch notification prefs:', err))
      .finally(() => setPrefsLoading(false));
  }, []);

  // Update preference with optimistic update + rollback
  const updatePref = async (key: 'morningBriefing' | 'mealNudges', value: boolean) => {
    // Optimistic update
    if (key === 'morningBriefing') setMorningBriefing(value);
    else setMealNudges(value);

    try {
      await apiRequest('/users/me/notification-prefs', {
        method: 'PATCH',
        body: JSON.stringify({ [key]: value }),
      });
    } catch (err) {
      console.warn('[Profile] Failed to update notification pref:', err);
      // Rollback on error
      if (key === 'morningBriefing') setMorningBriefing(!value);
      else setMealNudges(!value);
    }
  };

  const handleSignOut = () => {
    Alert.alert('Sign Out', 'Are you sure you want to sign out?', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Sign Out',
        style: 'destructive',
        onPress: () => authService.signOut(),
      },
    ]);
  };

  return (
    <SafeAreaView style={styles.safe} edges={['top']}>
      <ScrollView style={styles.scroll} contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>

        {/* ── Header gradient ── */}
        <LinearGradient colors={['#2C1A08', '#5A3214']} style={styles.header}>
          <View style={styles.headerCircle} />
          <LinearGradient colors={['#E8601C', '#F5926A']} style={styles.avatarGradient}>
            <Text style={styles.avatarText}>{initial}</Text>
          </LinearGradient>
          <Text style={styles.name}>{user?.displayName ?? 'Traveller'}</Text>
          <Text style={styles.contact}>{user?.email ?? user?.phoneNumber ?? ''}</Text>
        </LinearGradient>

        {/* ── Stats row ── */}
        <View style={styles.statsRow}>
          <View style={styles.statItem}>
            <Text style={styles.statValue}>0</Text>
            <Text style={styles.statLabel}>Trips</Text>
          </View>
          <View style={styles.statDivider} />
          <View style={styles.statItem}>
            <Text style={styles.statValue}>0</Text>
            <Text style={styles.statLabel}>Days Planned</Text>
          </View>
          <View style={styles.statDivider} />
          <View style={styles.statItem}>
            <Text style={styles.statValue}>0</Text>
            <Text style={styles.statLabel}>Shared</Text>
          </View>
        </View>

        {/* ── PREFERENCES section ── */}
        <View style={styles.section}>
          <Text style={styles.sectionLabel}>PREFERENCES</Text>

          <SwitchMenuItem
            icon="🌙"
            label="Dark Mode"
            value={override === 'dark'}
            onValueChange={(v) => setOverride(v ? 'dark' : 'system')}
            trackColor={{ true: colors.primary500, false: colors.border }}
            thumbColor={colors.bgCard}
            styles={styles}
            colors={colors}
          />

          <ChevronMenuItem
            icon="🌐"
            label="Language"
            value="English"
            onPress={() => {}}
            styles={styles}
            colors={colors}
          />

          <ChevronMenuItem
            icon="🧭"
            label="Traveler Personality"
            value={
              profile?.completeness === 0 || !profile
                ? 'Not set up'
                : profile.completeness === 100
                  ? 'Complete'
                  : `${profile.completeness}% complete`
            }
            onPress={() => router.push('/(tabs)/profile/personality')}
            styles={styles}
            colors={colors}
          />
        </View>

        {/* ── NOTIFICATIONS section ── */}
        <Text style={styles.sectionLabel}>NOTIFICATIONS</Text>
        <View style={styles.menuSection}>
          <SwitchMenuItem
            icon="☀️"
            label="Morning Briefing"
            value={morningBriefing}
            onValueChange={(v) => updatePref('morningBriefing', v)}
            trackColor={{ true: colors.primary500, false: colors.border }}
            thumbColor={colors.bgCard}
            styles={styles}
            colors={colors}
            testID="toggle-morningBriefing"
            isFirst={true}
          />
          <SwitchMenuItem
            icon="🍽️"
            label="Meal Nudges"
            value={mealNudges}
            onValueChange={(v) => updatePref('mealNudges', v)}
            trackColor={{ true: colors.primary500, false: colors.border }}
            thumbColor={colors.bgCard}
            styles={styles}
            colors={colors}
            testID="toggle-mealNudges"
          />
        </View>

        {/* ── ACCOUNT section ── */}
        <View style={styles.section}>
          <Text style={styles.sectionLabel}>ACCOUNT</Text>

          <ChevronMenuItem
            icon="✉️"
            label="Change Email"
            onPress={() => {}}
            styles={styles}
            colors={colors}
          />

          <ChevronMenuItem
            icon="🚪"
            label="Sign Out"
            onPress={handleSignOut}
            destructive
            styles={styles}
            colors={colors}
          />

          <ChevronMenuItem
            icon="🗑️"
            label="Delete Account"
            onPress={() => {}}
            destructive
            styles={styles}
            colors={colors}
          />
        </View>

        {/* ── Footer ── */}
        <View style={styles.footer}>
          <Text style={styles.version}>SarthiGo v1.0.0</Text>
          <View style={styles.footerLinks}>
            <Text style={styles.footerLink}>Terms</Text>
            <Text style={styles.footerSep}> · </Text>
            <Text style={styles.footerLink}>Privacy</Text>
            <Text style={styles.footerSep}> · </Text>
            <Text style={styles.footerLink}>Help</Text>
          </View>
        </View>

      </ScrollView>
    </SafeAreaView>
  );
}

// ─── Styles ───────────────────────────────────────────────────────────────────

function makeStyles(colors: Colors) {
  return StyleSheet.create({
    safe: {
      flex: 1,
      backgroundColor: colors.bgBase,
    },
    scroll: {
      flex: 1,
    },
    content: {
      paddingBottom: 32,
    },

    // Header
    header: {
      paddingHorizontal: 24,
      paddingTop: 24,
      paddingBottom: 24,
      gap: 10,
      overflow: 'hidden',
    },
    headerCircle: {
      position: 'absolute',
      width: 180,
      height: 180,
      borderRadius: 90,
      backgroundColor: 'rgba(255,255,255,0.06)',
      top: -40,
      right: -30,
    },

    // Avatar
    avatarGradient: {
      width: 64,
      height: 64,
      borderRadius: 16,
      alignItems: 'center',
      justifyContent: 'center',
    },
    avatarText: {
      fontSize: 24,
      fontFamily: 'Inter_700Bold',
      color: '#FFFFFF',
    },

    // Profile info (now inside header)
    profileInfo: {},
    name: {
      ...type.screenTitle,
      color: '#FFFFFF',
    },
    contact: {
      ...type.body,
      color: 'rgba(255,255,255,0.65)',
    },

    // Stats
    statsRow: {
      flexDirection: 'row',
      marginHorizontal: 24,
      marginTop: 16,
      marginBottom: 24,
      backgroundColor: colors.bgCard,
      borderRadius: 12,
      borderWidth: 1,
      borderColor: colors.border,
      paddingHorizontal: 8,
      overflow: 'hidden',
    },
    statItem: {
      flex: 1,
      alignItems: 'center',
      justifyContent: 'center',
      paddingVertical: 14,
      gap: 2,
    },
    statValue: {
      ...type.cardHeading,
      fontFamily: 'Inter_700Bold',
      color: colors.primary500,
    },
    statLabel: {
      ...type.caption,
      color: colors.textTertiary,
    },
    statDivider: {
      width: 1,
      height: 30,
      backgroundColor: colors.border,
      alignSelf: 'center',
    },

    // Section
    section: {
      marginHorizontal: 24,
      marginBottom: 16,
      backgroundColor: colors.bgCard,
      borderRadius: 16,
      borderWidth: 1,
      borderColor: colors.border,
      overflow: 'hidden',
    },
    sectionLabel: {
      ...type.overline,
      color: colors.textTertiary,
      paddingHorizontal: 24,
      paddingTop: 16,
      paddingBottom: 8,
    },
    menuSection: {
      marginHorizontal: 24,
      marginBottom: 24,
      backgroundColor: colors.bgCard,
      borderRadius: 16,
      borderWidth: 1,
      borderColor: colors.border,
      overflow: 'hidden',
    },

    // Menu items
    menuRow: {
      flexDirection: 'row',
      alignItems: 'center',
      paddingHorizontal: 16,
      paddingVertical: 14,
      borderTopWidth: 1,
      borderTopColor: colors.border,
      gap: 12,
    },
    menuRowFirst: {
      borderTopWidth: 0,
    },
    menuIcon: {
      fontSize: 18,
    },
    menuLabel: {
      ...type.body,
      color: colors.textPrimary,
      flex: 1,
    },
    menuLabelDestructive: {
      color: colors.danger,
    },
    menuValue: {
      ...type.body,
      color: colors.textSecondary,
      marginRight: 4,
    },
    chevron: {
      fontSize: 18,
      color: colors.textTertiary,
    },

    // Footer
    footer: {
      alignItems: 'center',
      marginTop: 8,
      gap: 6,
    },
    version: {
      ...type.caption,
      color: colors.textTertiary,
    },
    footerLinks: {
      flexDirection: 'row',
      alignItems: 'center',
    },
    footerLink: {
      ...type.caption,
      color: colors.textTertiary,
    },
    footerSep: {
      ...type.caption,
      color: colors.textTertiary,
    },
  });
}
