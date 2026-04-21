# Trek-Aware Search Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Make `/search` recommend specific named treks (Hampta Pass, Roopkund) instead of generic cities (Manali) when trekking intent is detected, using a curated 98-trek dataset.

**Architecture:** A new `TrekService` loads the trek dataset and exposes filtering (by month, duration, difficulty). The `DestinationFinderService.search()` detects trekking intent from `experienceTypes` + `freeText`, and when detected, routes to a new `runTrekMode()` path that filters treks, builds a trek-specific prompt, and gets AI to rank them with trek-specific response fields. Non-trek searches are unchanged.

**Tech Stack:** NestJS v11, Vercel AI SDK (`ai` + `@ai-sdk/openai-compatible`), Zod v4, Jest 30

**Important:** Skip all git operations (no git init, add, commit). User controls commits.

---

## File Map

| File | Action | Responsibility |
|---|---|---|
| `src/treks/treks.json` | Create | Trek dataset (copy from `India_trek_dataset.json`) |
| `src/treks/trek.interface.ts` | Create | TypeScript interface for trek data |
| `src/treks/trek.service.ts` | Create | Load treks, filter by month/duration/difficulty, detect trekking intent |
| `src/treks/trek.service.spec.ts` | Create | Tests for filtering and intent detection |
| `src/treks/treks.module.ts` | Create | NestJS module exporting TrekService |
| `src/ai/schemas/destination.schema.ts` | Modify | Add `trekResultSchema`, `trekResultsSchema` |
| `src/ai/schemas/destination.schema.spec.ts` | Modify | Tests for new trek schemas |
| `src/ai/prompts/destination.prompt.ts` | Modify | Add `buildTrekPrompt` function |
| `src/ai/prompts/destination.prompt.spec.ts` | Modify | Tests for `buildTrekPrompt` |
| `src/ai/ai.service.ts` | Modify | Add `rankTreks()` method |
| `src/ai/ai.service.spec.ts` | Modify | Tests for `rankTreks` |
| `src/destination-finder/destination-finder.service.ts` | Modify | Add `runTrekMode()`, wire into `search()` |
| `src/destination-finder/destination-finder.service.spec.ts` | Modify | Tests for trek mode in search |
| `src/destination-finder/destination-finder.module.ts` | Modify | Import `TreksModule` |

---

### Task 1: Trek interface + service with filtering and intent detection

**Files:**
- Create: `src/treks/trek.interface.ts`
- Create: `src/treks/treks.json`
- Create: `src/treks/trek.service.ts`
- Create: `src/treks/trek.service.spec.ts`
- Create: `src/treks/treks.module.ts`

- [ ] **Step 1: Write failing tests for TrekService**

Create `src/treks/trek.service.spec.ts`:

