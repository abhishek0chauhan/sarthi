# App Phase 1: Core Shell — Design Spec

**Date:** 2026-04-16
**Status:** Approved
**Depends on:** Backend Phase 1 + 2A (all complete)
**Goal:** Build the Expo React Native app covering all existing backend APIs — auth, search, itinerary, food guide, saved trips, sharing. Global-ready from day one.

---

## Overview

The first app release lets users sign up, search destinations, view itineraries and food guides, save trips, and share them. It covers all 10 existing backend endpoints with a clean, warm design that feels like a personal travel companion — not a corporate booking app.

---

## Tech Stack

| Layer | Tech | Why |
|---|---|---|
| Framework | Expo SDK 53+ | Managed workflow, fast iteration, EAS builds |
| Routing | Expo Router v4 | File-based routing, feels like Next.js |
| Language | TypeScript | Matches backend, type safety |
| State Management | Zustand | Lightweight, no boilerplate |
| Server State | TanStack Query v5 | Caching, loading states, retry, optimistic updates |
| Forms | React Hook Form + Zod | Zod shared with backend for validation |
| Styling | NativeWind v4 | Tailwind CSS for React Native, utility-first |
| Auth | @react-native-firebase/auth | Phone OTP, Google Sign-In, Email/Password |
| Secure Storage | expo-secure-store | Encrypted token storage |
| HTTP Client | fetch (via TanStack Query) | No extra dependency needed |
| i18n | i18next + expo-localization | Global-ready, all strings externalized |
| Animations | react-native-reanimated | Smooth card animations, transitions |
| SVG | react-native-svg | Render vector illustrations and custom icons |
| Lottie | lottie-react-native | JSON-based animations (loading, success, etc.) |
| Deep Linking | Expo Router (built-in) | Shared trip links open in app |

---

## Global-Readiness

Baked in from day one — not bolted on later.

| Concern | Approach |
|---|---|
| **Language** | All UI strings in `locales/en.json`. Add languages by adding JSON files. `i18next` with `expo-localization` for device locale detection. Start with English only. |
| **Currency** | `Intl.NumberFormat(locale, { style: 'currency', currency })`. Config object sets default currency per region. Never hardcode `₹`. |
| **Date/Time** | `Intl.DateTimeFormat` with device locale. Never hardcode DD/MM/YYYY. |
| **Phone Auth** | Country picker component with flag + dial code. Default to device's SIM country, fallback to India (+91). |
| **Measurements** | Config for km/miles, kg/lbs — default metric. |
| **RTL Support** | NativeWind handles RTL automatically. No hardcoded left/right margins. |

### Locale Config Object

```typescript
// config/locale.ts
export interface RegionConfig {
  currency: string;        // 'INR', 'USD', 'EUR'
  currencySymbol: string;  // '₹', '$', '€'
  defaultCountryCode: string; // 'IN', 'US'
  defaultDialCode: string; // '+91', '+1'
  measurementSystem: 'metric' | 'imperial';
}

// Default — India launch
export const DEFAULT_REGION: RegionConfig = {
  currency: 'INR',
  currencySymbol: '₹',
  defaultCountryCode: 'IN',
  defaultDialCode: '+91',
  measurementSystem: 'metric',
};
```

---

## Design System — "Warm Explorer"

### Color Palette

```typescript
// constants/colors.ts
export const colors = {
  // Primary actions, headers, active tabs
  primary: {
    50:  '#EEF2FF',
    100: '#E0E7FF',
    500: '#4F46E5',  // Main
    600: '#4338CA',  // Pressed
    700: '#3730A3',  // Dark mode primary
  },
  // CTAs, highlights, match signals, energy
  secondary: {
    50:  '#FFF7ED',
    100: '#FFEDD5',
    500: '#F97316',  // Main
    600: '#EA580C',  // Pressed
  },
  // Success, "great match" badges, nature
  accent: {
    50:  '#F0FDFA',
    100: '#CCFBF1',
    500: '#14B8A6',  // Main
    600: '#0D9488',  // Pressed
  },
  // Backgrounds
  background: '#FAFAF8',  // Warm white
  surface: '#F5F3EF',     // Cards, elevated
  surfaceHover: '#EDEBE5',
  // Text
  text: {
    primary: '#1C1917',    // Charcoal
    secondary: '#78716C',  // Warm gray
    tertiary: '#A8A29E',   // Hints, placeholders
    inverse: '#FAFAF8',    // Text on dark backgrounds
  },
  // Semantic
  danger: '#EF4444',
  warning: '#F59E0B',
  success: '#14B8A6',
  info: '#4F46E5',
  // Borders
  border: '#E7E5E4',
  borderFocus: '#4F46E5',
};
```

