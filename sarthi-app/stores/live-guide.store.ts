import { create } from 'zustand';
import type { Activity, Suggestion, ConnectionState } from '@/types/live-guide.types';

interface LiveGuideState {
  sessionId: string | null;
  isActive: boolean;
  connectionState: ConnectionState;
  briefing: string | null;
  dayIndex: number | null;
  todayPlan: Activity[] | null;
  nearbySuggestion: Suggestion | null;
  mealNudge: { meal: string; suggestion: string } | null;
  setSession: (sessionId: string, dayIndex: number) => void;
  setBriefing: (briefing: string | null) => void;
  setTodayPlan: (activities: Activity[]) => void;
  patchActivity: (dayIndex: number, activityIndex: number, status: 'done' | 'skipped') => void;
  setSuggestion: (suggestion: Suggestion | null) => void;
  setMealNudge: (nudge: { meal: string; suggestion: string } | null) => void;
  setConnectionState: (state: ConnectionState) => void;
  reset: () => void;
}

const initialState = {
  sessionId: null,
  isActive: false,
  connectionState: 'idle' as ConnectionState,
  briefing: null,
  dayIndex: null,
  todayPlan: null,
  nearbySuggestion: null,
  mealNudge: null,
};

export const useLiveGuideStore = create<LiveGuideState>((set) => ({
  ...initialState,

  setSession: (sessionId, dayIndex) =>
    set({ sessionId, dayIndex, isActive: true }),

  setBriefing: (briefing) => set({ briefing }),

  setTodayPlan: (activities) => set({ todayPlan: activities }),

  patchActivity: (_, activityIndex, status) =>
    set((state) => {
      if (!state.todayPlan) return state;
      const todayPlan = [...state.todayPlan];
      if (todayPlan[activityIndex]) {
        todayPlan[activityIndex] = { ...todayPlan[activityIndex], status };
      }
      return { todayPlan };
    }),

  setSuggestion: (nearbySuggestion) => set({ nearbySuggestion }),

  setMealNudge: (mealNudge) => set({ mealNudge }),

  setConnectionState: (connectionState) => set({ connectionState }),

  reset: () => set(initialState),
}));
