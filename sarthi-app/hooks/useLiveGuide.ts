import { socketService } from '@/services/socket.service';
import { authService } from '@/services/auth.service';
import { useLiveGuideStore } from '@/stores/live-guide.store';
import type { GuideActivatedPayload, Activity, Suggestion, ActivityApproachingAlert } from '@/types/live-guide.types';
import { liveModePersistence } from '@/services/live-mode.persistence';
import { locationService } from '@/services/location.service';
import * as Location from 'expo-location';

export function useLiveGuide() {
  const store = useLiveGuideStore();

  const activate = async (tripId: string, fcmToken: string | null) => {
    console.log('[useLiveGuide] activate called for trip:', tripId, 'fcmToken:', fcmToken ? 'present' : 'null');
    if (store.connectionState !== 'idle') return;
    try { await Location.requestBackgroundPermissionsAsync(); } catch { /* not supported in Expo Go — silently skip */ }
    store.setConnectionState('connecting');
    const token = await authService.getToken();
    if (!token) {
      console.log('[useLiveGuide] Not authenticated');
      store.setConnectionState('idle');
      throw new Error('Not authenticated');
    }
    const events = [
      'guide_activated', 'activity_marked', 'replan_result',
      'location_suggestion', 'activity_approaching', 'morning_briefing',
      'meal_nudge', 'guide_deactivated', 'error', 'connect', 'disconnect',
    ] as const;
    events.forEach((e) => socketService.off(e));
    console.log('[useLiveGuide] connecting socket with auth token');
    socketService.connect(token);

    // Wait for socket to connect before setting up listeners
    await new Promise<void>((resolve) => {
      socketService.on('connect', () => {
        console.log('[useLiveGuide] socket connected');
        resolve();
      });
    });

    socketService.on('guide_activated', (payload: GuideActivatedPayload) => {
      console.log('[useLiveGuide] guide_activated received', payload);
      store.setConnectionState('connected');
      store.setSession(payload.sessionId, payload.todayPlan.dayIndex);
      store.setBriefing(payload.briefing);
      store.setTodayPlan(
        (payload.todayPlan.activities ?? []).map((a) => ({ ...a, status: a.status ?? 'pending' }))
      );
      store.setActiveTripId(tripId);
      liveModePersistence.save({
        tripId,
        sessionId: payload.sessionId,
        dayIndex: payload.todayPlan.dayIndex,
      });
      locationService.startTracking();
    });

    socketService.on('activity_marked', (payload: { dayIndex: number; activityIndex: number; status: 'done' | 'skipped' }) => {
      store.patchActivity(payload.dayIndex, payload.activityIndex, payload.status);
    });

    socketService.on('replan_result', (payload: { activities: Activity[] }) => {
      store.setTodayPlan(payload.activities.map((a) => ({ ...a, status: a.status ?? 'pending' })));
    });

    socketService.on('location_suggestion', (suggestion: Suggestion) => {
      store.setSuggestion(suggestion);
    });

    socketService.on('activity_approaching', (payload: ActivityApproachingAlert) => {
      store.setActivityAlert(payload);
    });

    socketService.on('morning_briefing', (payload: { briefing: string; todayPlan?: any }) => {
      // Only update briefing — spec says to ignore todayPlan from this event
      store.setBriefing(payload.briefing);
    });

    socketService.on('meal_nudge', (payload: { meal: string; suggestion: string }) => {
      store.setMealNudge(payload);
    });

    socketService.on('guide_deactivated', () => {
      store.reset();
    });

    socketService.on('error', (err) => {
      console.log('[useLiveGuide] socket error:', err);
      // errors handled in UI via returned state; screen can roll back optimistic updates
    });

    // On reconnect, re-emit activate_guide to restore full session state (spec requirement)
    // Note: socket.io 'connect' fires on initial connection AND reconnects.
    // On initial connect, isActive is false so no double-emit.
    socketService.on('connect', () => {
      if (useLiveGuideStore.getState().isActive) {
        socketService.emit('activate_guide', { tripId, fcmToken: fcmToken ?? undefined });
      }
    });

    socketService.on('disconnect', () => {
      if (useLiveGuideStore.getState().isActive) {
        store.setConnectionState('reconnecting');
      }
    });

    console.log('[useLiveGuide] emitting activate_guide event');
    socketService.emit('activate_guide', { tripId, fcmToken: fcmToken ?? undefined });
  };

  const markDone = (dayIndex: number, activityIndex: number) => {
    store.patchActivity(dayIndex, activityIndex, 'done');
    socketService.emit('mark_done', { dayIndex, activityIndex });
  };

  const skipActivity = (dayIndex: number, activityIndex: number, reason?: string) => {
    store.patchActivity(dayIndex, activityIndex, 'skipped');
    socketService.emit('skip_activity', { dayIndex, activityIndex, ...(reason ? { reason } : {}) });
  };

  const requestReplan = (onResult?: () => void) => {
    const dayIndex = useLiveGuideStore.getState().dayIndex ?? 0;
    console.log('[useLiveGuide] emit request_replan dayIndex=', dayIndex);

    // Set up one-time callback for completion (don't duplicate the main listener)
    if (onResult) {
      let called = false;
      const handler = () => {
        if (!called) {
          called = true;
          onResult();
          socketService.off('replan_result', handler);
        }
      };
      socketService.on('replan_result', handler);
    }

    socketService.emit('request_replan', { dayIndex });
  };

  const deactivate = () => {
    locationService.stopTracking();
    liveModePersistence.clear();
    store.setActiveTripId(null);
    socketService.emit('deactivate_guide');
    socketService.disconnect();
    store.reset();
  };

  return {
    ...store,
    activate,
    markDone,
    skipActivity,
    requestReplan,
    deactivate,
  };
}