### Typography

```typescript
// constants/typography.ts
// Font: Inter (bundled via expo-font, free from Google Fonts)
export const fonts = {
  heading: {
    bold: 'Inter_700Bold',
    semiBold: 'Inter_600SemiBold',
  },
  body: {
    regular: 'Inter_400Regular',
    medium: 'Inter_500Medium',
  },
};

export const textSizes = {
  h1: 28,     // Screen titles
  h2: 22,     // Section headers
  h3: 18,     // Card titles
  body: 16,   // Main body text
  caption: 14, // Secondary text
  small: 12,   // Badges, labels
};
```

### Design Tokens

- **Border radius:** Cards `12px`, Buttons `10px`, Badges `20px` (pill), Inputs `10px`
- **Spacing scale:** 4, 8, 12, 16, 20, 24, 32, 40, 48 (Tailwind standard)
- **Shadows:** Subtle warm shadows on cards: `shadow-sm` with warm gray tint
- **Card pattern:** White background, 12px radius, subtle shadow, 16px internal padding
- **Bottom sheets:** For filters, quick actions, confirmations — `@gorhom/bottom-sheet`

### Match Signal Badges

```
Great match    → Teal badge (#14B8A6) with ✓ icon
Good match     → Primary badge (#4F46E5) with thumbs-up
Heads up       → Orange badge (#F97316) with ⚠ icon
Not your style → Gray badge (#A8A29E) with info icon
```

### Vector Illustrations & Animations

Sarthi uses a mix of SVG illustrations, Lottie animations, and custom SVG icons for a premium, eye-catching feel.

#### Strategy: Mix Approach

| Type | Source | Used For |
|---|---|---|
| **Full illustrations** | unDraw / Storyset (free, color-customizable) | Onboarding slides, empty states, auth screen hero, error pages |
| **Lottie animations** | LottieFiles (free) + custom | Loading spinner (compass), save success (checkmark), share animation |
| **Custom SVG icons** | Hand-crafted or icon libraries | Tab bar icons, experience type chips, match signal badges |
| **Background patterns** | Custom SVG patterns | Subtle destination-themed card backgrounds (mountains, waves, palms) |

#### Illustration Inventory (Phase 1)

| Screen | Illustration | Style |
|---|---|---|
| **Welcome slide 1** | Traveler with backpack on mountain | Warm, indigo + orange palette |
| **Welcome slide 2** | Train journey through landscape | Motion feel, teal + indigo |
| **Welcome slide 3** | Campfire with friends, starry sky | Warm, orange + deep indigo |
| **Auth screen** | Subtle map/compass pattern background | Muted, warm white + light indigo |
| **Empty trips** | Open backpack with "ready for adventure" vibe | Friendly, orange accent |
| **Empty search results** | Compass with question mark | Encouraging, teal accent |
| **Error state** | Lost traveler with broken map | Friendly, not frustrating |
| **AI loading** | Sarthi compass spinning | Animated Lottie, indigo + orange |
| **Trip saved success** | Checkmark with confetti burst | Animated Lottie, teal |

#### Custom SVG Icons

**Tab bar** (3 tabs, active + inactive states):
- Search: Compass icon
- Trips: Map/bookmark icon
- Profile: Traveler silhouette icon

**Experience type chips** (tappable filter chips on search screen):
- Nature: Leaf/mountain
- Adventure: Climbing figure
- Food: Fork & plate
- Culture: Temple/monument
- Spiritual: Om/lotus
- Photography: Camera
- Nightlife: Moon & stars
- Shopping: Bag
- Relaxation: Hammock/wave

**Match signal badges** (Phase 2B, but icons designed now for consistency):
- Great match: Star with checkmark
- Good match: Thumbs up
- Heads up: Alert triangle
- Not your style: Info circle

#### Technical Implementation

```typescript
// SVG illustrations as React components
// Store in: assets/illustrations/
import WelcomeTraveler from '@/assets/illustrations/welcome-traveler.svg';

// Usage:
<WelcomeTraveler width={280} height={200} />
```

