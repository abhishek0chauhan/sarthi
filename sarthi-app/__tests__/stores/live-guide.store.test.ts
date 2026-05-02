import { useLiveGuideStore } from '@/stores/live-guide.store';
import type { Activity, Suggestion } from '@/types/live-guide.types';

const mockActivity = (overrides: Partial<Activity> = {}): Activity => ({
  time: '9:00 AM', activity: 'Amber Fort', cost: 550, status: 'pending', ...overrides,
});

beforeEach(() => {
  useLiveGuideStore.setState({
    sessionId: null, isActive: false, connectionState: 'idle',
    briefing: null, dayIndex: null, todayPlan: null, nearbySuggestion: null, mealNudge: null,
  });
});

describe('live-guide store', () => {
  it('starts in idle state', () => {
    const s = useLiveGuideStore.getState();
    expect(s.sessionId).toBeNull();
    expect(s.isActive).toBe(false);
    expect(s.connectionState).toBe('idle');
  });

  it('setSession updates sessionId, dayIndex, and isActive', () => {
    useLiveGuideStore.getState().setSession('sess-1', 2);
    const s = useLiveGuideStore.getState();
    expect(s.sessionId).toBe('sess-1');
    expect(s.dayIndex).toBe(2);
    expect(s.isActive).toBe(true);
  });

  it('setBriefing updates briefing', () => {
    useLiveGuideStore.getState().setBriefing('Good morning!');
    expect(useLiveGuideStore.getState().briefing).toBe('Good morning!');
  });

  it('setTodayPlan stores activities', () => {
    const activities = [mockActivity(), mockActivity({ time: '12:00 PM', status: 'pending' })];
    useLiveGuideStore.getState().setTodayPlan(activities);
    expect(useLiveGuideStore.getState().todayPlan).toHaveLength(2);
  });

  it('patchActivity updates status of correct activity', () => {
    const activities = [mockActivity(), mockActivity({ time: '12:00 PM' })];
    useLiveGuideStore.getState().setTodayPlan(activities);
    useLiveGuideStore.getState().patchActivity(0, 0, 'done');
    expect(useLiveGuideStore.getState().todayPlan![0].status).toBe('done');
    expect(useLiveGuideStore.getState().todayPlan![1].status).toBe('pending');
  });

  it('patchActivity is a no-op when todayPlan is null', () => {
    expect(() => useLiveGuideStore.getState().patchActivity(0, 0, 'done')).not.toThrow();
  });

  it('setSuggestion stores suggestion', () => {
    const suggestion: Suggestion = { suggestion: 'Check out the market', placeName: 'Old Market', mapQuery: 'Old Market Jaipur' };
    useLiveGuideStore.getState().setSuggestion(suggestion);
    expect(useLiveGuideStore.getState().nearbySuggestion).toEqual(suggestion);
  });

  it('setMealNudge stores nudge', () => {
    const nudge = { meal: 'Lunch', suggestion: 'Try dal baati nearby' };
    useLiveGuideStore.getState().setMealNudge(nudge);
    expect(useLiveGuideStore.getState().mealNudge).toEqual(nudge);
  });

  it('setMealNudge can clear nudge with null', () => {
    useLiveGuideStore.getState().setMealNudge({ meal: 'Breakfast', suggestion: 'Try paratha' });
    useLiveGuideStore.getState().setMealNudge(null);
    expect(useLiveGuideStore.getState().mealNudge).toBeNull();
  });

  it('setConnectionState updates connectionState', () => {
    useLiveGuideStore.getState().setConnectionState('reconnecting');
    expect(useLiveGuideStore.getState().connectionState).toBe('reconnecting');
  });

  it('reset clears all state', () => {
    useLiveGuideStore.getState().setSession('sess-1', 0);
    useLiveGuideStore.getState().setBriefing('Morning!');
    useLiveGuideStore.getState().reset();
    const s = useLiveGuideStore.getState();
    expect(s.sessionId).toBeNull();
    expect(s.isActive).toBe(false);
    expect(s.briefing).toBeNull();
    expect(s.todayPlan).toBeNull();
  });
});
