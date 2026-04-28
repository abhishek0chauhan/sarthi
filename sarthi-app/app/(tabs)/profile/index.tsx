import { View, Text, Pressable, StyleSheet, Alert, ScrollView, Switch } from 'react-native';
import { useState } from 'react';
import { SafeAreaView } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import { useAuthStore } from '@/stores/auth.store';
import { authService } from '@/services/auth.service';
import { useThemeStore } from '@/stores/theme.store';
import { useColors } from '@/hooks/useColorScheme';
import type { Colors } from '@/constants/colors';
import { type } from '@/constants/typography';

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
}

function SwitchMenuItem({ icon, label, value, onValueChange, trackColor, thumbColor, styles }: SwitchMenuItemProps) {
  return (
    <View style={styles.menuRow}>
      <Text style={styles.menuIcon}>{icon}</Text>
      <Text style={styles.menuLabel}>{label}</Text>
      <Switch
        value={value}
        onValueChange={onValueChange}
        trackColor={trackColor}
        thumbColor={thumbColor}
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

  const [notifs, setNotifs] = useState(true);

  const initial = (user?.displayName?.[0] ?? user?.email?.[0] ?? '?').toUpperCase();

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

          <SwitchMenuItem
            icon="🔔"
            label="Notifications"
            value={notifs}
            onValueChange={setNotifs}
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
      paddingHorizontal: 16,
      paddingTop: 12,
      paddingBottom: 4,
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