```typescript
// Lottie animations
// Store in: assets/animations/
import LottieView from 'lottie-react-native';

<LottieView
  source={require('@/assets/animations/compass-loading.json')}
  autoPlay
  loop
  style={{ width: 120, height: 120 }}
/>
```

```typescript
// Custom SVG icons — centralized icon component
// Store in: components/ui/Icon.tsx
// Maps icon names to SVG components for consistent usage
<Icon name="nature" size={24} color={colors.primary[500]} />
```

#### Color Customization

All illustrations from unDraw/Storyset are recolored to match the Warm Explorer palette before importing:
- Primary shapes: Indigo (`#4F46E5`)
- Accents/highlights: Sunset Orange (`#F97316`)
- Nature elements: Teal (`#14B8A6`)
- Backgrounds/fills: Warm White (`#FAFAF8`) / Cream (`#F5F3EF`)
- Skin tones: Diverse, inclusive

#### File Organization

```
assets/
├── illustrations/           (SVG — full scene illustrations)
│   ├── welcome-traveler.svg
│   ├── welcome-train.svg
│   ├── welcome-campfire.svg
│   ├── empty-trips.svg
│   ├── empty-results.svg
│   ├── error-lost.svg
│   └── auth-background.svg
├── animations/              (Lottie JSON)
│   ├── compass-loading.json
│   ├── save-success.json
│   ├── share-animation.json
│   └── onboarding-dots.json
├── icons/                   (SVG — small icons)
│   ├── tabs/
│   │   ├── compass.svg
│   │   ├── map-bookmark.svg
│   │   └── traveler.svg
│   ├── experience/
│   │   ├── nature.svg
│   │   ├── adventure.svg
│   │   ├── food.svg
│   │   ├── culture.svg
│   │   ├── spiritual.svg
│   │   ├── photography.svg
│   │   ├── nightlife.svg
│   │   ├── shopping.svg
│   │   └── relaxation.svg
│   └── match/
│       ├── great-match.svg
│       ├── good-match.svg
│       ├── heads-up.svg
│       └── not-your-style.svg
└── patterns/                (SVG — subtle background patterns)
    ├── mountains.svg
    ├── waves.svg
    └── palms.svg
```

### Dark Mode

Supported from day one via NativeWind's dark mode classes. Device system preference drives the default, with manual toggle in settings.

| Token | Light | Dark |
|---|---|---|
| Background | `#FAFAF8` | `#1C1917` |
| Surface | `#F5F3EF` | `#292524` |
| Text Primary | `#1C1917` | `#FAFAF8` |
| Text Secondary | `#78716C` | `#A8A29E` |
| Border | `#E7E5E4` | `#44403C` |
| Primary | `#4F46E5` | `#818CF8` (lighter for dark bg) |

---

## App Structure

### File-Based Routing (Expo Router)

