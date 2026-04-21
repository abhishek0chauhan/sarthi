# Search Enrichment + Itinerary + Food Guide Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Enrich the `/search` response with costBreakdown, permits, and tripReadiness. Add two new endpoints: `/itinerary` for day-wise trip planning and `/food-guide` for personalized food recommendations — all health-aware.

**Architecture:** All three endpoints share the same `DestinationFinderModule`, `AiService`, `CacheService`, and `FirebaseAuthGuard`. Each gets its own DTO, Zod schema, prompt builder, and service method. The AI model (`google/gemma-3n-e4b-it` via NVIDIA) does not support native JSON schema enforcement, so prompts must include explicit format instructions.

**Tech Stack:** NestJS v11, Vercel AI SDK (`ai` + `@ai-sdk/openai-compatible`), Zod v4, Prisma v5, ioredis, Firebase Auth, Jest 30

**Important:** Skip all git operations (no git init, add, commit). User controls commits.

---

## File Map

| File | Action | Responsibility |
|---|---|---|
| `src/ai/schemas/destination.schema.ts` | Modify | Add costBreakdown, permits, tripReadiness to existing schemas; add itinerary + food-guide schemas |
| `src/ai/prompts/destination.prompt.ts` | Modify | Add costBreakdown/permits/tripReadiness to search prompts; add itinerary + food-guide prompt builders |
| `src/ai/ai.service.ts` | Modify | Add `generateItinerary()` and `generateFoodGuide()` methods |
| `src/destination-finder/dto/search-destinations.dto.ts` | Modify | Add `dietType`, `spiceTolerance`, `foodBudget`, `allergies` optional fields |
| `src/destination-finder/dto/itinerary.dto.ts` | Create | DTO for itinerary request |
| `src/destination-finder/dto/food-guide.dto.ts` | Create | DTO for food-guide request |
| `src/destination-finder/destination-finder.service.ts` | Modify | Add `itinerary()` and `foodGuide()` methods |
| `src/destination-finder/destination-finder.controller.ts` | Modify | Add `POST /itinerary` and `POST /food-guide` routes |
| `src/ai/schemas/destination.schema.spec.ts` | Modify | Tests for new schemas |
| `src/ai/prompts/destination.prompt.spec.ts` | Modify | Tests for new prompt builders |
| `src/ai/ai.service.spec.ts` | Modify | Tests for new AI methods |
| `src/destination-finder/destination-finder.controller.spec.ts` | Modify | Tests for new controller routes |
| `src/destination-finder/destination-finder.service.spec.ts` | Modify | Tests for new service methods |

---

### Task 1: Enrich search Zod schemas (costBreakdown, permits, tripReadiness)

**Files:**
- Modify: `src/ai/schemas/destination.schema.ts`
- Modify: `src/ai/schemas/destination.schema.spec.ts`

- [ ] **Step 1: Write failing tests for new schemas**

In `src/ai/schemas/destination.schema.spec.ts`, add tests at the end of the file:

```typescript
import {
  rankResultSchema,
  generateResultSchema,
  healthAdvisorySchema,
  costBreakdownSchema,
  permitsSchema,
  tripReadinessSchema,
} from './destination.schema';

// ... keep all existing tests, then add:

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
});
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `npx jest src/ai/schemas/destination.schema.spec.ts`
Expected: FAIL — `costBreakdownSchema`, `permitsSchema`, `tripReadinessSchema` not exported

- [ ] **Step 3: Add new schemas to destination.schema.ts**

In `src/ai/schemas/destination.schema.ts`, add after `healthAdvisorySchema` and before `rankResultSchema`:

```typescript
export const costBreakdownSchema = z.object({
  transport: z.string(),
  stay: z.string(),
  food: z.string(),
  activities: z.string(),
  total: z.string(),
});

export const permitsSchema = z.object({
  required: z.boolean(),
  documents: z.array(z.string()),
  notes: z.string(),
});

