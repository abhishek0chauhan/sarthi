import { View, Text, Alert, StyleSheet } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useEffect } from 'react';
import { LoadingSpinner } from '@/components/ui/LoadingSpinner';
import { Button } from '@/components/ui/Button';
import { useGenerateItinerary } from '@/hooks/useSearch';
import { useCreateTrip } from '@/hooks/useTrips';
import { useSearchStore } from '@/stores/search.store';
import { lightColors } from '@/constants/colors';
import { type } from '@/constants/typography';

export default function NewItineraryScreen() {
  const router = useRouter();
  const { destination, state } = useLocalSearchParams<{ destination: string; state: string }>();
  const { formValues } = useSearchStore();

  const itineraryMutation = useGenerateItinerary();
  const createTripMutation = useCreateTrip();

  useEffect(() => {
    if (!itineraryMutation.data && !itineraryMutation.isPending) {
      itineraryMutation.mutate({
        destination: destination ?? '',
        state: state ?? '',
        dates: formValues.dates ?? { from: '', to: '' },
        budget: formValues.budget ?? { min: 5000, max: 15000 },
        group: formValues.group ?? { size: 2, type: 'friends' },
        departureCity: formValues.departureCity ?? '',
        freeText: formValues.freeText ?? '',
        gender: formValues.gender,
        age: formValues.age,
        weight: formValues.weight,
        height: formValues.height,
        medicalConditions: formValues.medicalConditions,
      });
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const handleSave = () => {
    if (!itineraryMutation.data) return;
    createTripMutation.mutate(
      {
        destination: destination ?? '',
        state: state ?? '',
        dates: formValues.dates ?? { from: '', to: '' },
        destinationData: {},
        name: `${destination} Trip`,
        itineraryData: itineraryMutation.data as unknown as Record<string, unknown>,
      },
      {
        onSuccess: (trip) => { router.replace(`/trip/${trip.id}` as any); },
        onError: () => { Alert.alert('Error', 'Failed to save trip'); },
      },
    );
  };

  if (itineraryMutation.isPending) {
    return <LoadingSpinner message="Sarthi is crafting your itinerary... ✨" />;
  }

  if (itineraryMutation.isError) {
    return (
      <SafeAreaView style={styles.centered}>
        <Text style={styles.error}>Failed to generate itinerary. Please try again.</Text>
        <Button label="Retry" onPress={() => itineraryMutation.reset()} />
      </SafeAreaView>
    );
  }

  const days = (itineraryMutation.data as any)?.days?.length ?? 0;

  return (
    <SafeAreaView style={styles.safe}>
      <View style={styles.centered}>
        <Text style={styles.emoji}>🗓️</Text>
        <Text style={styles.title}>Itinerary ready!</Text>
        <Text style={styles.subtitle}>
          {days} days planned for {destination}
        </Text>
        <Button
          label="Save Trip"
          onPress={handleSave}
          loading={createTripMutation.isPending}
        />
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: lightColors.bgBase },
  centered: { flex: 1, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 24, gap: 16 },
  emoji: { fontSize: 48 },
  title: { ...type.screenTitle, color: lightColors.textPrimary, textAlign: 'center' },
  subtitle: { ...type.body, color: lightColors.textSecondary, textAlign: 'center', marginBottom: 8 },
  error: { ...type.body, color: lightColors.danger, textAlign: 'center', marginBottom: 16 },
});
