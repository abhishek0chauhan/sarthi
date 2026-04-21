# Food Guide Taste Profile Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Extend food-guide API with richer taste-profile input (6 fields) and per-dish allergy/taste output (allergens, allergyAlert, tasteProfile 0-5 matrix).

**Architecture:** Add DTO fields, prompt helper `buildTasteProfileBlock`, extend Zod schemas with `.default()` leniency, update service cache key. No DB/model changes.

**Tech Stack:** NestJS v11, TypeScript, class-validator, Zod v4, Jest 30. No git commits — user controls commits.

**Spec:** `docs/superpowers/specs/2026-04-14-food-taste-profile-design.md`

---

## File Map

| File | Action | Responsibility |
|---|---|---|
| `src/ai/schemas/destination.schema.ts` | Modify | Add `tasteProfileSchema`; extend `dishSchema`, `healthConsciousDishSchema`, `streetFoodItemSchema` |
| `src/destination-finder/dto/food-guide.dto.ts` | Modify | Add 6 optional fields (`cuisinePreferences`, `cookingStyles`, `flavorPreferences`, `adventurousness`, `favoriteDishes`, `meatPreferences`) |
| `src/ai/prompts/destination.prompt.ts` | Modify | Extend `FoodGuideParams`; add `buildTasteProfileBlock`; wire into `buildFoodGuidePrompt`; add per-dish Rules section |
| `src/ai/prompts/destination.prompt.spec.ts` | Modify | Tests for `buildTasteProfileBlock` + integration tests |
| `src/destination-finder/destination-finder.service.ts` | Modify | Include 6 new fields in `foodGuide` cache key |
| `src/destination-finder/destination-finder.service.spec.ts` | Modify | Cache key discrimination test |
| Schema tests (if they exist) or add new ones | Modify/Create | Zod parse tests |

---

### Task 1: Extend Zod schemas with allergens, allergyAlert, tasteProfile

**Files:**
- Modify: `src/ai/schemas/destination.schema.ts`
- Create (if missing): `src/ai/schemas/destination.schema.spec.ts` — if this file doesn't exist, create it

- [ ] **Step 1: Check if schema spec file exists**

Run: `ls -la /home/abhishek/Desktop/Abhishek/Sarthi/sarthi-backend/src/ai/schemas/`

If `destination.schema.spec.ts` doesn't exist, create it with this header:

```typescript
import {
  dishSchema,
  healthConsciousDishSchema,
  streetFoodItemSchema,
} from './destination.schema';

describe('destination.schema', () => {
  // tests go here
});
```

- [ ] **Step 2: Write failing tests for new fields**

Inside the `describe('destination.schema', ...)` block, add:

```typescript
describe('dishSchema', () => {
  const baseDish = {
    name: 'Dosa',
    description: 'Crispy rice crepe',
    where: 'Chennai',
    priceRange: '₹50-100',
    spiceLevel: 'medium',
    healthNote: 'Light on stomach',
  };

  it('parses a dish with all new fields present', () => {
    const result = dishSchema.parse({
      ...baseDish,
      allergens: ['gluten'],
      allergyAlert: '⚠️ Contains gluten — listed in your allergies',
      tasteProfile: { sweet: 1, spicy: 3, sour: 2, salty: 2, umami: 4 },
    });
    expect(result.allergens).toEqual(['gluten']);
    expect(result.allergyAlert).toBe('⚠️ Contains gluten — listed in your allergies');
    expect(result.tasteProfile).toEqual({ sweet: 1, spicy: 3, sour: 2, salty: 2, umami: 4 });
  });

  it('defaults allergens to empty array when missing', () => {
    const result = dishSchema.parse(baseDish);
    expect(result.allergens).toEqual([]);
  });

  it('allows allergyAlert to be undefined', () => {
    const result = dishSchema.parse(baseDish);
    expect(result.allergyAlert).toBeUndefined();
  });

  it('defaults tasteProfile to zeros when missing', () => {
    const result = dishSchema.parse(baseDish);
    expect(result.tasteProfile).toEqual({ sweet: 0, spicy: 0, sour: 0, salty: 0, umami: 0 });
  });

  it('defaults missing tasteProfile fields individually', () => {
    const result = dishSchema.parse({ ...baseDish, tasteProfile: { sweet: 3, spicy: 5 } });
    expect(result.tasteProfile).toEqual({ sweet: 3, spicy: 5, sour: 0, salty: 0, umami: 0 });
  });
});

describe('healthConsciousDishSchema', () => {
  it('parses with new fields and applies defaults', () => {
    const result = healthConsciousDishSchema.parse({
      name: 'Steamed Idli',
      description: 'Fermented rice cake',
      healthNote: 'Probiotic, low-fat',
    });
    expect(result.allergens).toEqual([]);
    expect(result.allergyAlert).toBeUndefined();
    expect(result.tasteProfile).toEqual({ sweet: 0, spicy: 0, sour: 0, salty: 0, umami: 0 });
  });
});

describe('streetFoodItemSchema', () => {
  it('parses with new fields and applies defaults', () => {
    const result = streetFoodItemSchema.parse({
      name: 'Pani Puri',
      where: 'Mumbai streets',
      price: '₹20-40',
      healthNote: 'Watch water hygiene',
    });
    expect(result.allergens).toEqual([]);
    expect(result.allergyAlert).toBeUndefined();
    expect(result.tasteProfile).toEqual({ sweet: 0, spicy: 0, sour: 0, salty: 0, umami: 0 });
  });
});
```

