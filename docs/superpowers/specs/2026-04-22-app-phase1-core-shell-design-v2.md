# App Phase 1: Core Shell — Design Spec v2

**Date:** 2026-04-22
**Status:** Approved
**Replaces:** `2026-04-16-app-phase1-core-shell-design.md`
**Depends on:** Backend Phase 1 + 2A (all complete)
**Goal:** Build the Expo React Native app covering all existing backend APIs — auth, search, itinerary, food guide, saved trips, sharing. Premium Saffron & Mist design system. Global-ready from day one.

---

## Design Direction

**"Saffron & Mist"** — Warm white backgrounds, deep saffron as the primary action colour, terracotta accents. All sans-serif typography with tight tracking on headings. Hero cards with destination photography. Warm cream floating pill navigation. Light and dark mode both first-class.

Feels like a premium editorial travel companion — not a generic booking app.

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
| Lottie | lottie-react-native | JSON-based animations (loading, success states) |
| Deep Linking | Expo Router (built-in) | Shared trip links open in app |

---

## Global-Readiness

Baked in from day one.

| Concern | Approach |
|---|---|
| Language | All UI strings in `locales/en.json`. `i18next` with `expo-localization` for device locale detection. |
| Currency | `Intl.NumberFormat(locale, { style: 'currency', currency })`. Never hardcode ₹. |
| Date/Time | `Intl.DateTimeFormat` with device locale. Never hardcode DD/MM/YYYY. |
| Phone Auth | Country picker with flag + dial code. Default to device SIM country, fallback India (+91). |
| Measurements | Config for km/miles, kg/lbs — default metric. |
| RTL Support | NativeWind handles RTL automatically. No hardcoded left/right margins. |

```typescript
// config/locale.ts
export interface RegionConfig {
  currency: string;
  currencySymbol: string;
  defaultCountryCode: string;
  defaultDialCode: string;
  measurementSystem: 'metric' | 'imperial';
}

export const DEFAULT_REGION: RegionConfig = {
  currency: 'INR',
  currencySymbol: '₹',
  defaultCountryCode: 'IN',
  defaultDialCode: '+91',
  measurementSystem: 'metric',
};
```

---

## Design System

### Color Tokens

All tokens defined in `constants/colors.ts` and mirrored as NativeWind custom colors in `tailwind.config.js`.

#### Light Mode

```typescript
export const lightColors = {
  // Backgrounds
  bgBase:    '#FDF8F0',  // Warm white — screen backgrounds
  bgSurface: '#F5EFE6',  // Cream — tab bars, section backgrounds
  bgCard:    '#FFFFFF',  // Pure white — cards

  // Primary (Saffron)
  primary50:  '#FEF0E6',
  primary200: '#FBBF9A',
  primary500: '#E8601C',  // Main CTA, active states, highlights
  primary600: '#C44E12',  // Pressed state
  primary700: '#9E3D0D',  // Dark variant

  // Text
  textPrimary:   '#1A1208',  // Charcoal — headings, body
  textSecondary: '#A0856E',  // Warm brown — captions, labels
  textTertiary:  '#C4B5A5',  // Light — placeholders, hints
  textInverse:   '#FFFFFF',  // On saffron or dark backgrounds

  // Borders
  border:      '#EDE5D8',  // Default — inputs, dividers
  borderFocus: '#E8601C',  // Active input border

  // Semantic
  success: '#2E7D32',
  danger:  '#D32F2F',
  warning: '#F57C00',

  // Semantic backgrounds
  successBg: '#E8F5E9',
  dangerBg:  '#FFF0F0',
  warningBg: '#FFF8E1',
};
```

#### Dark Mode

Dark mode uses warm dark browns — not cold grays. Stays on-brand in both modes.

```typescript
export const darkColors = {
  // Backgrounds
  bgBase:    '#150F08',  // Deep warm black
  bgSurface: '#1E1610',  // Dark brown — tab bars, section backgrounds
  bgCard:    '#2A1E12',  // Card surfaces

  // Primary (shifted lighter for dark surfaces)
  primary50:  '#3D1A08',
  primary400: '#F5926A',  // Hover/lighter variant
  primary500: '#F07540',  // Main — slightly lighter than light mode
  primary600: '#E8601C',  // Pressed

  // Text
  textPrimary:   '#F5E6D3',  // Warm cream
  textSecondary: '#8C7260',  // Muted warm brown
  textTertiary:  '#5A4535',  // Subtle — placeholders

  // Borders
  border:      'rgba(255, 255, 255, 0.08)',
  borderFocus: '#F07540',

  // Semantic (same hues, adjusted brightness)
  success: '#4CAF50',
  danger:  '#EF5350',
  warning: '#FFA726',

  successBg: '#1B3A1D',
  dangerBg:  '#3A1414',
  warningBg: '#3A2A0A',
};
```

