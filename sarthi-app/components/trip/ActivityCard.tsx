import { useState } from 'react';
import { View, Text, StyleSheet, Pressable } from 'react-native';
import { useColors } from '@/hooks/useColorScheme';
import type { Colors } from '@/constants/colors';
import { type } from '@/constants/typography';
import type { ItineraryActivity } from '@/types/trip.types';
import { useLogCorrection } from '@/hooks/useEnrichment';
import { PlaceContextCard } from './PlaceContextCard';
import { MapLinkButton } from './MapLinkButton';

interface ActivityCardProps {
  activity: ItineraryActivity;
  isLast: boolean;
  tripId?: string;
  dayIndex?: number;
  activityIndex?: number;
}

export function ActivityCard({ activity, isLast, tripId, dayIndex, activityIndex }: ActivityCardProps) {
  const colors = useColors();
  const styles = makeStyles(colors);
  const [selection, setSelection] = useState<'up' | 'down' | null>(null);
  const { mutate: logCorrection } = useLogCorrection();

  const handleThumbPress = (direction: 'up' | 'down') => {
    const newSelection = selection === direction ? null : direction;
    setSelection(newSelection);

    if (tripId && dayIndex !== undefined && activityIndex !== undefined && newSelection) {
      logCorrection({
        tripId,
        type: newSelection === 'up' ? 'thumbs_up' : 'thumbs_down',
        context: {
          day: dayIndex,
          activity: activityIndex,
          placeId: activity.placeId,
        },
      });
    }
  };

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
          {activity.mapQuery && <MapLinkButton mapQuery={activity.mapQuery} />}
          {activity.placeContext && <PlaceContextCard context={activity.placeContext} />}
          {tripId && (
            <View style={styles.thumbsRow}>
              <Pressable
                accessible={true}
                accessibilityLabel="Like activity"
                accessibilityHint={`Help us improve by rating this ${activity.activity}`}
                style={styles.thumbBtn}
                onPress={() => handleThumbPress('up')}
              >
                <Text style={[styles.thumb, selection === 'up' ? styles.thumbSelected : styles.thumbUnselected]}>
                  👍
                </Text>
              </Pressable>
              <Pressable
                accessible={true}
                accessibilityLabel="Dislike activity"
                accessibilityHint={`Help us improve by rating this ${activity.activity}`}
                style={styles.thumbBtn}
                onPress={() => handleThumbPress('down')}
              >
                <Text style={[styles.thumb, selection === 'down' ? styles.thumbSelected : styles.thumbUnselected]}>
                  👎
                </Text>
              </Pressable>
            </View>
          )}
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
    thumbsRow: { flexDirection: 'row', justifyContent: 'flex-end', gap: 8, marginTop: 8 },
    thumbBtn: { width: 24, height: 24, justifyContent: 'center', alignItems: 'center' },
    thumb: { fontSize: 20, lineHeight: 20 },
    thumbUnselected: { opacity: 0.4 },
    thumbSelected: { opacity: 1 },
  });
}