export const tripReadinessSchema = z.object({
  score: z.number().min(0).max(100),
  label: z.string(),
  fitness: z.string(),
  weather: z.string(),
  documents: z.string(),
  budget: z.string(),
  actionItems: z.array(z.string()),
});
```

Then add these fields to `rankResultSchema`:

```typescript
export const rankResultSchema = z.object({
  id: z.string(),
  whyItMatches: z.string(),
  healthAdvisory: healthAdvisorySchema,
  costBreakdown: costBreakdownSchema,
  permits: permitsSchema,
  tripReadiness: tripReadinessSchema,
});
```

And to `generateResultSchema`:

```typescript
export const generateResultSchema = z.object({
  name: z.string(),
  state: z.string(),
  isHiddenGem: z.boolean(),
  budgetEstimate: z.string(),
  weatherSnapshot: z.string(),
  travelTime: z.string(),
  highlights: z.array(z.string()),
  whyItMatches: z.string(),
  healthAdvisory: healthAdvisorySchema,
  costBreakdown: costBreakdownSchema,
  permits: permitsSchema,
  tripReadiness: tripReadinessSchema,
});
```

Add type exports at the bottom:

```typescript
export type CostBreakdown = z.infer<typeof costBreakdownSchema>;
export type Permits = z.infer<typeof permitsSchema>;
export type TripReadiness = z.infer<typeof tripReadinessSchema>;
```

- [ ] **Step 4: Update existing schema tests to include new required fields**

In the existing `rankResultSchema` and `generateResultSchema` tests in the same file, add the new fields to all test inputs that construct these objects. For example, the `rankResultSchema` valid input becomes:

```typescript
const input = {
  id: 'uuid-1',
  whyItMatches: 'Great for trekking',
  healthAdvisory: validAdvisory,
  costBreakdown: validCostBreakdown,
  permits: validPermits,
  tripReadiness: validTripReadiness,
};
```

And the `generateResultSchema` valid input adds the same three fields.

- [ ] **Step 5: Run tests to verify they pass**

Run: `npx jest src/ai/schemas/destination.schema.spec.ts`
Expected: ALL PASS

---

### Task 2: Update search prompts with costBreakdown, permits, tripReadiness

**Files:**
- Modify: `src/ai/prompts/destination.prompt.ts`
- Modify: `src/ai/prompts/destination.prompt.spec.ts`

- [ ] **Step 1: Write failing tests**

In `src/ai/prompts/destination.prompt.spec.ts`, add assertions to existing `buildHybridPrompt` and `buildAiFullPrompt` describe blocks:

```typescript
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
```

Add the same three tests to the `buildAiFullPrompt` describe block.

- [ ] **Step 2: Run tests to verify they fail**

Run: `npx jest src/ai/prompts/destination.prompt.spec.ts`
Expected: FAIL — prompts don't contain the new format strings

- [ ] **Step 3: Update prompt format constants in destination.prompt.ts**

Replace the `HEALTH_ADVISORY_FORMAT` constant and add new format constants after it:

```typescript
const COST_BREAKDOWN_FORMAT = `"costBreakdown":{"transport":"<₹ amount>","stay":"<₹ amount (N nights)>","food":"<₹ amount>","activities":"<₹ amount>","total":"<₹ total>"}`;

const PERMITS_FORMAT = `"permits":{"required":<true/false>,"documents":["<permit name if required>"],"notes":"<how to obtain or empty string>"}`;

const TRIP_READINESS_FORMAT = `"tripReadiness":{"score":<0-100>,"label":"<Ready/Needs Preparation/Not Recommended>","fitness":"<one line>","weather":"<one line>","documents":"<one line>","budget":"<one line>","actionItems":["<action item>"]}`;
```

Update the hybrid prompt JSON format instruction to include all fields:

```typescript
Respond ONLY with a JSON object in exactly this format (no extra text):
{"rankings":[{"id":"<exact id from above>","whyItMatches":"<one sentence>",${HEALTH_ADVISORY_FORMAT},${COST_BREAKDOWN_FORMAT},${PERMITS_FORMAT},${TRIP_READINESS_FORMAT}}]}
```

Update the ai_full prompt JSON format instruction the same way — add `,${COST_BREAKDOWN_FORMAT},${PERMITS_FORMAT},${TRIP_READINESS_FORMAT}` to the destination object format.

- [ ] **Step 4: Run tests to verify they pass**

Run: `npx jest src/ai/prompts/destination.prompt.spec.ts`
Expected: ALL PASS

---

### Task 3: Update AI service tests and destination-finder service for new fields

**Files:**
- Modify: `src/ai/ai.service.spec.ts`
- Modify: `src/destination-finder/destination-finder.service.ts`
- Modify: `src/destination-finder/destination-finder.service.spec.ts`

- [ ] **Step 1: Update AI service test mocks to include new fields**

In `src/ai/ai.service.spec.ts`, update `mockAdvisory` section to add companion mocks:

```typescript
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
```

Then add these three fields to every mock `rankings` and `destinations` object in all test cases. For example:

```typescript
{ id: 'id-1', whyItMatches: 'Great for trekking', healthAdvisory: mockAdvisory, costBreakdown: mockCostBreakdown, permits: mockPermits, tripReadiness: mockTripReadiness }
```

- [ ] **Step 2: Update destination-finder.service.ts to pass new fields through**

In `src/destination-finder/destination-finder.service.ts`, update the hybrid results mapping (around line 80):

```typescript
    const results = ranked.map(({ id, whyItMatches, healthAdvisory, costBreakdown, permits, tripReadiness }) => ({
      ...this.formatDbResult(destinationMap.get(id)!, dto.departureCity),
      whyItMatches,
      healthAdvisory,
      costBreakdown,
      permits,
      tripReadiness,
    }));
