import { Test } from '@nestjs/testing';
import { forwardRef } from '@nestjs/common';
import { LiveGuideService } from './live-guide.service';
import { SessionService } from './session.service';
import { NotificationService } from './notification.service';
import { LiveGuideGateway } from './live-guide.gateway';
import { AiService } from '../ai/ai.service';
import { ProfileService } from '../profile/profile.service';
import { PrismaService } from '../prisma/prisma.service';
import { CorrectionsService } from '../corrections/corrections.service';
import { ActivitySchedulerService } from './activity-scheduler.service';

const mockPrisma = {
  user: { upsert: jest.fn() },
  savedTrip: { findFirst: jest.fn() },
};
const mockSession = {
  computeCurrentDay: jest.fn(),
  findActive: jest.fn(),
  create: jest.fn(),
  update: jest.fn(),
  deactivate: jest.fn(),
  getAllActiveSessions: jest.fn(),
};
const mockNotification = { sendToUser: jest.fn(), sendPush: jest.fn() };
const mockGateway = { isConnected: jest.fn(), sendToUser: jest.fn() };
const mockAi = {
  generateLiveBriefing: jest.fn(),
  replanDay: jest.fn(),
  generateLocationSuggestion: jest.fn(),
};
const mockProfile = { getProfile: jest.fn() };
const mockCorrections = { create: jest.fn() };
const mockActivityScheduler = { scheduleActivities: jest.fn() };

const tripFixture = {
  id: 'trip-1',
  userId: 'db-uid',
  destination: 'Cherrapunji',
  state: 'Meghalaya',
  dates: { from: '2026-01-01', to: '2026-01-05' },
  itineraryData: {
    itinerary: [
      {
        day: 1,
        activities: [
          { activity: 'Root Bridge' },
          { activity: 'Rainbow Falls' },
        ],
      },
    ],
  },
  foodGuideData: {
    mealPlan: [
      {
        day: 1,
        breakfast: { suggestion: 'Jadoh', cost: '₹50' },
        lunch: { suggestion: 'Dohneiong' },
        dinner: { suggestion: 'Symdong' },
      },
    ],
  },
};

describe('LiveGuideService', () => {
  let service: LiveGuideService;

  beforeEach(async () => {
    jest.clearAllMocks();
    const module = await Test.createTestingModule({
      providers: [
        LiveGuideService,
        { provide: PrismaService, useValue: mockPrisma },
        { provide: SessionService, useValue: mockSession },
        { provide: NotificationService, useValue: mockNotification },
        { provide: LiveGuideGateway, useValue: mockGateway },
        { provide: AiService, useValue: mockAi },
        { provide: ProfileService, useValue: mockProfile },
        { provide: CorrectionsService, useValue: mockCorrections },
        { provide: ActivitySchedulerService, useValue: mockActivityScheduler },
      ],
    }).compile();
    service = module.get(LiveGuideService);
  });

  describe('activateGuide', () => {
    beforeEach(() => {
      mockPrisma.user.upsert.mockResolvedValue({ id: 'db-uid' });
      mockPrisma.savedTrip.findFirst.mockResolvedValue(tripFixture);
      mockSession.computeCurrentDay.mockReturnValue({
        dayIndex: 0,
        status: 'during',
        totalDays: 5,
      });
      mockSession.findActive.mockResolvedValue(null);
      mockSession.create.mockResolvedValue({
        id: 'sess-1',
        activityStatus: {},
      });
      mockAi.generateLiveBriefing.mockResolvedValue({
        briefing: 'Good morning!',
        pushSummary: 'Day 1!',
      });
      mockProfile.getProfile.mockResolvedValue(null);
    });

    it('creates a new session and returns todayPlan + briefing', async () => {
      const result = await service.activateGuide('trip-1', 'fb-uid', 'fcm-tok');
      expect(mockSession.create).toHaveBeenCalled();
      expect(result.briefing).toBe('Good morning!');
      expect(result.todayPlan).toBeDefined();
    });

    it('reuses existing active session', async () => {
      mockSession.findActive.mockResolvedValue({
        id: 'sess-existing',
        currentDay: 0,
        activityStatus: {},
      });
      const result = await service.activateGuide('trip-1', 'fb-uid', 'fcm-tok');
      expect(mockSession.create).not.toHaveBeenCalled();
      expect(result).toBeDefined();
    });

    it('throws NotFoundException if trip not found', async () => {
      mockPrisma.savedTrip.findFirst.mockResolvedValue(null);
      await expect(
        service.activateGuide('bad-trip', 'fb-uid', 'fcm-tok'),
      ).rejects.toThrow();
    });
  });

  it('markActivityDone: updates activityStatus', async () => {
    mockSession.update.mockResolvedValue({ id: 'sess-1' });
    await service.markActivityDone(
      'sess-1',
      { activityStatus: {} } as any,
      0,
      1,
    );
    expect(mockSession.update).toHaveBeenCalledWith(
      'sess-1',
      expect.objectContaining({ activityStatus: { '0:1': 'done' } }),
    );
  });

  it('skipActivity: logs correction', async () => {
    mockPrisma.savedTrip.findFirst.mockResolvedValue(tripFixture);
    mockSession.update.mockResolvedValue({ id: 'sess-1' });
    mockCorrections.create.mockResolvedValue({});
    await service.skipActivity(
      'sess-1',
      'trip-1',
      'fb-uid',
      { activityStatus: {} } as any,
      0,
      0,
      'too tired',
    );
    expect(mockCorrections.create).toHaveBeenCalled();
  });

  it('getSessionStatus: returns null when no active session', async () => {
    mockPrisma.user.upsert.mockResolvedValue({ id: 'db-uid' });
    mockSession.findActive.mockResolvedValue(null);
    const result = await service.getSessionStatus('trip-1', 'fb-uid');
    expect(result).toBeNull();
  });
});
