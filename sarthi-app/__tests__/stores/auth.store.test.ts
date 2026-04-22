import { useAuthStore } from '@/stores/auth.store';

beforeEach(() => {
  useAuthStore.setState({ user: null, isAuthenticated: false, isLoading: false });
});

describe('auth store', () => {
  it('starts unauthenticated', () => {
    expect(useAuthStore.getState().isAuthenticated).toBe(false);
    expect(useAuthStore.getState().user).toBeNull();
  });

  it('sets user and marks authenticated', () => {
    const mockUser = { uid: '123', email: 'a@b.com' } as any;
    useAuthStore.getState().setUser(mockUser);
    expect(useAuthStore.getState().isAuthenticated).toBe(true);
    expect(useAuthStore.getState().user).toEqual(mockUser);
  });

  it('clears user on sign out', () => {
    useAuthStore.getState().setUser({ uid: '123' } as any);
    useAuthStore.getState().setUser(null);
    expect(useAuthStore.getState().isAuthenticated).toBe(false);
    expect(useAuthStore.getState().user).toBeNull();
  });
});