### Typography

Font: **Inter** via `expo-google-fonts`. No custom font hosting needed.

```typescript
// constants/typography.ts
export const fonts = {
  bold:     'Inter_700Bold',
  extraBold:'Inter_800ExtraBold',
  semiBold: 'Inter_600SemiBold',
  medium:   'Inter_500Medium',
  regular:  'Inter_400Regular',
};

export const type = {
  display: {
    fontSize: 32, fontFamily: fonts.extraBold,
    letterSpacing: -1, lineHeight: 38,
  },
  screenTitle: {
    fontSize: 24, fontFamily: fonts.extraBold,
    letterSpacing: -0.5, lineHeight: 30,
  },
  cardHeading: {
    fontSize: 18, fontFamily: fonts.bold,
    letterSpacing: -0.3, lineHeight: 24,
  },
  sectionLabel: {
    fontSize: 15, fontFamily: fonts.semiBold,
    letterSpacing: -0.2, lineHeight: 21,
  },
  body: {
    fontSize: 14, fontFamily: fonts.regular,
    letterSpacing: 0, lineHeight: 22,
  },
  caption: {
    fontSize: 12, fontFamily: fonts.medium,
    letterSpacing: 0, lineHeight: 18,
  },
  overline: {
    fontSize: 10, fontFamily: fonts.bold,
    letterSpacing: 1.5, lineHeight: 14,
    textTransform: 'uppercase' as const,
  },
};
```

| Size | Weight | Tracking | Usage |
|---|---|---|---|
| 32 | 800 | -1px | Splash screen, onboarding hero |
| 24 | 800 | -0.5px | Tab screen headers |
| 18 | 700 | -0.3px | Destination card names |
| 15 | 600 | -0.2px | Day headers, section titles |
| 14 | 400 | 0 | All body / description text |
| 12 | 500 | 0 | Metadata, stat rows, captions |
| 10 | 700 | +1.5px ALL CAPS | Field labels, overlines |

### Spacing & Shape

- **Spacing scale:** 4, 8, 12, 16, 20, 24, 32, 40, 48 (Tailwind standard)
- **Border radius:** Cards `16px`, Buttons `12px`, Inputs `12px`, Badges `20px` (pill), Small badges `6px`, Tabs `20px`
- **Card shadow (light):** `0 4px 20px rgba(0,0,0,0.08)`
- **Card shadow (dark):** `0 4px 20px rgba(0,0,0,0.4)`
- **Primary button shadow:** `0 4px 16px rgba(232,96,28,0.3)`

---

## Component Library

### Buttons

```
Primary    → bg #E8601C · text white · shadow rgba(232,96,28,0.3) · radius 12
Secondary  → bg #FEF0E6 · text #E8601C · border #FBBF9A · radius 12
Ghost      → transparent · text #1A1208 · border #EDE5D8 · radius 12
Destructive→ bg #FFF0F0 · text #D32F2F · border #FFCDD2 · radius 12
Loading    → same as Primary, 70% opacity, disabled, shows spinner
```

All buttons: height 48px, full-width by default, font 14px weight 700.

### Inputs

```
Default  → bg white · border #EDE5D8 · label overline above · radius 12
Focused  → border #E8601C · outer glow rgba(232,96,28,0.1) 3px · label turns saffron
Error    → border #D32F2F · error message 11px danger below
Multiline→ same as default · minHeight 72px
```

OTP Input: 6 individual boxes, 46×54px, radius 12, saffron border on all filled+active boxes, cursor blink on active, auto-focus progression, auto-submit on 6th digit.

### Badges & Tags

