import { Test } from '@nestjs/testing';
import { PhrasebookService } from './phrasebook.service';
import { SavedTripsService } from './saved-trips.service';
import { AiService } from '../ai/ai.service';
import { PrismaService } from '../prisma/prisma.service';
import { NotFoundException } from '@nestjs/common';

const mockTrip = {
  id: 'trip-1',
  userId: 'user-1',
  destination: 'Cherrapunji',
  state: 'Meghalaya',
  phrasebookData: null,
};

const mockPhrasebook = {
  language: 'Khasi',
  greeting: [{ english: 'Hello', local: 'Khublei', pronunciation: 'khoo-blay' }],
  food: [], directions: [], emergency: [], bargaining: [], culturalNotes: [],
};

const mockSavedTripsService = {
  getById: jest.fn(),
};

const mockAiService = {
  generatePhrasebook: jest.fn(),
};

const mockPrisma = {
  savedTrip: {
    update: jest.fn(),
  },
};

describe('PhrasebookService', () => {
  let service: PhrasebookService;

  beforeEach(async () => {
    const module = await Test.createTestingModule({
      providers: [
        PhrasebookService,
        { provide: SavedTripsService, useValue: mockSavedTripsService },
        { provide: AiService, useValue: mockAiService },
        { provide: PrismaService, useValue: mockPrisma },
      ],
    }).compile();
    service = module.get(PhrasebookService);
    jest.clearAllMocks();
  });

  describe('getPhrasebook', () => {
    it('returns stored phrasebook when it exists', async () => {
      mockSavedTripsService.getById.mockResolvedValue({ ...mockTrip, phrasebookData: mockPhrasebook });
      const result = await service.getPhrasebook('trip-1', { uid: 'fb-1' } as any);
      expect(result).toEqual(mockPhrasebook);
    });

    it('returns null when no phrasebook yet', async () => {
      mockSavedTripsService.getById.mockResolvedValue(mockTrip);
      const result = await service.getPhrasebook('trip-1', { uid: 'fb-1' } as any);
      expect(result).toBeNull();
    });
  });

  describe('generateAndStore', () => {
    it('calls AI and stores result', async () => {
      mockSavedTripsService.getById.mockResolvedValue(mockTrip);
      mockAiService.generatePhrasebook.mockResolvedValue(mockPhrasebook);
      mockPrisma.savedTrip.update.mockResolvedValue({ ...mockTrip, phrasebookData: mockPhrasebook });

      const result = await service.generateAndStore('trip-1', { uid: 'fb-1' } as any);

      expect(mockAiService.generatePhrasebook).toHaveBeenCalledWith('Cherrapunji', 'Meghalaya');
      expect(mockPrisma.savedTrip.update).toHaveBeenCalledWith({
        where: { id: 'trip-1' },
        data: { phrasebookData: mockPhrasebook },
      });
      expect(result).toEqual(mockPhrasebook);
    });
  });
});
