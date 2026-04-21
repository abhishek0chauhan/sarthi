# Smart Destination Finder — Design Spec
**Date:** 2026-03-22
**Project:** Sarthi — AI-powered Indian DIY travel companion
**Phase:** 1 (MVP)
**Status:** Draft

---

## Overview

The Smart Destination Finder recommends Indian travel destinations based on structured filters and a natural language prompt. It uses a hybrid approach: the database narrows candidates, and Claude personalizes and ranks them — keeping AI costs minimal and results consistent.

---

## User Interaction Model

**Hybrid input:** structured filters + free-text natural language.

**Structured filters:**
- Travel dates (from / to)
- Budget range per person (INR)
- Experience types (beach, mountains, heritage, adventure, wildlife, etc.)
- Departure city
- Group size and type (solo, couple, friends, family)

**Free text:** user describes their intent in their own words (e.g., "want something offbeat, not too touristy, good for trekking").

---

## Authentication & Rate Limiting

- The endpoint requires a valid **Firebase Auth JWT** in the `Authorization: Bearer <token>` header. Requests without a valid token return `401`.
- Rate limiting: **20 requests per user per minute** enforced via NestJS `ThrottlerModule` using Redis as the store. This applies to both `hybrid` and `claude_full` modes to protect Claude API quota.

---

## Architecture

```
Mobile App
    │
    ▼
POST /destination-finder/search  (Firebase Auth JWT required)
    │
    ▼
DestinationFinderModule (NestJS)
    ├── DestinationFinderController   ← validates & parses request, auth guard
    ├── DestinationFinderService      ← orchestrates flow, reads AI mode config
    ├── DestinationQueryService       ← queries PostgreSQL via Prisma
    ├── ClaudeService                 ← builds prompt, calls Claude API, validates output
    └── CacheService (Redis)          ← caches results by query fingerprint (TTL: 24h)
```

**Request flow:**
1. User submits filters + free text from mobile
2. Controller validates input and Firebase JWT, passes to `DestinationFinderService`
3. Service checks Redis cache — return cached result if hit
4. `DestinationQueryService` queries DB with structured filters → shortlist of up to 15 destinations
5. If DB returns results: Shortlist + user free text → `ClaudeService` (hybrid mode)
6. If DB returns no matches: log the fallback event, proceed to `ClaudeService` (claude_full mode) — **rate limit applies separately to fallback calls**
7. `ClaudeService` builds prompt, calls Claude API, validates and parses response
8. Response merged with DB data, cached in Redis, returned to mobile

---

## AI Mode Configuration

Each feature has its own AI mode flag — independently configurable per environment variable:

```env
DESTINATION_FINDER_AI_MODE=hybrid       # DB-first, Claude ranks + personalizes
DESTINATION_FINDER_AI_MODE=claude_full  # Claude handles everything, DB skipped
```

`DestinationFinderService` reads this flag and routes to the appropriate strategy. No code changes needed to switch — only an env var change. Both modes use the same `ClaudeService` with different prompt templates.

**Automatic fallback:** When `hybrid` mode DB query returns zero results, the service automatically falls back to `claude_full`. This fallback is logged (`WARN` level) so it can be monitored and used to identify gaps in the destination dataset.

---

## Data Model

```prisma
model Destination {
  id              String   @id @default(uuid())
  name            String
  state           String
  region          String   // North, South, East, West, Central, NE
  experienceTypes String[] // ["beach", "heritage", "adventure"]
  budgetMin       Int      // per person per day in INR
  budgetMax       Int
  bestMonths      Int[]    // [10, 11, 12, 1] — month numbers
  highlights      String[] // top 3-4 attractions
  isHiddenGem     Boolean  @default(false)
  weatherSummary  String   // "Pleasant, 18-25°C in Oct-Feb"
  travelTimes     Json     // { "Mumbai": "6h train", "Delhi": "2h flight" }
  createdAt       DateTime @default(now())
  updatedAt       DateTime @updatedAt
}
```

### DB Filter Logic

**Budget:** Include destination if ranges overlap — `destination.budgetMin <= request.budget.max AND destination.budgetMax >= request.budget.min`.

**Best months:** Extract all calendar months spanned by the request date range (e.g., May 1–May 7 → `[5]`; Apr 28–May 3 → `[4, 5]`). Include destinations where at least one of those months appears in `bestMonths`. This is a hard filter, not a sort weight.

**Experience types:** Destination must contain at least one of the requested `experienceTypes`.

**Region:** Derived from `departureCity` if a regional preference is implied; otherwise not filtered.

---

## API Contract

### Request
```
POST /destination-finder/search
Authorization: Bearer <firebase-jwt>
```

```json
{
  "dates": { "from": "2025-05-01", "to": "2025-05-07" },
  "budget": { "min": 5000, "max": 15000 },
  "experienceTypes": ["mountains", "adventure"],
  "departureCity": "Mumbai",
  "group": { "size": 4, "type": "friends" },
  "freeText": "want something offbeat, not too touristy, good for trekking"
}
```

