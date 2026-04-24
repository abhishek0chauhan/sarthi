import { View, Text, Alert, StyleSheet } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useEffect } from 'react';
import { LoadingSpinner } from '@/components/ui/LoadingSpinner';
import { Button } from '@/components/ui/Button';
import { useGenerateFoodGuide } from '@/hooks/useSearch';
import { useCreateTrip } from '@/hooks/useTrips';
import { useSearchStore } from '@/stores/search.store';
import { useColors } from '@/hooks/useColorScheme';
import type { Colors } from '@/constants/colors';
import { type } from '@/constants/typography';

export default function NewFoodGuideScreen() {
  const router = useRouter();
  const { destination, state } = useLocalSearchParams<{ destination: string; state: string }>();
  const { formValues } = useSearchStore();
  const colors = useColors();
  const styles = makeStyles(colors);

  const foodGuideMutation = useGenerateFoodGuide();
  const createTripMutation = useCreateTrip();

  useEffect(() => {
    if (!foodGuideMutation.data && !foodGuideMutation.isPending) {
      foodGuideMutation.mutate({
        destination: destination ?? '',
        state: state ?? '',
        dates: formValues.dates ?? { from: '', to: '' },
        group: formValues.group ?? { size: 2, type: 'friends' },
        departureCity: formValues.departureCity ?? '',
        freeText: formValues.freeText ?? '',
        dietType: formValues.dietType,
        spiceTolerance: formValues.spiceTolerance,
        foodBudget: formValues.foodBudget,
        allergies: formValues.allergies,
      });
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const handleSave = () => {
    if (!foodGuideMutation.data) return;
    createTripMutation.mutate(
      {
        destination: destination ?? '',
        state: state ?? '',
        dates: formValues.dates ?? { from: '', to: '' },
        destinationData: {},
        name: `${destination} Trip`,
        foodGuideData: foodGuideMutation.data as unknown as Record<string, unknown>,
      },
      {
        onSuccess: (trip) => { router.replace(`/trip/${trip.id}` as any); },
        onError: () => { Alert.alert('Error', 'Failed to save trip'); },
      },
    );
  };

  if (foodGuideMutation.isPending) {
    return <LoadingSpinner message="Sarthi is finding the best food... 🍽️" />;
  }

  if (foodGuideMutation.isError) {
    return (
      <SafeAreaView style={styles.centered}>
        <Text style={styles.error}>Failed to generate food guide. Please try again.</Text>
        <Button label="Retry" onPress={() => foodGuideMutation.reset()} />
      </SafeAreaView>
    );
  }

  const dishCount = (foodGuideMutation.data as any)?.mustTryDishes?.length ?? 0;

  return (
    <SafeAreaView style={styles.safe}>
      <View style={styles.centered}>
        <Text style={styles.emoji}>🍽️</Text>
        <Text style={styles.title}>Food guide ready!</Text>
        <Text style={styles.subtitle}>
          {dishCount} must-try dishes in {destination}
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

function makeStyles(colors: Colors) {
  return StyleSheet.create({
    safe: { flex: 1, backgroundColor: colors.bgBase },
    centered: { flex: 1, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 24, gap: 16 },
    emoji: { fontSize: 48 },
    title: { ...type.screenTitle, color: colors.textPrimary, textAlign: 'center' },
    subtitle: { ...type.body, color: colors.textSecondary, textAlign: 'center', marginBottom: 8 },
    error: { ...type.body, color: colors.danger, textAlign: 'center', marginBottom: 16 },
  });
}