```typescript
import { TrekService } from './trek.service';

describe('TrekService', () => {
  let service: TrekService;

  beforeEach(() => {
    service = new TrekService();
  });

  describe('getAll', () => {
    it('returns all treks', () => {
      const treks = service.getAll();
      expect(treks.length).toBeGreaterThan(90);
      expect(treks[0]).toHaveProperty('name');
      expect(treks[0]).toHaveProperty('peakAltitude');
    });
  });

  describe('isTrekkingIntent', () => {
    it('returns true when experienceTypes includes trekking', () => {
      expect(service.isTrekkingIntent(['trekking'], '')).toBe(true);
    });

    it('returns true when experienceTypes includes adventure', () => {
      expect(service.isTrekkingIntent(['adventure'], '')).toBe(true);
    });

    it('returns true when experienceTypes includes hiking', () => {
      expect(service.isTrekkingIntent(['hiking'], '')).toBe(true);
    });

    it('returns true when freeText mentions trek', () => {
      expect(service.isTrekkingIntent(['nature'], 'want to do a challenging trek')).toBe(true);
    });

    it('returns true when freeText mentions hike', () => {
      expect(service.isTrekkingIntent([], 'looking for a mountain hike')).toBe(true);
    });

    it('returns true when freeText mentions summit', () => {
      expect(service.isTrekkingIntent([], 'want to reach a summit')).toBe(true);
    });

    it('returns false for beach vacation', () => {
      expect(service.isTrekkingIntent(['beach'], 'relaxing beach vacation')).toBe(false);
    });

    it('returns false for culture trip', () => {
      expect(service.isTrekkingIntent(['culture', 'food'], 'explore temples')).toBe(false);
    });
  });

  describe('filterTreks', () => {
    it('filters by travel month', () => {
      const result = service.filterTreks({ month: 1 });
      result.forEach(t => expect(t.bestMonths).toContain(1));
    });

    it('filters by max duration', () => {
      const result = service.filterTreks({ maxDays: 5 });
      result.forEach(t => expect(t.durationDays).toBeLessThanOrEqual(5));
    });

    it('filters by difficulty levels', () => {
      const result = service.filterTreks({ difficulties: ['easy', 'easy_to_moderate'] });
      result.forEach(t => expect(['easy', 'easy_to_moderate']).toContain(t.difficulty));
    });

    it('filters by state', () => {
      const result = service.filterTreks({ state: 'Uttarakhand' });
      result.forEach(t => expect(t.state).toBe('Uttarakhand'));
    });

    it('combines multiple filters', () => {
      const result = service.filterTreks({ month: 6, maxDays: 7, state: 'Himachal Pradesh' });
      result.forEach(t => {
        expect(t.bestMonths).toContain(6);
        expect(t.durationDays).toBeLessThanOrEqual(7);
        expect(t.state).toBe('Himachal Pradesh');
      });
    });

    it('returns all treks when no filters applied', () => {
      const all = service.getAll();
      const filtered = service.filterTreks({});
      expect(filtered.length).toBe(all.length);
    });
  });

  describe('filterForSearch', () => {
    it('filters by date range month and duration', () => {
      const result = service.filterForSearch({
        dates: { from: '2026-06-01', to: '2026-06-08' },
      });
      result.forEach(t => {
        expect(t.bestMonths).toContain(6);
        expect(t.durationDays).toBeLessThanOrEqual(8);
      });
    });

    it('suggests easier treks for users with medical conditions', () => {
      const result = service.filterForSearch({
        dates: { from: '2026-06-01', to: '2026-06-15' },
        medicalConditions: ['knee_issue'],
      });
      result.forEach(t => {
        expect(['easy', 'easy_to_moderate', 'moderate']).toContain(t.difficulty);
      });
    });

    it('suggests easier treks for seniors (age >= 55)', () => {
      const result = service.filterForSearch({
        dates: { from: '2026-06-01', to: '2026-06-15' },
        age: 60,
      });
      result.forEach(t => {
        expect(['easy', 'easy_to_moderate', 'moderate']).toContain(t.difficulty);
      });
    });

    it('allows all difficulties for young fit users', () => {
      const result = service.filterForSearch({
        dates: { from: '2026-06-01', to: '2026-06-15' },
        age: 25,
      });
      const difficulties = new Set(result.map(t => t.difficulty));
      expect(difficulties.size).toBeGreaterThan(1);
    });

    it('caps results at 20', () => {
      const result = service.filterForSearch({
        dates: { from: '2026-10-01', to: '2026-10-30' },
      });
      expect(result.length).toBeLessThanOrEqual(20);
    });
  });
});
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `cd /home/abhishek/Desktop/Abhishek/Sarthi/sarthi-backend && npx jest src/treks/trek.service.spec.ts`
Expected: FAIL — module not found

- [ ] **Step 3: Create trek interface**

Create `src/treks/trek.interface.ts`:

```typescript
export interface Trek {
  name: string;
  region: string;
  state: string;
  baseCamp: string;
  peakAltitude: number;
  difficulty: 'easy' | 'easy_to_moderate' | 'moderate' | 'moderate_to_difficult' | 'difficult';
  durationDays: number;
  bestMonths: number[];
  terrain: string[];
  highlights: string[];
  nearestCity: string;
  permits: boolean;
  fitnessDemand: string;
}
```

- [ ] **Step 4: Copy trek dataset**

Copy `India_trek_dataset.json` to `src/treks/treks.json`. This keeps the source data inside the `src/` tree so it's included in the build.

Run: `cp India_trek_dataset.json src/treks/treks.json`

- [ ] **Step 5: Create TrekService**

Create `src/treks/trek.service.ts`:

```typescript
import { Injectable } from '@nestjs/common';
import { Trek } from './trek.interface';
import treksData from './treks.json';

