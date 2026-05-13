import AsyncStorage from '@react-native-async-storage/async-storage';

const KEY = 'live_mode_session';

export interface LiveModeSession {
  tripId: string;
  sessionId: string;
  dayIndex: number;
}

export const liveModePersistence = {
  save: (session: LiveModeSession) =>
    AsyncStorage.setItem(KEY, JSON.stringify(session)),

  clear: () => AsyncStorage.removeItem(KEY),

  get: async (): Promise<LiveModeSession | null> => {
    const raw = await AsyncStorage.getItem(KEY);
    if (!raw) return null;
    try { return JSON.parse(raw); } catch { return null; }
  },
};
