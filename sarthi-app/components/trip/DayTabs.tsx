import { ScrollView, TouchableOpacity, Text, View, StyleSheet } from 'react-native';
import { useColors } from '@/hooks/useColorScheme';
import type { Colors } from '@/constants/colors';
import { type } from '@/constants/typography';

interface DayTabsProps {
  days: number;
  activeDay: number;
  onSelect: (day: number) => void;
}

export function DayTabs({ days, activeDay, onSelect }: DayTabsProps) {
  const colors = useColors();
  const styles = makeStyles(colors);

  return (
    <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.scroll}>
      <View style={styles.row}>
        {Array.from({ length: days }).map((_, i) => {
          const day = i + 1;
          const isActive = day === activeDay;
          return (
            <TouchableOpacity
              key={day}
              onPress={() => onSelect(day)}
              style={[styles.tab, isActive && styles.tabActive]}
            >
              <Text style={[styles.label, isActive && styles.labelActive]}>Day {day}</Text>
            </TouchableOpacity>
          );
        })}
      </View>
    </ScrollView>
  );
}

function makeStyles(colors: Colors) {
  return StyleSheet.create({
    scroll: { marginBottom: 16 },
    row: { flexDirection: 'row', gap: 8, paddingHorizontal: 20, paddingVertical: 4 },
    tab: {
      paddingHorizontal: 16,
      paddingVertical: 8,
      borderRadius: 20,
      backgroundColor: colors.bgSurface,
    },
    tabActive: { backgroundColor: colors.primary500 },
    label: { ...type.caption, color: colors.textSecondary },
    labelActive: { color: colors.textInverse },
  });
}
