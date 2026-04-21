# Food Guide Taste Profile Enhancement — Design Spec

**Date:** 2026-04-14
**Status:** Approved, ready for implementation planning
**Scope:** Backend-only. Enhance `/destination-finder/food-guide` with richer taste-profile input and per-dish allergy/taste output.

## Goal

Make food recommendations more personalized and safer:
1. Accept a richer **taste profile** from clients (6 new optional input fields) so the AI can match cuisine, cooking style, and flavor preferences.
2. Emit **allergens** + optional **allergyAlert** on each recommended dish so allergy-sensitive users are warned.
3. Emit a numeric **tasteProfile** (0-5 scale across sweet/spicy/sour/salty/umami) on each dish so users can quickly understand what to expect.

## Non-Goals

- No frontend/UI work. Backend exposes the fields; frontend team builds the taste profile form popup.
- No user persistence of taste profile (no DB table, no auth coupling). Profile is sent per-request.
- No changes to destination finder, itinerary, or trek mode.
- No changes to `mealPlan` entries (they stay lean — no allergens/tasteProfile per meal-plan item).
- No AI model/provider changes.

## Architecture

Three touch points:

1. **DTO** (`FoodGuideDto`): add 6 optional fields
2. **Prompt** (`buildFoodGuidePrompt`): inject a new "Taste Profile" block + rules when at least one taste-profile field is provided
3. **Schemas** (Zod in `destination.schema.ts`): extend the three dish-card schemas (`dishSchema`, `healthConsciousDishSchema`, `streetFoodItemSchema`) with `allergens`, optional `allergyAlert`, and `tasteProfile` — using `.default()` for leniency
4. **Service** (`DestinationFinderService.foodGuide`): include the 6 new fields in cache key

`mealPlan` dish-card schemas (`mealSuggestionSchema`, `dailyMealPlanSchema`) stay unchanged.

## DTO additions