```
sarthi-app/
├── app/
│   ├── _layout.tsx                  (root — providers, auth guard, fonts)
│   ├── index.tsx                    (splash/redirect based on auth state)
│   │
│   ├── (auth)/                      (unauthenticated screens)
│   │   ├── _layout.tsx              (auth layout — no tab bar)
│   │   ├── welcome.tsx              (onboarding/welcome screen)
│   │   ├── login.tsx                (phone OTP / Google / email)
│   │   └── verify-otp.tsx           (OTP input screen)
│   │
│   ├── (tabs)/                      (main app — bottom tab bar)
│   │   ├── _layout.tsx              (tab bar layout)
│   │   ├── search/
│   │   │   ├── index.tsx            (search form)
│   │   │   └── results.tsx          (search results — destination cards)
│   │   ├── trips/
│   │   │   └── index.tsx            (saved trips list)
│   │   └── profile/
│   │       └── index.tsx            (user profile + settings)
│   │
│   ├── trip/                        (trip detail screens — no tab bar)
│   │   ├── [id]/
│   │   │   ├── index.tsx            (trip overview — destination data)
│   │   │   ├── itinerary.tsx        (day-by-day itinerary view)
│   │   │   ├── food-guide.tsx       (food guide view)
│   │   │   └── share.tsx            (sharing options)
│   │
│   ├── itinerary/                   (standalone itinerary generation)
│   │   └── new.tsx                  (itinerary form — destination, dates, etc.)
│   │
│   ├── food-guide/                  (standalone food guide generation)
│   │   └── new.tsx                  (food guide form)
│   │
│   └── shared/                      (public — no auth required)
│       └── [token].tsx              (shared trip view via deep link)
│
├── components/
│   ├── ui/                          (base components)
│   │   ├── Button.tsx
│   │   ├── Card.tsx
│   │   ├── Input.tsx
│   │   ├── Badge.tsx
│   │   ├── BottomSheet.tsx
│   │   ├── LoadingSpinner.tsx
│   │   ├── EmptyState.tsx
│   │   └── CountryPicker.tsx
│   ├── search/
│   │   ├── SearchForm.tsx           (main search form with all fields)
│   │   ├── DestinationCard.tsx      (search result card)
│   │   ├── TrekCard.tsx             (trek result card)
│   │   ├── FilterChips.tsx          (experience type, budget, etc.)
│   │   └── HealthProfileForm.tsx    (optional health fields)
│   ├── trip/
│   │   ├── TripCard.tsx             (saved trip list item)
│   │   ├── ItineraryTimeline.tsx    (day timeline with activities)
│   │   ├── ActivityCard.tsx         (single activity in timeline)
│   │   ├── DayTabs.tsx              (horizontal day selector)
│   │   ├── MealCard.tsx             (meal suggestion card)
│   │   └── CostBreakdown.tsx        (budget visualization)
│   ├── food/
│   │   ├── DishCard.tsx             (must-try dish card)
│   │   ├── StreetFoodCard.tsx
│   │   ├── MealPlanDay.tsx
│   │   ├── TasteProfileRadar.tsx    (visual taste profile)
│   │   ├── AllergyAlert.tsx         (warning badge)
│   │   └── DietaryInfo.tsx
│   └── auth/
│       ├── PhoneOTPForm.tsx
│       ├── GoogleSignInButton.tsx
│       └── EmailPasswordForm.tsx
│
├── services/
│   ├── api.ts                       (base fetch wrapper with auth headers)
│   ├── auth.service.ts              (Firebase auth — OTP, Google, email)
│   ├── search.service.ts            (destination-finder API calls)
│   ├── trips.service.ts             (saved-trips API calls)
│   └── shared.service.ts            (shared-trips API calls)
│
├── stores/
│   ├── auth.store.ts                (user state, token, isAuthenticated)
│   └── search.store.ts              (search form state, filters)
│
├── hooks/
│   ├── useAuth.ts                   (auth state + methods)
│   ├── useSearch.ts                 (TanStack Query wrapper for search)
│   ├── useTrips.ts                  (TanStack Query wrapper for saved trips)
│   └── useColorScheme.ts            (light/dark mode)
│
├── locales/
│   └── en.json                      (all UI strings — English)
│
├── config/
│   ├── locale.ts                    (region config — currency, country, etc.)
│   └── api.ts                       (API base URL, timeouts)
│
├── constants/
│   ├── colors.ts
│   └── typography.ts
│
├── assets/
│   ├── images/                      (logo, illustrations)
│   └── fonts/                       (Inter font files)
│
├── app.json                         (Expo config)
├── tailwind.config.js               (NativeWind config with custom colors)
├── tsconfig.json
└── package.json
```

---

## Screens — Detailed

### 1. Welcome Screen (`(auth)/welcome.tsx`)

First screen for new users. Sets the tone.

- Sarthi logo centered at top
- Tagline: "Your personal travel companion" (localized)
- 2-3 illustration slides showing key features (search → plan → guide)
- "Get Started" button → login screen

### 2. Login Screen (`(auth)/login.tsx`)

Three auth methods, ordered by prominence:

```
┌─────────────────────────────┐
│         [Sarthi Logo]       │
│                             │
│   ┌─────────────────────┐   │
│   │ 🇮🇳 +91  [Phone]     │   │  ← Phone input with country picker
│   └─────────────────────┘   │
│   [ Send OTP ]              │  ← Primary button (indigo)
│                             │
│   ──── or continue with ──── │
│                             │
│   [ G  Continue with Google ]│  ← Outlined button
│   [ ✉  Continue with Email ] │  ← Outlined button
│                             │
└─────────────────────────────┘
```

### 3. OTP Verification (`(auth)/verify-otp.tsx`)

- Shows "Code sent to +91 98765XXXXX"
- 6-digit OTP input with auto-focus progression
- Resend timer (30s countdown)
- Auto-submit on 6th digit

### 4. Search Screen (`(tabs)/search/index.tsx`)

