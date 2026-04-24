import { Tabs } from 'expo-router';
import { View, Text, StyleSheet, Pressable } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useColors } from '@/hooks/useColorScheme';
import type { Colors } from '@/constants/colors';
import { type } from '@/constants/typography';

const TABS = [
  { name: 'search',  label: 'SEARCH',  icon: '🧭' },
  { name: 'trips',   label: 'TRIPS',   icon: '🗺' },
  { name: 'profile', label: 'PROFILE', icon: '👤' },
];

export default function TabLayout() {
  const insets = useSafeAreaInsets();
  const colors = useColors();
  const styles = makeStyles(colors);

  return (
    <Tabs
      screenOptions={{ headerShown: false }}
      tabBar={({ state, navigation }) => (
        <View style={[styles.pillWrapper, { paddingBottom: insets.bottom + 16 }]}>
          <View style={styles.pill}>
            {TABS.map((tab) => {
              // Expo Router may name routes 'search' or 'search/index' depending on version
              const routeIndex = state.routes.findIndex(
                (r) => r.name === tab.name || r.name === `${tab.name}/index`
              );
              if (routeIndex === -1) return null;
              const route = state.routes[routeIndex];
              const focused = state.index === routeIndex;
              return (
                <Pressable
                  key={tab.name}
                  onPress={() => {
                    const event = navigation.emit({ type: 'tabPress', target: route.key, canPreventDefault: true });
                    if (!event.defaultPrevented) {
                      navigation.navigate(route.name);
                    }
                  }}
                  style={[styles.tabItem, focused && styles.tabItemActive]}
                >
                  <Text style={styles.icon}>{tab.icon}</Text>
                  <Text style={[styles.label, focused && styles.labelActive]}>
                    {tab.label}
                  </Text>
                </Pressable>
              );
            })}
          </View>
        </View>
      )}
    />
  );
}

function makeStyles(colors: Colors) {
  return StyleSheet.create({
    pillWrapper: {
      position: 'absolute', bottom: 0, left: 0, right: 0,
      paddingHorizontal: 20, paddingTop: 0,
    },
    pill: {
      backgroundColor: colors.bgSurface,
      borderRadius: 32, flexDirection: 'row',
      justifyContent: 'space-around', alignItems: 'center',
      paddingVertical: 6, paddingHorizontal: 8,
      shadowColor: colors.primary500,
      shadowOffset: { width: 0, height: 8 },
      shadowOpacity: 0.12, shadowRadius: 16,
      elevation: 8,
    },
    tabItem: {
      flexDirection: 'column', alignItems: 'center', gap: 3,
      paddingHorizontal: 14, paddingVertical: 7, borderRadius: 20,
      opacity: 0.4,
    },
    tabItemActive: { backgroundColor: colors.primary500, opacity: 1 },
    icon:  { fontSize: 16 },
    label: { ...type.overline, color: colors.textSecondary, letterSpacing: 0.5 },
    labelActive: { color: '#fff' },
  });
}
