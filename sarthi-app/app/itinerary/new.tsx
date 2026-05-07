import { useState } from 'react';
import { View, Text, Alert, StyleSheet, ScrollView } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useEffect } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { LoadingSpinner } from '@/components/ui/LoadingSpinner';
import { Button } from '@/components/ui/Button';
import { DayTabs } from '@/components/trip/DayTabs';
import { ActivityCard } from '@/components/trip/ActivityCard';
import { useGenerateItinerary } from '@/hooks/useSearch';
import { useCreateTrip, useTrips } from '@/hooks/useTrips';
import { useSearchStore } from '@/stores/search.store';
import { useColors } from '@/hooks/useColorScheme';
import { tripsService } from '@/services/trips.service';
import type { Colors } from '@/constants/colors';
import { type } from '@/constants/typography';
import type { ItineraryData } from '@/types/trip.types';

export default function NewItineraryScreen() {
  const router = useRouter();
  const { destination, state } = useLocalSearchParams<{ destination: string; state: string }>();
  const { formValues } = useSearchStore();
  const colors = useColors();
  const styles = makeStyles(colors);
  const [activeDay, setActiveDay] = useState(1);
  const queryClient = useQueryClient();

  const itineraryMutation = useGenerateItinerary();
  const createTripMutation = useCreateTrip();
  const { data: existingTrips } = useTrips();

  const updateMutation = useMutation({
    mutationFn: ({ id, dto }: { id: string; dto: { itineraryData: Record<string, unknown> } }) =>
      tripsService.update(id, dto),
    onSuccess: (trip) => {
      queryClient.invalidateQueries({ queryKey: ['trips'] });
      queryClient.invalidateQueries({ queryKey: ['trip', trip.id] });
      router.replace(`/trip/${trip.id}` as any);
    },
    onError: () => Alert.alert('Error', 'Failed to save trip'),
  });

  const generate = () => {
    itineraryMutation.mutate({
      destination: destination ?? '',
      state: state ?? '',
      dates: formValues.dates ?? { from: '', to: '' },
      budget: formValues.budget ?? { min: 5000, max: 15000 },
      group: formValues.group ?? { type: 'friends' },
      departureCity: formValues.departureCity ?? '',
      freeText: formValues.freeText ?? '',
      gender: formValues.gender,
      age: formValues.age,
      weight: formValues.weight,
      height: formValues.height,
      medicalConditions: formValues.medicalConditions,
    });
  };

  useEffect(() => {
    generate();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const isSaving = createTripMutation.isPending || updateMutation.isPending;

  const handleSave = () => {
    if (!itineraryMutation.data) return;
    const data = itineraryMutation.data as unknown as Record<string, unknown>;

    const existing = existingTrips?.find(
      (t) => t.destination === destination && t.state === state,
    );

    if (existing) {
      updateMutation.mutate({ id: existing.id, dto: { itineraryData: data } });
    } else {
      createTripMutation.mutate(
        {
          destination: destination ?? '',
          state: state ?? '',
          dates: formValues.dates ?? { from: '', to: '' },
          destinationData: {},
          name: `${destination} Trip`,
          itineraryData: data,
        },
        {
          onSuccess: (trip) => router.replace(`/trip/${trip.id}` as any),
          onError: () => Alert.alert('Error', 'Failed to save trip'),
        },
      );
    }
  };

  if (itineraryMutation.isPending) {
    return <LoadingSpinner message="SarthiGo is crafting your itinerary... ✨" />;
  }

  if (itineraryMutation.isError) {
    return (
      <SafeAreaView style={styles.safe}>
        <View style={styles.centered}>
          <Text style={styles.error}>Failed to generate itinerary. Please try again.</Text>
          <Button label="Retry" onPress={generate} />
        </View>
      </SafeAreaView>
    );
  }

  if (!itineraryMutation.data) return null;

  const itinerary = itineraryMutation.data as unknown as ItineraryData;
  const days = itinerary.itinerary ?? [];
  const currentDay = days.find((d) => d.day === activeDay) ?? days[0];

  return (
    <SafeAreaView style={styles.safe}>
      <View style={styles.header}>
        <Text style={styles.title}>📅 {destination} Itinerary</Text>
        <Text style={styles.subtitle}>{itinerary.totalEstimate} · {days.length} days</Text>
      </View>

      <DayTabs days={days.length} activeDay={activeDay} onSelect={setActiveDay} />
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
            {currentDay.meals && (
              <View style={styles.mealsCard}>
                <Text style={styles.mealsTitle}>🍽️ Meals</Text>
                <Text style={styles.mealItem}>☀️ {currentDay.meals.breakfast}</Text>
                <Text style={styles.mealItem}>🌤️ {currentDay.meals.lunch}</Text>
                <Text style={styles.mealItem}>🌙 {currentDay.meals.dinner}</Text>
              </View>
            )}
          </View>
        )}

        <Button label="Save Trip" onPress={handleSave} loading={isSaving} />
      </ScrollView>
    </SafeAreaView>
  );
}

function makeStyles(colors: Colors) {
  return StyleSheet.create({
    safe: { flex: 1, backgroundColor: colors.bgBase },
    centered: { flex: 1, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 24, gap: 16 },
    header: { paddingHorizontal: 20, paddingTop: 16, paddingBottom: 8 },
    title: { ...type.screenTitle, color: colors.textPrimary },
    subtitle: { ...type.body, color: colors.textSecondary, marginTop: 2 },
    divider: { height: 1, backgroundColor: colors.border, marginHorizontal: 20, marginBottom: 4 },
    content: { padding: 20, gap: 16, paddingBottom: 40 },
    dayTitle: { ...type.cardHeading, color: colors.textPrimary, marginBottom: 12 },
    mealsCard: {
      backgroundColor: colors.bgCard,
      borderRadius: 12,
      padding: 14,
      borderWidth: 1,
      borderColor: colors.border,
      gap: 6,
      marginTop: 12,
    },
    mealsTitle: { ...type.overline, color: colors.textTertiary, marginBottom: 4 },
    mealItem: { ...type.body, color: colors.textSecondary },
    error: { ...type.body, color: colors.danger, textAlign: 'center', marginBottom: 16 },
  });
}
