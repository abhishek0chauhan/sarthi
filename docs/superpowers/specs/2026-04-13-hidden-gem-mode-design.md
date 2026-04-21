# Hidden Gem Mode — Design Spec

**Date:** 2026-04-13
**Status:** Approved, ready for implementation planning
**Scope:** Backend-only. Prompt enrichment + DTO field + cache key. No DB schema, no response schema changes.

## Goal

Add an optional `hiddenGem: boolean` field to `/destination-finder/search` requests. When `true`, the AI recommends only lesser-known places — not mainstream tourist destinations.

Rationale: some travelers explicitly want offbeat experiences. Today, the "Nearby gems" rule is a bonus ("surface at least one"). This feature lets users flip it to the primary directive.

## Non-Goals

- No DB-side pre-filtering (v1 is prompt-only — can add DB filter in v2 if AI results are poor)
- No trek-mode support (treks are already niche — field is silently ignored in trek mode)
- No new response fields (`isHiddenGem` already exists per-destination; frontend counts offbeat results from there)
- No separate UI mode / tab — just a boolean toggle

## Architecture

Three touch points:

1. **DTO** (`SearchDestinationsDto`): add `hiddenGem?: boolean` (class-validator `@IsOptional() @IsBoolean()`)
2. **Prompt helper** (`buildSearchContext`): extend `SearchContextParams` with optional `hiddenGem`; when `true` and mode is destination, swap the "Nearby gems" rule for a stronger "Hidden gems ONLY" rule
3. **Cache key** (`DestinationFinderService.search`): cache key already spreads `...rest` from the DTO — `hiddenGem` will be included automatically. Verify with a test.

Trek mode: `buildTrekPrompt` never passes `hiddenGem` to `buildSearchContext` (mode: 'trek' already omits the Nearby gems rule), so trek mode is effectively a no-op for this field. This is intentional.

### Prompt rule change

Currently in `buildSearchContext` (destination mode):
```
- Nearby gems: Surface at least one less-touristy option within easy reach of ${departureCity} when possible (set isHiddenGem: true).
```

When `hiddenGem: true`, replace with:
```
- Hidden gems ONLY: User explicitly requested offbeat destinations. Recommend ONLY lesser-known places. Avoid mainstream tourist circuits (e.g., Jaipur, Manali, Goa, Udaipur, Varanasi, Rishikesh, Agra, Shimla, Ooty). Prefer offbeat options (e.g., Champaner, Gokarna, Spiti, Araku Valley, Majuli, Chopta, Kasol, Polo Forest, Gandikota). Set "isHiddenGem": true for all results. If the budget/date constraints make true hidden gems scarce, pick the least-touristy option available and explain the trade-off in whyItMatches.
```

When `hiddenGem: false` or undefined: the existing "Nearby gems" rule stays as-is.

## Interface

```typescript
export interface SearchContextParams {
  dates: { from: string; to: string };
  group: { size: number; type: string };
  budget: { min: number; max: number };
  departureCity: string;
  hiddenGem?: boolean; // new — default false
}
```

`buildSearchContext(params, options)` — options signature unchanged. `hiddenGem` lives on params to keep it alongside the other request fields.

## DTO

```typescript
// SearchDestinationsDto
@IsOptional()
@IsBoolean()
hiddenGem?: boolean;
```

## Service Wiring

`DestinationFinderService` already passes the full DTO into each prompt builder via `...dto`. Since `PromptParams` will include `hiddenGem` via its extension from `SearchDestinationsDto`-shaped objects, no service changes beyond updating the prompt builder type.

**Important:** Verify `PromptParams` interface in `destination.prompt.ts` includes `hiddenGem?: boolean` so TypeScript accepts it when spread.

## Cache

`search()` builds cache key from `...rest` spread of the DTO, so `hiddenGem` is included automatically. Write a test to verify: requests with `hiddenGem: true` and `hiddenGem: false` (or undefined) produce distinct cache keys.

## Files Changed

| File | Change |
|---|---|
| `src/destination-finder/dto/search-destinations.dto.ts` | Add `hiddenGem?: boolean` field |
| `src/ai/prompts/destination.prompt.ts` | Extend `SearchContextParams` and `PromptParams` with `hiddenGem?: boolean`; update `buildSearchContext` to swap rule when true |
| `src/ai/prompts/destination.prompt.spec.ts` | New tests for `hiddenGem` behavior in `buildSearchContext` + integration tests on each builder |
| `src/destination-finder/destination-finder.service.spec.ts` | Add test verifying cache key differs when `hiddenGem` changes |

No other file changes.

## Testing

New tests (~8):

**`buildSearchContext`**
- With `hiddenGem: true`: output contains "Hidden gems ONLY:" rule
- With `hiddenGem: true`: output does NOT contain "Nearby gems:" rule (replaced, not added)
- With `hiddenGem: false`: output contains "Nearby gems:" rule (existing behavior)
- With `hiddenGem` undefined: output contains "Nearby gems:" rule (existing behavior)
- With `hiddenGem: true` AND `mode: 'trek'`: "Hidden gems ONLY:" rule is NOT added (trek mode ignores the field)

**`buildAiFullPrompt`**
- With `hiddenGem: true`: user prompt contains "Hidden gems ONLY:"

**`buildHybridPrompt`**
- With `hiddenGem: true`: user prompt contains "Hidden gems ONLY:"

**Cache**
- `search()` cache key differs between `hiddenGem: true` and `hiddenGem: undefined`

## Error Handling

No new error paths. Invalid `hiddenGem` value (e.g. string `"yes"` instead of boolean) is caught by class-validator → 400 response. Standard NestJS behavior.

## Rollout

Pure additive change — existing clients omitting `hiddenGem` see zero behavior change. Cached results from before this deploy stay valid (same cache key when `hiddenGem` is absent). After deploy, clients can start sending `hiddenGem: true` immediately.

## Success Criteria

After deploy, a request with `hiddenGem: true` from Ahmedabad should avoid returning Jaipur/Udaipur/Manali/Goa and instead surface places like Champaner, Polo Forest, Saputara, Statue of Unity area, Rann of Kutch off-season alternatives, etc. — or if constraints force it, pick the least-touristy option and flag the trade-off.