```

- [ ] **Step 3: Update destination-finder.service.spec.ts mocks**

Add the same `mockCostBreakdown`, `mockPermits`, `mockTripReadiness` objects and include them in all mock AI return values.

- [ ] **Step 4: Run all tests**

Run: `npx jest`
Expected: ALL PASS

---

### Task 4: Itinerary Zod schema + prompt builder

**Files:**
- Modify: `src/ai/schemas/destination.schema.ts`
- Modify: `src/ai/schemas/destination.schema.spec.ts`
- Modify: `src/ai/prompts/destination.prompt.ts`
- Modify: `src/ai/prompts/destination.prompt.spec.ts`

- [ ] **Step 1: Write failing schema tests**

In `src/ai/schemas/destination.schema.spec.ts`, add at the end:

```typescript
import { itineraryDaySchema, itineraryResponseSchema } from './destination.schema';

const validItineraryDay = {
  day: 1,
  title: 'Arrival + North Goa Beaches',
  activities: [
    { time: '10:00 AM', activity: 'Arrive at Goa airport', cost: '₹0', healthNote: '' },
    { time: '4:00 PM', activity: 'Baga Beach sunset walk', cost: '₹0', healthNote: 'Light walking — no strain' },
  ],
  meals: {
    breakfast: '₹200 — Hotel buffet',
    lunch: '₹300 — Fish thali at local shack',
    dinner: '₹800 — Britto\'s',
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
});
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `npx jest src/ai/schemas/destination.schema.spec.ts`
Expected: FAIL — `itineraryDaySchema`, `itineraryResponseSchema` not exported

- [ ] **Step 3: Add itinerary schemas**

In `src/ai/schemas/destination.schema.ts`, add before the type exports at the bottom:

```typescript
export const itineraryActivitySchema = z.object({
  time: z.string(),
  activity: z.string(),
  cost: z.string(),
  healthNote: z.string(),
});

export const itineraryMealsSchema = z.object({
  breakfast: z.string(),
  lunch: z.string(),
  dinner: z.string(),
});

export const itineraryDaySchema = z.object({
  day: z.number(),
  title: z.string(),
  activities: z.array(itineraryActivitySchema),
  meals: itineraryMealsSchema,
  healthNote: z.string(),
});

export const itineraryResponseSchema = z.object({
  destination: z.string(),
  totalEstimate: z.string(),
  itinerary: z.array(itineraryDaySchema),
  packingList: z.array(z.string()),
  healthAdvisory: healthAdvisorySchema,
  permits: permitsSchema,
});

export const itineraryResponseWrapperSchema = z.object({
  result: itineraryResponseSchema,
});
```

Add type export:

```typescript
export type ItineraryResponse = z.infer<typeof itineraryResponseSchema>;
```

- [ ] **Step 4: Write failing prompt tests**

In `src/ai/prompts/destination.prompt.spec.ts`, add:

```typescript
import { buildItineraryPrompt } from './destination.prompt';

describe('buildItineraryPrompt', () => {
  const itineraryParams = {
    destination: 'Goa',
    state: 'Goa',
    dates: { from: '2026-11-15', to: '2026-11-18' },
    budget: { min: 5000, max: 20000 },
    group: { size: 2, type: 'couple' },
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
});
```

- [ ] **Step 5: Run tests to verify they fail**

Run: `npx jest src/ai/prompts/destination.prompt.spec.ts`
Expected: FAIL — `buildItineraryPrompt` not exported

- [ ] **Step 6: Add itinerary prompt builder**

In `src/ai/prompts/destination.prompt.ts`, add a new exported interface and function:

```typescript
export interface ItineraryParams extends HealthProfile {
  destination: string;
  state: string;
  freeText: string;
  group: { size: number; type: string };
  budget: { min: number; max: number };
  dates: { from: string; to: string };
  departureCity: string;
}

export function buildItineraryPrompt(params: ItineraryParams): { system: string; user: string } {
  const travelerProfile = [
    `Group: ${params.group.size} ${params.group.type}`,
    `Budget: ₹${params.budget.min}–${params.budget.max}/person`,
    `Dates: ${params.dates.from} to ${params.dates.to}`,
    `From: ${params.departureCity}`,
  ].join(' | ');

  const healthContext = buildHealthContext(params);
  const numDays = Math.ceil(
    (new Date(params.dates.to).getTime() - new Date(params.dates.from).getTime()) / 86400000,
  ) + 1;

  return {
    system: 'You are an expert Indian travel itinerary planner. You create detailed day-by-day plans personalized to the traveler\'s health, budget, and interests.',
    user: `Plan a ${numDays}-day itinerary for ${params.destination}, ${params.state}.