const TREK_INTENT_EXPERIENCE_TYPES = new Set([
  'trekking', 'trek', 'hiking', 'hike', 'adventure', 'mountaineering',
]);

const TREK_INTENT_KEYWORDS = /\b(trek|treks|trekking|hike|hiking|summit|mountaineering|base\s*camp|high\s*altitude)\b/i;

export interface TrekFilter {
  month?: number;
  maxDays?: number;
  difficulties?: string[];
  state?: string;
}

export interface SearchTrekFilter {
  dates: { from: string; to: string };
  age?: number;
  medicalConditions?: string[];
}

@Injectable()
export class TrekService {
  private readonly treks: Trek[] = treksData as Trek[];

  getAll(): Trek[] {
    return this.treks;
  }

  isTrekkingIntent(experienceTypes: string[], freeText: string): boolean {
    const hasTypeMatch = experienceTypes.some(t => TREK_INTENT_EXPERIENCE_TYPES.has(t.toLowerCase()));
    if (hasTypeMatch) return true;
    return TREK_INTENT_KEYWORDS.test(freeText);
  }

  filterTreks(filter: TrekFilter): Trek[] {
    let result = this.treks;

    if (filter.month !== undefined) {
      result = result.filter(t => t.bestMonths.includes(filter.month!));
    }

    if (filter.maxDays !== undefined) {
      result = result.filter(t => t.durationDays <= filter.maxDays!);
    }

    if (filter.difficulties?.length) {
      result = result.filter(t => filter.difficulties!.includes(t.difficulty));
    }

    if (filter.state) {
      result = result.filter(t => t.state === filter.state);
    }

    return result;
  }

  filterForSearch(filter: SearchTrekFilter): Trek[] {
    const travelMonth = new Date(filter.dates.from).getMonth() + 1;
    const tripDays = Math.ceil(
      (new Date(filter.dates.to).getTime() - new Date(filter.dates.from).getTime()) / 86400000,
    ) + 1;

    const needsEasier = (filter.age && filter.age >= 55) ||
      (filter.medicalConditions && filter.medicalConditions.length > 0);

    const difficulties = needsEasier
      ? ['easy', 'easy_to_moderate', 'moderate']
      : undefined;

    const filtered = this.filterTreks({
      month: travelMonth,
      maxDays: tripDays,
      difficulties,
    });

    return filtered.slice(0, 20);
  }
}
```

- [ ] **Step 6: Enable JSON imports in tsconfig**

In `tsconfig.json`, ensure `resolveJsonModule` and `esModuleInterop` are `true` under `compilerOptions`. If they are already set, skip this step.

Run: `grep -c resolveJsonModule tsconfig.json` — if 0, add it.

- [ ] **Step 7: Create TreksModule**

Create `src/treks/treks.module.ts`:

```typescript
import { Module } from '@nestjs/common';
import { TrekService } from './trek.service';

