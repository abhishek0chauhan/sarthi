import { Test } from '@nestjs/testing';
import { CorrectionsService } from './corrections.service';
import { PrismaService } from '../prisma/prisma.service';

const mockPrisma = {
  correction: {
    create: jest.fn(),
    findMany: jest.fn(),
  },
  user: {
    upsert: jest.fn().mockResolvedValue({ id: 'user-1' }),
  },
};

describe('CorrectionsService', () => {
  let service: CorrectionsService;

  beforeEach(async () => {
    const module = await Test.createTestingModule({
      providers: [
        CorrectionsService,
        { provide: PrismaService, useValue: mockPrisma },
      ],
    }).compile();
    service = module.get(CorrectionsService);
    jest.clearAllMocks();
  });

  describe('create', () => {
    it('creates a correction record', async () => {
      mockPrisma.correction.create.mockResolvedValue({
        id: 'c-1',
        type: 'thumbs_down',
      });
      const result = await service.create('fb-1', {
        tripId: 't-1',
        type: 'thumbs_down',
        context: { place: 'Elephant Falls' },
      });
      expect(mockPrisma.correction.create).toHaveBeenCalled();
      expect(result).toHaveProperty('type', 'thumbs_down');
    });
  });

  describe('listByUser', () => {
    it('returns corrections for the user', async () => {
      mockPrisma.correction.findMany.mockResolvedValue([
        { id: 'c-1' },
        { id: 'c-2' },
      ]);
      const result = await service.listByUser('fb-1');
      expect(result).toHaveLength(2);
    });
  });

  describe('getRecentForPrompt', () => {
    it('returns at most 10 corrections', async () => {
      const many = Array.from({ length: 15 }, (_, i) => ({
        id: `c-${i}`,
        type: 'thumbs_down',
        context: {},
      }));
      mockPrisma.correction.findMany.mockResolvedValue(many.slice(0, 10));
      const result = await service.getRecentForPrompt('user-1');
      expect(result.length).toBeLessThanOrEqual(10);
    });

    it('returns empty array when no corrections', async () => {
      mockPrisma.correction.findMany.mockResolvedValue([]);
      const result = await service.getRecentForPrompt('user-1');
      expect(result).toEqual([]);
    });
  });
});
