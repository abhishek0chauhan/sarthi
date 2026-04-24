import { ScrollView, View, Text, StyleSheet } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useLocalSearchParams } from 'expo-router';
import { useTrip } from '@/hooks/useTrips';
import { LoadingSpinner } from '@/components/ui/LoadingSpinner';
import { EmptyState } from '@/components/ui/EmptyState';
import { DishCard } from '@/components/food/DishCard';
import { lightColors } from '@/constants/colors';
import { type } from '@/constants/typography';
import type { FoodGuideData } from '@/types/food.types';

export default function TripFoodGuideScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const { data: trip, isLoading } = useTrip(id ?? '');

  if (isLoading) return <LoadingSpinner />;
  if (!trip?.foodGuideData) return <EmptyState title="No food guide" />;

  const guide = trip.foodGuideData as unknown as FoodGuideData;

  return (
    <SafeAreaView style={styles.safe}>
      <ScrollView contentContainerStyle={styles.content}>
        <Text style={styles.section}>Overview</Text>
        <Text style={styles.overview}>{guide.overview}</Text>

        <Text style={styles.section}>Must-Try Dishes</Text>
        {guide.mustTryDishes.map((dish, i) => (
          <DishCard key={i} dish={dish} />
        ))}

        {guide.streetFood?.items?.length > 0 && (
          <View>
            <Text style={styles.section}>Street Food</Text>
            <Text style={styles.safetyTip}>⚠️ {guide.streetFood.safetyTips}</Text>
            {guide.streetFood.items.map((item, i) => (
              <View key={i} style={styles.streetItem}>
                <Text style={styles.streetName}>{item.name}</Text>
                <Text style={styles.streetMeta}>📍 {item.where} · {item.cost}</Text>
                {item.safetyTip && <Text style={styles.streetSafety}>{item.safetyTip}</Text>}
              </View>
            ))}
          </View>
        )}

        <View style={styles.dietaryCard}>
          <Text style={styles.section}>Dietary Info</Text>
          <Text style={styles.dietaryItem}>🌱 {guide.dietaryInfo.vegFriendly}</Text>
          <Text style={styles.dietaryItem}>🌿 {guide.dietaryInfo.veganOptions}</Text>
          {guide.dietaryInfo.halalOptions && (
            <Text style={styles.dietaryItem}>☪️ {guide.dietaryInfo.halalOptions}</Text>
          )}
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: lightColors.bgBase },
  content: { padding: 20, gap: 8 },
  section: { ...type.overline, color: lightColors.textSecondary, marginTop: 16, marginBottom: 8 },
  overview: { ...type.body, color: lightColors.textPrimary },
  safetyTip: { ...type.caption, color: lightColors.warning, marginBottom: 8 },
  streetItem: {
    backgroundColor: lightColors.bgCard,
    borderRadius: 10,
    padding: 12,
    marginBottom: 8,
    borderWidth: 1,
    borderColor: lightColors.border,
    gap: 4,
  },
  streetName: { ...type.body, color: lightColors.textPrimary, fontFamily: 'Inter_600SemiBold' },
  streetMeta: { ...type.caption, color: lightColors.textSecondary },
  streetSafety: { ...type.caption, color: lightColors.warning },
  dietaryCard: {
    backgroundColor: lightColors.bgCard,
    borderRadius: 12,
    padding: 14,
    borderWidth: 1,
    borderColor: lightColors.border,
    gap: 6,
    marginTop: 8,
  },
  dietaryItem: { ...type.body, color: lightColors.textSecondary },
});