@Module({
  providers: [TrekService],
  exports: [TrekService],
})
export class TreksModule {}
```

- [ ] **Step 8: Run tests to verify they pass**

Run: `cd /home/abhishek/Desktop/Abhishek/Sarthi/sarthi-backend && npx jest src/treks/trek.service.spec.ts`
Expected: ALL PASS

---

### Task 2: Trek-specific Zod schema

**Files:**
- Modify: `src/ai/schemas/destination.schema.ts`
- Modify: `src/ai/schemas/destination.schema.spec.ts`

- [ ] **Step 1: Write failing tests for trek schema**

In `src/ai/schemas/destination.schema.spec.ts`, add to imports:

```typescript
import {
  // ... existing imports ...
  trekResultSchema,
  trekResultsSchema,
} from './destination.schema';
```

Add test fixtures and describe block at the end of the file:

```typescript
const validTrekResult = {
  name: 'Hampta Pass',
  region: 'Kullu, Himachal Pradesh',
  baseCamp: 'Jobra (near Manali)',
  peakAltitude: '4,270m',
  difficulty: 'Moderate',
  durationDays: '5 days',
  terrain: 'Snow, meadows, river crossings',
  whyItMatches: 'Perfect difficulty for your fitness level with stunning valley views',
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
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `cd /home/abhishek/Desktop/Abhishek/Sarthi/sarthi-backend && npx jest src/ai/schemas/destination.schema.spec.ts`
Expected: FAIL — `trekResultSchema`, `trekResultsSchema` not exported

- [ ] **Step 3: Add trek schemas to destination.schema.ts**

In `src/ai/schemas/destination.schema.ts`, add after `generateResultsSchema` (line 65) and before the itinerary schemas:

```typescript
export const trekResultSchema = z.object({
  name: z.string(),
  region: z.string(),
  baseCamp: z.string(),
  peakAltitude: z.string(),
  difficulty: z.string(),
  durationDays: z.string(),
  terrain: z.string(),
  whyItMatches: z.string(),
  highlights: z.array(z.string()),
  healthAdvisory: healthAdvisorySchema,
  costBreakdown: costBreakdownSchema,
  permits: permitsSchema,
  tripReadiness: tripReadinessSchema,
});

export const trekResultsSchema = z.object({
  treks: z.array(trekResultSchema),
});
```

Add type exports at the bottom:

```typescript
export type TrekResult = z.infer<typeof trekResultSchema>;
```

- [ ] **Step 4: Run tests to verify they pass**

Run: `cd /home/abhishek/Desktop/Abhishek/Sarthi/sarthi-backend && npx jest src/ai/schemas/destination.schema.spec.ts`
Expected: ALL PASS

---

### Task 3: Trek-specific prompt builder

**Files:**
- Modify: `src/ai/prompts/destination.prompt.ts`
- Modify: `src/ai/prompts/destination.prompt.spec.ts`

- [ ] **Step 1: Write failing tests for buildTrekPrompt**

In `src/ai/prompts/destination.prompt.spec.ts`, add import:

```typescript
import { buildHybridPrompt, buildAiFullPrompt, buildItineraryPrompt, buildFoodGuidePrompt, buildTrekPrompt, computeBmi } from './destination.prompt';
```

Add describe block at the end:

```typescript
describe('buildTrekPrompt', () => {
  const trekParams = {
    freeText: 'challenging high altitude trek with snow',
    group: { size: 2, type: 'friends' },
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
});
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `cd /home/abhishek/Desktop/Abhishek/Sarthi/sarthi-backend && npx jest src/ai/prompts/destination.prompt.spec.ts`
Expected: FAIL — `buildTrekPrompt` not exported

- [ ] **Step 3: Add buildTrekPrompt to destination.prompt.ts**

Add at the end of `src/ai/prompts/destination.prompt.ts`, after `buildFoodGuidePrompt`:

```typescript
export interface TrekPromptParams extends HealthProfile {
  freeText: string;
  group: { size: number; type: string };
  budget: { min: number; max: number };
  dates: { from: string; to: string };
  departureCity: string;
  treks: Array<{
    name: string;
    region: string;
    state: string;
    baseCamp: string;
    peakAltitude: number;
    difficulty: string;
    durationDays: number;
    bestMonths: number[];
    terrain: string[];
    highlights: string[];
    nearestCity: string;
    permits: boolean;
    fitnessDemand: string;
  }>;
}

export function buildTrekPrompt(params: TrekPromptParams): { system: string; user: string } {
  const travelerProfile = [
    `Group: ${params.group.size} ${params.group.type}`,
    `Budget: ₹${params.budget.min}–${params.budget.max}/person`,
    `Dates: ${params.dates.from} to ${params.dates.to}`,
    `From: ${params.departureCity}`,
  ].join(' | ');

  const healthContext = buildHealthContext(params);

  const trekList = params.treks
    .map(t => `  - ${t.name} | ${t.region} | ${t.peakAltitude}m | ${t.difficulty} | ${t.durationDays} days | Base: ${t.baseCamp} | Nearest city: ${t.nearestCity} | Terrain: ${t.terrain.join(', ')} | Highlights: ${t.highlights.join(', ')} | Permits: ${t.permits ? 'Yes' : 'No'} | Fitness: ${t.fitnessDemand}`)
    .join('\n');

  return {
    system: 'You are an expert Indian trek recommendation engine. You recommend specific named treks (not cities) based on the traveler\'s fitness, experience, dates, and preferences. You assess health and fitness suitability for each trek.',
    user: `Traveler: ${params.freeText}
${travelerProfile}${healthContext}

Recommend the best matching treks from this list. Rank best match first. For each, explain why it matches and assess health/fitness suitability.

Available treks:
${trekList}

Respond ONLY with a JSON object in exactly this format (no extra text):
{"treks":[{"name":"<exact trek name from above>","region":"<region>","baseCamp":"<base camp>","peakAltitude":"<e.g. 4,270m>","difficulty":"<difficulty>","durationDays":"<e.g. 5 days>","terrain":"<terrain summary>","whyItMatches":"<one sentence personalized to this traveler>","highlights":["<highlight1>","<highlight2>"],${HEALTH_ADVISORY_FORMAT},${COST_BREAKDOWN_FORMAT},${PERMITS_FORMAT},${TRIP_READINESS_FORMAT}}]}

Max 5 results, best match first.`,
  };
}
```

- [ ] **Step 4: Run tests to verify they pass**

Run: `cd /home/abhishek/Desktop/Abhishek/Sarthi/sarthi-backend && npx jest src/ai/prompts/destination.prompt.spec.ts`
Expected: ALL PASS

---

### Task 4: AI service `rankTreks` method

**Files:**
- Modify: `src/ai/ai.service.ts`
- Modify: `src/ai/ai.service.spec.ts`

- [ ] **Step 1: Write failing tests**

In `src/ai/ai.service.spec.ts`, add a new describe block after `generateFoodGuide`:

```typescript
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
      mockGenerateObject.mockResolvedValue({ object: { treks: [mockTrekResult] } } as any);

      const result = await service.rankTreks(PROMPT);
      expect(result).toHaveLength(1);
      expect(result[0].name).toBe('Hampta Pass');
    });

    it('returns empty array when AI returns empty', async () => {
      mockGenerateObject.mockResolvedValue({ object: { treks: [] } } as any);

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
      mockGenerateObject.mockResolvedValue({ object: { treks: many } } as any);

      const result = await service.rankTreks(PROMPT);
      expect(result).toHaveLength(5);
    });

    it('throws when AI fails', async () => {
      mockGenerateObject.mockRejectedValue(new Error('AI error'));
      await expect(service.rankTreks(PROMPT)).rejects.toThrow('AI error');
    });
  });
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `cd /home/abhishek/Desktop/Abhishek/Sarthi/sarthi-backend && npx jest src/ai/ai.service.spec.ts`
Expected: FAIL — `rankTreks` not defined

