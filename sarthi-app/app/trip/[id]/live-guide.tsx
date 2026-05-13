import React, { useEffect, useRef, useState } from 'react';
import { View, Text, ScrollView, Pressable, StyleSheet, ActivityIndicator, Alert } from 'react-native';
import { useLocalSearchParams, router, Stack } from 'expo-router';
import { useLiveGuide } from '@/hooks/useLiveGuide';
import { notificationsService } from '@/services/notifications.service';
import { useTrip, useActivitySchedule } from '@/hooks/useTrips';
import { useColors } from '@/hooks/useColorScheme';
import { MapLinkButton } from '@/components/trip/MapLinkButton';
import type { Activity, ActivityApproachingAlert } from '@/types/live-guide.types';

export default function LiveGuideScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const colors = useColors();
  const { data: trip } = useTrip(id ?? '');
  const {
    activate, deactivate, markDone, skipActivity, requestReplan,
    briefing, todayPlan, dayIndex, nearbySuggestion, mealNudge, connectionState, activityAlert, setActivityAlert,
  } = useLiveGuide();

  const { data: activitySchedule } = useActivitySchedule(id ?? '', connectionState === 'connected');

  useEffect(() => {
    const fcmToken = notificationsService.getCachedToken();
    activate(id ?? '', fcmToken).catch(() => {
      Alert.alert('Live Guide unavailable', 'Live Guide is not available in Expo Go development mode.');
      router.back();
    });
    // No cleanup — session persists after this screen unmounts
  }, [id]);

  const [isReplanning, setIsReplanning] = useState(false);
  const alertDismissTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    if (alertDismissTimer.current) clearTimeout(alertDismissTimer.current);
    if (activityAlert) {
      alertDismissTimer.current = setTimeout(() => setActivityAlert(null), 30000);
    }
    return () => {
      if (alertDismissTimer.current) clearTimeout(alertDismissTimer.current);
    };
  }, [activityAlert, setActivityAlert]);

  const handleReplan = () => {
    console.log('[LiveGuide] requestReplan dayIndex=', dayIndex);
    setIsReplanning(true);
    requestReplan(() => setIsReplanning(false));
    setTimeout(() => setIsReplanning(false), 15000);
  };

  const currentIndex = todayPlan?.findIndex((a) => a.status === 'pending') ?? -1;

  const styles = makeStyles(colors);

  return (
    <>
      <Stack.Screen options={{ headerShown: false }} />
      <View style={styles.container}>
        {/* Header */}
        <View style={styles.header}>
          <Pressable onPress={() => router.back()}>
            <Text style={styles.backBtn}>← {trip?.name ?? 'Trip'}</Text>
          </Pressable>
          <View style={styles.headerBadges}>
            <View style={styles.liveBadge}>
              <View style={styles.liveDot} />
              <Text style={styles.liveText}>Live</Text>
            </View>
            <Pressable style={styles.stopBtn} onPress={() => { deactivate(); router.back(); }}>
              <Text style={styles.stopBtnText}>■ Stop</Text>
            </Pressable>
            {(activitySchedule?.length ?? 0) > 0 && (
              <View style={styles.pendingPill}>
                <Text style={styles.pendingPillText}>{activitySchedule!.length} upcoming</Text>
              </View>
            )}
          </View>
        </View>
        <Text style={styles.screenTitle}>Live Guide</Text>
        <Text style={styles.dayLabel}>
          Day {(dayIndex ?? 0) + 1} · {new Date().toLocaleDateString('en-IN', { day: 'numeric', month: 'short' })}
        </Text>

        {/* Reconnecting banner */}
        {connectionState === 'reconnecting' && (
          <View style={styles.reconnectBanner}>
            <Text style={styles.reconnectText}>Reconnecting…</Text>
          </View>
        )}

        {/* Connecting loader */}
        {connectionState === 'connecting' && (
          <View style={styles.loaderContainer}>
            <ActivityIndicator color={colors.primary500} />
            <Text style={styles.loaderText}>Starting Live Guide…</Text>
          </View>
        )}

        <ScrollView style={styles.body} contentContainerStyle={styles.bodyContent}>
          {/* Activity Approaching Alert */}
          {activityAlert && (
            <View style={styles.activityAlertCard}>
              <View style={styles.activityAlertHeader}>
                <Text style={styles.activityAlertOverline}>⏰  TIME TO LEAVE</Text>
                <Pressable onPress={() => setActivityAlert(null)} hitSlop={8}>
                  <Text style={styles.activityAlertDismiss}>✕</Text>
                </Pressable>
              </View>
              <Text style={styles.activityAlertTitle}>{activityAlert.activity}</Text>
              <Text style={styles.activityAlertMeta}>
                {activityAlert.distance < 1000
                  ? `${activityAlert.distance}m away`
                  : `${(activityAlert.distance / 1000).toFixed(1)}km away`}
                {' · '}{activityAlert.estimatedTravelTime} min travel
              </Text>
              <MapLinkButton mapQuery={activityAlert.mapQuery} />
            </View>
          )}

          {/* Morning Briefing */}
          {briefing && (
            <View style={styles.briefingCard}>
              <Text style={styles.briefingOverline}>☀️  MORNING BRIEFING</Text>
              <Text style={styles.briefingText}>{briefing}</Text>
              <Text style={styles.briefingCaption}>Generated by Sarthi AI</Text>
            </View>
          )}

          {/* Meal nudge card — shown when backend pushes a meal suggestion */}
          {mealNudge && (
            <View style={styles.mealNudgeCard}>
              <Text style={styles.mealNudgeOverline}>🍽️  {mealNudge.meal.toUpperCase()}</Text>
              <Text style={styles.mealNudgeText}>{mealNudge.suggestion}</Text>
            </View>
          )}

          <Text style={styles.sectionLabel}>Today's Plan</Text>

          {/* Empty state */}
          {connectionState === 'connected' && (!todayPlan || todayPlan.length === 0) && (
            <View style={styles.emptyState}>
              <Text style={styles.emptyText}>No itinerary for today. Generate one from the trip detail screen.</Text>
            </View>
          )}

          {/* Activity list */}
          {todayPlan?.map((activity: Activity, idx: number) => {
            const isCurrent = idx === currentIndex;
            const isPast = activity.status === 'done' || activity.status === 'skipped';

            return (
              <View key={idx}>
                <View style={[styles.activityCard, isCurrent && styles.activityCardCurrent, isPast && styles.activityCardPast]}>
                  <View style={styles.activityHeader}>
                    <Text style={[styles.activityTime, isPast && styles.activityTimePast]}>
                      {isCurrent ? `NOW · ${activity.time}` : activity.time}
                    </Text>
                    {activity.status === 'done' && <Text style={styles.doneTag}>✓ Done</Text>}
                    {activity.status === 'skipped' && <Text style={styles.skippedTag}>Skipped</Text>}
                  </View>
                  <Text style={styles.activityName}>{activity.activity}</Text>
                  <Text style={styles.activityMeta}>
                    {String(activity.cost).includes('₹') ? activity.cost : `₹${activity.cost}`}
                    {activity.healthNote ? ` · ${activity.healthNote}` : ''}
                  </Text>

                  {isCurrent && (
                    <View style={styles.btnRow}>
                      <Pressable style={styles.btnDone} onPress={() => markDone(dayIndex ?? 0, idx)}>
                        <Text style={styles.btnDoneText}>✓ Done</Text>
                      </Pressable>
                      <Pressable style={styles.btnSkip} onPress={() => skipActivity(dayIndex ?? 0, idx)}>
                        <Text style={styles.btnSkipText}>Skip</Text>
                      </Pressable>
                      <Pressable style={styles.btnReplan} onPress={handleReplan} disabled={isReplanning}>
                        {isReplanning
                          ? <ActivityIndicator size="small" color={colors.primary500} />
                          : <Text style={styles.btnReplanText}>⟳ Replan Day</Text>}
                      </Pressable>
                    </View>
                  )}
                </View>

                {/* Nearby suggestion below current activity */}
                {isCurrent && nearbySuggestion && (
                  <View style={styles.suggestionCard}>
                    <View style={styles.suggestionCardHeader}>
                      <Text style={styles.suggestionOverline}>📍 Nearby Suggestion</Text>
                      {nearbySuggestion.matchScore !== undefined && (
                        <View style={styles.matchScoreBadge}>
                          <Text style={styles.matchScoreText}>{nearbySuggestion.matchScore}% match</Text>
                        </View>
                      )}
                    </View>
                    <Text style={styles.suggestionName}>{nearbySuggestion.placeName}</Text>
                    <Text style={styles.suggestionText}>{nearbySuggestion.suggestion}</Text>
                    {nearbySuggestion.reasoning && (
                      <Text style={styles.suggestionReasoning}>{nearbySuggestion.reasoning}</Text>
                    )}
                    {nearbySuggestion.estimatedTravelTime !== undefined && (
                      <Text style={styles.suggestionTravelTime}>~{nearbySuggestion.estimatedTravelTime} min away</Text>
                    )}
                    <MapLinkButton mapQuery={nearbySuggestion.mapQuery} />
                  </View>
                )}
              </View>
            );
          })}
        </ScrollView>
      </View>
    </>
  );
}

