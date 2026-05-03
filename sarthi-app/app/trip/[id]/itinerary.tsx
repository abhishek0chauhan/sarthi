import { useState } from 'react';
import { ScrollView, View, Text, StyleSheet, Modal, TextInput, Alert, Pressable } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useLocalSearchParams } from 'expo-router';
import { useTrip } from '@/hooks/useTrips';
import { useRemoveActivity, useAddActivity, useEnrichTrip } from '@/hooks/useEnrichment';
import { LoadingSpinner } from '@/components/ui/LoadingSpinner';
import { EmptyState } from '@/components/ui/EmptyState';
import { DayTabs } from '@/components/trip/DayTabs';
import { ActivityCard } from '@/components/trip/ActivityCard';
import { CostBreakdown } from '@/components/trip/CostBreakdown';
import { useColors } from '@/hooks/useColorScheme';
import type { Colors } from '@/constants/colors';
import { type } from '@/constants/typography';
import type { ItineraryData } from '@/types/trip.types';

export default function TripItineraryScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const { data: trip, isLoading } = useTrip(id ?? '');
  const [activeDay, setActiveDay] = useState(1);
  const [addModalVisible, setAddModalVisible] = useState(false);
  const [newTime, setNewTime] = useState('');
  const [newActivity, setNewActivity] = useState('');
  const [newCost, setNewCost] = useState('');
  const colors = useColors();
  const styles = makeStyles(colors);

  const { mutate: removeActivity } = useRemoveActivity(id ?? '');
  const { mutate: addActivity, isPending: isAdding } = useAddActivity(id ?? '');
  const { mutate: enrichTrip, isPending: isEnriching } = useEnrichTrip(id ?? '');

  if (isLoading) return <LoadingSpinner />;
  if (!trip?.itineraryData) return <EmptyState title="No itinerary" />;

  const itinerary = trip.itineraryData as unknown as ItineraryData;
  const days = itinerary.itinerary ?? [];
  const currentDay = days.find((d) => d.day === activeDay) ?? days[0];

  const hasPlaceContext = days.some((d) =>
    d.activities.some((a) => a.placeContext)
  );

  const handleAddActivity = () => {
    if (!newActivity.trim() || !newTime.trim()) return;
    addActivity(
      { day: activeDay, dto: { time: newTime.trim(), activity: newActivity.trim(), cost: newCost.trim() || undefined } },
      { onSuccess: () => { setAddModalVisible(false); setNewTime(''); setNewActivity(''); setNewCost(''); } }
    );
  };

  return (
    <SafeAreaView style={styles.safe}>
      <DayTabs
        days={days.length}
        activeDay={activeDay}
        onSelect={setActiveDay}
      />
      <View style={styles.divider} />
      {!hasPlaceContext && (
        <Pressable
          style={[styles.enrichBtn, isEnriching && styles.enrichBtnDisabled]}
          onPress={() => enrichTrip()}
          disabled={isEnriching}
        >
          <Text style={styles.enrichBtnText}>
            {isEnriching ? 'Enriching…' : '✨ Enrich Trip — Add Place Context'}
          </Text>
        </Pressable>
      )}
      <ScrollView contentContainerStyle={styles.content}>
        {currentDay && (
          <View>
            <Text style={styles.dayTitle}>Day {currentDay.day}: {currentDay.title}</Text>
            {currentDay.activities.map((activity, i) => (
              <View key={i} style={styles.activityRow}>
                <View style={styles.activityCardWrapper}>
                  <ActivityCard activity={activity} isLast={i === currentDay.activities.length - 1} />
                </View>
                <Pressable
                  testID={`delete-activity-${i}`}
                  style={styles.deleteBtn}
                  onPress={() => {
                    Alert.alert('Remove Activity', `Remove "${activity.activity}"?`, [
                      { text: 'Cancel', style: 'cancel' },
                      { text: 'Remove', style: 'destructive', onPress: () => removeActivity({ day: activeDay, index: i }) },
                    ]);
                  }}
                >
                  <Text style={styles.deleteBtnText}>×</Text>
                </Pressable>
              </View>
            ))}
          </View>
        )}
        {activeDay === days.length && itinerary.costBreakdown && (
          <CostBreakdown breakdown={itinerary.costBreakdown} />
        )}

        {/* FAB */}
        <Pressable style={styles.fab} onPress={() => setAddModalVisible(true)}>
          <Text style={styles.fabText}>+ Add Activity</Text>
        </Pressable>

        {/* Add Activity Modal */}
        <Modal visible={addModalVisible} transparent animationType="slide">
          <View style={styles.modalOverlay}>
            <View style={styles.modalSheet}>
              <Text style={styles.modalTitle}>Add Activity — Day {activeDay}</Text>
              <TextInput
                style={styles.input}
                placeholder="Time (e.g. 10:00 AM)"
                placeholderTextColor={colors.textTertiary}
                value={newTime}
                onChangeText={setNewTime}
              />
              <TextInput
                style={styles.input}
                placeholder="Activity name"
                placeholderTextColor={colors.textTertiary}
                value={newActivity}
                onChangeText={setNewActivity}
              />
              <TextInput
                style={styles.input}
                placeholder="Cost (optional, e.g. ₹200)"
                placeholderTextColor={colors.textTertiary}
                value={newCost}
                onChangeText={setNewCost}
              />
              <View style={styles.modalBtns}>
                <Pressable style={styles.modalCancel} onPress={() => setAddModalVisible(false)}>
                  <Text style={styles.modalCancelText}>Cancel</Text>
                </Pressable>
                <Pressable
                  style={[styles.modalAdd, isAdding && styles.enrichBtnDisabled]}
                  onPress={handleAddActivity}
                  disabled={isAdding}
                >
                  <Text style={styles.modalAddText}>{isAdding ? 'Adding…' : 'Add'}</Text>
                </Pressable>
              </View>
            </View>
          </View>
        </Modal>
      </ScrollView>
    </SafeAreaView>
  );
}

