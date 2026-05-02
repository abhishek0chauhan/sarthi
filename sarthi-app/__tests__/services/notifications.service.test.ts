jest.mock('@/services/api', () => ({
  apiRequest: jest.fn().mockResolvedValue({}),
}));

import { notificationsService } from '@/services/notifications.service';
import { apiRequest } from '@/services/api';

// Get references to the mocked modules
const { router } = require('expo-router');
const messagingModule = require('@react-native-firebase/messaging');
const mockMessagingFactory = messagingModule.default;

const mockGetToken = jest.fn().mockResolvedValue('fcm-token-123');
const mockOnNotificationOpenedApp = jest.fn().mockReturnValue(jest.fn());
const mockGetInitialNotification = jest.fn().mockResolvedValue(null);
const mockPush = jest.fn();

beforeEach(() => {
  jest.clearAllMocks();
  mockGetToken.mockResolvedValue('fcm-token-123');
  mockOnNotificationOpenedApp.mockReturnValue(jest.fn());
  mockGetInitialNotification.mockResolvedValue(null);
  mockPush.mockClear();

  // Update the factory to return fresh mocks
  mockMessagingFactory.mockImplementation(() => ({
    getToken: mockGetToken,
    onNotificationOpenedApp: mockOnNotificationOpenedApp,
    getInitialNotification: mockGetInitialNotification,
  }));

  router.push = mockPush;

  // Reset the service's cached token
  (notificationsService as any).cachedToken = null;
});

describe('notificationsService', () => {
  it('registerDevice fetches FCM token and calls POST /devices', async () => {
    await notificationsService.registerDevice();
    expect(mockGetToken).toHaveBeenCalled();
    expect(apiRequest).toHaveBeenCalledWith('/devices', expect.objectContaining({ method: 'POST' }));
  });

  it('getCachedToken returns null before registration', () => {
    expect(notificationsService.getCachedToken()).toBeNull();
  });

  it('getCachedToken returns token after registration', async () => {
    await notificationsService.registerDevice();
    expect(notificationsService.getCachedToken()).toBe('fcm-token-123');
  });

  it('setupTapHandler calls onNotificationOpenedApp', () => {
    notificationsService.setupTapHandler();
    expect(mockOnNotificationOpenedApp).toHaveBeenCalled();
  });

  it('setupTapHandler navigates to live-guide on notification tap with tripId', async () => {
    let capturedHandler: (notification: any) => void = () => {};
    mockOnNotificationOpenedApp.mockImplementation((cb) => {
      capturedHandler = cb;
      return jest.fn();
    });
    notificationsService.setupTapHandler();
    capturedHandler({ data: { tripId: 'trip-abc' } });
    expect(mockPush).toHaveBeenCalledWith('/trip/trip-abc/live-guide');
  });

  it('setupTapHandler checks getInitialNotification for cold start', async () => {
    mockGetInitialNotification.mockResolvedValueOnce({ data: { tripId: 'trip-xyz' } });
    notificationsService.setupTapHandler();
    await Promise.resolve();
    expect(mockGetInitialNotification).toHaveBeenCalled();
  });
});
