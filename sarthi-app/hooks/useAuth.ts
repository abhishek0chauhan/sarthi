import { useAuthStore } from '@/stores/auth.store';
import { authService } from '@/services/auth.service';

export function useAuth() {
  const user = useAuthStore(s => s.user);
  const isAuthenticated = useAuthStore(s => s.isAuthenticated);
  const isLoading = useAuthStore(s => s.isLoading);
  return { user, isAuthenticated, isLoading, signOut: authService.signOut };
}
