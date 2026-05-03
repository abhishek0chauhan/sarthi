const mockRemove = jest.fn();
const mockAdd = jest.fn();
const mockEnrich = jest.fn();

jest.mock('@/hooks/useEnrichment', () => ({
  useRemoveActivity: () => ({ mutate: mockRemove, isPending: false }),
  useAddActivity: () => ({ mutate: mockAdd, isPending: false }),
  useEnrichTrip: () => ({ mutate: mockEnrich, isPending: false }),
}));

jest.mock('expo-router', () => ({
  useLocalSearchParams: () => ({ id: 'trip-1' }),
}));

jest.mock('@/hooks/useTrips', () => ({
  useTrip: () => ({
    data: {
      id: 'trip-1',
      itineraryData: {
        itinerary: [{
          day: 1,
          title: 'Explore Old City',
          activities: [{ time: '9:00 AM', activity: 'Amber Fort', cost: '₹550' }],
          meals: { breakfast: 'Hotel', lunch: 'Local', dinner: 'Restaurant' },
        }],
      },
    },
    isLoading: false,
  }),
}));

jest.mock('@/hooks/useColorScheme', () => ({
  useColors: () => ({
    bgBase: '#FFFFFF',
    bgCard: '#F5F5F5',
    bgSurface: '#FAFAFA',
    textPrimary: '#000000',
    textSecondary: '#666666',
    textTertiary: '#999999',
    primary50: '#F0F9FF',
    primary200: '#BFDBFE',
    primary500: '#2563EB',
    border: '#E5E5E5',
  })
}));

jest.mock('react-native-safe-area-context', () => ({
  SafeAreaView: ({ children }: any) => children,
}));

jest.mock('@/components/trip/DayTabs', () => {
  return {
    DayTabs: ({ days, activeDay, onSelect }: any) => {
      const React = require('react');
      const { View, Text } = require('react-native');
      return React.createElement(View, null, `${days} days - Active: ${activeDay}`);
    },
  };
});

jest.mock('@/components/trip/ActivityCard', () => {
  return {
    ActivityCard: ({ activity }: any) => {
      const React = require('react');
      const { Text } = require('react-native');
      return React.createElement(Text, null, activity.activity);
    },
  };
});

jest.mock('@/components/trip/CostBreakdown', () => {
  return {
    CostBreakdown: () => {
      const React = require('react');
      const { Text } = require('react-native');
      return React.createElement(Text, null, 'Cost Breakdown');
    },
  };
});

jest.mock('@/components/ui/LoadingSpinner', () => {
  return {
    LoadingSpinner: () => {
      const React = require('react');
      const { Text } = require('react-native');
      return React.createElement(Text, null, 'Loading');
    },
  };
});

jest.mock('@/components/ui/EmptyState', () => {
  return {
    EmptyState: () => {
      const React = require('react');
      const { Text } = require('react-native');
      return React.createElement(Text, null, 'Empty');
    },
  };
});

import React from 'react';
import { render, fireEvent } from '@testing-library/react-native';
import { Alert } from 'react-native';
import TripItineraryScreen from '@/app/trip/[id]/itinerary';

// Mock Alert after importing
const alertSpy = jest.spyOn(Alert, 'alert');
alertSpy.mockImplementation((title, message, buttons) => {
  // Simulate pressing the "Remove" button (destructive option)
  const removeBtn = buttons?.find((b: any) => b.text === 'Remove');
  if (removeBtn && removeBtn.onPress) {
    removeBtn.onPress();
  }
});

describe('Itinerary edit', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('renders activity', () => {
    const { getByText } = render(<TripItineraryScreen />);
    expect(getByText('Amber Fort')).toBeTruthy();
  });

  it('shows delete button for each activity', () => {
    const { getByTestId } = render(<TripItineraryScreen />);
    expect(getByTestId('delete-activity-0')).toBeTruthy();
  });

  it('calls removeActivity when delete pressed', () => {
    const { getByTestId } = render(<TripItineraryScreen />);
    fireEvent.press(getByTestId('delete-activity-0'));
    // Alert.alert will be called, then the remove mutation
    expect(mockRemove).toHaveBeenCalledWith({ day: 1, index: 0 });
  });

  it('shows Add Activity button', () => {
    const { getByText } = render(<TripItineraryScreen />);
    expect(getByText('+ Add Activity')).toBeTruthy();
  });
});
