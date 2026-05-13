import React from 'react';
import { render, waitFor } from '@testing-library/react-native';
import { AppState } from 'react-native';
import { notificationsService } from '@/services/notifications.service';

// Mock notifications service first
jest.mock('@/services/notifications.service', () => ({
  notificationsService: {
    registerDevice: jest.fn().mockResolvedValue(undefined),
    setupTapHandler: jest.fn(),
  },
  notificationNavState: {
    navigatingToLiveGuide: false,
  },
}));

// Mock live-mode persistence
jest.mock('@/services/live-mode.persistence', () => ({
  liveModePersistence: {
    get: jest.fn().mockResolvedValue(null),
  },
}));

// Mock other dependencies
jest.mock('expo-router', () => ({
  Stack: ({ children }: any) => children,
  router: { replace: jest.fn() },
  usePathname: jest.fn(() => '/'),
}));
jest.mock('expo-splash-screen', () => ({
  preventAutoHideAsync: jest.fn(),
  hideAsync: jest.fn().mockResolvedValue(undefined),
}));
jest.mock('@expo-google-fonts/inter', () => ({
  useFonts: () => [true],
}));
jest.mock('react-native-gesture-handler', () => ({
  GestureHandlerRootView: ({ children, style }: any) => (
    <div style={style}>{children}</div>
  ),
}));
jest.mock('react-native-safe-area-context', () => ({
  SafeAreaProvider: ({ children }: any) => <div>{children}</div>,
}));
jest.mock('@tanstack/react-query', () => ({
  QueryClient: class MockQueryClient {},
  QueryClientProvider: ({ children }: any) => <div>{children}</div>,
}));
jest.mock('@/stores/auth.store', () => ({
  useAuthStore: (selector: any) => {
    const store = {
      isLoading: false,
      setLoading: jest.fn(),
    };
    return selector(store);
  },
}));
jest.mock('@/services/auth.service', () => ({
  authService: {
    init: jest.fn(() => undefined),
  },
}));

describe('RootLayout FCM initialization', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    jest.spyOn(AppState, 'addEventListener').mockReturnValue({ remove: jest.fn() } as any);
  });

  it('should call notificationsService.registerDevice() on mount', async () => {
    const RootLayout = require('@/app/_layout').default;

    render(<RootLayout />);

    await waitFor(
      () => {
        expect(notificationsService.registerDevice).toHaveBeenCalled();
      },
      { timeout: 3000 }
    );
  });

  it('should call notificationsService.setupTapHandler() on mount', async () => {
    // Clear mocks to avoid interference from previous test
    jest.clearAllMocks();

    const RootLayout = require('@/app/_layout').default;

    render(<RootLayout />);

    await waitFor(
      () => {
        expect(notificationsService.setupTapHandler).toHaveBeenCalled();
      },
      { timeout: 3000 }
    );
  });
});