- [ ] **Step 3: Add rankTreks method to ai.service.ts**

Update imports in `src/ai/ai.service.ts`:

```typescript
import {
  rankResultsSchema,
  generateResultsSchema,
  itineraryResponseWrapperSchema,
  foodGuideResponseWrapperSchema,
  trekResultsSchema,
} from './schemas/destination.schema';
import type {
  RankResult,
  GenerateResult,
  ItineraryResponse,
  FoodGuideResponse,
  TrekResult,
} from './schemas/destination.schema';
```

Add method after `generateFoodGuide`:

```typescript
  async rankTreks(
    prompt: { system: string; user: string },
  ): Promise<TrekResult[]> {
    const { object } = await generateObject({
      model: this.model,
      schema: trekResultsSchema,
      system: prompt.system,
      prompt: prompt.user,
    });

    return (object?.treks ?? []).slice(0, 5);
  }
```

- [ ] **Step 4: Run tests to verify they pass**

Run: `cd /home/abhishek/Desktop/Abhishek/Sarthi/sarthi-backend && npx jest src/ai/ai.service.spec.ts`
Expected: ALL PASS

---

### Task 5: Wire trek mode into search

**Files:**
- Modify: `src/destination-finder/destination-finder.module.ts`
- Modify: `src/destination-finder/destination-finder.service.ts`
- Modify: `src/destination-finder/destination-finder.service.spec.ts`

- [ ] **Step 1: Import TreksModule into DestinationFinderModule**

In `src/destination-finder/destination-finder.module.ts`:

```typescript
import { Module } from '@nestjs/common';
import { DestinationFinderController } from './destination-finder.controller';
import { DestinationFinderService } from './destination-finder.service';
import { DestinationQueryService } from './destination-query.service';
import { TreksModule } from '../treks/treks.module';

@Module({
  imports: [TreksModule],
  controllers: [DestinationFinderController],
  providers: [DestinationFinderService, DestinationQueryService],
})
export class DestinationFinderModule {}
```

