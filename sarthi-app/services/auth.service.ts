import { useAuthStore } from '@/stores/auth.store';

export const authService = {
  init: () => {
    const { setLoading, setUser, setAuthenticated } = useAuthStore.getState();

    // Initialize auth state
    // In a real app, this would check Firebase auth state
    // For now, we'll just set loading to false after a brief delay
    const timer = setTimeout(() => {
      setLoading(false);
      // Uncomment when Firebase auth is integrated
      // const unsubscribe = auth().onAuthStateChanged((user) => {
      //   if (user) {
      //     setUser({ uid: user.uid, email: user.email || undefined });
      //     setAuthenticated(true);
      //   } else {
      //     setUser(null);
      //     setAuthenticated(false);
      //   }
      //   setLoading(false);
      // });
      // return unsubscribe;
    }, 0);

    return () => clearTimeout(timer);
  },
};
