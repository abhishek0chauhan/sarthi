export default jest.fn(() => ({
  getToken: jest.fn().mockResolvedValue('fcm-token-123'),
  onNotificationOpenedApp: jest.fn().mockReturnValue(jest.fn()),
  getInitialNotification: jest.fn().mockResolvedValue(null),
}));