### Response
```json
{
  "mode": "hybrid",
  "results": [
    {
      "name": "Kasol",
      "state": "Himachal Pradesh",
      "isHiddenGem": true,
      "budgetEstimate": "₹8,000–12,000 per person",
      "weatherSnapshot": "Pleasant, 12-20°C in May",
      "travelTime": "14h bus from Mumbai",
      "highlights": ["Kheerganga trek", "Parvati Valley", "Cafe culture"],
      "whyItMatches": "Offbeat hill town perfect for friend groups who trek — less crowded than Manali in May"
    }
  ]
}
```

**`whyItMatches`** is the **only field Claude generates** in hybrid mode. All other fields come from the DB.

**`travelTime`** is extracted from `destination.travelTimes[request.departureCity]`. If the departure city has no entry in the map, `travelTime` is omitted from the response (field not present, not `null`). In `claude_full` mode, Claude is asked to estimate travel time from the departure city.

---

## Claude Prompt Design

### Exact shape of `shortlistedDestinations` payload sent to Claude

Only the fields Claude needs are serialized (not the full Prisma row):

```json
[
  {
    "id": "uuid",
    "name": "Kasol",
    "state": "Himachal Pradesh",
    "experienceTypes": ["mountains", "adventure", "trekking"],
    "isHiddenGem": true,
    "weatherSummary": "Pleasant, 12-20°C in May",
    "budgetMin": 700,
    "budgetMax": 1200
  }
]
```

### Hybrid Mode (token-efficient)

**System prompt:**
```
You are a travel recommendation engine for Indian destinations.
Respond only in valid JSON. No explanations.
```

**User prompt:**
```
Traveler context: {freeText}
Group: {size} {type} | Budget: ₹{min}–{max}/person | Dates: {from} to {to} | From: {departureCity}

Rank these destinations and write a one-line "whyItMatches" for each:
{shortlistedDestinations}

Return: [{ "id": "...", "whyItMatches": "..." }] ranked by best match. Max 5 results.
```

### Claude-Full Mode (fallback / override)

**User prompt** (replaces above):
```
Traveler context: {freeText}
Group: {size} {type} | Budget: ₹{min}–{max}/person | Dates: {from} to {to} | From: {departureCity}

Recommend up to 5 Indian travel destinations that best match this traveler.
For each destination return:
{
  "name": "...",
  "state": "...",
  "isHiddenGem": true/false,
  "budgetEstimate": "₹X–Y per person for N days",
  "weatherSnapshot": "...",
  "travelTime": "estimated travel time from {departureCity}",
  "highlights": ["...", "...", "..."],
  "whyItMatches": "one line explanation"
}

Return a JSON array. No explanations outside the array.
```

### Claude Response Validation

After receiving Claude's response:
1. Parse JSON — if parsing fails, do not throw; fall back to returning top 5 DB results with no `whyItMatches` field, log `ERROR`.
2. In hybrid mode: filter Claude's returned IDs to only those present in the shortlist (discard unknown IDs).
3. Cap results at 5 regardless of how many Claude returns.
4. If Claude returns an empty array in hybrid mode, return top 5 DB results with no `whyItMatches`, log `WARN`.

### Token Estimate (hybrid mode)

| Component | Tokens |
|---|---|
| System prompt | ~50 |
| User context + filters | ~80 |
| 10 shortlisted destinations (compact JSON) | ~300 |
| Claude output (5 results) | ~150 |
| **Total** | **~580 tokens/search** |

---

## Caching Strategy

- **Cache key:** SHA-256 hash of the JSON-serialized object `{ dates, budget, experienceTypes, departureCity, group, normalizedFreeText }`
- **`normalizedFreeText` normalization:** lowercase → trim whitespace → collapse multiple spaces to one → strip punctuation (non-alphanumeric, non-space characters)
- **TTL:** 24 hours
- **Store:** Redis
- Identical or near-identical queries (after normalization) skip Claude entirely

---

## Error Handling

| Scenario | Behavior |
|---|---|
| Missing / invalid Firebase JWT | 401 Unauthorized |
| Rate limit exceeded | 429 Too Many Requests |
| Invalid request payload | 400 with validation errors |
| DB returns no matches (hybrid) | Log WARN, auto-fallback to `claude_full` |
| Claude returns malformed JSON | Log ERROR, return top 5 DB results with no `whyItMatches` |
| Claude returns empty array | Log WARN, return top 5 DB results with no `whyItMatches` |
| Claude API error | Return cached result if available, else 503 with user-friendly message |
| Redis unavailable | Proceed without cache (degrade gracefully) |

---

## Out of Scope (Phase 1)

- Semantic / vector search (Phase 2)
- Real-time weather API integration
- User history / personalization based on past searches
- Booking integration