- [ ] **Step 3: Run tests to verify they fail**

Run: `cd /home/abhishek/Desktop/Abhishek/Sarthi/sarthi-backend && npx jest src/ai/schemas/destination.schema.spec.ts --no-coverage 2>&1 | tail -20`

Expected: FAIL — schemas don't have `allergens`/`allergyAlert`/`tasteProfile` yet.

- [ ] **Step 4: Add `tasteProfileSchema` and extend dish schemas**

In `src/ai/schemas/destination.schema.ts`, add after the `permitsSchema` (or anywhere before the dish schemas):

```typescript
export const tasteProfileSchema = z.object({
  sweet: z.number().min(0).max(5).default(0),
  spicy: z.number().min(0).max(5).default(0),
  sour: z.number().min(0).max(5).default(0),
  salty: z.number().min(0).max(5).default(0),
  umami: z.number().min(0).max(5).default(0),
}).default({ sweet: 0, spicy: 0, sour: 0, salty: 0, umami: 0 });
```

Update `dishSchema` (around line 121) to include:

```typescript
export const dishSchema = z.object({
  name: z.string(),
  description: z.string(),
  where: z.string(),
  priceRange: z.string(),
  spiceLevel: z.string(),
  healthNote: z.string(),
  allergens: z.array(z.string()).default([]),
  allergyAlert: z.string().optional(),
  tasteProfile: tasteProfileSchema,
});
```

Update `healthConsciousDishSchema` (around line 130):

```typescript
export const healthConsciousDishSchema = z.object({
  name: z.string(),
  description: z.string(),
  healthNote: z.string(),
  allergens: z.array(z.string()).default([]),
  allergyAlert: z.string().optional(),
  tasteProfile: tasteProfileSchema,
});
```

Update `streetFoodItemSchema` (around line 136):

```typescript
export const streetFoodItemSchema = z.object({
  name: z.string(),
  where: z.string(),
  price: z.string(),
  healthNote: z.string(),
  allergens: z.array(z.string()).default([]),
  allergyAlert: z.string().optional(),
  tasteProfile: tasteProfileSchema,
});
```

- [ ] **Step 5: Run tests to verify they pass**

Run: `cd /home/abhishek/Desktop/Abhishek/Sarthi/sarthi-backend && npx jest src/ai/schemas/destination.schema.spec.ts --no-coverage 2>&1 | tail -20`

Expected: All 7 new tests pass.

- [ ] **Step 6: Run full suite to confirm no regressions**

Run: `cd /home/abhishek/Desktop/Abhishek/Sarthi/sarthi-backend && npx jest --no-coverage 2>&1 | tail -10`

Expected: All previous tests still pass. The Zod changes are additive (defaults ensure existing parse paths still work).

---

### Task 2: Add 6 optional fields to `FoodGuideDto`

**Files:**
- Modify: `src/destination-finder/dto/food-guide.dto.ts`

- [ ] **Step 1: Update imports**

