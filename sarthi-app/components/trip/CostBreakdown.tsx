import { View, Text, StyleSheet } from 'react-native';
import { useColors } from '@/hooks/useColorScheme';
import type { Colors } from '@/constants/colors';
import { type } from '@/constants/typography';

interface CostBreakdownProps {
  breakdown: { transport: string; stay: string; food: string; activities: string; total: string };
}

const ITEMS = [
  { key: 'transport' as const, icon: '🚆', label: 'Transport' },
  { key: 'stay' as const, icon: '🏨', label: 'Stay' },
  { key: 'food' as const, icon: '🍽️', label: 'Food' },
  { key: 'activities' as const, icon: '🎯', label: 'Activities' },
];

export function CostBreakdown({ breakdown }: CostBreakdownProps) {
  const colors = useColors();
  const styles = makeStyles(colors);

  return (
    <View style={styles.card}>
      <Text style={styles.title}>Cost Breakdown</Text>
      {ITEMS.map(({ key, icon, label }) => (
        <View key={key} style={styles.row}>
          <Text style={styles.rowLabel}>{icon} {label}</Text>
          <Text style={styles.rowValue}>{breakdown[key]}</Text>
        </View>
      ))}
      <View style={styles.totalRow}>
        <Text style={styles.totalLabel}>Total</Text>
        <Text style={styles.totalValue}>{breakdown.total}</Text>
      </View>
    </View>
  );
}

function makeStyles(colors: Colors) {
  return StyleSheet.create({
    card: {
      backgroundColor: colors.bgCard,
      borderRadius: 16,
      padding: 16,
      borderWidth: 1,
      borderColor: colors.border,
      gap: 2,
    },
    title: { ...type.body, color: colors.textPrimary, fontFamily: 'Inter_600SemiBold', marginBottom: 8 },
    row: { flexDirection: 'row', justifyContent: 'space-between', paddingVertical: 8, borderBottomWidth: 1, borderBottomColor: colors.border },
    rowLabel: { ...type.body, color: colors.textSecondary },
    rowValue: { ...type.body, color: colors.textPrimary },
    totalRow: { flexDirection: 'row', justifyContent: 'space-between', paddingTop: 10 },
    totalLabel: { ...type.body, color: colors.textPrimary, fontFamily: 'Inter_700Bold' },
    totalValue: { ...type.body, color: colors.primary500, fontFamily: 'Inter_700Bold' },
  });
}
