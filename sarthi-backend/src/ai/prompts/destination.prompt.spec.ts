import {
  buildHybridPrompt,
  buildAiFullPrompt,
  buildItineraryPrompt,
  buildFoodGuidePrompt,
  buildTasteProfileBlock,
  buildTrekPrompt,
  computeBmi,
  computeTripDays,
  monthNameFromDate,
  buildSearchContext,
  buildPersonalityBlock,
  buildCorrectionsBlock,
  buildSuggestReplacementPrompt,
} from './destination.prompt';

const baseParams = {
  freeText: 'want something offbeat',
  group: { type: 'friends' },
  budget: { min: 5000, max: 15000 },
  dates: { from: '2025-05-01', to: '2025-05-07' },
  departureCity: 'Mumbai',
};

describe('computeBmi', () => {
  it('computes BMI correctly', () => {
    expect(computeBmi(70, 175)).toBe(22.9);
  });

  it('handles edge cases', () => {
    expect(computeBmi(100, 170)).toBe(34.6);
    expect(computeBmi(45, 150)).toBe(20);
  });
});

describe('buildHybridPrompt', () => {
  const destinations = [
    {
      id: 'uuid-1',
      name: 'Kasol',
      state: 'Himachal Pradesh',
      experienceTypes: ['mountains', 'adventure'],
      isHiddenGem: true,
      weatherSummary: 'Pleasant in May',
      budgetMin: 700,
      budgetMax: 1200,
    },
  ];

  it('returns system and user keys', () => {
    const prompt = buildHybridPrompt({ ...baseParams, destinations });
    expect(prompt).toHaveProperty('system');
    expect(prompt).toHaveProperty('user');
  });

  it('system prompt mentions health and fitness assessment', () => {
    const { system } = buildHybridPrompt({ ...baseParams, destinations });
    expect(system).toContain('health and fitness suitability');
  });

  it('user prompt contains traveler free text', () => {
    const { user } = buildHybridPrompt({ ...baseParams, destinations });
    expect(user).toContain('want something offbeat');
  });

  it('user prompt contains group, budget, dates, departure city', () => {
    const { user } = buildHybridPrompt({ ...baseParams, destinations });
    expect(user).toContain('friends');
    expect(user).toContain('₹5000–15000');
    expect(user).toContain('2025-05-01');
    expect(user).toContain('Mumbai');
  });

  it('user prompt contains destination IDs and names', () => {
    const { user } = buildHybridPrompt({ ...baseParams, destinations });
    expect(user).toContain('uuid-1');
    expect(user).toContain('Kasol');
  });

  it('user prompt requests max 5 results', () => {
    const { user } = buildHybridPrompt({ ...baseParams, destinations });
    expect(user).toContain('Max 5 results');
  });

  it('user prompt includes healthAdvisory format', () => {
    const { user } = buildHybridPrompt({ ...baseParams, destinations });
    expect(user).toContain('healthAdvisory');
    expect(user).toContain('suitability');
    expect(user).toContain('altitude');
    expect(user).toContain('prepTips');
  });

  it('includes BMI when weight and height provided', () => {
    const { user } = buildHybridPrompt({
      ...baseParams,
      destinations,
      weight: 70,
      height: 175,
    });
    expect(user).toContain('BMI: 22.9');
    expect(user).toContain('70kg');
    expect(user).toContain('175cm');
  });

  it('includes age and gender when provided', () => {
    const { user } = buildHybridPrompt({
      ...baseParams,
      destinations,
      gender: 'female',
      age: 35,
    });
    expect(user).toContain('Gender: female');
    expect(user).toContain('Age: 35');
  });

  it('includes medical conditions when provided', () => {
    const { user } = buildHybridPrompt({
      ...baseParams,
      destinations,
      medicalConditions: ['asthma', 'knee_issue'],
    });
    expect(user).toContain('Medical conditions: asthma, knee_issue');
  });

  it('omits health profile line when no health data provided', () => {
    const { user } = buildHybridPrompt({ ...baseParams, destinations });
    expect(user).not.toContain('Traveler health profile');
  });

  it('user prompt includes costBreakdown format', () => {
    const { user } = buildHybridPrompt({ ...baseParams, destinations });
    expect(user).toContain('costBreakdown');
    expect(user).toContain('transport');
    expect(user).toContain('total');
  });

  it('user prompt includes permits format', () => {
    const { user } = buildHybridPrompt({ ...baseParams, destinations });
    expect(user).toContain('permits');
    expect(user).toContain('required');
    expect(user).toContain('documents');
  });

  it('user prompt includes tripReadiness format', () => {
    const { user } = buildHybridPrompt({ ...baseParams, destinations });
    expect(user).toContain('tripReadiness');
    expect(user).toContain('score');
    expect(user).toContain('actionItems');
  });

  it('includes the Context block with Rules', () => {
    const { user } = buildHybridPrompt({
      freeText: 'weekend escape',
      group: { type: 'couple' },
      budget: { min: 5000, max: 10000 },
      dates: { from: '2026-04-17', to: '2026-04-19' },
      departureCity: 'Ahmedabad',
      destinations: [
        {
          id: 'uuid-1',
          name: 'Kasol',
          state: 'HP',
          experienceTypes: ['mountains'],
          isHiddenGem: true,
          weatherSummary: 'Cool',
          budgetMin: 700,
          budgetMax: 1200,
        },
      ],
    });
    expect(user).toContain('## Context');
    expect(user).toContain('## Rules');
    expect(user).toContain('Trip length: 3 days');
    expect(user).toContain('Travel month: April');
    expect(user).toContain('Departure city: Ahmedabad');
    expect(user).toContain('Nearby gems:');
  });

  it('includes Hidden gems ONLY rule when hiddenGem is true', () => {
    const { user } = buildHybridPrompt({
      freeText: 'offbeat trip',
      group: { type: 'couple' },
      budget: { min: 5000, max: 10000 },
      dates: { from: '2026-04-17', to: '2026-04-19' },
      departureCity: 'Ahmedabad',
      hiddenGem: true,
      destinations: [
        {
          id: 'uuid-1',
          name: 'Polo Forest',
          state: 'Gujarat',
          experienceTypes: ['nature'],
          isHiddenGem: true,
          weatherSummary: 'Mild',
          budgetMin: 1500,
          budgetMax: 3000,
        },
      ],
    });
    expect(user).toContain('Hidden gems ONLY:');
    expect(user).not.toContain('Nearby gems:');
  });

  it('plan mode returns prompt for specified destination', () => {
    const { system, user } = buildHybridPrompt({
      ...baseParams,
      mode: 'plan',
      destination: 'Goa',
      destinations: [],
    });
    expect(system).toBe('You are a travel recommendation engine for Indian destinations. You also assess health and fitness suitability for each destination based on the traveler\'s profile.');
    expect(user).toContain('User has chosen a destination for trip planning');
    expect(user).toContain('Goa');
    expect(user).toContain('Provide detailed information about Goa');
    expect(user).toContain('destinations');
  });

  it('plan mode ignores destination list and focuses on user choice', () => {
    const { user } = buildHybridPrompt({
      ...baseParams,
      mode: 'plan',
      destination: 'Himalayas',
      destinations: [
        {
          id: 'uuid-1',
          name: 'Kasol',
          state: 'HP',
          experienceTypes: ['mountains'],
          isHiddenGem: true,
          weatherSummary: 'Cool',
          budgetMin: 700,
          budgetMax: 1200,
        },
      ],
    });
    // Should focus on Himalayas, not the destinations list
    expect(user).toContain('Himalayas');
    expect(user).not.toContain('Kasol');
    expect(user).not.toContain('rankings');
  });
});