Open `src/destination-finder/dto/food-guide.dto.ts`. Add `MaxLength` to the `class-validator` imports:

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
  MaxLength,
  Min,
  ValidateNested,
} from 'class-validator';
```

- [ ] **Step 2: Add the 6 new fields**

At the end of `FoodGuideDto` class (after `medicalConditions`), add:

```typescript
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  cuisinePreferences?: string[];

  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  cookingStyles?: string[];

  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  flavorPreferences?: string[];

  @IsOptional()
  @IsEnum(['familiar', 'local_specialties', 'very_adventurous'])
  adventurousness?: string;

  @IsOptional()
  @IsString()
  @MaxLength(500)
  favoriteDishes?: string;

  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  meatPreferences?: string[];
```

- [ ] **Step 3: Run production build to verify TypeScript compiles**

Run: `cd /home/abhishek/Desktop/Abhishek/Sarthi/sarthi-backend && npm run build 2>&1 | tail -10`

Expected: Build succeeds. `FoodGuideParams` in `destination.prompt.ts` is a separate interface — it doesn't need to match this DTO exactly, but we'll extend it in Task 3.

---

### Task 3: Extend `FoodGuideParams` and implement `buildTasteProfileBlock`

**Files:**
- Modify: `src/ai/prompts/destination.prompt.ts`
- Modify: `src/ai/prompts/destination.prompt.spec.ts`

- [ ] **Step 1: Write failing tests for `buildTasteProfileBlock`**

Update the import line in `src/ai/prompts/destination.prompt.spec.ts` to include `buildTasteProfileBlock`:

```typescript
import { buildHybridPrompt, buildAiFullPrompt, buildItineraryPrompt, buildFoodGuidePrompt, buildTrekPrompt, computeBmi, computeTripDays, monthNameFromDate, buildSearchContext, buildTasteProfileBlock } from './destination.prompt';
```

Add this describe block at the end of the file:

```typescript
describe('buildTasteProfileBlock', () => {
  const baseFoodParams = {
    destination: 'Goa',
    state: 'Goa',
    freeText: 'local food',
    group: { size: 2, type: 'couple' },
    dates: { from: '2026-05-10', to: '2026-05-14' },
    departureCity: 'Mumbai',
  };

  it('returns empty string when no taste profile fields provided', () => {
    expect(buildTasteProfileBlock(baseFoodParams)).toBe('');
  });

  it('includes Cuisines line when cuisinePreferences provided', () => {
    const out = buildTasteProfileBlock({ ...baseFoodParams, cuisinePreferences: ['Konkani', 'Goan'] });
    expect(out).toContain('## Taste Profile');
    expect(out).toContain('- Cuisines: Konkani, Goan');
  });

  it('includes Cooking styles line when cookingStyles provided', () => {
    const out = buildTasteProfileBlock({ ...baseFoodParams, cookingStyles: ['grilled', 'tandoor'] });
    expect(out).toContain('- Cooking styles: grilled, tandoor');
  });

  it('includes Flavors line when flavorPreferences provided', () => {
    const out = buildTasteProfileBlock({ ...baseFoodParams, flavorPreferences: ['tangy', 'savory'] });
    expect(out).toContain('- Flavors: tangy, savory');
  });

  it('includes Adventurousness line when provided', () => {
    const out = buildTasteProfileBlock({ ...baseFoodParams, adventurousness: 'very_adventurous' });
    expect(out).toContain('- Adventurousness: very_adventurous');
  });

  it('includes Favorite dishes line when provided', () => {
    const out = buildTasteProfileBlock({ ...baseFoodParams, favoriteDishes: 'biryani, dosa' });
    expect(out).toContain('- Favorite dishes: biryani, dosa');
  });

  it('includes Meat preferences line when provided', () => {
    const out = buildTasteProfileBlock({ ...baseFoodParams, meatPreferences: ['chicken', 'seafood'] });
    expect(out).toContain('- Meat preferences: chicken, seafood');
  });

  it('includes only provided fields (omits empty/missing)', () => {
    const out = buildTasteProfileBlock({
      ...baseFoodParams,
      cuisinePreferences: ['Bengali'],
      adventurousness: 'familiar',
    });
    expect(out).toContain('- Cuisines: Bengali');
    expect(out).toContain('- Adventurousness: familiar');
    expect(out).not.toContain('- Cooking styles:');
    expect(out).not.toContain('- Flavors:');
    expect(out).not.toContain('- Favorite dishes:');
    expect(out).not.toContain('- Meat preferences:');
  });
});
```

Also add integration tests inside the existing `describe('buildFoodGuidePrompt', ...)` block (if it doesn't exist, create one). Add these tests:

```typescript
  it('includes Taste Profile block in user prompt when fields provided', () => {
    const { user } = buildFoodGuidePrompt({
      destination: 'Goa',
      state: 'Goa',
      freeText: 'local food',
      group: { size: 2, type: 'couple' },
      dates: { from: '2026-05-10', to: '2026-05-14' },
      departureCity: 'Mumbai',
      cuisinePreferences: ['Konkani'],
      flavorPreferences: ['tangy'],
    });
    expect(user).toContain('## Taste Profile');
    expect(user).toContain('- Cuisines: Konkani');
    expect(user).toContain('- Flavors: tangy');
  });

  it('omits Taste Profile block when no profile fields provided', () => {
    const { user } = buildFoodGuidePrompt({
      destination: 'Goa',
      state: 'Goa',
      freeText: 'local food',
      group: { size: 2, type: 'couple' },
      dates: { from: '2026-05-10', to: '2026-05-14' },
      departureCity: 'Mumbai',
    });
    expect(user).not.toContain('## Taste Profile');
  });

  it('includes per-dish Rules section referencing allergens, allergyAlert, tasteProfile', () => {
    const { user } = buildFoodGuidePrompt({
      destination: 'Goa',
      state: 'Goa',
      freeText: 'local food',
      group: { size: 2, type: 'couple' },
      dates: { from: '2026-05-10', to: '2026-05-14' },
      departureCity: 'Mumbai',
    });
    expect(user).toContain('allergens');
    expect(user).toContain('allergyAlert');
    expect(user).toContain('tasteProfile');
  });
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `cd /home/abhishek/Desktop/Abhishek/Sarthi/sarthi-backend && npx jest src/ai/prompts/destination.prompt.spec.ts --no-coverage -t "buildTasteProfileBlock|buildFoodGuidePrompt" 2>&1 | tail -30`

