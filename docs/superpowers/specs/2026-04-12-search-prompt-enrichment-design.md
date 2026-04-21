# Search Prompt Enrichment — Design Spec

**Date:** 2026-04-12
**Status:** Approved, ready for implementation planning
**Scope:** Backend-only. No API shape changes. No schema changes. Pure prompt-quality improvements.

## Goal

Make `/destination-finder/search` produce smarter recommendations by giving the AI richer context and clearer rules. Today the AI:
- Recommends Udaipur (₹8000) for a ₹5000–6000 budget without noting the gap
- Doesn't acknowledge that April in Rajasthan is 42°C+
- Ignores that a 2-day trip from Ahmedabad to Varanasi is mostly travel time
- Treats "friends" and "family" groups identically

This spec fixes all four issues via prompt changes only.

## Non-Goals

- No new response fields (`searchInsight`, `budgetFit`) — deferred to a follow-up after the prompt improvements are observed in practice
- No database/shortlist changes
- No changes to itinerary or food-guide prompts
- No changes to the AI model, schemas, or controller

## Architecture

Add one shared helper in `src/ai/prompts/destination.prompt.ts`:

```typescript
function buildSearchContext(params: SearchContextParams): string
```

It returns a `## Context` + `## Rules` block that is injected into each of the three search prompts: `buildHybridPrompt`, `buildAiFullPrompt`, `buildTrekPrompt`. The existing `travelerProfile` line and inline Budget rule in those functions are **replaced** by this block (not duplicated).

Two small utilities live beside it:
- `computeTripDays(dates: { from: string; to: string }): number` — `ceil((to − from) / 86_400_000) + 1`
- `monthNameFromDate(date: string): string` — returns `"January"` through `"December"`; throws on invalid input

### SearchContextParams

```typescript
interface SearchContextParams {
  dates: { from: string; to: string };
  group: { size: number; type: string };
  budget: { min: number; max: number };
  departureCity: string;
}
```

Health fields are handled separately by the existing `buildHealthContext(params)` — not duplicated here.

### Group Hints

```typescript
const GROUP_HINTS: Record<string, string> = {
  solo:    'prioritize safe, social destinations with good transport connectivity',
  couple:  'prioritize romantic, scenic stays and intimate experiences',
  friends: 'prioritize nightlife, adventure activities, and shared experiences',
  family:  'prioritize kid-friendly activities and accessible family stays',
};
```

If `group.type` is not in the map, the group-fit line falls back to `'tailor to the group's vibe'`.

## The Context + Rules Block

`buildSearchContext` returns exactly this (with `${...}` values substituted):

```
## Context
- Trip length: ${tripDays} days (${dates.from} to ${dates.to})
- Travel month: ${monthName}
- Departure city: ${departureCity}
- Group: ${group.size} ${group.type} — ${groupHint}
- Budget: ₹${budget.min}–${budget.max}/person total

## Rules
- Proximity: Prefer destinations reachable within 6–8h of ${departureCity}. For trips of ≤3 days, avoid destinations that need >4h one-way travel — it eats into the trip. Flag long travel in tripReadiness (e.g. "6h each way leaves only 1 full day onsite").
- Season: If ${monthName} is sub-optimal for a destination (peak summer heat in the plains, monsoon flooding in the ghats, winter closures in the hills), surface it in weatherSnapshot and healthAdvisory.alerts. Do not pretend the weather is pleasant when it isn't.
- Group-fit: Tailor picks to the group type — do not recommend backpacker hostels to a family or temple tours to a friends trip unless explicitly requested.
- Budget: If realistic cost exceeds ₹${budget.min}–${budget.max}/person, set costBreakdown.total to the honest number and explain the gap in tripReadiness.budget (e.g. "₹2000 over — drop to budget guesthouses and local transport to fit").
- Nearby gems: Surface at least one less-touristy option within easy reach of ${departureCity} when possible (set isHiddenGem: true).
```

## Integration Per Prompt Function

### `buildAiFullPrompt`

Current structure:
```
Traveler: {freeText}
{travelerProfile}{healthContext}

Recommend up to 5 Indian travel destinations...

Budget rule: <inline rule added in previous session>

Respond ONLY with a JSON object...
```

New structure:
```
Traveler: {freeText}{healthContext}

{buildSearchContext(params)}

Recommend up to 5 Indian travel destinations that best match this traveler.
For each destination, assess health/fitness suitability based on the traveler's profile.

Respond ONLY with a JSON object...
```

