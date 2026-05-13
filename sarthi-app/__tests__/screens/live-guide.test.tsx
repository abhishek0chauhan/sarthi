const mockActivate = jest.fn().mockResolvedValue(undefined);
const mockMarkDone = jest.fn();
const mockSkipActivity = jest.fn();
const mockRequestReplan = jest.fn();
const mockDeactivate = jest.fn();

jest.mock('@/hooks/useLiveGuide', () => ({
  useLiveGuide: () => ({
    activate: mockActivate,
    markDone: mockMarkDone,
    skipActivity: mockSkipActivity,
    requestReplan: mockRequestReplan,
    deactivate: mockDeactivate,
    isActive: true,
    connectionState: 'connected',
    briefing: 'Start early at Amber Fort.',
    dayIndex: 0,
    todayPlan: [
      { time: '9:00 AM', activity: 'Amber Fort', cost: 550, status: 'pending' },
      { time: '12:00 PM', activity: 'Hawa Mahal', cost: 200, status: 'pending' },
    ],
    nearbySuggestion: null,
    sessionId: 'sess-1',
  }),
}));
jest.mock('@/services/notifications.service', () => ({
  notificationsService: { getCachedToken: () => 'fcm-token' },
  notificationNavState: { navigatingToLiveGuide: false },
}));
jest.mock('expo-router', () => ({
  useLocalSearchParams: () => ({ id: 'trip-1' }),
  router: { back: jest.fn() },
  Stack: { Screen: () => null },
}));
jest.mock('@/hooks/useTrips', () => ({
  useTrip: () => ({ data: { name: 'Jaipur Trip' } }),
  useActivitySchedule: () => ({ data: [] }),
}));

import React from 'react';
import { render, fireEvent } from '@testing-library/react-native';
import LiveGuideScreen from '@/app/trip/[id]/live-guide';

describe('LiveGuideScreen', () => {
  it('renders morning briefing card', () => {
    const { getByText } = render(<LiveGuideScreen />);
    expect(getByText('Start early at Amber Fort.')).toBeTruthy();
  });

  it('renders current activity with Done and Skip buttons', () => {
    const { getByText } = render(<LiveGuideScreen />);
    expect(getByText('Amber Fort')).toBeTruthy();
    expect(getByText('✓ Done')).toBeTruthy();
    expect(getByText('Skip')).toBeTruthy();
  });

  it('calls markDone when Done is pressed', () => {
    const { getByText } = render(<LiveGuideScreen />);
    fireEvent.press(getByText('✓ Done'));
    expect(mockMarkDone).toHaveBeenCalledWith(0, 0);
  });

  it('calls skipActivity when Skip is pressed', () => {
    const { getByText } = render(<LiveGuideScreen />);
    fireEvent.press(getByText('Skip'));
    expect(mockSkipActivity).toHaveBeenCalledWith(0, 0);
  });

  it('pressing Stop calls deactivate and navigates back', () => {
    const { getByText } = render(<LiveGuideScreen />);
    fireEvent.press(getByText('■ Stop'));
    expect(mockDeactivate).toHaveBeenCalled();
    expect(require('expo-router').router.back).toHaveBeenCalled();
  });

  it('pressing back arrow does NOT call deactivate', () => {
    mockDeactivate.mockClear();
    const { getByText } = render(<LiveGuideScreen />);
    fireEvent.press(getByText(`← Jaipur Trip`));
    expect(mockDeactivate).not.toHaveBeenCalled();
  });
});
