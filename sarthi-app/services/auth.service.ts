import Constants from 'expo-constants';
import * as SecureStore from 'expo-secure-store';
import { useAuthStore } from '@/stores/auth.store';

const TOKEN_KEY = 'sarthi_firebase_token';

// @react-native-firebase requires native modules that Expo Go doesn't ship.
// Detect Expo Go and skip Firebase entirely so the UI still renders.
// Use a development build (EAS) to enable real auth.
const IS_EXPO_GO = Constants.appOwnership === 'expo';

let firebaseAuth: any = null;
let firebaseAvailable: boolean | null = null;

function getAuth() {
  if (IS_EXPO_GO) return null;
  if (firebaseAvailable === false) return null;
  try {
    if (!firebaseAuth) {
      // eslint-disable-next-line @typescript-eslint/no-require-imports
      const authModule = require('@react-native-firebase/auth').default;
      firebaseAuth = authModule;
    }
    firebaseAvailable = true;
    return firebaseAuth;
  } catch (err) {
    firebaseAvailable = false;
    console.warn('[authService] Firebase unavailable. Auth is disabled.', err);
    return null;
  }
}

export const authService = {
  init() {
    const auth = getAuth();
    if (!auth) {
      // In Expo Go, inject a mock user so the app routes to the main tabs.
      // Remove this block before production / EAS build.
      useAuthStore.getState().setUser({
        uid: 'dev-user',
        phoneNumber: '+918320697284',
        displayName: 'Dev User',
      });
      useAuthStore.getState().setLoading(false);
      return () => {};
    }

    try {
      return auth().onAuthStateChanged(async (user: any) => {
        useAuthStore.getState().setUser(user);
        if (user) {
          try {
            const token = await user.getIdToken();
            await SecureStore.setItemAsync(TOKEN_KEY, token);
          } catch (err) {
            console.warn('[authService] Failed to persist token', err);
          }
        } else {
          await SecureStore.deleteItemAsync(TOKEN_KEY).catch(() => {});
        }
        useAuthStore.getState().setLoading(false);
      });
    } catch (err) {
      console.warn('[authService] onAuthStateChanged failed', err);
      useAuthStore.getState().setUser(null);
      useAuthStore.getState().setLoading(false);
      return () => {};
    }
  },

  async getToken(): Promise<string | null> {
    const auth = getAuth();
    if (!auth) return 'dev-token'; // Expo Go: use dev bypass token accepted by the backend in non-production
    const user = auth().currentUser;
    if (!user) return null;
    return user.getIdToken();
  },

  async sendOTP(phoneNumber: string) {
    const auth = getAuth();
    if (!auth) throw new Error('Auth is unavailable in Expo Go. Use a development build.');
    return auth().signInWithPhoneNumber(phoneNumber);
  },

  async signInWithGoogle(idToken: string) {
    const auth = getAuth();
    if (!auth) throw new Error('Auth is unavailable in Expo Go. Use a development build.');
    const credential = auth.GoogleAuthProvider.credential(idToken);
    return auth().signInWithCredential(credential);
  },

  async signInWithEmail(email: string, password: string) {
    const auth = getAuth();
    if (!auth) throw new Error('Auth is unavailable in Expo Go. Use a development build.');
    return auth().signInWithEmailAndPassword(email, password);
  },

  async createAccount(email: string, password: string) {
    const auth = getAuth();
    if (!auth) throw new Error('Auth is unavailable in Expo Go. Use a development build.');
    return auth().createUserWithEmailAndPassword(email, password);
  },

  async sendPasswordReset(email: string) {
    const auth = getAuth();
    if (!auth) throw new Error('Auth is unavailable in Expo Go. Use a development build.');
    return auth().sendPasswordResetEmail(email);
  },

  async signOut() {
    await SecureStore.deleteItemAsync(TOKEN_KEY).catch(() => {});
    const auth = getAuth();
    if (!auth) return;
    return auth().signOut();
  },
};
