# Dark Mode, Bug Fixes & UI Polish — Design Spec

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Fix remaining bugs, implement system-wide dark mode, and refine all screens to match the approved Phase 1 mockups.

**Architecture:** Dark mode uses the existing `useColors()` hook (`hooks/useColorScheme.ts`) which reads from `useThemeStore`. Every screen and component replaces the static `lightColors` import with a `makeStyles(colors)` pattern — StyleSheet.create is called inside a factory function that receives the live color palette. No new abstractions needed.

**Tech Stack:** Expo SDK 54, React Native 0.81, Expo Router v4, Zustand, TypeScript, StyleSheet.create (no NativeWind utility classes)

**Mockups reference:** `docs/superpowers/mockups/2026-04-22-app-phase1-core-shell/`

---

## Workstream 1 — Bug Fixes

### Bug 1: Profile dark mode — text label instead of toggle switch
**File:** `app/(tabs)/profile/index.tsx`
**Problem:** Dark Mode menu item shows `"Dark Mode (On)"/"Dark Mode (Off)"` text. Mockup shows a real Switch toggle.
**Fix:** Use React Native `Switch` component. Track state from `useThemeStore`. Notifications item also gets a Switch (currently a chevron).

### Bug 2: Search form — label overlaps placeholder on multiline Input
**File:** `app/(tabs)/search/index.tsx` and/or `components/search/SearchForm.tsx`
**Problem:** The multiline `Input` for trip description has a `label` prop that renders floating text overlapping the placeholder.
**Fix:** Remove the `label` prop from the multiline Input. The section header ("DESCRIBE YOUR TRIP") above it already provides the label context.

### Bug 3: OTP screen — no "Change number" link
**File:** `app/(auth)/verify-otp.tsx`
**Problem:** Mockup shows a tappable "Change number" link below the phone number display. Missing in implementation.
**Fix:** Add a `<Pressable>` with "Change number" text that calls `router.back()`.

### Bug 4: StyleSheet created at module level but referencing colors
**Files:** All screens currently using `lightColors` in a module-level `StyleSheet.create`
**Problem:** Static styles are created once at module load with hardcoded `lightColors` — they never update when theme changes.
**Fix:** Resolved by the dark mode workstream (moving to `makeStyles(colors)` pattern).

---

## Workstream 2 — Dark Mode (Approach A: hook per component)

### Pattern
Every file that currently imports `lightColors` gets refactored to:
```typescript
// Remove:
import { lightColors } from '@/constants/colors';

// Add:
import { useColors } from '@/hooks/useColorScheme';

// Inside component:
const colors = useColors();
const styles = makeStyles(colors);

// At bottom of file, replace StyleSheet.create({...}) with:
function makeStyles(colors: Colors) {
  return StyleSheet.create({ ... });
}
```

`Colors` type is exported from `constants/colors.ts`. **Before using it in `makeStyles`, add `primary400` to `lightColors`** so the type covers both palettes:
```typescript
// constants/colors.ts — add to lightColors:
primary400: '#F5A07A',
```
This ensures `export type Colors = typeof lightColors` includes `primary400` and `darkColors` remains a valid `Colors` shape. Alternatively use `export type Colors = typeof lightColors & typeof darkColors`, but adding the missing key is simpler.

### Files — App screens (16)
- `app/(auth)/welcome.tsx`
- `app/(auth)/login.tsx`
- `app/(auth)/verify-otp.tsx`
- `app/(auth)/_layout.tsx`
- `app/(tabs)/_layout.tsx`
- `app/(tabs)/search/index.tsx`
- `app/(tabs)/search/results.tsx`
- `app/(tabs)/trips/index.tsx`
- `app/(tabs)/profile/index.tsx`
- `app/itinerary/new.tsx`
- `app/food-guide/new.tsx`
- `app/trip/[id]/index.tsx`
- `app/trip/[id]/itinerary.tsx`
- `app/trip/[id]/food-guide.tsx`
- `app/trip/[id]/share.tsx`
- `app/shared/[token].tsx`

### Files — Components (19)
- `components/ui/Button.tsx`
- `components/ui/Input.tsx`
- `components/ui/Card.tsx`
- `components/ui/Badge.tsx`
- `components/ui/Chip.tsx`
- `components/ui/LoadingSpinner.tsx`
- `components/ui/EmptyState.tsx`
- `components/ui/SkeletonCard.tsx`
- `components/ui/OTPInput.tsx`
- `components/auth/GoogleSignInButton.tsx`
- `components/auth/PhoneInput.tsx`
- `components/search/SearchForm.tsx`
- `components/search/FilterChips.tsx`
- `components/search/DestinationCard.tsx`
- `components/search/TrekCard.tsx`
- `components/trip/ActivityCard.tsx`
- `components/trip/DayTabs.tsx`
- `components/trip/CostBreakdown.tsx`
- `components/food/DishCard.tsx`

---

## Workstream 3 — UI Refinements (Mockup Fidelity)

