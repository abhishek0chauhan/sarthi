import { View, Text, Pressable, StyleSheet, Alert, ScrollView } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useAuthStore } from '@/stores/auth.store';
import { authService } from '@/services/auth.service';
import { useThemeStore } from '@/stores/theme.store';
import { useColors } from '@/hooks/useColorScheme';
import type { Colors } from '@/constants/colors';
import { type } from '@/constants/typography';

interface MenuItemProps {
  icon: string;
  label: string;
  onPress: () => void;
  destructive?: boolean;
  styles: ReturnType<typeof makeStyles>;
}

function MenuItem({ icon, label, onPress, destructive, styles }: MenuItemProps) {
  return (
    <Pressable onPress={onPress} style={styles.menuItem}>
      <Text style={styles.menuIcon}>{icon}</Text>
      <Text style={[styles.menuLabel, destructive && styles.menuLabelDestructive]}>
        {label}
      </Text>
      <Text style={styles.chevron}>›</Text>
    </Pressable>
  );
}

export default function ProfileScreen() {
  const user = useAuthStore((s) => s.user);
  const { override, setOverride } = useThemeStore();
  const colors = useColors();
  const styles = makeStyles(colors);

  const isDark = override === 'dark';

  const handleToggleDarkMode = () => {
    setOverride(isDark ? 'light' : 'dark');
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
    <SafeAreaView style={styles.safe}>
      <ScrollView contentContainerStyle={styles.content}>
        <View style={styles.avatar}>
          <Text style={styles.avatarText}>
            {user?.displayName?.[0] ?? user?.email?.[0] ?? '?'}
          </Text>
        </View>

        <Text style={styles.name}>{user?.displayName ?? 'Traveller'}</Text>
        <Text style={styles.email}>{user?.email ?? user?.phoneNumber ?? ''}</Text>

        <View style={styles.section}>
          <Text style={styles.sectionLabel}>ACCOUNT</Text>
          <MenuItem icon="🔔" label="Notifications" onPress={() => {}} styles={styles} />
          <MenuItem icon="🌙" label={isDark ? 'Dark Mode (On)' : 'Dark Mode (Off)'} onPress={handleToggleDarkMode} styles={styles} />
          <MenuItem icon="🌐" label="Language" onPress={() => {}} styles={styles} />
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionLabel}>SUPPORT</Text>
          <MenuItem icon="💬" label="Feedback" onPress={() => {}} styles={styles} />
          <MenuItem icon="📋" label="Privacy Policy" onPress={() => {}} styles={styles} />
          <MenuItem icon="📄" label="Terms of Service" onPress={() => {}} styles={styles} />
        </View>

        <View style={styles.section}>
          <MenuItem icon="🚪" label="Sign Out" onPress={handleSignOut} destructive styles={styles} />
        </View>

        <Text style={styles.version}>Sarthi v1.0.0</Text>
      </ScrollView>
    </SafeAreaView>
  );
}

function makeStyles(colors: Colors) {
  return StyleSheet.create({
    safe: { flex: 1, backgroundColor: colors.bgBase },
    content: { padding: 24, alignItems: 'center', gap: 4 },
    avatar: {
      width: 80, height: 80, borderRadius: 40,
      backgroundColor: colors.primary500,
      alignItems: 'center', justifyContent: 'center',
      marginBottom: 12,
    },
    avatarText: { fontSize: 32, color: colors.textInverse, fontFamily: 'Inter_700Bold' },
    name: { ...type.screenTitle, color: colors.textPrimary },
    email: { ...type.body, color: colors.textSecondary, marginBottom: 8 },
    section: {
      width: '100%',
      backgroundColor: colors.bgCard,
      borderRadius: 16,
      borderWidth: 1,
      borderColor: colors.border,
      overflow: 'hidden',
      marginTop: 16,
    },
    sectionLabel: { ...type.overline, color: colors.textTertiary, paddingHorizontal: 16, paddingTop: 12, paddingBottom: 4 },
    menuItem: {
      flexDirection: 'row',
      alignItems: 'center',
      paddingHorizontal: 16,
      paddingVertical: 14,
      borderTopWidth: 1,
      borderTopColor: colors.border,
      gap: 12,
    },
    menuIcon: { fontSize: 18 },
    menuLabel: { ...type.body, color: colors.textPrimary, flex: 1 },
    menuLabelDestructive: { color: colors.danger },
    chevron: { fontSize: 18, color: colors.textTertiary },
    version: { ...type.caption, color: colors.textTertiary, marginTop: 24 },
  });
}
