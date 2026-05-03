import React from 'react';
import { Text } from 'react-native';
import { render } from '@testing-library/react-native';

const mockOpenURL = jest.fn();
jest.mock('expo-linking', () => ({ openURL: mockOpenURL }));
jest.mock('@/components/trip/MapLinkButton', () => {
  const React = require('react');
  const { Text } = require('react-native');
  return {
    MapLinkButton: ({ mapQuery }: any) => React.createElement(Text, { testID: 'map-link' }, mapQuery),
  };
});

import { DishCard } from '@/components/food/DishCard';

const dish = {
  name: 'Jadoh',
  description: 'Rice and pork',
  where: 'Police Bazaar, Shillong',
  priceRange: '₹80-120',
  spiceLevel: 'Medium',
  mapQuery: 'Police Bazaar, Shillong, Meghalaya',
  placeContext: {
    bestTimeToVisit: 'Lunch hours',
    insiderTips: ['Cash only', 'Try the thali'],
  },
};

describe('DishCard', () => {
  it('renders dish name and price', () => {
    const { getByText } = render(<DishCard dish={dish} />);
    expect(getByText('Jadoh')).toBeTruthy();
    expect(getByText('₹80-120')).toBeTruthy();
  });

  it('renders map link when mapQuery present', () => {
    const { getByTestId } = render(<DishCard dish={dish} />);
    expect(getByTestId('map-link')).toBeTruthy();
  });

  it('renders place context tips', () => {
    const { getByText } = render(<DishCard dish={dish} />);
    expect(getByText('Lunch hours')).toBeTruthy();
    expect(getByText('• Cash only')).toBeTruthy();
  });

  it('does not show map link when mapQuery absent', () => {
    const plain = { ...dish, mapQuery: undefined, placeContext: undefined };
    const { queryByTestId } = render(<DishCard dish={plain} />);
    expect(queryByTestId('map-link')).toBeNull();
  });
});
