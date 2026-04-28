import { View, Text, StyleSheet, Pressable } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { useColors } from '@/hooks/useColorScheme';
import type { Colors } from '@/constants/colors';
import { type } from '@/constants/typography';
import { Button } from '@/components/ui/Button';
import type { SearchResultDestination } from '@/types/search.types';
import { destinationGradient } from '@/utils/destinationGradient';

interface DestinationCardProps {
  destination: SearchResultDestination;
  onGetItinerary: () => void;
  onGetFoodGuide: () => void;
}

export function DestinationCard({ destination, onGetItinerary, onGetFoodGuide }: DestinationCardProps) {
  const colors = useColors();
  const styles = makeStyles(colors);

  return (
    <View style={styles.card}>
      {/* Hero gradient section */}
      <View style={styles.heroContainer}>
        <LinearGradient colors={destinationGradient(destination.name) as [string, string, string]} style={styles.hero}>
          {/* Destination name overlaid bottom-left */}
          <View style={styles.heroOverlay}>
            <Text style={styles.heroName}>{destination.name}, {destination.state}</Text>
          </View>

          {/* Match % badge top-right */}
          <View style={styles.matchBadge}>
            <Text style={styles.matchText}>{destination.readinessScore}%</Text>
          </View>

          {/* Hidden gem badge top-left */}
          {destination.isHiddenGem && (
            <View style={styles.gemBadge}>
              <Text style={styles.gemBadgeText}>✨ Hidden Gem</Text>
            </View>
          )}

          {/* Bookmark button bottom-right */}
          <Pressable style={styles.saveBtn}>
            <Text style={styles.saveBtnIcon}>🔖</Text>
          </Pressable>
        </LinearGradient>
      </View>

      {/* Card body content */}
      <View style={styles.cardBody}>
        <Text style={styles.why}>{destination.whyItMatches}</Text>

        <View style={styles.statsRow}>
          <View style={styles.statChip}>
            <Text style={styles.statIcon}>💰</Text>
            <Text style={styles.statText}>{destination.budgetEstimate}</Text>
          </View>
          <View style={styles.statChip}>
            <Text style={styles.statIcon}>⛅</Text>
            <Text style={styles.statText}>{destination.weatherSnapshot}</Text>
          </View>
          <View style={styles.statChip}>
            <Text style={styles.statIcon}>🕐</Text>
            <Text style={styles.statText}>{destination.travelTime}</Text>
          </View>
          <View style={styles.statChip}>
            <Text style={styles.statIcon}>❤️</Text>
            <Text style={styles.statText}>{destination.suitability}</Text>
          </View>
        </View>

        <View style={styles.actions}>
          <Button label="Get Itinerary" onPress={onGetItinerary} />
          <Button label="Food Guide" onPress={onGetFoodGuide} variant="secondary" />
        </View>
      </View>
    </View>
  );
}

function makeStyles(colors: Colors) {
  return StyleSheet.create({
    card: {
      backgroundColor: colors.bgCard,
      borderRadius: 16,
      overflow: 'hidden',
      marginBottom: 12,
      borderWidth: 1,
      borderColor: colors.border,
    },
    heroContainer: { overflow: 'hidden', borderRadius: 16 },
    hero: { height: 140, position: 'relative', justifyContent: 'space-between', padding: 12 },
    heroOverlay: { position: 'absolute', bottom: 12, left: 12 },
    heroName: { color: '#FFFFFF', fontFamily: 'Inter_700Bold', fontSize: 16 },
    matchBadge: { position: 'absolute', top: 12, right: 12, backgroundColor: 'rgba(255,255,255,0.2)', borderRadius: 10, paddingHorizontal: 10, paddingVertical: 6 },
    matchText: { color: '#FFFFFF', fontFamily: 'Inter_600SemiBold', fontSize: 12 },
    gemBadge: { position: 'absolute', top: 12, left: 12, backgroundColor: 'rgba(232,96,28,0.9)', borderRadius: 20, paddingHorizontal: 8, paddingVertical: 4 },
    gemBadgeText: { color: '#FFFFFF', fontSize: 12, fontFamily: 'Inter_600SemiBold' },
    saveBtn: { position: 'absolute', bottom: 12, right: 12, backgroundColor: 'rgba(255,255,255,0.2)', borderRadius: 10, width: 36, height: 36, alignItems: 'center', justifyContent: 'center' },
    saveBtnIcon: { fontSize: 18 },
    cardBody: { padding: 16, gap: 12 },
    why: { ...type.body, color: colors.textSecondary },
    statsRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
    statChip: { flexDirection: 'row', alignItems: 'center', backgroundColor: colors.bgBase, borderRadius: 8, paddingHorizontal: 10, paddingVertical: 6, gap: 4 },
    statIcon: { fontSize: 14 },
    statText: { ...type.caption, color: colors.textSecondary },
    actions: { flexDirection: 'row', gap: 10 },
  });
}