Expected: FAIL — `buildTasteProfileBlock` not exported; `FoodGuideParams` missing new fields.

- [ ] **Step 3: Extend `FoodGuideParams` interface**

In `src/ai/prompts/destination.prompt.ts`, find the `FoodGuideParams` interface (around line 162). It currently has:

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
```

Add the 6 new fields at the end:

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
  cuisinePreferences?: string[];
  cookingStyles?: string[];
  flavorPreferences?: string[];
  adventurousness?: string;
  favoriteDishes?: string;
  meatPreferences?: string[];
}
```

- [ ] **Step 4: Implement `buildTasteProfileBlock`**

Just above the existing `buildFoodGuidePrompt` function, add the helper:

```typescript
export function buildTasteProfileBlock(params: FoodGuideParams): string {
  const lines: string[] = [];
  if (params.cuisinePreferences?.length) lines.push(`- Cuisines: ${params.cuisinePreferences.join(', ')}`);
  if (params.cookingStyles?.length) lines.push(`- Cooking styles: ${params.cookingStyles.join(', ')}`);
  if (params.flavorPreferences?.length) lines.push(`- Flavors: ${params.flavorPreferences.join(', ')}`);
  if (params.adventurousness) lines.push(`- Adventurousness: ${params.adventurousness}`);
  if (params.favoriteDishes) lines.push(`- Favorite dishes: ${params.favoriteDishes}`);
  if (params.meatPreferences?.length) lines.push(`- Meat preferences: ${params.meatPreferences.join(', ')}`);

  if (lines.length === 0) return '';
  return `\n## Taste Profile\n${lines.join('\n')}`;
}
```

- [ ] **Step 5: Wire into `buildFoodGuidePrompt`**

Find `buildFoodGuidePrompt` (around line 175). In its body, before `return`, compute the taste-profile block:

```typescript
const tasteProfileBlock = buildTasteProfileBlock(params);
```

Then update the user prompt string to include the taste-profile block + a new Rules section. The existing user prompt template looks like:

```
`Create a personalized food guide for ${params.destination}, ${params.state} (${numDays} days).
Traveler: ${params.freeText}
Group: ${params.group.size} ${params.group.type} | From: ${params.departureCity}${dietContext}${healthContext}

Respond ONLY with a JSON object ...`
```

Change it to insert the taste profile block and a Rules section before the "Respond ONLY" line:

```
`Create a personalized food guide for ${params.destination}, ${params.state} (${numDays} days).
Traveler: ${params.freeText}
Group: ${params.group.size} ${params.group.type} | From: ${params.departureCity}${dietContext}${healthContext}${tasteProfileBlock}

## Rules
- For each dish in mustTryDishes, healthConscious, and streetFood.items, populate:
  - allergens: string[] (list major allergens present; empty array if none)
  - allergyAlert: string (ONLY if dish contains something in the traveler's allergies list, format as "⚠️ Contains X — listed in your allergies"; omit otherwise)
  - tasteProfile: { sweet, spicy, sour, salty, umami } — each integer 0-5
- When Taste Profile is present, prioritize dishes matching the traveler's cuisines, cooking styles, and flavors.
- For non-veg travelers with meatPreferences, bias toward those meats; skip meats they don't eat.
- adventurousness=familiar → prefer widely-known dishes; very_adventurous → include niche local specialties.
- mealPlan entries do NOT need allergens or tasteProfile (keep lean).

Respond ONLY with a JSON object ...`
```

The existing JSON format string in the prompt (the "mustTryDishes" schema example) should also be updated to include the new fields. Find the line that looks like:

```
"mustTryDishes":[{"name":"<dish>","description":"<one line>","where":"<restaurant/area>","priceRange":"<₹ range>","spiceLevel":"<mild/medium/hot>","healthNote":"<health advice for this traveler>"}]
```

Update it to include the new per-dish fields:

```
"mustTryDishes":[{"name":"<dish>","description":"<one line>","where":"<restaurant/area>","priceRange":"<₹ range>","spiceLevel":"<mild/medium/hot>","healthNote":"<health advice for this traveler>","allergens":["<allergen or empty>"],"allergyAlert":"<only if user's allergies match>","tasteProfile":{"sweet":<0-5>,"spicy":<0-5>,"sour":<0-5>,"salty":<0-5>,"umami":<0-5>}}]
```

Similarly, update `healthConscious` and `streetFood.items` JSON schemas to include the three new fields. `mealPlan` schema stays unchanged.

- [ ] **Step 6: Run tests to verify they pass**

Run: `cd /home/abhishek/Desktop/Abhishek/Sarthi/sarthi-backend && npx jest src/ai/prompts/destination.prompt.spec.ts --no-coverage 2>&1 | tail -20`

Expected: All new `buildTasteProfileBlock` tests pass (8) + integration tests pass (3). No regressions.

---

### Task 4: Include 6 new fields in `foodGuide` cache key

**Files:**
- Modify: `src/destination-finder/destination-finder.service.ts`
- Modify: `src/destination-finder/destination-finder.service.spec.ts`

- [ ] **Step 1: Write failing cache key test**

Open `src/destination-finder/destination-finder.service.spec.ts`. Find the section where `foodGuide` is tested (or add one). Add:

```typescript
  it('foodGuide produces different cache keys when taste profile differs', async () => {
    const baseDto: FoodGuideDto = {
      destination: 'Goa',
      state: 'Goa',
      dates: { from: '2026-05-10', to: '2026-05-14' },
      group: { size: 2, type: 'couple' },
      departureCity: 'Mumbai',
      freeText: 'local food',
    };

    mockCacheService.get.mockResolvedValue(null);
    mockCacheService.set.mockResolvedValue(undefined);
    mockAiService.generateFoodGuide.mockResolvedValue({});

    const keySpy = jest.spyOn(mockCacheService, 'buildKey');

    try { await service.foodGuide(baseDto); } catch {}
    const keyWithoutProfile = keySpy.mock.results[0]?.value;
    keySpy.mockClear();

    try { await service.foodGuide({ ...baseDto, cuisinePreferences: ['Konkani'] }); } catch {}
    const keyWithProfile = keySpy.mock.results[0]?.value;

    expect(keyWithProfile).not.toBe(keyWithoutProfile);
  });
