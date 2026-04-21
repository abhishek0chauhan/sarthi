# Phase 2B: Intelligence Layer — Design Spec

**Date:** 2026-04-16
**Status:** Approved
**Depends on:** Phase 2A (Saved Trips Core) — completed
**Goal:** Make Sarthi understand *who* the traveler is, so every recommendation is personal.

---

## Overview

Today Sarthi collects preferences per-request (budget, dates, diet, etc.) but forgets the user between sessions. Phase 2B adds a persistent **Traveler Personality Profile** that captures how someone travels — their style, tolerances, motivations — and feeds it into every AI prompt. The system also learns from user behavior over time (corrections, reactions).

---

## Features

### 1. Traveler Personality Profile

#### 1.1 Onboarding — Two Paths

Users choose how to build their profile. Both paths feed the same personality vector.

**Path A: "Tell us about a trip" (Story Mode)**

A single open-ended text box:

> *"Tell us about a trip you loved — what made it great? And a trip (or moment) that didn't work for you — what went wrong?"*

The AI extracts personality dimensions from the natural story. Example input:

> *"I loved my Spiti trip — we stayed 3 days in Langza just talking to locals, slept in a homestay with no toilet attached, the roads were terrible but the views made up for it. I hated Manali though — too crowded, everything was overpriced, and the hotel felt like every other city hotel."*

AI extraction: depth > breadth, homestay > hotel, high ground-reality tolerance, low crowd tolerance, budget-conscious, nature + culture driven, loose pace.

**Path B: Quick Questions (Quiz Mode)**

9 multiple-choice questions. If the user already did Path A, questions are pre-filled where the story covered a dimension — user just confirms or adjusts.

**Path C: Both**

Story first, then quiz with pre-filled answers. More data = better recommendations.

#### 1.2 Nine Personality Dimensions

Each dimension is stored as a discrete value in the user's profile.

| # | Dimension | Question | Options |
|---|---|---|---|
| 1 | **Travel Pace** | "On a trip, you'd rather..." | `packed` — Pack every hour with activities / `loose` — Have a loose plan with free time / `no_plan` — No plan, just wander |
| 2 | **Depth vs Breadth** | "In 3 days at a new place, you'd rather..." | `deep` — Stay in one place, explore deeply / `balanced` — Mix of depth and moving around / `cover` — Cover as many places as possible |
| 3 | **Comfort Level** | "Your ideal stay is..." | `hotel` — Clean hotel with AC & WiFi / `homestay` — Homestay with a local family / `rough` — Tent, dorm, or whatever's available |
| 4 | **Crowd Tolerance** | "A popular tourist spot with long queues..." | `worth_it` — Worth it if it's iconic / `hidden` — I'd rather find the hidden version / `avoid` — Hard pass |
| 5 | **Travel Motivations** | "You travel mainly for..." (pick 2-3) | `food`, `nature`, `culture`, `adventure`, `photography`, `spiritual`, `nightlife`, `shopping`, `relaxation` |
| 6 | **Physical Readiness** | "A 2-hour uphill hike to a stunning viewpoint..." | `yes` — Let's go! / `maybe` — Maybe if it's not too steep / `no` — I'll enjoy the view from photos |
| 7 | **Spending Style** | "On trips you tend to..." | `experience` — Splurge on experiences, save on stays / `budget` — Budget everything / `comfort` — Comfort is worth paying for |
| 8 | **Ground Reality Tolerance** | "Basic toilets, bumpy roads, no phone signal..." | `bring_it` — Part of the adventure / `tolerate` — Can handle it for a great place / `need_comfort` — Need minimum comforts |
| 9 | **Language Comfort** | "Traveling where you don't speak the local language..." | `fine` — Fine anywhere, I'll figure it out / `hindi` — Prefer Hindi-speaking regions / `english` — Need English signage and communication |

#### 1.3 Story Analysis — AI Extraction

