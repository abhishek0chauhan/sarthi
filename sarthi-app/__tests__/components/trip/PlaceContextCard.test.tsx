jest.mock('expo-linking', () => ({ openURL: jest.fn() }));

import React from 'react';
import { render, fireEvent } from '@testing-library/react-native';
import { PlaceContextCard } from '@/components/trip/PlaceContextCard';
import type { PlaceContext } from '@/types/enrichment.types';

const ctx: PlaceContext = {
  whySpecial: 'Ancient living root bridge',
  bestTimeToVisit: 'Early morning',
  suggestedDuration: '2-3 hours',
  insiderTips: ['Wear grip shoes', 'Carry cash'],
  whatToCarry: ['Water bottle'],
  nearbyAlternative: 'Mawryngkhew for quieter experience',
};

describe('PlaceContextCard', () => {
  it('is collapsed by default', () => {
    const { queryByText } = render(<PlaceContextCard context={ctx} />);
    expect(queryByText('Ancient living root bridge')).toBeNull();
  });

  it('expands when tapped', () => {
    const { getByText } = render(<PlaceContextCard context={ctx} />);
    fireEvent.press(getByText('Why visit?'));
    expect(getByText('Ancient living root bridge')).toBeTruthy();
  });

  it('shows insider tips when expanded', () => {
    const { getByText, queryByText } = render(<PlaceContextCard context={ctx} />);
    fireEvent.press(getByText('Why visit?'));
    expect(queryByText(/Wear grip shoes/)).toBeTruthy();
    expect(queryByText(/Carry cash/)).toBeTruthy();
  });
});
