import {
  rankResultSchema,
  generateResultSchema,
  healthAdvisorySchema,
  costBreakdownSchema,
  permitsSchema,
  tripReadinessSchema,
  rankResultsSchema,
  generateResultsSchema,
  itineraryActivitySchema,
  itineraryDaySchema,
  itineraryResponseSchema,
  foodGuideResponseSchema,
  dishSchema,
  trekResultSchema,
  trekResultsSchema,
  healthConsciousDishSchema,
  streetFoodItemSchema,
  tasteProfileSchema,
  activitySuggestionSchema,
} from './destination.schema';

const validAdvisory = {
  suitability: 'moderate' as const,
  altitude: '2000m above sea level',
  physicalDemand: 'Moderate — 4-5 hours walking on trails',
  alerts: ['Carry sunscreen', 'Stay hydrated'],
  prepTips: ['Start walking 3km daily 2 weeks before'],
};

const validCostBreakdown = {
  transport: '₹3500',
  stay: '₹8000 (4 nights)',
  food: '₹4000',
  activities: '₹2000',
  total: '₹17,500',
};

const validPermits = {
  required: false,
  documents: [],
  notes: '',
};

const validPermitsRequired = {
  required: true,
  documents: ['Inner Line Permit'],
  notes: 'Apply online 2 weeks before at arunachalpradesh.gov.in',
};

const validTripReadiness = {
  score: 75,
  label: 'Good to Go',
  fitness: 'BMI is healthy — no concerns',
  weather: 'Pack rain gear for occasional showers',
  documents: 'No permits required',
  budget: 'Well within range',
  actionItems: ['Book accommodation in advance — peak season'],
};

describe('healthAdvisorySchema', () => {
  it('parses a valid advisory', () => {
    const result = healthAdvisorySchema.parse(validAdvisory);
    expect(result).toEqual(validAdvisory);
  });

  it('coerces unrecognised suitability value to moderate', () => {
    const result = healthAdvisorySchema.parse({
      ...validAdvisory,
      suitability: 'extreme',
    });
    expect(result.suitability).toBe('moderate');
  });

  it('accepts empty alerts and prepTips arrays', () => {
    const result = healthAdvisorySchema.parse({
      ...validAdvisory,
      alerts: [],
      prepTips: [],
    });
    expect(result.alerts).toEqual([]);
    expect(result.prepTips).toEqual([]);
  });
});

describe('rankResultSchema', () => {
  it('parses a valid ranked result', () => {
    const input = {
      id: 'uuid-1',
      whyItMatches: 'Great for trekking',
      healthAdvisory: validAdvisory,
      costBreakdown: validCostBreakdown,
      permits: validPermits,
      tripReadiness: validTripReadiness,
    };
    const result = rankResultSchema.parse(input);
    expect(result).toEqual(input);
  });

  it('rejects missing id', () => {
    expect(() =>
      rankResultSchema.parse({
        whyItMatches: 'Great',
        healthAdvisory: validAdvisory,
      }),
    ).toThrow();
  });

  it('rejects missing healthAdvisory', () => {
    expect(() =>
      rankResultSchema.parse({ id: 'uuid-1', whyItMatches: 'Great' }),
    ).toThrow();
  });
});

