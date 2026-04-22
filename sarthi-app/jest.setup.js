// Define global __DEV__ variable
global.__DEV__ = true;

// Mock structuredClone to prevent expo issues
if (typeof structuredClone === 'undefined') {
  global.structuredClone = (obj) => JSON.parse(JSON.stringify(obj));
}

// Mock expo's import meta to prevent issues
Object.defineProperty(global, '__ExpoImportMetaRegistry', {
  configurable: true,
  value: {},
});

import 'react-native-gesture-handler/jestSetup';
import fetchMock from 'jest-fetch-mock';
fetchMock.enableMocks();

// Mock expo constants
jest.mock('expo-constants', () => ({
  __esModule: true,
  default: {
    expoVersion: '55.0.0',
    manifest: {},
  },
}));

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
