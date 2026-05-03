import { View, Text, ScrollView, Pressable, StyleSheet } from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { LinearGradient } from 'expo-linear-gradient';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import * as Location from 'expo-location';
import { useTrip } from '@/hooks/useTrips';
import { useEnrichTrip } from '@/hooks/useEnrichment';
import { LoadingSpinner } from '@/components/ui/LoadingSpinner';
import { EmptyState } from '@/components/ui/EmptyState';
import { CostBreakdown } from '@/components/trip/CostBreakdown';
import { useColors } from '@/hooks/useColorScheme';
import type { Colors } from '@/constants/colors';
import { type } from '@/constants/typography';
import { destinationGradient } from '@/utils/destinationGradient';

export default function TripDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const { data: trip, isLoading, error } = useTrip(id ?? '');
  const insets = useSafeAreaInsets();
  const colors = useColors();
  const styles = makeStyles(colors);
  const { mutate: enrichTrip, isPending: isEnriching } = useEnrichTrip(id ?? '');

  if (isLoading) return <LoadingSpinner />;
  if (error || !trip) return <EmptyState title="Trip not found" />;

  // Check if today is within trip dates
  const today = new Date().toISOString().split('T')[0];
  const isActiveDay = trip.dates.from <= today && today <= trip.dates.to;

  // Check if trip has place context in any activity
  const hasPlaceContext = (trip.itineraryData?.itinerary ?? []).some((d: any) =>
    d.activities?.some((a: any) => a.placeContext)
  );

  // Calculate day number (1-based)
  const dayNumber = Math.floor(
    (new Date(today).getTime() - new Date(trip.dates.from).getTime()) / 86400000
  ) + 1;

  // Handler for Live Guide tile
  const handleLiveGuidePress = async () => {
    const { granted } = await Location.requestForegroundPermissionsAsync();
    // Navigate regardless of permission (suggestion disabled if denied)
    router.push(`/trip/${id}/live-guide` as any);
  };

  const gradientColors = destinationGradient(trip.destination) as [string, string, string];
  const readiness = trip.itineraryData?.tripReadiness ?? 75;
  const highlights = trip.itineraryData?.highlights?.length
    ? trip.itineraryData.highlights
    : ['Discover local culture', 'Explore natural landscapes', 'Taste regional cuisine'];

  const foodDishCount = (trip.foodGuideData as any)?.mustTryDishes?.length ?? 0;

  return (
    <View style={styles.root}>
      <ScrollView contentContainerStyle={styles.scrollContent}>
        {/* 1. Hero gradient */}
        <LinearGradient colors={gradientColors} style={[styles.hero, { paddingTop: insets.top + 12 }]}>
          <Pressable onPress={() => router.back()} style={styles.heroBack}>
            <Text style={styles.heroBackIcon}>←</Text>
          </Pressable>
          <View style={styles.heroInfo}>
            <Text style={styles.heroName}>{trip.name}</Text>
            <Text style={styles.heroDest}>{trip.destination}, {trip.state}</Text>
            <Text style={styles.heroDates}>{trip.dates.from} → {trip.dates.to}</Text>
          </View>
        </LinearGradient>

        {/* Padded content area */}
        <View style={styles.content}>
          {/* 2. Trip Readiness card */}
          <View style={styles.card}>
            <Text style={styles.cardTitle}>TRIP READINESS</Text>
            <View style={styles.readinessRow}>
              <Text style={styles.readinessScore}>{readiness}%</Text>
              <View style={styles.progressBar}>
                <View style={[styles.progressFill, { width: `${readiness}%` }]} />
              </View>
            </View>
          </View>

          {/* 3. Quick nav tiles */}
          {isActiveDay ? (
            <>
            <View style={styles.tilesGrid}>
              {/* Live Guide — large primary tile */}
              <Pressable
                style={[styles.navTile, styles.navTileLive]}
                onPress={handleLiveGuidePress}
              >
                <View style={styles.liveIndicator}>
                  <View style={styles.liveDot} />
                  <Text style={styles.liveDotLabel}>LIVE</Text>
                </View>
                <Text style={styles.navTileIcon}>🗺️</Text>
                <Text style={[styles.navTileLabel, { color: colors.success }]}>Live Guide</Text>
                <Text style={styles.navTileSub}>Day {dayNumber} · Active now</Text>
              </Pressable>
              {/* Secondary tiles column */}
              <View style={styles.tilesSecondary}>
                <Pressable
                  style={[styles.navTile, styles.navTileSecondary]}
                  onPress={() => trip.itineraryData && router.push(`/trip/${id}/itinerary` as any)}
                >
                  <Text style={styles.navTileIconSm}>📅</Text>
                  <Text style={styles.navTileLabelSm}>Itinerary</Text>
                </Pressable>
                <Pressable
                  style={[styles.navTile, styles.navTileSecondary]}
                  onPress={() =>
                    trip.foodGuideData
                      ? router.push(`/trip/${id}/food-guide` as any)
                      : router.push(`/trip/${id}/generate-food-guide` as any)
                  }
                >
                  <Text style={styles.navTileIconSm}>🍽️</Text>
                  <Text style={styles.navTileLabelSm}>Food Guide</Text>
                </Pressable>
              </View>
            </View>
            <View style={styles.navGrid}>
              <Pressable
                style={[styles.navTile, styles.navTileSecondary]}
                onPress={() => router.push(`/trip/${id}/phrasebook` as any)}
              >
                <Text style={styles.navTileIconSm}>🗣️</Text>
                <Text style={styles.navTileLabelSm}>Phrasebook</Text>
              </Pressable>
              <Pressable
                style={[styles.navTile, styles.navTileSecondary]}
                onPress={() => router.push(`/trip/${id}/chat` as any)}
              >
                <Text style={styles.navTileIconSm}>💬</Text>
                <Text style={styles.navTileLabelSm}>Trip Chat</Text>
              </Pressable>
            </View>
            </>
          ) : (
            <>
            <View style={styles.navGrid}>
              <Pressable
                style={[styles.navTile, styles.navTilePrimary]}
                onPress={() => trip.itineraryData && router.push(`/trip/${id}/itinerary` as any)}
              >
                <Text style={styles.navTileIcon}>📅</Text>
                <Text style={[styles.navTileLabel, { color: colors.textInverse }]}>Itinerary</Text>
                <Text style={[styles.navTileDetail, { color: 'rgba(255,255,255,0.7)' }]}>
                  {trip.itineraryData ? `${trip.itineraryData.itinerary?.length ?? 0} days` : 'Not generated'}
                </Text>
              </Pressable>
              <Pressable
                style={[styles.navTile, styles.navTileSecondary]}
                onPress={() =>
                  trip.foodGuideData
                    ? router.push(`/trip/${id}/food-guide` as any)
                    : router.push(`/trip/${id}/generate-food-guide` as any)
                }
              >
                <Text style={styles.navTileIcon}>🍽️</Text>
                <Text style={[styles.navTileLabel, { color: colors.textPrimary }]}>Food Guide</Text>
                <Text style={[styles.navTileDetail, { color: colors.textTertiary }]}>
                  {trip.foodGuideData ? `${foodDishCount} dishes` : 'Tap to generate'}
                </Text>
              </Pressable>
            </View>
            <View style={styles.navGrid}>
              <Pressable
                style={[styles.navTile, styles.navTileSecondary]}
                onPress={() => router.push(`/trip/${id}/phrasebook` as any)}
              >
                <Text style={styles.navTileIcon}>🗣️</Text>
                <Text style={[styles.navTileLabel, { color: colors.textPrimary }]}>Phrasebook</Text>
                <Text style={[styles.navTileDetail, { color: colors.textTertiary }]}>
                  {trip.phrasebookData ? 'Ready' : 'Tap to generate'}
                </Text>
              </Pressable>
              <Pressable
                style={[styles.navTile, styles.navTileSecondary]}
                onPress={() => router.push(`/trip/${id}/chat` as any)}
              >
                <Text style={styles.navTileIcon}>💬</Text>
                <Text style={[styles.navTileLabel, { color: colors.textPrimary }]}>Trip Chat</Text>
                <Text style={[styles.navTileDetail, { color: colors.textTertiary }]}>Ask Sarthi AI</Text>
              </Pressable>
            </View>
            </>
          )}

          {/* Enrich Trip — shown when itinerary exists but has no place context yet */}
          {trip.itineraryData && !hasPlaceContext && (
            <Pressable
              style={[styles.enrichBtn, isEnriching && styles.enrichBtnDisabled]}
              onPress={() => enrichTrip()}
              disabled={isEnriching}
            >
              <Text style={styles.enrichBtnText}>
                {isEnriching ? '✨ Enriching…' : '✨ Enrich Trip — Add Place Context & Map Links'}
              </Text>
            </Pressable>
          )}

          {/* 4. Highlights card */}
          <View style={styles.card}>
            <Text style={styles.cardTitle}>HIGHLIGHTS</Text>
            {highlights.map((h, i) => (
              <View key={i} style={styles.highlightRow}>
                <Text style={styles.highlightDot}>•</Text>
                <Text style={styles.highlightText}>{h}</Text>
              </View>
            ))}
          </View>

          {/* 5. Cost breakdown (conditional) */}
          {trip.itineraryData?.costBreakdown && (
            <CostBreakdown breakdown={trip.itineraryData.costBreakdown} />
          )}

          {/* 6. Share row */}
          <View style={styles.shareRow}>
            <Text style={styles.shareIcon}>🔗</Text>
            <Text style={styles.shareText}>Share this trip</Text>
            <Pressable onPress={() => router.push(`/trip/${id}/share` as any)} style={styles.shareBtn}>
              <Text style={styles.shareBtnText}>Share</Text>
            </Pressable>
          </View>
        </View>
      </ScrollView>
    </View>
  );
}