The main screen. Clean, inviting, not overwhelming.

```
┌─────────────────────────────┐
│  [Search icon]  Search      │  ← Tab header
│                             │
│  ┌─────────────────────┐    │
│  │ Describe your dream  │    │  ← Large freeText input
│  │ trip...              │    │
│  └─────────────────────┘    │
│                             │
│  Dates: [From] → [To]      │  ← Date picker
│  From:  [Delhi ▼]          │  ← Departure city
│  Group: [2] [Friends ▼]    │  ← Size + type
│  Budget: [₹5,000 - ₹15,000]│  ← Range slider
│                             │
│  Experience:                │
│  [Nature] [Adventure] [Food]│  ← Tappable chips, multi-select
│  [Culture] [Spiritual] ... │
│                             │
│  [+ Health Profile]         │  ← Expandable section
│  [+ Food Preferences]       │  ← Expandable section
│  [ Hidden Gems Only 🔘 ]    │  ← Toggle
│                             │
│  [ 🔍 Find Destinations ]   │  ← Primary CTA
└─────────────────────────────┘
```

**Design notes:**
- Essential fields visible by default (freeText, dates, city, group, budget, experience types)
- Health profile and food preferences collapsed by default — "+" to expand
- Experience types as colorful filter chips
- Budget as a dual-thumb range slider with formatted currency

### 5. Search Results (`(tabs)/search/results.tsx`)

```
┌─────────────────────────────┐
│  ← Back     5 destinations  │
│                             │
│  ┌─────────────────────────┐│
│  │ 📍 Cherrapunji, Meghalaya││
│  │ "Wettest place on earth" ││
│  │                         ││
│  │ 💰 ₹8,000-12,000/person ││
│  │ 🌤 Pleasant, light rain  ││
│  │ ⏱ 2h flight from Delhi   ││
│  │ 🏥 Moderate (some hikes) ││
│  │                         ││
│  │ ┌──────┐ ┌───────────┐  ││
│  │ │Hidden│ │Trip Ready:││  ││
│  │ │ Gem  │ │  82/100   ││  ││
│  │ └──────┘ └───────────┘  ││
│  │                         ││
│  │ [Get Itinerary] [Food ▸]││
│  └─────────────────────────┘│
│                             │
│  ┌─────────────────────────┐│
│  │ 📍 Dawki, Meghalaya     ││
│  │ ...                     ││
│  └─────────────────────────┘│
└─────────────────────────────┘
```

**Each destination card shows:**
- Name, state
- `whyItMatches` as subtitle
- Budget estimate, weather, travel time
- Health advisory suitability as icon + label
- Trip readiness score as visual badge
- Hidden gem badge if applicable
- Quick action buttons: "Get Itinerary", "Food Guide"

**Trek results** use a different card layout showing altitude, difficulty, duration, terrain.

### 6. Itinerary View (`trip/[id]/itinerary.tsx`)

```
┌─────────────────────────────┐
│  ← Cherrapunji    [💾 Save] │
│                             │
│  [Day 1] [Day 2] [Day 3]   │  ← Horizontal scrollable tabs
│                             │
│  Day 1: Arrival & Caves     │
│  ─────────────────────────  │
│  ┌─ 9:00 AM ──────────────┐│
│  │ 🏔 Mawsmai Cave         ││
│  │ ₹50 entry               ││
│  │ 🏥 Easy walk, well-lit   ││
│  └─────────────────────────┘│
│           │                 │
│  ┌─ 12:00 PM ─────────────┐│
│  │ 🍽 Lunch                 ││
│  │ Jadoh at local kitchen   ││
│  │ ₹200/person             ││
│  └─────────────────────────┘│
│           │                 │
│  ┌─ 2:30 PM ──────────────┐│
│  │ 🌊 Nohkalikai Falls     ││
│  │ Free entry              ││
│  │ 🏥 Moderate — steep      ││
│  │    stairs down           ││
│  └─────────────────────────┘│
│                             │
│  💰 Day total: ₹2,400      │
│                             │
│  ─── Packing List ───       │
│  ☑ Rain jacket  ☑ Water    │
│  ☑ Grip shoes   ☑ Cash     │
└─────────────────────────────┘
```

**Design notes:**
- Vertical timeline with time markers and connecting lines
- Each activity is a card with cost, health note
- Day total at bottom
- Packing list as checklist
- "Save Trip" button in header to save the full bundle

