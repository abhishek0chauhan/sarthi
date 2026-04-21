# Hidden Gem Mode Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add optional `hiddenGem: boolean` field to destination search. When `true`, AI recommends only offbeat/lesser-known destinations instead of mainstream ones.

**Architecture:** Add field to DTO, extend `SearchContextParams` + `PromptParams`, update `buildSearchContext` to swap "Nearby gems" rule for stronger "Hidden gems ONLY" rule when `hiddenGem: true`. Cache key already includes the field via DTO spread. Trek mode silently ignores the field.

**Tech Stack:** NestJS v11, TypeScript, class-validator, Jest 30. No DB/schema changes. No git commits — user controls commits.

**Spec:** `docs/superpowers/specs/2026-04-13-hidden-gem-mode-design.md`

---

## File Map

| File | Action | Responsibility |
|---|---|---|
| `src/destination-finder/dto/search-destinations.dto.ts` | Modify | Add `hiddenGem?: boolean` field with `@IsOptional() @IsBoolean()` |
| `src/ai/prompts/destination.prompt.ts` | Modify | Extend `SearchContextParams` and `PromptParams` with `hiddenGem?: boolean`; update `buildSearchContext` to swap rule when true |
| `src/ai/prompts/destination.prompt.spec.ts` | Modify | Add tests for `hiddenGem` behavior in `buildSearchContext`, `buildAiFullPrompt`, `buildHybridPrompt` |
| `src/destination-finder/destination-finder.service.spec.ts` | Modify | Add test verifying cache key differs when `hiddenGem` changes |

---

### Task 1: Extend `SearchContextParams` and `buildSearchContext` with `hiddenGem`

**Files:**
- Modify: `src/ai/prompts/destination.prompt.ts`
- Modify: `src/ai/prompts/destination.prompt.spec.ts`

- [ ] **Step 1: Write failing tests for hiddenGem in buildSearchContext**

Find the existing `describe('buildSearchContext', ...)` block in `src/ai/prompts/destination.prompt.spec.ts`. Add these tests inside it (alongside existing tests):

```typescript
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
    const ctx = buildSearchContext({ ...baseParams, hiddenGem: true }, { mode: 'trek' });
    expect(ctx).not.toContain('Hidden gems ONLY:');
    expect(ctx).not.toContain('Nearby gems:');
  });
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `cd /home/abhishek/Desktop/Abhishek/Sarthi/sarthi-backend && npx jest src/ai/prompts/destination.prompt.spec.ts --no-coverage -t buildSearchContext 2>&1 | tail -30`

Expected: FAIL with "Hidden gems ONLY:" not found in output (since we haven't added it yet)

- [ ] **Step 3: Update `SearchContextParams` and `buildSearchContext` implementation**

Open `src/ai/prompts/destination.prompt.ts`. Find `SearchContextParams` interface and add `hiddenGem?: boolean`:

```typescript
export interface SearchContextParams {
  dates: { from: string; to: string };
  group: { size: number; type: string };
  budget: { min: number; max: number };
  departureCity: string;
  hiddenGem?: boolean;
}
```

Find the `buildSearchContext` function. Replace the `nearbyGemsRule` variable and its usage with the new logic below.

Replace:
```typescript
  const nearbyGemsRule = mode === 'trek'
    ? ''
    : `\n- Nearby gems: Surface at least one less-touristy option within easy reach of ${params.departureCity} when possible (set isHiddenGem: true).`;
```

With:
```typescript
  const nearbyGemsRule = (() => {
    if (mode === 'trek') return '';
    if (params.hiddenGem) {
      return `\n- Hidden gems ONLY: User explicitly requested offbeat destinations. Recommend ONLY lesser-known places. Avoid mainstream tourist circuits (e.g., Jaipur, Manali, Goa, Udaipur, Varanasi, Rishikesh, Agra, Shimla, Ooty). Prefer offbeat options (e.g., Champaner, Gokarna, Spiti, Araku Valley, Majuli, Chopta, Kasol, Polo Forest, Gandikota). Set "isHiddenGem": true for all results. If the budget/date constraints make true hidden gems scarce, pick the least-touristy option available and explain the trade-off in whyItMatches.`;
    }
    return `\n- Nearby gems: Surface at least one less-touristy option within easy reach of ${params.departureCity} when possible (set isHiddenGem: true).`;
  })();
