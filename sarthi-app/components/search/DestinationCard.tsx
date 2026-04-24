import { View, Text, StyleSheet, Pressable } from 'react-native';
import { useColors } from '@/hooks/useColorScheme';
import type { Colors } from '@/constants/colors';
import { type } from '@/constants/typography';
import { Badge } from '@/components/ui/Badge';
import { Button } from '@/components/ui/Button';
import type { SearchResultDestination } from '@/types/search.types';

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
      <View style={styles.header}>
        <View style={styles.headerText}>
          <Text style={styles.name}>{destination.name}, {destination.state}</Text>
          <Text style={styles.why}>{destination.whyItMatches}</Text>
        </View>
        {destination.isHiddenGem && <Text style={styles.gemIcon}>💎</Text>}
      </View>

      <View style={styles.metaRow}>
        <Text style={styles.meta}>💰 {destination.budgetEstimate}</Text>
        <Text style={styles.meta}>⛅ {destination.weatherNow}</Text>
        <Text style={styles.meta}>🕐 {destination.travelTime}</Text>
      </View>

      <View style={styles.badges}>
        <Badge label={`Ready: ${destination.tripReadiness.score}/100`} variant="match" />
        <Badge label={destination.healthAdvisory.suitability} variant="success" />
      </View>

      <View style={styles.actions}>
        <View style={styles.actionBtn}>
          <Button label="Get Itinerary" onPress={onGetItinerary} />
        </View>
        <View style={styles.actionBtn}>
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
      padding: 16,
      marginBottom: 12,
      borderWidth: 1,
      borderColor: colors.border,
      gap: 12,
    },
    header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start' },
    headerText: { flex: 1, gap: 4 },
    name: { ...type.screenTitle, color: colors.textPrimary },
    why: { ...type.body, color: colors.textSecondary },
    gemIcon: { fontSize: 20, marginLeft: 8 },
    metaRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 12 },
    meta: { ...type.caption, color: colors.textSecondary },
    badges: { flexDirection: 'row', gap: 8 },
    actions: { flexDirection: 'row', gap: 10 },
    actionBtn: { flex: 1 },
  });
}
