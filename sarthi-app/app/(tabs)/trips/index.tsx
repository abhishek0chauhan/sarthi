import { FlatList, View, Text, Pressable, StyleSheet, Alert } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { useTrips, useDeleteTrip } from '@/hooks/useTrips';
import { EmptyState } from '@/components/ui/EmptyState';
import { SkeletonCard } from '@/components/ui/SkeletonCard';
import { useColors } from '@/hooks/useColorScheme';
import type { Colors } from '@/constants/colors';
import { type } from '@/constants/typography';
import type { TripSummary } from '@/types/trip.types';

function TripCard({ trip, onPress, onDelete, styles }: {
  trip: TripSummary;
  onPress: () => void;
  onDelete: () => void;
  styles: ReturnType<typeof makeStyles>;
}) {
  return (
    <Pressable style={styles.card} onPress={onPress}>
      <View style={styles.cardHeader}>
        <View style={styles.cardInfo}>
          <Text style={styles.tripName}>{trip.name}</Text>
          <Text style={styles.tripDest}>{trip.destination}, {trip.state}</Text>
          <Text style={styles.tripDates}>{trip.dates.from} → {trip.dates.to}</Text>
        </View>
        <Pressable onPress={onDelete} style={styles.deleteBtn} hitSlop={8}>
          <Text style={styles.deleteIcon}>🗑️</Text>
        </Pressable>
      </View>
      <View style={styles.badges}>
        {trip.hasItinerary && <Text style={styles.badge}>📅 Itinerary</Text>}
        {trip.hasFoodGuide && <Text style={styles.badge}>🍽️ Food Guide</Text>}
        {trip.travelMode && <Text style={styles.badge}>🚀 {trip.travelMode}</Text>}
      </View>
    </Pressable>
  );
}

export default function TripsScreen() {
  const router = useRouter();
  const { data: trips, isLoading, error, refetch } = useTrips();
  const deleteMutation = useDeleteTrip();
  const colors = useColors();
  const styles = makeStyles(colors);

  const handleDelete = (id: string, name: string) => {
    Alert.alert('Delete Trip', `Delete "${name}"?`, [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Delete',
        style: 'destructive',
        onPress: () => deleteMutation.mutate(id),
      },
    ]);
  };

  if (isLoading) {
    return (
      <SafeAreaView style={styles.safe}>
        <View style={styles.content}>
          {[1, 2, 3].map((i) => <SkeletonCard key={i} lines={3} />)}
        </View>
      </SafeAreaView>
    );
  }

  if (error) {
    const isNetworkError = error instanceof Error && (
      error.message.includes('fetch') || error.message.includes('network') || error.message.includes('Failed')
    );
    return (
      <EmptyState
        title="Backend unavailable"
        description={isNetworkError
          ? "The Sarthi server isn't reachable right now. In Expo Go dev mode, trips require the backend to be running."
          : "Couldn't load trips. Check your connection and try again."}
        action={
          <Pressable onPress={() => refetch()} style={styles.retryBtn}>
            <Text style={styles.retryText}>Retry</Text>
          </Pressable>
        }
      />
    );
  }

  return (
    <SafeAreaView style={styles.safe}>
      <FlatList
        data={trips ?? []}
        keyExtractor={(t) => t.id}
        contentContainerStyle={styles.content}
        ListHeaderComponent={<Text style={styles.heading}>My Trips</Text>}
        ListEmptyComponent={
          <EmptyState
            title="No trips yet"
            description="Search for a destination and generate your first itinerary."
          />
        }
        renderItem={({ item }) => (
          <TripCard
            trip={item}
            styles={styles}
            onPress={() => router.push(`/trip/${item.id}` as any)}
            onDelete={() => handleDelete(item.id, item.name)}
          />
        )}
        onRefresh={refetch}
        refreshing={isLoading}
      />
    </SafeAreaView>
  );
}

function makeStyles(colors: Colors) {
  return StyleSheet.create({
    safe: { flex: 1, backgroundColor: colors.bgBase },
    content: { padding: 20 },
    heading: { ...type.screenTitle, color: colors.textPrimary, marginBottom: 16 },
    card: {
      backgroundColor: colors.bgCard,
      borderRadius: 16,
      padding: 16,
      marginBottom: 12,
      borderWidth: 1,
      borderColor: colors.border,
      gap: 10,
    },
    cardHeader: { flexDirection: 'row', justifyContent: 'space-between' },
    cardInfo: { flex: 1, gap: 3 },
    tripName: { ...type.body, fontFamily: 'Inter_600SemiBold', color: colors.textPrimary },
    tripDest: { ...type.body, color: colors.textSecondary },
    tripDates: { ...type.caption, color: colors.textTertiary },
    deleteBtn: { padding: 4 },
    deleteIcon: { fontSize: 18 },
    badges: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
    badge: { ...type.caption, color: colors.textSecondary },
    retryBtn: { backgroundColor: colors.primary500, paddingHorizontal: 24, paddingVertical: 10, borderRadius: 10 },
    retryText: { ...type.body, color: colors.textInverse, fontFamily: 'Inter_600SemiBold' },
  });
}