describe('generateResultSchema', () => {
  it('parses a valid generated result', () => {
    const input = {
      name: 'Kasol',
      state: 'Himachal Pradesh',
      isHiddenGem: true,
      budgetEstimate: '₹8,000–12,000 per person',
      weatherSnapshot: 'Pleasant, 12-20°C in May',
      travelTime: '14h bus from Mumbai',
      highlights: ['Kheerganga trek', 'Parvati Valley'],
      whyItMatches: 'Offbeat hill town perfect for trekking friends',
      suitability: 'moderate',
      readinessScore: 75,
    };
    const result = generateResultSchema.parse(input);
    expect(result.name).toBe('Kasol');
    expect(result.readinessScore).toBe(75);
  });

  it('rejects missing name', () => {
    expect(() =>
      generateResultSchema.parse({
        state: 'HP',
        isHiddenGem: false,
        budgetEstimate: '₹5k',
        weatherSnapshot: 'Hot',
        travelTime: '2h',
        highlights: ['x'],
        whyItMatches: 'y',
        healthAdvisory: validAdvisory,
      }),
    ).toThrow();
  });

  it('rejects missing healthAdvisory', () => {
    expect(() =>
      generateResultSchema.parse({
        name: 'Kasol',
        state: 'HP',
        isHiddenGem: false,
        budgetEstimate: '₹5k',
        weatherSnapshot: 'Hot',
        travelTime: '2h',
        highlights: ['x'],
        whyItMatches: 'y',
      }),
    ).toThrow();
  });

  it('rejects non-array highlights', () => {
    expect(() =>
      generateResultSchema.parse({
        name: 'Kasol',
        state: 'HP',
        isHiddenGem: false,
        budgetEstimate: '₹5k',
        weatherSnapshot: 'Hot',
        travelTime: '2h',
        highlights: 'not an array',
        whyItMatches: 'y',
        healthAdvisory: validAdvisory,
      }),
    ).toThrow();
  });
});

describe('costBreakdownSchema', () => {
  it('parses a valid cost breakdown', () => {
    const result = costBreakdownSchema.parse(validCostBreakdown);
    expect(result).toEqual(validCostBreakdown);
  });

  it('rejects missing total', () => {
    const { total, ...incomplete } = validCostBreakdown;
    expect(() => costBreakdownSchema.parse(incomplete)).toThrow();
  });
});

describe('permitsSchema', () => {
  it('parses permits not required', () => {
    const result = permitsSchema.parse(validPermits);
    expect(result.required).toBe(false);
  });

  it('parses permits required with documents', () => {
    const result = permitsSchema.parse(validPermitsRequired);
    expect(result.required).toBe(true);
    expect(result.documents).toHaveLength(1);
  });

  it('rejects non-boolean required', () => {
    expect(() =>
      permitsSchema.parse({ ...validPermits, required: 'yes' }),
    ).toThrow();
  });
});

describe('tripReadinessSchema', () => {
  it('parses a valid trip readiness', () => {
    const result = tripReadinessSchema.parse(validTripReadiness);
    expect(result.score).toBe(75);
    expect(result.actionItems).toHaveLength(1);
  });

  it('rejects score above 100', () => {
    expect(() =>
      tripReadinessSchema.parse({ ...validTripReadiness, score: 150 }),
    ).toThrow();
  });

  it('rejects score below 0', () => {
    expect(() =>
      tripReadinessSchema.parse({ ...validTripReadiness, score: -5 }),
    ).toThrow();
  });

  it('accepts score at boundary 0', () => {
    expect(() =>
      tripReadinessSchema.parse({ ...validTripReadiness, score: 0 }),
    ).not.toThrow();
  });

  it('accepts score at boundary 100', () => {
    expect(() =>
      tripReadinessSchema.parse({ ...validTripReadiness, score: 100 }),
    ).not.toThrow();
  });
});

describe('rankResultsSchema', () => {
  it('parses an array of ranked results', () => {
    const result = rankResultsSchema.parse({
      rankings: [
        {
          id: 'uuid-1',
          whyItMatches: 'Great for trekking',
          healthAdvisory: validAdvisory,
          costBreakdown: validCostBreakdown,
          permits: validPermits,
          tripReadiness: validTripReadiness,
        },
      ],
    });
    expect(result.rankings).toHaveLength(1);
  });

  it('rejects missing rankings key', () => {
    expect(() => rankResultsSchema.parse({ results: [] })).toThrow();
  });
});

describe('generateResultsSchema', () => {
  it('parses an array of generated destinations', () => {
    const result = generateResultsSchema.parse({
      destinations: [
        {
          name: 'Kasol',
          state: 'Himachal Pradesh',
          isHiddenGem: true,
          budgetEstimate: '₹8,000–12,000',
          weatherSnapshot: 'Pleasant',
          travelTime: '14h bus',
          highlights: ['Kheerganga trek'],
          whyItMatches: 'Great for trekking',
          suitability: 'easy',
          readinessScore: 80,
        },
      ],
    });
    expect(result.destinations).toHaveLength(1);
  });

  it('rejects missing destinations key', () => {
    expect(() => generateResultsSchema.parse({ items: [] })).toThrow();
  });
});