When the user submits a story (Path A), the backend sends it to the AI with a structured extraction prompt. The AI returns a partial personality profile (only dimensions it can confidently extract from the story). Unextracted dimensions remain null until the user answers them via quiz or the system infers them later.

**Extraction prompt returns:**

```typescript
{
  travelPace?: 'packed' | 'loose' | 'no_plan',
  depthVsBreadth?: 'deep' | 'balanced' | 'cover',
  comfortLevel?: 'hotel' | 'homestay' | 'rough',
  crowdTolerance?: 'worth_it' | 'hidden' | 'avoid',
  travelMotivations?: string[],  // subset of allowed values
  physicalReadiness?: 'yes' | 'maybe' | 'no',
  spendingStyle?: 'experience' | 'budget' | 'comfort',
  groundReality?: 'bring_it' | 'tolerate' | 'need_comfort',
  languageComfort?: 'fine' | 'hindi' | 'english',
  confidence: number  // 0-100, how much the story revealed
}
```

#### 1.4 Data Model

New Prisma model `TravelerProfile`, one-to-one with `User`:

```
TravelerProfile
  id            String   @id @default(uuid())
  userId        String   @unique (FK -> User)
  story         String?  (raw story text, for re-extraction if dimensions change)
  travelPace    String?  (enum: packed/loose/no_plan)
  depthVsBreadth String? (enum: deep/balanced/cover)
  comfortLevel  String?  (enum: hotel/homestay/rough)
  crowdTolerance String? (enum: worth_it/hidden/avoid)
  travelMotivations String[] (array of motivation tags)
  physicalReadiness String? (enum: yes/maybe/no)
  spendingStyle String?  (enum: experience/budget/comfort)
  groundReality String?  (enum: bring_it/tolerate/need_comfort)
  languageComfort String? (enum: fine/hindi/english)
  completeness  Int      (0-100, how many dimensions are filled)
  createdAt     DateTime
  updatedAt     DateTime
```

All dimension fields are nullable — profile can be partial and still useful.

#### 1.5 API Endpoints

| Method | Path | Auth | Description |
|---|---|---|---|
| POST | `/profile/story` | Yes | Submit trip story, AI extracts dimensions, returns extracted profile |
| GET | `/profile` | Yes | Get current personality profile |
| PUT | `/profile/quiz` | Yes | Submit/update quiz answers (partial updates allowed) |
| GET | `/profile/quiz-prefill` | Yes | Get quiz with pre-filled values from story extraction |
| DELETE | `/profile` | Yes | Reset profile to empty |

---

### 2. Personal Match Signals

Once a personality profile exists, every AI-generated place/activity in search results and itineraries includes a match signal.

#### 2.1 Match Signal Format

```typescript
{
  matchLevel: 'great_match' | 'good_match' | 'heads_up' | 'not_your_style',
  reason: string  // one sentence: "Uncrowded waterfall with a 45-min hike — fits your love for nature and adventure"
}
```

#### 2.2 How It Works

The personality profile is serialized into a `## Traveler Personality` block and injected into the existing prompt builders (`buildHybridPrompt`, `buildAiFullPrompt`, `buildItineraryPrompt`, `buildFoodGuidePrompt`, `buildTrekPrompt`). The AI is instructed to include a `personalMatch` field in each result.

If the user has no profile (or an empty one), the `personalMatch` field is omitted — existing behavior unchanged.

#### 2.3 Prompt Injection Example

```
## Traveler Personality
- Pace: loose (prefers free time over packed schedules)
- Depth: deep (stays in one place, explores thoroughly)
- Comfort: homestay (prefers local stays over hotels)
- Crowds: avoid (dislikes crowded tourist spots)
- Motivations: nature, culture
- Physical: yes (enjoys hikes and physical activities)
- Spending: budget (minimizes costs)
- Ground reality: bring_it (fine with basic facilities)
- Language: fine (comfortable anywhere)

For each place/activity, include:
"personalMatch": { "matchLevel": "<great_match|good_match|heads_up|not_your_style>", "reason": "<one sentence explaining why this fits or doesn't fit this specific traveler>" }
```

