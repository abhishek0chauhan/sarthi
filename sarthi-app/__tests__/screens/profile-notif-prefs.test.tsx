import React from 'react';
import { render, fireEvent, waitFor } from '@testing-library/react-native';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import * as apiModule from '@/services/api';
import { useAuthStore } from '@/stores/auth.store';

// Mock dependencies
jest.mock('expo-router', () => ({
  useRouter: jest.fn(() => ({
    back: jest.fn(),
    push: jest.fn(),
    replace: jest.fn(),
  })),
}));

jest.mock('@/stores/auth.store');
jest.mock('@/stores/theme.store', () => ({
  useThemeStore: jest.fn(() => ({
    override: 'system',
    setOverride: jest.fn(),
  })),
}));
jest.mock('@/hooks/useColorScheme', () => ({
  useColors: jest.fn(() => ({
    bgBase: '#FFFFFF',
    bgCard: '#F5F5F5',
    border: '#E0E0E0',
    primary500: '#FF6B35',
    textPrimary: '#000000',
    textSecondary: '#666666',
    textTertiary: '#999999',
  })),
}));
jest.mock('@/services/api');

jest.mock('react-native-safe-area-context', () => ({
  SafeAreaView: ({ children }: any) => children,
}));

jest.mock('expo-linear-gradient', () => ({
  LinearGradient: ({ children }: any) => children,
}));

jest.mock('@/services/auth.service', () => ({
  authService: {
    signOut: jest.fn(),
  },
}));

// Mock auth state
const mockUser = {
  id: 'user-123',
  email: 'test@example.com',
  displayName: 'Test User',
};

// Lazy load the component after mocks are set up
const getProfileScreen = () => require('@/app/(tabs)/profile/index').default;

describe('Profile Screen - Notification Preferences', () => {
  let queryClient: QueryClient;

  beforeEach(() => {
    jest.clearAllMocks();
    (useAuthStore as unknown as jest.Mock).mockReturnValue(mockUser);

    queryClient = new QueryClient({
      defaultOptions: {
        queries: { retry: false },
        mutations: { retry: false },
      },
    });
  });

  const renderWithQuery = (component: React.ReactElement) =>
    render(<QueryClientProvider client={queryClient}>{component}</QueryClientProvider>);

  it('fetches notification prefs on mount', async () => {
    const mockApiRequest = jest.fn().mockResolvedValue({
      notificationPrefs: {
        morningBriefing: true,
        mealNudges: false,
      },
    });
    jest.spyOn(apiModule, 'apiRequest').mockImplementation(mockApiRequest);

    const ProfileScreen = getProfileScreen();
    renderWithQuery(<ProfileScreen />);

    await waitFor(() => {
      expect(mockApiRequest).toHaveBeenCalledWith('/users/me/notification-prefs');
    });
  });

  it('renders Morning Briefing toggle', async () => {
    const mockApiRequest = jest.fn().mockResolvedValue({
      notificationPrefs: {
        morningBriefing: true,
        mealNudges: false,
      },
    });
    jest.spyOn(apiModule, 'apiRequest').mockImplementation(mockApiRequest);

    const ProfileScreen = getProfileScreen();
    const { getByText, getByTestId } = renderWithQuery(<ProfileScreen />);

    await waitFor(() => {
      expect(getByText('Morning Briefing')).toBeTruthy();
      expect(getByTestId('toggle-morningBriefing')).toBeTruthy();
    });
  });

  it('renders Meal Nudges toggle', async () => {
    const mockApiRequest = jest.fn().mockResolvedValue({
      notificationPrefs: {
        morningBriefing: true,
        mealNudges: true,
      },
    });
    jest.spyOn(apiModule, 'apiRequest').mockImplementation(mockApiRequest);

    const ProfileScreen = getProfileScreen();
    const { getByText, getByTestId } = renderWithQuery(<ProfileScreen />);

    await waitFor(() => {
      expect(getByText('Meal Nudges')).toBeTruthy();
      expect(getByTestId('toggle-mealNudges')).toBeTruthy();
    });
  });

  it('calls PATCH when toggle changed', async () => {
    const mockApiRequest = jest.fn()
      .mockResolvedValueOnce({
        notificationPrefs: {
          morningBriefing: true,
          mealNudges: false,
        },
      })
      .mockResolvedValueOnce({}); // PATCH response

    jest.spyOn(apiModule, 'apiRequest').mockImplementation(mockApiRequest);

    const ProfileScreen = getProfileScreen();
    const { getByTestId } = renderWithQuery(<ProfileScreen />);

    await waitFor(() => {
      expect(mockApiRequest).toHaveBeenCalledWith('/users/me/notification-prefs');
    });

    const toggle = getByTestId('toggle-morningBriefing');
    fireEvent(toggle, 'valueChange', false);

    await waitFor(() => {
      expect(mockApiRequest).toHaveBeenCalledWith(
        '/users/me/notification-prefs',
        expect.objectContaining({
          method: 'PATCH',
          body: JSON.stringify({ morningBriefing: false }),
        })
      );
    });
  });
});
