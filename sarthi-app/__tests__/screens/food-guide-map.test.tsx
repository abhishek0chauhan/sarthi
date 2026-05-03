jest.mock('expo-linking');

jest.mock('expo-router', () => ({
  useLocalSearchParams: () => ({ id: 'trip-1' }),
}));

jest.mock('react-native-safe-area-context', () => ({
  useSafeAreaInsets: () => ({ top: 0, bottom: 0, left: 0, right: 0 }),
  SafeAreaView: ({ children }: any) => children,
}));

jest.mock('@/hooks/useColorScheme', () => ({
  useColors: () => ({
    bgBase: '#FFFFFF',
    bgCard: '#F5F5F5',
    textPrimary: '#000000',
    textSecondary: '#666666',
    warning: '#F59E0B',
    border: '#E5E5E5',
    primary50: '#EFF6FF',
    primary200: '#BFDBFE',
    primary500: '#2563EB',
  }),
}));

jest.mock('@/hooks/useTrips', () => ({
  useTrip: jest.fn(),
}));

import React from 'react';
import { render, fireEvent } from '@testing-library/react-native';
import * as Linking from 'expo-linking';
import TripFoodGuideScreen from '@/app/trip/[id]/food-guide';
import { useTrip } from '@/hooks/useTrips';

const mockOpenURL = jest.fn();
(Linking.openURL as jest.Mock) = mockOpenURL;

describe('FoodGuide street food map link', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    (useTrip as jest.Mock).mockReturnValue({
      data: {
        foodGuideData: {
          overview: 'Great food',
          mustTryDishes: [],
          healthConscious: [],
          streetFood: {
            safetyTips: ['Drink bottled water'],
            items: [{
              name: 'Momos',
              where: 'Police Bazaar',
              price: '₹50',
              mapQuery: 'Police Bazaar, Shillong, Meghalaya',
            }],
          },
          mealPlan: [],
          dietaryInfo: { vegFriendly: 'Yes', veganOptions: 'Limited', halalAvailability: '', waterAdvice: '' },
        },
      },
      isLoading: false,
    });
  });

  it('renders street food item', () => {
    const { getByText } = render(<TripFoodGuideScreen />);
    expect(getByText('Momos')).toBeTruthy();
  });

  it('renders map link button for street food with mapQuery', () => {
    const { getByText } = render(<TripFoodGuideScreen />);
    expect(getByText('📍 Open in Maps')).toBeTruthy();
  });

  it('opens Google Maps URL on map link press', () => {
    const { getByText } = render(<TripFoodGuideScreen />);
    fireEvent.press(getByText('📍 Open in Maps'));
    expect(mockOpenURL).toHaveBeenCalledWith(
      expect.stringContaining('Police%20Bazaar')
    );
  });
});