---

### 3. Corrections Loop

When users modify their saved trips (Phase 2A already supports PATCH), the system captures what changed and feeds it back.

#### 3.1 Correction Storage

New Prisma model `Correction`:

```
Correction
  id          String   @id @default(uuid())
  userId      String   (FK -> User)
  tripId      String   (FK -> SavedTrip)
  type        String   (enum: removed_place/added_place/swapped_place/thumbs_down/thumbs_up)
  context     Json     (what was removed/added and the surrounding itinerary context)
  createdAt   DateTime
```

#### 3.2 How Corrections Feed AI

When generating new recommendations for a user who has corrections, the most recent 10 corrections are summarized and injected into the AI prompt:

```
## Past Preferences (learned from your trips)
- Removed "Police Bazaar shopping" from Shillong itinerary (crowded commercial area)
- Gave thumbs-down to "Elephant Falls" (touristy, short visit)
- Gave thumbs-up to "Wei Sawdong Waterfall" (uncrowded, good hike)
- Added "extra day in Dawki" (prefers depth over breadth)

Use these signals to personalize recommendations. Avoid places similar to removed/thumbs-down items. Favor places similar to thumbs-up items.
```

#### 3.3 API Endpoints

| Method | Path | Auth | Description |
|---|---|---|---|
| POST | `/corrections` | Yes | Log a correction (removal, swap, thumbs up/down) |
| GET | `/corrections` | Yes | List user's corrections (used internally for prompt injection) |

---

### 4. Thumbs Up/Down on Places

Simple reaction system on any place in an itinerary or search result.

#### 4.1 How It Works

- Frontend sends: `POST /corrections` with `type: thumbs_up` or `type: thumbs_down` and the place context
- Stored as a `Correction` record (same model as editorial corrections)
- Fed into AI prompts alongside other corrections
- Also used to refine the personality profile over time (e.g., 5 thumbs-down on temples → system notes "not motivated by spiritual/culture")

#### 4.2 Profile Refinement

After 5+ corrections of the same pattern, the system can suggest a profile update:

> "We noticed you tend to skip crowded tourist spots. Want to update your profile to prefer hidden gems?"

This is a future enhancement (Phase 2E) — for now, corrections just feed into prompts directly.

---

## What This Phase Does NOT Include

- Editable itinerary locations (Phase 2C — the correction captures the intent, actual editing is 2C)
- Trip chat (Phase 2C)
- Live location features (Phase 2D)
- Auto-learning from trip patterns (Phase 2E — corrections are explicit, pattern detection is implicit)

---

## Module Structure

```
src/
├── profile/
│   ├── profile.module.ts
│   ├── profile.controller.ts
│   ├── profile.service.ts
│   ├── profile.service.spec.ts
│   ├── profile.controller.spec.ts
│   └── dto/
│       ├── submit-story.dto.ts
│       └── submit-quiz.dto.ts
├── corrections/
│   ├── corrections.module.ts
│   ├── corrections.controller.ts
│   ├── corrections.service.ts
│   ├── corrections.service.spec.ts
│   ├── corrections.controller.spec.ts
│   └── dto/
│       └── create-correction.dto.ts
├── ai/
│   └── prompts/
│       └── destination.prompt.ts  (modified — add personality + corrections injection)
│   └── schemas/
│       └── destination.schema.ts  (modified — add personalMatch to result schemas)
│       └── profile.schema.ts      (new — story extraction schema)
```

---

## Testing Strategy

- Unit tests for personality extraction (mock AI, test Zod parsing of extracted profile)
- Unit tests for prompt injection (verify personality block appears in prompts when profile exists, absent when not)
- Unit tests for corrections service (CRUD, limit to 10 recent)
- Controller tests for all new endpoints
- Integration test: full flow — submit story → extract profile → search with personality → verify personalMatch in results
