import { View, Text, Alert, StyleSheet, ScrollView } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useEffect } from 'react';
import { LoadingSpinner } from '@/components/ui/LoadingSpinner';
import { Button } from '@/components/ui/Button';
import { DishCard } from '@/components/food/DishCard';
import { useGenerateFoodGuide } from '@/hooks/useSearch';
import { useTrip, useUpdateTrip } from '@/hooks/useTrips';
import { useColors } from '@/hooks/useColorScheme';
import type { Colors } from '@/constants/colors';
import { type } from '@/constants/typography';
import type { FoodGuideData } from '@/types/food.types';

export default function GenerateFoodGuideScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const colors = useColors();
  const styles = makeStyles(colors);

  const { data: trip, isLoading: tripLoading } = useTrip(id ?? '');
  const foodGuideMutation = useGenerateFoodGuide();
  const updateTripMutation = useUpdateTrip(id ?? '');

  const generate = () => {
    if (!trip) return;
    foodGuideMutation.mutate({
      destination: trip.destination,
      state: trip.state,
      dates: trip.dates,
      group: { size: 2, type: 'friends' },
      departureCity: '',
      freeText: '',
    });
  };

  useEffect(() => {
    if (trip) generate();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [trip]);

  const handleSave = () => {
    if (!foodGuideMutation.data) return;
    updateTripMutation.mutate(
      { foodGuideData: foodGuideMutation.data as unknown as Record<string, unknown> },
      {
        onSuccess: () => router.replace(`/trip/${id}/food-guide` as any),
        onError: () => Alert.alert('Error', 'Failed to save food guide'),
      },
    );
  };

  if (tripLoading || (foodGuideMutation.isPending && !foodGuideMutation.data)) {
    return <LoadingSpinner message="SarthiGo is finding the best food... 🍽️" />;
  }

  if (foodGuideMutation.isError) {
    return (
      <SafeAreaView style={styles.safe}>
        <View style={styles.centered}>
          <Text style={styles.error}>Failed to generate food guide. Please try again.</Text>
          <Button label="Retry" onPress={generate} />
        </View>
      </SafeAreaView>
    );
  }

  if (!foodGuideMutation.data || !trip) return null;

  const guide = foodGuideMutation.data as unknown as FoodGuideData;

  return (
    <SafeAreaView style={styles.safe}>
      <View style={styles.header}>
        <Text style={styles.title}>🍽️ {trip.destination} Food Guide</Text>
        <Text style={styles.subtitle}>{guide.overview}</Text>
      </View>
      <View style={styles.divider} />

      <ScrollView contentContainerStyle={styles.content}>
        {guide.mustTryDishes?.length > 0 && (
          <View>
            <Text style={styles.section}>Must-Try Dishes</Text>
            {guide.mustTryDishes.map((dish, i) => (
              <DishCard key={i} dish={dish} />
            ))}
          </View>
        )}

        {guide.streetFood?.items?.length > 0 && (
          <View>
            <Text style={styles.section}>Street Food</Text>
            {guide.streetFood.safetyTips?.map((tip, i) => (
              <Text key={i} style={styles.safetyTip}>⚠️ {tip}</Text>
            ))}
            {guide.streetFood.items.map((item, i) => (
              <View key={i} style={styles.streetItem}>
                <Text style={styles.streetName}>{item.name}</Text>
                <Text style={styles.streetMeta}>📍 {item.where} · {item.price}</Text>
                {item.healthNote ? <Text style={styles.streetSafety}>{item.healthNote}</Text> : null}
              </View>
            ))}
          </View>
        )}

        {guide.dietaryInfo && (
          <View style={styles.dietaryCard}>
            <Text style={styles.section}>Dietary Info</Text>
            <Text style={styles.dietaryItem}>🌱 {guide.dietaryInfo.vegFriendly}</Text>
            <Text style={styles.dietaryItem}>🌿 {guide.dietaryInfo.veganOptions}</Text>
            {guide.dietaryInfo.halalAvailability ? (
              <Text style={styles.dietaryItem}>☪️ {guide.dietaryInfo.halalAvailability}</Text>
            ) : null}
            {guide.dietaryInfo.waterAdvice ? (
              <Text style={styles.dietaryItem}>💧 {guide.dietaryInfo.waterAdvice}</Text>
            ) : null}
          </View>
        )}

        <Button
          label="Save Food Guide to Trip"
          onPress={handleSave}
          loading={updateTripMutation.isPending}
        />
      </ScrollView>
    </SafeAreaView>
  );
}

function makeStyles(colors: Colors) {
  return StyleSheet.create({
    safe: { flex: 1, backgroundColor: colors.bgBase },
    centered: { flex: 1, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 24, gap: 16 },
    header: { paddingHorizontal: 20, paddingTop: 16, paddingBottom: 12 },
    divider: { height: 1, backgroundColor: colors.border, marginHorizontal: 20, marginBottom: 4 },
    title: { ...type.screenTitle, color: colors.textPrimary },
    subtitle: { ...type.body, color: colors.textSecondary, marginTop: 4 },
    content: { padding: 20, gap: 8, paddingBottom: 40 },
    section: { ...type.overline, color: colors.textSecondary, marginTop: 8, marginBottom: 8 },
    safetyTip: { ...type.caption, color: colors.warning, marginBottom: 6 },
    streetItem: {
      backgroundColor: colors.bgCard,
      borderRadius: 10,
      padding: 12,
      marginBottom: 8,
      borderWidth: 1,
      borderColor: colors.border,
      gap: 4,
    },
    streetName: { ...type.body, color: colors.textPrimary, fontFamily: 'Inter_600SemiBold' },
    streetMeta: { ...type.caption, color: colors.textSecondary },
    streetSafety: { ...type.caption, color: colors.warning },
    dietaryCard: {
      backgroundColor: colors.bgCard,
      borderRadius: 12,
      padding: 14,
      borderWidth: 1,
      borderColor: colors.border,
      gap: 6,
      marginTop: 8,
    },
    dietaryItem: { ...type.body, color: colors.textSecondary },
    error: { ...type.body, color: colors.danger, textAlign: 'center', marginBottom: 16 },
  });
}
