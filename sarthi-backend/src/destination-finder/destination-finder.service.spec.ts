import { DestinationFinderService } from './destination-finder.service';
import { DestinationQueryService } from './destination-query.service';
import { AiService } from '../ai/ai.service';
import { CacheService } from '../cache/cache.service';
import { ConfigService } from '@nestjs/config';
import { SearchDestinationsDto } from './dto/search-destinations.dto';
import { TrekService } from '../treks/trek.service';

function makeDto(): SearchDestinationsDto {
  return {
    dates: { from: '2025-05-01', to: '2025-05-07' },
    budget: { min: 5000, max: 15000 },
    experienceTypes: ['mountains'],
    departureCity: 'Mumbai',
    group: { size: 4, type: 'friends' },
    freeText: 'offbeat trek',
  };
}

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

const mockDestination = {
  id: 'uuid-1',
  name: 'Kasol',
  state: 'Himachal Pradesh',
  region: 'North',
  experienceTypes: ['mountains', 'adventure'],
  budgetMin: 700,
  budgetMax: 1200,
  bestMonths: [4, 5, 6],
  highlights: ['Kheerganga trek', 'Parvati Valley'],
  isHiddenGem: true,
  weatherSummary: 'Pleasant in May',
  travelTimes: { Mumbai: '14h bus', Delhi: '10h bus' },
};

