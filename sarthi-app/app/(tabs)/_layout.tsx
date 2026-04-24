import { Tabs } from 'expo-router';
import { View, Text, StyleSheet, Pressable } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { lightColors } from '@/constants/colors';
import { type } from '@/constants/typography';

const TABS = [
  { name: 'search',  label: 'SEARCH',  icon: '🧭' },
  { name: 'trips',   label: 'TRIPS',   icon: '🗺' },
  { name: 'profile', label: 'PROFILE', icon: '👤' },
];

export default function TabLayout() {
  const insets = useSafeAreaInsets();

  return (
    <Tabs
      screenOptions={{ headerShown: false }}
      tabBar={({ state, navigation }) => (
        <View style={[styles.pillWrapper, { paddingBottom: insets.bottom + 16 }]}>
          <View style={styles.pill}>
            {TABS.map((tab) => {
              const route = state.routes.find((r) => r.name === tab.name);
              if (!route) return null;
              const focused = state.routes[state.index].name === tab.name;
              return (
                <Pressable
                  key={tab.name}
                  onPress={() =>
                    navigation.emit({ type: 'tabPress', target: route.key, canPreventDefault: true })
                  }
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

const styles = StyleSheet.create({
  pillWrapper: {
    position: 'absolute', bottom: 0, left: 0, right: 0,
    paddingHorizontal: 20, paddingTop: 0,
  },
  pill: {
    backgroundColor: lightColors.bgSurface,
    borderRadius: 32, flexDirection: 'row',
    justifyContent: 'space-around', alignItems: 'center',
    paddingVertical: 6, paddingHorizontal: 8,
    shadowColor: lightColors.primary500,
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.12, shadowRadius: 16,
    elevation: 8,
  },
  tabItem: {
    flexDirection: 'column', alignItems: 'center', gap: 3,
    paddingHorizontal: 14, paddingVertical: 7, borderRadius: 20,
    opacity: 0.4,
  },
  tabItemActive: { backgroundColor: lightColors.primary500, opacity: 1 },
  icon:  { fontSize: 16 },
  label: { ...type.overline, color: lightColors.textSecondary, letterSpacing: 0.5 },
  labelActive: { color: '#fff' },
});