describe('buildAiFullPrompt', () => {
  it('returns system and user keys', () => {
    const prompt = buildAiFullPrompt(baseParams);
    expect(prompt).toHaveProperty('system');
    expect(prompt).toHaveProperty('user');
  });

  it('asks to recommend up to 3 destinations (slim free-model format)', () => {
    const { user } = buildAiFullPrompt(baseParams);
    expect(user).toContain('up to 3');
  });

  it('includes departure city', () => {
    const { user } = buildAiFullPrompt(baseParams);
    expect(user).toContain('Mumbai');
  });

  it('user prompt includes healthAdvisory format', () => {
    const { user } = buildAiFullPrompt(baseParams);
    expect(user).toContain('healthAdvisory');
    expect(user).toContain('suitability');
  });

  it('includes full health profile when all fields provided', () => {
    const { user } = buildAiFullPrompt({
      ...baseParams,
      gender: 'male',
      age: 45,
      weight: 90,
      height: 170,
      medicalConditions: ['heart_condition'],
    });
    expect(user).toContain('Gender: male');
    expect(user).toContain('Age: 45');
    expect(user).toContain('BMI: 31.1');
    expect(user).toContain('Medical conditions: heart_condition');
  });

  it('omits health profile line when no health data provided', () => {
    const { user } = buildAiFullPrompt(baseParams);
    expect(user).not.toContain('Traveler health profile');
  });

  // Slim free-model format uses suitability+readinessScore instead of full sub-schemas.
  // costBreakdown, permits and tripReadiness are in the PAID MODEL format (commented out in prompt).
  it('user prompt includes slim suitability field (free-model format)', () => {
    const { user } = buildAiFullPrompt(baseParams);
    expect(user).toContain('suitability');
    expect(user).toContain('readinessScore');
  });

  it('includes the Context block with Rules', () => {
    const { user } = buildAiFullPrompt({
      freeText: 'weekend escape',
      group: { type: 'couple' },
      budget: { min: 5000, max: 10000 },
      dates: { from: '2026-04-17', to: '2026-04-19' },
      departureCity: 'Ahmedabad',
    });
    expect(user).toContain('## Context');
    expect(user).toContain('## Rules');
    expect(user).toContain('Trip length: 3 days');
    expect(user).toContain('Travel month: April');
    expect(user).toContain('Departure city: Ahmedabad');
    expect(user).toContain('Nearby gems:');
  });

  it('includes Hidden gems ONLY rule when hiddenGem is true', () => {
    const { user } = buildAiFullPrompt({
      freeText: 'offbeat trip',
      group: { type: 'couple' },
      budget: { min: 5000, max: 10000 },
      dates: { from: '2026-04-17', to: '2026-04-19' },
      departureCity: 'Ahmedabad',
      hiddenGem: true,
    });
    expect(user).toContain('Hidden gems ONLY:');
    expect(user).not.toContain('Nearby gems:');
  });

  it('plan mode returns prompt for specified destination', () => {
    const { system, user } = buildAiFullPrompt({
      freeText: 'mountain adventure',
      mode: 'plan',
      destination: 'Himalayas',
      group: { type: 'friends' },
      budget: { min: 5000, max: 15000 },
      dates: { from: '2026-06-01', to: '2026-06-10' },
      departureCity: 'Delhi',
    });
    expect(system).toBe('You are a travel recommendation engine for Indian destinations. You also assess health and fitness suitability for each destination based on the traveler\'s profile.');
    expect(user).toContain('User has chosen a destination for trip planning');
    expect(user).toContain('Himalayas');
    expect(user).toContain('Provide detailed information about Himalayas');
    expect(user).toContain('destinations');
  });

  it('plan mode uses health context from profile', () => {
    const { user } = buildAiFullPrompt({
      freeText: 'mountain trek',
      mode: 'plan',
      destination: 'Ladakh',
      group: { type: 'solo' },
      budget: { min: 3000, max: 8000 },
      dates: { from: '2026-07-01', to: '2026-07-15' },
      departureCity: 'New Delhi',
      age: 45,
      weight: 75,
      height: 170,
    });
    // Should include health context in plan mode
    expect(user).toContain('Age: 45');
    expect(user).toContain('75kg');
    expect(user).toContain('170cm');
  });
});

