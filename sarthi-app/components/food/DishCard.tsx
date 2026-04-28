import { View, Text, StyleSheet } from 'react-native';
import { useColors } from '@/hooks/useColorScheme';
import type { Colors } from '@/constants/colors';
import { type } from '@/constants/typography';
import type { Dish } from '@/types/food.types';

export function DishCard({ dish }: { dish: Dish }) {
  const colors = useColors();
  const styles = makeStyles(colors);

  return (
    <View style={styles.card}>
      <View style={styles.header}>
        <Text style={styles.name}>{dish.name}</Text>
        <Text style={styles.cost}>{dish.priceRange}</Text>
      </View>
      <Text style={styles.description}>{dish.description}</Text>
      <Text style={styles.meta}>📍 {dish.where} · 🌶️ {dish.spiceLevel}</Text>
      {dish.allergyAlert && (
        <Text style={styles.warning}>⚠️ {dish.allergyAlert}</Text>
      )}
    </View>
  );
}

function makeStyles(colors: Colors) {
  return StyleSheet.create({
    card: {
      backgroundColor: colors.bgCard,
      borderRadius: 12,
      padding: 14,
      marginBottom: 10,
      borderWidth: 1,
      borderColor: colors.border,
      gap: 6,
    },
    header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start' },
    name: { ...type.body, color: colors.textPrimary, fontFamily: 'Inter_600SemiBold', flex: 1 },
    cost: { ...type.caption, color: colors.primary500, fontFamily: 'Inter_600SemiBold' },
    description: { ...type.caption, color: colors.textSecondary },
    meta: { ...type.caption, color: colors.textTertiary },
    warning: { ...type.caption, color: colors.warning },
  });
}