Traveler: ${params.freeText}
${travelerProfile}${healthContext}

Create a detailed day-by-day plan with specific activities, timings, meal suggestions with costs, and health notes.

Respond ONLY with a JSON object in exactly this format (no extra text):
{"result":{"destination":"${params.destination}","totalEstimate":"<₹ total for group>","itinerary":[{"day":<number>,"title":"<day theme>","activities":[{"time":"<HH:MM AM/PM>","activity":"<description>","cost":"<₹ amount>","healthNote":"<note or empty>"}],"meals":{"breakfast":"<₹cost — suggestion>","lunch":"<₹cost — suggestion>","dinner":"<₹cost — suggestion>"},"healthNote":"<overall day health note>"}],"packingList":["<item>"],${HEALTH_ADVISORY_FORMAT},${PERMITS_FORMAT}}}`,
  };
}
```

- [ ] **Step 7: Run tests to verify they pass**

Run: `npx jest src/ai/prompts/destination.prompt.spec.ts`
Expected: ALL PASS

---

### Task 5: Food Guide Zod schema + prompt builder

**Files:**
- Modify: `src/ai/schemas/destination.schema.ts`
- Modify: `src/ai/schemas/destination.schema.spec.ts`
- Modify: `src/ai/prompts/destination.prompt.ts`
- Modify: `src/ai/prompts/destination.prompt.spec.ts`

- [ ] **Step 1: Write failing schema tests**

In `src/ai/schemas/destination.schema.spec.ts`, add:

```typescript
import { foodGuideResponseSchema } from './destination.schema';

const validDish = {
  name: 'Laal Maas',
  description: 'Fiery mutton curry with whole red chilies',
  where: 'Handi Restaurant, MI Road',
  priceRange: '₹350-500',
  spiceLevel: 'high',
  healthNote: 'High protein, moderate fat — good choice',
};

describe('foodGuideResponseSchema', () => {
  it('parses a valid food guide', () => {
    const input = {
      destination: 'Jaipur',
      overview: 'Rajasthani cuisine is rich and heavy on ghee',
      mustTryDishes: [validDish],
      healthConscious: [{ name: 'Ker Sangri', description: 'Low cal desert beans', healthNote: 'Good for blood sugar' }],
      streetFood: {
        safetyTips: ['Stick to busy stalls'],
        items: [{ name: 'Pyaaz Kachori', where: 'Rawat', price: '₹30', healthNote: 'Deep fried — limit to one' }],
      },
      mealPlan: [
        {
          day: 1,
          breakfast: { suggestion: 'Poha + chai', cost: '₹100', healthNote: 'Light' },
          lunch: { suggestion: 'Laal Maas + bajra roti', cost: '₹450', healthNote: 'High protein' },
          dinner: { suggestion: 'Grilled kebabs', cost: '₹600', healthNote: 'Good choice' },
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
});
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `npx jest src/ai/schemas/destination.schema.spec.ts`
Expected: FAIL — `foodGuideResponseSchema` not exported

- [ ] **Step 3: Add food guide schemas**

In `src/ai/schemas/destination.schema.ts`, add before the type exports:

```typescript
export const dishSchema = z.object({
  name: z.string(),
  description: z.string(),
  where: z.string(),
  priceRange: z.string(),
  spiceLevel: z.string(),
  healthNote: z.string(),
});

export const healthConsciousDishSchema = z.object({
  name: z.string(),
  description: z.string(),
  healthNote: z.string(),
});

export const streetFoodItemSchema = z.object({
  name: z.string(),
  where: z.string(),
  price: z.string(),
  healthNote: z.string(),
});

export const mealSuggestionSchema = z.object({
  suggestion: z.string(),
  cost: z.string(),
  healthNote: z.string(),
});

export const dailyMealPlanSchema = z.object({
  day: z.number(),
  breakfast: mealSuggestionSchema,
  lunch: mealSuggestionSchema,
  dinner: mealSuggestionSchema,
});

export const foodGuideResponseSchema = z.object({
  destination: z.string(),
  overview: z.string(),
  mustTryDishes: z.array(dishSchema),
  healthConscious: z.array(healthConsciousDishSchema),
  streetFood: z.object({
    safetyTips: z.array(z.string()),
    items: z.array(streetFoodItemSchema),
  }),
  mealPlan: z.array(dailyMealPlanSchema),
  dietaryInfo: z.object({
    vegFriendly: z.string(),
    veganOptions: z.string(),
    halalAvailability: z.string(),
    waterAdvice: z.string(),
  }),
});

