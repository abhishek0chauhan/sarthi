# Phase 2E: Polish & Growth — Design Spec

**Date:** 2026-04-16
**Status:** Approved
**Depends on:** Phase 2D (Live Sarthi Mode) — all core features complete
**Goal:** Make Sarthi smarter over time and useful even without internet.

---

## Overview

Phase 2E adds two features that round out the product: **automatic personality learning** from trip patterns (so the profile gets better without the user doing anything) and **offline trip download** (so Sarthi works in areas with no signal — common in Indian mountains, forests, and rural areas).

---

## Features

### 1. Saved Trip Pattern Learning

#### 1.1 What It Does

After a user has 3+ saved trips with corrections/reactions, the system analyzes patterns and suggests profile updates.

Examples:
- User has thumbs-downed 4 crowded places across 2 trips → suggest: "We noticed you prefer quieter spots. Update crowd tolerance to 'avoid'?"
- User's itineraries all have homestays edited in → suggest: "You seem to love homestays. Update comfort level?"
- User always skips early morning activities in Live Sarthi Mode → suggest: "You're not a morning person on trips. Shift your pace to 'loose'?"

#### 1.2 How It Works

**Analysis trigger:** Runs after each trip ends (or when user has accumulated 5+ new corrections since last analysis).

**Analysis logic:**
1. Gather all corrections, thumbs up/down, skipped activities, and activity completions for this user
2. Send to AI with current personality profile: "Given these behavioral signals, what personality dimensions should be updated? Only suggest changes with high confidence."
3. AI returns suggested updates with explanations
4. User sees suggestions as cards: "Based on your last 3 trips, we think..." with Accept/Dismiss buttons

#### 1.3 Suggestion Format

```typescript
{
  suggestions: [{
    dimension: 'crowdTolerance',
    currentValue: 'worth_it',
    suggestedValue: 'avoid',
    reason: "You skipped or thumbs-downed 4 crowded places across your Meghalaya and Rajasthan trips",
    confidence: 85  // 0-100
  }]
}
```

Only show suggestions with confidence >= 70.

#### 1.4 API Endpoints

| Method | Path | Auth | Description |
|---|---|---|---|
| GET | `/profile/suggestions` | Yes | Get pending personality update suggestions |
| POST | `/profile/suggestions/:id/accept` | Yes | Accept a suggestion, update profile |
| POST | `/profile/suggestions/:id/dismiss` | Yes | Dismiss a suggestion |

#### 1.5 Data Model

New Prisma model:

```
ProfileSuggestion
  id              String   @id @default(uuid())
  userId          String   (FK -> User)
  dimension       String   (which personality dimension)
  currentValue    String?
  suggestedValue  String
  reason          String
  confidence      Int
  status          String   (enum: pending/accepted/dismissed)
  createdAt       DateTime @default(now())
  resolvedAt      DateTime?

  @@index([userId, status])
```

---

### 2. Offline Trip Download

#### 2.1 What It Does

User downloads their entire saved trip as a self-contained package they can access without internet. Critical for Indian travel — Spiti Valley, Meghalaya interiors, Western Ghats treks often have zero signal.

#### 2.2 Download Formats

**Option A: Static HTML page** (recommended for MVP)
- Single self-contained HTML file with all trip data embedded
- Styled, readable, works in any mobile browser offline
- Includes: itinerary, food guide, phrasebook, place context cards, map queries (as text — can't open Maps without internet, but user can note the place names)
- Lightweight, no special app support needed

**Option B: PDF**
- Generated server-side using a PDF library
- Good for sharing/printing
- Less interactive than HTML

**Option C: Both**
- HTML for on-device use, PDF for sharing/printing

#### 2.3 Offline Package Contents

```
Trip: Meghalaya Adventure (Day 1-5)
├── Trip Overview (destination, dates, group, travel mode)
├── Day-by-Day Itinerary
│   ├── Each day with activities, times, costs
│   ├── Place context (why special, tips, what to carry)
│   └── Meal suggestions with restaurant names + areas
├── Food Guide
│   ├── Must-try dishes with descriptions
│   ├── Health-conscious options
│   ├── Street food with safety tips
│   └── Full meal plan
├── Local Phrasebook
│   ├── Greetings, food, directions, emergency
│   └── Cultural notes
├── Emergency Info
│   ├── Nearest hospitals/clinics per area
│   ├── Local police numbers
│   └── Embassy/consulate if applicable
└── Packing Checklist (from itinerary)
```

#### 2.4 API Endpoints

| Method | Path | Auth | Description |
|---|---|---|---|
| GET | `/saved-trips/:id/download?format=html` | Yes | Download trip as self-contained HTML |
| GET | `/saved-trips/:id/download?format=pdf` | Yes | Download trip as PDF |

#### 2.5 Implementation

**HTML generation:** Server-side template rendering. Embed all data as inline content. Include inline CSS for styling. No external dependencies — everything in one file.

**PDF generation:** Use a library like `puppeteer` (renders HTML to PDF) or `pdfkit` (programmatic PDF). Puppeteer is simpler since we already have the HTML template.

#### 2.6 Emergency Info

The offline download includes emergency info that the itinerary/food guide don't cover. This is generated by a small AI call at download time:

Prompt: "For a trip to [destination], [state], provide emergency contacts and info: nearest hospital, local police, emergency numbers, nearest ATM areas, pharmacies."

Cached per destination — same emergency info for all trips to the same place.

---

## What This Phase Does NOT Include

- Full offline app mode (PWA with service workers — that's a frontend concern)
- Trip analytics/statistics ("you've visited 12 states")
- Social features (follow other travelers, public trip gallery)
- Monetization features

---

## Module Structure

```
src/
├── profile/
│   ├── profile.service.ts            (modified — add suggestion generation + acceptance)
│   ├── profile.controller.ts         (modified — suggestion endpoints)
│   └── suggestion.service.ts         (new — pattern analysis + suggestion logic)
│   └── suggestion.service.spec.ts    (new)
├── offline/
│   ├── offline.module.ts
│   ├── offline.controller.ts         (download endpoints)
│   ├── offline.controller.spec.ts
│   ├── offline.service.ts            (assembles trip data, generates HTML/PDF)
│   ├── offline.service.spec.ts
│   ├── html-renderer.service.ts      (HTML template rendering)
│   ├── html-renderer.service.spec.ts
│   └── templates/
│       └── trip-download.html        (HTML template)
├── ai/
│   └── prompts/
│       ├── pattern-analysis.prompt.ts  (new — analyze corrections for profile suggestions)
│       └── emergency-info.prompt.ts    (new — generate emergency info per destination)
│   └── schemas/
│       ├── pattern-analysis.schema.ts  (new)
│       └── emergency-info.schema.ts    (new)
```

---

## Dependencies

New npm packages needed:
- `puppeteer` or `pdfkit` — PDF generation (only if PDF format is included)
- No new deps needed for HTML generation

---

## Testing Strategy

- Unit tests for pattern analysis (mock corrections data, verify AI prompt construction)
- Unit tests for suggestion acceptance/dismissal (verify profile updates correctly)
- Unit tests for HTML generation (verify all trip sections present, verify self-contained — no external URLs)
- Unit tests for PDF generation (verify output is valid PDF)
- Unit tests for emergency info generation (mock AI, verify schema)
- Edge case tests: trip with no food guide, trip with no phrasebook, trip with partial personality profile
- Integration test: create trip with full data → download HTML → verify all sections present