describe('buildItineraryPrompt', () => {
  const itineraryParams = {
    destination: 'Goa',
    state: 'Goa',
    dates: { from: '2026-11-15', to: '2026-11-18' },
    budget: { min: 5000, max: 20000 },
    group: { type: 'couple' },
    departureCity: 'Mumbai',
    freeText: 'relaxing beach vacation',
  };

  it('returns system and user keys', () => {
    const prompt = buildItineraryPrompt(itineraryParams);
    expect(prompt).toHaveProperty('system');
    expect(prompt).toHaveProperty('user');
  });

  it('contains destination name', () => {
    const { user } = buildItineraryPrompt(itineraryParams);
    expect(user).toContain('Goa');
  });

  it('contains date range', () => {
    const { user } = buildItineraryPrompt(itineraryParams);
    expect(user).toContain('2026-11-15');
    expect(user).toContain('2026-11-18');
  });

  it('contains itinerary JSON format', () => {
    const { user } = buildItineraryPrompt(itineraryParams);
    expect(user).toContain('itinerary');
    expect(user).toContain('activities');
    expect(user).toContain('packingList');
  });

  it('includes health profile when provided', () => {
    const { user } = buildItineraryPrompt({
      ...itineraryParams,
      age: 45,
      weight: 90,
      height: 170,
      medicalConditions: ['knee_issue'],
    });
    expect(user).toContain('BMI');
    expect(user).toContain('knee_issue');
  });

  it('computes number of days correctly', () => {
    const { user } = buildItineraryPrompt(itineraryParams);
    // 2026-11-15 to 2026-11-18 = 4 days
    expect(user).toContain('4-day itinerary');
  });

  it('includes travel mode line when travelMode provided', () => {
    const { user } = buildItineraryPrompt({
      ...itineraryParams,
      travelMode: 'train',
    });
    expect(user).toContain('arriving by train');
  });

  it('omits travel mode line when travelMode is undefined', () => {
    const { user } = buildItineraryPrompt(itineraryParams);
    expect(user).not.toContain('arriving by');
  });

  it('works with all travel mode values', () => {
    for (const mode of ['train', 'flight', 'bus', 'car']) {
      const { user } = buildItineraryPrompt({
        ...itineraryParams,
        travelMode: mode,
      });
      expect(user).toContain(`arriving by ${mode}`);
    }
  });
});