The previous `travelerProfile` one-liner and the inline `Budget rule:` paragraph are removed — their content now lives in the Context block (richer form).

### `buildHybridPrompt`

Same pattern. The `travelerProfile` line and inline `Budget rule:` paragraph are removed and replaced by `buildSearchContext(params)` above the destinations list.

### `buildTrekPrompt`

Same pattern with one tweak: the Season rule is softened to "Flag any trek where conditions in ${monthName} are borderline (late-season snow, early-season monsoon)" because `TrekService.filterForSearch` already pre-filters by month, so the AI shouldn't re-filter — just flag borderline cases.

The Proximity rule is kept as-is — trek base camps are often far from cities, but the rule still helps the AI prioritize closer treks for short trips.

Group-fit and Budget rules apply identically to treks. The Nearby-gems rule is omitted for treks (treks are already "gems" — the emphasis doesn't help).

## Files Changed

| File | Change |
|---|---|
| `src/ai/prompts/destination.prompt.ts` | Add `computeTripDays`, `monthNameFromDate`, `GROUP_HINTS`, `SearchContextParams`, `buildSearchContext`. Update `buildHybridPrompt`, `buildAiFullPrompt`, `buildTrekPrompt` to use it. Remove the now-duplicated `travelerProfile` lines and inline Budget rules. |
| `src/ai/prompts/destination.prompt.spec.ts` | Add tests for new helpers and assertions on the Context block. Update any existing tests whose expectations changed. |

No other file changes. Service, schema, controller, DTO, cache, treks module — all untouched.

## Testing

New tests (~15):

**`computeTripDays`**
- Returns 1 for same-day range (`from == to`)
- Returns 3 for a 2-day span (e.g. 2026-06-01 to 2026-06-03)
- Works across month boundaries
- Works across leap-day boundary (2024-02-28 to 2024-03-01 → 3 days)

**`monthNameFromDate`**
- Returns `"January"` for a January date, `"December"` for December
- Throws for invalid date string

**`buildSearchContext`**
- Output contains trip length, travel month, departure city, group size, group type, budget range
- Each of the 4 known group types (`solo`, `couple`, `friends`, `family`) produces its specific hint
- Unknown group type produces the fallback hint
- Output contains each of the 5 rule headings: `Proximity:`, `Season:`, `Group-fit:`, `Budget:`, `Nearby gems:`

**Each existing prompt builder**
- `buildAiFullPrompt`, `buildHybridPrompt`, `buildTrekPrompt` — assert `user` string contains `## Context` and `## Rules`
- `buildTrekPrompt` — assert Nearby-gems rule is absent (trek-specific omission)

**Existing tests**
- Most keep passing unchanged (group size, budget, etc. are still in the output, just relocated)
- Any test that asserted on the exact `travelerProfile` format (`"Group: ... | Budget: ..."`) is updated to the new Context block format

## Error Handling

`monthNameFromDate` throws on invalid input. This should never fire at runtime because `SearchDestinationsDto.dates.from` is `@IsDateString()`-validated upstream, but throwing is correct defensive behavior and matches the existing `TrekService.filterForSearch` pattern.

No other error paths change. AI errors still produce 503 via the existing `search()` try/catch.

## Rollout

Pure prompt change — no data migration, no cache invalidation concerns beyond the natural 24h TTL. After deploy, within 24 hours all cached searches will regenerate with the new prompt.

## Open Questions

None. Design is locked.

## Success Criteria

After deploy, the failing case from the brainstorm (`{budget: 5000-6000, dates: 2026-04-17 to 2026-04-19, from: Ahmedabad, experienceTypes: [City Walk, Food, Scenic Views]}`) should produce recommendations that:
- Include at least one nearby option (Vadodara, Champaner, Polo Forest, Saputara) — not just Udaipur/Jaipur/Delhi/Mumbai/Varanasi
- Acknowledge April heat in `weatherSnapshot` or `healthAdvisory.alerts` for any Rajasthan/plains suggestion
- Set `tripReadiness.budget` honestly for any over-budget suggestion (not the current "Fits within the budget" hallucination for ₹8000 items against a ₹6000 budget)
- Flag long-travel destinations in `tripReadiness` when the trip is 2 days
