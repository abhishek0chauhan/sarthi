import { View, Text, StyleSheet } from 'react-native';
import { lightColors } from '@/constants/colors';
import { type } from '@/constants/typography';
import type { ItineraryActivity } from '@/types/trip.types';

interface ActivityCardProps {
  activity: ItineraryActivity;
  isLast: boolean;
}

export function ActivityCard({ activity, isLast }: ActivityCardProps) {
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

const styles = StyleSheet.create({
  row: { flexDirection: 'row' },
  timeline: { alignItems: 'center', marginRight: 12, width: 20 },
  dot: { width: 12, height: 12, borderRadius: 6, backgroundColor: lightColors.primary500 },
  line: { width: 1.5, flex: 1, backgroundColor: lightColors.border, marginTop: 4 },
  content: { flex: 1, paddingBottom: 16 },
  time: { ...type.caption, color: lightColors.textTertiary, marginBottom: 4 },
  card: {
    backgroundColor: lightColors.bgCard,
    borderRadius: 10,
    padding: 12,
    borderWidth: 1,
    borderColor: lightColors.border,
    gap: 4,
  },
  activity: { ...type.body, color: lightColors.textPrimary, fontFamily: 'Inter_600SemiBold' },
  meta: { ...type.caption, color: lightColors.textSecondary },
  healthNote: { ...type.caption, color: lightColors.warning },
});