- [ ] **Step 2: Write failing tests for trek mode in search**

In `src/destination-finder/destination-finder.service.spec.ts`, add a new describe block:

First, update the mock setup. Add `trekService` mock:

```typescript
import { TrekService } from '../treks/trek.service';
```

In the `beforeEach`, add:

```typescript
    let trekService: jest.Mocked<TrekService>;
```

Update `beforeEach`:

```typescript
    trekService = { isTrekkingIntent: jest.fn(), filterForSearch: jest.fn() } as any;

    service = new DestinationFinderService(queryService, aiService, cacheService, configService, trekService);
```

Add a new describe block:

```typescript
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
      (aiService as any).rankTreks = jest.fn().mockResolvedValue([mockTrekAiResult]);
    });

    it('detects trekking intent and uses trek mode', async () => {
      const result = await service.search(trekDto) as any;
      expect(result.mode).toBe('trek');
      expect(result.results[0].name).toBe('Hampta Pass');
      expect(trekService.isTrekkingIntent).toHaveBeenCalledWith(['trekking'], 'challenging high altitude trek');
    });

    it('falls back to normal hybrid when no treks match filters', async () => {
      trekService.filterForSearch.mockReturnValue([]);
      queryService.findShortlist.mockResolvedValue([mockDestination] as any);
      aiService.rankDestinations.mockResolvedValue([
        { id: 'uuid-1', whyItMatches: 'Decent', healthAdvisory: mockAdvisory, costBreakdown: mockCostBreakdown, permits: mockPermits, tripReadiness: mockTripReadiness },
      ]);

      const result = await service.search(trekDto) as any;
      expect(result.mode).toBe('hybrid');
    });

    it('caches trek results', async () => {
      await service.search(trekDto);
      expect(cacheService.set).toHaveBeenCalledWith('cache-key-hash', expect.objectContaining({ mode: 'trek' }), 86400);
    });

    it('skips trek mode when intent is not trekking', async () => {
      trekService.isTrekkingIntent.mockReturnValue(false);
      queryService.findShortlist.mockResolvedValue([mockDestination] as any);
      aiService.rankDestinations.mockResolvedValue([
        { id: 'uuid-1', whyItMatches: 'Beach vibes', healthAdvisory: mockAdvisory, costBreakdown: mockCostBreakdown, permits: mockPermits, tripReadiness: mockTripReadiness },
      ]);

      const result = await service.search({
        ...trekDto,
        experienceTypes: ['beach'],
        freeText: 'relaxing beach vacation',
      }) as any;

      expect(result.mode).toBe('hybrid');
      expect(trekService.isTrekkingIntent).toHaveBeenCalled();
    });
  });
```

- [ ] **Step 3: Run tests to verify they fail**

Run: `cd /home/abhishek/Desktop/Abhishek/Sarthi/sarthi-backend && npx jest src/destination-finder/destination-finder.service.spec.ts`
Expected: FAIL — constructor expects 5 args

- [ ] **Step 4: Update destination-finder.service.ts**

Update imports:

```typescript
import { buildHybridPrompt, buildAiFullPrompt, buildItineraryPrompt, buildFoodGuidePrompt, buildTrekPrompt } from '../ai/prompts/destination.prompt';
import { TrekService } from '../treks/trek.service';
```

Update constructor to inject TrekService:

```typescript
  constructor(
    private readonly queryService: DestinationQueryService,
    private readonly aiService: AiService,
    private readonly cacheService: CacheService,
    private readonly config: ConfigService,
    private readonly trekService: TrekService,
  ) {}
```

Update the `search` method to check trek intent first:

```typescript
  async search(dto: SearchDestinationsDto) {
    const aiMode = this.config.get<string>('DESTINATION_FINDER_AI_MODE', 'hybrid');

    const { freeText, ...rest } = dto;
    const cacheKey = this.cacheService.buildKey({
      ...rest,
      normalizedFreeText: this.cacheService.normalizeText(freeText),
    });

    const cached = await this.cacheService.get(cacheKey);
    if (cached) return cached;

    try {
      let result;

      if (this.trekService.isTrekkingIntent(dto.experienceTypes, dto.freeText)) {
        result = await this.runTrekMode(dto);
      }

      if (!result) {
        result = aiMode === 'ai_full' ? await this.runAiFull(dto) : await this.runHybrid(dto);
      }

      await this.cacheService.set(cacheKey, result, 86400);
      return result;
    } catch (error) {
      this.logger.error('AI API error during search', error);
      throw new HttpException(
        'Our AI is temporarily unavailable. Please try again in a moment.',
        HttpStatus.SERVICE_UNAVAILABLE,
      );
    }
  }
```