describe('buildFoodGuidePrompt', () => {
  const foodParams = {
    destination: 'Jaipur',
    state: 'Rajasthan',
    dates: { from: '2026-11-15', to: '2026-11-18' },
    group: { type: 'couple' },
    departureCity: 'Mumbai',
    freeText: 'love spicy food',
    dietType: 'non-veg',
    spiceTolerance: 'high',
    foodBudget: 'moderate',
  };

  it('returns system and user keys', () => {
    const prompt = buildFoodGuidePrompt(foodParams);
    expect(prompt).toHaveProperty('system');
    expect(prompt).toHaveProperty('user');
  });

  it('contains destination', () => {
    const { user } = buildFoodGuidePrompt(foodParams);
    expect(user).toContain('Jaipur');
  });

  it('contains meat preferences when provided', () => {
    const { user } = buildFoodGuidePrompt({
      ...foodParams,
      meatPreferences: ['chicken', 'mutton'],
    });
    expect(user).toContain('Meat preferences: chicken, mutton');
  });

  it('contains spice tolerance', () => {
    const { user } = buildFoodGuidePrompt(foodParams);
    expect(user).toContain('high');
  });

  it('contains food budget', () => {
    const { user } = buildFoodGuidePrompt(foodParams);
    expect(user).toContain('moderate');
  });

  it('includes health profile for dietary awareness', () => {
    const { user } = buildFoodGuidePrompt({
      ...foodParams,
      age: 45,
      medicalConditions: ['diabetes'],
    });
    expect(user).toContain('diabetes');
  });

  it('contains food guide JSON format', () => {
    const { user } = buildFoodGuidePrompt(foodParams);
    expect(user).toContain('mustTryDishes');
    expect(user).toContain('mealPlan');
    expect(user).toContain('streetFood');
    expect(user).toContain('dietaryInfo');
  });

  it('omits diet preferences when not provided', () => {
    const minParams = { ...foodParams };
    delete (minParams as any).dietType;
    delete (minParams as any).spiceTolerance;
    delete (minParams as any).foodBudget;
    const { user } = buildFoodGuidePrompt(minParams);
    expect(user).not.toContain('Food preferences:');
  });
});

