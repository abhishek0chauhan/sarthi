import { Test } from '@nestjs/testing';
import { TripChatService } from './trip-chat.service';
import { SavedTripsService } from './saved-trips.service';
import { AiService } from '../ai/ai.service';
import { PrismaService } from '../prisma/prisma.service';
import { ProfileService } from '../profile/profile.service';
import { HttpException, HttpStatus } from '@nestjs/common';

const mockTrip = {
  id: 'trip-1',
  userId: 'user-1',
  destination: 'Cherrapunji',
  state: 'Meghalaya',
  dates: { from: '2026-07-10', to: '2026-07-13' },
  itineraryData: null,
  foodGuideData: null,
};

const mockSavedTripsService = { getById: jest.fn() };
const mockAiService = { tripChat: jest.fn() };
const mockProfileService = { getProfile: jest.fn().mockResolvedValue(null) };
const mockPrisma = {
  tripChatMessage: {
    count: jest.fn(),
    create: jest.fn(),
    findMany: jest.fn(),
    deleteMany: jest.fn(),
  },
};

describe('TripChatService', () => {
  let service: TripChatService;

  beforeEach(async () => {
    const module = await Test.createTestingModule({
      providers: [
        TripChatService,
        { provide: SavedTripsService, useValue: mockSavedTripsService },
        { provide: AiService, useValue: mockAiService },
        { provide: PrismaService, useValue: mockPrisma },
        { provide: ProfileService, useValue: mockProfileService },
      ],
    }).compile();
    service = module.get(TripChatService);
    jest.clearAllMocks();
  });

  describe('sendMessage', () => {
    it('returns AI response and stores messages', async () => {
      mockSavedTripsService.getById.mockResolvedValue(mockTrip);
      mockPrisma.tripChatMessage.count.mockResolvedValue(0);
      mockPrisma.tripChatMessage.findMany.mockResolvedValue([]);
      mockAiService.tripChat.mockResolvedValue('Living Root Bridge is about 3km from the main road.');
      mockPrisma.tripChatMessage.create.mockResolvedValue({});

      const result = await service.sendMessage('trip-1', 'How far is the Root Bridge?', { uid: 'fb-1' } as any);

      expect(result.reply).toBe('Living Root Bridge is about 3km from the main road.');
      expect(mockPrisma.tripChatMessage.create).toHaveBeenCalledTimes(2); // user + assistant
    });

    it('throws HttpException when rate limit exceeded', async () => {
      mockSavedTripsService.getById.mockResolvedValue(mockTrip);
      mockPrisma.tripChatMessage.count.mockResolvedValue(10); // at limit
      mockPrisma.tripChatMessage.findMany.mockResolvedValue([]);

      await expect(
        service.sendMessage('trip-1', 'Another question', { uid: 'fb-1' } as any),
      ).rejects.toThrow(HttpException);
    });
  });

  describe('getHistory', () => {
    it('returns chat messages for the trip', async () => {
      mockSavedTripsService.getById.mockResolvedValue(mockTrip);
      mockPrisma.tripChatMessage.findMany.mockResolvedValue([
        { id: 'm-1', role: 'user', content: 'How far?', createdAt: new Date() },
        { id: 'm-2', role: 'assistant', content: '3km', createdAt: new Date() },
      ]);

      const result = await service.getHistory('trip-1', { uid: 'fb-1' } as any);
      expect(result).toHaveLength(2);
    });
  });

  describe('clearHistory', () => {
    it('deletes all messages for the trip', async () => {
      mockSavedTripsService.getById.mockResolvedValue(mockTrip);
      mockPrisma.tripChatMessage.deleteMany.mockResolvedValue({ count: 3 });

      await service.clearHistory('trip-1', { uid: 'fb-1' } as any);
      expect(mockPrisma.tripChatMessage.deleteMany).toHaveBeenCalledWith({ where: { tripId: 'trip-1' } });
    });
  });
});
