import { useEffect, useRef } from 'react';
import { Stack, router, usePathname } from 'expo-router';
import { AppState } from 'react-native';
import { liveModePersistence } from '@/services/live-mode.persistence';
import { notificationNavState } from '@/services/notifications.service';
import { useFonts, Inter_400Regular, Inter_500Medium,
  Inter_600SemiBold, Inter_700Bold, Inter_800ExtraBold } from '@expo-google-fonts/inter';
import * as SplashScreen from 'expo-splash-screen';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { useAuthStore } from '@/stores/auth.store';
import { authService } from '@/services/auth.service';
import { notificationsService } from '@/services/notifications.service';
import '../global.css';

SplashScreen.preventAutoHideAsync();
const queryClient = new QueryClient();

export default function RootLayout() {
  const [fontsLoaded] = useFonts({
    Inter_400Regular, Inter_500Medium,
    Inter_600SemiBold, Inter_700Bold, Inter_800ExtraBold,
  });

  const isAuthLoading = useAuthStore(s => s.isLoading);

  const pathname = usePathname();
  const pathnameRef = useRef(pathname);
  const backgroundPathRef = useRef<string | null>(null);
  useEffect(() => { pathnameRef.current = pathname; }, [pathname]);

  useEffect(() => {
    let unsubscribe: (() => void) | undefined;
    // Safety fallback: if Firebase auth doesn't resolve within 5s, unblock the UI
    const timeout = setTimeout(() => {
      if (useAuthStore.getState().isLoading) {
        console.warn('[RootLayout] Auth timeout — forcing loading false');
        useAuthStore.getState().setLoading(false);
      }
    }, 5000);
    try {
      unsubscribe = authService.init();
    } catch (err) {
      console.warn('[RootLayout] authService.init failed', err);
      useAuthStore.getState().setLoading(false);
    }
    return () => {
      clearTimeout(timeout);
      try { unsubscribe?.(); } catch {}
    };
  }, []);

  useEffect(() => {
    notificationsService.registerDevice().catch(console.warn);
    notificationsService.setupTapHandler();
  }, []);

  useEffect(() => {
    if (fontsLoaded && !isAuthLoading) {
      SplashScreen.hideAsync().catch(() => {});
    }
  }, [fontsLoaded, isAuthLoading]);

  useEffect(() => {
    const sub = AppState.addEventListener('change', async (state) => {
      // Track which screen the user was on when they left the app
      if (state === 'background' || state === 'inactive') {
        backgroundPathRef.current = pathnameRef.current;
        return;
      }

      if (state !== 'active') return;
      if (notificationNavState.navigatingToLiveGuide) return;

      const session = await liveModePersistence.get();
      if (!session) return;

      const targetPath = `/trip/${session.tripId}/live-guide`;
      if (pathnameRef.current === targetPath) return;

      // Only auto-resume if the user was on the live guide screen when they left —
      // prevents interrupting itinerary/other screens when Google Maps is opened from there
      if (backgroundPathRef.current !== targetPath) return;

      router.replace(targetPath as any);
    });
    return () => sub.remove();
  }, []);

  if (!fontsLoaded || isAuthLoading) return null;

  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <SafeAreaProvider>
        <QueryClientProvider client={queryClient}>
          <Stack screenOptions={{ headerShown: false }} />
        </QueryClientProvider>
      </SafeAreaProvider>
    </GestureHandlerRootView>
  );
}