describe('buildTrekPrompt', () => {
  const trekParams = {
    freeText: 'challenging high altitude trek with snow',
    group: { type: 'friends' },
    budget: { min: 5000, max: 25000 },
    dates: { from: '2026-06-01', to: '2026-06-08' },
    departureCity: 'Delhi',
    treks: [
      {
        name: 'Hampta Pass',
        region: 'Kullu, Himachal Pradesh',
        state: 'Himachal Pradesh',
        baseCamp: 'Jobra (near Manali)',
        peakAltitude: 4270,
        difficulty: 'moderate',
        durationDays: 5,
        bestMonths: [6, 7, 8, 9],
        terrain: ['snow', 'meadows', 'river_crossing'],
        highlights: ['Lahaul Valley views', 'Chandratal Lake'],
        nearestCity: 'Manali',
        permits: true,
        fitnessDemand: 'Walk 6-8 hours daily',
      },
    ],
  };

  it('returns system and user keys', () => {
    const prompt = buildTrekPrompt(trekParams);
    expect(prompt).toHaveProperty('system');
    expect(prompt).toHaveProperty('user');
  });

  it('system prompt mentions trekking expert', () => {
    const { system } = buildTrekPrompt(trekParams);
    expect(system).toContain('trek');
  });

  it('user prompt contains trek names', () => {
    const { user } = buildTrekPrompt(trekParams);
    expect(user).toContain('Hampta Pass');
  });

  it('user prompt contains trek details (altitude, difficulty, duration)', () => {
    const { user } = buildTrekPrompt(trekParams);
    expect(user).toContain('4270m');
    expect(user).toContain('moderate');
    expect(user).toContain('5 days');
  });

  it('user prompt contains JSON format with trek-specific fields', () => {
    const { user } = buildTrekPrompt(trekParams);
    expect(user).toContain('treks');
    expect(user).toContain('baseCamp');
    expect(user).toContain('peakAltitude');
    expect(user).toContain('durationDays');
    expect(user).toContain('terrain');
  });

  it('includes health context when health profile provided', () => {
    const { user } = buildTrekPrompt({
      ...trekParams,
      age: 45,
      weight: 90,
      height: 170,
      medicalConditions: ['knee_issue'],
    });
    expect(user).toContain('BMI');
    expect(user).toContain('knee_issue');
  });

  it('user prompt contains traveler freeText', () => {
    const { user } = buildTrekPrompt(trekParams);
    expect(user).toContain('challenging high altitude trek with snow');
  });

  it('includes the Context block with trek-mode Rules (no Nearby gems, softer Season)', () => {
    const { user } = buildTrekPrompt(trekParams);
    expect(user).toContain('## Context');
    expect(user).toContain('## Rules');
    expect(user).toContain('Trip length: 8 days');
    expect(user).toContain('Travel month: June');
    expect(user).toContain('Departure city: Delhi');
    expect(user).not.toContain('Nearby gems:');
    expect(user).toContain('borderline');
  });
});

describe('computeTripDays', () => {
  it('returns 1 for same-day range', () => {
    expect(computeTripDays({ from: '2026-06-01', to: '2026-06-01' })).toBe(1);
  });

  it('returns 3 for a 2-day span', () => {
    expect(computeTripDays({ from: '2026-06-01', to: '2026-06-03' })).toBe(3);
  });

  it('counts correctly across month boundaries', () => {
    expect(computeTripDays({ from: '2026-05-30', to: '2026-06-02' })).toBe(4);
  });

  it('counts correctly across leap-day boundary', () => {
    expect(computeTripDays({ from: '2024-02-28', to: '2024-03-01' })).toBe(3);
  });
});

describe('monthNameFromDate', () => {
  it('returns January for a January date', () => {
    expect(monthNameFromDate('2026-01-15')).toBe('January');
  });

  it('returns April for an April date', () => {
    expect(monthNameFromDate('2026-04-17')).toBe('April');
  });

  it('returns December for a December date', () => {
    expect(monthNameFromDate('2026-12-31')).toBe('December');
  });

  it('throws on invalid date string', () => {
    expect(() => monthNameFromDate('not-a-date')).toThrow();
  });
});

