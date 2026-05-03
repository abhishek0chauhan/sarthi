import { Tabs } from 'expo-router';
import { View, Text, StyleSheet, Pressable } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useColors } from '@/hooks/useColorScheme';
import type { Colors } from '@/constants/colors';
import { type } from '@/constants/typography';
import { useProfile } from '@/hooks/useProfile';

// Old floating pill nav kept for reference:
// const TABS = [
//   { name: 'search',  label: 'SEARCH',  icon: '🧭' },
//   { name: 'trips',   label: 'TRIPS',   icon: '🗺' },
//   { name: 'profile', label: 'PROFILE', icon: '👤' },
// ];
// pillWrapper: { position: 'absolute', bottom: 0, left: 0, right: 0, paddingHorizontal: 20 }
// pill: { backgroundColor: colors.bgSurface, borderRadius: 32, flexDirection: 'row', ... }
// tabItemActive: { backgroundColor: colors.primary500, opacity: 1 }

const TABS = [
  { name: 'search',  label: 'Search',  icon: '🧭' },
  { name: 'trips',   label: 'Trips',   icon: '🗺' },
  { name: 'profile', label: 'Profile', icon: '👤' },
];

export default function TabLayout() {
  const insets = useSafeAreaInsets();
  const colors = useColors();
  const styles = makeStyles(colors);
  const { data: profile } = useProfile();

  return (
    <Tabs
      screenOptions={{ headerShown: false }}
      tabBar={({ state, navigation }) => (
        <View style={[styles.bar, { paddingBottom: insets.bottom || 12 }]}>
          {TABS.map((tab) => {
            const routeIndex = state.routes.findIndex(
              (r) => r.name === tab.name || r.name === `${tab.name}/index`,
            );
            if (routeIndex === -1) return null;
            const route = state.routes[routeIndex];
            const focused = state.index === routeIndex;

            // Show profile completeness indicator dot
            const showProfileBadge = tab.name === 'profile' && profile?.completeness !== undefined && profile.completeness < 100;

            return (
              <Pressable
                key={tab.name}
                onPress={() => {
                  const event = navigation.emit({ type: 'tabPress', target: route.key, canPreventDefault: true });
                  if (!event.defaultPrevented) navigation.navigate(route.name);
                }}
                style={styles.tabItem}
              >
                {focused && <View style={styles.indicator} />}

                <View style={styles.iconContainer}>
                  <Text style={[styles.icon, focused && styles.iconActive]}>{tab.icon}</Text>
                  {showProfileBadge && <View style={[styles.completenessIndicator, { backgroundColor: colors.warning }]} />}
                </View>
                <Text style={[styles.label, focused && styles.labelActive]}>{tab.label}</Text>
              </Pressable>
            );
          })}
        </View>
      )}
    />
  );
}

function makeStyles(colors: Colors) {
  return StyleSheet.create({
    bar: {
      backgroundColor: colors.bgCard,
      borderTopWidth: 1,
      borderTopColor: colors.border,
      flexDirection: 'row',
      paddingTop: 10,
    },
    tabItem: {
      flex: 1,
      alignItems: 'center',
      gap: 5,
    },
    indicator: {
      position: 'absolute',
      top: -10,
      width: 28,
      height: 3,
      borderRadius: 2,
      backgroundColor: colors.primary500,
    },
    iconContainer: {
      position: 'relative',
      alignItems: 'center',
      justifyContent: 'center',
    },
    completenessIndicator: {
      position: 'absolute',
      top: -2,
      right: -6,
      width: 8,
      height: 8,
      borderRadius: 4,
    },
    label: {
      ...type.caption,
      color: colors.textTertiary,
    },
    labelActive: {
      color: colors.primary500,
      fontFamily: 'Inter_600SemiBold',
    },
    icon: {
      fontSize: 20,
      marginTop: 2,
    },
    iconActive: {
      opacity: 1,
    },
  });
}