function makeStyles(colors: ReturnType<typeof useColors>) {
  return StyleSheet.create({
    container: { flex: 1, backgroundColor: colors.bgBase },
    header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingHorizontal: 16, paddingTop: 52, paddingBottom: 4 },
    backBtn: { fontSize: 14, fontWeight: '700', color: colors.primary500 },
    headerBadges: { flexDirection: 'row', alignItems: 'center', gap: 6 },
    liveBadge: { flexDirection: 'row', alignItems: 'center', gap: 4, backgroundColor: '#E8F5E9', borderRadius: 20, paddingHorizontal: 10, paddingVertical: 3, borderWidth: 1, borderColor: '#A5D6A7' },
    liveDot: { width: 6, height: 6, borderRadius: 3, backgroundColor: '#2E7D32' },
    liveText: { fontSize: 10, fontWeight: '700', color: '#2E7D32' },
    pendingPill: { backgroundColor: colors.primary500, borderRadius: 20, paddingHorizontal: 8, paddingVertical: 3 },
    pendingPillText: { fontSize: 10, fontWeight: '700', color: '#fff' },
    stopBtn: {
      backgroundColor: 'rgba(239,68,68,0.1)',
      borderWidth: 1.5,
      borderColor: '#EF4444',
      borderRadius: 10,
      paddingHorizontal: 12,
      paddingVertical: 5,
    },
    stopBtnText: { fontSize: 11, fontWeight: '700', color: '#EF4444' },
    screenTitle: { fontSize: 22, fontWeight: '800', color: colors.textPrimary, paddingHorizontal: 16, marginTop: 4, letterSpacing: -0.5 },
    dayLabel: { fontSize: 12, color: colors.textSecondary, paddingHorizontal: 16, marginBottom: 4 },
    reconnectBanner: { backgroundColor: '#FFF3E0', padding: 8, alignItems: 'center' },
    reconnectText: { fontSize: 12, color: '#F57C00', fontWeight: '600' },
    loaderContainer: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: 12 },
    loaderText: { color: colors.textSecondary, fontSize: 14 },
    body: { flex: 1 },
    bodyContent: { padding: 16, gap: 8, paddingBottom: 40 },
    briefingCard: { backgroundColor: '#1B3A2D', borderRadius: 12, padding: 14, marginBottom: 4 },
    briefingOverline: { fontSize: 10, fontWeight: '700', letterSpacing: 1.5, color: 'rgba(255,255,255,0.5)', textTransform: 'uppercase', marginBottom: 6 },
    briefingText: { fontSize: 13, color: '#F5E6D3', lineHeight: 20 },
    briefingCaption: { fontSize: 10, color: 'rgba(255,255,255,0.3)', marginTop: 6 },
    sectionLabel: { fontSize: 10, fontWeight: '700', letterSpacing: 1.5, textTransform: 'uppercase', color: colors.textSecondary, marginBottom: 4 },
    emptyState: { padding: 24, alignItems: 'center' },
    emptyText: { fontSize: 14, color: colors.textSecondary, textAlign: 'center', lineHeight: 22 },
    activityCard: { backgroundColor: colors.bgCard, borderRadius: 12, padding: 12, borderWidth: 1.5, borderColor: colors.border, marginBottom: 6 },
    activityCardCurrent: { borderColor: colors.primary500, shadowColor: colors.primary500, shadowOpacity: 0.15, shadowRadius: 8, shadowOffset: { width: 0, height: 2 } },
    activityCardPast: { opacity: 0.45 },
    activityHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 2 },
    activityTime: { fontSize: 10, fontWeight: '700', color: colors.primary500, letterSpacing: 0.3 },
    activityTimePast: { color: colors.textTertiary },
    doneTag: { fontSize: 9, fontWeight: '700', color: '#2E7D32', backgroundColor: '#E8F5E9', paddingHorizontal: 6, paddingVertical: 2, borderRadius: 6 },
    skippedTag: { fontSize: 9, fontWeight: '700', color: colors.textSecondary, backgroundColor: colors.bgSurface, paddingHorizontal: 6, paddingVertical: 2, borderRadius: 6 },
    activityName: { fontSize: 14, fontWeight: '700', color: colors.textPrimary, marginVertical: 2 },
    activityMeta: { fontSize: 11, color: colors.textSecondary },
    btnRow: { flexDirection: 'row', gap: 6, marginTop: 10, flexWrap: 'wrap' },
    btnDone: { backgroundColor: colors.primary500, borderRadius: 8, paddingVertical: 6, paddingHorizontal: 12 },
    btnDoneText: { fontSize: 11, fontWeight: '700', color: '#fff' },
    btnSkip: { backgroundColor: colors.bgSurface, borderRadius: 8, paddingVertical: 6, paddingHorizontal: 12, borderWidth: 1.5, borderColor: colors.border },
    btnSkipText: { fontSize: 11, fontWeight: '600', color: colors.textSecondary },
    btnReplan: { backgroundColor: colors.primary50, borderRadius: 8, paddingVertical: 6, paddingHorizontal: 12, borderWidth: 1.5, borderColor: colors.primary200, marginLeft: 'auto' },
    btnReplanText: { fontSize: 11, fontWeight: '700', color: colors.primary500 },
    // Activity Alert Card
    activityAlertCard: {
      backgroundColor: colors.warningBg,
      borderRadius: 12,
      padding: 14,
      borderWidth: 2,
      borderColor: colors.warning,
      marginBottom: 4,
      shadowColor: colors.warning,
      shadowOpacity: 0.18,
      shadowRadius: 8,
      shadowOffset: { width: 0, height: 2 },
      elevation: 3,
    },
    activityAlertHeader: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
      marginBottom: 4,
    },
    activityAlertOverline: {
      fontSize: 10,
      fontWeight: '700',
      letterSpacing: 1.5,
      textTransform: 'uppercase',
      color: colors.warning,
    },
    activityAlertDismiss: {
      fontSize: 13,
      fontWeight: '600',
      color: colors.warning,
      opacity: 0.7,
    },
    activityAlertTitle: {
      fontSize: 15,
      fontWeight: '800',
      color: colors.textPrimary,
      marginBottom: 3,
      letterSpacing: -0.3,
    },
    activityAlertMeta: {
      fontSize: 12,
      color: colors.textSecondary,
      marginBottom: 8,
    },
    // Suggestion Card Enhancements
    suggestionCard: { backgroundColor: colors.primary50, borderRadius: 12, padding: 12, borderWidth: 1.5, borderColor: colors.primary200, marginBottom: 6 },
    suggestionCardHeader: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
      marginBottom: 3,
    },
    suggestionOverline: { fontSize: 9, fontWeight: '700', letterSpacing: 1, textTransform: 'uppercase', color: colors.primary500 },
    matchScoreBadge: {
      backgroundColor: colors.primary500,
      borderRadius: 10,
      paddingHorizontal: 7,
      paddingVertical: 2,
    },
    matchScoreText: {
      fontSize: 9,
      fontWeight: '700',
      color: '#fff',
    },
    suggestionName: { fontSize: 13, fontWeight: '700', color: colors.textPrimary },
    suggestionText: { fontSize: 11, color: colors.textSecondary, lineHeight: 17, marginTop: 2 },
    suggestionReasoning: {
      fontSize: 11,
      fontStyle: 'italic',
      color: colors.textSecondary,
      lineHeight: 16,
      marginTop: 3,
    },
    suggestionTravelTime: {
      fontSize: 10,
      fontWeight: '600',
      color: colors.textTertiary,
      marginTop: 1,
      marginBottom: 6,
    },
    mealNudgeCard: { backgroundColor: '#E8F5E9', borderRadius: 12, padding: 12, borderWidth: 1.5, borderColor: '#A5D6A7', marginBottom: 6 },
    mealNudgeOverline: { fontSize: 9, fontWeight: '700', letterSpacing: 1, textTransform: 'uppercase', color: '#2E7D32', marginBottom: 3 },
    mealNudgeText: { fontSize: 12, color: '#1B5E20', lineHeight: 18 },
  });
}
