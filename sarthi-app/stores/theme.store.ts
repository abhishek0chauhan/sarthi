import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import AsyncStorage from '@react-native-async-storage/async-storage';

type ThemeOverride = 'light' | 'dark' | 'system';

interface ThemeState {
  override: ThemeOverride;
  setOverride: (o: ThemeOverride) => void;
}

export const useThemeStore = create<ThemeState>()(
  persist(
    (set) => ({
      override: 'system',
      setOverride: (override) => set({ override }),
    }),
    { name: 'sarthi-theme', storage: createJSONStorage(() => AsyncStorage) }
  )
);
