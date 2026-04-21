# Smart Destination Finder — Design Spec (v2)
**Date:** 2026-04-08
**Project:** Sarthi — AI-powered Indian DIY travel companion
**Phase:** 1 (MVP)
**Status:** Approved
**Supersedes:** 2026-03-22-smart-destination-finder-design.md

---

## Overview

The Smart Destination Finder recommends Indian travel destinations based on structured filters and a natural language prompt. It uses a hybrid approach: the database narrows candidates, and AI personalizes and ranks them — keeping AI costs zero (Gemini free tier) and results consistent.

**Key change from v1:** Claude API replaced with Vercel AI SDK + Google Gemini 2.0 Flash. Structured output via Zod schemas eliminates all JSON parsing/fallback logic.

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
- Rate limiting: **20 requests per user per minute** enforced via NestJS `ThrottlerModule` using Redis as the store. This applies to both `hybrid` and `ai_full` modes to protect Gemini API quota.

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
    ├── AiService                     ← Vercel AI SDK + Gemini, structured output via Zod
    └── CacheService (Redis)          ← caches results by query fingerprint (TTL: 24h)
```

**Request flow:**
1. User submits filters + free text from mobile
2. Controller validates input and Firebase JWT, passes to `DestinationFinderService`
3. Service checks Redis cache — return cached result if hit
4. `DestinationQueryService` queries DB with structured filters → shortlist of up to 15 destinations
5. If DB returns results: Shortlist + user free text → `AiService` (hybrid mode)
6. If DB returns no matches: log the fallback event, proceed to `AiService` (ai_full mode) — rate limit applies separately to fallback calls
7. `AiService` calls Gemini via Vercel AI SDK's `generateObject()` with Zod schema — response is typed and validated automatically
8. Response merged with DB data, cached in Redis, returned to mobile

---

## AI Layer

### Tech Stack

- **Vercel AI SDK** (`ai` package) — model-agnostic AI abstraction
- **Google Gemini provider** (`@ai-sdk/google`) — connects to Gemini API
- **Zod** — defines output schemas, enforces structured output
- **Model:** `gemini-2.0-flash` (free tier: 15 RPM, 1M tokens/day)

### AiService

Two methods matching the two modes:

**`rankDestinations()`** (hybrid mode):
- Input: shortlisted destinations (compact fields) + user context
- Output: `Array<{ id: string, whyItMatches: string }>` — enforced by Zod schema
- Gemini only ranks and writes one-line explanations; all other data comes from DB

**`generateDestinations()`** (ai_full mode / fallback):
- Input: user context only (no DB data)
- Output: `Array<{ name: string, state: string, isHiddenGem: boolean, budgetEstimate: string, weatherSnapshot: string, travelTime: string, highlights: string[], whyItMatches: string }>` — enforced by Zod schema
- Gemini generates everything

### Structured Output

Vercel AI SDK's `generateObject()` takes a Zod schema and instructs the model to return data matching that exact shape. The response is parsed and validated automatically — no manual JSON parsing, no malformed JSON error path.

If the model fails to produce valid structured output, `generateObject()` throws an error. This is handled the same as any API error (see Error Handling).

### Prompt Design

**System prompt (shared):**
```
You are a travel recommendation engine for Indian destinations.
```

**Hybrid mode user prompt:**
```
Traveler context: {freeText}
Group: {size} {type} | Budget: ₹{min}–{max}/person | Dates: {from} to {to} | From: {departureCity}

Rank these destinations and write a one-line "whyItMatches" for each:
{shortlistedDestinations}

Return ranked by best match. Max 5 results.
```

**AI-full mode user prompt:**
```
Traveler context: {freeText}
Group: {size} {type} | Budget: ₹{min}–{max}/person | Dates: {from} to {to} | From: {departureCity}