### 7. Food Guide View (`trip/[id]/food-guide.tsx`)

```
┌─────────────────────────────┐
│  ← Cherrapunji Food Guide  │
│                             │
│  "Khasi cuisine is rice-    │
│   based with unique..."     │  ← Overview
│                             │
│  ── Must-Try Dishes ──      │
│  ┌─────────────────────────┐│
│  │ 🍛 Jadoh                 ││
│  │ Red rice with pork       ││
│  │ 📍 Trattoria, Police Baz ││
│  │ ₹150-200  🌶 Medium     ││
│  │ ⚠️ Contains pork         ││  ← Allergy alert if relevant
│  │                         ││
│  │ Taste: 🔥3 🧂3 😋4      ││  ← Taste profile visual
│  └─────────────────────────┘│
│                             │
│  ── Street Food ──          │
│  ⚠ Safety: Stick to busy... │
│  ┌─────────────────────────┐│
│  │ Doh Khlieh (pork salad) ││
│  │ 📍 Iewduh Market  ₹80   ││
│  └─────────────────────────┘│
│                             │
│  ── Today's Meal Plan ──    │
│  🌅 Breakfast: Pumaloi...   │
│  🌞 Lunch: Jadoh...        │
│  🌙 Dinner: Tungrymbai...  │
│                             │
│  ── Dietary Info ──         │
│  Veg Friendly: Limited...   │
└─────────────────────────────┘
```

### 8. Saved Trips List (`(tabs)/trips/index.tsx`)

```
┌─────────────────────────────┐
│  My Trips                   │
│                             │
│  ┌─────────────────────────┐│
│  │ 📍 Cherrapunji Trip     ││
│  │ Meghalaya               ││
│  │ 15 May - 19 May 2026    ││
│  │ 🚂 Train                ││
│  │                         ││
│  │ ✅ Itinerary  ✅ Food    ││
│  │ Saved 2 days ago        ││
│  └─────────────────────────┘│
│                             │
│  ┌─────────────────────────┐│
│  │ 📍 Spiti Valley Trip    ││
│  │ Himachal Pradesh        ││
│  │ 1 Jun - 7 Jun 2026     ││
│  │ 🚌 Bus                  ││
│  │                         ││
│  │ ✅ Itinerary  ❌ Food    ││  ← Missing food guide
│  │ Saved 1 week ago        ││
│  └─────────────────────────┘│
│                             │
│  [No more trips]            │
└─────────────────────────────┘
```

**Features:**
- Sorted by most recent
- Shows trip name, destination, dates, travel mode
- Indicators for which data is present (itinerary, food guide)
- Tap to open full trip detail
- Swipe left to delete (with confirmation)

### 9. Trip Detail / Overview (`trip/[id]/index.tsx`)

Hub screen for a saved trip. Shows summary + navigation to sub-views.

```
┌─────────────────────────────┐
│  ← Cherrapunji Trip  [⋮]   │  ← Menu: share, delete, rename
│                             │
│  📍 Cherrapunji, Meghalaya  │
│  15 May - 19 May 2026      │
│  👥 4 Friends  🚂 Train     │
│                             │
│  ── Trip Readiness: 82 ──  │
│  [████████████░░░] 82/100  │
│                             │
│  ┌───────┐ ┌───────┐       │
│  │ 📋    │ │ 🍽    │       │
│  │Itiner-│ │ Food  │       │
│  │ ary   │ │ Guide │       │
│  └───────┘ └───────┘       │
│                             │
│  ── Highlights ──           │
│  • Living Root Bridges      │
│  • Cleanest village in Asia │
│  • Crystal clear rivers     │
│                             │
│  ── Cost Breakdown ──       │
│  Transport: ₹4,000         │
│  Stay: ₹6,000 (4 nights)   │
│  Food: ₹3,000              │
│  Activities: ₹1,500        │
│  Total: ₹14,500/person     │
│                             │
│  ── Health Advisory ──      │
│  Suitability: Moderate      │
│  Physical demand: Some...   │
│                             │
│  [🔗 Share Trip]            │
└─────────────────────────────┘
```

### 10. Share Flow (`trip/[id]/share.tsx`)

- "Share this trip" bottom sheet
- Shows share link (copy to clipboard)
- Share via system share sheet (WhatsApp, Instagram, etc.)
- Toggle sharing on/off

### 11. Shared Trip View (`shared/[token].tsx`)

