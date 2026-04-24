import { View, Text, StyleSheet } from 'react-native';
import { useColors } from '@/hooks/useColorScheme';
import type { Colors } from '@/constants/colors';
import { type } from '@/constants/typography';
import type { ItineraryActivity } from '@/types/trip.types';

interface ActivityCardProps {
  activity: ItineraryActivity;
  isLast: boolean;
}

export function ActivityCard({ activity, isLast }: ActivityCardProps) {
  const colors = useColors();
  const styles = makeStyles(colors);

  return (
    <View style={styles.row}>
      <View style={styles.timeline}>
        <View style={styles.dot} />
        {!isLast && <View style={styles.line} />}
      </View>
      <View style={styles.content}>
        <Text style={styles.time}>{activity.time}</Text>
        <View style={styles.card}>
          <Text style={styles.activity}>{activity.activity}</Text>
          {activity.cost && <Text style={styles.meta}>💰 {activity.cost}</Text>}
          {activity.healthNote && <Text style={styles.healthNote}>💪 {activity.healthNote}</Text>}
        </View>
      </View>
    </View>
  );
}

function makeStyles(colors: Colors) {
  return StyleSheet.create({
    row: { flexDirection: 'row' },
    timeline: { alignItems: 'center', marginRight: 12, width: 20 },
    dot: { width: 12, height: 12, borderRadius: 6, backgroundColor: colors.primary500 },
    line: { width: 1.5, flex: 1, backgroundColor: colors.border, marginTop: 4 },
    content: { flex: 1, paddingBottom: 16 },
    time: { ...type.caption, color: colors.textTertiary, marginBottom: 4 },
    card: {
      backgroundColor: colors.bgCard,
      borderRadius: 10,
      padding: 12,
      borderWidth: 1,
      borderColor: colors.border,
      gap: 4,
    },
    activity: { ...type.body, color: colors.textPrimary, fontFamily: 'Inter_600SemiBold' },
    meta: { ...type.caption, color: colors.textSecondary },
    healthNote: { ...type.caption, color: colors.warning },
  });
}
