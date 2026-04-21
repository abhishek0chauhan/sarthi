# Search Prompt Enrichment Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Enrich `/destination-finder/search` prompts with a shared Context + Rules block so the AI produces smarter recommendations (trip-duration-aware, season-aware, group-aware, proximity-aware, budget-honest).

**Architecture:** Add a shared `buildSearchContext(params, options?)` helper in `destination.prompt.ts` that returns a `## Context` + `## Rules` block. Call it from `buildHybridPrompt`, `buildAiFullPrompt`, and `buildTrekPrompt`. Remove the old `travelerProfile` one-liner and inline Budget rule — their content now lives in the Context block (richer form).

**Tech Stack:** NestJS v11, TypeScript, Jest 30. No schema, DTO, or service changes. No git commits — user controls commits.

**Spec:** `docs/superpowers/specs/2026-04-12-search-prompt-enrichment-design.md`

---

## File Map

| File | Action | Responsibility |
|---|---|---|
| `src/ai/prompts/destination.prompt.ts` | Modify | Add `computeTripDays`, `monthNameFromDate`, `GROUP_HINTS`, `SearchContextParams`, `buildSearchContext`. Wire into 3 builders. Remove old `travelerProfile` lines and inline Budget rules. |
| `src/ai/prompts/destination.prompt.spec.ts` | Modify | Add tests for the new helpers. Update any existing assertions that break due to reorganization. |

No other files change.

---

### Task 1: `computeTripDays` utility

**Files:**
- Modify: `src/ai/prompts/destination.prompt.ts`
- Modify: `src/ai/prompts/destination.prompt.spec.ts`

- [ ] **Step 1: Write failing tests for `computeTripDays`**

Add to `src/ai/prompts/destination.prompt.spec.ts`. First update the import line at the top of the file to include `computeTripDays` (alongside whatever is already imported):

```typescript
import { buildHybridPrompt, buildAiFullPrompt, buildItineraryPrompt, buildFoodGuidePrompt, buildTrekPrompt, computeBmi, computeTripDays } from './destination.prompt';
```

Add this describe block at the end of the file:

```typescript
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
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `cd /home/abhishek/Desktop/Abhishek/Sarthi/sarthi-backend && npx jest src/ai/prompts/destination.prompt.spec.ts --no-coverage 2>&1 | tail -20`

Expected: FAIL with `'computeTripDays' is not exported`

- [ ] **Step 3: Implement `computeTripDays`**

Add this function at the top of `src/ai/prompts/destination.prompt.ts`, near `computeBmi`:

```typescript
export function computeTripDays(dates: { from: string; to: string }): number {
  const from = new Date(dates.from);
  const to = new Date(dates.to);
  return Math.ceil((to.getTime() - from.getTime()) / 86_400_000) + 1;
}
```

- [ ] **Step 4: Run tests to verify they pass**

Run: `cd /home/abhishek/Desktop/Abhishek/Sarthi/sarthi-backend && npx jest src/ai/prompts/destination.prompt.spec.ts --no-coverage -t computeTripDays 2>&1 | tail -20`

Expected: `Tests: 4 passed`

---

### Task 2: `monthNameFromDate` utility

**Files:**
- Modify: `src/ai/prompts/destination.prompt.ts`
- Modify: `src/ai/prompts/destination.prompt.spec.ts`

- [ ] **Step 1: Write failing tests for `monthNameFromDate`**

Update the import line in `src/ai/prompts/destination.prompt.spec.ts` to add `monthNameFromDate`:

```typescript
import { buildHybridPrompt, buildAiFullPrompt, buildItineraryPrompt, buildFoodGuidePrompt, buildTrekPrompt, computeBmi, computeTripDays, monthNameFromDate } from './destination.prompt';
```

Add this describe block at the end of the file:

```typescript
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
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `cd /home/abhishek/Desktop/Abhishek/Sarthi/sarthi-backend && npx jest src/ai/prompts/destination.prompt.spec.ts --no-coverage -t monthNameFromDate 2>&1 | tail -20`

