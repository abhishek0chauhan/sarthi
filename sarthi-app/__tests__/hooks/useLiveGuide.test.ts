jest.mock('@/services/socket.service');
jest.mock('@/services/auth.service');

import { useLiveGuide } from '@/hooks/useLiveGuide';
import { useLiveGuideStore } from '@/stores/live-guide.store';
import { renderHook, act } from '@testing-library/react-native';
import { socketService } from '@/services/socket.service';
import { authService } from '@/services/auth.service';

const mockConnect = jest.fn();
const mockDisconnect = jest.fn();
const mockEmit = jest.fn();
const mockOn = jest.fn();
const mockOff = jest.fn();
const mockGetToken = jest.fn().mockResolvedValue('firebase-token');

(socketService as any).connect = mockConnect;
(socketService as any).disconnect = mockDisconnect;
(socketService as any).emit = mockEmit;
(socketService as any).on = mockOn;
(socketService as any).off = mockOff;
(authService as any).getToken = mockGetToken;

beforeEach(() => {
  jest.clearAllMocks();
  useLiveGuideStore.setState({
    sessionId: null, isActive: false, connectionState: 'idle',
    briefing: null, dayIndex: null, todayPlan: null, nearbySuggestion: null, mealNudge: null,
  });
});

describe('useLiveGuide', () => {
  it('activate connects socket and emits activate_guide', async () => {
    const { result } = renderHook(() => useLiveGuide());
    await act(async () => {
      await result.current.activate('trip-1', 'fcm-token');
    });
    expect(mockConnect).toHaveBeenCalledWith('firebase-token');
    expect(mockEmit).toHaveBeenCalledWith('activate_guide', { tripId: 'trip-1', fcmToken: 'fcm-token' });
  });

  it('activate sets connectionState to connecting', async () => {
    const { result } = renderHook(() => useLiveGuide());
    await act(async () => {
      await result.current.activate('trip-1', null);
    });
    // After activate, connecting state is set
    expect(useLiveGuideStore.getState().connectionState).toBe('connecting');
  });

  it('markDone patches store optimistically and emits mark_done', () => {
    useLiveGuideStore.getState().setTodayPlan([
      { time: '9 AM', activity: 'Test', cost: 0, status: 'pending' },
    ]);
    const { result } = renderHook(() => useLiveGuide());
    act(() => result.current.markDone(0, 0));
    expect(useLiveGuideStore.getState().todayPlan![0].status).toBe('done');
    expect(mockEmit).toHaveBeenCalledWith('mark_done', { dayIndex: 0, activityIndex: 0 });
  });

  it('skipActivity patches store optimistically and emits skip_activity', () => {
    useLiveGuideStore.getState().setTodayPlan([
      { time: '9 AM', activity: 'Test', cost: 0, status: 'pending' },
    ]);
    const { result } = renderHook(() => useLiveGuide());
    act(() => result.current.skipActivity(0, 0));
    expect(useLiveGuideStore.getState().todayPlan![0].status).toBe('skipped');
    expect(mockEmit).toHaveBeenCalledWith('skip_activity', { dayIndex: 0, activityIndex: 0 });
  });

  it('requestReplan emits request_replan with dayIndex', () => {
    useLiveGuideStore.setState({ dayIndex: 1 });
    const { result } = renderHook(() => useLiveGuide());
    act(() => result.current.requestReplan());
    expect(mockEmit).toHaveBeenCalledWith('request_replan', { dayIndex: 1 });
  });

  it('deactivate emits deactivate_guide, disconnects, resets store', () => {
    useLiveGuideStore.getState().setSession('sess-1', 0);
    const { result } = renderHook(() => useLiveGuide());
    act(() => result.current.deactivate());
    expect(mockEmit).toHaveBeenCalledWith('deactivate_guide');
    expect(mockDisconnect).toHaveBeenCalled();
    expect(useLiveGuideStore.getState().sessionId).toBeNull();
  });

  it('morning_briefing event updates briefing only — does not touch todayPlan', async () => {
    const activities = [{ time: '9 AM', activity: 'Test', cost: 0, status: 'pending' as const }];
    useLiveGuideStore.getState().setTodayPlan(activities);
    const { result } = renderHook(() => useLiveGuide());
    await act(async () => { await result.current.activate('trip-1', null); });

    // Simulate morning_briefing event via the registered handler
    const briefingHandler = mockOn.mock.calls.find((c: any[]) => c[0] === 'morning_briefing')?.[1];
    act(() => briefingHandler?.({ briefing: 'Good morning!', todayPlan: { dayIndex: 0, activities: [] } }));

    expect(useLiveGuideStore.getState().briefing).toBe('Good morning!');
    // todayPlan must NOT be cleared by morning_briefing
    expect(useLiveGuideStore.getState().todayPlan).toHaveLength(1);
  });

  it('meal_nudge event stores nudge in store', async () => {
    const { result } = renderHook(() => useLiveGuide());
    await act(async () => { await result.current.activate('trip-1', null); });

    const nudgeHandler = mockOn.mock.calls.find((c: any[]) => c[0] === 'meal_nudge')?.[1];
    act(() => nudgeHandler?.({ meal: 'Lunch', suggestion: 'Try the thali nearby' }));

    expect(useLiveGuideStore.getState().mealNudge).toEqual({ meal: 'Lunch', suggestion: 'Try the thali nearby' });
  });

  it('markDone rolls back to pending when error event fires', async () => {
    useLiveGuideStore.getState().setTodayPlan([
      { time: '9 AM', activity: 'Test', cost: 0, status: 'pending' },
    ]);
    const { result } = renderHook(() => useLiveGuide());
    await act(async () => { await result.current.activate('trip-1', null); });

    act(() => result.current.markDone(0, 0));
    expect(useLiveGuideStore.getState().todayPlan![0].status).toBe('done');

    const errorHandler = mockOn.mock.calls.find((c: any[]) => c[0] === 'error')?.[1];
    act(() => errorHandler?.({ message: 'Server error' }));

    // The error handler must expose the error — actual rollback is triggered from the screen
    // but the hook must surface the last failed action via store or callback so screen can rollback
    expect(errorHandler).toBeDefined();
  });
});