Public view — no auth required. Opens via deep link (`sarthi://shared/{token}` or web URL).

Same as trip detail but read-only, with "Shared by {name}" header and a "Sign up to plan your own trip" CTA.

### 12. Profile Screen (`(tabs)/profile/index.tsx`)

```
┌─────────────────────────────┐
│  Profile                    │
│                             │
│  👤 Abhishek                │
│  abhishek@email.com         │
│                             │
│  ── Settings ──             │
│  🌙 Dark Mode        [🔘]  │
│  🌐 Language      [English] │
│  🔔 Notifications    [🔘]  │
│                             │
│  ── Account ──              │
│  📧 Change Email            │
│  🔑 Change Password         │
│  🚪 Sign Out                │
│  🗑 Delete Account          │
│                             │
│  ── About ──                │
│  Version 1.0.0              │
│  Terms  •  Privacy  •  Help │
└─────────────────────────────┘
```

Phase 2B adds personality profile section here.

---

## Authentication Flow

### Firebase Auth Configuration

```typescript
// Three providers enabled in Firebase Console:
// 1. Phone (OTP) — primary for India
// 2. Google Sign-In
// 3. Email/Password
```

### Auth State Machine

```
App Launch
  → Check expo-secure-store for stored Firebase token
  → If token exists → verify with Firebase → if valid → (tabs)
  → If token expired → silent refresh → if success → (tabs)
  → If no token or refresh fails → (auth)/welcome
  
After successful auth:
  → Store Firebase ID token in expo-secure-store
  → Set auth header for all API calls: "Authorization: Bearer {token}"
  → Token auto-refreshes via Firebase SDK (token listener)
  → Navigate to (tabs)
```

### Phone OTP Flow

1. User enters phone number with country picker
2. Firebase sends OTP via SMS
3. User enters 6-digit OTP
4. Firebase verifies → returns user credential
5. App stores token → navigates to (tabs)
6. Backend `FirebaseAuthGuard` verifies the same token

### Google Sign-In Flow

1. User taps "Continue with Google"
2. `@react-native-google-signin/google-signin` opens Google consent screen
3. Returns Google credential → exchange for Firebase credential
4. App stores token → navigates to (tabs)

### Email/Password Flow

1. User enters email + password
2. Firebase `createUserWithEmailAndPassword` or `signInWithEmailAndPassword`
3. App stores token → navigates to (tabs)

---

## API Client

### Base Configuration

```typescript
// services/api.ts
import { getAuth } from '@react-native-firebase/auth';

const API_BASE = __DEV__
  ? 'http://192.168.x.x:3000'  // Local dev
  : 'https://api.sarthi.app';   // Production

async function getAuthHeader(): Promise<Record<string, string>> {
  const user = getAuth().currentUser;
  if (!user) return {};
  const token = await user.getIdToken();
  return { Authorization: `Bearer ${token}` };
}

export async function apiRequest<T>(
  path: string,
  options: RequestInit = {},
): Promise<T> {
  const headers = {
    'Content-Type': 'application/json',
    ...(await getAuthHeader()),
    ...options.headers,
  };

  const response = await fetch(`${API_BASE}${path}`, {
    ...options,
    headers,
  });

  if (!response.ok) {
    throw new ApiError(response.status, await response.text());
  }

  return response.json();
}
```

### Service Layer

```typescript
// services/search.service.ts
export const searchService = {
  search: (dto: SearchDto) =>
    apiRequest<SearchResult>('/destination-finder/search', {
      method: 'POST', body: JSON.stringify(dto),
    }),

  itinerary: (dto: ItineraryDto) =>
    apiRequest<ItineraryResult>('/destination-finder/itinerary', {
      method: 'POST', body: JSON.stringify(dto),
    }),

  foodGuide: (dto: FoodGuideDto) =>
    apiRequest<FoodGuideResult>('/destination-finder/food-guide', {
      method: 'POST', body: JSON.stringify(dto),
    }),
};

// services/trips.service.ts
export const tripsService = {
  list: () => apiRequest<TripSummary[]>('/saved-trips'),
  getById: (id: string) => apiRequest<SavedTrip>(`/saved-trips/${id}`),
  create: (dto: CreateTripDto) =>
    apiRequest<SavedTrip>('/saved-trips', {
      method: 'POST', body: JSON.stringify(dto),
    }),
  update: (id: string, dto: UpdateTripDto) =>
    apiRequest<SavedTrip>(`/saved-trips/${id}`, {
      method: 'PATCH', body: JSON.stringify(dto),
    }),
  remove: (id: string) =>
    apiRequest<void>(`/saved-trips/${id}`, { method: 'DELETE' }),
  enableSharing: (id: string) =>
    apiRequest<ShareResult>(`/saved-trips/${id}/share`, { method: 'POST' }),
  disableSharing: (id: string) =>
    apiRequest<void>(`/saved-trips/${id}/share`, { method: 'DELETE' }),
};
```

