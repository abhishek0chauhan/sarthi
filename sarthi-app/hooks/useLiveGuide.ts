import { socketService } from '@/services/socket.service';
import { authService } from '@/services/auth.service';
import { useLiveGuideStore } from '@/stores/live-guide.store';
import type { GuideActivatedPayload, Activity, Suggestion } from '@/types/live-guide.types';

export function useLiveGuide() {
  const store = useLiveGuideStore();

  const activate = async (tripId: string, fcmToken: string | null) => {
    store.setConnectionState('connecting');
    const token = await authService.getToken();
    if (!token) {
      store.setConnectionState('idle');
      throw new Error('Not authenticated');
    }
    socketService.connect(token);

    socketService.on('guide_activated', (payload: GuideActivatedPayload) => {
      store.setConnectionState('connected');
      store.setSession(payload.sessionId, payload.todayPlan.dayIndex);
      store.setBriefing(payload.briefing);
      store.setTodayPlan(
        (payload.todayPlan.activities ?? []).map((a) => ({ ...a, status: a.status ?? 'pending' }))
      );
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

    socketService.on('error', () => {
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

  const requestReplan = () => {
    const dayIndex = useLiveGuideStore.getState().dayIndex ?? 0;
    socketService.emit('request_replan', { dayIndex });
  };

  const deactivate = () => {
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