export const foodGuideResponseWrapperSchema = z.object({
  result: foodGuideResponseSchema,
});
```

Add type export:

```typescript
export type FoodGuideResponse = z.infer<typeof foodGuideResponseSchema>;
```

- [ ] **Step 4: Run schema tests**

Run: `npx jest src/ai/schemas/destination.schema.spec.ts`
Expected: ALL PASS

- [ ] **Step 5: Write failing prompt tests**

In `src/ai/prompts/destination.prompt.spec.ts`, add:

```typescript
import { buildFoodGuidePrompt } from './destination.prompt';

describe('buildFoodGuidePrompt', () => {
  const foodParams = {
    destination: 'Jaipur',
    state: 'Rajasthan',
    dates: { from: '2026-11-15', to: '2026-11-18' },
    group: { size: 2, type: 'couple' },
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

  it('contains diet type', () => {
    const { user } = buildFoodGuidePrompt(foodParams);
    expect(user).toContain('non-veg');
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
});
```

- [ ] **Step 6: Run tests to verify they fail**

Run: `npx jest src/ai/prompts/destination.prompt.spec.ts`
Expected: FAIL — `buildFoodGuidePrompt` not exported

- [ ] **Step 7: Add food guide prompt builder**

In `src/ai/prompts/destination.prompt.ts`, add:

```typescript
export interface FoodGuideParams extends HealthProfile {
  destination: string;
  state: string;
  freeText: string;
  group: { size: number; type: string };
  dates: { from: string; to: string };
  departureCity: string;
  dietType?: string;
  spiceTolerance?: string;
  foodBudget?: string;
  allergies?: string[];
}

export function buildFoodGuidePrompt(params: FoodGuideParams): { system: string; user: string } {
  const healthContext = buildHealthContext(params);
  const numDays = Math.ceil(
    (new Date(params.dates.to).getTime() - new Date(params.dates.from).getTime()) / 86400000,
  ) + 1;

  const dietLines: string[] = [];
  if (params.dietType) dietLines.push(`Diet: ${params.dietType}`);
  if (params.spiceTolerance) dietLines.push(`Spice tolerance: ${params.spiceTolerance}`);
  if (params.foodBudget) dietLines.push(`Food budget: ${params.foodBudget}`);
  if (params.allergies?.length) dietLines.push(`Allergies: ${params.allergies.join(', ')}`);
  const dietContext = dietLines.length > 0 ? `\nFood preferences: ${dietLines.join(' | ')}` : '';

  return {
    system: 'You are an expert Indian food and travel cuisine guide. You recommend local food personalized to the traveler\'s health conditions, dietary preferences, and allergies.',
    user: `Create a personalized food guide for ${params.destination}, ${params.state} (${numDays} days).
Traveler: ${params.freeText}
Group: ${params.group.size} ${params.group.type} | From: ${params.departureCity}${dietContext}${healthContext}

Respond ONLY with a JSON object in exactly this format (no extra text):
{"result":{"destination":"${params.destination}","overview":"<2-3 sentences about local cuisine + health-aware notes>","mustTryDishes":[{"name":"<dish>","description":"<one line>","where":"<restaurant/area>","priceRange":"<₹ range>","spiceLevel":"<mild/medium/hot>","healthNote":"<health advice for this traveler>"}],"healthConscious":[{"name":"<dish>","description":"<one line>","healthNote":"<why it's healthy>"}],"streetFood":{"safetyTips":["<tip>"],"items":[{"name":"<item>","where":"<location>","price":"<₹>","healthNote":"<note>"}]},"mealPlan":[{"day":<number>,"breakfast":{"suggestion":"<what>","cost":"<₹>","healthNote":"<note>"},"lunch":{"suggestion":"<what>","cost":"<₹>","healthNote":"<note>"},"dinner":{"suggestion":"<what>","cost":"<₹>","healthNote":"<note>"}}],"dietaryInfo":{"vegFriendly":"<assessment>","veganOptions":"<assessment>","halalAvailability":"<assessment>","waterAdvice":"<advice>"}}}

Include 5-8 must-try dishes, 2-3 healthy alternatives, 3-5 street food items, and a ${numDays}-day meal plan.`,
  };
}
```

- [ ] **Step 8: Run tests to verify they pass**

Run: `npx jest src/ai/prompts/destination.prompt.spec.ts`
Expected: ALL PASS

---

### Task 6: DTOs for itinerary and food-guide endpoints

**Files:**
- Create: `src/destination-finder/dto/itinerary.dto.ts`
- Create: `src/destination-finder/dto/food-guide.dto.ts`
- Modify: `src/destination-finder/dto/search-destinations.dto.ts`

- [ ] **Step 1: Add food preference fields to search DTO**

In `src/destination-finder/dto/search-destinations.dto.ts`, add before the closing `}` of the class:

```typescript
  @IsOptional()
  @IsEnum(['veg', 'non-veg', 'vegan', 'eggetarian', 'jain'])
  dietType?: string;

  @IsOptional()
  @IsEnum(['low', 'medium', 'high'])
  spiceTolerance?: string;

  @IsOptional()
  @IsEnum(['street', 'moderate', 'fine-dining'])
  foodBudget?: string;

  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  allergies?: string[];
```

- [ ] **Step 2: Create itinerary DTO**

Create `src/destination-finder/dto/itinerary.dto.ts`:

```typescript
import {
  IsArray,
  IsDateString,
  IsEnum,
  IsInt,
  IsNumber,
  IsOptional,
  IsString,
  Max,
  Min,
  ValidateNested,
} from 'class-validator';
import { Type } from 'class-transformer';

class DateRangeDto {
  @IsDateString()
  from: string;

  @IsDateString()
  to: string;
}

class BudgetDto {
  @IsInt()
  @Min(0)
  min: number;

  @IsInt()
  @Min(0)
  max: number;
}

class GroupDto {
  @IsInt()
  @Min(1)
  size: number;

  @IsEnum(['solo', 'couple', 'friends', 'family'])
  type: string;
}

export class ItineraryDto {
  @IsString()
  destination: string;

  @IsString()
  state: string;

  @ValidateNested()
  @Type(() => DateRangeDto)
  dates: DateRangeDto;

  @ValidateNested()
  @Type(() => BudgetDto)
  budget: BudgetDto;

  @ValidateNested()
  @Type(() => GroupDto)
  group: GroupDto;

  @IsString()
  departureCity: string;

  @IsString()
  freeText: string;

  @IsOptional()
  @IsEnum(['male', 'female', 'other'])
  gender?: string;

  @IsOptional()
  @IsInt()
  @Min(10)
  @Max(100)
  age?: number;

  @IsOptional()
  @IsNumber()
  @Min(20)
  @Max(300)
  weight?: number;

  @IsOptional()
  @IsNumber()
  @Min(100)
  @Max(250)
  height?: number;

  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  medicalConditions?: string[];
}
```

- [ ] **Step 3: Create food-guide DTO**

Create `src/destination-finder/dto/food-guide.dto.ts`:

```typescript
import {
  IsArray,
  IsDateString,
  IsEnum,
  IsInt,
  IsNumber,
  IsOptional,
  IsString,
  Max,
  Min,
  ValidateNested,
} from 'class-validator';
import { Type } from 'class-transformer';

class DateRangeDto {
  @IsDateString()
  from: string;

  @IsDateString()
  to: string;
}

class GroupDto {
  @IsInt()
  @Min(1)
  size: number;

  @IsEnum(['solo', 'couple', 'friends', 'family'])
  type: string;
}

export class FoodGuideDto {
  @IsString()
  destination: string;

  @IsString()
  state: string;

  @ValidateNested()
  @Type(() => DateRangeDto)
  dates: DateRangeDto;

  @ValidateNested()
  @Type(() => GroupDto)
  group: GroupDto;

  @IsString()
  departureCity: string;

  @IsString()
  freeText: string;

  @IsOptional()
  @IsEnum(['veg', 'non-veg', 'vegan', 'eggetarian', 'jain'])
  dietType?: string;

  @IsOptional()
  @IsEnum(['low', 'medium', 'high'])
  spiceTolerance?: string;

  @IsOptional()
  @IsEnum(['street', 'moderate', 'fine-dining'])
  foodBudget?: string;

  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  allergies?: string[];

  @IsOptional()
  @IsEnum(['male', 'female', 'other'])
  gender?: string;

  @IsOptional()
  @IsInt()
  @Min(10)
  @Max(100)
  age?: number;

  @IsOptional()
  @IsNumber()
  @Min(20)
  @Max(300)
  weight?: number;

  @IsOptional()
  @IsNumber()
  @Min(100)
  @Max(250)
  height?: number;

  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  medicalConditions?: string[];
}
```

- [ ] **Step 4: Run build to verify DTOs compile**

Run: `npx nest build`
Expected: Build succeeds with no errors

---

### Task 7: AI service methods for itinerary + food guide

**Files:**
- Modify: `src/ai/ai.service.ts`
- Modify: `src/ai/ai.service.spec.ts`

- [ ] **Step 1: Write failing tests for new methods**

In `src/ai/ai.service.spec.ts`, add new describe blocks:

```typescript
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
      mockGenerateObject.mockResolvedValue({ object: { result: mockItinerary } } as any);

      const result = await service.generateItinerary(PROMPT);
      expect(result.destination).toBe('Goa');
      expect(result.itinerary).toHaveLength(1);
    });

    it('throws when AI fails', async () => {
      mockGenerateObject.mockRejectedValue(new Error('AI error'));
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
      mockGenerateObject.mockResolvedValue({ object: { result: mockFoodGuide } } as any);

      const result = await service.generateFoodGuide(PROMPT);
      expect(result.destination).toBe('Jaipur');
    });

    it('throws when AI fails', async () => {
      mockGenerateObject.mockRejectedValue(new Error('AI error'));
      await expect(service.generateFoodGuide(PROMPT)).rejects.toThrow('AI error');
    });
  });
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `npx jest src/ai/ai.service.spec.ts`
Expected: FAIL — `generateItinerary` and `generateFoodGuide` not defined