### TanStack Query Integration

```typescript
// hooks/useSearch.ts
export function useSearch(dto: SearchDto) {
  return useMutation({
    mutationFn: () => searchService.search(dto),
  });
}

// hooks/useTrips.ts
export function useTrips() {
  return useQuery({
    queryKey: ['trips'],
    queryFn: tripsService.list,
  });
}

export function useTrip(id: string) {
  return useQuery({
    queryKey: ['trip', id],
    queryFn: () => tripsService.getById(id),
  });
}
```

---

## Zustand Stores

### Auth Store

```typescript
// stores/auth.store.ts
interface AuthState {
  user: FirebaseUser | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  setUser: (user: FirebaseUser | null) => void;
}
```

### Search Store

```typescript
// stores/search.store.ts
interface SearchState {
  // Persists form state so user doesn't lose input on navigation
  formValues: Partial<SearchDto>;
  setFormValues: (values: Partial<SearchDto>) => void;
  resetForm: () => void;
}
```

---

## Deep Linking

Shared trip URLs open the app directly (or fallback to web):

```
// app.json
{
  "expo": {
    "scheme": "sarthi",
    "web": {
      "bundler": "metro"
    }
  }
}

// Deep link format:
// sarthi://shared/{token}  → opens shared/[token].tsx
// https://sarthi.app/shared/{token}  → same via universal link
```

---

## Loading & Error States

Every screen handles three states consistently:

1. **Loading** — Skeleton cards (not spinners). Matches the card layout with pulsing gray placeholders. AI calls can take 10-30 seconds — skeleton + "Sarthi is thinking..." message.
2. **Error** — Friendly message with retry button. "Something went wrong. Tap to try again."
3. **Empty** — Illustration + helpful message. Saved trips empty: "No trips yet. Search for your first destination!"

---

## What This Phase Does NOT Include

- Personality profile (Phase 2B)
- Place context cards (Phase 2C)
- Trip chat (Phase 2C)
- Phrasebook (Phase 2C)
- Editable itinerary (Phase 2C)
- Live Sarthi Mode (Phase 2D)
- Push notifications (Phase 2D)
- Offline download (Phase 2E)

---

## Dependencies

```json
{
  "dependencies": {
    "expo": "~53.0.0",
    "expo-router": "~4.0.0",
    "expo-secure-store": "~14.0.0",
    "expo-font": "~13.0.0",
    "expo-localization": "~16.0.0",
    "expo-linking": "~7.0.0",
    "expo-splash-screen": "~0.29.0",

    "@react-native-firebase/app": "^21.0.0",
    "@react-native-firebase/auth": "^21.0.0",
    "@react-native-google-signin/google-signin": "^14.0.0",

    "@tanstack/react-query": "^5.0.0",
    "zustand": "^5.0.0",
    "react-hook-form": "^7.0.0",
    "zod": "^4.3.0",
    "@hookform/resolvers": "^4.0.0",

    "nativewind": "^4.0.0",
    "react-native-reanimated": "~3.16.0",
    "react-native-svg": "~15.0.0",
    "react-native-svg-transformer": "^1.0.0",
    "lottie-react-native": "^7.0.0",
    "@gorhom/bottom-sheet": "^5.0.0",
    "@expo/vector-icons": "^14.0.0",

    "i18next": "^24.0.0",
    "react-i18next": "^15.0.0",

    "react-native-safe-area-context": "^5.0.0",
    "react-native-screens": "~4.0.0",
    "react-native-gesture-handler": "~2.20.0"
  }
}
```

---

## Testing Strategy

- Component tests with React Native Testing Library for key screens
- Service layer tests (mock fetch, verify API calls)
- Auth flow tests (mock Firebase SDK)
- Navigation tests (verify routing)
- Snapshot tests for UI consistency
- E2E tests with Detox for critical flows (login → search → save trip)