Expected: FAIL with `'monthNameFromDate' is not exported`

- [ ] **Step 3: Implement `monthNameFromDate`**

Add this function in `src/ai/prompts/destination.prompt.ts`, immediately after `computeTripDays`:

```typescript
const MONTH_NAMES = [
  'January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December',
];

export function monthNameFromDate(dateStr: string): string {
  const d = new Date(dateStr);
  if (isNaN(d.getTime())) {
    throw new Error(`monthNameFromDate: invalid date "${dateStr}"`);
  }
  return MONTH_NAMES[d.getMonth()];
}
```

- [ ] **Step 4: Run tests to verify they pass**

Run: `cd /home/abhishek/Desktop/Abhishek/Sarthi/sarthi-backend && npx jest src/ai/prompts/destination.prompt.spec.ts --no-coverage -t monthNameFromDate 2>&1 | tail -20`

Expected: `Tests: 4 passed`

---

### Task 3: `GROUP_HINTS`, `SearchContextParams`, and `buildSearchContext`

**Files:**
- Modify: `src/ai/prompts/destination.prompt.ts`
- Modify: `src/ai/prompts/destination.prompt.spec.ts`

- [ ] **Step 1: Write failing tests for `buildSearchContext`**

Update the import line in `src/ai/prompts/destination.prompt.spec.ts` to add `buildSearchContext`:

```typescript
import { buildHybridPrompt, buildAiFullPrompt, buildItineraryPrompt, buildFoodGuidePrompt, buildTrekPrompt, computeBmi, computeTripDays, monthNameFromDate, buildSearchContext } from './destination.prompt';
```

Add this describe block at the end of the file:

```typescript
describe('buildSearchContext', () => {
  const baseParams = {
    dates: { from: '2026-04-17', to: '2026-04-19' },
    group: { size: 4, type: 'friends' },
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

  it('contains group size, type, and hint', () => {
    const ctx = buildSearchContext(baseParams);
    expect(ctx).toContain('4 friends');
    expect(ctx).toContain('nightlife, adventure activities, and shared experiences');
  });

  it('uses couple hint for couple group type', () => {
    const ctx = buildSearchContext({ ...baseParams, group: { size: 2, type: 'couple' } });
    expect(ctx).toContain('romantic, scenic stays');
  });

  it('uses family hint for family group type', () => {
    const ctx = buildSearchContext({ ...baseParams, group: { size: 4, type: 'family' } });
    expect(ctx).toContain('kid-friendly');
  });

  it('uses solo hint for solo group type', () => {
    const ctx = buildSearchContext({ ...baseParams, group: { size: 1, type: 'solo' } });
    expect(ctx).toContain('safe, social destinations');
  });

  it('falls back to generic hint for unknown group type', () => {
    const ctx = buildSearchContext({ ...baseParams, group: { size: 5, type: 'mystery' } });
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
});
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `cd /home/abhishek/Desktop/Abhishek/Sarthi/sarthi-backend && npx jest src/ai/prompts/destination.prompt.spec.ts --no-coverage -t buildSearchContext 2>&1 | tail -20`

Expected: FAIL with `'buildSearchContext' is not exported`

- [ ] **Step 3: Implement `GROUP_HINTS`, `SearchContextParams`, `buildSearchContext`**

Add to `src/ai/prompts/destination.prompt.ts`, immediately after `monthNameFromDate` (before `HEALTH_ADVISORY_FORMAT`):

```typescript
const GROUP_HINTS: Record<string, string> = {
  solo:    'prioritize safe, social destinations with good transport connectivity',
  couple:  'prioritize romantic, scenic stays and intimate experiences',
  friends: 'prioritize nightlife, adventure activities, and shared experiences',
  family:  'prioritize kid-friendly activities and accessible family stays',
};

