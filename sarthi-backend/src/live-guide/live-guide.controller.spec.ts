import { Test } from '@nestjs/testing';
import { LiveGuideController } from './live-guide.controller';
import { LiveGuideService } from './live-guide.service';
import { PrismaService } from '../prisma/prisma.service';
import { FirebaseAuthGuard } from '../auth/firebase-auth.guard';

const mockService = { getSessionStatus: jest.fn() };
const mockPrisma = {
  activitySchedule: {
    findMany: jest.fn(),
  },
};

describe('LiveGuideController', () => {
  let controller: LiveGuideController;

  beforeEach(async () => {
    jest.clearAllMocks();
    const module = await Test.createTestingModule({
      controllers: [LiveGuideController],
      providers: [
        { provide: LiveGuideService, useValue: mockService },
        { provide: PrismaService, useValue: mockPrisma },
      ],
    })
      .overrideGuard(FirebaseAuthGuard)
      .useValue({ canActivate: () => true })
      .compile();
    controller = module.get(LiveGuideController);
  });

  it('GET /live-guide/:tripId/status calls getSessionStatus', async () => {
    mockService.getSessionStatus.mockResolvedValue({
      sessionId: 's1',
      isActive: true,
    });
    const result = await controller.status('trip-1', {
      user: { uid: 'fb' },
    } as any);
    expect(mockService.getSessionStatus).toHaveBeenCalledWith('trip-1', 'fb');
    expect(result).toEqual({ sessionId: 's1', isActive: true });
  });
});