```

- [ ] **Step 4: Run tests to verify they pass**

Run: `cd /home/abhishek/Desktop/Abhishek/Sarthi/sarthi-backend && npx jest src/ai/prompts/destination.prompt.spec.ts --no-coverage -t buildSearchContext 2>&1 | tail -30`

Expected: All `buildSearchContext` tests pass (existing 13 + 5 new = 18).

---

### Task 2: Extend `PromptParams` with `hiddenGem` and verify integration tests

**Files:**
- Modify: `src/ai/prompts/destination.prompt.ts`
- Modify: `src/ai/prompts/destination.prompt.spec.ts`

- [ ] **Step 1: Write failing integration tests**

In `src/ai/prompts/destination.prompt.spec.ts`, find the existing `describe('buildAiFullPrompt', ...)` block and add:

```typescript
  it('includes Hidden gems ONLY rule when hiddenGem is true', () => {
    const { user } = buildAiFullPrompt({
      freeText: 'offbeat trip',
      group: { size: 2, type: 'couple' },
      budget: { min: 5000, max: 10000 },
      dates: { from: '2026-04-17', to: '2026-04-19' },
      departureCity: 'Ahmedabad',
      hiddenGem: true,
    });
    expect(user).toContain('Hidden gems ONLY:');
    expect(user).not.toContain('Nearby gems:');
  });
```

Find the existing `describe('buildHybridPrompt', ...)` block and add:

```typescript
  it('includes Hidden gems ONLY rule when hiddenGem is true', () => {
    const { user } = buildHybridPrompt({
      freeText: 'offbeat trip',
      group: { size: 2, type: 'couple' },
      budget: { min: 5000, max: 10000 },
      dates: { from: '2026-04-17', to: '2026-04-19' },
      departureCity: 'Ahmedabad',
      hiddenGem: true,
      destinations: [
        { id: 'uuid-1', name: 'Polo Forest', state: 'Gujarat', experienceTypes: ['nature'], isHiddenGem: true, weatherSummary: 'Mild', budgetMin: 1500, budgetMax: 3000 },
      ],
    });
    expect(user).toContain('Hidden gems ONLY:');
    expect(user).not.toContain('Nearby gems:');
  });
