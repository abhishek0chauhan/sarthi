const mockGenerate = jest.fn();

jest.mock('@/hooks/useEnrichment', () => ({
  usePhrasebook: (tripId: string) => ({
    data: {
      language: 'Khasi',
      greeting: [{ english: 'Hello', local: 'Khublei', pronunciation: 'Khoo-blei' }],
      food: [],
      directions: [],
      emergency: [],
      bargaining: [],
      culturalNotes: ['Khasi people love greetings'],
    },
    isLoading: false,
    error: null,
  }),
  useGeneratePhrasebook: () => ({ mutate: mockGenerate, isPending: false }),
}));

jest.mock('react-native-safe-area-context', () => ({
  SafeAreaView: ({ children }: any) => children,
}));

jest.mock('expo-router', () => ({
  useLocalSearchParams: () => ({ id: 'trip-1' }),
  useRouter: () => ({ back: jest.fn() }),
}));

jest.mock('@/hooks/useColorScheme', () => ({
  useColors: () => ({
    bgBase: '#FFFFFF',
    bgCard: '#F5F5F5',
    textPrimary: '#000000',
    textSecondary: '#666666',
    textTertiary: '#999999',
    border: '#E5E5E5',
    primary500: '#2563EB',
  }),
}));

jest.mock('@/hooks/useTrips', () => ({
  useTrip: () => ({ data: { destination: 'Cherrapunji', state: 'Meghalaya' } }),
}));

jest.mock('@/components/ui/LoadingSpinner', () => ({
  LoadingSpinner: () => null,
}));

import React from 'react';
import { render, fireEvent } from '@testing-library/react-native';
import PhrasebookScreen from '@/app/trip/[id]/phrasebook';

describe('PhrasebookScreen', () => {
  it('renders language name', () => {
    const { getByText } = render(<PhrasebookScreen />);
    expect(getByText('Khasi')).toBeTruthy();
  });

  it('renders greeting phrase', () => {
    const { getByText } = render(<PhrasebookScreen />);
    expect(getByText('Hello')).toBeTruthy();
    expect(getByText('Khublei')).toBeTruthy();
  });

  it('renders cultural note', () => {
    const { queryAllByText } = render(<PhrasebookScreen />);
    const culturalNotes = queryAllByText(/Khasi people love greetings/);
    expect(culturalNotes.length).toBeGreaterThan(0);
  });
});
