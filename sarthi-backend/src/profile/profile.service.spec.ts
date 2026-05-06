import { Test } from '@nestjs/testing';
import { ProfileService } from './profile.service';
import { PrismaService } from '../prisma/prisma.service';
import { AiService } from '../ai/ai.service';

const mockPrisma = {
  travelerProfile: {
    findUnique: jest.fn(),
    upsert: jest.fn(),
    delete: jest.fn(),
  },
  user: {
    upsert: jest.fn().mockResolvedValue({ id: 'user-1', firebaseUid: 'fb-1' }),
  },
};

const mockAi = {
  extractPersonality: jest.fn(),
};

describe('ProfileService', () => {
  let service: ProfileService;

  beforeEach(async () => {
    const module = await Test.createTestingModule({
      providers: [
        ProfileService,
        { provide: PrismaService, useValue: mockPrisma },
        { provide: AiService, useValue: mockAi },
      ],
    }).compile();
    service = module.get(ProfileService);
    jest.clearAllMocks();
  });

  describe('getProfile', () => {
    it('returns default profile when no profile exists', async () => {
      mockPrisma.travelerProfile.findUnique.mockResolvedValue(null);
      const result = await service.getProfile('fb-1');
      expect(result).toEqual(expect.objectContaining({
        userId: expect.any(String),
        story: null,
        travelPace: null,
        completeness: 0,
      }));
    });

    it('returns profile when it exists', async () => {
      const profile = {
        id: 'p-1',
        userId: 'user-1',
        travelPace: 'loose',
        completeness: 20,
      };
      mockPrisma.travelerProfile.findUnique.mockResolvedValue(profile);
      const result = await service.getProfile('fb-1');
      expect(result).toEqual(profile);
    });
  });

  describe('submitStory', () => {
    it('extracts personality and upserts profile', async () => {
      mockAi.extractPersonality.mockResolvedValue({
        travelPace: 'loose',
        comfortLevel: 'homestay',
        crowdTolerance: 'avoid',
        travelMotivations: ['nature'],
        confidence: 60,
      });
      mockPrisma.travelerProfile.upsert.mockResolvedValue({
        id: 'p-1',
        userId: 'user-1',
        story: 'test story',
        travelPace: 'loose',
        completeness: 33,
      });

      const result = await service.submitStory('fb-1', 'test story');
      expect(mockAi.extractPersonality).toHaveBeenCalledWith('test story');
      expect(mockPrisma.travelerProfile.upsert).toHaveBeenCalled();
      expect(result).toHaveProperty('travelPace', 'loose');
    });
  });

  describe('submitQuiz', () => {
    it('merges quiz answers into existing profile', async () => {
      mockPrisma.travelerProfile.upsert.mockResolvedValue({
        id: 'p-1',
        userId: 'user-1',
        travelPace: 'packed',
        completeness: 55,
      });

      const result = await service.submitQuiz('fb-1', {
        travelPace: 'packed',
        spendingStyle: 'budget',
      });
      expect(mockPrisma.travelerProfile.upsert).toHaveBeenCalled();
      expect(result).toHaveProperty('travelPace', 'packed');
    });
  });

  describe('computeCompleteness', () => {
    it('returns 0 for empty profile', () => {
      expect(service.computeCompleteness({})).toBe(0);
    });

    it('returns 100 when all 9 dimensions are filled', () => {
      expect(
        service.computeCompleteness({
          travelPace: 'loose',
          depthVsBreadth: 'deep',
          comfortLevel: 'homestay',
          crowdTolerance: 'avoid',
          travelMotivations: ['nature'],
          physicalReadiness: 'yes',
          spendingStyle: 'budget',
          groundReality: 'bring_it',
          languageComfort: 'fine',
        }),
      ).toBe(100);
    });

    it('counts each filled dimension correctly', () => {
      expect(
        service.computeCompleteness({
          travelPace: 'loose',
          comfortLevel: 'rough',
        }),
      ).toBe(22);
    });
  });

  describe('resetProfile', () => {
    it('deletes the profile', async () => {
      mockPrisma.travelerProfile.delete.mockResolvedValue({});
      await service.resetProfile('fb-1');
      expect(mockPrisma.travelerProfile.delete).toHaveBeenCalled();
    });
  });
});
