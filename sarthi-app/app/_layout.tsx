import { useEffect } from 'react';
import { Stack } from 'expo-router';
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

  useEffect(() => {
    let unsubscribe: (() => void) | undefined;
    try {
      unsubscribe = authService.init();
    } catch (err) {
      console.warn('[RootLayout] authService.init failed', err);
      useAuthStore.getState().setLoading(false);
    }
    return () => {
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