- [ ] **Step 3: Add new methods to ai.service.ts**

In `src/ai/ai.service.ts`, add the imports and methods:

```typescript
import {
  rankResultsSchema,
  generateResultsSchema,
  itineraryResponseWrapperSchema,
  foodGuideResponseWrapperSchema,
} from './schemas/destination.schema';
import type {
  RankResult,
  GenerateResult,
  ItineraryResponse,
  FoodGuideResponse,
} from './schemas/destination.schema';
```

Add methods after `generateDestinations`:

```typescript
  async generateItinerary(
    prompt: { system: string; user: string },
  ): Promise<ItineraryResponse> {
    const { object } = await generateObject({
      model: this.model,
      schema: itineraryResponseWrapperSchema,
      system: prompt.system,
      prompt: prompt.user,
    });

    return object.result;
  }

  async generateFoodGuide(
    prompt: { system: string; user: string },
  ): Promise<FoodGuideResponse> {
    const { object } = await generateObject({
      model: this.model,
      schema: foodGuideResponseWrapperSchema,
      system: prompt.system,
      prompt: prompt.user,
    });

    return object.result;
  }
```

- [ ] **Step 4: Run tests to verify they pass**

Run: `npx jest src/ai/ai.service.spec.ts`
Expected: ALL PASS

