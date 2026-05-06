import { Test } from '@nestjs/testing';
import { SessionService } from './session.service';
import { PrismaService } from '../prisma/prisma.service';

const mockPrisma = {
  liveGuideSession: {
    create: jest.fn(),
    findFirst: jest.fn(),
    update: jest.fn(),
    findMany: jest.fn(),
  },
};

describe('SessionService', () => {
  let service: SessionService;

  beforeEach(async () => {
    jest.clearAllMocks();
    const module = await Test.createTestingModule({
      providers: [
        SessionService,
        { provide: PrismaService, useValue: mockPrisma },
      ],
    }).compile();
    service = module.get(SessionService);
  });

  describe('computeCurrentDay', () => {
    it('returns before status when trip has not started', () => {
      const result = service.computeCurrentDay({
        from: '2099-01-01',
        to: '2099-01-05',
      });
      expect(result.status).toBe('before');
      expect(result.dayIndex).toBe(-1);
    });

    it('returns after status when trip has ended', () => {
      const result = service.computeCurrentDay({
        from: '2020-01-01',
        to: '2020-01-05',
      });
      expect(result.status).toBe('after');
    });

    it('returns during status with correct dayIndex', () => {
      // The service uses IST (UTC+5:30) for date calculation
      // Create dates using UTC to match the service's IST conversion
      const istOffset = 5.5 * 60 * 60 * 1000;
      const nowUtc = Date.now();
      const today = new Date(nowUtc + istOffset).toISOString().split('T')[0];
      const from = today;
      const future = new Date(nowUtc + istOffset + 5 * 86400000)
        .toISOString()
        .split('T')[0];
      const result = service.computeCurrentDay({ from, to: future });
      expect(result.status).toBe('during');
      expect(result.dayIndex).toBe(0);
    });

    it('returns dayIndex 2 when today is the 3rd day', () => {
      // The service uses IST (UTC+5:30) for date calculation
      const istOffset = 5.5 * 60 * 60 * 1000;
      const nowUtc = Date.now();
      const today = new Date(nowUtc + istOffset).toISOString().split('T')[0];
      const from = new Date(nowUtc + istOffset - 2 * 86400000)
        .toISOString()
        .split('T')[0];
      const to = new Date(nowUtc + istOffset + 2 * 86400000)
        .toISOString()
        .split('T')[0];
      const result = service.computeCurrentDay({ from, to });
      expect(result.dayIndex).toBe(2);
    });
  });

  it('findActive: returns session or null', async () => {
    mockPrisma.liveGuideSession.findFirst.mockResolvedValue({ id: 'sess-1' });
    const result = await service.findActive('trip-1', 'user-1');
    expect(result).toEqual({ id: 'sess-1' });
  });

  it('create: creates a session with defaults', async () => {
    mockPrisma.liveGuideSession.create.mockResolvedValue({ id: 'sess-1' });
    const result = await service.create('trip-1', 'user-1', 0);
    expect(mockPrisma.liveGuideSession.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          tripId: 'trip-1',
          userId: 'user-1',
          currentDay: 0,
          isActive: true,
        }),
      }),
    );
    expect(result).toEqual({ id: 'sess-1' });
  });

  it('getAllActiveSessions: returns active sessions', async () => {
    mockPrisma.liveGuideSession.findMany.mockResolvedValue([
      { id: 's1' },
      { id: 's2' },
    ]);
    const result = await service.getAllActiveSessions();
    expect(result).toHaveLength(2);
  });
});