describe('DestinationFinderService', () => {
  let service: DestinationFinderService;
  let queryService: jest.Mocked<DestinationQueryService>;
  let aiService: jest.Mocked<AiService>;
  let cacheService: jest.Mocked<CacheService>;
  let configService: jest.Mocked<ConfigService>;
  let trekService: jest.Mocked<TrekService>;

  beforeEach(() => {
    queryService = { findShortlist: jest.fn() } as any;
    aiService = {
      rankDestinations: jest.fn(),
      generateDestinations: jest.fn(),
      generateItinerary: jest.fn(),
      generateFoodGuide: jest.fn(),
      rankTreks: jest.fn(),
    } as any;
    cacheService = {
      get: jest.fn(),
      set: jest.fn(),
      buildKey: jest.fn().mockReturnValue('cache-key-hash'),
      normalizeText: jest.fn().mockReturnValue('offbeat trek'),
    } as any;
    configService = { get: jest.fn() } as any;
    trekService = {
      isTrekkingIntent: jest.fn().mockReturnValue(false),
      filterForSearch: jest.fn(),
    } as any;

    service = new DestinationFinderService(
      queryService,
      aiService,
      cacheService,
      configService,
      trekService,
    );
  });

  describe('cache hit', () => {
    it('returns cached result without calling DB or AI', async () => {
      const cached = { mode: 'hybrid', results: [] };
      cacheService.get.mockResolvedValue(cached);

      const result = await service.search(makeDto());

      expect(result).toEqual(cached);
      expect(queryService.findShortlist).not.toHaveBeenCalled();
      expect(aiService.rankDestinations).not.toHaveBeenCalled();
    });
  });

  describe('cache key generation', () => {
    it('produces different cache keys when hiddenGem differs', async () => {
      const baseDto: SearchDestinationsDto = {
        dates: { from: '2026-04-17', to: '2026-04-19' },
        budget: { min: 5000, max: 10000 },
        experienceTypes: ['nature'],
        departureCity: 'Ahmedabad',
        group: { size: 2, type: 'couple' },
        freeText: 'offbeat trip',
      };

      cacheService.get.mockResolvedValue(null);
      cacheService.set.mockResolvedValue(undefined);
      queryService.findShortlist.mockResolvedValue([]);
      aiService.generateDestinations.mockResolvedValue([]);
      configService.get.mockReturnValue('hybrid');

      // Mock buildKey to return different values based on input
      const buildKeySpy = jest.spyOn(cacheService, 'buildKey');
      let callCount = 0;
      buildKeySpy.mockImplementation((input: any) => {
        callCount++;
        return input.hiddenGem
          ? `key-with-hidden-gem-${callCount}`
          : `key-without-hidden-gem-${callCount}`;
      });

      try {
        await service.search(baseDto);
      } catch (e) {
        // OK if it throws
      }

      const keyWithoutFlag = buildKeySpy.mock.results[0]?.value;

      try {
        await service.search({ ...baseDto, hiddenGem: true });
      } catch (e) {
        // OK if it throws
      }

      const keyWithFlag = buildKeySpy.mock.results[1]?.value;

      expect(keyWithFlag).not.toBe(keyWithoutFlag);
      expect(keyWithFlag).toContain('with-hidden-gem');
      expect(keyWithoutFlag).toContain('without-hidden-gem');
    });
  });

  describe('hybrid mode', () => {
    beforeEach(() => {
      cacheService.get.mockResolvedValue(null);
      configService.get.mockReturnValue('hybrid');
    });

    it('returns ranked results merged with DB data including travelTime', async () => {
      queryService.findShortlist.mockResolvedValue([mockDestination] as any);
      aiService.rankDestinations.mockResolvedValue([
        {
          id: 'uuid-1',
          whyItMatches: 'Great for trekking',
          healthAdvisory: mockAdvisory,
          costBreakdown: mockCostBreakdown,
          permits: mockPermits,
          tripReadiness: mockTripReadiness,
        },
      ]);

      const result = await service.search(makeDto());

      expect(result.mode).toBe('hybrid');
      expect(result.results[0].name).toBe('Kasol');
      expect(result.results[0].travelTime).toBe('14h bus');
      expect(result.results[0].whyItMatches).toBe('Great for trekking');
      expect(result.results[0].costBreakdown).toEqual(mockCostBreakdown);
      expect(result.results[0].permits).toEqual(mockPermits);
      expect(result.results[0].tripReadiness).toEqual(mockTripReadiness);
    });

    it('omits travelTime when departure city not in travelTimes map', async () => {
      const destWithoutCity = {
        ...mockDestination,
        travelTimes: { Delhi: '10h bus' },
      };
      queryService.findShortlist.mockResolvedValue([destWithoutCity] as any);
      aiService.rankDestinations.mockResolvedValue([
        {
          id: 'uuid-1',
          whyItMatches: 'Great trek',
          healthAdvisory: mockAdvisory,
          costBreakdown: mockCostBreakdown,
          permits: mockPermits,
          tripReadiness: mockTripReadiness,
        },
      ]);

      const result = await service.search(makeDto());
      expect(result.results[0].travelTime).toBeUndefined();
    });

    it('falls back to top 5 DB results without whyItMatches when AI returns empty', async () => {
      queryService.findShortlist.mockResolvedValue([mockDestination] as any);
      aiService.rankDestinations.mockResolvedValue([]);

      const result = await service.search(makeDto());

      expect(result.mode).toBe('hybrid');
      expect(result.results[0].name).toBe('Kasol');
      expect(result.results[0].whyItMatches).toBeUndefined();
    });

    it('falls back to ai_full when DB returns empty shortlist', async () => {
      queryService.findShortlist.mockResolvedValue([]);
      aiService.generateDestinations.mockResolvedValue([
        {
          name: 'Spiti',
          state: 'HP',
          isHiddenGem: true,
          budgetEstimate: '₹10k',
          weatherSnapshot: 'Cold',
          travelTime: '12h bus',
          highlights: ['Key Monastery'],
          whyItMatches: 'Remote and beautiful',
        },
      ]);

      const result = await service.search(makeDto());

      expect(aiService.generateDestinations).toHaveBeenCalled();
      expect(result.mode).toBe('ai_full');
    });

    it('caches the result after a successful search', async () => {
      queryService.findShortlist.mockResolvedValue([mockDestination] as any);
      aiService.rankDestinations.mockResolvedValue([
        {
          id: 'uuid-1',
          whyItMatches: 'Great trek',
          healthAdvisory: mockAdvisory,
          costBreakdown: mockCostBreakdown,
          permits: mockPermits,
          tripReadiness: mockTripReadiness,
        },
      ]);

      await service.search(makeDto());

      expect(cacheService.set).toHaveBeenCalledWith(
        'cache-key-hash',
        expect.any(Object),
        86400,
      );
    });

    it('builds cache key using normalizedFreeText field name (not freeText)', async () => {
      queryService.findShortlist.mockResolvedValue([mockDestination] as any);
      aiService.rankDestinations.mockResolvedValue([]);

      await service.search(makeDto());

      expect(cacheService.buildKey).toHaveBeenCalledWith(
        expect.objectContaining({ normalizedFreeText: 'offbeat trek' }),
      );
      expect(cacheService.buildKey).toHaveBeenCalledWith(
        expect.not.objectContaining({ freeText: expect.anything() }),
      );
    });

    it('throws 503 when AI API throws', async () => {
      queryService.findShortlist.mockResolvedValue([mockDestination] as any);
      aiService.rankDestinations.mockRejectedValue(new Error('AI API down'));

      await expect(service.search(makeDto())).rejects.toMatchObject({
        status: 503,
      });
    });
  });

  describe('ai_full mode', () => {
    it('skips DB and calls generateDestinations', async () => {
      cacheService.get.mockResolvedValue(null);
      configService.get.mockReturnValue('ai_full');
      aiService.generateDestinations.mockResolvedValue([
        {
          name: 'Spiti',
          state: 'HP',
          isHiddenGem: true,
          budgetEstimate: '₹10k',
          weatherSnapshot: 'Cold',
          travelTime: '12h bus',
          highlights: ['Key Monastery'],
          whyItMatches: 'Remote',
        },
      ]);

      const result = await service.search(makeDto());

      expect(queryService.findShortlist).not.toHaveBeenCalled();
      expect(result.mode).toBe('ai_full');
    });
  });

  describe('itinerary', () => {
    const itineraryDto = {
      destination: 'Goa',
      state: 'Goa',
      dates: { from: '2026-11-15', to: '2026-11-18' },
      budget: { min: 5000, max: 20000 },
      group: { size: 2, type: 'couple' },
      departureCity: 'Mumbai',
      freeText: 'beach vacation',
    };

    const mockItineraryResult = {
      destination: 'Goa',
      totalEstimate: '₹34,000',
      itinerary: [
        {
          day: 1,
          title: 'Arrival',
          activities: [],
          meals: { breakfast: 'x', lunch: 'x', dinner: 'x' },
          healthNote: '',
        },
      ],
      packingList: ['Sunscreen'],
      healthAdvisory: mockAdvisory,
      permits: mockPermits,
    };

    beforeEach(() => {
      cacheService.get.mockResolvedValue(null);
    });

    it('returns cached result when cache hit', async () => {
      cacheService.get.mockResolvedValue(mockItineraryResult);
      const result = await service.itinerary(itineraryDto as any);
      expect(result).toEqual(mockItineraryResult);
      expect(aiService.generateItinerary).not.toHaveBeenCalled();
    });

    it('calls AI and caches result on cache miss', async () => {
      aiService.generateItinerary.mockResolvedValue(mockItineraryResult);
      const result = await service.itinerary(itineraryDto as any);
      expect(aiService.generateItinerary).toHaveBeenCalled();
      expect(cacheService.set).toHaveBeenCalledWith(
        'cache-key-hash',
        mockItineraryResult,
        86400,
      );
      expect(result).toEqual(mockItineraryResult);
    });

    it('throws 503 when AI fails', async () => {
      aiService.generateItinerary.mockRejectedValue(new Error('AI down'));
      await expect(
        service.itinerary(itineraryDto as any),
      ).rejects.toMatchObject({ status: 503 });
    });
  });

  describe('foodGuide', () => {
    const foodGuideDto = {
      destination: 'Jaipur',
      state: 'Rajasthan',
      dates: { from: '2026-11-15', to: '2026-11-18' },
      group: { size: 2, type: 'couple' },
      departureCity: 'Mumbai',
      freeText: 'love spicy food',
      dietType: 'non-veg',
    };

    const mockFoodGuideResult = {
      destination: 'Jaipur',
      overview: 'Rajasthani cuisine',
      mustTryDishes: [],
      healthConscious: [],
      streetFood: { safetyTips: [], items: [] },
      mealPlan: [],
      dietaryInfo: {
        vegFriendly: 'Yes',
        veganOptions: 'Limited',
        halalAvailability: 'Yes',
        waterAdvice: 'Bottled',
      },
    };

    beforeEach(() => {
      cacheService.get.mockResolvedValue(null);
    });

    it('returns cached result when cache hit', async () => {
      cacheService.get.mockResolvedValue(mockFoodGuideResult);
      const result = await service.foodGuide(foodGuideDto as any);
      expect(result).toEqual(mockFoodGuideResult);
      expect(aiService.generateFoodGuide).not.toHaveBeenCalled();
    });

    it('calls AI and caches result on cache miss', async () => {
      aiService.generateFoodGuide.mockResolvedValue(mockFoodGuideResult);
      const result = await service.foodGuide(foodGuideDto as any);
      expect(aiService.generateFoodGuide).toHaveBeenCalled();
      expect(cacheService.set).toHaveBeenCalledWith(
        'cache-key-hash',
        mockFoodGuideResult,
        86400,
      );
      expect(result).toEqual(mockFoodGuideResult);
    });

    it('throws 503 when AI fails', async () => {
      aiService.generateFoodGuide.mockRejectedValue(new Error('AI down'));
      await expect(
        service.foodGuide(foodGuideDto as any),
      ).rejects.toMatchObject({ status: 503 });
    });

    it('produces different cache keys when cuisinePreferences differs', async () => {
      aiService.generateFoodGuide.mockResolvedValue(mockFoodGuideResult);

      const buildKeySpy = jest.spyOn(cacheService, 'buildKey');
      buildKeySpy.mockImplementation((input: any) =>
        input.cuisinePreferences ? 'key-with-cuisine' : 'key-without-cuisine',
      );

      await service.foodGuide(foodGuideDto as any);
      const keyWithout = buildKeySpy.mock.results[0].value;

      buildKeySpy.mockClear();
      await service.foodGuide({
        ...foodGuideDto,
        cuisinePreferences: ['Rajasthani'],
      } as any);
      const keyWith = buildKeySpy.mock.results[0].value;

      expect(keyWith).not.toBe(keyWithout);
    });
  });

  describe('trek mode', () => {
    const trekDto = {
      dates: { from: '2026-06-01', to: '2026-06-08' },
      budget: { min: 5000, max: 25000 },
      experienceTypes: ['trekking'],
      departureCity: 'Delhi',
      group: { size: 2, type: 'friends' },
      freeText: 'challenging high altitude trek',
      age: 25,
    } as any;

    const mockTrek = {
      name: 'Hampta Pass',
      region: 'Kullu, Himachal Pradesh',
      state: 'Himachal Pradesh',
      baseCamp: 'Jobra',
      peakAltitude: 4270,
      difficulty: 'moderate',
      durationDays: 5,
      bestMonths: [6, 7, 8, 9],
      terrain: ['snow', 'meadows'],
      highlights: ['Lahaul Valley views'],
      nearestCity: 'Manali',
      permits: true,
      fitnessDemand: 'Walk 6-8 hours daily',
    };

    const mockTrekAiResult = {
      name: 'Hampta Pass',
      region: 'Kullu, HP',
      baseCamp: 'Jobra',
      peakAltitude: '4,270m',
      difficulty: 'Moderate',
      durationDays: '5 days',
      terrain: 'Snow, meadows',
      whyItMatches: 'Great for your fitness',
      highlights: ['Lahaul Valley views'],
      healthAdvisory: mockAdvisory,
      costBreakdown: mockCostBreakdown,
      permits: mockPermits,
      tripReadiness: mockTripReadiness,
    };

    beforeEach(() => {
      cacheService.get.mockResolvedValue(null);
      configService.get.mockReturnValue('hybrid');
      trekService.isTrekkingIntent.mockReturnValue(true);
      trekService.filterForSearch.mockReturnValue([mockTrek]);
      aiService.rankTreks.mockResolvedValue([mockTrekAiResult]);
    });

    it('detects trekking intent and uses trek mode', async () => {
      const result = await service.search(trekDto);
      expect(result.mode).toBe('trek');
      expect(result.results[0].name).toBe('Hampta Pass');
      expect(trekService.isTrekkingIntent).toHaveBeenCalledWith(
        ['trekking'],
        'challenging high altitude trek',
      );
    });

    it('falls back to normal hybrid when no treks match filters', async () => {
      trekService.filterForSearch.mockReturnValue([]);
      queryService.findShortlist.mockResolvedValue([mockDestination] as any);
      aiService.rankDestinations.mockResolvedValue([
        {
          id: 'uuid-1',
          whyItMatches: 'Decent',
          healthAdvisory: mockAdvisory,
          costBreakdown: mockCostBreakdown,
          permits: mockPermits,
          tripReadiness: mockTripReadiness,
        },
      ]);

      const result = await service.search(trekDto);
      expect(result.mode).toBe('hybrid');
    });

    it('caches trek results', async () => {
      await service.search(trekDto);
      expect(cacheService.set).toHaveBeenCalledWith(
        'cache-key-hash',
        expect.objectContaining({ mode: 'trek' }),
        86400,
      );
    });

    it('skips trek mode when intent is not trekking', async () => {
      trekService.isTrekkingIntent.mockReturnValue(false);
      queryService.findShortlist.mockResolvedValue([mockDestination] as any);
      aiService.rankDestinations.mockResolvedValue([
        {
          id: 'uuid-1',
          whyItMatches: 'Beach vibes',
          healthAdvisory: mockAdvisory,
          costBreakdown: mockCostBreakdown,
          permits: mockPermits,
          tripReadiness: mockTripReadiness,
        },
      ]);

      const result = await service.search({
        ...trekDto,
        experienceTypes: ['beach'],
        freeText: 'relaxing beach vacation',
      });

      expect(result.mode).toBe('hybrid');
      expect(trekService.isTrekkingIntent).toHaveBeenCalled();
    });
  });
});
