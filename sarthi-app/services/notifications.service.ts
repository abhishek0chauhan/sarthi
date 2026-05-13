import { router } from 'expo-router';
import { apiRequest } from '@/services/api';

function getMessaging() {
  try {
    return require('@react-native-firebase/messaging').default();
  } catch {
    return null;
  }
}

// Shared mutable flag — object property so mutations are visible to all importers under CommonJS/Metro
export const notificationNavState = { navigatingToLiveGuide: false };

class NotificationsService {
  private cachedToken: string | null = null;

  async registerDevice(): Promise<void> {
    const messaging = getMessaging();
    if (!messaging) return;
    try {
      const token = await messaging.getToken();
      if (!token) return;
      this.cachedToken = token;
      await apiRequest('/devices', {
        method: 'POST',
        body: JSON.stringify({ fcmToken: token, platform: 'android' }),
      });
    } catch (err) {
      console.warn('[notifications] registerDevice failed', err);
    }
  }

  getCachedToken(): string | null {
    return this.cachedToken;
  }

  setupTapHandler(): void {
    const messaging = getMessaging();
    if (!messaging) return;

    messaging.onNotificationOpenedApp((notification: any) => {
      const tripId = notification?.data?.tripId;
      if (tripId) {
        notificationNavState.navigatingToLiveGuide = true;
        setTimeout(() => { notificationNavState.navigatingToLiveGuide = false; }, 1500);
        router.push(`/trip/${tripId}/live-guide`);
      }
    });

    messaging.getInitialNotification().then((notification: any) => {
      if (!notification) return;
      const tripId = notification?.data?.tripId;
      if (tripId) {
        notificationNavState.navigatingToLiveGuide = true;
        setTimeout(() => { notificationNavState.navigatingToLiveGuide = false; }, 1500);
        router.push(`/trip/${tripId}/live-guide`);
      }
    });
  }
}

export const notificationsService = new NotificationsService();
