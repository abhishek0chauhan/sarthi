import { View, Text, StyleSheet } from 'react-native';
import { lightColors } from '@/constants/colors';
import { type } from '@/constants/typography';
import type { Dish } from '@/types/food.types';

export function DishCard({ dish }: { dish: Dish }) {
  return (
    <View style={styles.card}>
      <View style={styles.header}>
        <Text style={styles.name}>{dish.name}</Text>
        <Text style={styles.cost}>{dish.cost}</Text>
      </View>
      <Text style={styles.description}>{dish.description}</Text>
      <Text style={styles.meta}>📍 {dish.where} · 🌶️ {dish.spiceLevel}</Text>
      {dish.allergyWarning && (
        <Text style={styles.warning}>⚠️ {dish.allergyWarning}</Text>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: lightColors.bgCard,
    borderRadius: 12,
    padding: 14,
    marginBottom: 10,
    borderWidth: 1,
    borderColor: lightColors.border,
    gap: 6,
  },
  header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start' },
  name: { ...type.body, color: lightColors.textPrimary, fontFamily: 'Inter_600SemiBold', flex: 1 },
  cost: { ...type.caption, color: lightColors.primary500, fontFamily: 'Inter_600SemiBold' },
  description: { ...type.caption, color: lightColors.textSecondary },
  meta: { ...type.caption, color: lightColors.textTertiary },
  warning: { ...type.caption, color: lightColors.warning },
});
