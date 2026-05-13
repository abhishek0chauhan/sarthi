let mockLiveGuideStoreState = { activeTripId: null as string | null, dayIndex: 0 };
jest.mock('@/stores/live-guide.store', () => ({
  useLiveGuideStore: (selector: any) => selector(mockLiveGuideStoreState),
}));

const mockDeactivate = jest.fn();
jest.mock('@/hooks/useLiveGuide', () => ({
  useLiveGuide: () => ({ deactivate: mockDeactivate }),
}));

import React from 'react';
import { render, fireEvent, waitFor } from '@testing-library/react-native';
import TripDetailScreen from '@/app/trip/[id]/index';

const mockPush = jest.fn();
const mockBack = jest.fn();
const mockLocationPermission = jest.fn().mockResolvedValue({ granted: true });

jest.mock('expo-router', () => ({
  useRouter: () => ({ push: mockPush, back: mockBack }),
  useLocalSearchParams: () => ({ id: 'trip-123' })
}));

jest.mock('@/hooks/useTrips', () => ({
  useTrip: jest.fn()
}));

jest.mock('@/hooks/useEnrichment', () => ({
  useEnrichTrip: () => ({ mutate: jest.fn(), isPending: false })
}));

jest.mock('expo-location', () => ({
  __esModule: true,
  requestForegroundPermissionsAsync: mockLocationPermission,
  watchPositionAsync: jest.fn(),
  Accuracy: { Balanced: 5 }
}));

jest.mock('react-native-safe-area-context', () => ({
  useSafeAreaInsets: () => ({ top: 0, bottom: 0, left: 0, right: 0 })
}));

jest.mock('@/hooks/useColorScheme', () => ({
  useColors: () => ({
    bgBase: '#FFFFFF',
    bgCard: '#F5F5F5',
    textPrimary: '#000000',
    textInverse: '#FFFFFF',
    textSecondary: '#666666',
    textTertiary: '#999999',
    primary500: '#2563EB',
    border: '#E5E5E5',
    success: '#10B981'
  })
}));

jest.mock('@/utils/destinationGradient', () => ({
  destinationGradient: () => ['#FF6B6B', '#FF8E72', '#FFA987']
}));

jest.mock('expo-linear-gradient', () => ({
  LinearGradient: ({ children }: any) => children
}));

import { useTrip } from '@/hooks/useTrips';

const baseTrip = {
  id: 'trip-123',
  name: 'Paris Trip',
  destination: 'Paris',
  state: 'France',
  dates: {
    from: '2026-05-01',
    to: '2026-05-10'
  },
  itineraryData: {
    tripReadiness: 75,
    highlights: ['Eiffel Tower', 'Louvre', 'Versailles'],
    itinerary: [{ day: 1, activities: [] }]
  },
  foodGuideData: {
    mustTryDishes: [{ name: 'Croissant' }]
  }
};

describe('TripDetailScreen - Live Active Banner', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockLiveGuideStoreState = { activeTripId: 'trip-123', dayIndex: 1 };
    (useTrip as jest.Mock).mockReturnValue({
      data: baseTrip,
      isLoading: false,
      error: null
    });
  });

  afterEach(() => {
    mockLiveGuideStoreState = { activeTripId: null, dayIndex: 0 };
  });

  it('shows banner when activeTripId matches current trip', () => {
    const { getByText } = render(<TripDetailScreen />);
    expect(getByText('🗺️ Live Guide is running')).toBeTruthy();
    expect(getByText('LIVE MODE ACTIVE')).toBeTruthy();
  });

  it('shows correct day number in banner', () => {
    const { getByText } = render(<TripDetailScreen />);
    expect(getByText(/Day 2/)).toBeTruthy(); // dayIndex 1 → Day 2
  });

  it('pressing Stop in banner calls deactivate', () => {
    const { getByText } = render(<TripDetailScreen />);
    fireEvent.press(getByText('■ Stop'));
    expect(mockDeactivate).toHaveBeenCalled();
  });
});

describe('TripDetailScreen - Live Guide Tile', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockLiveGuideStoreState = { activeTripId: null, dayIndex: 0 };
  });

  it('shows Live Guide tile on active day', () => {
    // Mock today as 2026-05-05 (within trip dates 2026-05-01 to 2026-05-10)
    jest.useFakeTimers();
    jest.setSystemTime(new Date('2026-05-05'));

    (useTrip as jest.Mock).mockReturnValue({
      data: baseTrip,
      isLoading: false,
      error: null
    });

    const { getByText } = render(<TripDetailScreen />);

    expect(getByText('Live Guide')).toBeTruthy();
    expect(getByText('Day 5 · Active now')).toBeTruthy();

    jest.useRealTimers();
  });

  it('hides Live Guide tile on non-active day', () => {
    // Mock today as 2026-04-20 (before trip start 2026-05-01)
    jest.useFakeTimers();
    jest.setSystemTime(new Date('2026-04-20'));

    (useTrip as jest.Mock).mockReturnValue({
      data: baseTrip,
      isLoading: false,
      error: null
    });

    const { queryByText } = render(<TripDetailScreen />);

    expect(queryByText('Live Guide')).toBeFalsy();
    expect(queryByText('Day 5 · Active now')).toBeFalsy();

    jest.useRealTimers();
  });

  it('renders Live Guide tile with correct day number', () => {
    // Mock today as 2026-05-06 (day 6 of trip: 2026-05-01 to 2026-05-10)
    jest.useFakeTimers();
    jest.setSystemTime(new Date('2026-05-06'));

    (useTrip as jest.Mock).mockReturnValue({
      data: baseTrip,
      isLoading: false,
      error: null
    });

    const { getByText } = render(<TripDetailScreen />);

    expect(getByText('Live Guide')).toBeTruthy();
    expect(getByText('Day 6 · Active now')).toBeTruthy();

    jest.useRealTimers();
  });
});