const GROUP_HINT_FALLBACK = "tailor to the group's vibe";

export interface SearchContextParams {
  dates: { from: string; to: string };
  group: { size: number; type: string };
  budget: { min: number; max: number };
  departureCity: string;
}

export interface SearchContextOptions {
  mode?: 'destination' | 'trek';
}

export function buildSearchContext(
  params: SearchContextParams,
  options: SearchContextOptions = {},
): string {
  const mode = options.mode ?? 'destination';
  const tripDays = computeTripDays(params.dates);
  const monthName = monthNameFromDate(params.dates.from);
  const groupHint = GROUP_HINTS[params.group.type] ?? GROUP_HINT_FALLBACK;

  const seasonRule = mode === 'trek'
    ? `- Season: Flag any trek where conditions in ${monthName} are borderline (late-season snow, early-season monsoon) in healthAdvisory.alerts.`
    : `- Season: If ${monthName} is sub-optimal for a destination (peak summer heat in the plains, monsoon flooding in the ghats, winter closures in the hills), surface it in weatherSnapshot and healthAdvisory.alerts. Do not pretend the weather is pleasant when it isn't.`;

  const nearbyGemsRule = mode === 'trek'
    ? ''
    : `\n- Nearby gems: Surface at least one less-touristy option within easy reach of ${params.departureCity} when possible (set isHiddenGem: true).`;

  return `## Context
- Trip length: ${tripDays} days (${params.dates.from} to ${params.dates.to})
- Travel month: ${monthName}
- Departure city: ${params.departureCity}
- Group: ${params.group.size} ${params.group.type} — ${groupHint}
- Budget: ₹${params.budget.min}–${params.budget.max}/person total

## Rules
- Proximity: Prefer destinations reachable within 6–8h of ${params.departureCity}. For trips of ≤3 days, avoid destinations that need >4h one-way travel — it eats into the trip. Flag long travel in tripReadiness (e.g. "6h each way leaves only 1 full day onsite").
${seasonRule}
- Group-fit: Tailor picks to the group type — do not recommend backpacker hostels to a family or temple tours to a friends trip unless explicitly requested.
- Budget: If realistic cost exceeds ₹${params.budget.min}–${params.budget.max}/person, set costBreakdown.total to the honest number and explain the gap in tripReadiness.budget (e.g. "₹2000 over — drop to budget guesthouses and local transport to fit").${nearbyGemsRule}`;
}
```

- [ ] **Step 4: Run tests to verify they pass**

Run: `cd /home/abhishek/Desktop/Abhishek/Sarthi/sarthi-backend && npx jest src/ai/prompts/destination.prompt.spec.ts --no-coverage -t buildSearchContext 2>&1 | tail -20`

Expected: `Tests: 13 passed`

---

### Task 4: Wire `buildSearchContext` into `buildAiFullPrompt`

**Files:**
- Modify: `src/ai/prompts/destination.prompt.ts`
- Modify: `src/ai/prompts/destination.prompt.spec.ts`

- [ ] **Step 1: Write a failing test asserting the Context block appears**

Find the existing `describe('buildAiFullPrompt', ...)` block in `src/ai/prompts/destination.prompt.spec.ts` and add this test inside it (alongside the existing `it(...)` tests):

```typescript
  it('includes the Context block with Rules', () => {
    const { user } = buildAiFullPrompt({
      freeText: 'weekend escape',
      group: { size: 2, type: 'couple' },
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
```

- [ ] **Step 2: Run test to verify it fails**

Run: `cd /home/abhishek/Desktop/Abhishek/Sarthi/sarthi-backend && npx jest src/ai/prompts/destination.prompt.spec.ts --no-coverage -t "buildAiFullPrompt" 2>&1 | tail -20`

Expected: FAIL — `user` does not contain `'## Context'`

- [ ] **Step 3: Refactor `buildAiFullPrompt` to use `buildSearchContext`**

Open `src/ai/prompts/destination.prompt.ts` and find the `buildAiFullPrompt` function. Replace its current body (which has a `travelerProfile` line and inline "Budget rule:" text) with this:

```typescript
export function buildAiFullPrompt(params: PromptParams): { system: string; user: string } {
  const healthContext = buildHealthContext(params);
  const searchContext = buildSearchContext(params);

  return {
    system: SYSTEM_PROMPT,
    user: `Traveler: ${params.freeText}${healthContext}

${searchContext}

Recommend up to 5 Indian travel destinations that best match this traveler.
For each destination, assess health/fitness suitability based on the traveler's profile.

Respond ONLY with a JSON object in exactly this format (no extra text):
{"destinations":[{"name":"<city>","state":"<state>","isHiddenGem":<true/false>,"budgetEstimate":"<e.g. ₹8000-15000/person>","weatherSnapshot":"<one sentence>","travelTime":"<e.g. 2h flight from Mumbai>","highlights":["<highlight1>","<highlight2>","<highlight3>"],"whyItMatches":"<one sentence>",${HEALTH_ADVISORY_FORMAT},${COST_BREAKDOWN_FORMAT},${PERMITS_FORMAT},${TRIP_READINESS_FORMAT}}]}`,
  };
}
```

Delete the previous `travelerProfile` const and the inline `Budget rule:` paragraph — they are now replaced by `buildSearchContext`.

- [ ] **Step 4: Run tests to verify the new test passes**

Run: `cd /home/abhishek/Desktop/Abhishek/Sarthi/sarthi-backend && npx jest src/ai/prompts/destination.prompt.spec.ts --no-coverage -t "buildAiFullPrompt" 2>&1 | tail -20`

Expected: All `buildAiFullPrompt` tests pass (including the new one and existing ones — existing assertions like `'Mumbai'`, `'Gender: male'`, `'costBreakdown'` still match because those values still appear in the prompt text).

- [ ] **Step 5: Run full prompt spec to confirm no regressions**

Run: `cd /home/abhishek/Desktop/Abhishek/Sarthi/sarthi-backend && npx jest src/ai/prompts/destination.prompt.spec.ts --no-coverage 2>&1 | tail -10`

Expected: All tests pass. If any fail with "does not contain 'Budget: ₹...'" or similar, fix by updating the assertion to match the new format (e.g. `'Budget: ₹5000–10000/person total'` from the Context block) — the value is still present, just reworded.

---

### Task 5: Wire `buildSearchContext` into `buildHybridPrompt`

**Files:**
- Modify: `src/ai/prompts/destination.prompt.ts`
- Modify: `src/ai/prompts/destination.prompt.spec.ts`

- [ ] **Step 1: Write a failing test asserting the Context block appears**

Find the existing `describe('buildHybridPrompt', ...)` block in `src/ai/prompts/destination.prompt.spec.ts` and add this test inside it:

```typescript
  it('includes the Context block with Rules', () => {
    const { user } = buildHybridPrompt({
      freeText: 'weekend escape',
      group: { size: 2, type: 'couple' },
      budget: { min: 5000, max: 10000 },
      dates: { from: '2026-04-17', to: '2026-04-19' },
      departureCity: 'Ahmedabad',
      destinations: [
        { id: 'uuid-1', name: 'Kasol', state: 'HP', experienceTypes: ['mountains'], isHiddenGem: true, weatherSummary: 'Cool', budgetMin: 700, budgetMax: 1200 },
      ],
    });
    expect(user).toContain('## Context');
    expect(user).toContain('## Rules');
    expect(user).toContain('Trip length: 3 days');
    expect(user).toContain('Travel month: April');
    expect(user).toContain('Departure city: Ahmedabad');
    expect(user).toContain('Nearby gems:');
  });
```

- [ ] **Step 2: Run test to verify it fails**

Run: `cd /home/abhishek/Desktop/Abhishek/Sarthi/sarthi-backend && npx jest src/ai/prompts/destination.prompt.spec.ts --no-coverage -t "buildHybridPrompt" 2>&1 | tail -20`

Expected: FAIL — `user` does not contain `'## Context'`

- [ ] **Step 3: Refactor `buildHybridPrompt` to use `buildSearchContext`**

Open `src/ai/prompts/destination.prompt.ts`, find `buildHybridPrompt`, and replace its body with this:

```typescript
export function buildHybridPrompt(
  params: PromptParams & { destinations: CompactDestination[] },
): { system: string; user: string } {
  const destinationList = params.destinations
    .map(d => `  {"id":"${d.id}","name":"${d.name}","state":"${d.state}"}`)
    .join(',\n');

  const healthContext = buildHealthContext(params);
  const searchContext = buildSearchContext(params);

  return {
    system: SYSTEM_PROMPT,
    user: `Traveler: ${params.freeText}${healthContext}

${searchContext}

Rank these destinations best to worst match and write one sentence explaining why each matches.
For each destination, assess health/fitness suitability based on the traveler's profile.
Destinations:
[
${destinationList}
]

Respond ONLY with a JSON object in exactly this format (no extra text):
{"rankings":[{"id":"<exact id from above>","whyItMatches":"<one sentence>",${HEALTH_ADVISORY_FORMAT},${COST_BREAKDOWN_FORMAT},${PERMITS_FORMAT},${TRIP_READINESS_FORMAT}}]}

Max 5 results, best match first.`,
  };
}
```

Delete the previous `travelerProfile` const and the inline `Budget rule:` paragraph.

- [ ] **Step 4: Run tests to verify they pass**

Run: `cd /home/abhishek/Desktop/Abhishek/Sarthi/sarthi-backend && npx jest src/ai/prompts/destination.prompt.spec.ts --no-coverage -t "buildHybridPrompt" 2>&1 | tail -20`

Expected: All `buildHybridPrompt` tests pass.

- [ ] **Step 5: Run full prompt spec**

Run: `cd /home/abhishek/Desktop/Abhishek/Sarthi/sarthi-backend && npx jest src/ai/prompts/destination.prompt.spec.ts --no-coverage 2>&1 | tail -10`

Expected: All tests pass.

---

### Task 6: Wire `buildSearchContext` into `buildTrekPrompt` (trek mode)

**Files:**
- Modify: `src/ai/prompts/destination.prompt.ts`
- Modify: `src/ai/prompts/destination.prompt.spec.ts`

- [ ] **Step 1: Write a failing test asserting trek-mode Context block appears**

Find the existing `describe('buildTrekPrompt', ...)` block in `src/ai/prompts/destination.prompt.spec.ts` and add this test inside it:

```typescript
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
```

(`trekParams` is already defined at the top of the `buildTrekPrompt` describe block from the previous task — reuse it.)

- [ ] **Step 2: Run test to verify it fails**

Run: `cd /home/abhishek/Desktop/Abhishek/Sarthi/sarthi-backend && npx jest src/ai/prompts/destination.prompt.spec.ts --no-coverage -t "buildTrekPrompt" 2>&1 | tail -20`

Expected: FAIL — `user` does not contain `'## Context'`

- [ ] **Step 3: Refactor `buildTrekPrompt` to use `buildSearchContext` with trek mode**

Open `src/ai/prompts/destination.prompt.ts`, find `buildTrekPrompt`, and replace its body with this:

```typescript
export function buildTrekPrompt(params: TrekPromptParams): { system: string; user: string } {
  const healthContext = buildHealthContext(params);
  const searchContext = buildSearchContext(params, { mode: 'trek' });

  const trekList = params.treks
    .map(t => `  - ${t.name} | ${t.region} | ${t.peakAltitude}m | ${t.difficulty} | ${t.durationDays} days | Base: ${t.baseCamp} | Nearest city: ${t.nearestCity} | Terrain: ${t.terrain.join(', ')} | Highlights: ${t.highlights.join(', ')} | Permits: ${t.permits ? 'Yes' : 'No'} | Fitness: ${t.fitnessDemand}`)
    .join('\n');

  return {
    system: 'You are an expert Indian trek recommendation engine. You recommend specific named treks (not cities) based on the traveler\'s fitness, experience, dates, and preferences. You assess health and fitness suitability for each trek.',
    user: `Traveler: ${params.freeText}${healthContext}

${searchContext}

Recommend the best matching treks from this list. Rank best match first. For each, explain why it matches and assess health/fitness suitability.

Available treks:
${trekList}

Respond ONLY with a JSON object in exactly this format (no extra text):
{"treks":[{"name":"<exact trek name from above>","region":"<region>","baseCamp":"<base camp>","peakAltitude":"<e.g. 4,270m>","difficulty":"<difficulty>","durationDays":"<e.g. 5 days>","terrain":"<terrain summary>","whyItMatches":"<one sentence personalized to this traveler>","highlights":["<highlight1>","<highlight2>"],${HEALTH_ADVISORY_FORMAT},${COST_BREAKDOWN_FORMAT},${PERMITS_FORMAT},${TRIP_READINESS_FORMAT}}]}

Max 5 results, best match first.`,
  };
}
```

Delete the previous `travelerProfile` const inside `buildTrekPrompt`.

- [ ] **Step 4: Run tests to verify they pass**

Run: `cd /home/abhishek/Desktop/Abhishek/Sarthi/sarthi-backend && npx jest src/ai/prompts/destination.prompt.spec.ts --no-coverage -t "buildTrekPrompt" 2>&1 | tail -20`

Expected: All `buildTrekPrompt` tests pass. The existing `'user prompt contains trek names'`, `'user prompt contains trek details'`, `'includes health context'`, etc. still pass because those assertions are about trek-specific content unaffected by the refactor.

---

### Task 7: Full-suite verification

**Files:** none

- [ ] **Step 1: Run the full test suite**

Run: `cd /home/abhishek/Desktop/Abhishek/Sarthi/sarthi-backend && npx jest --no-coverage 2>&1 | tail -10`

Expected: `Test Suites: 10 passed, 10 total` and all tests pass (should be ~180 total after adding ~17 new tests).

- [ ] **Step 2: Run production build**

Run: `cd /home/abhishek/Desktop/Abhishek/Sarthi/sarthi-backend && npm run build 2>&1 | tail -10`

Expected: Build completes with no TypeScript errors.

- [ ] **Step 3: Smoke-check via end-to-end request (optional but recommended)**

If the dev server is not running, start it: `npm run start:dev` in a separate terminal.

Then POST to `/destination-finder/search` with the original failing case from the brainstorm:

```bash
curl -X POST http://localhost:3000/destination-finder/search \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer <your-firebase-token>" \
  -d '{
    "dates": { "from": "2026-04-17", "to": "2026-04-19" },
    "budget": { "min": 5000, "max": 6000 },
    "group": { "size": 4, "type": "friends" },
    "experienceTypes": ["City Walk", "Food", "Scenic Views"],
    "departureCity": "Ahmedabad",
    "freeText": "Looking for place with an weekend escape with good food, nice weather, and a city walk with cultural experience",
    "gender": "male",
    "age": 26,
    "weight": 70,
    "height": 178
  }'
```

Expected: The AI response should now either (a) include at least one nearby Gujarat option (Vadodara, Champaner, Polo Forest, Saputara, Surat), (b) acknowledge April heat for any plains destination in `weatherSnapshot` or `healthAdvisory.alerts`, and (c) flag over-budget destinations honestly in `tripReadiness.budget` instead of saying "Fits within the budget" for ₹8000 items.

If the cache has a stale result for the same payload, bust it by tweaking `freeText` slightly or flushing Redis.