describe('buildSearchContext', () => {
  const baseParams = {
    dates: { from: '2026-04-17', to: '2026-04-19' },
    group: { type: 'friends' },
    budget: { min: 5000, max: 6000 },
    departureCity: 'Ahmedabad',
  };

  it('contains trip length', () => {
    const ctx = buildSearchContext(baseParams);
    expect(ctx).toContain('Trip length: 3 days');
  });

  it('contains travel month name', () => {
    const ctx = buildSearchContext(baseParams);
    expect(ctx).toContain('Travel month: April');
  });

  it('contains departure city', () => {
    const ctx = buildSearchContext(baseParams);
    expect(ctx).toContain('Departure city: Ahmedabad');
  });

  it('contains group type and hint', () => {
    const ctx = buildSearchContext(baseParams);
    expect(ctx).toContain('friends');
    expect(ctx).toContain(
      'nightlife, adventure activities, and shared experiences',
    );
  });

  it('uses couple hint for couple group type', () => {
    const ctx = buildSearchContext({
      ...baseParams,
      group: { type: 'couple' },
    });
    expect(ctx).toContain('romantic, scenic stays');
  });

  it('uses family hint for family group type', () => {
    const ctx = buildSearchContext({
      ...baseParams,
      group: { type: 'family' },
    });
    expect(ctx).toContain('kid-friendly');
  });

  it('uses solo hint for solo group type', () => {
    const ctx = buildSearchContext({
      ...baseParams,
      group: { type: 'solo' },
    });
    expect(ctx).toContain('safe, social destinations');
  });

  it('falls back to generic hint for unknown group type', () => {
    const ctx = buildSearchContext({
      ...baseParams,
      group: { type: 'mystery' },
    });
    expect(ctx).toContain("tailor to the group's vibe");
  });

  it('contains budget range', () => {
    const ctx = buildSearchContext(baseParams);
    expect(ctx).toContain('₹5000–6000/person');
  });

  it('contains each rule heading in destination mode', () => {
    const ctx = buildSearchContext(baseParams);
    expect(ctx).toContain('Proximity:');
    expect(ctx).toContain('Season:');
    expect(ctx).toContain('Group-fit:');
    expect(ctx).toContain('Budget:');
    expect(ctx).toContain('Nearby gems:');
  });

  it('omits Nearby gems rule in trek mode', () => {
    const ctx = buildSearchContext(baseParams, { mode: 'trek' });
    expect(ctx).not.toContain('Nearby gems:');
  });

  it('uses softer Season rule in trek mode', () => {
    const ctx = buildSearchContext(baseParams, { mode: 'trek' });
    expect(ctx).toContain('borderline');
  });

  it('contains "## Context" and "## Rules" headings', () => {
    const ctx = buildSearchContext(baseParams);
    expect(ctx).toContain('## Context');
    expect(ctx).toContain('## Rules');
  });

  it('contains "Hidden gems ONLY:" rule when hiddenGem is true', () => {
    const ctx = buildSearchContext({ ...baseParams, hiddenGem: true });
    expect(ctx).toContain('Hidden gems ONLY:');
  });

  it('does not contain "Nearby gems:" rule when hiddenGem is true', () => {
    const ctx = buildSearchContext({ ...baseParams, hiddenGem: true });
    expect(ctx).not.toContain('Nearby gems:');
  });

  it('contains "Nearby gems:" rule when hiddenGem is false', () => {
    const ctx = buildSearchContext({ ...baseParams, hiddenGem: false });
    expect(ctx).toContain('Nearby gems:');
    expect(ctx).not.toContain('Hidden gems ONLY:');
  });

  it('contains "Nearby gems:" rule when hiddenGem is undefined (default)', () => {
    const ctx = buildSearchContext(baseParams);
    expect(ctx).toContain('Nearby gems:');
    expect(ctx).not.toContain('Hidden gems ONLY:');
  });

  it('does not add Hidden gems rule in trek mode even when hiddenGem is true', () => {
    const ctx = buildSearchContext(
      { ...baseParams, hiddenGem: true },
      { mode: 'trek' },
    );
    expect(ctx).not.toContain('Hidden gems ONLY:');
    expect(ctx).not.toContain('Nearby gems:');
  });
});

