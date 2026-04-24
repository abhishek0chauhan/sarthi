import { ScrollView, TouchableOpacity, Text, View, StyleSheet } from 'react-native';
import { lightColors } from '@/constants/colors';
import { type } from '@/constants/typography';

interface DayTabsProps {
  days: number;
  activeDay: number;
  onSelect: (day: number) => void;
}

export function DayTabs({ days, activeDay, onSelect }: DayTabsProps) {
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

const styles = StyleSheet.create({
  scroll: { marginBottom: 16 },
  row: { flexDirection: 'row', gap: 8, paddingHorizontal: 20, paddingVertical: 4 },
  tab: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
    backgroundColor: lightColors.bgSurface,
  },
  tabActive: { backgroundColor: lightColors.primary500 },
  label: { ...type.caption, color: lightColors.textSecondary },
  labelActive: { color: lightColors.textInverse },
});