const validDish = {
  name: 'Laal Maas',
  description: 'Fiery mutton curry with whole red chilies',
  where: 'Handi Restaurant, MI Road',
  priceRange: '₹350-500',
  spiceLevel: 'high',
  healthNote: 'High protein, moderate fat — good choice',
};

const validItineraryDay = {
  day: 1,
  title: 'Arrival + North Goa Beaches',
  activities: [
    {
      time: '10:00 AM',
      activity: 'Arrive at Goa airport',
      cost: '₹0',
      healthNote: '',
    },
    {
      time: '4:00 PM',
      activity: 'Baga Beach sunset walk',
      cost: '₹0',
      healthNote: 'Light walking — no strain',
    },
  ],
  meals: {
    breakfast: '₹200 — Hotel buffet',
    lunch: '₹300 — Fish thali at local shack',
    dinner: "₹800 — Britto's",
  },
  healthNote: 'Light day — no physical strain',
};

describe('itineraryResponseSchema', () => {
  it('parses a valid itinerary', () => {
    const input = {
      destination: 'Goa',
      totalEstimate: '₹34,000 for 2 people',
      itinerary: [validItineraryDay],
      packingList: ['Sunscreen SPF 50', 'Light cotton clothes'],
      healthAdvisory: validAdvisory,
      permits: validPermits,
    };
    const result = itineraryResponseSchema.parse(input);
    expect(result.itinerary).toHaveLength(1);
    expect(result.itinerary[0].activities).toHaveLength(2);
  });

  it('rejects missing destination', () => {
    expect(() =>
      itineraryResponseSchema.parse({
        totalEstimate: '₹34k',
        itinerary: [],
        packingList: [],
        healthAdvisory: validAdvisory,
        permits: validPermits,
      }),
    ).toThrow();
  });

  it('parses without healthAdvisory (optional field)', () => {
    const result = itineraryResponseSchema.parse({
      destination: 'Goa',
      totalEstimate: '₹34k',
      itinerary: [],
      packingList: [],
      permits: validPermits,
    });
    expect(result.destination).toBe('Goa');
    expect(result.healthAdvisory).toBeUndefined();
  });
});

describe('foodGuideResponseSchema', () => {
  it('parses a valid food guide', () => {
    const input = {
      destination: 'Jaipur',
      overview: 'Rajasthani cuisine is rich and heavy on ghee',
      mustTryDishes: [validDish],
      healthConscious: [
        {
          name: 'Ker Sangri',
          description: 'Low cal desert beans',
          healthNote: 'Good for blood sugar',
        },
      ],
      streetFood: {
        safetyTips: ['Stick to busy stalls'],
        items: [
          {
            name: 'Pyaaz Kachori',
            where: 'Rawat',
            price: '₹30',
            healthNote: 'Deep fried — limit to one',
          },
        ],
      },
      mealPlan: [
        {
          day: 1,
          breakfast: {
            suggestion: 'Poha + chai',
            cost: '₹100',
            healthNote: 'Light',
          },
          lunch: {
            suggestion: 'Laal Maas + bajra roti',
            cost: '₹450',
            healthNote: 'High protein',
          },
          dinner: {
            suggestion: 'Grilled kebabs',
            cost: '₹600',
            healthNote: 'Good choice',
          },
        },
      ],
      dietaryInfo: {
        vegFriendly: 'Excellent',
        veganOptions: 'Limited — ghee used extensively',
        halalAvailability: 'Widely available in old city',
        waterAdvice: 'Stick to bottled water',
      },
    };
    const result = foodGuideResponseSchema.parse(input);
    expect(result.mustTryDishes).toHaveLength(1);
    expect(result.mealPlan).toHaveLength(1);
  });

  it('rejects missing destination', () => {
    expect(() =>
      foodGuideResponseSchema.parse({
        overview: 'Rich cuisine',
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
      }),
    ).toThrow();
  });

  it('rejects dish with missing healthNote', () => {
    const badDish = {
      name: 'x',
      description: 'y',
      where: 'z',
      priceRange: '₹100',
      spiceLevel: 'low',
    };
    expect(() => dishSchema.parse(badDish)).toThrow();
  });
});