describe('buildTasteProfileBlock', () => {
  it('returns empty string when no taste-profile fields provided', () => {
    const result = buildTasteProfileBlock({
      destination: 'Goa',
      state: 'Goa',
      freeText: 'trip',
      group: { type: 'couple' },
      dates: { from: '2026-05-01', to: '2026-05-05' },
      departureCity: 'Mumbai',
    });
    expect(result).toBe('');
  });

  it('includes Cuisines line when cuisinePreferences provided', () => {
    const result = buildTasteProfileBlock({
      destination: 'Goa',
      state: 'Goa',
      freeText: 'trip',
      group: { type: 'couple' },
      dates: { from: '2026-05-01', to: '2026-05-05' },
      departureCity: 'Mumbai',
      cuisinePreferences: ['Konkani', 'Goan'],
    });
    expect(result).toContain('Cuisines: Konkani, Goan');
  });

  it('includes Cooking styles line when cookingStyles provided', () => {
    const result = buildTasteProfileBlock({
      destination: 'Goa',
      state: 'Goa',
      freeText: 'trip',
      group: { type: 'couple' },
      dates: { from: '2026-05-01', to: '2026-05-05' },
      departureCity: 'Mumbai',
      cookingStyles: ['grilled', 'steamed'],
    });
    expect(result).toContain('Cooking styles: grilled, steamed');
  });

  it('includes Flavors line when flavorPreferences provided', () => {
    const result = buildTasteProfileBlock({
      destination: 'Goa',
      state: 'Goa',
      freeText: 'trip',
      group: { type: 'couple' },
      dates: { from: '2026-05-01', to: '2026-05-05' },
      departureCity: 'Mumbai',
      flavorPreferences: ['tangy', 'spicy'],
    });
    expect(result).toContain('Flavors: tangy, spicy');
  });

  it('includes Adventurousness line when provided', () => {
    const result = buildTasteProfileBlock({
      destination: 'Goa',
      state: 'Goa',
      freeText: 'trip',
      group: { type: 'couple' },
      dates: { from: '2026-05-01', to: '2026-05-05' },
      departureCity: 'Mumbai',
      adventurousness: 'very_adventurous',
    });
    expect(result).toContain('Adventurousness: very_adventurous');
  });

  it('includes Favorite dishes line when provided', () => {
    const result = buildTasteProfileBlock({
      destination: 'Goa',
      state: 'Goa',
      freeText: 'trip',
      group: { type: 'couple' },
      dates: { from: '2026-05-01', to: '2026-05-05' },
      departureCity: 'Mumbai',
      favoriteDishes: 'fish curry, solkadhi',
    });
    expect(result).toContain('Favorite dishes: fish curry, solkadhi');
  });

  it('includes Meat preferences line when provided', () => {
    const result = buildTasteProfileBlock({
      destination: 'Goa',
      state: 'Goa',
      freeText: 'trip',
      group: { type: 'couple' },
      dates: { from: '2026-05-01', to: '2026-05-05' },
      departureCity: 'Mumbai',
      meatPreferences: ['fish', 'chicken'],
    });
    expect(result).toContain('Meat preferences: fish, chicken');
  });
});

describe('buildFoodGuidePrompt — rules section', () => {
  it('user text always includes allergens rule', () => {
    const { user } = buildFoodGuidePrompt({
      destination: 'Goa',
      state: 'Goa',
      freeText: 'trip',
      group: { type: 'couple' },
      dates: { from: '2026-05-01', to: '2026-05-05' },
      departureCity: 'Mumbai',
    });
    expect(user).toContain('allergens');
  });

  // tasteProfile is in the PAID MODEL format (commented out in prompt).
  // Slim free-model format uses allergens only (no tasteProfile per dish).
  it('user text includes allergens rule (slim free-model format)', () => {
    const { user } = buildFoodGuidePrompt({
      destination: 'Goa',
      state: 'Goa',
      freeText: 'trip',
      group: { type: 'couple' },
      dates: { from: '2026-05-01', to: '2026-05-05' },
      departureCity: 'Mumbai',
    });
    expect(user).toContain('allergens');
  });

  it('user text includes Taste Profile block when cuisinePreferences provided', () => {
    const { user } = buildFoodGuidePrompt({
      destination: 'Goa',
      state: 'Goa',
      freeText: 'trip',
      group: { type: 'couple' },
      dates: { from: '2026-05-01', to: '2026-05-05' },
      departureCity: 'Mumbai',
      cuisinePreferences: ['Konkani'],
    });
    expect(user).toContain('## Taste Profile');
    expect(user).toContain('Cuisines: Konkani');
  });
});

