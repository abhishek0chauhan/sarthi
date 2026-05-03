const mockSend = jest.fn();

jest.mock('@/hooks/useEnrichment', () => ({
  useChatHistory: () => ({
    data: [
      { id: '1', role: 'user', content: 'Is there an ATM near Dawki?', createdAt: '2026-05-03T09:00:00Z' },
      { id: '2', role: 'assistant', content: 'Yes, SBI ATM is 2 km from Dawki bridge.', createdAt: '2026-05-03T09:00:05Z' },
    ],
    isLoading: false,
  }),
  useSendChatMessage: () => ({ mutate: mockSend, isPending: false }),
}));
jest.mock('expo-router', () => ({
  useLocalSearchParams: () => ({ id: 'trip-1' }),
  useRouter: () => ({ back: jest.fn() }),
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
    textTertiary: '#999999',
    border: '#E5E5E5',
    primary500: '#2563EB',
  }),
}));
jest.mock('@/hooks/useTrips', () => ({
  useTrip: () => ({ data: { destination: 'Shillong', state: 'Meghalaya' } }),
}));
jest.mock('@/components/ui/LoadingSpinner', () => ({
  LoadingSpinner: () => null,
}));

import React from 'react';
import { render, fireEvent } from '@testing-library/react-native';
import TripChatScreen from '@/app/trip/[id]/chat';

describe('TripChatScreen', () => {
  beforeEach(() => {
    mockSend.mockClear();
  });

  it('renders chat history', () => {
    const { getByText } = render(<TripChatScreen />);
    expect(getByText('Is there an ATM near Dawki?')).toBeTruthy();
    expect(getByText('Yes, SBI ATM is 2 km from Dawki bridge.')).toBeTruthy();
  });

  it('sends message when send button pressed with text', () => {
    const { getByPlaceholderText, getByText } = render(<TripChatScreen />);
    fireEvent.changeText(getByPlaceholderText('Ask anything about your trip…'), 'What to pack?');
    fireEvent.press(getByText('Send'));
    expect(mockSend).toHaveBeenCalledWith('What to pack?', expect.objectContaining({}));
  });

  it('does not send when input is empty', () => {
    mockSend.mockClear();
    const { getByText } = render(<TripChatScreen />);
    fireEvent.press(getByText('Send'));
    expect(mockSend).not.toHaveBeenCalled();
  });
});
