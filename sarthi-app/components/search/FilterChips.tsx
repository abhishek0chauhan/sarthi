import { ScrollView, TouchableOpacity, Text, View, StyleSheet } from 'react-native';
import { lightColors } from '@/constants/colors';
import { type } from '@/constants/typography';

const EXPERIENCE_TYPES = [
  { key: 'nature', icon: '🌿' },
  { key: 'adventure', icon: '🏔️' },
  { key: 'food', icon: '🍽️' },
  { key: 'culture', icon: '🏛️' },
  { key: 'spiritual', icon: '🪷' },
  { key: 'photography', icon: '📷' },
  { key: 'nightlife', icon: '🌙' },
  { key: 'shopping', icon: '🛍️' },
  { key: 'relaxation', icon: '💧' },
] as const;

const LABELS: Record<string, string> = {
  nature: 'Nature', adventure: 'Adventure', food: 'Food', culture: 'Culture',
  spiritual: 'Spiritual', photography: 'Photography', nightlife: 'Nightlife',
  shopping: 'Shopping', relaxation: 'Relaxation',
};

interface FilterChipsProps {
  selected: string[];
  onToggle: (type: string) => void;
}

export function FilterChips({ selected, onToggle }: FilterChipsProps) {
  return (
    <ScrollView horizontal showsHorizontalScrollIndicator={false}>
      <View style={styles.row}>
        {EXPERIENCE_TYPES.map(({ key, icon }) => {
          const isSelected = selected.includes(key);
          return (
            <TouchableOpacity
              key={key}
              onPress={() => onToggle(key)}
              style={[styles.chip, isSelected && styles.chipSelected]}
            >
              <Text style={styles.icon}>{icon}</Text>
              <Text style={[styles.label, isSelected && styles.labelSelected]}>
                {LABELS[key]}
              </Text>
            </TouchableOpacity>
          );
        })}
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: 'row', gap: 8, paddingVertical: 2 },
  chip: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 20,
    borderWidth: 1.5,
    borderColor: lightColors.border,
    backgroundColor: lightColors.bgCard,
    gap: 4,
  },
  chipSelected: {
    backgroundColor: lightColors.primary500,
    borderColor: lightColors.primary500,
  },
  icon: { fontSize: 14 },
  label: { ...type.caption, color: lightColors.textSecondary },
  labelSelected: { color: lightColors.textInverse },
});