Recommend up to 5 Indian travel destinations that best match this traveler.
```

Note: Unlike v1, the prompts do not need to instruct "respond in JSON" or describe the output format — the Zod schema handles that via structured output.

### Token Estimate (hybrid mode)

| Component | Tokens |
|---|---|
| System prompt | ~20 |
| User context + filters | ~80 |
| 10 shortlisted destinations (compact JSON) | ~300 |
| Gemini output (5 results) | ~150 |
| **Total** | **~550 tokens/search** |

Free tier (1M tokens/day) supports ~1,800 searches/day.

---

## AI Mode Configuration

Each feature has its own AI mode flag — independently configurable per environment variable:

```env
DESTINATION_FINDER_AI_MODE=hybrid     # DB-first, AI ranks + personalizes
DESTINATION_FINDER_AI_MODE=ai_full    # AI handles everything, DB skipped
```

`DestinationFinderService` reads this flag and routes to the appropriate strategy. No code changes needed to switch — only an env var change. Both modes use the same `AiService` with different methods.

**Automatic fallback:** When `hybrid` mode DB query returns zero results, the service automatically falls back to `ai_full`. This fallback is logged (`WARN` level) so it can be monitored and used to identify gaps in the destination dataset.

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

**`whyItMatches`** is the **only field AI generates** in hybrid mode. All other fields come from the DB.

**`travelTime`** is extracted from `destination.travelTimes[request.departureCity]`. If the departure city has no entry in the map, `travelTime` is omitted from the response (field not present, not `null`). In `ai_full` mode, Gemini is asked to estimate travel time from the departure city.

---

## Caching Strategy

- **Cache key:** SHA-256 hash of the JSON-serialized object `{ dates, budget, experienceTypes, departureCity, group, normalizedFreeText }`
- **`normalizedFreeText` normalization:** lowercase → trim whitespace → collapse multiple spaces to one → strip punctuation (non-alphanumeric, non-space characters)
- **TTL:** 24 hours
- **Store:** Redis
- Identical or near-identical queries (after normalization) skip AI entirely

---

## Error Handling

| Scenario | Behavior |
|---|---|
| Missing / invalid Firebase JWT | 401 Unauthorized |
| Rate limit exceeded | 429 Too Many Requests |
| Invalid request payload | 400 with validation errors |
| DB returns no matches (hybrid) | Log WARN, auto-fallback to `ai_full` |
| AI returns empty array (valid per schema) | Log WARN, return top 5 DB results with no `whyItMatches` |
| AI API error (including structured output failure) | Return cached result if available, else 503 with user-friendly message |
| Redis unavailable | Proceed without cache (degrade gracefully) |

Note: The "AI returns malformed JSON" error path from v1 no longer exists — Vercel AI SDK's structured output guarantees valid, schema-conformant responses. If the model cannot produce valid output, it surfaces as an API error.

---

## File Map

| File | Responsibility |
|---|---|
| `prisma/schema.prisma` | Destination model |
| `src/prisma/prisma.service.ts` | PrismaClient wrapper (NestJS injectable) |
| `src/prisma/prisma.module.ts` | Exports PrismaService globally |
| `src/auth/firebase-auth.guard.ts` | Verifies Firebase JWT on incoming requests |
| `src/cache/cache.service.ts` | Redis get/set + cache key builder + text normalizer |
| `src/cache/cache.module.ts` | Exports CacheService globally |
| `src/ai/schemas/destination.schema.ts` | Zod schemas for hybrid and ai_full output |
| `src/ai/prompts/destination.prompt.ts` | Builds hybrid and ai_full prompts |
| `src/ai/ai.service.ts` | Calls Gemini via Vercel AI SDK `generateObject()` |
| `src/ai/ai.module.ts` | Exports AiService globally |
| `src/destination-finder/dto/search-destinations.dto.ts` | Request validation (class-validator) |
| `src/destination-finder/destination-query.service.ts` | Prisma DB queries with filter logic |
| `src/destination-finder/destination-finder.service.ts` | Orchestrates cache → DB → AI flow |
| `src/destination-finder/destination-finder.controller.ts` | HTTP endpoint, auth guard, throttle |
| `src/destination-finder/destination-finder.module.ts` | Wires all the above together |
| `src/app.module.ts` | Root module — add ThrottlerModule + feature module |

---

## Prerequisites

**Infrastructure (Docker):**
- PostgreSQL: `docker run -d -p 5433:5432 -e POSTGRES_PASSWORD=postgres postgres`
- Redis: `docker run -d -p 6379:6379 redis`

**Environment variables (`.env`):**
```env
DATABASE_URL="postgresql://postgres:postgres@localhost:5433/sarthi"
REDIS_URL="redis://localhost:6379"
GOOGLE_GENERATIVE_AI_API_KEY="your-gemini-api-key"
DESTINATION_FINDER_AI_MODE="hybrid"
FIREBASE_PROJECT_ID="your-firebase-project-id"
```

**Dependencies:**
```
# Production
ai @ai-sdk/google zod
@prisma/client ioredis firebase-admin
class-validator class-transformer @nestjs/config @nestjs/throttler

# Dev
prisma @types/ioredis
```

**Node.js:** v18+ required (v24 confirmed)

---

## Out of Scope (Phase 1)

- Semantic / vector search (Phase 2)
- Real-time weather API integration
- User history / personalization based on past searches
- Booking integration
- Agent patterns / multi-step AI reasoning (evaluate for Itinerary Builder in Phase 2)
