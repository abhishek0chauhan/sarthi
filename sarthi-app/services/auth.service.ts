import auth from '@react-native-firebase/auth';
import * as SecureStore from 'expo-secure-store';
import { useAuthStore } from '@/stores/auth.store';

const TOKEN_KEY = 'sarthi_firebase_token';

export const authService = {
  init() {
    return auth().onAuthStateChanged(async (user) => {
      useAuthStore.getState().setUser(user);
      if (user) {
        const token = await user.getIdToken();
        await SecureStore.setItemAsync(TOKEN_KEY, token);
      } else {
        await SecureStore.deleteItemAsync(TOKEN_KEY);
      }
      useAuthStore.getState().setLoading(false);
    });
  },

  async getToken(): Promise<string | null> {
    const user = auth().currentUser;
    if (!user) return null;
    return user.getIdToken();
  },

  async sendOTP(phoneNumber: string) {
    return auth().signInWithPhoneNumber(phoneNumber);
  },

  async signInWithGoogle(idToken: string) {
    const credential = auth.GoogleAuthProvider.credential(idToken);
    return auth().signInWithCredential(credential);
  },

  async signInWithEmail(email: string, password: string) {
    return auth().signInWithEmailAndPassword(email, password);
  },

  async createAccount(email: string, password: string) {
    return auth().createUserWithEmailAndPassword(email, password);
  },

  async sendPasswordReset(email: string) {
    return auth().sendPasswordResetEmail(email);
  },

  async signOut() {
    await SecureStore.deleteItemAsync(TOKEN_KEY);
    return auth().signOut();
  },
};
