import React from 'react';
import { render, fireEvent } from '@testing-library/react-native';
import TripDetailScreen from '@/app/trip/[id]/index';

const mockPush = jest.fn();
const mockBack = jest.fn();
const mockEnrichTrip = jest.fn();

jest.mock('expo-router', () => ({
  useRouter: () => ({ push: mockPush, back: mockBack }),
  useLocalSearchParams: () => ({ id: 'trip-1' })
}));

jest.mock('@/hooks/useTrips', () => ({
  useTrip: jest.fn()
}));

jest.mock('@/hooks/useEnrichment', () => ({
  useEnrichTrip: () => ({ mutate: mockEnrichTrip, isPending: false })
}));

jest.mock('expo-location', () => ({
  __esModule: true,
  requestForegroundPermissionsAsync: jest.fn().mockResolvedValue({ granted: false }),
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
    primary50: '#F0F9FF',
    primary200: '#BFDBFE',
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
  id: 'trip-1',
  name: 'Meghalaya Trip',
  destination: 'Shillong',
  state: 'Meghalaya',
  dates: {
    from: '2026-06-01',
    to: '2026-06-05'
  },
  itineraryData: {
    tripReadiness: 80,
    highlights: [],
    itinerary: [{ day: 1, activities: [] }]
  },
  foodGuideData: null
};

describe('TripDetail enrichment tiles', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('renders Phrasebook tile', () => {
    // Mock today as before trip start (inactive day)
    jest.useFakeTimers();
    jest.setSystemTime(new Date('2026-05-20'));

    (useTrip as jest.Mock).mockReturnValue({
      data: baseTrip,
      isLoading: false,
      error: null
    });

    const { getByText } = render(<TripDetailScreen />);
    expect(getByText('Phrasebook')).toBeTruthy();

    jest.useRealTimers();
  });

  it('renders Trip Chat tile', () => {
    // Mock today as before trip start (inactive day)
    jest.useFakeTimers();
    jest.setSystemTime(new Date('2026-05-20'));

    (useTrip as jest.Mock).mockReturnValue({
      data: baseTrip,
      isLoading: false,
      error: null
    });

    const { getByText } = render(<TripDetailScreen />);
    expect(getByText('Trip Chat')).toBeTruthy();

    jest.useRealTimers();
  });

  it('navigates to phrasebook on tile press', () => {
    // Mock today as before trip start (inactive day)
    jest.useFakeTimers();
    jest.setSystemTime(new Date('2026-05-20'));

    (useTrip as jest.Mock).mockReturnValue({
      data: baseTrip,
      isLoading: false,
      error: null
    });

    const { getByText } = render(<TripDetailScreen />);
    fireEvent.press(getByText('Phrasebook'));
    expect(mockPush).toHaveBeenCalledWith('/trip/trip-1/phrasebook');

    jest.useRealTimers();
  });

  it('navigates to chat on tile press', () => {
    // Mock today as before trip start (inactive day)
    jest.useFakeTimers();
    jest.setSystemTime(new Date('2026-05-20'));

    (useTrip as jest.Mock).mockReturnValue({
      data: baseTrip,
      isLoading: false,
      error: null
    });

    const { getByText } = render(<TripDetailScreen />);
    fireEvent.press(getByText('Trip Chat'));
    expect(mockPush).toHaveBeenCalledWith('/trip/trip-1/chat');

    jest.useRealTimers();
  });
});