```typescript
// FoodGuideDto — add below existing optional fields
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

All optional — backward compatible. No enum constraint on cuisines/cookingStyles/flavors/meats (free-form strings) to keep the frontend flexible. `adventurousness` is enum-constrained because it has three discrete levels.

## Prompt changes

In `buildFoodGuidePrompt`, add a helper that builds a "Taste Profile" block:

```typescript
function buildTasteProfileBlock(params: FoodGuideParams): string {
  const hasAny =
    params.cuisinePreferences?.length ||
    params.cookingStyles?.length ||
    params.flavorPreferences?.length ||
    params.adventurousness ||
    params.favoriteDishes ||
    params.meatPreferences?.length;

  if (!hasAny) return '';

  const lines = [
    params.cuisinePreferences?.length && `- Cuisines: ${params.cuisinePreferences.join(', ')}`,
    params.cookingStyles?.length && `- Cooking styles: ${params.cookingStyles.join(', ')}`,
    params.flavorPreferences?.length && `- Flavors: ${params.flavorPreferences.join(', ')}`,
    params.adventurousness && `- Adventurousness: ${params.adventurousness}`,
    params.favoriteDishes && `- Favorite dishes: ${params.favoriteDishes}`,
    params.meatPreferences?.length && `- Meat preferences: ${params.meatPreferences.join(', ')}`,
  ].filter(Boolean).join('\n');

  return `\n## Taste Profile\n${lines}`;
}
```

Always add these rules (even when the block is empty — allergens/tasteProfile are always produced per dish):

```
## Rules
- For each dish in mustTryDishes, healthConscious, and streetFood.items, populate:
  - allergens: string[] (list major allergens present; empty array if none)
  - allergyAlert: string (ONLY if dish contains something in the traveler's allergies list, format as "⚠️ Contains X — listed in your allergies"; omit otherwise)
  - tasteProfile: { sweet, spicy, sour, salty, umami } — each integer 0-5
- When Taste Profile is present, prioritize dishes matching cuisines/cooking styles/flavors.
- For non-veg travelers with meatPreferences, bias toward those meats; skip meats they don't eat.
- adventurousness=familiar → prefer widely-known dishes; very_adventurous → include niche local specialties.
- mealPlan entries do NOT need allergens or tasteProfile (keep lean).
```

Injected after the existing `dietContext` and `healthContext` lines, before the "Respond ONLY with..." instruction.

## Schema changes

Update three dish schemas with leniency defaults so partial AI responses don't crash validation:

```typescript
// New reusable schema
export const tasteProfileSchema = z.object({
  sweet: z.number().min(0).max(5).default(0),
  spicy: z.number().min(0).max(5).default(0),
  sour: z.number().min(0).max(5).default(0),
  salty: z.number().min(0).max(5).default(0),
  umami: z.number().min(0).max(5).default(0),
}).default({ sweet: 0, spicy: 0, sour: 0, salty: 0, umami: 0 });

// Shared allergen fields
// (inline these into each dish schema)
allergens: z.array(z.string()).default([]),
allergyAlert: z.string().optional(),
tasteProfile: tasteProfileSchema,
```

Apply to:
- `dishSchema` — mustTryDishes
- `healthConsciousDishSchema` — healthConscious
- `streetFoodItemSchema` — streetFood.items

`mealSuggestionSchema` and `dailyMealPlanSchema` stay unchanged.

## Service (cache) changes

`DestinationFinderService.foodGuide()` currently builds cache key from: `type`, `destination`, `state`, `dates`, `group`, `dietType`, `spiceTolerance`, `foodBudget`, `allergies`, `normalizedFreeText`.

Add the 6 new taste-profile fields to the key so requests with different profiles don't collide:

```typescript
const cacheKey = this.cacheService.buildKey({
  // ...existing keys
  cuisinePreferences: dto.cuisinePreferences,
  cookingStyles: dto.cookingStyles,
  flavorPreferences: dto.flavorPreferences,
  adventurousness: dto.adventurousness,
  favoriteDishes: this.cacheService.normalizeText(dto.favoriteDishes ?? ''),
  meatPreferences: dto.meatPreferences,
});
```

## Files changed

| File | Change |
|---|---|
| `src/destination-finder/dto/food-guide.dto.ts` | Add 6 optional fields + `MaxLength` import |
| `src/ai/prompts/destination.prompt.ts` | Extend `FoodGuideParams`; add `buildTasteProfileBlock` helper; wire into `buildFoodGuidePrompt`; add rules section |
| `src/ai/prompts/destination.prompt.spec.ts` | Tests for new helper + integration tests on `buildFoodGuidePrompt` |
| `src/ai/schemas/destination.schema.ts` | Add `tasteProfileSchema`; extend `dishSchema`, `healthConsciousDishSchema`, `streetFoodItemSchema` |
| `src/destination-finder/destination-finder.service.ts` | Include 6 new fields in `foodGuide` cache key |
| `src/destination-finder/destination-finder.service.spec.ts` | Cache key discrimination test for taste profile |

No other files changed.

## Testing plan

~15 new tests:

**DTO** (existing DTO tests use e2e validation; no changes expected beyond TS type coverage.)

**`buildTasteProfileBlock` / `buildFoodGuidePrompt`**
- Returns empty string when no taste-profile fields provided (prompt unchanged)
- Includes Cuisines line when `cuisinePreferences` provided
- Includes Cooking styles line when `cookingStyles` provided
- Includes Flavors line when `flavorPreferences` provided
- Includes Adventurousness line when provided
- Includes Favorite dishes line when provided
- Includes Meat preferences line when provided
- `buildFoodGuidePrompt` user text includes the new Rules section (`allergens`, `allergyAlert`, `tasteProfile`) unconditionally

**Schemas**
- `dishSchema` parses a dish with all new fields present (allergens populated, allergyAlert set, tasteProfile numeric)
- `dishSchema` parses a dish missing allergens / tasteProfile (defaults kick in)
- `dishSchema` parses a dish with `allergyAlert` undefined (optional works)
- Same 3 tests for `healthConsciousDishSchema` and `streetFoodItemSchema` (duplicated minimally — one per schema)

**Cache key**
- Food guide cache keys differ when `cuisinePreferences` differs (regression guard — verifies the 6 fields flow into the key)

## Error handling

No new error paths. Invalid taste profile values (e.g. `adventurousness: "wild"` not in enum) → class-validator 400. AI non-compliance (missing fields) → Zod defaults fill in, response still valid. AI gibberish → existing try/catch returns 503.

## Rollout

Purely additive:
- Existing clients omitting the 6 fields see no prompt or response changes (the Taste Profile block is empty; new per-dish fields still populated via Zod defaults or AI output).
- Cached food guide entries from before deploy: since the new fields are part of the cache key, old cache entries with absent fields stay valid until TTL expires. Fresh requests build new entries.
- No breaking response change — clients unaware of the new fields ignore them; clients aware can render allergy/taste UI.

## Open Questions

None. Design is locked.

## Success Criteria

After deploy, a food guide request with `cuisinePreferences: ['Konkani']`, `flavorPreferences: ['tangy']`, `allergies: ['peanuts']` for Goa should return:
- Dishes weighted toward Konkani/tangy selections (fish curry, solkadhi, etc.)
- `allergens` populated on every dish (e.g. `['peanuts', 'coconut']`)
- `allergyAlert: "⚠️ Contains peanuts — listed in your allergies"` on any dish with peanuts
- `tasteProfile` numeric on every dish (e.g. `{ sweet: 1, spicy: 4, sour: 4, salty: 3, umami: 3 }`)
