import 'react-native-gesture-handler/jestSetup';
import fetchMock from 'jest-fetch-mock';
fetchMock.enableMocks();

jest.mock('@react-native-firebase/auth', () => () => ({
  currentUser: null,
  onAuthStateChanged: jest.fn(),
  signOut: jest.fn(),
}));

jest.mock('@react-native-firebase/app', () => ({
  initializeApp: jest.fn(),
}));

jest.mock('expo-secure-store', () => ({
  getItemAsync: jest.fn(),
  setItemAsync: jest.fn(),
  deleteItemAsync: jest.fn(),
}));

jest.mock('@react-native-async-storage/async-storage', () =>
  require('@react-native-async-storage/async-storage/jest/async-storage-mock')
);