describe('buildPersonalityBlock', () => {
  it('returns empty string when profile is null', () => {
    expect(buildPersonalityBlock(null)).toBe('');
  });

  it('returns empty string when profile has no dimensions set', () => {
    expect(
      buildPersonalityBlock({ travelPace: null, completeness: 0 } as any),
    ).toBe('');
  });

  it('includes filled dimensions', () => {
    const block = buildPersonalityBlock({
      travelPace: 'loose',
      comfortLevel: 'homestay',
      crowdTolerance: 'avoid',
      travelMotivations: ['nature', 'culture'],
      completeness: 44,
    } as any);
    expect(block).toContain('## Traveler Personality');
    expect(block).toContain('Pace: loose');
    expect(block).toContain('Comfort: homestay');
    expect(block).toContain('Crowds: avoid');
    expect(block).toContain('Motivations: nature, culture');
  });

  it('omits dimensions that are null/undefined', () => {
    const block = buildPersonalityBlock({
      travelPace: 'packed',
      completeness: 11,
    } as any);
    expect(block).not.toContain('Comfort:');
    expect(block).not.toContain('Crowds:');
  });

  it('includes personalMatch instruction', () => {
    const block = buildPersonalityBlock({
      travelPace: 'loose',
      completeness: 11,
    } as any);
    expect(block).toContain('personalMatch');
    expect(block).toContain('matchLevel');
  });
});

describe('buildCorrectionsBlock', () => {
  it('returns empty string for empty corrections array', () => {
    expect(buildCorrectionsBlock([])).toBe('');
  });

  it('returns empty string for null', () => {
    expect(buildCorrectionsBlock(null as any)).toBe('');
  });

  it('includes corrections summary heading', () => {
    const block = buildCorrectionsBlock([
      {
        type: 'thumbs_down',
        context: { place: 'Elephant Falls', reason: 'touristy' },
      },
    ] as any);
    expect(block).toContain('## Past Preferences');
    expect(block).toContain('thumbs_down');
  });
});

describe('buildItineraryPrompt — mapQuery', () => {
  const itineraryParams = {
    destination: 'Cherrapunji',
    state: 'Meghalaya',
    freeText: 'want to see waterfalls',
    group: { type: 'couple' },
    budget: { min: 8000, max: 20000 },
    dates: { from: '2026-07-10', to: '2026-07-13' },
    departureCity: 'Kolkata',
  };

  it('includes mapQuery in the itinerary activity format', () => {
    const { user } = buildItineraryPrompt(itineraryParams);
    expect(user).toContain('mapQuery');
  });
});

describe('buildFoodGuidePrompt — mapQuery', () => {
  const foodParams = {
    destination: 'Shillong',
    state: 'Meghalaya',
    freeText: 'love local food',
    group: { type: 'couple' },
    dates: { from: '2026-07-10', to: '2026-07-13' },
    departureCity: 'Kolkata',
  };

  it('includes mapQuery in must-try dish format', () => {
    const { user } = buildFoodGuidePrompt(foodParams);
    expect(user).toContain('mapQuery');
  });
});

describe('buildSuggestReplacementPrompt', () => {
  it('returns system and user keys', () => {
    const prompt = buildSuggestReplacementPrompt({
      destination: 'Cherrapunji',
      state: 'Meghalaya',
      day: 2,
      currentActivity: { time: '09:00 AM', activity: 'Crowded waterfall tour' },
      dayActivities: [
        '09:00 AM: Crowded waterfall tour',
        '02:00 PM: Local market',
      ],
    });
    expect(prompt).toHaveProperty('system');
    expect(prompt).toHaveProperty('user');
  });

  it('user prompt contains the activity being replaced', () => {
    const prompt = buildSuggestReplacementPrompt({
      destination: 'Cherrapunji',
      state: 'Meghalaya',
      day: 2,
      currentActivity: { time: '09:00 AM', activity: 'Crowded waterfall tour' },
      dayActivities: [],
    });
    expect(prompt.user).toContain('Crowded waterfall tour');
    expect(prompt.user).toContain('Day 2');
  });

  it('includes personality and corrections blocks when provided', () => {
    const { user } = buildSuggestReplacementPrompt({
      destination: 'Cherrapunji',
      state: 'Meghalaya',
      day: 1,
      currentActivity: { time: '10:00 AM', activity: 'Touristy spot' },
      dayActivities: [],
      profile: { travelPace: 'loose', completeness: 11 },
      corrections: [{ type: 'thumbs_down', context: { place: 'Dawki' } }],
    });
    expect(user).toContain('Traveler Personality');
    expect(user).toContain('Past Preferences');
  });
});
