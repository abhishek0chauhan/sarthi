import { useState } from 'react';
import { ScrollView, View, Text, StyleSheet } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useLocalSearchParams } from 'expo-router';
import { useTrip } from '@/hooks/useTrips';
import { LoadingSpinner } from '@/components/ui/LoadingSpinner';
import { EmptyState } from '@/components/ui/EmptyState';
import { DayTabs } from '@/components/trip/DayTabs';
import { ActivityCard } from '@/components/trip/ActivityCard';
import { CostBreakdown } from '@/components/trip/CostBreakdown';
import { useColors } from '@/hooks/useColorScheme';
import type { Colors } from '@/constants/colors';
import { type } from '@/constants/typography';
import type { ItineraryData } from '@/types/trip.types';

export default function TripItineraryScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const { data: trip, isLoading } = useTrip(id ?? '');
  const [activeDay, setActiveDay] = useState(1);
  const colors = useColors();
  const styles = makeStyles(colors);

  if (isLoading) return <LoadingSpinner />;
  if (!trip?.itineraryData) return <EmptyState title="No itinerary" />;

  const itinerary = trip.itineraryData as unknown as ItineraryData;
  const days = itinerary.itinerary ?? [];
  const currentDay = days.find((d) => d.day === activeDay) ?? days[0];

  return (
    <SafeAreaView style={styles.safe}>
      <DayTabs
        days={days.length}
        activeDay={activeDay}
        onSelect={setActiveDay}
      />
      <View style={styles.divider} />
      <ScrollView contentContainerStyle={styles.content}>
        {currentDay && (
          <View>
            <Text style={styles.dayTitle}>Day {currentDay.day}: {currentDay.title}</Text>
            {currentDay.activities.map((activity, i) => (
              <ActivityCard
                key={i}
                activity={activity}
                isLast={i === currentDay.activities.length - 1}
              />
            ))}
          </View>
        )}
        {activeDay === days.length && itinerary.costBreakdown && (
          <CostBreakdown breakdown={itinerary.costBreakdown} />
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

function makeStyles(colors: Colors) {
  return StyleSheet.create({
    safe: { flex: 1, backgroundColor: colors.bgBase },
    divider: { height: 1, backgroundColor: colors.border, marginHorizontal: 20, marginBottom: 4 },
    content: { padding: 20, gap: 16 },
    dayTitle: { ...type.screenTitle, color: colors.textPrimary, marginBottom: 16 },
    dayTotal: { ...type.caption, color: colors.textSecondary, textAlign: 'right', marginTop: 8 },
  });
}
