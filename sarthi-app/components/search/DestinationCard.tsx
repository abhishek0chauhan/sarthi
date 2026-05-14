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
        {/* Personal match signal badge */}
        {destination.personalMatch && (
          <View style={styles.matchSignalContainer}>
            <View style={getMatchBadgeStyle(destination.personalMatch.level, styles, colors)}>
              <Text style={getMatchBadgeTextStyle(destination.personalMatch.level, styles, colors)}>
                {getMatchBadgeLabel(destination.personalMatch.level)}
              </Text>
            </View>
            <Text style={styles.matchReasonText}>{destination.personalMatch.reason}</Text>
          </View>
        )}

        <Text style={styles.why}>{destination.whyItMatches}</Text>

        <View style={styles.statsRow}>
          <View style={styles.statChip}>
            <Text style={styles.statIcon}>💰</Text>
            <Text style={styles.statText}>{destination.budgetEstimate}</Text>
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
        <View style={styles.weatherChip}>
          <Text style={styles.statIcon}>⛅</Text>
          <Text style={styles.weatherText}>{destination.weatherSnapshot}</Text>
        </View>

        <View style={styles.actions}>
          <Button label="Get Itinerary" onPress={onGetItinerary} />
          <Button label="Food Guide" onPress={onGetFoodGuide} variant="secondary" />
        </View>
      </View>
    </View>
  );
}

// Helper function to get match badge label with icon
function getMatchBadgeLabel(level: 'great_match' | 'good_match' | 'heads_up' | 'not_your_style'): string {
  switch (level) {
    case 'great_match':
      return '✦ Great match';
    case 'good_match':
      return '✓ Good match';
    case 'heads_up':
      return '⚠ Heads up';
    case 'not_your_style':
      return 'Not your style';
  }
}

// Helper function to get badge container style based on match level
function getMatchBadgeStyle(level: 'great_match' | 'good_match' | 'heads_up' | 'not_your_style', styles: any, colors: Colors): any {
  switch (level) {
    case 'great_match':
      return { ...styles.matchBadgeGood, backgroundColor: `${colors.success}15` };
    case 'good_match':
      return { ...styles.matchBadgeGood, backgroundColor: `${colors.primary500}15` };
    case 'heads_up':
      return { ...styles.matchBadgeGood, backgroundColor: `${colors.warning}15` };
    case 'not_your_style':
      return { ...styles.matchBadgeNeutral, borderColor: colors.textTertiary };
  }
}

// Helper function to get badge text style based on match level
function getMatchBadgeTextStyle(level: 'great_match' | 'good_match' | 'heads_up' | 'not_your_style', styles: any, colors: Colors): any {
  switch (level) {
    case 'great_match':
      return { ...styles.matchBadgeText, color: colors.success };
    case 'good_match':
      return { ...styles.matchBadgeText, color: colors.primary500 };
    case 'heads_up':
      return { ...styles.matchBadgeText, color: colors.warning };
    case 'not_your_style':
      return { ...styles.matchBadgeText, color: colors.textTertiary };
  }
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
    matchSignalContainer: { gap: 4 },
    matchBadgeGood: { paddingHorizontal: 12, paddingVertical: 8, borderRadius: 8, alignSelf: 'flex-start' },
    matchBadgeNeutral: { paddingHorizontal: 12, paddingVertical: 8, borderRadius: 8, alignSelf: 'flex-start', borderWidth: 1 },
    matchBadgeText: { ...type.caption, fontFamily: 'Inter_600SemiBold' },
    matchReasonText: { ...type.caption, color: colors.textTertiary, marginLeft: 0 },
    why: { ...type.body, color: colors.textSecondary },
    statsRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
    statChip: { flexDirection: 'row', alignItems: 'center', backgroundColor: colors.bgBase, borderRadius: 8, paddingHorizontal: 10, paddingVertical: 6, gap: 4 },
    weatherChip: { flexDirection: 'row', alignItems: 'flex-start', backgroundColor: colors.bgBase, borderRadius: 8, paddingHorizontal: 10, paddingVertical: 6, gap: 4 },
    statIcon: { fontSize: 14 },
    statText: { ...type.caption, color: colors.textSecondary },
    weatherText: { ...type.caption, color: colors.textSecondary, flex: 1 },
    actions: { flexDirection: 'row', gap: 10 },
  });
}