### Screen 1: Profile (`app/(tabs)/profile/index.tsx`)
**Changes:**
- Add dark gradient header (`#2C1A08 → #5A3214`) with decorative circle overlay
- Avatar: rounded square (border-radius 18), gradient background (`#E8601C → #F5926A`), initials
- Display name + email/phone below avatar
- Stats row: 3 chips separated by dividers — Trips count | Days Planned | Shared count (use 0 as placeholder until backend connected)
- Sections: "PREFERENCES" (Dark Mode Switch + Notifications Switch + Language) and "ACCOUNT" (Change Email, Sign Out, Delete Account)
- Dark Mode item: `Switch` component. `value={override === 'dark'}`. On toggle: `setOverride(value ? 'dark' : 'system')` — toggling OFF restores system preference rather than forcing light, so the user's OS setting takes effect naturally. The existing profile code (`isDark ? 'light' : 'dark'`) must be updated to use this mapping.
- Notifications item: `Switch` component (local state only for now)
- Footer: Version + Terms · Privacy · Help links

### Screen 2: Trips list (`app/(tabs)/trips/index.tsx`)
**Changes:**
- Trip cards get a 70px gradient hero image block
- Gradient color seeded deterministically from destination name (use a simple hash → pick from 6 preset gradients: forest green, ocean blue, desert orange, mountain grey, sunset pink, jungle teal)
- Destination name + state overlaid on gradient (white text, bottom-left)
- Below gradient: dates + group size + "X days ago" relative time
- Status pills: `✅ Itinerary` (green bg) / `— Food` (grey bg) per mockup
- Header: "My Trips" title + trip count subtitle

### Screen 3: Trip detail (`app/trip/[id]/index.tsx`)
**Changes:**
- Hero gradient image at top (120px, same gradient seed as trip list card)
- Back button (frosted glass) + options button (⋯) in hero
- Trip name + dates + group + travel mode overlaid
- "TRIP READINESS" score card: horizontal progress bar. Score is a **hardcoded placeholder (75)** until the backend populates this field. `ItineraryData` type will be extended with `tripReadiness?: number` and `highlights?: string[]` as optional fields so the compiler is happy and future backend data flows through automatically.
- 2-column quick nav tiles: Itinerary (primary/orange) + Food Guide (white card). Show day count / dish count.
- Highlights card: bullet list from `trip.itineraryData?.highlights`. When empty or missing, render a placeholder list of 3 generic highlights so the card always looks populated.
- Cost breakdown card (already exists as component — keep)
- Share row: dashed border, 🔗 icon, "Share this trip" text, Share button

### Screen 4: Search form (`app/(tabs)/search/index.tsx`)
**Changes:**
- Add greeting header at top: "GOOD MORNING" overline + "Where to next?" title + subtitle
- Greeting uses time-of-day: Good Morning (5–12), Good Afternoon (12–17), Good Evening (17+)
- Hidden gems: replace current chip/toggle with a full Switch row card (icon + label + description + Switch)
- Fix multiline Input label overlap (remove label prop)

### Screen 5: Search results — DestinationCard (`components/search/DestinationCard.tsx`)
**Changes:**
- Add 140px gradient hero image block (same gradient seed function)
- Destination name + state overlaid bottom-left (white text)
- Match % badge top-right (frosted glass style)
- Hidden gem badge top-left (orange pill) when applicable
- Save/bookmark button bottom-right (frosted glass)
- Stats row: budget range + travel time + weather + health difficulty chips
- Action buttons: "Get Itinerary" (primary) + "Food Guide" (secondary)

---

## Type extensions required

### `types/trip.types.ts` — extend `ItineraryData`
Add two optional fields to support the Trip Detail readiness card and highlights:
```typescript
export interface ItineraryData {
  // ... existing fields ...
  tripReadiness?: number;   // 0–100, populated by backend in future
  highlights?: string[];    // key highlights for the destination
}
```

---

## Shared Utility: Gradient seed function

Create `utils/destinationGradient.ts`:
```typescript
const GRADIENTS = [
  ['#1B4332', '#2D6A4F', '#52B788'], // forest
  ['#1A3A5C', '#2E5F8A', '#5B8DB8'], // ocean
  ['#3B2314', '#6B3F22', '#A0622F'], // desert
  ['#2C3E50', '#3D5166', '#5D7A8A'], // mountain
  ['#4A1942', '#7B2D7B', '#B05BB0'], // sunset
  ['#0D3B2E', '#1A6B52', '#2D9E7A'], // jungle
];

export function destinationGradient(name: string): string[] {
  let hash = 0;
  for (let i = 0; i < name.length; i++) hash = name.charCodeAt(i) + ((hash << 5) - hash);
  return GRADIENTS[Math.abs(hash) % GRADIENTS.length];
}
```

---

## Out of scope
- Real destination photos (requires backend image API — deferred to Phase 2)
- Language switching (UI only, no i18n library)
- Push notifications (requires native setup)
- Delete account (UI shell only — no backend endpoint yet)