```

- [ ] **Step 2: Run tests to verify they fail with TS compile error**

Run: `cd /home/abhishek/Desktop/Abhishek/Sarthi/sarthi-backend && npx jest src/ai/prompts/destination.prompt.spec.ts --no-coverage 2>&1 | tail -30`

Expected: TypeScript compilation error — `hiddenGem` is not a recognized property on `PromptParams`.

- [ ] **Step 3: Extend `PromptParams` interface**

In `src/ai/prompts/destination.prompt.ts`, find the `PromptParams` interface. Add `hiddenGem?: boolean`:

```typescript
export interface PromptParams extends HealthProfile {
  freeText: string;
  group: { size: number; type: string };
  budget: { min: number; max: number };
  dates: { from: string; to: string };
  departureCity: string;
  hiddenGem?: boolean;
}
```

- [ ] **Step 4: Run tests to verify they pass**

Run: `cd /home/abhishek/Desktop/Abhishek/Sarthi/sarthi-backend && npx jest src/ai/prompts/destination.prompt.spec.ts --no-coverage 2>&1 | tail -10`

Expected: All tests pass. The `PromptParams` extension flows through `buildAiFullPrompt` and `buildHybridPrompt` via `buildSearchContext(params)` — since those functions pass the full params object, `hiddenGem` propagates automatically.

---

### Task 3: Add `hiddenGem` field to `SearchDestinationsDto`

**Files:**
- Modify: `src/destination-finder/dto/search-destinations.dto.ts`

- [ ] **Step 1: Add the field**

Open `src/destination-finder/dto/search-destinations.dto.ts`. Add `IsBoolean` to the imports from `class-validator`:

```typescript
import {
  IsArray,
  IsBoolean,
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
```

At the end of the `SearchDestinationsDto` class (after the `allergies` field), add:

```typescript
  @IsOptional()
  @IsBoolean()
  hiddenGem?: boolean;
```

- [ ] **Step 2: Run build to verify TypeScript compiles**

Run: `cd /home/abhishek/Desktop/Abhishek/Sarthi/sarthi-backend && npm run build 2>&1 | tail -10`

Expected: Build succeeds with no errors. The `DestinationFinderService` already spreads `...dto` into prompt builders, so `hiddenGem` flows through automatically.

- [ ] **Step 3: Run full test suite to confirm no regressions**

Run: `cd /home/abhishek/Desktop/Abhishek/Sarthi/sarthi-backend && npx jest --no-coverage 2>&1 | tail -10`

Expected: All tests pass (including the 7 new ones added in Tasks 1-2).

---

### Task 4: Add cache key test for `hiddenGem`

**Files:**
- Modify: `src/destination-finder/destination-finder.service.spec.ts`

- [ ] **Step 1: Read the existing spec file to understand test setup**

Open `src/destination-finder/destination-finder.service.spec.ts` and find tests that call `service.search(...)`. Identify the mock pattern used for `cacheService.buildKey` and `cacheService.get`/`set`.

- [ ] **Step 2: Write failing test asserting cache keys differ**

Add a new test inside the top-level describe block (near other `search` tests). The exact test structure depends on the existing test setup, but the assertion is:

Two calls to `service.search(dto)` — one with `hiddenGem: true` and one without — must produce different cache keys (different results of `cacheService.buildKey`).

Example shape (adapt to match existing setup):

```typescript
  it('produces different cache keys when hiddenGem differs', async () => {
    const baseDto: SearchDestinationsDto = {
      dates: { from: '2026-04-17', to: '2026-04-19' },
      budget: { min: 5000, max: 10000 },
      experienceTypes: ['nature'],
      departureCity: 'Ahmedabad',
      group: { size: 2, type: 'couple' },
      freeText: 'offbeat trip',
    };

    const keySpy = jest.spyOn(cacheService, 'buildKey');

    // reset mocks but keep spy
    (cacheService.get as jest.Mock).mockResolvedValue(null);
    (cacheService.set as jest.Mock).mockResolvedValue(undefined);
    // ensure AI is mocked so we don't actually call it
    // (adapt to existing mock pattern)

    await service.search(baseDto);
    const keyWithoutFlag = keySpy.mock.results[0].value;

    keySpy.mockClear();
    await service.search({ ...baseDto, hiddenGem: true });
    const keyWithFlag = keySpy.mock.results[0].value;

    expect(keyWithFlag).not.toBe(keyWithoutFlag);
  });
```

**Important:** Read the existing file first and adapt the test to match the existing mocking style. Do not duplicate `baseDto` if a fixture already exists — reuse it.

- [ ] **Step 3: Run test to verify it passes**

Run: `cd /home/abhishek/Desktop/Abhishek/Sarthi/sarthi-backend && npx jest src/destination-finder/destination-finder.service.spec.ts --no-coverage 2>&1 | tail -20`

Expected: The new test passes immediately (because `...rest` spread in `cacheService.buildKey` already includes `hiddenGem`). This is a regression guard — the test proves the cache correctly discriminates on the field.

If the test fails, inspect how `cacheService.buildKey` is called in `search()` (line 29-32 of service) and ensure `hiddenGem` is part of the spread `rest`.

---

### Task 5: Full-suite verification and build

**Files:** none

- [ ] **Step 1: Run full test suite**

Run: `cd /home/abhishek/Desktop/Abhishek/Sarthi/sarthi-backend && npx jest --no-coverage 2>&1 | tail -10`

Expected: `Test Suites: 10 passed, 10 total` with all tests green. Total test count should be ~195+ (187 previous + ~8 new).

- [ ] **Step 2: Run production build**

Run: `cd /home/abhishek/Desktop/Abhishek/Sarthi/sarthi-backend && npm run build 2>&1 | tail -10`

Expected: Build completes with no TypeScript errors.

- [ ] **Step 3: Optional smoke test**

If dev server is running, POST to `/destination-finder/search` with `hiddenGem: true`:

```bash
curl -X POST http://localhost:3000/destination-finder/search \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer <firebase-token>" \
  -d '{
    "dates": { "from": "2026-11-10", "to": "2026-11-14" },
    "budget": { "min": 8000, "max": 15000 },
    "group": { "size": 2, "type": "couple" },
    "experienceTypes": ["Nature", "Offbeat"],
    "departureCity": "Ahmedabad",
    "freeText": "want something offbeat away from tourist crowds",
    "hiddenGem": true
  }'
```

Expected: Results should heavily skew toward offbeat destinations (Polo Forest, Champaner, Saputara, Gandikota, Araku Valley, Majuli, Spiti) and avoid mainstream circuits (Jaipur, Manali, Goa). All `isHiddenGem` flags should be `true`.

Tweak freeText to bust cache if you get stale results.