function makeStyles(colors: Colors) {
  return StyleSheet.create({
    root: { flex: 1, backgroundColor: colors.bgBase },
    scrollContent: { paddingBottom: 32 },

    // Hero
    hero: { minHeight: 140, justifyContent: 'space-between', paddingHorizontal: 16, paddingBottom: 16 },
    heroBack: {
      backgroundColor: 'rgba(255,255,255,0.2)',
      borderRadius: 10,
      width: 36,
      height: 36,
      alignItems: 'center',
      justifyContent: 'center',
      alignSelf: 'flex-start',
    },
    heroBackIcon: { fontSize: 18, color: '#FFFFFF' },
    heroInfo: { gap: 2 },
    heroName: { color: '#FFFFFF', fontFamily: 'Inter_700Bold', fontSize: 20 },
    heroDest: { color: 'rgba(255,255,255,0.9)', fontSize: 14, fontFamily: 'Inter_500Medium' },
    heroDates: { color: 'rgba(255,255,255,0.7)', fontSize: 12, fontFamily: 'Inter_400Regular' },

    // Padded content area
    content: { padding: 20, gap: 16 },

    // Card base
    card: {
      backgroundColor: colors.bgCard,
      borderRadius: 16,
      padding: 16,
      borderWidth: 1,
      borderColor: colors.border,
      gap: 8,
    },
    cardTitle: { ...type.overline, color: colors.textTertiary },

    // Readiness
    readinessRow: { flexDirection: 'row', alignItems: 'center', marginTop: 8 },
    readinessScore: {
      fontSize: 16,
      fontFamily: 'Inter_700Bold',
      color: colors.primary500,
      marginRight: 12,
    },
    progressBar: {
      height: 8,
      backgroundColor: colors.border,
      borderRadius: 4,
      flex: 1,
      overflow: 'hidden',
    },
    progressFill: { height: '100%', backgroundColor: colors.primary500, borderRadius: 4 },

    // Nav grid
    navGrid: { flexDirection: 'row', gap: 12 },
    tilesGrid: { flexDirection: 'row', gap: 12 },
    tilesSecondary: { flex: 1, gap: 12 },
    navTile: { borderRadius: 16, padding: 16, gap: 6 },
    navTilePrimary: { flex: 1, backgroundColor: colors.primary500 },
    navTileSecondary: {
      flex: 1,
      backgroundColor: colors.bgCard,
      borderWidth: 1,
      borderColor: colors.border,
    },
    navTileLive: {
      flex: 0,
      width: '45%',
      backgroundColor: '#FEF0E6',
      borderWidth: 2,
      borderColor: '#E8601C',
    },
    liveIndicator: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 4,
      marginBottom: 4,
    },
    liveDot: {
      width: 8,
      height: 8,
      borderRadius: 4,
      backgroundColor: '#10B981',
    },
    liveDotLabel: {
      fontSize: 10,
      fontFamily: 'Inter_600SemiBold',
      color: '#10B981',
      letterSpacing: 1,
    },
    navTileIcon: { fontSize: 24 },
    navTileIconSm: { fontSize: 20 },
    navTileLabel: { fontFamily: 'Inter_600SemiBold', fontSize: 14 },
    navTileLabelSm: { fontFamily: 'Inter_600SemiBold', fontSize: 12, color: colors.textPrimary },
    navTileSub: { fontSize: 11, color: colors.textTertiary, marginTop: 2 },
    navTileDetail: { fontSize: 12 },

    // Highlights
    highlightRow: { flexDirection: 'row', gap: 8, alignItems: 'flex-start' },
    highlightDot: { ...type.body, color: colors.primary500, marginTop: 1 },
    highlightText: { ...type.body, color: colors.textSecondary, flex: 1 },

    // Share row
    shareRow: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 10,
      borderWidth: 1,
      borderStyle: 'dashed',
      borderColor: colors.border,
      borderRadius: 12,
      padding: 16,
    },
    shareIcon: { fontSize: 20 },
    shareText: { flex: 1, ...type.body, color: colors.textSecondary },
    shareBtn: {
      backgroundColor: colors.primary500,
      paddingHorizontal: 16,
      paddingVertical: 8,
      borderRadius: 10,
    },
    shareBtnText: { ...type.caption, color: colors.textInverse, fontFamily: 'Inter_600SemiBold' },

    // Enrich button
    enrichBtn: {
      backgroundColor: (colors as any).primary50,
      borderRadius: 12,
      padding: 12,
      alignItems: 'center',
      borderWidth: 1,
      borderColor: (colors as any).primary200,
    },
    enrichBtnDisabled: { opacity: 0.5 },
    enrichBtnText: { fontSize: 13, fontFamily: 'Inter_600SemiBold', color: colors.primary500 },
  });
}
