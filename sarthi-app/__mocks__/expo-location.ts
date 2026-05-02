const mockRequestForegroundPermissionsAsync = jest.fn().mockResolvedValue({ granted: true });
const mockWatchPositionAsync = jest.fn();

export const requestForegroundPermissionsAsync = mockRequestForegroundPermissionsAsync;
export const watchPositionAsync = mockWatchPositionAsync;

export const Accuracy = {
  Balanced: 5
};

export default {
  requestForegroundPermissionsAsync: mockRequestForegroundPermissionsAsync,
  watchPositionAsync: mockWatchPositionAsync,
  Accuracy: {
    Balanced: 5
  }
};