const validTrekResult = {
  name: 'Hampta Pass',
  region: 'Kullu, Himachal Pradesh',
  baseCamp: 'Jobra (near Manali)',
  peakAltitude: '4,270m',
  difficulty: 'Moderate',
  durationDays: '5 days',
  terrain: 'Snow, meadows, river crossings',
  whyItMatches:
    'Perfect difficulty for your fitness level with stunning valley views',
  highlights: ['Lahaul Valley views', 'Chandratal Lake side trip'],
  healthAdvisory: validAdvisory,
  costBreakdown: validCostBreakdown,
  permits: validPermits,
  tripReadiness: validTripReadiness,
};

describe('trekResultSchema', () => {
  it('parses a valid trek result', () => {
    const result = trekResultSchema.parse(validTrekResult);
    expect(result.name).toBe('Hampta Pass');
    expect(result.peakAltitude).toBe('4,270m');
  });

  it('rejects missing name', () => {
    const { name, ...rest } = validTrekResult;
    expect(() => trekResultSchema.parse(rest)).toThrow();
  });

  it('rejects missing healthAdvisory', () => {
    const { healthAdvisory, ...rest } = validTrekResult;
    expect(() => trekResultSchema.parse(rest)).toThrow();
  });
});

describe('trekResultsSchema', () => {
  it('parses a wrapped trek results array', () => {
    const result = trekResultsSchema.parse({ treks: [validTrekResult] });
    expect(result.treks).toHaveLength(1);
  });

  it('rejects missing treks key', () => {
    expect(() => trekResultsSchema.parse({ results: [] })).toThrow();
  });
});

describe('tasteProfileSchema', () => {
  it('parses a full taste profile', () => {
    const result = tasteProfileSchema.parse({
      sweet: 1,
      spicy: 4,
      sour: 3,
      salty: 2,
      umami: 3,
    });
    expect(result).toEqual({ sweet: 1, spicy: 4, sour: 3, salty: 2, umami: 3 });
  });

  it('fills defaults when taste profile is missing entirely', () => {
    const result = tasteProfileSchema.parse(undefined);
    expect(result).toEqual({ sweet: 0, spicy: 0, sour: 0, salty: 0, umami: 0 });
  });
});

describe('dishSchema allergen + tasteProfile', () => {
  const baseDish = {
    name: 'Fish Curry',
    description: 'Tangy Konkani curry',
    where: 'Local joints',
    priceRange: '₹150–300',
    spiceLevel: 'High',
    healthNote: 'Rich in omega-3',
  };

  it('parses a dish with all new fields present', () => {
    const result = dishSchema.parse({
      ...baseDish,
      allergens: ['fish', 'coconut'],
      allergyAlert: '⚠️ Contains fish — listed in your allergies',
      tasteProfile: { sweet: 0, spicy: 4, sour: 4, salty: 3, umami: 3 },
    });
    expect(result.allergens).toEqual(['fish', 'coconut']);
    expect(result.allergyAlert).toBe(
      '⚠️ Contains fish — listed in your allergies',
    );
    expect(result.tasteProfile?.spicy).toBe(4);
  });

  it('applies defaults when allergens and tasteProfile are missing', () => {
    const result = dishSchema.parse(baseDish);
    expect(result.allergens).toEqual([]);
    expect(result.allergyAlert).toBeUndefined();
    expect(result.tasteProfile).toEqual({
      sweet: 0,
      spicy: 0,
      sour: 0,
      salty: 0,
      umami: 0,
    });
  });

  it('allergyAlert is optional (undefined is valid)', () => {
    const result = dishSchema.parse({ ...baseDish, allergens: ['peanuts'] });
    expect(result.allergyAlert).toBeUndefined();
  });
});