function makeStyles(colors: Colors) {
  return StyleSheet.create({
    safe: { flex: 1, backgroundColor: colors.bgBase },
    divider: { height: 1, backgroundColor: colors.border, marginHorizontal: 20, marginBottom: 4 },
    content: { padding: 20, gap: 16, paddingBottom: 100 },
    dayTitle: { ...type.screenTitle, color: colors.textPrimary, marginBottom: 16 },
    dayTotal: { ...type.caption, color: colors.textSecondary, textAlign: 'right', marginTop: 8 },
    enrichBtn: {
      margin: 12,
      marginBottom: 0,
      backgroundColor: colors.primary50,
      borderRadius: 10,
      padding: 10,
      alignItems: 'center',
      borderWidth: 1,
      borderColor: colors.primary200,
    },
    enrichBtnDisabled: { opacity: 0.5 },
    enrichBtnText: { fontSize: 12, fontFamily: 'Inter_600SemiBold', color: colors.primary500 },
    activityRow: { flexDirection: 'row', alignItems: 'flex-start' },
    activityCardWrapper: { flex: 1 },
    deleteBtn: {
      width: 28,
      height: 28,
      borderRadius: 14,
      backgroundColor: colors.bgSurface,
      borderWidth: 1,
      borderColor: colors.border,
      alignItems: 'center',
      justifyContent: 'center',
      marginTop: 18,
      marginLeft: 4,
    },
    deleteBtnText: { fontSize: 18, color: colors.textTertiary, lineHeight: 22 },
    fab: {
      position: 'absolute',
      bottom: 24,
      right: 20,
      backgroundColor: colors.primary500,
      borderRadius: 24,
      paddingVertical: 10,
      paddingHorizontal: 20,
      shadowColor: colors.primary500,
      shadowOpacity: 0.3,
      shadowRadius: 8,
      shadowOffset: { width: 0, height: 4 },
      elevation: 6,
    },
    fabText: { color: '#fff', fontFamily: 'Inter_700Bold', fontSize: 14 },
    modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'flex-end' },
    modalSheet: {
      backgroundColor: colors.bgBase,
      borderTopLeftRadius: 20,
      borderTopRightRadius: 20,
      padding: 24,
      gap: 12,
    },
    modalTitle: { ...type.screenTitle, color: colors.textPrimary, fontSize: 16 },
    input: {
      borderWidth: 1.5,
      borderColor: colors.border,
      borderRadius: 10,
      padding: 12,
      fontSize: 14,
      color: colors.textPrimary,
      backgroundColor: colors.bgCard,
    },
    modalBtns: { flexDirection: 'row', gap: 10, marginTop: 4 },
    modalCancel: {
      flex: 1,
      borderWidth: 1.5,
      borderColor: colors.border,
      borderRadius: 10,
      padding: 12,
      alignItems: 'center',
    },
    modalCancelText: { color: colors.textSecondary, fontFamily: 'Inter_600SemiBold' },
    modalAdd: { flex: 1, backgroundColor: colors.primary500, borderRadius: 10, padding: 12, alignItems: 'center' },
    modalAddText: { color: '#fff', fontFamily: 'Inter_700Bold' },
  });
}