```
Match score   → bg #FEF0E6 · text #E8601C · radius 20 · "82% match"
Hidden Gem    → bg #E8601C · text white · radius 20 · "🌿 Hidden Gem"
Status OK     → bg #E8F5E9 · text #2E7D32 · radius 6 · "✅ Itinerary"
Status missing→ bg #F5EFE6 · text #C4B5A5 · radius 6 · "— Food"
Stat pill     → bg #F5EFE6 · text #A0856E · radius 6 · "₹8–12k/pp"
Dietary warn  → bg #FFF3E0 · text #E65100 · radius 4 · "🐷 Contains pork"
```

### Experience Chips (multi-select)

```
Inactive → bg white · border #EDE5D8 · text #A0856E · radius 20 · pad 7×14
Active   → bg #E8601C · text white · radius 20 · shadow rgba(232,96,28,0.25)
```

Chips: Nature, Adventure, Food, Culture, Spiritual, Photography, Shopping, Nightlife, Relaxation.

### Bottom Navigation — Warm Cream Pill

```
Light: outer pill bg #F5EFE6 · shadow rgba(232,96,28,0.12)
       active tab → inner pill bg #E8601C · text white
       inactive   → icon + label at 40% opacity

Dark:  outer pill bg #2A1E12 · shadow rgba(0,0,0,0.4)
       active tab → inner pill bg #F07540 · text white
       inactive   → icon + label at 35% opacity
```

Three tabs: Search (🧭), Trips (🗺), Profile (👤). Pill floats 16px above safe area bottom. Active inner pill animates with spring on tab change.

### Empty States

Every list screen handles empty gracefully with an illustration + message + CTA:

```
No trips yet → open backpack illustration · "No trips yet" · "Search for your first destination →"
No results   → compass illustration · "No destinations found" · "Try different dates or experience types →"
Error        → lost traveler illustration · "Something went wrong" · "Tap to try again →"
```

### Loading States

AI calls (search, itinerary, food guide) can take 10–30 seconds. Never show a bare spinner.

```
1. Lottie compass animation (80×80) centred
2. "Sarthi is thinking..." headline
3. Contextual subtitle: "Scanning weather, routes, and hidden gems for your dates"
4. Skeleton cards below — pulsing warm gray placeholders matching card layout
```

For list screens (saved trips): skeleton cards matching the trip card layout, 3 placeholders.

---

## Screens

### 1. Welcome (`(auth)/welcome.tsx`)

- Full-screen warm white background with two subtle radial gradient circles (saffron, 6% opacity) in corners for depth
- Sarthi logo (compass icon + wordmark) top-left
- Illustration carousel (3 slides) — unDraw/Storyset illustrations recoloured to Saffron & Mist palette:
  - Slide 1: Traveler with backpack on mountain
  - Slide 2: Train journey through landscape
  - Slide 3: Friends around campfire, starry sky