```

Adapt to match the existing mock pattern in the file (variable names, setup helpers). Import `FoodGuideDto` at the top of the test file.

- [ ] **Step 2: Run test to verify it fails**

Run: `cd /home/abhishek/Desktop/Abhishek/Sarthi/sarthi-backend && npx jest src/destination-finder/destination-finder.service.spec.ts --no-coverage -t "taste profile" 2>&1 | tail -20`

Expected: The test may initially pass (if mocked buildKey returns different values) OR fail (if cache key doesn't include new fields). If the test passes, it means the cache key was built with identical inputs but the mocked `buildKey` discriminated anyway — adjust the mock to call the real implementation OR inspect the arguments passed to `buildKey` instead.

**Alternative test approach** (if needed — more reliable):
```typescript
    try { await service.foodGuide(baseDto); } catch {}
    const argsWithout = keySpy.mock.calls[0][0];
    keySpy.mockClear();
    try { await service.foodGuide({ ...baseDto, cuisinePreferences: ['Konkani'] }); } catch {}
    const argsWith = keySpy.mock.calls[0][0];
    expect(argsWith).not.toEqual(argsWithout);
    expect(argsWith).toHaveProperty('cuisinePreferences', ['Konkani']);
```

- [ ] **Step 3: Update `foodGuide` cache key in the service**

In `src/destination-finder/destination-finder.service.ts`, find the `foodGuide` method. It currently builds the cache key with:

```typescript
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
```

Update to include the 6 new fields:

```typescript
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
  cuisinePreferences: dto.cuisinePreferences,
  cookingStyles: dto.cookingStyles,
  flavorPreferences: dto.flavorPreferences,
  adventurousness: dto.adventurousness,
  favoriteDishes: this.cacheService.normalizeText(dto.favoriteDishes ?? ''),
  meatPreferences: dto.meatPreferences,
  normalizedFreeText: this.cacheService.normalizeText(dto.freeText),
});
```

- [ ] **Step 4: Update `FoodGuideDto` type propagation**

The `FoodGuideDto` needs the 6 new fields for TypeScript to accept them in the cache key. Task 2 already added them to the DTO. Verify by running build:

Run: `cd /home/abhishek/Desktop/Abhishek/Sarthi/sarthi-backend && npm run build 2>&1 | tail -10`

Expected: Build succeeds. If it fails with "Property 'cuisinePreferences' does not exist", ensure Task 2 was completed correctly.

- [ ] **Step 5: Run test to verify it passes**

Run: `cd /home/abhishek/Desktop/Abhishek/Sarthi/sarthi-backend && npx jest src/destination-finder/destination-finder.service.spec.ts --no-coverage 2>&1 | tail -20`

Expected: All tests pass including the new taste profile cache key test.

---

### Task 5: Full-suite verification

**Files:** none

- [ ] **Step 1: Run full test suite**

Run: `cd /home/abhishek/Desktop/Abhishek/Sarthi/sarthi-backend && npx jest --no-coverage 2>&1 | tail -10`

Expected: All test suites pass. Total tests should be ~210+ (195 from previous + ~15 new).

- [ ] **Step 2: Run production build**

Run: `cd /home/abhishek/Desktop/Abhishek/Sarthi/sarthi-backend && npm run build 2>&1 | tail -10`

Expected: Build completes with no TypeScript errors.

- [ ] **Step 3: Optional smoke test via curl**

If dev server is running, POST to `/destination-finder/food-guide`:

```bash
curl -X POST http://localhost:3000/destination-finder/food-guide \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer <firebase-token>" \
  -d '{
    "destination": "Goa",
    "state": "Goa",
    "dates": { "from": "2026-05-10", "to": "2026-05-14" },
    "group": { "size": 2, "type": "couple" },
    "departureCity": "Mumbai",
    "freeText": "authentic local food",
    "dietType": "non-veg",
    "spiceTolerance": "medium",
    "allergies": ["peanuts"],
    "cuisinePreferences": ["Konkani"],
    "cookingStyles": ["grilled"],
    "flavorPreferences": ["tangy", "spicy"],
    "adventurousness": "very_adventurous",
    "favoriteDishes": "fish curry, prawns",
    "meatPreferences": ["seafood", "chicken"]
  }'
```

Expected response: Each dish in `mustTryDishes`, `healthConscious`, and `streetFood.items` includes `allergens` (array), optional `allergyAlert` (only on dishes containing peanuts), and `tasteProfile` (numeric 0-5 for each flavor axis). Konkani/tangy/spicy dishes should dominate the recommendations.
