import React from 'react';
import { render, fireEvent } from '@testing-library/react-native';
import { Text } from 'react-native';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';

jest.mock('expo-linking', () => ({ openURL: jest.fn() }));
jest.mock('@/components/trip/PlaceContextCard', () => {
  const React = require('react');
  const { Text } = require('react-native');
  return {
    PlaceContextCard: ({ context }: any) => React.createElement(Text, { testID: 'place-context' }, context.whySpecial),
  };
});
jest.mock('@/components/trip/MapLinkButton', () => {
  const React = require('react');
  const { Text } = require('react-native');
  return {
    MapLinkButton: ({ mapQuery }: any) => React.createElement(Text, { testID: 'map-link' }, mapQuery),
  };
});

import { ActivityCard } from '@/components/trip/ActivityCard';

const queryClient = new QueryClient({
  defaultOptions: {
    queries: { retry: false },
    mutations: { retry: false },
  },
});

const renderWithQuery = (component: React.ReactElement) =>
  render(<QueryClientProvider client={queryClient}>{component}</QueryClientProvider>);

const activityWithContext = {
  time: '9:00 AM',
  activity: 'Amber Fort',
  cost: '₹550',
  mapQuery: 'Amber Fort, Jaipur, Rajasthan',
  placeContext: {
    whySpecial: 'Stunning hilltop fort',
    bestTimeToVisit: 'Morning',
    suggestedDuration: '3 hours',
    insiderTips: [],
    whatToCarry: [],
  },
};

describe('ActivityCard', () => {
  it('renders activity name and time', () => {
    const { getByText } = renderWithQuery(<ActivityCard activity={activityWithContext} isLast={false} />);
    expect(getByText('Amber Fort')).toBeTruthy();
    expect(getByText('9:00 AM')).toBeTruthy();
  });

  it('shows map link when mapQuery present', () => {
    const { getByTestId } = renderWithQuery(<ActivityCard activity={activityWithContext} isLast={false} />);
    expect(getByTestId('map-link')).toBeTruthy();
  });

  it('shows PlaceContextCard when placeContext present', () => {
    const { getByTestId } = renderWithQuery(<ActivityCard activity={activityWithContext} isLast={false} />);
    expect(getByTestId('place-context')).toBeTruthy();
  });

  it('does not show map link when mapQuery absent', () => {
    const plain = { time: '9:00 AM', activity: 'Rest', cost: '₹0' };
    const { queryByTestId } = renderWithQuery(<ActivityCard activity={plain} isLast={true} />);
    expect(queryByTestId('map-link')).toBeNull();
  });
});