- Slide dot indicator: active dot wide pill (#E8601C), inactive dots small (#EDE5D8)
- Overline label above the headline — e.g. "EXPLORE INDIA YOUR WAY"
- Screen title: "Your personal travel companion"
- Body: "AI-powered destination finder, itineraries, and food guides — built for Indian travelers."
- Primary CTA: "Get Started →" — full width, pinned above safe area
- "Already have an account? Sign in" — tappable inline link in saffron

### 2. Login (`(auth)/login.tsx`)

- Back button (top-left) + Sarthi compass icon (centred) in header
- Screen title: "Welcome back"
- Body: "Sign in to continue planning your trips"
- Phone input with integrated country picker (flag + dial code + chevron), separated by vertical divider
- Primary CTA: "Send OTP →"
- Divider: "or continue with" in tertiary text
- Google outlined button (Google G icon + label)
- Email outlined button (✉️ icon + label)
- Terms + Privacy inline link footer in tertiary text

### 3. OTP Verify (`(auth)/verify-otp.tsx`)

- Back button
- Phone icon in warm gradient circle (saffron 50 to 200)
- Screen title: "Enter OTP"
- "Code sent to +91 98765 XXXXX" + "Change number" tappable in saffron
- 6-box OTP input, saffron border on all entered + active boxes, cursor blink on active
- Auto-submits on 6th digit — "Verify & Continue →" button shown as manual fallback
- Resend countdown: "Resend code in 0:24" — becomes tappable link when timer hits zero
- Step indicator dots at bottom (3 dots, active is elongated pill)

### 4. Search Form (`(tabs)/search/index.tsx`)

- Overline: "GOOD MORNING" (or time-appropriate greeting)
- Screen title: "Where to next?"
- Body subtitle below title
- **Fields (in order):**
  1. Freetext multiline input (focused by default) — "Describe your trip"
  2. Date row: FROM + TO date pickers side by side
  3. Departure city dropdown + Group size/type row
  4. Budget dual-thumb range slider with live formatted label (₹5,000 – ₹15,000)
  5. Experience type multi-select chips (wraps to 2–3 rows)
  6. Expandable: "+ Health Profile" — tap to reveal health fields
  7. Expandable: "+ Food Preferences" — tap to reveal dietary fields
  8. Hidden Gems Only toggle with subtitle
- Primary CTA pinned to bottom: "🔍 Find Destinations"
- Fields 6 and 7 collapsed by default, smooth height animation on expand

### 5. Search Results (`(tabs)/search/results.tsx`)

- Header: back button + result count ("5 destinations") + active filters summary + Filter button
- Cards in a vertical scroll list:
  - **First card** — full hero treatment (140px image, all badges, full stat row, both action buttons)
  - **Second card** — medium treatment (100px image, match badge, key stats, both buttons)
  - **Subsequent cards** — compact (70px image, name, state, match %)
  - Cards expand to full detail on tap if not already full-size
- On each full/medium card:
  - Destination photo gradient header with name + state overlaid
  - Hidden Gem badge (top-left, on image) if applicable
  - Match score badge (top-right, on image)
  - Save/bookmark icon (bottom-right, on image)
  - `whyItMatches` as body text
  - Stat pills: budget, travel time, weather, fitness suitability
  - "Get Itinerary" (primary) + "Food Guide" (secondary) action buttons
- Trek results use a different card layout: altitude, difficulty, duration, terrain type pills
- AI loading state: Lottie compass + message + skeleton cards before results appear

### 6. Itinerary View (`trip/[id]/itinerary.tsx`)

- Hero image header (110px) with destination name, trip summary, and Save button
- Horizontal scrollable day tabs — active tab saffron pill, inactive cream
- Day header: "Day N — Title" in section label style
- Vertical timeline:
  - Connecting line: `#EDE5D8`, 2px wide, positioned left
  - Activity dot: `#E8601C` with 2px saffron glow ring for key activities
  - Meal dot: `#FBBF9A` (lighter) for meal entries
  - Time marker: overline style, saffron for activities, secondary for meals
  - Activity card: white, radius 12, shadow, name + description + stat pills
  - Meal card: `#FEF0E6` background, amber border, meal type overline, dish name + cost
- Day total card: right-aligned cost in screen title style
- Packing list: cream background card, 2-column checklist grid

### 7. Food Guide (`trip/[id]/food-guide.tsx`)

- Hero header with warm spice gradient (dark terracotta), destination + dish count + meal plan info
- Cuisine overview card (white, body text)
- "MUST-TRY DISHES" section:
  - Each dish card: horizontal layout — emoji colour block (72px wide) + details
  - Details: name, description, price, location, dietary tags, spice/salt profile tags
  - "Must Try" badge (saffron) or "Veg ✓" badge (green) top-right
- "STREET FOOD" section with safety warning banner (amber, left border accent)
- Street food cards: minimal, name + location + price
- "TODAY'S MEAL PLAN" card: breakfast 🌅 / lunch ☀️ / dinner 🌙 rows with dividers
- "DIETARY INFO" summary at bottom

### 8. Saved Trips (`(tabs)/trips/index.tsx`)

- Screen title: "My Trips" + trip count subtitle
- Vertical list of trip cards, sorted most-recent first
- Each trip card:
  - Destination photo header (70px) with name + state overlaid
  - Below: dates + group type, saved timestamp (right-aligned)
  - Status badges row: ✅ Itinerary / ✅ Food or — Food (missing)
- Swipe-left gesture reveals delete (with confirmation bottom sheet)
- Empty state: open backpack illustration + "No trips yet" + search CTA

### 9. Trip Detail (`trip/[id]/index.tsx`)

- Hero image header (120px) with back + overflow menu (share, delete, rename)
- Destination name, dates, group, travel mode overlaid on hero
- Trip Readiness bar: label + "82/100" + animated progress bar (saffron gradient fill)
- Navigation tiles: Itinerary (saffron filled) + Food Guide (ghost) — 2-column grid
- Highlights card: bulleted list of 3 key highlights
- Cost breakdown card: transport, stay, food, activities rows + total/person in saffron
- Health advisory card: suitability label + physical demand description
- Share card: dashed border, saffron "Share" button, "Anyone with the link can view"

### 10. Share (`trip/[id]/share.tsx`)

- Bottom sheet (not full screen)
- "Share this trip" title
- Toggle: sharing on/off
- Share link with copy-to-clipboard button
- System share sheet button (WhatsApp, Instagram, etc.)

### 11. Shared Trip (`shared/[token].tsx`)

- Same layout as Trip Detail — read-only
- "Shared by {name}" in overline style below hero
- "Sign up to plan your own trip" saffron CTA banner at bottom
- No auth required

### 12. Profile (`(tabs)/profile/index.tsx`)

- Dark warm header (`#2C1A08 → #5A3214` gradient) with avatar, name, email, stats (trips / days planned / shared)
- **Preferences section:** Dark Mode toggle, Language selector, Notifications toggle
- **Account section:** Change Email, Sign Out, Delete Account (danger text)
- About: version number, Terms · Privacy · Help links

---

## Authentication Flow

```
App Launch
  → Check expo-secure-store for Firebase token
  → Valid token → (tabs)
  → Expired → silent refresh → success → (tabs)
  → No token / refresh fails → (auth)/welcome

After auth:
  → Store Firebase ID token in expo-secure-store
  → Set Authorization: Bearer {token} header on all API calls
  → Token auto-refreshes via Firebase SDK listener
  → Navigate to (tabs)
```

Three providers: Phone OTP (primary), Google Sign-In, Email/Password.

---

## API Client

```typescript
// services/api.ts
const API_BASE = __DEV__
  ? 'http://192.168.x.x:3000'
  : 'https://api.sarthi.app';

async function getAuthHeader(): Promise<Record<string, string>> {
  const user = getAuth().currentUser;
  if (!user) return {};
  const token = await user.getIdToken();
  return { Authorization: `Bearer ${token}` };
}

export async function apiRequest<T>(path: string, options: RequestInit = {}): Promise<T> {
  const headers = {
    'Content-Type': 'application/json',
    ...(await getAuthHeader()),
    ...options.headers,
  };
  const response = await fetch(`${API_BASE}${path}`, { ...options, headers });
  if (!response.ok) throw new ApiError(response.status, await response.text());
  return response.json();
}
```

---

## State Management

### Auth Store (`stores/auth.store.ts`)
```typescript
interface AuthState {
  user: FirebaseUser | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  setUser: (user: FirebaseUser | null) => void;
}
```

### Search Store (`stores/search.store.ts`)
```typescript
interface SearchState {
  formValues: Partial<SearchDto>;  // Persisted so user doesn't lose form on navigation
  setFormValues: (values: Partial<SearchDto>) => void;
  resetForm: () => void;
}
```

---

## TanStack Query Hooks

```typescript
// hooks/useSearch.ts
export function useSearch() {
  return useMutation({ mutationFn: (dto: SearchDto) => searchService.search(dto) });
}

// hooks/useTrips.ts
export function useTrips() {
  return useQuery({ queryKey: ['trips'], queryFn: tripsService.list });
}
export function useTrip(id: string) {
  return useQuery({ queryKey: ['trip', id], queryFn: () => tripsService.getById(id) });
}
```

---

## File Structure

```
sarthi-app/
├── app/
│   ├── _layout.tsx                   (root — providers, auth guard, fonts)
│   ├── index.tsx                     (splash/redirect)
│   ├── (auth)/
│   │   ├── _layout.tsx
│   │   ├── welcome.tsx
│   │   ├── login.tsx
│   │   └── verify-otp.tsx
│   ├── (tabs)/
│   │   ├── _layout.tsx               (Warm Cream Pill tab bar)
│   │   ├── search/
│   │   │   ├── index.tsx
│   │   │   └── results.tsx
│   │   ├── trips/
│   │   │   └── index.tsx
│   │   └── profile/
│   │       └── index.tsx
│   ├── trip/[id]/
│   │   ├── index.tsx
│   │   ├── itinerary.tsx
│   │   ├── food-guide.tsx
│   │   └── share.tsx
│   ├── itinerary/new.tsx
│   ├── food-guide/new.tsx
│   └── shared/[token].tsx
│
├── components/
│   ├── ui/
│   │   ├── Button.tsx
│   │   ├── Card.tsx
│   │   ├── Input.tsx
│   │   ├── Badge.tsx
│   │   ├── Chip.tsx
│   │   ├── BottomSheet.tsx
│   │   ├── LoadingSpinner.tsx
│   │   ├── SkeletonCard.tsx
│   │   ├── EmptyState.tsx
│   │   └── CountryPicker.tsx
│   ├── search/
│   │   ├── SearchForm.tsx
│   │   ├── DestinationCard.tsx
│   │   ├── TrekCard.tsx
│   │   ├── ExperienceChips.tsx
│   │   ├── BudgetSlider.tsx
│   │   └── HealthProfileForm.tsx
│   ├── trip/
│   │   ├── TripCard.tsx
│   │   ├── ItineraryTimeline.tsx
│   │   ├── ActivityCard.tsx
│   │   ├── MealCard.tsx
│   │   ├── DayTabs.tsx
│   │   └── CostBreakdown.tsx
│   ├── food/
│   │   ├── DishCard.tsx
│   │   ├── StreetFoodCard.tsx
│   │   ├── MealPlanDay.tsx
│   │   └── AllergyAlert.tsx
│   └── auth/
│       ├── OTPInput.tsx
│       ├── PhoneInput.tsx
│       ├── GoogleSignInButton.tsx
│       └── EmailPasswordForm.tsx
│
├── services/
│   ├── api.ts
│   ├── auth.service.ts
│   ├── search.service.ts
│   ├── trips.service.ts
│   └── shared.service.ts
│
├── stores/
│   ├── auth.store.ts
│   └── search.store.ts
│
├── hooks/
│   ├── useAuth.ts
│   ├── useSearch.ts
│   ├── useTrips.ts
│   └── useColorScheme.ts
│
├── constants/
│   ├── colors.ts         (lightColors + darkColors exports)
│   └── typography.ts     (fonts + type scale)
│
├── config/
│   ├── locale.ts
│   └── api.ts
│
├── locales/
│   └── en.json
│
├── assets/
│   ├── illustrations/    (SVG — welcome, empty states, error)
│   ├── animations/       (Lottie JSON — compass-loading, save-success)
│   └── fonts/            (Inter font files via expo-google-fonts)
│
├── app.json
├── tailwind.config.js
├── tsconfig.json
└── package.json
```

---

## Deep Linking

```json
// app.json
{
  "expo": {
    "scheme": "sarthi",
    "web": { "bundler": "metro" }
  }
}
```

- `sarthi://shared/{token}` → `shared/[token].tsx`
- `https://sarthi.app/shared/{token}` → same via universal link

---

## Dark Mode

Driven by device system preference. Manual toggle in Profile settings stored in Zustand + AsyncStorage. NativeWind `dark:` classes throughout — no one-off overrides.

```typescript
// hooks/useColorScheme.ts
export function useColors() {
  const scheme = useColorScheme();
  return scheme === 'dark' ? darkColors : lightColors;
}
```

---

## Illustrations & Animations

| Asset | Type | Used On |
|---|---|---|
| welcome-traveler | SVG (unDraw) | Welcome slide 1 |
| welcome-train | SVG (unDraw) | Welcome slide 2 |
| welcome-campfire | SVG (unDraw) | Welcome slide 3 |
| empty-trips | SVG (unDraw) | Saved trips empty state |
| empty-results | SVG (unDraw) | Search no results |
| error-lost | SVG (unDraw) | Error states |
| compass-loading | Lottie | AI call loading overlay |
| save-success | Lottie | Trip saved confirmation |

All SVG illustrations recoloured to Saffron & Mist palette before import: primary shapes `#E8601C`, accents `#FBBF9A`, backgrounds `#FDF8F0`.

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
    "@expo-google-fonts/inter": "^0.2.3",

    "i18next": "^24.0.0",
    "react-i18next": "^15.0.0",

    "react-native-safe-area-context": "^5.0.0",
    "react-native-screens": "~4.0.0",
    "react-native-gesture-handler": "~2.20.0"
  }
}
```

---

## What This Phase Does NOT Include

- Personality profile (Phase 2B)
- Place context cards (Phase 2C)
- Trip chat / phrasebook (Phase 2C)
- Editable itinerary (Phase 2C)
- Live Sarthi Mode (Phase 2D)
- Push notifications (Phase 2D)
- Offline download (Phase 2E)
