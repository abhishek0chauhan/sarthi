import { FlatList, View, Text, Pressable, StyleSheet, Alert } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { LinearGradient } from 'expo-linear-gradient';
import { useTrips, useDeleteTrip } from '@/hooks/useTrips';
import { EmptyState } from '@/components/ui/EmptyState';
import { SkeletonCard } from '@/components/ui/SkeletonCard';
import { useColors } from '@/hooks/useColorScheme';
import type { Colors } from '@/constants/colors';
import { type } from '@/constants/typography';
import type { TripSummary } from '@/types/trip.types';
import { destinationGradient } from '@/utils/destinationGradient';

function TripCard({ trip, onPress, onDelete, styles }: {
  trip: TripSummary;
  onPress: () => void;
  onDelete: () => void;
  styles: ReturnType<typeof makeStyles>;
}) {
  const gradientColors = destinationGradient(trip.destination) as [string, string, string];

  return (
    <Pressable style={styles.card} onPress={onPress}>
      {/* Gradient hero */}
      <LinearGradient colors={gradientColors} style={styles.hero}>
        {/* Destination name overlaid bottom-left */}
        <View style={styles.heroOverlay}>
          <Text style={styles.heroDestination}>{trip.destination}</Text>
          {trip.state ? <Text style={styles.heroState}>{trip.state}</Text> : null}
        </View>
        {/* Delete button top-right */}
        <Pressable onPress={onDelete} style={styles.heroDeleteBtn} hitSlop={8}>
          <Text style={styles.deleteIcon}>🗑️</Text>
        </Pressable>
      </LinearGradient>

      {/* Card body */}
      <View style={styles.cardBody}>
        <Text style={styles.tripName}>{trip.name}</Text>
        <View style={styles.metaRow}>
          <Text style={styles.tripDates}>{trip.dates.from} → {trip.dates.to}</Text>
        </View>
        <View style={styles.badges}>
          <View style={[styles.statusPill, trip.hasItinerary ? styles.pillGreen : styles.pillGrey]}>
            <Text style={styles.pillText}>{trip.hasItinerary ? '✅ Itinerary' : '— Itinerary'}</Text>
          </View>
          <View style={[styles.statusPill, trip.hasFoodGuide ? styles.pillGreen : styles.pillGrey]}>
            <Text style={styles.pillText}>{trip.hasFoodGuide ? '✅ Food' : '— Food'}</Text>
          </View>
        </View>
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
        ListHeaderComponent={
          <View style={styles.headerBlock}>
            <Text style={styles.heading}>My Trips</Text>
            <Text style={styles.subheading}>{(trips ?? []).length} trip{(trips ?? []).length !== 1 ? 's' : ''}</Text>
          </View>
        }
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
    heading: { ...type.screenTitle, color: colors.textPrimary },
    subheading: { ...type.caption, color: colors.textTertiary },
    headerBlock: { marginBottom: 16 },
    card: {
      backgroundColor: colors.bgCard,
      borderRadius: 16,
      marginBottom: 12,
      borderWidth: 1,
      borderColor: colors.border,
      overflow: 'hidden',
    },
    hero: { height: 70, borderRadius: 12, overflow: 'hidden', position: 'relative' },
    heroOverlay: { position: 'absolute', bottom: 8, left: 12 },
    heroDestination: { color: '#FFFFFF', fontFamily: 'Inter_700Bold', fontSize: 16 },
    heroState: { color: 'rgba(255,255,255,0.8)', fontSize: 12, fontFamily: 'Inter_400Regular' },
    heroDeleteBtn: { position: 'absolute', top: 8, right: 8, backgroundColor: 'rgba(0,0,0,0.3)', borderRadius: 8, padding: 4 },
    cardBody: { padding: 12, gap: 6 },
    tripName: { ...type.body, fontFamily: 'Inter_600SemiBold', color: colors.textPrimary },
    tripDates: { ...type.caption, color: colors.textTertiary },
    metaRow: { flexDirection: 'row', gap: 12, alignItems: 'center' },
    badges: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
    statusPill: { paddingHorizontal: 8, paddingVertical: 3, borderRadius: 20 },
    pillGreen: { backgroundColor: 'rgba(34,197,94,0.15)' },
    pillGrey: { backgroundColor: colors.border },
    pillText: { fontSize: 11, fontFamily: 'Inter_600SemiBold', color: colors.textSecondary },
    deleteIcon: { fontSize: 18 },
    retryBtn: { backgroundColor: colors.primary500, paddingHorizontal: 24, paddingVertical: 10, borderRadius: 10 },
    retryText: { ...type.body, color: colors.textInverse, fontFamily: 'Inter_600SemiBold' },
  });
}