describe('healthConsciousDishSchema allergen + tasteProfile', () => {
  it('applies defaults when allergens and tasteProfile are missing', () => {
    const result = healthConsciousDishSchema.parse({
      name: 'Steamed Rice',
      description: 'Plain',
      healthNote: 'Low cal',
    });
    expect(result.allergens).toEqual([]);
    expect(result.tasteProfile).toEqual({
      sweet: 0,
      spicy: 0,
      sour: 0,
      salty: 0,
      umami: 0,
    });
  });
});

describe('streetFoodItemSchema allergen + tasteProfile', () => {
  it('applies defaults when allergens and tasteProfile are missing', () => {
    const result = streetFoodItemSchema.parse({
      name: 'Vada Pav',
      where: 'Dadar',
      price: '₹20',
      healthNote: 'Avoid if gluten intolerant',
    });
    expect(result.allergens).toEqual([]);
    expect(result.tasteProfile).toEqual({
      sweet: 0,
      spicy: 0,
      sour: 0,
      salty: 0,
      umami: 0,
    });
  });
});

describe('itineraryActivitySchema — placeContext + mapQuery', () => {
  it('parses activity with mapQuery and placeContext', () => {
    const result = itineraryActivitySchema.parse({
      time: '09:00 AM',
      activity: 'Living Root Bridge hike',
      cost: '₹20',
      healthNote: 'Moderate hike',
      mapQuery: 'Living Root Bridge, Cherrapunji, Meghalaya',
      placeContext: {
        whySpecial: 'One of the oldest living root bridges',
        bestTimeToVisit: 'Early morning',
        suggestedDuration: '2-3 hours',
        insiderTips: ['Wear grip shoes'],
        whatToCarry: ['Water bottle'],
      },
    });
    expect(result.mapQuery).toBe('Living Root Bridge, Cherrapunji, Meghalaya');
    expect(result.placeContext?.whySpecial).toBe(
      'One of the oldest living root bridges',
    );
  });

  it('parses activity without mapQuery or placeContext (backward compat)', () => {
    const result = itineraryActivitySchema.parse({
      activity: 'Visit market',
    });
    expect(result.mapQuery).toBe('');
    expect(result.placeContext).toBeUndefined();
  });
});

describe('dishSchema — mapQuery + placeContext', () => {
  it('parses dish with mapQuery and placeContext', () => {
    const result = dishSchema.parse({
      name: 'Jadoh',
      description: 'Rice cooked in pork broth',
      where: 'Police Bazaar, Shillong',
      priceRange: '₹80-120',
      spiceLevel: 'mild',
      healthNote: 'High protein',
      mapQuery: 'Police Bazaar, Shillong, Meghalaya',
      placeContext: {
        bestTimeToVisit: 'Lunch hours',
        insiderTips: ['Cash only'],
      },
    });
    expect(result.mapQuery).toBe('Police Bazaar, Shillong, Meghalaya');
    expect(result.placeContext?.insiderTips).toEqual(['Cash only']);
  });

  it('parses dish without mapQuery or placeContext (backward compat)', () => {
    const result = dishSchema.parse({
      name: 'Jadoh',
      description: 'Rice cooked in pork broth',
      where: 'Police Bazaar',
      priceRange: '₹80',
      spiceLevel: 'mild',
      healthNote: 'Healthy',
    });
    expect(result.mapQuery).toBe('');
    expect(result.placeContext).toBeUndefined();
  });
});

describe('activitySuggestionSchema', () => {
  it('parses a valid suggestion', () => {
    const result = activitySuggestionSchema.parse({
      activity: 'Wei Sawdong Waterfall',
      mapQuery: 'Wei Sawdong Waterfall, Meghalaya',
      personalMatch: {
        matchLevel: 'great_match',
        reason: 'Offbeat, no crowds',
      },
    });
    expect(result.activity).toBe('Wei Sawdong Waterfall');
    expect(result.personalMatch?.matchLevel).toBe('great_match');
  });

  it('parses suggestion without personalMatch', () => {
    const result = activitySuggestionSchema.parse({ activity: 'Some place' });
    expect(result.personalMatch).toBeUndefined();
  });
});
