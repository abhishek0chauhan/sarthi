import { View, Text, ScrollView, Pressable, StyleSheet, Share } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useTrip, useDeleteTrip } from '@/hooks/useTrips';
import { LoadingSpinner } from '@/components/ui/LoadingSpinner';
import { EmptyState } from '@/components/ui/EmptyState';
import { Button } from '@/components/ui/Button';
import { lightColors } from '@/constants/colors';
import { type } from '@/constants/typography';

export default function TripDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const { data: trip, isLoading, error } = useTrip(id ?? '');

  if (isLoading) return <LoadingSpinner />;
  if (error || !trip) return <EmptyState title="Trip not found" />;

  return (
    <SafeAreaView style={styles.safe}>
      <ScrollView contentContainerStyle={styles.content}>
        <View style={styles.header}>
          <Pressable onPress={() => router.back()} style={styles.backBtn}>
            <Text style={styles.backIcon}>←</Text>
          </Pressable>
          <View style={styles.headerInfo}>
            <Text style={styles.name}>{trip.name}</Text>
            <Text style={styles.dest}>{trip.destination}, {trip.state}</Text>
            <Text style={styles.dates}>{trip.dates.from} → {trip.dates.to}</Text>
          </View>
        </View>

        <View style={styles.actions}>
          {trip.itineraryData && (
            <View style={styles.actionBtn}>
              <Button
                label="📅 Itinerary"
                onPress={() => router.push(`/trip/${id}/itinerary` as any)}
              />
            </View>
          )}
          {trip.foodGuideData && (
            <View style={styles.actionBtn}>
              <Button
                label="🍽️ Food Guide"
                onPress={() => router.push(`/trip/${id}/food-guide` as any)}
                variant="secondary"
              />
            </View>
          )}
        </View>

        <View style={styles.actionBtn}>
          <Button
            label="🔗 Share Trip"
            onPress={() => router.push(`/trip/${id}/share` as any)}
            variant="ghost"
          />
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: lightColors.bgBase },
  content: { padding: 20, gap: 20 },
  header: { flexDirection: 'row', gap: 12 },
  backBtn: {
    width: 36, height: 36, borderRadius: 10,
    backgroundColor: lightColors.bgSurface,
    alignItems: 'center', justifyContent: 'center',
  },
  backIcon: { fontSize: 16, color: lightColors.textPrimary },
  headerInfo: { flex: 1, gap: 4 },
  name: { ...type.screenTitle, color: lightColors.textPrimary },
  dest: { ...type.body, color: lightColors.textSecondary },
  dates: { ...type.caption, color: lightColors.textTertiary },
  actions: { flexDirection: 'row', gap: 10 },
  actionBtn: { flex: 1 },
});