---

### Task 8: Service + Controller wiring for itinerary + food guide

**Files:**
- Modify: `src/destination-finder/destination-finder.service.ts`
- Modify: `src/destination-finder/destination-finder.controller.ts`
- Modify: `src/destination-finder/destination-finder.service.spec.ts`
- Modify: `src/destination-finder/destination-finder.controller.spec.ts`

- [ ] **Step 1: Add service methods**

In `src/destination-finder/destination-finder.service.ts`, add imports:

```typescript
import { buildHybridPrompt, buildAiFullPrompt, buildItineraryPrompt, buildFoodGuidePrompt } from '../ai/prompts/destination.prompt';
import { SearchDestinationsDto } from './dto/search-destinations.dto';
import { ItineraryDto } from './dto/itinerary.dto';
import { FoodGuideDto } from './dto/food-guide.dto';
```

Add methods after `formatDbResult`:

```typescript
  async itinerary(dto: ItineraryDto) {
    const cacheKey = this.cacheService.buildKey({
      type: 'itinerary',
      destination: dto.destination,
      state: dto.state,
      dates: dto.dates,
      budget: dto.budget,
      group: dto.group,
      departureCity: dto.departureCity,
      normalizedFreeText: this.cacheService.normalizeText(dto.freeText),
    });

    const cached = await this.cacheService.get(cacheKey);
    if (cached) return cached;

    try {
      const prompt = buildItineraryPrompt(dto);
      const result = await this.aiService.generateItinerary(prompt);
      await this.cacheService.set(cacheKey, result, 86400);
      return result;
    } catch (error) {
      this.logger.error('AI error during itinerary generation', error);
      throw new HttpException(
        'Our AI is temporarily unavailable. Please try again in a moment.',
        HttpStatus.SERVICE_UNAVAILABLE,
      );
    }
  }

  async foodGuide(dto: FoodGuideDto) {
    const cacheKey = this.cacheService.buildKey({
      type: 'food-guide',
      destination: dto.destination,
      state: dto.state,
      dates: dto.dates,
      group: dto.group,
      dietType: dto.dietType,
      spiceTolerance: dto.spiceTolerance,
      foodBudget: dto.foodBudget,
      allergies: dto.allergies,
      normalizedFreeText: this.cacheService.normalizeText(dto.freeText),
    });

    const cached = await this.cacheService.get(cacheKey);
    if (cached) return cached;

    try {
      const prompt = buildFoodGuidePrompt(dto);
      const result = await this.aiService.generateFoodGuide(prompt);
      await this.cacheService.set(cacheKey, result, 86400);
      return result;
    } catch (error) {
      this.logger.error('AI error during food guide generation', error);
      throw new HttpException(
        'Our AI is temporarily unavailable. Please try again in a moment.',
        HttpStatus.SERVICE_UNAVAILABLE,
      );
    }
  }
```

- [ ] **Step 2: Add controller routes**

In `src/destination-finder/destination-finder.controller.ts`, add imports and routes:

