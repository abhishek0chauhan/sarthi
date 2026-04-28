# Phase 2C: Trip Enrichment Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Make saved trips useful on the ground — place context cards, one-tap navigation, editable itinerary, local phrasebook, and trip chat.

**Architecture:** All new features live in the existing `saved-trips` module (new services added alongside `SavedTripsService`). Schema and prompt extensions follow the same patterns established in Phase 2B — optional fields, free-model slim format with paid-model format preserved as comments. `placeContext` and `mapQuery` are added to the itinerary/food schemas as optional fields so existing saved trips continue to work. `TripChatMessage` is a new Prisma model. `phrasebookData` is a new JSON column on `SavedTrip`.

**Tech Stack:** NestJS v11, Prisma 5, PostgreSQL, Firebase Auth (via FirebaseAuthGuard), Vercel AI SDK (`generateText`), Zod v4, Jest 30. `PrismaService` and `AiService` are both `@Global()` — no explicit module imports needed for them.

---

## File Map

| File | Action | Responsibility |
|---|---|---|
| `prisma/schema.prisma` | Modify | Add `phrasebookData Json?` to `SavedTrip`; add `TripChatMessage` model |
| `src/ai/schemas/destination.schema.ts` | Modify | Add `activityPlaceContextSchema`, `dishPlaceContextSchema`, `mapQuery` field, `activitySuggestionSchema` |
| `src/ai/prompts/destination.prompt.ts` | Modify | Add `mapQuery` to itinerary activity + food dish formats; add `buildSuggestReplacementPrompt` |
| `src/ai/schemas/phrasebook.schema.ts` | **Create** | Zod schema for phrasebook AI response |
| `src/ai/prompts/phrasebook.prompt.ts` | **Create** | `buildPhrasebookPrompt(destination, state)` |
| `src/ai/ai.service.ts` | Modify | Add `generatePhrasebook()`, `suggestActivityReplacement()`, `tripChat()` |
| `src/saved-trips/dto/add-activity.dto.ts` | **Create** | DTO for adding or swapping an itinerary activity |
| `src/saved-trips/dto/chat-message.dto.ts` | **Create** | DTO for trip chat message |
| `src/saved-trips/saved-trips.service.ts` | Modify | Add itinerary edit operations + correction logging + suggest-replacement |
| `src/saved-trips/saved-trips.service.spec.ts` | Modify | Add tests for itinerary edit operations |
| `src/saved-trips/phrasebook.service.ts` | **Create** | Generate + store phrasebook per trip |
| `src/saved-trips/phrasebook.service.spec.ts` | **Create** | Unit tests |
| `src/saved-trips/trip-chat.service.ts` | **Create** | Trip chat with rate limiting + persistence |
| `src/saved-trips/trip-chat.service.spec.ts` | **Create** | Unit tests |
| `src/saved-trips/saved-trips.controller.ts` | Modify | Add itinerary-edit, phrasebook, chat, suggest endpoints |
| `src/saved-trips/saved-trips.module.ts` | Modify | Register new services; import `CorrectionsModule` + `ProfileModule` |

---

## Group A — Place Context Cards + Smart Map Links

### Task 1: Schema extensions — placeContext + mapQuery + suggestion schema

**Files:**
- Modify: `src/ai/schemas/destination.schema.ts`
- Modify: `src/ai/schemas/destination.schema.spec.ts`

- [ ] **Step 1: Write failing tests**

Add these tests to `src/ai/schemas/destination.schema.spec.ts` — append after the existing `itineraryResponseSchema` describe block:

```typescript
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
    expect(result.placeContext?.whySpecial).toBe('One of the oldest living root bridges');
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
      personalMatch: { matchLevel: 'great_match', reason: 'Offbeat, no crowds' },
    });
    expect(result.activity).toBe('Wei Sawdong Waterfall');
    expect(result.personalMatch?.matchLevel).toBe('great_match');
  });

  it('parses suggestion without personalMatch', () => {
    const result = activitySuggestionSchema.parse({ activity: 'Some place' });
    expect(result.personalMatch).toBeUndefined();
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

```bash
cd C:\Users\Abhishek\OneDrive\Desktop\Sarthi\sarthi-backend && npx jest src/ai/schemas/destination.schema.spec.ts --no-coverage 2>&1 | tail -8
```

Expected: FAIL — `activitySuggestionSchema is not exported`

- [ ] **Step 3: Update `src/ai/schemas/destination.schema.ts`**

After the `tripReadinessSchema` block and before `rankResultSchema`, add:

```typescript
export const activityPlaceContextSchema = z.object({
  whySpecial: z.string().optional().default(''),
  bestTimeToVisit: z.string().optional().default(''),
  suggestedDuration: z.string().optional().default(''),
  insiderTips: z.array(z.string()).optional().default([]),
  whatToCarry: z.array(z.string()).optional().default([]),
  nearbyAlternative: z.string().optional(),
}).optional();

export const dishPlaceContextSchema = z.object({
  bestTimeToVisit: z.string().optional().default(''),
  insiderTips: z.array(z.string()).optional().default([]),
}).optional();
```

Update `itineraryActivitySchema` to:

```typescript
export const itineraryActivitySchema = z.object({
  time: z.string().optional().default(''),
  activity: z.string(),
  cost: z.string().optional().default(''),
  healthNote: z.string().optional().default(''),
  mapQuery: z.string().optional().default(''),
  placeContext: activityPlaceContextSchema,
});
```

Update `dishSchema` to add two fields after `tasteProfile`:

```typescript
  mapQuery: z.string().optional().default(''),
  placeContext: dishPlaceContextSchema,
```

Update `streetFoodItemSchema` to add after `tasteProfile`:

```typescript
  mapQuery: z.string().optional().default(''),
```

After the type exports at the bottom of the file, add the suggestion schema and exports:

```typescript
export const activitySuggestionSchema = z.object({
  time: z.string().optional().default(''),
  activity: z.string(),
  cost: z.string().optional().default(''),
  healthNote: z.string().optional().default(''),
  mapQuery: z.string().optional().default(''),
  personalMatch: personalMatchSchema,
});

export const suggestionsResponseWrapperSchema = z.object({
  result: z.object({
    suggestions: z.array(activitySuggestionSchema),
  }),
});

