import { Test } from '@nestjs/testing';
import { forwardRef } from '@nestjs/common';
import { LiveGuideGateway } from './live-guide.gateway';
import { LiveGuideService } from './live-guide.service';
import { PrismaService } from '../prisma/prisma.service';

const mockLiveGuideService = {
  activateGuide: jest.fn(),
  markActivityDone: jest.fn(),
  skipActivity: jest.fn(),
  replanDay: jest.fn(),
  handleLocationUpdate: jest.fn(),
  deactivate: jest.fn(),
};

const mockSocket = () => ({
  id: 'socket-1',
  data: {} as Record<string, any>,
  disconnect: jest.fn(),
  emit: jest.fn(),
  handshake: { auth: {} },
});

jest.mock('firebase-admin', () => ({
  auth: () => ({
    verifyIdToken: jest.fn().mockResolvedValue({ uid: 'fb-uid', name: 'Test User' }),
  }),
  apps: { length: 1 },
  initializeApp: jest.fn(),
  messaging: () => ({ sendEachForMulticast: jest.fn() }),
}));

const mockPrisma = { liveGuideSession: { findUnique: jest.fn() } };

describe('LiveGuideGateway', () => {
  let gateway: LiveGuideGateway;

  beforeEach(async () => {
    jest.clearAllMocks();
    const module = await Test.createTestingModule({
      providers: [
        LiveGuideGateway,
        { provide: LiveGuideService, useValue: mockLiveGuideService },
        { provide: PrismaService, useValue: mockPrisma },
      ],
    }).compile();
    gateway = module.get(LiveGuideGateway);
  });

  describe('handleConnection', () => {
    it('disconnects socket without token', async () => {
      const socket = mockSocket();
      socket.handshake.auth = {};
      await gateway.handleConnection(socket as any);
      expect(socket.disconnect).toHaveBeenCalled();
    });

    it('stores userId on socket.data when token is valid', async () => {
      const socket = mockSocket();
      socket.handshake.auth = { token: 'Bearer valid-token' };
      await gateway.handleConnection(socket as any);
      expect(socket.data.userId).toBe('fb-uid');
    });
  });

  describe('onActivateGuide', () => {
    it('emits guide_activated on success', async () => {
      const socket = mockSocket();
      socket.data = { userId: 'fb-uid' };
      mockLiveGuideService.activateGuide.mockResolvedValue({ todayPlan: {}, briefing: 'GM!', sessionId: 'sess-1', status: 'during' });
      await gateway.onActivateGuide(socket as any, { tripId: 'trip-1' });
      expect(socket.emit).toHaveBeenCalledWith('guide_activated', expect.objectContaining({ briefing: 'GM!' }));
    });

    it('emits error if not authenticated', async () => {
      const socket = mockSocket();
      socket.data = {};
      await gateway.onActivateGuide(socket as any, { tripId: 'trip-1' });
      expect(socket.emit).toHaveBeenCalledWith('error', expect.objectContaining({ message: expect.any(String) }));
    });
  });

  it('isConnected: returns false for unknown user', () => {
    expect(gateway.isConnected('unknown-uid')).toBe(false);
  });
})
