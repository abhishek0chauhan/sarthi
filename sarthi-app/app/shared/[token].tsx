import { useEffect, useState } from 'react';
import { ScrollView, View, Text, StyleSheet } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useLocalSearchParams } from 'expo-router';
import { sharedService } from '@/services/shared.service';
import { LoadingSpinner } from '@/components/ui/LoadingSpinner';
import { EmptyState } from '@/components/ui/EmptyState';
import { DishCard } from '@/components/food/DishCard';
import { ActivityCard } from '@/components/trip/ActivityCard';
import { lightColors } from '@/constants/colors';
import { type } from '@/constants/typography';
import type { SavedTrip } from '@/types/trip.types';
import type { FoodGuideData } from '@/types/food.types';
import type { ItineraryData } from '@/types/trip.types';

export default function SharedTripScreen() {
  const { token } = useLocalSearchParams<{ token: string }>();
  const [trip, setTrip] = useState<SavedTrip | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);

  useEffect(() => {
    if (!token) return;
    sharedService.getByToken(token)
      .then(setTrip)
      .catch(() => setError(true))
      .finally(() => setLoading(false));
  }, [token]);

  if (loading) return <LoadingSpinner message="Loading shared trip..." />;
  if (error || !trip) return <EmptyState title="Trip not found" description="This link may have expired." />;

  const itinerary = trip.itineraryData as unknown as ItineraryData | undefined;
  const foodGuide = trip.foodGuideData as unknown as FoodGuideData | undefined;

  return (
    <SafeAreaView style={styles.safe}>
      <ScrollView contentContainerStyle={styles.content}>
        <View style={styles.header}>
          <Text style={styles.title}>{trip.name}</Text>
          <Text style={styles.dest}>{trip.destination}, {trip.state}</Text>
          <Text style={styles.dates}>{trip.dates.from} → {trip.dates.to}</Text>
        </View>

        {itinerary && (
          <View>
            <Text style={styles.section}>Itinerary</Text>
            {itinerary.days.map((day) => (
              <View key={day.day} style={styles.dayBlock}>
                <Text style={styles.dayTitle}>Day {day.day}: {day.title}</Text>
                {day.activities.map((activity, i) => (
                  <ActivityCard
                    key={i}
                    activity={activity}
                    isLast={i === day.activities.length - 1}
                  />
                ))}
              </View>
            ))}
          </View>
        )}

        {foodGuide && (
          <View>
            <Text style={styles.section}>Must-Try Dishes</Text>
            {foodGuide.mustTryDishes.map((dish, i) => (
              <DishCard key={i} dish={dish} />
            ))}
          </View>
        )}

        <Text style={styles.footer}>Shared via Sarthi 🧭</Text>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: lightColors.bgBase },
  content: { padding: 20, gap: 16 },
  header: { gap: 4, marginBottom: 8 },
  title: { ...type.screenTitle, color: lightColors.textPrimary },
  dest: { ...type.body, color: lightColors.textSecondary },
  dates: { ...type.caption, color: lightColors.textTertiary },
  section: { ...type.overline, color: lightColors.textSecondary, marginBottom: 12 },
  dayBlock: { marginBottom: 16 },
  dayTitle: { ...type.body, color: lightColors.textPrimary, fontFamily: 'Inter_600SemiBold', marginBottom: 8 },
  footer: { ...type.caption, color: lightColors.textTertiary, textAlign: 'center', marginTop: 16 },
});
