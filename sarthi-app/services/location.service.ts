import * as Location from 'expo-location';
import { socketService } from './socket.service';

class LocationService {
  private subscription: Location.LocationSubscription | null = null;

  async startTracking(): Promise<void> {
    if (this.subscription) return; // already tracking — no-op

    const { status } = await Location.requestForegroundPermissionsAsync();
    if (status !== 'granted') return; // denied — silent return, no throw

    this.subscription = await Location.watchPositionAsync(
      { accuracy: Location.Accuracy.Balanced, timeInterval: 60000, distanceInterval: 0 },
      (loc) => {
        socketService.emit('location_update', {
          lat: loc.coords.latitude,
          lng: loc.coords.longitude,
          timestamp: loc.timestamp,
        });
      }
    );
  }

  stopTracking(): void {
    this.subscription?.remove();
    this.subscription = null;
  }
}

export const locationService = new LocationService();