Add the `runTrekMode` private method after `search`:

```typescript
  private async runTrekMode(dto: SearchDestinationsDto) {
    const filtered = this.trekService.filterForSearch({
      dates: dto.dates,
      age: dto.age,
      medicalConditions: dto.medicalConditions,
    });

    if (filtered.length === 0) {
      this.logger.warn('No treks match filters — falling back to normal search');
      return null;
    }

    const prompt = buildTrekPrompt({ ...dto, treks: filtered });
    const treks = await this.aiService.rankTreks(prompt);

    if (treks.length === 0) {
      this.logger.warn('AI returned no trek results — falling back to normal search');
      return null;
    }

    return { mode: 'trek', results: treks };
  }
```

- [ ] **Step 5: Update existing service spec tests**

The existing `beforeEach` constructs `service` with 4 args. Update all of them to pass the `trekService` mock as the 5th arg. The `trekService` mock should default `isTrekkingIntent` to return `false` so existing tests don't accidentally trigger trek mode:

In the outer `beforeEach`:

```typescript
    trekService = { isTrekkingIntent: jest.fn().mockReturnValue(false), filterForSearch: jest.fn() } as any;

    service = new DestinationFinderService(queryService, aiService, cacheService, configService, trekService);
```

Move `trekService` declaration to the outer describe scope (alongside `service`, `queryService`, etc.).

- [ ] **Step 6: Run all tests**

Run: `cd /home/abhishek/Desktop/Abhishek/Sarthi/sarthi-backend && npx jest`
Expected: ALL PASS

---

### Task 6: Build, verify, update Postman collection

**Files:**
- Modify: `Sarthi-Phase1.postman_collection.json`

- [ ] **Step 1: Build the app**

Run: `npm run build`
Expected: Build succeeds with no errors

- [ ] **Step 2: Run full test suite**

Run: `npx jest`
Expected: All tests pass

- [ ] **Step 3: Update Postman collection with trek search scenarios**

Add two new items to the "Destination Finder" folder in `Sarthi-Phase1.postman_collection.json`:

**"Trek Search — challenging high altitude":**
```json
{
  "dates": { "from": "2026-06-01", "to": "2026-06-08" },
  "budget": { "min": 5000, "max": 25000 },
  "group": { "size": 2, "type": "friends" },
  "experienceTypes": ["trekking", "adventure"],
  "departureCity": "Delhi",
  "freeText": "Looking for a challenging high altitude trek with snow and stunning views",
  "gender": "male",
  "age": 25,
  "weight": 68,
  "height": 178
}
```

Test assertions:
- Status 200
- `res.mode` equals `'trek'`
- `res.results` is array, not empty
- Each result has `name`, `baseCamp`, `peakAltitude`, `difficulty`, `durationDays`
- Each result has `healthAdvisory`, `costBreakdown`, `permits`, `tripReadiness`

**"Trek Search — easy trek for senior with knee issue":**
```json
{
  "dates": { "from": "2026-10-15", "to": "2026-10-20" },
  "budget": { "min": 3000, "max": 15000 },
  "group": { "size": 3, "type": "family" },
  "experienceTypes": ["trekking", "nature"],
  "departureCity": "Mumbai",
  "freeText": "Easy trek suitable for older adults, scenic nature walk",
  "gender": "male",
  "age": 60,
  "weight": 75,
  "height": 168,
  "medicalConditions": ["knee_issue"]
}
```

Test assertions:
- Status 200
- `res.mode` equals `'trek'`
- Each result has `healthAdvisory`
- `healthAdvisory.suitability` exists

- [ ] **Step 4: Verify collection is valid JSON**

Run: `python3 -m json.tool Sarthi-Phase1.postman_collection.json > /dev/null`
Expected: No errors
