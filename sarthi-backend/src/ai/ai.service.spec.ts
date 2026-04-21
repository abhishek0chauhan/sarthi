import { AiService } from './ai.service';

jest.mock('./generate-json', () => ({
  generateJson: jest.fn(),
}));

import { generateJson } from './generate-json';

const PROMPT = { system: 'sys', user: 'usr' };
const SHORTLIST_IDS = ['id-1', 'id-2', 'id-3'];

const mockAdvisory = {
  suitability: 'moderate',
  altitude: '2000m',
  physicalDemand: 'Moderate walking',
  alerts: ['Stay hydrated'],
  prepTips: ['Walk 3km daily'],
};

const mockCostBreakdown = {
  transport: '₹3500',
  stay: '₹8000',
  food: '₹4000',
  activities: '₹2000',
  total: '₹17,500',
};

const mockPermits = {
  required: false,
  documents: [],
  notes: '',
};

const mockTripReadiness = {
  score: 80,
  label: 'Good to Go',
  fitness: 'No concerns',
  weather: 'Pack light layers',
  documents: 'No permits needed',
  budget: 'Within range',
  actionItems: [],
};

describe('AiService', () => {
  let service: AiService;
  const mockGenerateJson = generateJson as jest.MockedFunction<typeof generateJson>;

  beforeEach(() => {
    service = new AiService();
    mockGenerateJson.mockReset();
  });

  describe('rankDestinations', () => {
    it('returns ranked results filtered to shortlist IDs, capped at 5', async () => {
      mockGenerateJson.mockResolvedValue({
        rankings: [
          { id: 'id-1', whyItMatches: 'Great for trekking', healthAdvisory: mockAdvisory, costBreakdown: mockCostBreakdown, permits: mockPermits, tripReadiness: mockTripReadiness },
          { id: 'id-2', whyItMatches: 'Offbeat and scenic', healthAdvisory: mockAdvisory, costBreakdown: mockCostBreakdown, permits: mockPermits, tripReadiness: mockTripReadiness },
          { id: 'unknown-id', whyItMatches: 'Should be filtered out', healthAdvisory: mockAdvisory, costBreakdown: mockCostBreakdown, permits: mockPermits, tripReadiness: mockTripReadiness },
        ],
      } as any);

      const result = await service.rankDestinations(PROMPT, SHORTLIST_IDS);
      expect(result).toHaveLength(2);
      expect(result[0]).toEqual({ id: 'id-1', whyItMatches: 'Great for trekking', healthAdvisory: mockAdvisory, costBreakdown: mockCostBreakdown, permits: mockPermits, tripReadiness: mockTripReadiness });
      expect(result.find(r => r.id === 'unknown-id')).toBeUndefined();
    });

    it('returns empty array when AI returns empty rankings', async () => {
      mockGenerateJson.mockResolvedValue({ rankings: [] } as any);

      const result = await service.rankDestinations(PROMPT, SHORTLIST_IDS);
      expect(result).toEqual([]);
    });

    it('caps results at 5 even if AI returns more', async () => {
      const manyResults = Array.from({ length: 10 }, (_, i) => ({
        id: `id-${i + 1}`,
        whyItMatches: `reason ${i}`,
        healthAdvisory: mockAdvisory,
        costBreakdown: mockCostBreakdown,
        permits: mockPermits,
        tripReadiness: mockTripReadiness,
      }));
      const largeShortlist = manyResults.map(r => r.id);
      mockGenerateJson.mockResolvedValue({ rankings: manyResults } as any);

      const result = await service.rankDestinations(PROMPT, largeShortlist);
      expect(result).toHaveLength(5);
    });

    it('throws when AI API itself throws', async () => {
      mockGenerateJson.mockRejectedValue(new Error('API error'));
      await expect(service.rankDestinations(PROMPT, SHORTLIST_IDS)).rejects.toThrow('API error');
    });
  });

  describe('generateDestinations', () => {
    it('returns parsed array from AI', async () => {
      const destinations = [
        {
          name: 'Kasol',
          state: 'HP',
          isHiddenGem: true,
          budgetEstimate: '₹8k',
          weatherSnapshot: 'Pleasant',
          travelTime: '14h bus',
          highlights: ['Kheerganga'],
          whyItMatches: 'Great trek',
          healthAdvisory: mockAdvisory,
          costBreakdown: mockCostBreakdown,
          permits: mockPermits,
          tripReadiness: mockTripReadiness,
        },
      ];
      mockGenerateJson.mockResolvedValue({ destinations } as any);

      const result = await service.generateDestinations(PROMPT);
      expect(result).toEqual(destinations);
    });

    it('returns empty array when AI returns empty', async () => {
      mockGenerateJson.mockResolvedValue({ destinations: [] } as any);

      const result = await service.generateDestinations(PROMPT);
      expect(result).toEqual([]);
    });

    it('caps results at 5', async () => {
      const many = Array.from({ length: 8 }, (_, i) => ({
        name: `Place ${i}`,
        state: 'State',
        isHiddenGem: false,
        budgetEstimate: '₹5k',
        weatherSnapshot: 'Hot',
        travelTime: '2h',
        highlights: ['x'],
        whyItMatches: 'reason',
        healthAdvisory: mockAdvisory,
        costBreakdown: mockCostBreakdown,
        permits: mockPermits,
        tripReadiness: mockTripReadiness,
      }));
      mockGenerateJson.mockResolvedValue({ destinations: many } as any);

      const result = await service.generateDestinations(PROMPT);
      expect(result).toHaveLength(5);
    });
  });

  describe('generateItinerary', () => {
    it('returns parsed itinerary from AI', async () => {
      const mockItinerary = {
        destination: 'Goa',
        totalEstimate: '₹34,000',
        itinerary: [{ day: 1, title: 'Arrival', activities: [], meals: { breakfast: 'x', lunch: 'x', dinner: 'x' }, healthNote: '' }],
        packingList: ['Sunscreen'],
        healthAdvisory: mockAdvisory,
        permits: mockPermits,
      };
      mockGenerateJson.mockResolvedValue({ result: mockItinerary } as any);

      const result = await service.generateItinerary(PROMPT);
      expect(result.destination).toBe('Goa');
      expect(result.itinerary).toHaveLength(1);
    });

    it('throws when AI fails', async () => {
      mockGenerateJson.mockRejectedValue(new Error('AI error'));
      await expect(service.generateItinerary(PROMPT)).rejects.toThrow('AI error');
    });
  });

  describe('generateFoodGuide', () => {
    it('returns parsed food guide from AI', async () => {
      const mockFoodGuide = {
        destination: 'Jaipur',
        overview: 'Rajasthani cuisine',
        mustTryDishes: [],
        healthConscious: [],
        streetFood: { safetyTips: [], items: [] },
        mealPlan: [],
        dietaryInfo: { vegFriendly: 'Yes', veganOptions: 'Limited', halalAvailability: 'Yes', waterAdvice: 'Bottled' },
      };
      mockGenerateJson.mockResolvedValue({ result: mockFoodGuide } as any);

      const result = await service.generateFoodGuide(PROMPT);
      expect(result.destination).toBe('Jaipur');
    });

    it('throws when AI fails', async () => {
      mockGenerateJson.mockRejectedValue(new Error('AI error'));
      await expect(service.generateFoodGuide(PROMPT)).rejects.toThrow('AI error');
    });
  });

  describe('rankTreks', () => {
    it('returns parsed trek results from AI', async () => {
      const mockTrekResult = {
        name: 'Hampta Pass',
        region: 'Kullu, HP',
        baseCamp: 'Jobra',
        peakAltitude: '4,270m',
        difficulty: 'Moderate',
        durationDays: '5 days',
        terrain: 'Snow, meadows',
        whyItMatches: 'Great for your fitness',
        highlights: ['Lahaul Valley'],
        healthAdvisory: mockAdvisory,
        costBreakdown: mockCostBreakdown,
        permits: mockPermits,
        tripReadiness: mockTripReadiness,
      };
      mockGenerateJson.mockResolvedValue({ treks: [mockTrekResult] } as any);

      const result = await service.rankTreks(PROMPT);
      expect(result).toHaveLength(1);
      expect(result[0].name).toBe('Hampta Pass');
    });

    it('returns empty array when AI returns empty', async () => {
      mockGenerateJson.mockResolvedValue({ treks: [] } as any);

      const result = await service.rankTreks(PROMPT);
      expect(result).toEqual([]);
    });

    it('caps results at 5', async () => {
      const many = Array.from({ length: 8 }, (_, i) => ({
        name: `Trek ${i}`,
        region: 'Region',
        baseCamp: 'Base',
        peakAltitude: '3000m',
        difficulty: 'Moderate',
        durationDays: '5 days',
        terrain: 'Snow',
        whyItMatches: 'reason',
        highlights: ['x'],
        healthAdvisory: mockAdvisory,
        costBreakdown: mockCostBreakdown,
        permits: mockPermits,
        tripReadiness: mockTripReadiness,
      }));
      mockGenerateJson.mockResolvedValue({ treks: many } as any);

      const result = await service.rankTreks(PROMPT);
      expect(result).toHaveLength(5);
    });

    it('throws when AI fails', async () => {
      mockGenerateJson.mockRejectedValue(new Error('AI error'));
      await expect(service.rankTreks(PROMPT)).rejects.toThrow('AI error');
    });
  });
});
