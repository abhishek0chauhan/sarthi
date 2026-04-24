import { View, Text, StyleSheet } from 'react-native';
import { useColors } from '@/hooks/useColorScheme';
import type { Colors } from '@/constants/colors';
import { type } from '@/constants/typography';
import { Badge } from '@/components/ui/Badge';
import type { TrekResult } from '@/types/search.types';

interface TrekCardProps {
  trek: TrekResult;
}

export function TrekCard({ trek }: TrekCardProps) {
  const colors = useColors();
  const styles = makeStyles(colors);

  return (
    <View style={styles.card}>
      <Text style={styles.name}>{trek.name}</Text>
      <Text style={styles.region}>{trek.region}, {trek.state}</Text>
      <Text style={styles.why}>{trek.whyItMatches}</Text>

      <View style={styles.metaRow}>
        <Text style={styles.meta}>📏 {trek.altitude}</Text>
        <Text style={styles.meta}>⚡ {trek.difficulty}</Text>
        <Text style={styles.meta}>📅 {trek.duration}</Text>
      </View>

      <View style={styles.badges}>
        <Badge label={trek.terrain} variant="match" />
        <Badge label={trek.healthAdvisory.suitability} variant="success" />
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
      gap: 8,
    },
    name: { ...type.screenTitle, color: colors.textPrimary },
    region: { ...type.caption, color: colors.textSecondary },
    why: { ...type.body, color: colors.textSecondary },
    metaRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 12, marginTop: 4 },
    meta: { ...type.caption, color: colors.textSecondary },
    badges: { flexDirection: 'row', gap: 8 },
  });
}