export type ActivitySuggestion = z.infer<typeof activitySuggestionSchema>;
export type ActivityPlaceContext = z.infer<typeof activityPlaceContextSchema>;
```

- [ ] **Step 4: Run tests to verify they pass**

```bash
cd C:\Users\Abhishek\OneDrive\Desktop\Sarthi\sarthi-backend && npx jest src/ai/schemas/destination.schema.spec.ts --no-coverage 2>&1 | tail -5
```

Expected: All tests pass.

- [ ] **Step 5: Verify full suite still passes**

```bash
cd C:\Users\Abhishek\OneDrive\Desktop\Sarthi\sarthi-backend && npx jest --no-coverage 2>&1 | grep -E "Tests:|Suites:" | tail -3
```

Expected: All 272+ tests pass.

---

### Task 2: Prompt extensions — mapQuery + buildSuggestReplacementPrompt

**Files:**
- Modify: `src/ai/prompts/destination.prompt.ts`
- Modify: `src/ai/prompts/destination.prompt.spec.ts`

- [ ] **Step 1: Write failing tests**

Add to `src/ai/prompts/destination.prompt.spec.ts` — update the import to include `buildSuggestReplacementPrompt`:

```typescript
import { ..., buildSuggestReplacementPrompt } from './destination.prompt';
```

Append these describe blocks at the end of the spec file:

```typescript
describe('buildItineraryPrompt — mapQuery', () => {
  const itineraryParams = {
    destination: 'Cherrapunji',
    state: 'Meghalaya',
    freeText: 'want to see waterfalls',
    group: { size: 2, type: 'couple' },
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
    group: { size: 2, type: 'couple' },
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
      dayActivities: ['09:00 AM: Crowded waterfall tour', '02:00 PM: Local market'],
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
```

- [ ] **Step 2: Run tests to verify they fail**

```bash
cd C:\Users\Abhishek\OneDrive\Desktop\Sarthi\sarthi-backend && npx jest src/ai/prompts/destination.prompt.spec.ts --no-coverage -t "mapQuery|buildSuggestReplacementPrompt" 2>&1 | tail -5
```

Expected: FAIL — `buildSuggestReplacementPrompt is not exported`

- [ ] **Step 3: Update `buildItineraryPrompt` in `destination.prompt.ts`**

In the `buildItineraryPrompt` function, the user prompt ends with the format string. Update the activities section of the format string to include `mapQuery`:

Find this in the format string:
```
"activities":[{"time":"<HH:MM AM/PM>","activity":"<description>","cost":"<₹ amount>","healthNote":"<note or empty>"}]
```

Replace with:
```
"activities":[{"time":"<HH:MM AM/PM>","activity":"<description>","cost":"<₹ amount>","healthNote":"<note or empty>","mapQuery":"<place name, area, city>"}]
```

Also add a comment for paid-model placeContext (do NOT add it to the active format string — free model will truncate):

After the format string closing brace, add a comment:
```typescript
// --- PAID MODEL: add to each activity (comment out slim mapQuery, uncomment below) ---
// "placeContext":{"whySpecial":"<one sentence>","bestTimeToVisit":"<one line>","suggestedDuration":"<e.g. 2-3 hours>","insiderTips":["<tip>"],"whatToCarry":["<item>"],"nearbyAlternative":"<or omit>"}}
```

- [ ] **Step 4: Update `buildFoodGuidePrompt` in `destination.prompt.ts`**

In `slimFormat`, add `"mapQuery":"<restaurant name, area, city>"` to each dish in `mustTryDishes` and each item in `streetFood.items`.

The current slim must-try dish format in `slimFormat` is:
```
"mustTryDishes":[{"name":"<dish>","description":"<one line>","where":"<area>","priceRange":"<₹>","spiceLevel":"<mild/medium/hot>","healthNote":"<one line>","allergens":[]}]
```

Update to:
```
"mustTryDishes":[{"name":"<dish>","description":"<one line>","where":"<area>","priceRange":"<₹>","spiceLevel":"<mild/medium/hot>","healthNote":"<one line>","allergens":[],"mapQuery":"<restaurant name, area, city>"}]
```

Similarly update `streetFood.items` in slimFormat to include `"mapQuery":"<stall name or area, city>"`.

Also update the `paidFormat` in the commented block with the same mapQuery additions.

- [ ] **Step 5: Add `buildSuggestReplacementPrompt` to `destination.prompt.ts`**

Add this interface and function after `buildCorrectionsBlock`:

```typescript
export interface SuggestReplacementParams {
  destination: string;
  state: string;
  day: number;
  currentActivity: { time: string; activity: string };
  dayActivities: string[];  // other activities in the same day as context
  profile?: TravelerProfileSnapshot | null;
  corrections?: CorrectionRecord[];
}

export function buildSuggestReplacementPrompt(params: SuggestReplacementParams): { system: string; user: string } {
  const personalityBlock = buildPersonalityBlock(params.profile ?? null);
  const correctionsBlock = buildCorrectionsBlock(params.corrections ?? []);

  const dayContext = params.dayActivities.length > 0
    ? `\nOther activities on Day ${params.day}: ${params.dayActivities.join(' | ')}`
    : '';

  return {
    system: 'You are an expert Indian travel planner. Suggest specific, named alternative activities that fit the traveler\'s personality and avoid their past dislikes.',
    user: `Suggest 2-3 alternative activities to replace this one:

Trip: ${params.destination}, ${params.state}
Day ${params.day}, ${params.currentActivity.time}: "${params.currentActivity.activity}"${dayContext}${personalityBlock}${correctionsBlock}

Respond ONLY with a JSON object in exactly this format (no extra text):
{"result":{"suggestions":[{"time":"${params.currentActivity.time}","activity":"<named place or activity>","cost":"<₹ or free>","healthNote":"<one line or empty>","mapQuery":"<place name, area, city, state>","personalMatch":{"matchLevel":"<great_match|good_match|heads_up|not_your_style>","reason":"<one sentence>"}}]}}

Max 3 suggestions, best match first.`,
  };
}
```

- [ ] **Step 6: Run all prompt tests**

```bash
cd C:\Users\Abhishek\OneDrive\Desktop\Sarthi\sarthi-backend && npx jest src/ai/prompts/destination.prompt.spec.ts --no-coverage 2>&1 | tail -5
```

Expected: All tests pass (existing + 8 new).

- [ ] **Step 7: Build check**

```bash
cd C:\Users\Abhishek\OneDrive\Desktop\Sarthi\sarthi-backend && npm run build 2>&1 | tail -5
```

Expected: No errors.

---

## Group B — Local Phrasebook

### Task 3: Prisma schema — phrasebookData + TripChatMessage

**Files:**
- Modify: `prisma/schema.prisma`

- [ ] **Step 1: Update schema**

Add `phrasebookData Json?` to `SavedTrip` (after `foodGuideData`):

```prisma
  foodGuideData   Json?
  phrasebookData  Json?
```

Append `TripChatMessage` model at the end of the file:

```prisma
model TripChatMessage {
  id        String   @id @default(uuid())
  tripId    String
  trip      SavedTrip @relation(fields: [tripId], references: [id], onDelete: Cascade)
  role      String
  content   String
  createdAt DateTime @default(now())

  @@index([tripId, createdAt])
}
```

Also add to `SavedTrip` model (after `shareToken` line):
```prisma
  chatMessages    TripChatMessage[]
```

- [ ] **Step 2: Run migration**

```bash
cd C:\Users\Abhishek\OneDrive\Desktop\Sarthi\sarthi-backend && npx prisma migrate dev --name add-phrasebook-trip-chat
```

Expected: Migration created and applied. Prisma Client regenerated.

- [ ] **Step 3: Verify build**

```bash
cd C:\Users\Abhishek\OneDrive\Desktop\Sarthi\sarthi-backend && npm run build 2>&1 | tail -5
```

Expected: No errors.

---

### Task 4: Phrasebook schema + prompt + AI method

**Files:**
- Create: `src/ai/schemas/phrasebook.schema.ts`
- Create: `src/ai/schemas/phrasebook.schema.spec.ts`
- Create: `src/ai/prompts/phrasebook.prompt.ts`
- Modify: `src/ai/ai.service.ts`

- [ ] **Step 1: Write failing test**

Create `src/ai/schemas/phrasebook.schema.spec.ts`:

```typescript
import { phrasebookWrapperSchema } from './phrasebook.schema';

describe('phrasebookWrapperSchema', () => {
  const validPhrasebook = {
    result: {
      language: 'Khasi',
      greeting: [{ english: 'Hello', local: 'Khublei', pronunciation: 'khoo-blay' }],
      food: [{ english: 'How much?', local: 'Katno?', pronunciation: 'kat-no' }],
      directions: [{ english: 'Where is...?', local: 'Hangta dei?', pronunciation: 'hang-ta day' }],
      emergency: [{ english: 'Help!', local: 'Thaw bun!', pronunciation: 'thaw boon' }],
      bargaining: [{ english: 'Too expensive', local: 'Booh pynsit', pronunciation: 'boo pin-sit' }],
      culturalNotes: ['Khasi society is matrilineal — women are highly respected'],
    },
  };

  it('parses a valid phrasebook', () => {
    const result = phrasebookWrapperSchema.parse(validPhrasebook);
    expect(result.result.language).toBe('Khasi');
    expect(result.result.greeting[0].local).toBe('Khublei');
    expect(result.result.culturalNotes).toHaveLength(1);
  });

  it('allows optional script field', () => {
    const withScript = { result: { ...validPhrasebook.result, script: 'Latin' } };
    const result = phrasebookWrapperSchema.parse(withScript);
    expect(result.result.script).toBe('Latin');
  });

  it('defaults missing phrase categories to empty arrays', () => {
    const minimal = {
      result: {
        language: 'Khasi',
        greeting: [],
        food: [],
        directions: [],
        emergency: [],
        bargaining: [],
        culturalNotes: [],
      },
    };
    const result = phrasebookWrapperSchema.parse(minimal);
    expect(result.result.greeting).toEqual([]);
  });

  it('rejects a phrase missing english field', () => {
    const bad = {
      result: {
        ...validPhrasebook.result,
        greeting: [{ local: 'Khublei', pronunciation: 'khoo-blay' }],
      },
    };
    expect(() => phrasebookWrapperSchema.parse(bad)).toThrow();
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

```bash
cd C:\Users\Abhishek\OneDrive\Desktop\Sarthi\sarthi-backend && npx jest src/ai/schemas/phrasebook.schema.spec.ts --no-coverage 2>&1 | tail -5
```

Expected: FAIL — `Cannot find module './phrasebook.schema'`

- [ ] **Step 3: Create `src/ai/schemas/phrasebook.schema.ts`**

```typescript
import { z } from 'zod';

const phraseSchema = z.object({
  english: z.string(),
  local: z.string(),
  pronunciation: z.string(),
});

export const phrasebookSchema = z.object({
  language: z.string(),
  script: z.string().optional(),
  greeting: z.array(phraseSchema).default([]),
  food: z.array(phraseSchema).default([]),
  directions: z.array(phraseSchema).default([]),
  emergency: z.array(phraseSchema).default([]),
  bargaining: z.array(phraseSchema).default([]),
  culturalNotes: z.array(z.string()).default([]),
});

export const phrasebookWrapperSchema = z.object({
  result: phrasebookSchema,
});

export type Phrasebook = z.infer<typeof phrasebookSchema>;
```

- [ ] **Step 4: Run tests to verify they pass**

```bash
cd C:\Users\Abhishek\OneDrive\Desktop\Sarthi\sarthi-backend && npx jest src/ai/schemas/phrasebook.schema.spec.ts --no-coverage 2>&1 | tail -5
```

Expected: 4 tests pass.

- [ ] **Step 5: Create `src/ai/prompts/phrasebook.prompt.ts`**

```typescript
export function buildPhrasebookPrompt(destination: string, state: string): { system: string; user: string } {
  return {
    system: 'You are a travel language assistant specializing in Indian regional languages and local travel culture.',
    user: `Generate a practical travel phrasebook for ${destination}, ${state}.

Include 3 phrases per category. Transliterate local language into Latin script for easy reading. Keep pronunciation guides simple (e.g. "khoo-blay" not IPA).

Respond ONLY with a JSON object in exactly this format (no extra text):
{"result":{"language":"<local language name>","script":"<writing system if non-Latin, else omit>","greeting":[{"english":"<phrase>","local":"<transliterated>","pronunciation":"<phonetic guide>"}],"food":[{"english":"<phrase>","local":"<transliterated>","pronunciation":"<phonetic guide>"}],"directions":[{"english":"<phrase>","local":"<transliterated>","pronunciation":"<phonetic guide>"}],"emergency":[{"english":"<phrase>","local":"<transliterated>","pronunciation":"<phonetic guide>"}],"bargaining":[{"english":"<phrase>","local":"<transliterated>","pronunciation":"<phonetic guide>"}],"culturalNotes":["<important cultural note for visitors>"]}}`,
  };
}
```

- [ ] **Step 6: Add `generatePhrasebook()` to `src/ai/ai.service.ts`**

Add import at the top:
```typescript
import { phrasebookWrapperSchema } from './schemas/phrasebook.schema';
import type { Phrasebook } from './schemas/phrasebook.schema';
import { buildPhrasebookPrompt } from './prompts/phrasebook.prompt';
```

Add method inside `AiService`:
```typescript
  async generatePhrasebook(destination: string, state: string): Promise<Phrasebook> {
    const prompt = buildPhrasebookPrompt(destination, state);
    const result = await generateJson({
      model: this.model,
      schema: phrasebookWrapperSchema,
      system: prompt.system,
      prompt: prompt.user,
    });
    return result.result;
  }
```

- [ ] **Step 7: Add `suggestActivityReplacement()` to `src/ai/ai.service.ts`**

Add imports:
```typescript
import { buildSuggestReplacementPrompt } from './prompts/destination.prompt';
import type { SuggestReplacementParams } from './prompts/destination.prompt';
import { suggestionsResponseWrapperSchema } from './schemas/destination.schema';
import type { ActivitySuggestion } from './schemas/destination.schema';
```

Add method:
```typescript
  async suggestActivityReplacement(params: SuggestReplacementParams): Promise<ActivitySuggestion[]> {
    const prompt = buildSuggestReplacementPrompt(params);
    const result = await generateJson({
      model: this.model,
      schema: suggestionsResponseWrapperSchema,
      system: prompt.system,
      prompt: prompt.user,
    });
    return result.result.suggestions.slice(0, 3);
  }
```

- [ ] **Step 8: Add `tripChat()` to `src/ai/ai.service.ts`**

Add import:
```typescript
import { generateText } from 'ai';
```

Note: `generateText` is already imported inside `generate-json.ts`. Import it directly in `ai.service.ts`:

Add method:
```typescript
  async tripChat(system: string, userMessage: string): Promise<string> {
    const { text } = await generateText({
      model: this.model,
      maxOutputTokens: 1024,
      system,
      prompt: userMessage,
    });
    return text.trim();
  }
```

- [ ] **Step 9: Verify build**

```bash
cd C:\Users\Abhishek\OneDrive\Desktop\Sarthi\sarthi-backend && npm run build 2>&1 | tail -5
```

Expected: No errors.

---

### Task 5: Phrasebook service + controller endpoints

**Files:**
- Create: `src/saved-trips/phrasebook.service.ts`
- Create: `src/saved-trips/phrasebook.service.spec.ts`
- Modify: `src/saved-trips/saved-trips.controller.ts`
- Modify: `src/saved-trips/saved-trips.module.ts`

- [ ] **Step 1: Write failing tests**

Create `src/saved-trips/phrasebook.service.spec.ts`:

```typescript
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
```

- [ ] **Step 2: Run test to verify it fails**

```bash
cd C:\Users\Abhishek\OneDrive\Desktop\Sarthi\sarthi-backend && npx jest src/saved-trips/phrasebook.service.spec.ts --no-coverage 2>&1 | tail -5
```

Expected: FAIL — `Cannot find module './phrasebook.service'`

- [ ] **Step 3: Create `src/saved-trips/phrasebook.service.ts`**

```typescript
import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { AiService } from '../ai/ai.service';
import { SavedTripsService } from './saved-trips.service';
import { Prisma } from '@prisma/client';

interface FirebaseUser { uid: string; name?: string; email?: string; }

@Injectable()
export class PhrasebookService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly aiService: AiService,
    private readonly savedTripsService: SavedTripsService,
  ) {}

  async getPhrasebook(tripId: string, fbUser: FirebaseUser) {
    const trip = await this.savedTripsService.getById(tripId, fbUser);
    return trip.phrasebookData ?? null;
  }

  async generateAndStore(tripId: string, fbUser: FirebaseUser) {
    const trip = await this.savedTripsService.getById(tripId, fbUser);
    const phrasebook = await this.aiService.generatePhrasebook(trip.destination, trip.state);
    await this.prisma.savedTrip.update({
      where: { id: tripId },
      data: { phrasebookData: phrasebook as unknown as Prisma.JsonValue },
    });
    return phrasebook;
  }
}
```

- [ ] **Step 4: Run tests to verify they pass**

```bash
cd C:\Users\Abhishek\OneDrive\Desktop\Sarthi\sarthi-backend && npx jest src/saved-trips/phrasebook.service.spec.ts --no-coverage 2>&1 | tail -5
```

Expected: 3 tests pass.

- [ ] **Step 5: Add phrasebook endpoints to `src/saved-trips/saved-trips.controller.ts`**

Add `Put` to the imports from `@nestjs/common`:
```typescript
import { Body, Controller, Delete, Get, HttpCode, Param, Patch, Post, Put, Req, UseGuards } from '@nestjs/common';
```

Add `PhrasebookService` import:
```typescript
import { PhrasebookService } from './phrasebook.service';
```

Add to constructor:
```typescript
  constructor(
    private readonly service: SavedTripsService,
    private readonly phrasebookService: PhrasebookService,
  ) {}
```

Add new endpoints at the bottom of `SavedTripsController`:
```typescript
  @Post(':id/phrasebook')
  @HttpCode(200)
  async generatePhrasebook(@Param('id') id: string, @Req() req: any) {
    return this.phrasebookService.generateAndStore(id, req.user);
  }

  @Get(':id/phrasebook')
  async getPhrasebook(@Param('id') id: string, @Req() req: any) {
    return this.phrasebookService.getPhrasebook(id, req.user);
  }
```

- [ ] **Step 6: Update `src/saved-trips/saved-trips.module.ts`**

```typescript
import { Module } from '@nestjs/common';
import { SavedTripsController } from './saved-trips.controller';
import { SavedTripsService } from './saved-trips.service';
import { UserService } from './user.service';
import { PhrasebookService } from './phrasebook.service';

@Module({
  controllers: [SavedTripsController],
  providers: [SavedTripsService, UserService, PhrasebookService],
  exports: [SavedTripsService],
})
export class SavedTripsModule {}
```

- [ ] **Step 7: Run all saved-trips tests**

```bash
cd C:\Users\Abhishek\OneDrive\Desktop\Sarthi\sarthi-backend && npx jest src/saved-trips/ --no-coverage 2>&1 | tail -5
```

Expected: All pass.

- [ ] **Step 8: Build check**

```bash
cd C:\Users\Abhishek\OneDrive\Desktop\Sarthi\sarthi-backend && npm run build 2>&1 | tail -5
```

Expected: No errors.

---

## Group C — Editable Itinerary

### Task 6: Itinerary edit DTOs + SavedTripsService edit operations

**Files:**
- Create: `src/saved-trips/dto/add-activity.dto.ts`
- Modify: `src/saved-trips/saved-trips.service.ts`
- Modify: `src/saved-trips/saved-trips.service.spec.ts`

- [ ] **Step 1: Create `src/saved-trips/dto/add-activity.dto.ts`**

```typescript
import { IsString, IsOptional, IsNumber, Min } from 'class-validator';

export class AddActivityDto {
  @IsString()
  activity: string;

  @IsOptional()
  @IsString()
  time?: string;

  @IsOptional()
  @IsString()
  cost?: string;

  @IsOptional()
  @IsString()
  healthNote?: string;

  @IsOptional()
  @IsNumber()
  @Min(0)
  position?: number;
}
```

- [ ] **Step 2: Write failing tests for edit operations**

Add these describe blocks to `src/saved-trips/saved-trips.service.spec.ts`.

First, update `mockTrip` at the top to include a non-null `itineraryData`:

```typescript
const mockItinerary = {
  destination: 'Goa',
  totalEstimate: '₹30k',
  itinerary: [
    {
      day: 1,
      title: 'Arrival',
      activities: [
        { time: '10:00 AM', activity: 'Check in', cost: '₹2000', healthNote: '' },
        { time: '03:00 PM', activity: 'Beach walk', cost: 'Free', healthNote: '' },
      ],
      meals: { breakfast: '', lunch: '', dinner: '' },
      healthNote: '',
    },
    {
      day: 2,
      title: 'Explore',
      activities: [
        { time: '09:00 AM', activity: 'Fort tour', cost: '₹50', healthNote: '' },
      ],
      meals: { breakfast: '', lunch: '', dinner: '' },
      healthNote: '',
    },
  ],
  packingList: [],
};

const mockTripWithItinerary = {
  ...mockTrip,
  itineraryData: mockItinerary,
};
```

Append describe blocks:

```typescript
describe('addActivity', () => {
  it('appends activity to end of day by default', async () => {
    userService.findOrCreate.mockResolvedValue(mockUser);
    prisma.savedTrip.findUnique.mockResolvedValue(mockTripWithItinerary);
    prisma.savedTrip.update.mockImplementation(({ data }) => Promise.resolve({
      ...mockTripWithItinerary,
      itineraryData: data.itineraryData,
    }));

    await service.addActivity('trip-1', 1, { activity: 'Sunset cruise' }, { uid: 'fb-123' } as any);

    const updateCall = prisma.savedTrip.update.mock.calls[0][0];
    const updatedDay = (updateCall.data.itineraryData as any).itinerary[0];
    expect(updatedDay.activities).toHaveLength(3);
    expect(updatedDay.activities[2].activity).toBe('Sunset cruise');
  });

  it('inserts activity at specified position', async () => {
    userService.findOrCreate.mockResolvedValue(mockUser);
    prisma.savedTrip.findUnique.mockResolvedValue(mockTripWithItinerary);
    prisma.savedTrip.update.mockImplementation(({ data }) => Promise.resolve({
      ...mockTripWithItinerary,
      itineraryData: data.itineraryData,
    }));

    await service.addActivity('trip-1', 1, { activity: 'Market visit', position: 0 }, { uid: 'fb-123' } as any);

    const updateCall = prisma.savedTrip.update.mock.calls[0][0];
    const updatedDay = (updateCall.data.itineraryData as any).itinerary[0];
    expect(updatedDay.activities[0].activity).toBe('Market visit');
  });

  it('throws NotFoundException when itinerary has no such day', async () => {
    userService.findOrCreate.mockResolvedValue(mockUser);
    prisma.savedTrip.findUnique.mockResolvedValue(mockTripWithItinerary);

    await expect(
      service.addActivity('trip-1', 99, { activity: 'anything' }, { uid: 'fb-123' } as any),
    ).rejects.toThrow('Day 99 not found in itinerary');
  });
});

describe('removeActivity', () => {
  it('removes activity at given index', async () => {
    userService.findOrCreate.mockResolvedValue(mockUser);
    prisma.savedTrip.findUnique.mockResolvedValue(mockTripWithItinerary);
    prisma.savedTrip.update.mockImplementation(({ data }) => Promise.resolve({
      ...mockTripWithItinerary,
      itineraryData: data.itineraryData,
    }));

    await service.removeActivity('trip-1', 1, 0, { uid: 'fb-123' } as any);

    const updateCall = prisma.savedTrip.update.mock.calls[0][0];
    const updatedDay = (updateCall.data.itineraryData as any).itinerary[0];
    expect(updatedDay.activities).toHaveLength(1);
    expect(updatedDay.activities[0].activity).toBe('Beach walk');
  });

  it('throws BadRequestException for out-of-range index', async () => {
    userService.findOrCreate.mockResolvedValue(mockUser);
    prisma.savedTrip.findUnique.mockResolvedValue(mockTripWithItinerary);

    await expect(
      service.removeActivity('trip-1', 1, 99, { uid: 'fb-123' } as any),
    ).rejects.toThrow();
  });
});

describe('swapActivity', () => {
  it('replaces activity at index', async () => {
    userService.findOrCreate.mockResolvedValue(mockUser);
    prisma.savedTrip.findUnique.mockResolvedValue(mockTripWithItinerary);
    prisma.savedTrip.update.mockImplementation(({ data }) => Promise.resolve({
      ...mockTripWithItinerary,
      itineraryData: data.itineraryData,
    }));

    await service.swapActivity('trip-1', 1, 0, { activity: 'Yoga session' }, { uid: 'fb-123' } as any);

    const updateCall = prisma.savedTrip.update.mock.calls[0][0];
    const updatedDay = (updateCall.data.itineraryData as any).itinerary[0];
    expect(updatedDay.activities[0].activity).toBe('Yoga session');
  });
});

describe('reorderActivities', () => {
  it('reorders activities by new index array', async () => {
    userService.findOrCreate.mockResolvedValue(mockUser);
    prisma.savedTrip.findUnique.mockResolvedValue(mockTripWithItinerary);
    prisma.savedTrip.update.mockImplementation(({ data }) => Promise.resolve({
      ...mockTripWithItinerary,
      itineraryData: data.itineraryData,
    }));

    // Swap order: [1, 0] means new first = old index 1, new second = old index 0
    await service.reorderActivities('trip-1', 1, [1, 0], { uid: 'fb-123' } as any);

    const updateCall = prisma.savedTrip.update.mock.calls[0][0];
    const updatedDay = (updateCall.data.itineraryData as any).itinerary[0];
    expect(updatedDay.activities[0].activity).toBe('Beach walk');
    expect(updatedDay.activities[1].activity).toBe('Check in');
  });
});
```

- [ ] **Step 3: Run tests to verify they fail**

```bash
cd C:\Users\Abhishek\OneDrive\Desktop\Sarthi\sarthi-backend && npx jest src/saved-trips/saved-trips.service.spec.ts --no-coverage -t "addActivity|removeActivity|swapActivity|reorderActivities" 2>&1 | tail -5
```

Expected: FAIL — `service.addActivity is not a function`

- [ ] **Step 4: Add edit methods to `src/saved-trips/saved-trips.service.ts`**

Add to the imports at the top:
```typescript
import { Injectable, ForbiddenException, NotFoundException, BadRequestException } from '@nestjs/common';
```

Add these helper and edit methods to `SavedTripsService` (after `getShared`):

```typescript
  private getItineraryDay(itineraryData: any, day: number) {
    if (!itineraryData?.itinerary) throw new NotFoundException('No itinerary on this trip');
    const dayObj = itineraryData.itinerary.find((d: any) => d.day === day);
    if (!dayObj) throw new NotFoundException(`Day ${day} not found in itinerary`);
    return dayObj;
  }

  private async updateItinerary(tripId: string, itineraryData: any) {
    return this.prisma.savedTrip.update({
      where: { id: tripId },
      data: { itineraryData: itineraryData as unknown as Prisma.JsonValue },
    });
  }

  async addActivity(tripId: string, day: number, dto: AddActivityDto, fbUser: FirebaseUser) {
    const trip = await this.getById(tripId, fbUser);
    const itinerary = JSON.parse(JSON.stringify(trip.itineraryData)) as any;
    const dayObj = this.getItineraryDay(itinerary, day);

    const newActivity = {
      time: dto.time ?? '',
      activity: dto.activity,
      cost: dto.cost ?? '',
      healthNote: dto.healthNote ?? '',
    };

    if (dto.position !== undefined && dto.position >= 0 && dto.position <= dayObj.activities.length) {
      dayObj.activities.splice(dto.position, 0, newActivity);
    } else {
      dayObj.activities.push(newActivity);
    }

    return this.updateItinerary(tripId, itinerary);
  }

  async removeActivity(tripId: string, day: number, activityIndex: number, fbUser: FirebaseUser) {
    const trip = await this.getById(tripId, fbUser);
    const itinerary = JSON.parse(JSON.stringify(trip.itineraryData)) as any;
    const dayObj = this.getItineraryDay(itinerary, day);

    if (activityIndex < 0 || activityIndex >= dayObj.activities.length) {
      throw new BadRequestException(`Activity index ${activityIndex} out of range`);
    }

    const removed = dayObj.activities[activityIndex];
    dayObj.activities.splice(activityIndex, 1);

    return { removed, trip: await this.updateItinerary(tripId, itinerary) };
  }

  async swapActivity(tripId: string, day: number, activityIndex: number, dto: AddActivityDto, fbUser: FirebaseUser) {
    const trip = await this.getById(tripId, fbUser);
    const itinerary = JSON.parse(JSON.stringify(trip.itineraryData)) as any;
    const dayObj = this.getItineraryDay(itinerary, day);

    if (activityIndex < 0 || activityIndex >= dayObj.activities.length) {
      throw new BadRequestException(`Activity index ${activityIndex} out of range`);
    }

    const old = dayObj.activities[activityIndex];
    dayObj.activities[activityIndex] = {
      time: dto.time ?? old.time ?? '',
      activity: dto.activity,
      cost: dto.cost ?? old.cost ?? '',
      healthNote: dto.healthNote ?? old.healthNote ?? '',
    };

    return { old, trip: await this.updateItinerary(tripId, itinerary) };
  }

  async reorderActivities(tripId: string, day: number, indices: number[], fbUser: FirebaseUser) {
    const trip = await this.getById(tripId, fbUser);
    const itinerary = JSON.parse(JSON.stringify(trip.itineraryData)) as any;
    const dayObj = this.getItineraryDay(itinerary, day);

    if (indices.length !== dayObj.activities.length || !indices.every(i => i >= 0 && i < dayObj.activities.length)) {
      throw new BadRequestException('Invalid reorder indices');
    }

    dayObj.activities = indices.map((i: number) => dayObj.activities[i]);
    return this.updateItinerary(tripId, itinerary);
  }
```

Also add the import for `AddActivityDto` at the top:
```typescript
import { AddActivityDto } from './dto/add-activity.dto';
```

- [ ] **Step 5: Run tests to verify they pass**

```bash
cd C:\Users\Abhishek\OneDrive\Desktop\Sarthi\sarthi-backend && npx jest src/saved-trips/saved-trips.service.spec.ts --no-coverage 2>&1 | tail -5
```

Expected: All tests pass.

---

### Task 7: Itinerary edit controller endpoints + correction logging

**Files:**
- Modify: `src/saved-trips/saved-trips.service.ts`
- Modify: `src/saved-trips/saved-trips.controller.ts`
- Modify: `src/saved-trips/saved-trips.module.ts`

- [ ] **Step 1: Update `SavedTripsService` to inject `CorrectionsService` and log corrections**

Add import to `saved-trips.service.ts`:
```typescript
import { CorrectionsService } from '../corrections/corrections.service';
```

Add to constructor:
```typescript
  constructor(
    private readonly prisma: PrismaService,
    private readonly userService: UserService,
    private readonly correctionsService: CorrectionsService,
  ) {}
```

Update `removeActivity` to log a correction after the itinerary update:

```typescript
  async removeActivity(tripId: string, day: number, activityIndex: number, fbUser: FirebaseUser) {
    const trip = await this.getById(tripId, fbUser);
    const itinerary = JSON.parse(JSON.stringify(trip.itineraryData)) as any;
    const dayObj = this.getItineraryDay(itinerary, day);

    if (activityIndex < 0 || activityIndex >= dayObj.activities.length) {
      throw new BadRequestException(`Activity index ${activityIndex} out of range`);
    }

    const removed = dayObj.activities[activityIndex];
    dayObj.activities.splice(activityIndex, 1);
    const updated = await this.updateItinerary(tripId, itinerary);

    // Log correction so Phase 2B personalisation learns from this removal
    await this.correctionsService.create(fbUser.uid, {
      tripId,
      type: 'removed_place',
      context: { place: removed.activity, day },
    }).catch(() => null);  // non-blocking — don't fail the edit if logging fails

    return { removed, trip: updated };
  }
```

Update `swapActivity` to log a correction:

```typescript
  async swapActivity(tripId: string, day: number, activityIndex: number, dto: AddActivityDto, fbUser: FirebaseUser) {
    const trip = await this.getById(tripId, fbUser);
    const itinerary = JSON.parse(JSON.stringify(trip.itineraryData)) as any;
    const dayObj = this.getItineraryDay(itinerary, day);

    if (activityIndex < 0 || activityIndex >= dayObj.activities.length) {
      throw new BadRequestException(`Activity index ${activityIndex} out of range`);
    }

    const old = dayObj.activities[activityIndex];
    dayObj.activities[activityIndex] = {
      time: dto.time ?? old.time ?? '',
      activity: dto.activity,
      cost: dto.cost ?? old.cost ?? '',
      healthNote: dto.healthNote ?? old.healthNote ?? '',
    };
    const updated = await this.updateItinerary(tripId, itinerary);

    await this.correctionsService.create(fbUser.uid, {
      tripId,
      type: 'swapped_place',
      context: { oldPlace: old.activity, newPlace: dto.activity, day },
    }).catch(() => null);

    return { old, trip: updated };
  }
```

- [ ] **Step 2: Update `saved-trips.service.spec.ts` to mock `CorrectionsService`**

At the top of the file, add `CorrectionsService` to the mock. Change the constructor call from:
```typescript
service = new SavedTripsService(prisma as any, userService as any);
```
to:
```typescript
let correctionsService: { create: jest.Mock };

// Inside beforeEach:
correctionsService = { create: jest.fn().mockResolvedValue({}) };
service = new SavedTripsService(prisma as any, userService as any, correctionsService as any);
```

- [ ] **Step 3: Run service tests to verify they still pass**

```bash
cd C:\Users\Abhishek\OneDrive\Desktop\Sarthi\sarthi-backend && npx jest src/saved-trips/saved-trips.service.spec.ts --no-coverage 2>&1 | tail -5
```

Expected: All tests pass.

- [ ] **Step 4: Add itinerary edit endpoints to `src/saved-trips/saved-trips.controller.ts`**

Add `Put` to the `@nestjs/common` import if not already there.

Add DTOs import:
```typescript
import { AddActivityDto } from './dto/add-activity.dto';
```

Append endpoints at the bottom of `SavedTripsController`:

```typescript
  @Post(':id/itinerary/day/:day/activity')
  async addActivity(
    @Param('id') id: string,
    @Param('day') day: string,
    @Body() dto: AddActivityDto,
    @Req() req: any,
  ) {
    return this.service.addActivity(id, Number(day), dto, req.user);
  }

  @Delete(':id/itinerary/day/:day/activity/:index')
  @HttpCode(200)
  async removeActivity(
    @Param('id') id: string,
    @Param('day') day: string,
    @Param('index') index: string,
    @Req() req: any,
  ) {
    return this.service.removeActivity(id, Number(day), Number(index), req.user);
  }

  @Put(':id/itinerary/day/:day/activity/:index')
  async swapActivity(
    @Param('id') id: string,
    @Param('day') day: string,
    @Param('index') index: string,
    @Body() dto: AddActivityDto,
    @Req() req: any,
  ) {
    return this.service.swapActivity(id, Number(day), Number(index), dto, req.user);
  }

  @Patch(':id/itinerary/day/:day/reorder')
  async reorderActivities(
    @Param('id') id: string,
    @Param('day') day: string,
    @Body('indices') indices: number[],
    @Req() req: any,
  ) {
    return this.service.reorderActivities(id, Number(day), indices, req.user);
  }
```

- [ ] **Step 5: Update `src/saved-trips/saved-trips.module.ts` to import `CorrectionsModule`**

```typescript
import { Module } from '@nestjs/common';
import { SavedTripsController } from './saved-trips.controller';
import { SavedTripsService } from './saved-trips.service';
import { UserService } from './user.service';
import { PhrasebookService } from './phrasebook.service';
import { CorrectionsModule } from '../corrections/corrections.module';

@Module({
  imports: [CorrectionsModule],
  controllers: [SavedTripsController],
  providers: [SavedTripsService, UserService, PhrasebookService],
  exports: [SavedTripsService],
})
export class SavedTripsModule {}
```

- [ ] **Step 6: Run full test suite**

```bash
cd C:\Users\Abhishek\OneDrive\Desktop\Sarthi\sarthi-backend && npx jest --no-coverage 2>&1 | grep -E "Tests:|Suites:" | tail -3
```

Expected: All tests pass.

---

### Task 8: AI suggest-replacement endpoint

**Files:**
- Modify: `src/saved-trips/saved-trips.service.ts`
- Modify: `src/saved-trips/saved-trips.controller.ts`
- Modify: `src/saved-trips/saved-trips.module.ts`

- [ ] **Step 1: Add `suggestReplacement` to `SavedTripsService`**

Add imports to `saved-trips.service.ts`:
```typescript
import { ProfileService } from '../profile/profile.service';
import type { TravelerProfileSnapshot, CorrectionRecord } from '../ai/prompts/destination.prompt';
```

Add `ProfileService` to constructor:
```typescript
  constructor(
    private readonly prisma: PrismaService,
    private readonly userService: UserService,
    private readonly correctionsService: CorrectionsService,
    private readonly profileService: ProfileService,
    private readonly aiService: AiService,
  ) {}
```

Note: `AiService` is `@Global()` so no module import needed for it specifically — it's auto-available.

Add the method:

```typescript
  async suggestReplacement(
    tripId: string,
    day: number,
    activityIndex: number,
    fbUser: FirebaseUser,
  ) {
    const trip = await this.getById(tripId, fbUser);
    const itinerary = trip.itineraryData as any;
    const dayObj = this.getItineraryDay(itinerary, day);

    if (activityIndex < 0 || activityIndex >= dayObj.activities.length) {
      throw new BadRequestException(`Activity index ${activityIndex} out of range`);
    }

    const currentActivity = dayObj.activities[activityIndex];
    const otherActivities: string[] = dayObj.activities
      .filter((_: any, i: number) => i !== activityIndex)
      .map((a: any) => `${a.time}: ${a.activity}`);

    // Fetch personality context (best-effort — don't fail if unavailable)
    let profile: TravelerProfileSnapshot | null = null;
    let corrections: CorrectionRecord[] = [];
    try {
      profile = await this.profileService.getProfile(fbUser.uid);
      if (profile) {
        const user = await this.userService.findOrCreate(fbUser.uid);
        corrections = (await this.correctionsService.getRecentForPrompt(user.id)) as CorrectionRecord[];
      }
    } catch { /* non-fatal */ }

    return this.aiService.suggestActivityReplacement({
      destination: trip.destination,
      state: trip.state,
      day,
      currentActivity,
      dayActivities: otherActivities,
      profile,
      corrections,
    });
  }
```

- [ ] **Step 2: Update `saved-trips.service.spec.ts` to add mock for `ProfileService` and `AiService`**

Update the constructor call again to include the two new deps:
```typescript
let profileService: { getProfile: jest.Mock };
let aiServiceMock: { suggestActivityReplacement: jest.Mock };

// In beforeEach:
profileService = { getProfile: jest.fn().mockResolvedValue(null) };
aiServiceMock = { suggestActivityReplacement: jest.fn().mockResolvedValue([]) };
service = new SavedTripsService(
  prisma as any,
  userService as any,
  correctionsService as any,
  profileService as any,
  aiServiceMock as any,
);
```

Add a test:
```typescript
describe('suggestReplacement', () => {
  it('calls AI with trip context and returns suggestions', async () => {
    userService.findOrCreate.mockResolvedValue(mockUser);
    prisma.savedTrip.findUnique.mockResolvedValue(mockTripWithItinerary);
    aiServiceMock.suggestActivityReplacement.mockResolvedValue([{ activity: 'Dudhsagar Falls' }]);

    const result = await service.suggestReplacement('trip-1', 1, 0, { uid: 'fb-123' } as any);

    expect(aiServiceMock.suggestActivityReplacement).toHaveBeenCalledWith(
      expect.objectContaining({ destination: 'Goa', day: 1 }),
    );
    expect(result[0].activity).toBe('Dudhsagar Falls');
  });
});
```

- [ ] **Step 3: Run service tests**

```bash
cd C:\Users\Abhishek\OneDrive\Desktop\Sarthi\sarthi-backend && npx jest src/saved-trips/saved-trips.service.spec.ts --no-coverage 2>&1 | tail -5
```

Expected: All pass.

- [ ] **Step 4: Add suggest endpoint to controller**

Append to `SavedTripsController`:
```typescript
  @Post(':id/itinerary/day/:day/activity/:index/suggest')
  @HttpCode(200)
  async suggestActivityReplacement(
    @Param('id') id: string,
    @Param('day') day: string,
    @Param('index') index: string,
    @Req() req: any,
  ) {
    return this.service.suggestReplacement(id, Number(day), Number(index), req.user);
  }
```

- [ ] **Step 5: Update module to import `ProfileModule`**

```typescript
import { ProfileModule } from '../profile/profile.module';

@Module({
  imports: [CorrectionsModule, ProfileModule],
  // ...
})
```

- [ ] **Step 6: Run full suite**

```bash
cd C:\Users\Abhishek\OneDrive\Desktop\Sarthi\sarthi-backend && npx jest --no-coverage 2>&1 | grep -E "Tests:|Suites:" | tail -3
```

Expected: All tests pass.

---

## Group D — Trip Chat

### Task 9: Trip chat prompt

**Files:**
- Create: `src/ai/prompts/trip-chat.prompt.ts`
- Create: `src/ai/prompts/trip-chat.prompt.spec.ts`

- [ ] **Step 1: Write failing tests**

Create `src/ai/prompts/trip-chat.prompt.spec.ts`:

```typescript
import { buildTripChatSystem } from './trip-chat.prompt';

describe('buildTripChatSystem', () => {
  const tripContext = {
    destination: 'Cherrapunji',
    state: 'Meghalaya',
    dates: { from: '2026-07-10', to: '2026-07-13' },
    itinerarySummary: 'Day 1: Living Root Bridge, Elephant Falls. Day 2: Dawki.',
  };

  it('returns a system prompt string', () => {
    const system = buildTripChatSystem(tripContext);
    expect(typeof system).toBe('string');
    expect(system.length).toBeGreaterThan(50);
  });

  it('includes destination in the system prompt', () => {
    const system = buildTripChatSystem(tripContext);
    expect(system).toContain('Cherrapunji');
  });

  it('includes itinerary summary when provided', () => {
    const system = buildTripChatSystem(tripContext);
    expect(system).toContain('Living Root Bridge');
  });

  it('includes personality block when profile is provided', () => {
    const system = buildTripChatSystem({
      ...tripContext,
      profile: { travelPace: 'loose', completeness: 11 },
    });
    expect(system).toContain('Traveler Personality');
  });

  it('works without optional fields', () => {
    const system = buildTripChatSystem({ destination: 'Goa', state: 'Goa' });
    expect(system).toContain('Goa');
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

```bash
cd C:\Users\Abhishek\OneDrive\Desktop\Sarthi\sarthi-backend && npx jest src/ai/prompts/trip-chat.prompt.spec.ts --no-coverage 2>&1 | tail -5
```

Expected: FAIL — `Cannot find module './trip-chat.prompt'`

- [ ] **Step 3: Create `src/ai/prompts/trip-chat.prompt.ts`**

```typescript
import { buildPersonalityBlock } from './destination.prompt';
import type { TravelerProfileSnapshot } from './destination.prompt';

export interface TripChatContext {
  destination: string;
  state: string;
  dates?: { from: string; to: string };
  itinerarySummary?: string;
  foodSummary?: string;
  profile?: TravelerProfileSnapshot | null;
  recentMessages?: Array<{ role: string; content: string }>;
}

export function buildTripChatSystem(ctx: TripChatContext): string {
  const personalityBlock = buildPersonalityBlock(ctx.profile ?? null);

  const tripInfo = [
    `Destination: ${ctx.destination}, ${ctx.state}`,
    ctx.dates ? `Dates: ${ctx.dates.from} to ${ctx.dates.to}` : '',
  ].filter(Boolean).join('\n');

  const itinerarySection = ctx.itinerarySummary
    ? `\n\nItinerary summary:\n${ctx.itinerarySummary}`
    : '';

  const foodSection = ctx.foodSummary
    ? `\n\nFood guide highlights:\n${ctx.foodSummary}`
    : '';

  const historySection = ctx.recentMessages?.length
    ? `\n\nRecent conversation:\n${ctx.recentMessages.map(m => `${m.role === 'user' ? 'Traveler' : 'Assistant'}: ${m.content}`).join('\n')}`
    : '';

  return `You are a knowledgeable travel assistant for a trip to ${ctx.destination}, ${ctx.state}. Answer questions concisely and practically. Focus on what's useful on the ground — local tips, safety, logistics, culture.

## Trip Context
${tripInfo}${itinerarySection}${foodSection}${personalityBlock}${historySection}

Keep answers short (2-4 sentences) unless the question needs a longer response. Always be practical and specific to ${ctx.destination}.`;
}
```

- [ ] **Step 4: Run tests to verify they pass**

```bash
cd C:\Users\Abhishek\OneDrive\Desktop\Sarthi\sarthi-backend && npx jest src/ai/prompts/trip-chat.prompt.spec.ts --no-coverage 2>&1 | tail -5
```

Expected: 5 tests pass.

---

### Task 10: Trip chat service + persistence

**Files:**
- Create: `src/saved-trips/dto/chat-message.dto.ts`
- Create: `src/saved-trips/trip-chat.service.ts`
- Create: `src/saved-trips/trip-chat.service.spec.ts`

- [ ] **Step 1: Create `src/saved-trips/dto/chat-message.dto.ts`**

```typescript
import { IsString, MinLength, MaxLength } from 'class-validator';

export class ChatMessageDto {
  @IsString()
  @MinLength(1)
  @MaxLength(500)
  message: string;
}
```

- [ ] **Step 2: Write failing tests**

Create `src/saved-trips/trip-chat.service.spec.ts`:

```typescript
import { Test } from '@nestjs/testing';
import { TripChatService } from './trip-chat.service';
import { SavedTripsService } from './saved-trips.service';
import { AiService } from '../ai/ai.service';
import { PrismaService } from '../prisma/prisma.service';
import { ProfileService } from '../profile/profile.service';
import { TooManyRequestsException } from '@nestjs/common';

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
      mockAiService.tripChat.mockResolvedValue('Living Root Bridge is about 3km from the main road.');
      mockPrisma.tripChatMessage.create.mockResolvedValue({});

      const result = await service.sendMessage('trip-1', 'How far is the Root Bridge?', { uid: 'fb-1' } as any);

      expect(result.reply).toBe('Living Root Bridge is about 3km from the main road.');
      expect(mockPrisma.tripChatMessage.create).toHaveBeenCalledTimes(2); // user + assistant
    });

    it('throws TooManyRequestsException when rate limit exceeded', async () => {
      mockSavedTripsService.getById.mockResolvedValue(mockTrip);
      mockPrisma.tripChatMessage.count.mockResolvedValue(10); // at limit

      await expect(
        service.sendMessage('trip-1', 'Another question', { uid: 'fb-1' } as any),
      ).rejects.toThrow(TooManyRequestsException);
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
```

- [ ] **Step 3: Run test to verify it fails**

```bash
cd C:\Users\Abhishek\OneDrive\Desktop\Sarthi\sarthi-backend && npx jest src/saved-trips/trip-chat.service.spec.ts --no-coverage 2>&1 | tail -5
```

Expected: FAIL — `Cannot find module './trip-chat.service'`

- [ ] **Step 4: Create `src/saved-trips/trip-chat.service.ts`**

```typescript
import { Injectable, TooManyRequestsException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { AiService } from '../ai/ai.service';
import { ProfileService } from '../profile/profile.service';
import { SavedTripsService } from './saved-trips.service';
import { buildTripChatSystem } from '../ai/prompts/trip-chat.prompt';

interface FirebaseUser { uid: string; name?: string; email?: string; }

const RATE_LIMIT = 10;

@Injectable()
export class TripChatService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly aiService: AiService,
    private readonly savedTripsService: SavedTripsService,
    private readonly profileService: ProfileService,
  ) {}

  private summariseItinerary(itineraryData: any): string {
    if (!itineraryData?.itinerary) return '';
    return itineraryData.itinerary
      .map((d: any) => {
        const acts = (d.activities ?? []).map((a: any) => a.activity).join(', ');
        return `Day ${d.day}: ${acts || d.title}`;
      })
      .join('. ');
  }

  async sendMessage(tripId: string, message: string, fbUser: FirebaseUser) {
    const trip = await this.savedTripsService.getById(tripId, fbUser);

    // Rate limit: 10 user messages per trip per hour
    const oneHourAgo = new Date(Date.now() - 3_600_000);
    const recentCount = await this.prisma.tripChatMessage.count({
      where: { tripId, role: 'user', createdAt: { gte: oneHourAgo } },
    });
    if (recentCount >= RATE_LIMIT) {
      throw new TooManyRequestsException('Rate limit: 10 messages per trip per hour');
    }

    // Fetch last 3 messages for context continuity
    const history = await this.prisma.tripChatMessage.findMany({
      where: { tripId },
      orderBy: { createdAt: 'desc' },
      take: 6,  // 3 pairs (user+assistant)
    });
    const recentMessages = history.reverse().map(m => ({ role: m.role, content: m.content }));

    // Fetch personality (best-effort)
    let profile = null;
    try { profile = await this.profileService.getProfile(fbUser.uid); } catch { /* non-fatal */ }

    const system = buildTripChatSystem({
      destination: trip.destination,
      state: trip.state,
      dates: trip.dates as any,
      itinerarySummary: this.summariseItinerary(trip.itineraryData),
      profile,
      recentMessages,
    });

    const reply = await this.aiService.tripChat(system, message);

    // Store both messages
    await this.prisma.tripChatMessage.create({ data: { tripId, role: 'user', content: message } });
    await this.prisma.tripChatMessage.create({ data: { tripId, role: 'assistant', content: reply } });

    return { reply };
  }

  async getHistory(tripId: string, fbUser: FirebaseUser) {
    await this.savedTripsService.getById(tripId, fbUser); // validates ownership
    return this.prisma.tripChatMessage.findMany({
      where: { tripId },
      orderBy: { createdAt: 'asc' },
    });
  }

  async clearHistory(tripId: string, fbUser: FirebaseUser) {
    await this.savedTripsService.getById(tripId, fbUser); // validates ownership
    await this.prisma.tripChatMessage.deleteMany({ where: { tripId } });
  }
}
```

- [ ] **Step 5: Run tests to verify they pass**

```bash
cd C:\Users\Abhishek\OneDrive\Desktop\Sarthi\sarthi-backend && npx jest src/saved-trips/trip-chat.service.spec.ts --no-coverage 2>&1 | tail -5
```

Expected: 4 tests pass.

---

### Task 11: Trip chat controller endpoints + module wiring

**Files:**
- Modify: `src/saved-trips/saved-trips.controller.ts`
- Modify: `src/saved-trips/saved-trips.module.ts`

- [ ] **Step 1: Add chat endpoints to `src/saved-trips/saved-trips.controller.ts`**

Add import:
```typescript
import { TripChatService } from './trip-chat.service';
import { ChatMessageDto } from './dto/chat-message.dto';
```

Add to constructor:
```typescript
  constructor(
    private readonly service: SavedTripsService,
    private readonly phrasebookService: PhrasebookService,
    private readonly chatService: TripChatService,
  ) {}
```

Append at the bottom of `SavedTripsController`:
```typescript
  @Post(':id/chat')
  @HttpCode(200)
  async sendChatMessage(
    @Param('id') id: string,
    @Body() dto: ChatMessageDto,
    @Req() req: any,
  ) {
    return this.chatService.sendMessage(id, dto.message, req.user);
  }

  @Get(':id/chat')
  async getChatHistory(@Param('id') id: string, @Req() req: any) {
    return this.chatService.getHistory(id, req.user);
  }

  @Delete(':id/chat')
  @HttpCode(204)
  async clearChatHistory(@Param('id') id: string, @Req() req: any) {
    await this.chatService.clearHistory(id, req.user);
  }
```

- [ ] **Step 2: Update `src/saved-trips/saved-trips.module.ts`**

```typescript
import { Module } from '@nestjs/common';
import { SavedTripsController } from './saved-trips.controller';
import { SavedTripsService } from './saved-trips.service';
import { UserService } from './user.service';
import { PhrasebookService } from './phrasebook.service';
import { TripChatService } from './trip-chat.service';
import { CorrectionsModule } from '../corrections/corrections.module';
import { ProfileModule } from '../profile/profile.module';

@Module({
  imports: [CorrectionsModule, ProfileModule],
  controllers: [SavedTripsController],
  providers: [SavedTripsService, UserService, PhrasebookService, TripChatService],
  exports: [SavedTripsService],
})
export class SavedTripsModule {}
```

- [ ] **Step 3: Run all saved-trips tests**

```bash
cd C:\Users\Abhishek\OneDrive\Desktop\Sarthi\sarthi-backend && npx jest src/saved-trips/ --no-coverage 2>&1 | tail -8
```

Expected: All pass.

- [ ] **Step 4: Run full test suite**

```bash
cd C:\Users\Abhishek\OneDrive\Desktop\Sarthi\sarthi-backend && npx jest --no-coverage 2>&1 | grep -E "Tests:|Suites:" | tail -3
```

Expected: All tests pass.

- [ ] **Step 5: Build check**

```bash
cd C:\Users\Abhishek\OneDrive\Desktop\Sarthi\sarthi-backend && npm run build 2>&1 | tail -5
```

Expected: No TypeScript errors.

---

### Task 12: Full verification + smoke test

**Files:**
- No code changes — verification only

- [ ] **Step 1: Run full test suite**

```bash
cd C:\Users\Abhishek\OneDrive\Desktop\Sarthi\sarthi-backend && npx jest --no-coverage 2>&1 | tail -10
```

Expected: All test suites pass, no failures.

- [ ] **Step 2: Build**

```bash
cd C:\Users\Abhishek\OneDrive\Desktop\Sarthi\sarthi-backend && npm run build 2>&1 | tail -5
```

Expected: Clean build.

- [ ] **Step 3: API smoke test (requires running server)**

Start server:
```bash
npm run start:dev
```

Test phrasebook generation:
```bash
curl -X POST http://localhost:3000/saved-trips/<trip-id>/phrasebook \
  -H "Authorization: Bearer <token>"
# Expected: {"language":"...","greeting":[...],...}

curl http://localhost:3000/saved-trips/<trip-id>/phrasebook \
  -H "Authorization: Bearer <token>"
# Expected: same phrasebook data (now stored)
```

Test itinerary editing:
```bash
# Add an activity to Day 1
curl -X POST http://localhost:3000/saved-trips/<trip-id>/itinerary/day/1/activity \
  -H "Authorization: Bearer <token>" \
  -H "Content-Type: application/json" \
  -d '{"activity":"Sunset viewpoint","time":"06:00 PM","cost":"Free"}'

# Remove activity at index 0 on Day 1
curl -X DELETE http://localhost:3000/saved-trips/<trip-id>/itinerary/day/1/activity/0 \
  -H "Authorization: Bearer <token>"
# Expected: {"removed":{"activity":"..."},"trip":{...}}
# Also: a Correction record logged in DB
```

Test trip chat:
```bash
curl -X POST http://localhost:3000/saved-trips/<trip-id>/chat \
  -H "Authorization: Bearer <token>" \
  -H "Content-Type: application/json" \
  -d '{"message":"Is there an ATM near Dawki?"}'
# Expected: {"reply":"Yes, there are ATMs in Dawki town..."}

curl http://localhost:3000/saved-trips/<trip-id>/chat \
  -H "Authorization: Bearer <token>"
# Expected: [{role:"user",...},{role:"assistant",...}]
```

Test suggest replacement:
```bash
curl -X POST http://localhost:3000/saved-trips/<trip-id>/itinerary/day/1/activity/0/suggest \
  -H "Authorization: Bearer <token>"
# Expected: [{"activity":"...","personalMatch":{"matchLevel":"...","reason":"..."}}]
```