```typescript
import { ItineraryDto } from './dto/itinerary.dto';
import { FoodGuideDto } from './dto/food-guide.dto';
```

Add methods after the `search` method:

```typescript
  @Post('itinerary')
  @HttpCode(200)
  @Throttle({ default: { limit: 20, ttl: 60000 } })
  async itinerary(@Body() dto: ItineraryDto) {
    return this.service.itinerary(dto);
  }

  @Post('food-guide')
  @HttpCode(200)
  @Throttle({ default: { limit: 20, ttl: 60000 } })
  async foodGuide(@Body() dto: FoodGuideDto) {
    return this.service.foodGuide(dto);
  }
```

- [ ] **Step 3: Update controller spec**

In `src/destination-finder/destination-finder.controller.spec.ts`, add test cases for the two new routes. Mock `service.itinerary` and `service.foodGuide` the same way `service.search` is mocked, and verify the controller delegates to them.

- [ ] **Step 4: Update service spec**

In `src/destination-finder/destination-finder.service.spec.ts`, add test cases for `itinerary()` and `foodGuide()`. Test: cache hit returns cached, cache miss calls AI and caches result, AI error throws 503.

- [ ] **Step 5: Run all tests**

Run: `npx jest`
Expected: ALL PASS

---

### Task 9: Build, run all tests, live smoke test

**Files:** None (verification only)

- [ ] **Step 1: Build the app**

Run: `npm run build`
Expected: Build succeeds with no errors

- [ ] **Step 2: Run full test suite**

Run: `npx jest`
Expected: All tests pass (check count is higher than before — should be 80+)

- [ ] **Step 3: Start the app and smoke test /search (enriched)**

Start: `npm run start`

```bash
curl -s -X POST http://localhost:3000/destination-finder/search \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer $TOKEN" \
  -d '{ "dates":{"from":"2026-11-15","to":"2026-11-22"}, "budget":{"min":5000,"max":20000}, "group":{"size":2,"type":"couple"}, "experienceTypes":["beach","culture"], "departureCity":"Mumbai", "freeText":"relaxing beach vacation", "gender":"female", "age":28, "weight":55, "height":162 }'
```

Verify response has: `costBreakdown`, `permits`, `tripReadiness` alongside existing `healthAdvisory` and `whyItMatches`.

- [ ] **Step 4: Smoke test /itinerary**

```bash
curl -s -X POST http://localhost:3000/destination-finder/itinerary \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer $TOKEN" \
  -d '{ "destination":"Goa", "state":"Goa", "dates":{"from":"2026-11-15","to":"2026-11-18"}, "budget":{"min":5000,"max":20000}, "group":{"size":2,"type":"couple"}, "departureCity":"Mumbai", "freeText":"relaxing beach vacation", "age":28, "weight":55, "height":162 }'
```

Verify response has: `destination`, `totalEstimate`, `itinerary` (array with day objects), `packingList`, `healthAdvisory`, `permits`.

- [ ] **Step 5: Smoke test /food-guide**

```bash
curl -s -X POST http://localhost:3000/destination-finder/food-guide \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer $TOKEN" \
  -d '{ "destination":"Jaipur", "state":"Rajasthan", "dates":{"from":"2026-11-15","to":"2026-11-18"}, "group":{"size":2,"type":"couple"}, "departureCity":"Mumbai", "freeText":"love spicy food", "dietType":"non-veg", "spiceTolerance":"high", "foodBudget":"moderate", "age":45, "weight":90, "height":170, "medicalConditions":["diabetes"] }'
```

Verify response has: `destination`, `overview`, `mustTryDishes`, `healthConscious`, `streetFood`, `mealPlan`, `dietaryInfo`.

---

### Task 10: Update Postman collection

**Files:**
- Modify: `Sarthi-Phase1.postman_collection.json`

- [ ] **Step 1: Add Itinerary folder with 2 requests**

Add "Itinerary" folder with:
- "Itinerary — Goa beach couple" (with health profile, expects itinerary array)
- "Itinerary — Ladakh trek with knee issue" (with medicalConditions, expects permits.required=true)

- [ ] **Step 2: Add Food Guide folder with 2 requests**

Add "Food Guide" folder with:
- "Food Guide — Jaipur non-veg, diabetic" (dietType, spiceTolerance, medicalConditions)
- "Food Guide — Kerala veg, no allergies" (dietType=veg, no medicalConditions)

- [ ] **Step 3: Update existing search requests**

Update the existing search request bodies to verify `costBreakdown`, `permits`, and `tripReadiness` appear in test assertions.

- [ ] **Step 4: Verify collection is valid JSON**

Run: `python3 -m json.tool Sarthi-Phase1.postman_collection.json > /dev/null`
Expected: No errors
