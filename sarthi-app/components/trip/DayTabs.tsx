import { ScrollView, TouchableOpacity, Text, StyleSheet } from 'react-native';
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
    <ScrollView
      horizontal
      showsHorizontalScrollIndicator={false}
      style={styles.scroll}
      contentContainerStyle={styles.row}
    >
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
    </ScrollView>
  );
}

function makeStyles(colors: Colors) {
  return StyleSheet.create({
    scroll: {
      flexShrink: 0,
      backgroundColor: colors.bgBase,
    },
    row: {
      flexDirection: 'row',
      gap: 8,
      paddingHorizontal: 20,
      paddingVertical: 12,
      alignItems: 'center',
    },
    tab: {
      paddingHorizontal: 18,
      paddingVertical: 8,
      borderRadius: 20,
      backgroundColor: colors.bgSurface,
      borderWidth: 1,
      borderColor: colors.border,
    },
    tabActive: {
      backgroundColor: colors.primary500,
      borderColor: colors.primary500,
    },
    label: { ...type.body, color: colors.textSecondary },
    labelActive: { ...type.body, color: colors.textInverse, fontFamily: 'Inter_600SemiBold' },
  });
}
