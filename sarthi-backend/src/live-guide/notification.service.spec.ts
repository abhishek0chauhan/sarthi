import { Test } from '@nestjs/testing';
import { NotificationService } from './notification.service';
import { DevicesService } from '../devices/devices.service';

const mockMessaging = { sendEachForMulticast: jest.fn().mockResolvedValue({ responses: [] }) };

jest.mock('firebase-admin', () => ({
  messaging: () => mockMessaging,
  apps: { length: 1 },
  initializeApp: jest.fn(),
  auth: () => ({ verifyIdToken: jest.fn() }),
}));

const mockDevicesService = { getTokensForUser: jest.fn() };

describe('NotificationService', () => {
  let service: NotificationService;

  beforeEach(async () => {
    jest.clearAllMocks();
    const module = await Test.createTestingModule({
      providers: [
        NotificationService,
        { provide: DevicesService, useValue: mockDevicesService },
      ],
    }).compile();
    service = module.get(NotificationService);
  });

  it('sendPush: calls FCM with tokens, title, body', async () => {
    await service.sendPush(['tok1', 'tok2'], 'Hello', 'World');
    expect(mockMessaging.sendEachForMulticast).toHaveBeenCalledWith(
      expect.objectContaining({
        tokens: ['tok1', 'tok2'],
        notification: { title: 'Hello', body: 'World' },
      }),
    );
  });

  it('sendPush: does nothing when tokens array is empty', async () => {
    await service.sendPush([], 'Hello', 'World');
    expect(mockMessaging.sendEachForMulticast).not.toHaveBeenCalled();
  });

  it('sendToUser: fetches tokens then sends', async () => {
    mockDevicesService.getTokensForUser.mockResolvedValue(['tok-a']);
    await service.sendToUser('db-user-id', 'Title', 'Body');
    expect(mockDevicesService.getTokensForUser).toHaveBeenCalledWith('db-user-id');
    expect(mockMessaging.sendEachForMulticast).toHaveBeenCalled();
  });

  it('sendPush: swallows FCM errors (non-blocking)', async () => {
    mockMessaging.sendEachForMulticast.mockRejectedValueOnce(new Error('FCM error'));
    await expect(service.sendPush(['tok'], 'T', 'B')).resolves.not.toThrow();
  });
})
