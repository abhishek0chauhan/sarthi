# App Phase 1: Core Shell — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build the Sarthi Expo React Native app covering all existing backend APIs — auth, search, itinerary, food guide, saved trips, and sharing — with the "Warm Explorer" design system, i18n, and dark mode.

**Architecture:** Expo SDK 53 managed workflow with file-based routing (Expo Router v4). NativeWind v4 for styling, Zustand for client state, TanStack Query v5 for server state. Firebase Auth for phone OTP, Google Sign-In, and email/password. All UI strings externalized via i18next for global readiness.

**Tech Stack:** Expo SDK 53+, Expo Router v4, TypeScript, NativeWind v4, Zustand, TanStack Query v5, React Hook Form + Zod, Firebase Auth, i18next, react-native-svg, lottie-react-native, @gorhom/bottom-sheet

**Spec:** `docs/superpowers/specs/2026-04-16-app-phase1-core-shell-design.md`

**Backend API base:** The NestJS backend runs at `http://localhost:3000` in dev. All endpoints require Firebase Bearer token except `GET /shared-trips/:token`.

**Note:** User controls all git commits — do NOT commit during implementation.

---

## File Structure Overview

```
sarthi-app/
├── app/
│   ├── _layout.tsx                  (root — providers, auth guard, fonts)
│   ├── index.tsx                    (splash redirect based on auth)
│   ├── (auth)/
│   │   ├── _layout.tsx
│   │   ├── welcome.tsx
│   │   ├── login.tsx
│   │   └── verify-otp.tsx
│   ├── (tabs)/
│   │   ├── _layout.tsx              (bottom tab bar)
│   │   ├── search/
│   │   │   ├── index.tsx
│   │   │   └── results.tsx
│   │   ├── trips/
│   │   │   └── index.tsx
│   │   └── profile/
│   │       └── index.tsx
│   ├── trip/
│   │   └── [id]/
│   │       ├── index.tsx
│   │       ├── itinerary.tsx
│   │       ├── food-guide.tsx
│   │       └── share.tsx
│   ├── itinerary/
│   │   └── new.tsx
│   ├── food-guide/
│   │   └── new.tsx
│   └── shared/
│       └── [token].tsx
├── components/
│   ├── ui/
│   │   ├── Button.tsx
│   │   ├── Card.tsx
│   │   ├── Input.tsx
│   │   ├── Badge.tsx
│   │   ├── BottomSheet.tsx
│   │   ├── LoadingSpinner.tsx
│   │   ├── SkeletonCard.tsx
│   │   ├── EmptyState.tsx
│   │   └── CountryPicker.tsx
│   ├── search/
│   │   ├── SearchForm.tsx
│   │   ├── DestinationCard.tsx
│   │   ├── TrekCard.tsx
│   │   ├── FilterChips.tsx
│   │   └── HealthProfileForm.tsx
│   ├── trip/
│   │   ├── TripCard.tsx
│   │   ├── ItineraryTimeline.tsx
│   │   ├── ActivityCard.tsx
│   │   ├── DayTabs.tsx
│   │   ├── MealCard.tsx
│   │   └── CostBreakdown.tsx
│   ├── food/
│   │   ├── DishCard.tsx
│   │   ├── StreetFoodCard.tsx
│   │   ├── MealPlanDay.tsx
│   │   ├── TasteProfileRadar.tsx
│   │   ├── AllergyAlert.tsx
│   │   └── DietaryInfo.tsx
│   └── auth/
│       ├── PhoneOTPForm.tsx
│       ├── GoogleSignInButton.tsx
│       └── EmailPasswordForm.tsx
├── services/
│   ├── api.ts
│   ├── auth.service.ts
│   ├── search.service.ts
│   ├── trips.service.ts
│   └── shared.service.ts
├── stores/
│   ├── auth.store.ts
│   └── search.store.ts
├── hooks/
│   ├── useSearch.ts
│   ├── useTrips.ts
│   └── useColorScheme.ts
├── locales/
│   └── en.json
├── config/
│   ├── locale.ts
│   └── api.ts
├── constants/
│   ├── colors.ts
│   └── typography.ts
├── types/
│   ├── search.types.ts
│   ├── trip.types.ts
│   └── food.types.ts
├── assets/
│   ├── illustrations/
│   ├── animations/
│   ├── icons/
│   │   ├── tabs/
│   │   ├── experience/
│   │   └── match/
│   └── patterns/
├── app.json
├── tailwind.config.js
├── metro.config.js
├── babel.config.js
├── tsconfig.json
├── global.css
└── package.json
```

---

## Task 1: Scaffold Expo Project & Install Dependencies

**Files:**
- Create: `sarthi-app/` (entire scaffold)
- Modify: `sarthi-app/package.json` (add all deps)
- Modify: `sarthi-app/tsconfig.json` (path aliases)
- Modify: `sarthi-app/app.json` (scheme, name, plugins)

- [ ] **Step 1: Create Expo project**

Run from `/home/abhishek/Desktop/Abhishek/Sarthi/`:

```bash
npx create-expo-app@latest sarthi-app --template blank-typescript
```

Expected: New `sarthi-app/` directory with basic Expo TypeScript project.

- [ ] **Step 2: Install core dependencies**

Run from `sarthi-app/`:

```bash
npx expo install expo-router expo-linking expo-constants expo-status-bar react-native-safe-area-context react-native-screens react-native-gesture-handler react-native-reanimated expo-font expo-splash-screen expo-secure-store expo-localization
```

- [ ] **Step 3: Install NativeWind**

```bash
npx expo install nativewind tailwindcss@^3.4.0
```

- [ ] **Step 4: Install Firebase**

```bash
npx expo install @react-native-firebase/app @react-native-firebase/auth
npm install @react-native-google-signin/google-signin
```

- [ ] **Step 5: Install state management & data fetching**

```bash
npm install @tanstack/react-query zustand react-hook-form @hookform/resolvers zod
```

- [ ] **Step 6: Install UI libraries**

```bash
npx expo install react-native-svg lottie-react-native @gorhom/bottom-sheet @expo/vector-icons
npm install react-native-svg-transformer
```

- [ ] **Step 7: Install i18n**

```bash
npm install i18next react-i18next
```

- [ ] **Step 8: Install Inter font**

```bash
npx expo install @expo-google-fonts/inter
```

- [ ] **Step 9: Configure app.json**

Replace `sarthi-app/app.json`:

```json
{
  "expo": {
    "name": "Sarthi",
    "slug": "sarthi",
    "version": "1.0.0",
    "orientation": "portrait",
    "icon": "./assets/icon.png",
    "scheme": "sarthi",
    "userInterfaceStyle": "automatic",
    "newArchEnabled": true,
    "splash": {
      "image": "./assets/splash-icon.png",
      "resizeMode": "contain",
      "backgroundColor": "#FAFAF8"
    },
    "ios": {
      "supportsTablet": false,
      "bundleIdentifier": "com.sarthi.app",
      "googleServicesFile": "./GoogleService-Info.plist"
    },
    "android": {
      "adaptiveIcon": {
        "foregroundImage": "./assets/adaptive-icon.png",
        "backgroundColor": "#FAFAF8"
      },
      "package": "com.sarthi.app",
      "googleServicesFile": "./google-services.json"
    },
    "web": {
      "bundler": "metro",
      "favicon": "./assets/favicon.png"
    },
    "plugins": [
      "expo-router",
      "expo-font",
      "expo-localization",
      "expo-secure-store",
      "@react-native-firebase/app",
      "@react-native-firebase/auth",
      "@react-native-google-signin/google-signin"
    ]
  }
}
```

- [ ] **Step 10: Configure TypeScript path aliases**

Replace `sarthi-app/tsconfig.json`:

```json
{
  "extends": "expo/tsconfig.base",
  "compilerOptions": {
    "strict": true,
    "baseUrl": ".",
    "paths": {
      "@/*": ["./*"]
    }
  },
  "include": ["**/*.ts", "**/*.tsx", ".expo/types/**/*.ts", "expo-env.d.ts"]
}
```

- [ ] **Step 11: Configure Tailwind**

Create `sarthi-app/tailwind.config.js`:

```js
/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    './app/**/*.{js,jsx,ts,tsx}',
    './components/**/*.{js,jsx,ts,tsx}',
  ],
  presets: [require('nativewind/preset')],
  theme: {
    extend: {
      colors: {
        primary: {
          50: '#EEF2FF',
          100: '#E0E7FF',
          500: '#4F46E5',
          600: '#4338CA',
          700: '#3730A3',
        },
        secondary: {
          50: '#FFF7ED',
          100: '#FFEDD5',
          500: '#F97316',
          600: '#EA580C',
        },
        accent: {
          50: '#F0FDFA',
          100: '#CCFBF1',
          500: '#14B8A6',
          600: '#0D9488',
        },
        background: '#FAFAF8',
        surface: '#F5F3EF',
        'surface-hover': '#EDEBE5',
        'text-primary': '#1C1917',
        'text-secondary': '#78716C',
        'text-tertiary': '#A8A29E',
        border: '#E7E5E4',
        'border-focus': '#4F46E5',
        danger: '#EF4444',
        warning: '#F59E0B',
      },
      fontFamily: {
        'heading-bold': ['Inter_700Bold'],
        'heading-semibold': ['Inter_600SemiBold'],
        'body-regular': ['Inter_400Regular'],
        'body-medium': ['Inter_500Medium'],
      },
      borderRadius: {
        card: '12px',
        button: '10px',
        badge: '20px',
        input: '10px',
      },
    },
  },
  plugins: [],
};
```

- [ ] **Step 12: Create global CSS for NativeWind**

Create `sarthi-app/global.css`:

```css
@tailwind base;
@tailwind components;
@tailwind utilities;
```

- [ ] **Step 13: Configure Metro for SVG transformer**

Create `sarthi-app/metro.config.js`:

```js
const { getDefaultConfig } = require('expo/metro-config');
const { withNativeWind } = require('nativewind/metro');

const config = getDefaultConfig(__dirname);

// SVG transformer
const { transformer, resolver } = config;
config.transformer = {
  ...transformer,
  babelTransformerPath: require.resolve('react-native-svg-transformer/expo'),
};
config.resolver = {
  ...resolver,
  assetExts: resolver.assetExts.filter((ext) => ext !== 'svg'),
  sourceExts: [...resolver.sourceExts, 'svg'],
};

module.exports = withNativeWind(config, { input: './global.css' });
```

- [ ] **Step 14: Add SVG type declaration**

Create `sarthi-app/declarations.d.ts`:

```typescript
declare module '*.svg' {
  import React from 'react';
  import { SvgProps } from 'react-native-svg';
  const content: React.FC<SvgProps>;
  export default content;
}
```

- [ ] **Step 15: Update babel.config.js**

Replace `sarthi-app/babel.config.js`:

```js
module.exports = function (api) {
  api.cache(true);
  return {
    presets: [['babel-preset-expo', { jsxImportSource: 'nativewind' }]],
    plugins: ['react-native-reanimated/plugin'],
  };
};
```

- [ ] **Step 16: Create asset directories**

```bash
cd sarthi-app && mkdir -p assets/illustrations assets/animations assets/icons/tabs assets/icons/experience assets/icons/match assets/patterns
```

- [ ] **Step 17: Verify project compiles**

```bash
npx expo start --clear
```

Expected: Metro bundler starts. Press `a` for Android or `i` for iOS to verify the app loads (blank screen is fine at this stage). Press `Ctrl+C` to stop.

---

## Task 2: Design System — Constants & Config

**Files:**
- Create: `sarthi-app/constants/colors.ts`
- Create: `sarthi-app/constants/typography.ts`
- Create: `sarthi-app/config/locale.ts`
- Create: `sarthi-app/config/api.ts`

- [ ] **Step 1: Create color constants**

Create `sarthi-app/constants/colors.ts`:

```typescript
export const colors = {
  primary: {
    50: '#EEF2FF',
    100: '#E0E7FF',
    500: '#4F46E5',
    600: '#4338CA',
    700: '#3730A3',
  },
  secondary: {
    50: '#FFF7ED',
    100: '#FFEDD5',
    500: '#F97316',
    600: '#EA580C',
  },
  accent: {
    50: '#F0FDFA',
    100: '#CCFBF1',
    500: '#14B8A6',
    600: '#0D9488',
  },
  background: '#FAFAF8',
  surface: '#F5F3EF',
  surfaceHover: '#EDEBE5',
  text: {
    primary: '#1C1917',
    secondary: '#78716C',
    tertiary: '#A8A29E',
    inverse: '#FAFAF8',
  },
  danger: '#EF4444',
  warning: '#F59E0B',
  success: '#14B8A6',
  info: '#4F46E5',
  border: '#E7E5E4',
  borderFocus: '#4F46E5',
} as const;

export const darkColors = {
  background: '#1C1917',
  surface: '#292524',
  text: {
    primary: '#FAFAF8',
    secondary: '#A8A29E',
    tertiary: '#78716C',
    inverse: '#1C1917',
  },
  border: '#44403C',
  primary500: '#818CF8',
} as const;
```

- [ ] **Step 2: Create typography constants**

Create `sarthi-app/constants/typography.ts`:

```typescript
export const fonts = {
  heading: {
    bold: 'Inter_700Bold',
    semiBold: 'Inter_600SemiBold',
  },
  body: {
    regular: 'Inter_400Regular',
    medium: 'Inter_500Medium',
  },
} as const;

export const textSizes = {
  h1: 28,
  h2: 22,
  h3: 18,
  body: 16,
  caption: 14,
  small: 12,
} as const;
```

- [ ] **Step 3: Create locale config**

Create `sarthi-app/config/locale.ts`:

```typescript
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

export function formatCurrency(
  amount: number,
  currency: string = DEFAULT_REGION.currency,
  locale: string = 'en-IN',
): string {
  return new Intl.NumberFormat(locale, {
    style: 'currency',
    currency,
    maximumFractionDigits: 0,
  }).format(amount);
}

export function formatDate(
  date: Date | string,
  locale: string = 'en-IN',
): string {
  return new Intl.DateTimeFormat(locale, {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
  }).format(new Date(date));
}
```

- [ ] **Step 4: Create API config**

Create `sarthi-app/config/api.ts`:

```typescript
const DEV_API_URL = 'http://10.0.2.2:3000'; // Android emulator → host localhost
const PROD_API_URL = 'https://api.sarthi.app';

export const API_CONFIG = {
  baseUrl: __DEV__ ? DEV_API_URL : PROD_API_URL,
  timeout: 60_000, // 60s — AI calls can be slow
} as const;
```

---

## Task 3: i18n Setup

**Files:**
- Create: `sarthi-app/locales/en.json`
- Create: `sarthi-app/services/i18n.ts`

- [ ] **Step 1: Create English locale file**

Create `sarthi-app/locales/en.json`:

```json
{
  "common": {
    "loading": "Loading...",
    "error": "Something went wrong",
    "retry": "Tap to try again",
    "save": "Save",
    "cancel": "Cancel",
    "delete": "Delete",
    "share": "Share",
    "back": "Back",
    "done": "Done",
    "search": "Search",
    "ok": "OK"
  },
  "auth": {
    "welcome": {
      "tagline": "Your personal travel companion",
      "getStarted": "Get Started",
      "slide1Title": "Discover Hidden Gems",
      "slide1Desc": "Find destinations that match your style, budget, and vibe",
      "slide2Title": "Plan Effortlessly",
      "slide2Desc": "Get personalized itineraries and food guides in seconds",
      "slide3Title": "Travel Smarter",
      "slide3Desc": "Save trips, share with friends, and explore like a local"
    },
    "login": {
      "title": "Welcome to Sarthi",
      "phonePlaceholder": "Phone number",
      "sendOtp": "Send OTP",
      "orContinueWith": "or continue with",
      "google": "Continue with Google",
      "email": "Continue with Email",
      "emailPlaceholder": "Email address",
      "passwordPlaceholder": "Password",
      "signIn": "Sign In",
      "signUp": "Sign Up",
      "forgotPassword": "Forgot password?"
    },
    "otp": {
      "title": "Verify OTP",
      "sentTo": "Code sent to {{phone}}",
      "resendIn": "Resend in {{seconds}}s",
      "resend": "Resend Code"
    },
    "signOut": "Sign Out",
    "deleteAccount": "Delete Account"
  },
  "search": {
    "title": "Search",
    "placeholder": "Describe your dream trip...",
    "dates": "Dates",
    "from": "From",
    "to": "To",
    "departureCity": "Departure city",
    "group": "Group",
    "groupSize": "Group size",
    "groupType": "Group type",
    "budget": "Budget",
    "experience": "Experience",
    "healthProfile": "Health Profile",
    "foodPreferences": "Food Preferences",
    "hiddenGems": "Hidden Gems Only",
    "findDestinations": "Find Destinations",
    "results": "{{count}} destinations found",
    "noResults": "No destinations found. Try different preferences!",
    "getItinerary": "Get Itinerary",
    "getFoodGuide": "Food Guide",
    "sarthiThinking": "Sarthi is finding the perfect places for you...",
    "groupTypes": {
      "solo": "Solo",
      "couple": "Couple",
      "friends": "Friends",
      "family": "Family"
    },
    "experienceTypes": {
      "nature": "Nature",
      "adventure": "Adventure",
      "food": "Food",
      "culture": "Culture",
      "spiritual": "Spiritual",
      "photography": "Photography",
      "nightlife": "Nightlife",
      "shopping": "Shopping",
      "relaxation": "Relaxation"
    }
  },
  "trips": {
    "title": "My Trips",
    "empty": "No trips yet",
    "emptyDesc": "Search for your first destination!",
    "saved": "Saved {{time}}",
    "itinerary": "Itinerary",
    "foodGuide": "Food Guide",
    "deleteConfirm": "Are you sure you want to delete this trip?",
    "tripSaved": "Trip saved!",
    "highlights": "Highlights",
    "costBreakdown": "Cost Breakdown",
    "healthAdvisory": "Health Advisory",
    "packingList": "Packing List",
    "dayTotal": "Day total",
    "perPerson": "per person"
  },
  "food": {
    "overview": "Overview",
    "mustTry": "Must-Try Dishes",
    "streetFood": "Street Food",
    "mealPlan": "Meal Plan",
    "dietary": "Dietary Info",
    "safetyTips": "Safety Tips",
    "breakfast": "Breakfast",
    "lunch": "Lunch",
    "dinner": "Dinner",
    "snack": "Snack"
  },
  "share": {
    "title": "Share Trip",
    "linkCopied": "Link copied!",
    "shareVia": "Share via...",
    "enableSharing": "Enable sharing",
    "disableSharing": "Disable sharing",
    "sharedBy": "Shared by {{name}}",
    "signUpCta": "Sign up to plan your own trip"
  },
  "profile": {
    "title": "Profile",
    "settings": "Settings",
    "darkMode": "Dark Mode",
    "language": "Language",
    "notifications": "Notifications",
    "account": "Account",
    "changeEmail": "Change Email",
    "changePassword": "Change Password",
    "about": "About",
    "version": "Version {{version}}",
    "terms": "Terms",
    "privacy": "Privacy",
    "help": "Help"
  }
}
```

- [ ] **Step 2: Create i18n service**

Create `sarthi-app/services/i18n.ts`:

```typescript
import i18n from 'i18next';
import { initReactI18next } from 'react-i18next';
import { getLocales } from 'expo-localization';
import en from '@/locales/en.json';

const deviceLocale = getLocales()[0]?.languageCode ?? 'en';

i18n.use(initReactI18next).init({
  resources: {
    en: { translation: en },
  },
  lng: deviceLocale,
  fallbackLng: 'en',
  interpolation: {
    escapeValue: false,
  },
});

export default i18n;
```

---

## Task 4: TypeScript Types

**Files:**
- Create: `sarthi-app/types/search.types.ts`
- Create: `sarthi-app/types/trip.types.ts`
- Create: `sarthi-app/types/food.types.ts`

These types mirror the backend DTOs and AI response schemas. They are the contract between the app and the API.

- [ ] **Step 1: Create search types**

Create `sarthi-app/types/search.types.ts`:

```typescript
// Request DTOs — mirror backend DTOs

export interface SearchDto {
  freeText: string;
  dates: { from: string; to: string };
  budget: { min: number; max: number };
  experienceTypes: string[];
  departureCity: string;
  group: { size: number; type: 'solo' | 'couple' | 'friends' | 'family' };
  // Optional health fields
  gender?: string;
  age?: number;
  weight?: number;
  height?: number;
  medicalConditions?: string[];
  // Optional food preferences
  dietType?: string;
  spiceTolerance?: string;
  foodBudget?: string;
  allergies?: string[];
  // Hidden gems
  hiddenGem?: boolean;
}

export interface ItineraryDto {
  destination: string;
  state: string;
  dates: { from: string; to: string };
  budget: { min: number; max: number };
  group: { size: number; type: string };
  departureCity: string;
  freeText: string;
  travelMode?: string;
  gender?: string;
  age?: number;
  weight?: number;
  height?: number;
  medicalConditions?: string[];
}

export interface FoodGuideDto {
  destination: string;
  state: string;
  dates: { from: string; to: string };
  group: { size: number; type: string };
  departureCity: string;
  freeText: string;
  dietType?: string;
  spiceTolerance?: string;
  foodBudget?: string;
  allergies?: string[];
  cuisinePreferences?: string[];
  cookingStyles?: string[];
  flavorPreferences?: string[];
  adventurousness?: string;
  favoriteDishes?: string;
  meatPreferences?: string[];
}

// Response types — mirror backend AI response schemas

export interface HealthAdvisory {
  suitability: string;
  physicalDemand: string;
  considerations: string[];
  recommendations: string[];
}

export interface CostBreakdown {
  transport: string;
  stay: string;
  food: string;
  activities: string;
  total: string;
}

export interface TripReadiness {
  score: number;
  breakdown: {
    weather: number;
    budget: number;
    accessibility: number;
    safety: number;
  };
  tips: string[];
}

export interface SearchResultDestination {
  name: string;
  state: string;
  whyItMatches: string;
  budgetEstimate: string;
  weatherNow: string;
  travelTime: string;
  healthAdvisory: HealthAdvisory;
  tripReadiness: TripReadiness;
  isHiddenGem: boolean;
  highlights: string[];
}

export interface TrekResult {
  name: string;
  region: string;
  state: string;
  altitude: string;
  difficulty: string;
  duration: string;
  terrain: string;
  whyItMatches: string;
  bestMonths: string[];
  highlights: string[];
  healthAdvisory: HealthAdvisory;
}

export interface SearchResponse {
  destinations?: SearchResultDestination[];
  treks?: TrekResult[];
  isTrekMode: boolean;
}
```

- [ ] **Step 2: Create trip types**

Create `sarthi-app/types/trip.types.ts`:

```typescript
export type TravelMode = 'train' | 'flight' | 'bus' | 'car';

export interface TripDates {
  from: string;
  to: string;
}

export interface ItineraryActivity {
  time: string;
  activity: string;
  cost?: string;
  healthNote?: string;
}

export interface ItineraryDay {
  day: number;
  title: string;
  activities: ItineraryActivity[];
  dayTotal?: string;
}

export interface ItineraryData {
  days: ItineraryDay[];
  costBreakdown: {
    transport: string;
    stay: string;
    food: string;
    activities: string;
    total: string;
  };
  packingList: string[];
  permits?: {
    required: boolean;
    details?: string;
    estimatedCost?: string;
  };
  healthAdvisory: {
    suitability: string;
    physicalDemand: string;
    considerations: string[];
    recommendations: string[];
  };
}

export interface SavedTrip {
  id: string;
  name: string;
  destination: string;
  state: string;
  dates: TripDates;
  travelMode?: TravelMode;
  destinationData: Record<string, unknown>;
  itineraryData?: ItineraryData;
  foodGuideData?: Record<string, unknown>;
  shareToken?: string;
  createdAt: string;
  updatedAt: string;
}

export interface TripSummary {
  id: string;
  name: string;
  destination: string;
  state: string;
  dates: TripDates;
  travelMode?: TravelMode;
  hasItinerary: boolean;
  hasFoodGuide: boolean;
  createdAt: string;
}

export interface CreateTripDto {
  destination: string;
  state: string;
  dates: TripDates;
  destinationData: Record<string, unknown>;
  name?: string;
  travelMode?: TravelMode;
  itineraryData?: Record<string, unknown>;
  foodGuideData?: Record<string, unknown>;
}

export interface UpdateTripDto {
  name?: string;
  travelMode?: TravelMode;
  itineraryData?: Record<string, unknown>;
  foodGuideData?: Record<string, unknown>;
}

export interface ShareResult {
  shareToken: string;
  shareUrl: string;
}
```

- [ ] **Step 3: Create food types**

Create `sarthi-app/types/food.types.ts`:

```typescript
export interface TasteProfile {
  spicy: number;
  salty: number;
  sweet: number;
  sour: number;
  umami: number;
}

export interface Dish {
  name: string;
  description: string;
  where: string;
  cost: string;
  spiceLevel: string;
  dietaryInfo?: string[];
  tasteProfile?: TasteProfile;
  allergyWarning?: string;
}

export interface StreetFoodItem {
  name: string;
  where: string;
  cost: string;
  safetyTip?: string;
}

export interface MealSuggestion {
  meal: string;
  dish: string;
  where: string;
  cost: string;
}

export interface MealPlanDay {
  day: number;
  meals: MealSuggestion[];
}

export interface FoodGuideData {
  overview: string;
  mustTryDishes: Dish[];
  streetFood: {
    safetyTips: string;
    items: StreetFoodItem[];
  };
  mealPlan: MealPlanDay[];
  dietaryInfo: {
    vegFriendly: string;
    veganOptions: string;
    halalOptions?: string;
    allergyNotes?: string;
  };
}
```

---

## Task 5: API Client & Service Layer

**Files:**
- Create: `sarthi-app/services/api.ts`
- Create: `sarthi-app/services/search.service.ts`
- Create: `sarthi-app/services/trips.service.ts`
- Create: `sarthi-app/services/shared.service.ts`

- [ ] **Step 1: Create base API client**

Create `sarthi-app/services/api.ts`:

```typescript
import auth from '@react-native-firebase/auth';
import { API_CONFIG } from '@/config/api';

export class ApiError extends Error {
  constructor(
    public status: number,
    public body: string,
  ) {
    super(`API Error ${status}: ${body}`);
    this.name = 'ApiError';
  }
}

async function getAuthHeader(): Promise<Record<string, string>> {
  const user = auth().currentUser;
  if (!user) return {};
  const token = await user.getIdToken();
  return { Authorization: `Bearer ${token}` };
}

export async function apiRequest<T>(
  path: string,
  options: RequestInit = {},
): Promise<T> {
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    ...(await getAuthHeader()),
    ...(options.headers as Record<string, string>),
  };

  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), API_CONFIG.timeout);

  try {
    const response = await fetch(`${API_CONFIG.baseUrl}${path}`, {
      ...options,
      headers,
      signal: controller.signal,
    });

    if (!response.ok) {
      throw new ApiError(response.status, await response.text());
    }

    // Handle 204 No Content
    if (response.status === 204) {
      return undefined as T;
    }

    return response.json();
  } finally {
    clearTimeout(timeout);
  }
}
```

- [ ] **Step 2: Create search service**

Create `sarthi-app/services/search.service.ts`:

```typescript
import { apiRequest } from './api';
import type { SearchDto, ItineraryDto, FoodGuideDto, SearchResponse } from '@/types/search.types';
import type { ItineraryData } from '@/types/trip.types';
import type { FoodGuideData } from '@/types/food.types';

export const searchService = {
  search: (dto: SearchDto) =>
    apiRequest<SearchResponse>('/destination-finder/search', {
      method: 'POST',
      body: JSON.stringify(dto),
    }),

  itinerary: (dto: ItineraryDto) =>
    apiRequest<ItineraryData>('/destination-finder/itinerary', {
      method: 'POST',
      body: JSON.stringify(dto),
    }),

  foodGuide: (dto: FoodGuideDto) =>
    apiRequest<FoodGuideData>('/destination-finder/food-guide', {
      method: 'POST',
      body: JSON.stringify(dto),
    }),
};
```

- [ ] **Step 3: Create trips service**

Create `sarthi-app/services/trips.service.ts`:

```typescript
import { apiRequest } from './api';
import type {
  SavedTrip,
  TripSummary,
  CreateTripDto,
  UpdateTripDto,
  ShareResult,
} from '@/types/trip.types';

export const tripsService = {
  list: () => apiRequest<TripSummary[]>('/saved-trips'),

  getById: (id: string) => apiRequest<SavedTrip>(`/saved-trips/${id}`),

  create: (dto: CreateTripDto) =>
    apiRequest<SavedTrip>('/saved-trips', {
      method: 'POST',
      body: JSON.stringify(dto),
    }),

  update: (id: string, dto: UpdateTripDto) =>
    apiRequest<SavedTrip>(`/saved-trips/${id}`, {
      method: 'PATCH',
      body: JSON.stringify(dto),
    }),

  remove: (id: string) =>
    apiRequest<void>(`/saved-trips/${id}`, { method: 'DELETE' }),

  enableSharing: (id: string) =>
    apiRequest<ShareResult>(`/saved-trips/${id}/share`, { method: 'POST' }),

  disableSharing: (id: string) =>
    apiRequest<void>(`/saved-trips/${id}/share`, { method: 'DELETE' }),
};
```

- [ ] **Step 4: Create shared trips service**

Create `sarthi-app/services/shared.service.ts`:

```typescript
import { apiRequest } from './api';
import type { SavedTrip } from '@/types/trip.types';

export const sharedService = {
  getByToken: (token: string) =>
    apiRequest<SavedTrip>(`/shared-trips/${token}`),
};
```

---

## Task 6: Zustand Stores

**Files:**
- Create: `sarthi-app/stores/auth.store.ts`
- Create: `sarthi-app/stores/search.store.ts`

- [ ] **Step 1: Create auth store**

Create `sarthi-app/stores/auth.store.ts`:

```typescript
import { create } from 'zustand';
import type { FirebaseAuthTypes } from '@react-native-firebase/auth';

interface AuthState {
  user: FirebaseAuthTypes.User | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  setUser: (user: FirebaseAuthTypes.User | null) => void;
  setLoading: (loading: boolean) => void;
}

export const useAuthStore = create<AuthState>((set) => ({
  user: null,
  isAuthenticated: false,
  isLoading: true,
  setUser: (user) =>
    set({
      user,
      isAuthenticated: !!user,
      isLoading: false,
    }),
  setLoading: (isLoading) => set({ isLoading }),
}));
```

- [ ] **Step 2: Create search store**

Create `sarthi-app/stores/search.store.ts`:

```typescript
import { create } from 'zustand';
import type { SearchDto } from '@/types/search.types';

type PartialSearchDto = Partial<SearchDto>;

interface SearchState {
  formValues: PartialSearchDto;
  setFormValues: (values: PartialSearchDto) => void;
  updateFormValues: (values: PartialSearchDto) => void;
  resetForm: () => void;
}

const initialFormValues: PartialSearchDto = {
  experienceTypes: [],
  group: { size: 2, type: 'friends' },
  hiddenGem: false,
};

export const useSearchStore = create<SearchState>((set) => ({
  formValues: initialFormValues,
  setFormValues: (formValues) => set({ formValues }),
  updateFormValues: (values) =>
    set((state) => ({
      formValues: { ...state.formValues, ...values },
    })),
  resetForm: () => set({ formValues: initialFormValues }),
}));
```

---

## Task 7: TanStack Query Hooks

**Files:**
- Create: `sarthi-app/hooks/useSearch.ts`
- Create: `sarthi-app/hooks/useTrips.ts`
- Create: `sarthi-app/hooks/useColorScheme.ts`

- [ ] **Step 1: Create search hooks**

Create `sarthi-app/hooks/useSearch.ts`:

```typescript
import { useMutation } from '@tanstack/react-query';
import { searchService } from '@/services/search.service';
import type { SearchDto, ItineraryDto, FoodGuideDto } from '@/types/search.types';

export function useSearchDestinations() {
  return useMutation({
    mutationFn: (dto: SearchDto) => searchService.search(dto),
  });
}

export function useGenerateItinerary() {
  return useMutation({
    mutationFn: (dto: ItineraryDto) => searchService.itinerary(dto),
  });
}

export function useGenerateFoodGuide() {
  return useMutation({
    mutationFn: (dto: FoodGuideDto) => searchService.foodGuide(dto),
  });
}
```

- [ ] **Step 2: Create trips hooks**

Create `sarthi-app/hooks/useTrips.ts`:

```typescript
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { tripsService } from '@/services/trips.service';
import type { CreateTripDto, UpdateTripDto } from '@/types/trip.types';

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
    enabled: !!id,
  });
}

export function useCreateTrip() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (dto: CreateTripDto) => tripsService.create(dto),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['trips'] });
    },
  });
}

export function useUpdateTrip(id: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (dto: UpdateTripDto) => tripsService.update(id, dto),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['trips'] });
      queryClient.invalidateQueries({ queryKey: ['trip', id] });
    },
  });
}

export function useDeleteTrip() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => tripsService.remove(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['trips'] });
    },
  });
}

export function useEnableSharing(id: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: () => tripsService.enableSharing(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['trip', id] });
    },
  });
}

export function useDisableSharing(id: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: () => tripsService.disableSharing(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['trip', id] });
    },
  });
}
```

- [ ] **Step 3: Create color scheme hook**

Create `sarthi-app/hooks/useColorScheme.ts`:

```typescript
import { useColorScheme as useNativeColorScheme } from 'react-native';

export function useColorScheme() {
  const colorScheme = useNativeColorScheme();
  return {
    colorScheme: colorScheme ?? 'light',
    isDark: colorScheme === 'dark',
  };
}
```

---

## Task 8: Auth Service

**Files:**
- Create: `sarthi-app/services/auth.service.ts`

- [ ] **Step 1: Create Firebase auth service**

Create `sarthi-app/services/auth.service.ts`:

```typescript
import auth, { FirebaseAuthTypes } from '@react-native-firebase/auth';
import { GoogleSignin } from '@react-native-google-signin/google-signin';

// Configure Google Sign-In — called once at app startup
export function configureGoogleSignIn() {
  GoogleSignin.configure({
    // Web client ID from Firebase Console → Authentication → Sign-in method → Google
    webClientId: 'YOUR_WEB_CLIENT_ID', // TODO: Replace with actual web client ID from Firebase Console
  });
}

export const authService = {
  // Phone OTP
  sendOtp: (phoneNumber: string): Promise<FirebaseAuthTypes.ConfirmationResult> => {
    return auth().signInWithPhoneNumber(phoneNumber);
  },

  verifyOtp: async (
    confirmation: FirebaseAuthTypes.ConfirmationResult,
    code: string,
  ): Promise<FirebaseAuthTypes.UserCredential> => {
    return confirmation.confirm(code);
  },

  // Google Sign-In
  signInWithGoogle: async (): Promise<FirebaseAuthTypes.UserCredential> => {
    await GoogleSignin.hasPlayServices({ showPlayServicesUpdateDialog: true });
    const response = await GoogleSignin.signIn();
    const idToken = response.data?.idToken;
    if (!idToken) {
      throw new Error('Google Sign-In failed: no ID token');
    }
    const googleCredential = auth.GoogleAuthProvider.credential(idToken);
    return auth().signInWithCredential(googleCredential);
  },

  // Email/Password
  signInWithEmail: (
    email: string,
    password: string,
  ): Promise<FirebaseAuthTypes.UserCredential> => {
    return auth().signInWithEmailAndPassword(email, password);
  },

  signUpWithEmail: (
    email: string,
    password: string,
  ): Promise<FirebaseAuthTypes.UserCredential> => {
    return auth().createUserWithEmailAndPassword(email, password);
  },

  // Sign out
  signOut: (): Promise<void> => {
    return auth().signOut();
  },

  // Delete account
  deleteAccount: async (): Promise<void> => {
    const user = auth().currentUser;
    if (user) {
      await user.delete();
    }
  },

  // Get current user
  getCurrentUser: (): FirebaseAuthTypes.User | null => {
    return auth().currentUser;
  },
};
```

---

## Task 9: Base UI Components

**Files:**
- Create: `sarthi-app/components/ui/Button.tsx`
- Create: `sarthi-app/components/ui/Card.tsx`
- Create: `sarthi-app/components/ui/Input.tsx`
- Create: `sarthi-app/components/ui/Badge.tsx`
- Create: `sarthi-app/components/ui/SkeletonCard.tsx`
- Create: `sarthi-app/components/ui/EmptyState.tsx`
- Create: `sarthi-app/components/ui/LoadingSpinner.tsx`

- [ ] **Step 1: Create Button component**

Create `sarthi-app/components/ui/Button.tsx`:

```tsx
import { TouchableOpacity, Text, ActivityIndicator, View } from 'react-native';
import { useTranslation } from 'react-i18next';

interface ButtonProps {
  title: string;
  onPress: () => void;
  variant?: 'primary' | 'secondary' | 'outline' | 'ghost';
  size?: 'sm' | 'md' | 'lg';
  loading?: boolean;
  disabled?: boolean;
  icon?: React.ReactNode;
  className?: string;
}

const variantStyles = {
  primary: 'bg-primary-500 active:bg-primary-600',
  secondary: 'bg-secondary-500 active:bg-secondary-600',
  outline: 'border border-border bg-transparent',
  ghost: 'bg-transparent',
} as const;

const variantTextStyles = {
  primary: 'text-white',
  secondary: 'text-white',
  outline: 'text-text-primary',
  ghost: 'text-primary-500',
} as const;

const sizeStyles = {
  sm: 'px-3 py-2',
  md: 'px-5 py-3',
  lg: 'px-6 py-4',
} as const;

const sizeTextStyles = {
  sm: 'text-sm',
  md: 'text-base',
  lg: 'text-lg',
} as const;

export function Button({
  title,
  onPress,
  variant = 'primary',
  size = 'md',
  loading = false,
  disabled = false,
  icon,
  className = '',
}: ButtonProps) {
  const isDisabled = disabled || loading;

  return (
    <TouchableOpacity
      onPress={onPress}
      disabled={isDisabled}
      className={`flex-row items-center justify-center rounded-button ${variantStyles[variant]} ${sizeStyles[size]} ${isDisabled ? 'opacity-50' : ''} ${className}`}
      activeOpacity={0.7}
    >
      {loading ? (
        <ActivityIndicator
          color={variant === 'outline' || variant === 'ghost' ? '#4F46E5' : '#fff'}
          size="small"
        />
      ) : (
        <View className="flex-row items-center gap-2">
          {icon}
          <Text
            className={`font-heading-semibold ${variantTextStyles[variant]} ${sizeTextStyles[size]}`}
          >
            {title}
          </Text>
        </View>
      )}
    </TouchableOpacity>
  );
}
```

- [ ] **Step 2: Create Card component**

Create `sarthi-app/components/ui/Card.tsx`:

```tsx
import { View } from 'react-native';

interface CardProps {
  children: React.ReactNode;
  className?: string;
}

export function Card({ children, className = '' }: CardProps) {
  return (
    <View
      className={`bg-white dark:bg-stone-800 rounded-card p-4 shadow-sm ${className}`}
    >
      {children}
    </View>
  );
}
```

- [ ] **Step 3: Create Input component**

Create `sarthi-app/components/ui/Input.tsx`:

```tsx
import { TextInput, View, Text } from 'react-native';
import { forwardRef } from 'react';

interface InputProps {
  placeholder?: string;
  value?: string;
  onChangeText?: (text: string) => void;
  label?: string;
  error?: string;
  multiline?: boolean;
  numberOfLines?: number;
  keyboardType?: 'default' | 'numeric' | 'phone-pad' | 'email-address';
  secureTextEntry?: boolean;
  className?: string;
  leftIcon?: React.ReactNode;
}

export const Input = forwardRef<TextInput, InputProps>(
  (
    {
      placeholder,
      value,
      onChangeText,
      label,
      error,
      multiline = false,
      numberOfLines = 1,
      keyboardType = 'default',
      secureTextEntry = false,
      className = '',
      leftIcon,
    },
    ref,
  ) => {
    return (
      <View className={className}>
        {label && (
          <Text className="font-body-medium text-sm text-text-secondary mb-1">
            {label}
          </Text>
        )}
        <View
          className={`flex-row items-center border rounded-input px-3 py-3 ${
            error ? 'border-danger' : 'border-border'
          } bg-white dark:bg-stone-800`}
        >
          {leftIcon && <View className="mr-2">{leftIcon}</View>}
          <TextInput
            ref={ref}
            placeholder={placeholder}
            placeholderTextColor="#A8A29E"
            value={value}
            onChangeText={onChangeText}
            multiline={multiline}
            numberOfLines={numberOfLines}
            keyboardType={keyboardType}
            secureTextEntry={secureTextEntry}
            className="flex-1 font-body-regular text-base text-text-primary dark:text-white"
          />
        </View>
        {error && (
          <Text className="font-body-regular text-sm text-danger mt-1">
            {error}
          </Text>
        )}
      </View>
    );
  },
);
```

- [ ] **Step 4: Create Badge component**

Create `sarthi-app/components/ui/Badge.tsx`:

```tsx
import { View, Text } from 'react-native';

interface BadgeProps {
  label: string;
  variant?: 'primary' | 'secondary' | 'accent' | 'gray' | 'danger' | 'warning';
  size?: 'sm' | 'md';
  icon?: React.ReactNode;
}

const variantColors = {
  primary: 'bg-primary-100 dark:bg-primary-700',
  secondary: 'bg-secondary-100',
  accent: 'bg-accent-100',
  gray: 'bg-stone-200 dark:bg-stone-700',
  danger: 'bg-red-100',
  warning: 'bg-amber-100',
} as const;

const variantTextColors = {
  primary: 'text-primary-600 dark:text-primary-50',
  secondary: 'text-secondary-600',
  accent: 'text-accent-600',
  gray: 'text-text-secondary',
  danger: 'text-danger',
  warning: 'text-warning',
} as const;

export function Badge({ label, variant = 'primary', size = 'sm', icon }: BadgeProps) {
  return (
    <View
      className={`flex-row items-center rounded-badge px-2 py-1 ${variantColors[variant]}`}
    >
      {icon && <View className="mr-1">{icon}</View>}
      <Text
        className={`font-body-medium ${size === 'sm' ? 'text-xs' : 'text-sm'} ${variantTextColors[variant]}`}
      >
        {label}
      </Text>
    </View>
  );
}
```

- [ ] **Step 5: Create SkeletonCard component**

Create `sarthi-app/components/ui/SkeletonCard.tsx`:

```tsx
import { View } from 'react-native';
import Animated, {
  useAnimatedStyle,
  useSharedValue,
  withRepeat,
  withTiming,
} from 'react-native-reanimated';
import { useEffect } from 'react';

interface SkeletonCardProps {
  lines?: number;
  className?: string;
}

function SkeletonBlock({ className = '' }: { className?: string }) {
  const opacity = useSharedValue(0.3);

  useEffect(() => {
    opacity.value = withRepeat(withTiming(1, { duration: 800 }), -1, true);
  }, []);

  const animatedStyle = useAnimatedStyle(() => ({
    opacity: opacity.value,
  }));

  return (
    <Animated.View
      style={animatedStyle}
      className={`bg-stone-200 dark:bg-stone-700 rounded ${className}`}
    />
  );
}

export function SkeletonCard({ lines = 3, className = '' }: SkeletonCardProps) {
  return (
    <View className={`bg-white dark:bg-stone-800 rounded-card p-4 shadow-sm ${className}`}>
      <SkeletonBlock className="h-5 w-3/4 mb-3" />
      <SkeletonBlock className="h-4 w-1/2 mb-2" />
      {Array.from({ length: lines }).map((_, i) => (
        <SkeletonBlock
          key={i}
          className={`h-3 mb-2 ${i === lines - 1 ? 'w-2/3' : 'w-full'}`}
        />
      ))}
    </View>
  );
}
```

- [ ] **Step 6: Create EmptyState component**

Create `sarthi-app/components/ui/EmptyState.tsx`:

```tsx
import { View, Text } from 'react-native';

interface EmptyStateProps {
  title: string;
  description?: string;
  illustration?: React.ReactNode;
  action?: React.ReactNode;
}

export function EmptyState({
  title,
  description,
  illustration,
  action,
}: EmptyStateProps) {
  return (
    <View className="flex-1 items-center justify-center px-8 py-12">
      {illustration && <View className="mb-6">{illustration}</View>}
      <Text className="font-heading-semibold text-lg text-text-primary dark:text-white text-center mb-2">
        {title}
      </Text>
      {description && (
        <Text className="font-body-regular text-base text-text-secondary text-center mb-6">
          {description}
        </Text>
      )}
      {action}
    </View>
  );
}
```

- [ ] **Step 7: Create LoadingSpinner component**

Create `sarthi-app/components/ui/LoadingSpinner.tsx`:

```tsx
import { View, Text, ActivityIndicator } from 'react-native';

interface LoadingSpinnerProps {
  message?: string;
  size?: 'small' | 'large';
}

export function LoadingSpinner({
  message,
  size = 'large',
}: LoadingSpinnerProps) {
  return (
    <View className="flex-1 items-center justify-center py-12">
      <ActivityIndicator size={size} color="#4F46E5" />
      {message && (
        <Text className="font-body-regular text-base text-text-secondary mt-4 text-center">
          {message}
        </Text>
      )}
    </View>
  );
}
```

---

## Task 10: Root Layout & Auth Guard

**Files:**
- Create: `sarthi-app/app/_layout.tsx`
- Create: `sarthi-app/app/index.tsx`

This is the backbone of the app — loads fonts, sets up providers (TanStack Query, i18n), and handles auth-based routing.

- [ ] **Step 1: Create root layout**

Create `sarthi-app/app/_layout.tsx`:

```tsx
import { useEffect } from 'react';
import { Slot, useRouter, useSegments } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import * as SplashScreen from 'expo-splash-screen';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import {
  useFonts,
  Inter_400Regular,
  Inter_500Medium,
  Inter_600SemiBold,
  Inter_700Bold,
} from '@expo-google-fonts/inter';
import auth from '@react-native-firebase/auth';
import { useAuthStore } from '@/stores/auth.store';
import { configureGoogleSignIn } from '@/services/auth.service';
import '@/services/i18n';
import '../../global.css';

SplashScreen.preventAutoHideAsync();

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      retry: 2,
      staleTime: 5 * 60 * 1000, // 5 minutes
    },
  },
});

function AuthGate({ children }: { children: React.ReactNode }) {
  const { isAuthenticated, isLoading, setUser } = useAuthStore();
  const segments = useSegments();
  const router = useRouter();

  // Listen to Firebase auth state
  useEffect(() => {
    const unsubscribe = auth().onAuthStateChanged((user) => {
      setUser(user);
    });
    return unsubscribe;
  }, [setUser]);

  // Redirect based on auth state
  useEffect(() => {
    if (isLoading) return;

    const inAuthGroup = segments[0] === '(auth)';
    const inSharedGroup = segments[0] === 'shared';

    // Allow shared trip viewing without auth
    if (inSharedGroup) return;

    if (!isAuthenticated && !inAuthGroup) {
      router.replace('/(auth)/welcome');
    } else if (isAuthenticated && inAuthGroup) {
      router.replace('/(tabs)/search');
    }
  }, [isAuthenticated, isLoading, segments]);

  return <>{children}</>;
}

export default function RootLayout() {
  const [fontsLoaded] = useFonts({
    Inter_400Regular,
    Inter_500Medium,
    Inter_600SemiBold,
    Inter_700Bold,
  });

  useEffect(() => {
    configureGoogleSignIn();
  }, []);

  useEffect(() => {
    if (fontsLoaded) {
      SplashScreen.hideAsync();
    }
  }, [fontsLoaded]);

  if (!fontsLoaded) return null;

  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <QueryClientProvider client={queryClient}>
        <AuthGate>
          <StatusBar style="auto" />
          <Slot />
        </AuthGate>
      </QueryClientProvider>
    </GestureHandlerRootView>
  );
}
```

- [ ] **Step 2: Create index redirect**

Create `sarthi-app/app/index.tsx`:

```tsx
import { Redirect } from 'expo-router';
import { useAuthStore } from '@/stores/auth.store';
import { LoadingSpinner } from '@/components/ui/LoadingSpinner';

export default function Index() {
  const { isAuthenticated, isLoading } = useAuthStore();

  if (isLoading) {
    return <LoadingSpinner />;
  }

  if (isAuthenticated) {
    return <Redirect href="/(tabs)/search" />;
  }

  return <Redirect href="/(auth)/welcome" />;
}
```

---

## Task 11: Auth Screens

**Files:**
- Create: `sarthi-app/app/(auth)/_layout.tsx`
- Create: `sarthi-app/app/(auth)/welcome.tsx`
- Create: `sarthi-app/app/(auth)/login.tsx`
- Create: `sarthi-app/app/(auth)/verify-otp.tsx`
- Create: `sarthi-app/components/auth/PhoneOTPForm.tsx`
- Create: `sarthi-app/components/auth/GoogleSignInButton.tsx`
- Create: `sarthi-app/components/auth/EmailPasswordForm.tsx`

- [ ] **Step 1: Create auth layout**

Create `sarthi-app/app/(auth)/_layout.tsx`:

```tsx
import { Stack } from 'expo-router';

export default function AuthLayout() {
  return (
    <Stack
      screenOptions={{
        headerShown: false,
        contentStyle: { backgroundColor: '#FAFAF8' },
      }}
    />
  );
}
```

- [ ] **Step 2: Create welcome screen**

Create `sarthi-app/app/(auth)/welcome.tsx`:

```tsx
import { View, Text, Dimensions } from 'react-native';
import { useRouter } from 'expo-router';
import { useTranslation } from 'react-i18next';
import { useState, useRef } from 'react';
import { FlatList } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Button } from '@/components/ui/Button';

const { width } = Dimensions.get('window');

interface Slide {
  key: string;
  titleKey: string;
  descKey: string;
  emoji: string; // Placeholder until SVG illustrations are added
}

const slides: Slide[] = [
  {
    key: '1',
    titleKey: 'auth.welcome.slide1Title',
    descKey: 'auth.welcome.slide1Desc',
    emoji: '🏔️',
  },
  {
    key: '2',
    titleKey: 'auth.welcome.slide2Title',
    descKey: 'auth.welcome.slide2Desc',
    emoji: '🚂',
  },
  {
    key: '3',
    titleKey: 'auth.welcome.slide3Title',
    descKey: 'auth.welcome.slide3Desc',
    emoji: '🏕️',
  },
];

export default function WelcomeScreen() {
  const { t } = useTranslation();
  const router = useRouter();
  const [activeIndex, setActiveIndex] = useState(0);
  const flatListRef = useRef<FlatList>(null);

  return (
    <SafeAreaView className="flex-1 bg-background">
      <View className="flex-1 justify-center">
        {/* Logo */}
        <Text className="font-heading-bold text-3xl text-primary-500 text-center mb-2">
          Sarthi
        </Text>
        <Text className="font-body-regular text-base text-text-secondary text-center mb-8">
          {t('auth.welcome.tagline')}
        </Text>

        {/* Slides */}
        <FlatList
          ref={flatListRef}
          data={slides}
          horizontal
          pagingEnabled
          showsHorizontalScrollIndicator={false}
          onMomentumScrollEnd={(e) => {
            const index = Math.round(e.nativeEvent.contentOffset.x / width);
            setActiveIndex(index);
          }}
          keyExtractor={(item) => item.key}
          renderItem={({ item }) => (
            <View style={{ width }} className="items-center px-8">
              {/* Placeholder for SVG illustration */}
              <Text className="text-7xl mb-6">{item.emoji}</Text>
              <Text className="font-heading-semibold text-xl text-text-primary text-center mb-2">
                {t(item.titleKey)}
              </Text>
              <Text className="font-body-regular text-base text-text-secondary text-center">
                {t(item.descKey)}
              </Text>
            </View>
          )}
        />

        {/* Dot indicators */}
        <View className="flex-row justify-center gap-2 mt-6">
          {slides.map((_, i) => (
            <View
              key={i}
              className={`h-2 rounded-full ${
                i === activeIndex
                  ? 'w-6 bg-primary-500'
                  : 'w-2 bg-stone-300'
              }`}
            />
          ))}
        </View>
      </View>

      {/* CTA */}
      <View className="px-6 pb-8">
        <Button
          title={t('auth.welcome.getStarted')}
          onPress={() => router.push('/(auth)/login')}
          size="lg"
        />
      </View>
    </SafeAreaView>
  );
}
```

- [ ] **Step 3: Create PhoneOTPForm component**

Create `sarthi-app/components/auth/PhoneOTPForm.tsx`:

```tsx
import { View, Text, TouchableOpacity, Alert } from 'react-native';
import { useRouter } from 'expo-router';
import { useTranslation } from 'react-i18next';
import { useState } from 'react';
import { Input } from '@/components/ui/Input';
import { Button } from '@/components/ui/Button';
import { authService } from '@/services/auth.service';
import { DEFAULT_REGION } from '@/config/locale';

export function PhoneOTPForm() {
  const { t } = useTranslation();
  const router = useRouter();
  const [phone, setPhone] = useState('');
  const [dialCode, setDialCode] = useState(DEFAULT_REGION.defaultDialCode);
  const [loading, setLoading] = useState(false);

  const handleSendOtp = async () => {
    if (phone.length < 10) {
      Alert.alert('Error', 'Please enter a valid phone number');
      return;
    }

    setLoading(true);
    try {
      const fullNumber = `${dialCode}${phone}`;
      const confirmation = await authService.sendOtp(fullNumber);
      router.push({
        pathname: '/(auth)/verify-otp',
        params: {
          phone: fullNumber,
          verificationId: confirmation.verificationId,
        },
      });
    } catch (error: any) {
      Alert.alert('Error', error.message || 'Failed to send OTP');
    } finally {
      setLoading(false);
    }
  };

  return (
    <View>
      <View className="flex-row items-end gap-2 mb-4">
        {/* Country code — simplified for now, full CountryPicker in later iteration */}
        <TouchableOpacity className="border border-border rounded-input px-3 py-3 bg-white dark:bg-stone-800">
          <Text className="font-body-regular text-base text-text-primary">
            🇮🇳 {dialCode}
          </Text>
        </TouchableOpacity>
        <View className="flex-1">
          <Input
            placeholder={t('auth.login.phonePlaceholder')}
            value={phone}
            onChangeText={setPhone}
            keyboardType="phone-pad"
          />
        </View>
      </View>
      <Button
        title={t('auth.login.sendOtp')}
        onPress={handleSendOtp}
        loading={loading}
        disabled={phone.length < 10}
        size="lg"
      />
    </View>
  );
}
```

- [ ] **Step 4: Create GoogleSignInButton component**

Create `sarthi-app/components/auth/GoogleSignInButton.tsx`:

```tsx
import { Alert } from 'react-native';
import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Button } from '@/components/ui/Button';
import { authService } from '@/services/auth.service';
import { Ionicons } from '@expo/vector-icons';

export function GoogleSignInButton() {
  const { t } = useTranslation();
  const [loading, setLoading] = useState(false);

  const handleGoogleSignIn = async () => {
    setLoading(true);
    try {
      await authService.signInWithGoogle();
      // Auth state listener in _layout.tsx handles navigation
    } catch (error: any) {
      if (error.code !== 'SIGN_IN_CANCELLED') {
        Alert.alert('Error', error.message || 'Google Sign-In failed');
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <Button
      title={t('auth.login.google')}
      onPress={handleGoogleSignIn}
      variant="outline"
      loading={loading}
      icon={<Ionicons name="logo-google" size={20} color="#4285F4" />}
      size="lg"
    />
  );
}
```

- [ ] **Step 5: Create EmailPasswordForm component**

Create `sarthi-app/components/auth/EmailPasswordForm.tsx`:

```tsx
import { View, Text, TouchableOpacity, Alert } from 'react-native';
import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Input } from '@/components/ui/Input';
import { Button } from '@/components/ui/Button';
import { authService } from '@/services/auth.service';
import { Ionicons } from '@expo/vector-icons';

export function EmailPasswordForm() {
  const { t } = useTranslation();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [isSignUp, setIsSignUp] = useState(false);
  const [loading, setLoading] = useState(false);

  const handleSubmit = async () => {
    if (!email || !password) {
      Alert.alert('Error', 'Please fill in all fields');
      return;
    }

    setLoading(true);
    try {
      if (isSignUp) {
        await authService.signUpWithEmail(email, password);
      } else {
        await authService.signInWithEmail(email, password);
      }
      // Auth state listener handles navigation
    } catch (error: any) {
      Alert.alert('Error', error.message || 'Authentication failed');
    } finally {
      setLoading(false);
    }
  };

  return (
    <View>
      <Input
        placeholder={t('auth.login.emailPlaceholder')}
        value={email}
        onChangeText={setEmail}
        keyboardType="email-address"
        className="mb-3"
        leftIcon={<Ionicons name="mail-outline" size={20} color="#A8A29E" />}
      />
      <Input
        placeholder={t('auth.login.passwordPlaceholder')}
        value={password}
        onChangeText={setPassword}
        secureTextEntry
        className="mb-4"
        leftIcon={<Ionicons name="lock-closed-outline" size={20} color="#A8A29E" />}
      />
      <Button
        title={isSignUp ? t('auth.login.signUp') : t('auth.login.signIn')}
        onPress={handleSubmit}
        loading={loading}
        variant="outline"
        size="lg"
        className="mb-2"
      />
      <TouchableOpacity onPress={() => setIsSignUp(!isSignUp)}>
        <Text className="font-body-regular text-sm text-primary-500 text-center">
          {isSignUp ? 'Already have an account? Sign In' : "Don't have an account? Sign Up"}
        </Text>
      </TouchableOpacity>
    </View>
  );
}
```

- [ ] **Step 6: Create login screen**

Create `sarthi-app/app/(auth)/login.tsx`:

```tsx
import { View, Text, ScrollView, KeyboardAvoidingView, Platform } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useTranslation } from 'react-i18next';
import { useState } from 'react';
import { PhoneOTPForm } from '@/components/auth/PhoneOTPForm';
import { GoogleSignInButton } from '@/components/auth/GoogleSignInButton';
import { EmailPasswordForm } from '@/components/auth/EmailPasswordForm';

type AuthMethod = 'phone' | 'email';

export default function LoginScreen() {
  const { t } = useTranslation();
  const [authMethod, setAuthMethod] = useState<AuthMethod>('phone');

  return (
    <SafeAreaView className="flex-1 bg-background">
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        className="flex-1"
      >
        <ScrollView
          contentContainerStyle={{ flexGrow: 1, justifyContent: 'center' }}
          keyboardShouldPersistTaps="handled"
          className="px-6"
        >
          {/* Logo */}
          <Text className="font-heading-bold text-3xl text-primary-500 text-center mb-2">
            Sarthi
          </Text>
          <Text className="font-body-regular text-base text-text-secondary text-center mb-10">
            {t('auth.login.title')}
          </Text>

          {/* Phone OTP — primary */}
          {authMethod === 'phone' && <PhoneOTPForm />}

          {/* Email form */}
          {authMethod === 'email' && <EmailPasswordForm />}

          {/* Divider */}
          <View className="flex-row items-center my-6">
            <View className="flex-1 h-px bg-border" />
            <Text className="font-body-regular text-sm text-text-tertiary mx-4">
              {t('auth.login.orContinueWith')}
            </Text>
            <View className="flex-1 h-px bg-border" />
          </View>

          {/* Alternative auth methods */}
          <View className="gap-3">
            <GoogleSignInButton />
            {authMethod === 'phone' ? (
              <View>
                <Text
                  className="font-body-medium text-sm text-primary-500 text-center"
                  onPress={() => setAuthMethod('email')}
                >
                  {t('auth.login.email')}
                </Text>
              </View>
            ) : (
              <Text
                className="font-body-medium text-sm text-primary-500 text-center"
                onPress={() => setAuthMethod('phone')}
              >
                Use phone number instead
              </Text>
            )}
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}
```

- [ ] **Step 7: Create OTP verification screen**

Create `sarthi-app/app/(auth)/verify-otp.tsx`:

```tsx
import { View, Text, Alert } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useTranslation } from 'react-i18next';
import { useState, useEffect, useRef } from 'react';
import { TextInput } from 'react-native';
import { Button } from '@/components/ui/Button';
import auth from '@react-native-firebase/auth';

const OTP_LENGTH = 6;
const RESEND_TIMEOUT = 30;

export default function VerifyOTPScreen() {
  const { t } = useTranslation();
  const router = useRouter();
  const { phone, verificationId } = useLocalSearchParams<{
    phone: string;
    verificationId: string;
  }>();

  const [otp, setOtp] = useState<string[]>(Array(OTP_LENGTH).fill(''));
  const [loading, setLoading] = useState(false);
  const [resendTimer, setResendTimer] = useState(RESEND_TIMEOUT);
  const inputRefs = useRef<(TextInput | null)[]>([]);

  // Resend countdown
  useEffect(() => {
    if (resendTimer <= 0) return;
    const interval = setInterval(() => {
      setResendTimer((prev) => prev - 1);
    }, 1000);
    return () => clearInterval(interval);
  }, [resendTimer]);

  const handleOtpChange = (value: string, index: number) => {
    const newOtp = [...otp];
    newOtp[index] = value;
    setOtp(newOtp);

    // Auto-advance to next input
    if (value && index < OTP_LENGTH - 1) {
      inputRefs.current[index + 1]?.focus();
    }

    // Auto-submit on last digit
    if (index === OTP_LENGTH - 1 && value) {
      const code = newOtp.join('');
      if (code.length === OTP_LENGTH) {
        handleVerify(code);
      }
    }
  };

  const handleKeyPress = (key: string, index: number) => {
    if (key === 'Backspace' && !otp[index] && index > 0) {
      inputRefs.current[index - 1]?.focus();
    }
  };

  const handleVerify = async (code: string) => {
    setLoading(true);
    try {
      const credential = auth.PhoneAuthProvider.credential(
        verificationId,
        code,
      );
      await auth().signInWithCredential(credential);
      // Auth state listener handles navigation
    } catch (error: any) {
      Alert.alert('Error', 'Invalid OTP. Please try again.');
      setOtp(Array(OTP_LENGTH).fill(''));
      inputRefs.current[0]?.focus();
    } finally {
      setLoading(false);
    }
  };

  const maskPhone = phone
    ? phone.slice(0, -4).replace(/./g, '•') + phone.slice(-4)
    : '';

  return (
    <SafeAreaView className="flex-1 bg-background px-6">
      <View className="flex-1 justify-center">
        <Text className="font-heading-bold text-2xl text-text-primary text-center mb-2">
          {t('auth.otp.title')}
        </Text>
        <Text className="font-body-regular text-base text-text-secondary text-center mb-8">
          {t('auth.otp.sentTo', { phone: maskPhone })}
        </Text>

        {/* OTP inputs */}
        <View className="flex-row justify-center gap-3 mb-8">
          {Array.from({ length: OTP_LENGTH }).map((_, i) => (
            <TextInput
              key={i}
              ref={(ref) => { inputRefs.current[i] = ref; }}
              value={otp[i]}
              onChangeText={(value) => handleOtpChange(value.slice(-1), i)}
              onKeyPress={({ nativeEvent }) => handleKeyPress(nativeEvent.key, i)}
              keyboardType="number-pad"
              maxLength={1}
              className="w-12 h-14 border border-border rounded-input text-center font-heading-semibold text-xl text-text-primary bg-white dark:bg-stone-800"
              autoFocus={i === 0}
            />
          ))}
        </View>

        {loading && (
          <Text className="font-body-regular text-sm text-text-secondary text-center mb-4">
            Verifying...
          </Text>
        )}

        {/* Resend */}
        {resendTimer > 0 ? (
          <Text className="font-body-regular text-sm text-text-tertiary text-center">
            {t('auth.otp.resendIn', { seconds: resendTimer })}
          </Text>
        ) : (
          <Text
            className="font-body-medium text-sm text-primary-500 text-center"
            onPress={() => {
              setResendTimer(RESEND_TIMEOUT);
              // Re-send OTP
              router.back();
            }}
          >
            {t('auth.otp.resend')}
          </Text>
        )}
      </View>
    </SafeAreaView>
  );
}
```

---

## Task 12: Tab Layout & Navigation

**Files:**
- Create: `sarthi-app/app/(tabs)/_layout.tsx`

- [ ] **Step 1: Create tab layout with custom tab bar**

Create `sarthi-app/app/(tabs)/_layout.tsx`:

```tsx
import { Tabs } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useTranslation } from 'react-i18next';
import { useColorScheme } from '@/hooks/useColorScheme';
import { colors } from '@/constants/colors';

export default function TabLayout() {
  const { t } = useTranslation();
  const { isDark } = useColorScheme();

  return (
    <Tabs
      screenOptions={{
        tabBarActiveTintColor: colors.primary[500],
        tabBarInactiveTintColor: isDark ? '#78716C' : '#A8A29E',
        tabBarStyle: {
          backgroundColor: isDark ? '#1C1917' : '#FAFAF8',
          borderTopColor: isDark ? '#44403C' : '#E7E5E4',
        },
        tabBarLabelStyle: {
          fontFamily: 'Inter_500Medium',
          fontSize: 12,
        },
        headerStyle: {
          backgroundColor: isDark ? '#1C1917' : '#FAFAF8',
        },
        headerTitleStyle: {
          fontFamily: 'Inter_600SemiBold',
          color: isDark ? '#FAFAF8' : '#1C1917',
        },
        headerShadowVisible: false,
      }}
    >
      <Tabs.Screen
        name="search"
        options={{
          title: t('search.title'),
          headerShown: false,
          tabBarIcon: ({ color, size }) => (
            <Ionicons name="compass-outline" size={size} color={color} />
          ),
        }}
      />
      <Tabs.Screen
        name="trips"
        options={{
          title: t('trips.title'),
          headerShown: false,
          tabBarIcon: ({ color, size }) => (
            <Ionicons name="bookmark-outline" size={size} color={color} />
          ),
        }}
      />
      <Tabs.Screen
        name="profile"
        options={{
          title: t('profile.title'),
          headerShown: false,
          tabBarIcon: ({ color, size }) => (
            <Ionicons name="person-outline" size={size} color={color} />
          ),
        }}
      />
    </Tabs>
  );
}
```

---

## Task 13: Search Screen & Components

**Files:**
- Create: `sarthi-app/app/(tabs)/search/index.tsx`
- Create: `sarthi-app/app/(tabs)/search/results.tsx`
- Create: `sarthi-app/components/search/SearchForm.tsx`
- Create: `sarthi-app/components/search/FilterChips.tsx`
- Create: `sarthi-app/components/search/DestinationCard.tsx`
- Create: `sarthi-app/components/search/TrekCard.tsx`
- Create: `sarthi-app/components/search/HealthProfileForm.tsx`

- [ ] **Step 1: Create FilterChips component**

Create `sarthi-app/components/search/FilterChips.tsx`:

```tsx
import { ScrollView, TouchableOpacity, Text } from 'react-native';
import { useTranslation } from 'react-i18next';
import { Ionicons } from '@expo/vector-icons';
import { colors } from '@/constants/colors';

const EXPERIENCE_TYPES = [
  { key: 'nature', icon: 'leaf-outline' },
  { key: 'adventure', icon: 'trail-sign-outline' },
  { key: 'food', icon: 'restaurant-outline' },
  { key: 'culture', icon: 'library-outline' },
  { key: 'spiritual', icon: 'flower-outline' },
  { key: 'photography', icon: 'camera-outline' },
  { key: 'nightlife', icon: 'moon-outline' },
  { key: 'shopping', icon: 'bag-outline' },
  { key: 'relaxation', icon: 'water-outline' },
] as const;

interface FilterChipsProps {
  selected: string[];
  onToggle: (type: string) => void;
}

export function FilterChips({ selected, onToggle }: FilterChipsProps) {
  const { t } = useTranslation();

  return (
    <ScrollView horizontal showsHorizontalScrollIndicator={false} className="gap-2">
      <View className="flex-row gap-2">
        {EXPERIENCE_TYPES.map(({ key, icon }) => {
          const isSelected = selected.includes(key);
          return (
            <TouchableOpacity
              key={key}
              onPress={() => onToggle(key)}
              className={`flex-row items-center px-3 py-2 rounded-badge border ${
                isSelected
                  ? 'bg-primary-500 border-primary-500'
                  : 'bg-white border-border dark:bg-stone-800 dark:border-stone-600'
              }`}
            >
              <Ionicons
                name={icon as any}
                size={16}
                color={isSelected ? '#fff' : colors.text.secondary}
              />
              <Text
                className={`font-body-medium text-sm ml-1 ${
                  isSelected ? 'text-white' : 'text-text-primary dark:text-white'
                }`}
              >
                {t(`search.experienceTypes.${key}`)}
              </Text>
            </TouchableOpacity>
          );
        })}
      </View>
    </ScrollView>
  );
}

import { View } from 'react-native';
```

**Note:** The import for `View` is at the bottom — move it to the top during implementation. This was a formatting artifact.

- [ ] **Step 2: Create HealthProfileForm component**

Create `sarthi-app/components/search/HealthProfileForm.tsx`:

```tsx
import { View, Text, TouchableOpacity } from 'react-native';
import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Input } from '@/components/ui/Input';
import { Ionicons } from '@expo/vector-icons';

interface HealthProfileFormProps {
  values: {
    gender?: string;
    age?: number;
    weight?: number;
    height?: number;
    medicalConditions?: string[];
  };
  onChange: (values: HealthProfileFormProps['values']) => void;
}

export function HealthProfileForm({ values, onChange }: HealthProfileFormProps) {
  const { t } = useTranslation();
  const [expanded, setExpanded] = useState(false);

  return (
    <View>
      <TouchableOpacity
        onPress={() => setExpanded(!expanded)}
        className="flex-row items-center py-2"
      >
        <Ionicons
          name={expanded ? 'chevron-down' : 'add'}
          size={20}
          color="#4F46E5"
        />
        <Text className="font-body-medium text-sm text-primary-500 ml-1">
          {t('search.healthProfile')}
        </Text>
      </TouchableOpacity>

      {expanded && (
        <View className="gap-3 mt-2">
          <View className="flex-row gap-3">
            <Input
              label="Age"
              placeholder="25"
              value={values.age?.toString() ?? ''}
              onChangeText={(v) => onChange({ ...values, age: parseInt(v) || undefined })}
              keyboardType="numeric"
              className="flex-1"
            />
            <Input
              label="Weight (kg)"
              placeholder="70"
              value={values.weight?.toString() ?? ''}
              onChangeText={(v) => onChange({ ...values, weight: parseInt(v) || undefined })}
              keyboardType="numeric"
              className="flex-1"
            />
          </View>
          <Input
            label="Height (cm)"
            placeholder="170"
            value={values.height?.toString() ?? ''}
            onChangeText={(v) => onChange({ ...values, height: parseInt(v) || undefined })}
            keyboardType="numeric"
          />
          <Input
            label="Medical conditions (comma-separated)"
            placeholder="asthma, knee pain"
            value={values.medicalConditions?.join(', ') ?? ''}
            onChangeText={(v) =>
              onChange({
                ...values,
                medicalConditions: v
                  .split(',')
                  .map((s) => s.trim())
                  .filter(Boolean),
              })
            }
          />
        </View>
      )}
    </View>
  );
}
```

- [ ] **Step 3: Create SearchForm component**

Create `sarthi-app/components/search/SearchForm.tsx`:

```tsx
import { View, Text, Switch } from 'react-native';
import { useTranslation } from 'react-i18next';
import { Input } from '@/components/ui/Input';
import { Button } from '@/components/ui/Button';
import { FilterChips } from './FilterChips';
import { HealthProfileForm } from './HealthProfileForm';
import { useSearchStore } from '@/stores/search.store';
import { formatCurrency } from '@/config/locale';

interface SearchFormProps {
  onSubmit: () => void;
  loading: boolean;
}

export function SearchForm({ onSubmit, loading }: SearchFormProps) {
  const { t } = useTranslation();
  const { formValues, updateFormValues } = useSearchStore();

  const toggleExperience = (type: string) => {
    const current = formValues.experienceTypes ?? [];
    const updated = current.includes(type)
      ? current.filter((t) => t !== type)
      : [...current, type];
    updateFormValues({ experienceTypes: updated });
  };

  return (
    <View className="gap-4">
      {/* Free text */}
      <Input
        placeholder={t('search.placeholder')}
        value={formValues.freeText ?? ''}
        onChangeText={(v) => updateFormValues({ freeText: v })}
        multiline
        numberOfLines={3}
      />

      {/* Dates */}
      <View className="flex-row gap-3">
        <Input
          label={t('search.from')}
          placeholder="2026-05-15"
          value={formValues.dates?.from ?? ''}
          onChangeText={(v) =>
            updateFormValues({
              dates: { from: v, to: formValues.dates?.to ?? '' },
            })
          }
          className="flex-1"
        />
        <Input
          label={t('search.to')}
          placeholder="2026-05-20"
          value={formValues.dates?.to ?? ''}
          onChangeText={(v) =>
            updateFormValues({
              dates: { from: formValues.dates?.from ?? '', to: v },
            })
          }
          className="flex-1"
        />
      </View>

      {/* Departure city */}
      <Input
        label={t('search.departureCity')}
        placeholder="Delhi"
        value={formValues.departureCity ?? ''}
        onChangeText={(v) => updateFormValues({ departureCity: v })}
      />

      {/* Group */}
      <View className="flex-row gap-3">
        <Input
          label={t('search.groupSize')}
          placeholder="2"
          value={formValues.group?.size?.toString() ?? ''}
          onChangeText={(v) =>
            updateFormValues({
              group: {
                size: parseInt(v) || 2,
                type: formValues.group?.type ?? 'friends',
              },
            })
          }
          keyboardType="numeric"
          className="flex-1"
        />
        <Input
          label={t('search.groupType')}
          placeholder="friends"
          value={formValues.group?.type ?? ''}
          onChangeText={(v) =>
            updateFormValues({
              group: {
                size: formValues.group?.size ?? 2,
                type: v as any,
              },
            })
          }
          className="flex-1"
        />
      </View>

      {/* Budget */}
      <View className="flex-row gap-3">
        <Input
          label={`${t('search.budget')} (min)`}
          placeholder="5000"
          value={formValues.budget?.min?.toString() ?? ''}
          onChangeText={(v) =>
            updateFormValues({
              budget: {
                min: parseInt(v) || 0,
                max: formValues.budget?.max ?? 20000,
              },
            })
          }
          keyboardType="numeric"
          className="flex-1"
        />
        <Input
          label={`${t('search.budget')} (max)`}
          placeholder="15000"
          value={formValues.budget?.max?.toString() ?? ''}
          onChangeText={(v) =>
            updateFormValues({
              budget: {
                min: formValues.budget?.min ?? 5000,
                max: parseInt(v) || 20000,
              },
            })
          }
          keyboardType="numeric"
          className="flex-1"
        />
      </View>

      {/* Experience types */}
      <View>
        <Text className="font-body-medium text-sm text-text-secondary mb-2">
          {t('search.experience')}
        </Text>
        <FilterChips
          selected={formValues.experienceTypes ?? []}
          onToggle={toggleExperience}
        />
      </View>

      {/* Hidden gems toggle */}
      <View className="flex-row items-center justify-between">
        <Text className="font-body-medium text-base text-text-primary dark:text-white">
          {t('search.hiddenGems')}
        </Text>
        <Switch
          value={formValues.hiddenGem ?? false}
          onValueChange={(v) => updateFormValues({ hiddenGem: v })}
          trackColor={{ true: '#4F46E5', false: '#E7E5E4' }}
          thumbColor="#fff"
        />
      </View>

      {/* Health profile (expandable) */}
      <HealthProfileForm
        values={{
          gender: formValues.gender,
          age: formValues.age,
          weight: formValues.weight,
          height: formValues.height,
          medicalConditions: formValues.medicalConditions,
        }}
        onChange={(healthValues) => updateFormValues(healthValues)}
      />

      {/* Submit */}
      <Button
        title={t('search.findDestinations')}
        onPress={onSubmit}
        loading={loading}
        size="lg"
      />
    </View>
  );
}
```

- [ ] **Step 4: Create DestinationCard component**

Create `sarthi-app/components/search/DestinationCard.tsx`:

```tsx
import { View, Text, TouchableOpacity } from 'react-native';
import { useTranslation } from 'react-i18next';
import { Ionicons } from '@expo/vector-icons';
import { Card } from '@/components/ui/Card';
import { Badge } from '@/components/ui/Badge';
import { Button } from '@/components/ui/Button';
import type { SearchResultDestination } from '@/types/search.types';

interface DestinationCardProps {
  destination: SearchResultDestination;
  onGetItinerary: () => void;
  onGetFoodGuide: () => void;
}

export function DestinationCard({
  destination,
  onGetItinerary,
  onGetFoodGuide,
}: DestinationCardProps) {
  const { t } = useTranslation();

  return (
    <Card className="mb-3">
      {/* Header */}
      <View className="flex-row items-start justify-between mb-2">
        <View className="flex-1">
          <Text className="font-heading-semibold text-lg text-text-primary dark:text-white">
            {destination.name}, {destination.state}
          </Text>
          <Text className="font-body-regular text-sm text-text-secondary mt-1">
            {destination.whyItMatches}
          </Text>
        </View>
      </View>

      {/* Details row */}
      <View className="flex-row flex-wrap gap-3 mb-3">
        <View className="flex-row items-center">
          <Ionicons name="cash-outline" size={16} color="#78716C" />
          <Text className="font-body-regular text-sm text-text-secondary ml-1">
            {destination.budgetEstimate}
          </Text>
        </View>
        <View className="flex-row items-center">
          <Ionicons name="partly-sunny-outline" size={16} color="#78716C" />
          <Text className="font-body-regular text-sm text-text-secondary ml-1">
            {destination.weatherNow}
          </Text>
        </View>
        <View className="flex-row items-center">
          <Ionicons name="time-outline" size={16} color="#78716C" />
          <Text className="font-body-regular text-sm text-text-secondary ml-1">
            {destination.travelTime}
          </Text>
        </View>
      </View>

      {/* Health + Readiness badges */}
      <View className="flex-row gap-2 mb-3">
        {destination.isHiddenGem && (
          <Badge label="Hidden Gem" variant="secondary" />
        )}
        <Badge
          label={`Ready: ${destination.tripReadiness.score}/100`}
          variant="accent"
        />
        <Badge
          label={destination.healthAdvisory.suitability}
          variant="primary"
        />
      </View>

      {/* Action buttons */}
      <View className="flex-row gap-2">
        <Button
          title={t('search.getItinerary')}
          onPress={onGetItinerary}
          size="sm"
          className="flex-1"
        />
        <Button
          title={t('search.getFoodGuide')}
          onPress={onGetFoodGuide}
          variant="outline"
          size="sm"
          className="flex-1"
        />
      </View>
    </Card>
  );
}
```

- [ ] **Step 5: Create TrekCard component**

Create `sarthi-app/components/search/TrekCard.tsx`:

```tsx
import { View, Text } from 'react-native';
import { Card } from '@/components/ui/Card';
import { Badge } from '@/components/ui/Badge';
import { Ionicons } from '@expo/vector-icons';
import type { TrekResult } from '@/types/search.types';

interface TrekCardProps {
  trek: TrekResult;
}

export function TrekCard({ trek }: TrekCardProps) {
  return (
    <Card className="mb-3">
      <Text className="font-heading-semibold text-lg text-text-primary dark:text-white mb-1">
        {trek.name}
      </Text>
      <Text className="font-body-regular text-sm text-text-secondary mb-2">
        {trek.region}, {trek.state}
      </Text>
      <Text className="font-body-regular text-sm text-text-secondary mb-3">
        {trek.whyItMatches}
      </Text>

      <View className="flex-row flex-wrap gap-3 mb-3">
        <View className="flex-row items-center">
          <Ionicons name="trending-up-outline" size={16} color="#78716C" />
          <Text className="font-body-regular text-sm text-text-secondary ml-1">
            {trek.altitude}
          </Text>
        </View>
        <View className="flex-row items-center">
          <Ionicons name="speedometer-outline" size={16} color="#78716C" />
          <Text className="font-body-regular text-sm text-text-secondary ml-1">
            {trek.difficulty}
          </Text>
        </View>
        <View className="flex-row items-center">
          <Ionicons name="time-outline" size={16} color="#78716C" />
          <Text className="font-body-regular text-sm text-text-secondary ml-1">
            {trek.duration}
          </Text>
        </View>
      </View>

      <View className="flex-row gap-2">
        <Badge label={trek.terrain} variant="primary" />
        <Badge label={trek.healthAdvisory.suitability} variant="accent" />
      </View>
    </Card>
  );
}
```

- [ ] **Step 6: Create search screen**

Create `sarthi-app/app/(tabs)/search/index.tsx`:

```tsx
import { ScrollView } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { SearchForm } from '@/components/search/SearchForm';
import { useSearchDestinations } from '@/hooks/useSearch';
import { useSearchStore } from '@/stores/search.store';
import type { SearchDto } from '@/types/search.types';

export default function SearchScreen() {
  const router = useRouter();
  const { formValues } = useSearchStore();
  const searchMutation = useSearchDestinations();

  const handleSearch = () => {
    const dto = formValues as SearchDto;
    searchMutation.mutate(dto, {
      onSuccess: () => {
        router.push('/(tabs)/search/results');
      },
    });
  };

  return (
    <SafeAreaView className="flex-1 bg-background">
      <ScrollView
        className="flex-1 px-4 pt-4"
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
      >
        <SearchForm onSubmit={handleSearch} loading={searchMutation.isPending} />
      </ScrollView>
    </SafeAreaView>
  );
}
```

- [ ] **Step 7: Create search results screen**

Create `sarthi-app/app/(tabs)/search/results.tsx`:

```tsx
import { View, Text, FlatList } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Stack, useRouter } from 'expo-router';
import { useTranslation } from 'react-i18next';
import { DestinationCard } from '@/components/search/DestinationCard';
import { TrekCard } from '@/components/search/TrekCard';
import { EmptyState } from '@/components/ui/EmptyState';
import { LoadingSpinner } from '@/components/ui/LoadingSpinner';
import { useSearchDestinations } from '@/hooks/useSearch';
import { useSearchStore } from '@/stores/search.store';

export default function SearchResultsScreen() {
  const { t } = useTranslation();
  const router = useRouter();
  const { formValues } = useSearchStore();
  const searchMutation = useSearchDestinations();
  const data = searchMutation.data;

  if (searchMutation.isPending) {
    return <LoadingSpinner message={t('search.sarthiThinking')} />;
  }

  if (!data) {
    return (
      <EmptyState
        title={t('search.noResults')}
      />
    );
  }

  const isTrekMode = data.isTrekMode;
  const items = isTrekMode ? (data.treks ?? []) : (data.destinations ?? []);

  return (
    <SafeAreaView className="flex-1 bg-background">
      <Stack.Screen
        options={{
          headerShown: true,
          title: t('search.results', { count: items.length }),
        }}
      />
      <FlatList
        data={items}
        keyExtractor={(_, index) => index.toString()}
        contentContainerStyle={{ padding: 16 }}
        renderItem={({ item }) =>
          isTrekMode ? (
            <TrekCard trek={item as any} />
          ) : (
            <DestinationCard
              destination={item as any}
              onGetItinerary={() => {
                router.push({
                  pathname: '/itinerary/new',
                  params: {
                    destination: (item as any).name,
                    state: (item as any).state,
                  },
                });
              }}
              onGetFoodGuide={() => {
                router.push({
                  pathname: '/food-guide/new',
                  params: {
                    destination: (item as any).name,
                    state: (item as any).state,
                  },
                });
              }}
            />
          )
        }
        ListEmptyComponent={
          <EmptyState title={t('search.noResults')} />
        }
      />
    </SafeAreaView>
  );
}
```

---

## Task 14: Itinerary & Food Guide Generation Screens

**Files:**
- Create: `sarthi-app/app/itinerary/new.tsx`
- Create: `sarthi-app/app/food-guide/new.tsx`

These screens trigger itinerary/food-guide generation from search results, then navigate to the saved trip view.

- [ ] **Step 1: Create itinerary generation screen**

Create `sarthi-app/app/itinerary/new.tsx`:

```tsx
import { View, Text, Alert } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Stack, useLocalSearchParams, useRouter } from 'expo-router';
import { useTranslation } from 'react-i18next';
import { LoadingSpinner } from '@/components/ui/LoadingSpinner';
import { Button } from '@/components/ui/Button';
import { useGenerateItinerary } from '@/hooks/useSearch';
import { useCreateTrip } from '@/hooks/useTrips';
import { useSearchStore } from '@/stores/search.store';
import { useEffect } from 'react';

export default function NewItineraryScreen() {
  const { t } = useTranslation();
  const router = useRouter();
  const { destination, state } = useLocalSearchParams<{
    destination: string;
    state: string;
  }>();
  const { formValues } = useSearchStore();

  const itineraryMutation = useGenerateItinerary();
  const createTripMutation = useCreateTrip();

  // Auto-generate on mount
  useEffect(() => {
    if (!itineraryMutation.data && !itineraryMutation.isPending) {
      itineraryMutation.mutate({
        destination: destination ?? '',
        state: state ?? '',
        dates: formValues.dates ?? { from: '', to: '' },
        budget: formValues.budget ?? { min: 5000, max: 15000 },
        group: formValues.group ?? { size: 2, type: 'friends' },
        departureCity: formValues.departureCity ?? '',
        freeText: formValues.freeText ?? '',
        gender: formValues.gender,
        age: formValues.age,
        weight: formValues.weight,
        height: formValues.height,
        medicalConditions: formValues.medicalConditions,
      });
    }
  }, []);

  const handleSave = () => {
    if (!itineraryMutation.data) return;

    createTripMutation.mutate(
      {
        destination: destination ?? '',
        state: state ?? '',
        dates: formValues.dates ?? { from: '', to: '' },
        destinationData: {},
        name: `${destination} Trip`,
        itineraryData: itineraryMutation.data as any,
      },
      {
        onSuccess: (trip) => {
          router.replace(`/trip/${trip.id}`);
        },
        onError: (error) => {
          Alert.alert('Error', 'Failed to save trip');
        },
      },
    );
  };

  if (itineraryMutation.isPending) {
    return (
      <SafeAreaView className="flex-1 bg-background">
        <Stack.Screen options={{ title: destination ?? '' }} />
        <LoadingSpinner message={t('search.sarthiThinking')} />
      </SafeAreaView>
    );
  }

  if (itineraryMutation.isError) {
    return (
      <SafeAreaView className="flex-1 bg-background items-center justify-center px-6">
        <Stack.Screen options={{ title: destination ?? '' }} />
        <Text className="font-body-regular text-base text-danger text-center mb-4">
          {t('common.error')}
        </Text>
        <Button title={t('common.retry')} onPress={() => itineraryMutation.reset()} />
      </SafeAreaView>
    );
  }

  // Show generated itinerary with save button
  return (
    <SafeAreaView className="flex-1 bg-background">
      <Stack.Screen options={{ title: `${destination} ${t('trips.itinerary')}` }} />
      <View className="flex-1 items-center justify-center px-6">
        <Text className="font-heading-semibold text-xl text-text-primary mb-4">
          Itinerary generated!
        </Text>
        <Text className="font-body-regular text-base text-text-secondary text-center mb-8">
          {(itineraryMutation.data as any)?.days?.length ?? 0} days planned for {destination}
        </Text>
        <Button
          title={t('common.save')}
          onPress={handleSave}
          loading={createTripMutation.isPending}
          size="lg"
        />
      </View>
    </SafeAreaView>
  );
}
```

- [ ] **Step 2: Create food guide generation screen**

Create `sarthi-app/app/food-guide/new.tsx`:

```tsx
import { View, Text, Alert } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Stack, useLocalSearchParams, useRouter } from 'expo-router';
import { useTranslation } from 'react-i18next';
import { LoadingSpinner } from '@/components/ui/LoadingSpinner';
import { Button } from '@/components/ui/Button';
import { useGenerateFoodGuide } from '@/hooks/useSearch';
import { useCreateTrip } from '@/hooks/useTrips';
import { useSearchStore } from '@/stores/search.store';
import { useEffect } from 'react';

export default function NewFoodGuideScreen() {
  const { t } = useTranslation();
  const router = useRouter();
  const { destination, state } = useLocalSearchParams<{
    destination: string;
    state: string;
  }>();
  const { formValues } = useSearchStore();

  const foodGuideMutation = useGenerateFoodGuide();
  const createTripMutation = useCreateTrip();

  useEffect(() => {
    if (!foodGuideMutation.data && !foodGuideMutation.isPending) {
      foodGuideMutation.mutate({
        destination: destination ?? '',
        state: state ?? '',
        dates: formValues.dates ?? { from: '', to: '' },
        group: formValues.group ?? { size: 2, type: 'friends' },
        departureCity: formValues.departureCity ?? '',
        freeText: formValues.freeText ?? '',
        dietType: formValues.dietType,
        spiceTolerance: formValues.spiceTolerance,
        foodBudget: formValues.foodBudget,
        allergies: formValues.allergies,
      });
    }
  }, []);

  const handleSave = () => {
    if (!foodGuideMutation.data) return;

    createTripMutation.mutate(
      {
        destination: destination ?? '',
        state: state ?? '',
        dates: formValues.dates ?? { from: '', to: '' },
        destinationData: {},
        name: `${destination} Trip`,
        foodGuideData: foodGuideMutation.data as any,
      },
      {
        onSuccess: (trip) => {
          router.replace(`/trip/${trip.id}`);
        },
        onError: () => {
          Alert.alert('Error', 'Failed to save trip');
        },
      },
    );
  };

  if (foodGuideMutation.isPending) {
    return (
      <SafeAreaView className="flex-1 bg-background">
        <Stack.Screen options={{ title: destination ?? '' }} />
        <LoadingSpinner message={t('search.sarthiThinking')} />
      </SafeAreaView>
    );
  }

  if (foodGuideMutation.isError) {
    return (
      <SafeAreaView className="flex-1 bg-background items-center justify-center px-6">
        <Stack.Screen options={{ title: destination ?? '' }} />
        <Text className="font-body-regular text-base text-danger text-center mb-4">
          {t('common.error')}
        </Text>
        <Button title={t('common.retry')} onPress={() => foodGuideMutation.reset()} />
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView className="flex-1 bg-background">
      <Stack.Screen options={{ title: `${destination} ${t('trips.foodGuide')}` }} />
      <View className="flex-1 items-center justify-center px-6">
        <Text className="font-heading-semibold text-xl text-text-primary mb-4">
          Food guide generated!
        </Text>
        <Text className="font-body-regular text-base text-text-secondary text-center mb-8">
          {(foodGuideMutation.data as any)?.mustTryDishes?.length ?? 0} must-try dishes in {destination}
        </Text>
        <Button
          title={t('common.save')}
          onPress={handleSave}
          loading={createTripMutation.isPending}
          size="lg"
        />
      </View>
    </SafeAreaView>
  );
}
```

---

## Task 15: Saved Trips List Screen

**Files:**
- Create: `sarthi-app/app/(tabs)/trips/index.tsx`
- Create: `sarthi-app/components/trip/TripCard.tsx`

- [ ] **Step 1: Create TripCard component**

Create `sarthi-app/components/trip/TripCard.tsx`:

```tsx
import { View, Text, TouchableOpacity } from 'react-native';
import { useRouter } from 'expo-router';
import { useTranslation } from 'react-i18next';
import { Ionicons } from '@expo/vector-icons';
import { Card } from '@/components/ui/Card';
import { Badge } from '@/components/ui/Badge';
import { formatDate } from '@/config/locale';
import type { TripSummary } from '@/types/trip.types';

const travelModeIcons: Record<string, string> = {
  train: 'train-outline',
  flight: 'airplane-outline',
  bus: 'bus-outline',
  car: 'car-outline',
};

interface TripCardProps {
  trip: TripSummary;
}

export function TripCard({ trip }: TripCardProps) {
  const { t } = useTranslation();
  const router = useRouter();

  return (
    <TouchableOpacity
      onPress={() => router.push(`/trip/${trip.id}`)}
      activeOpacity={0.7}
    >
      <Card className="mb-3">
        <View className="flex-row items-start justify-between mb-2">
          <View className="flex-1">
            <Text className="font-heading-semibold text-lg text-text-primary dark:text-white">
              {trip.name}
            </Text>
            <Text className="font-body-regular text-sm text-text-secondary mt-1">
              {trip.destination}, {trip.state}
            </Text>
          </View>
          {trip.travelMode && (
            <Ionicons
              name={travelModeIcons[trip.travelMode] as any ?? 'navigate-outline'}
              size={20}
              color="#78716C"
            />
          )}
        </View>

        <Text className="font-body-regular text-sm text-text-secondary mb-3">
          {formatDate(trip.dates.from)} — {formatDate(trip.dates.to)}
        </Text>

        <View className="flex-row gap-2">
          <Badge
            label={t('trips.itinerary')}
            variant={trip.hasItinerary ? 'accent' : 'gray'}
            icon={
              <Ionicons
                name={trip.hasItinerary ? 'checkmark-circle' : 'close-circle'}
                size={14}
                color={trip.hasItinerary ? '#0D9488' : '#A8A29E'}
              />
            }
          />
          <Badge
            label={t('trips.foodGuide')}
            variant={trip.hasFoodGuide ? 'accent' : 'gray'}
            icon={
              <Ionicons
                name={trip.hasFoodGuide ? 'checkmark-circle' : 'close-circle'}
                size={14}
                color={trip.hasFoodGuide ? '#0D9488' : '#A8A29E'}
              />
            }
          />
        </View>
      </Card>
    </TouchableOpacity>
  );
}
```

- [ ] **Step 2: Create saved trips list screen**

Create `sarthi-app/app/(tabs)/trips/index.tsx`:

```tsx
import { FlatList, Alert } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useTranslation } from 'react-i18next';
import { TripCard } from '@/components/trip/TripCard';
import { EmptyState } from '@/components/ui/EmptyState';
import { LoadingSpinner } from '@/components/ui/LoadingSpinner';
import { SkeletonCard } from '@/components/ui/SkeletonCard';
import { useTrips, useDeleteTrip } from '@/hooks/useTrips';

export default function TripsScreen() {
  const { t } = useTranslation();
  const { data: trips, isLoading, error, refetch } = useTrips();
  const deleteMutation = useDeleteTrip();

  if (isLoading) {
    return (
      <SafeAreaView className="flex-1 bg-background px-4 pt-4">
        <SkeletonCard className="mb-3" />
        <SkeletonCard className="mb-3" />
        <SkeletonCard className="mb-3" />
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView className="flex-1 bg-background">
      <FlatList
        data={trips ?? []}
        keyExtractor={(item) => item.id}
        contentContainerStyle={{ padding: 16, flexGrow: 1 }}
        renderItem={({ item }) => <TripCard trip={item} />}
        onRefresh={refetch}
        refreshing={isLoading}
        ListEmptyComponent={
          <EmptyState
            title={t('trips.empty')}
            description={t('trips.emptyDesc')}
          />
        }
      />
    </SafeAreaView>
  );
}
```

---

## Task 16: Trip Detail Screens

**Files:**
- Create: `sarthi-app/app/trip/[id]/index.tsx`
- Create: `sarthi-app/app/trip/[id]/itinerary.tsx`
- Create: `sarthi-app/app/trip/[id]/food-guide.tsx`
- Create: `sarthi-app/components/trip/ItineraryTimeline.tsx`
- Create: `sarthi-app/components/trip/ActivityCard.tsx`
- Create: `sarthi-app/components/trip/DayTabs.tsx`
- Create: `sarthi-app/components/trip/CostBreakdown.tsx`
- Create: `sarthi-app/components/food/DishCard.tsx`
- Create: `sarthi-app/components/food/StreetFoodCard.tsx`
- Create: `sarthi-app/components/food/MealPlanDay.tsx`

- [ ] **Step 1: Create DayTabs component**

Create `sarthi-app/components/trip/DayTabs.tsx`:

```tsx
import { ScrollView, TouchableOpacity, Text } from 'react-native';

interface DayTabsProps {
  days: number;
  activeDay: number;
  onSelect: (day: number) => void;
}

export function DayTabs({ days, activeDay, onSelect }: DayTabsProps) {
  return (
    <ScrollView horizontal showsHorizontalScrollIndicator={false} className="mb-4">
      <View className="flex-row gap-2 px-4">
        {Array.from({ length: days }).map((_, i) => {
          const day = i + 1;
          const isActive = day === activeDay;
          return (
            <TouchableOpacity
              key={day}
              onPress={() => onSelect(day)}
              className={`px-4 py-2 rounded-badge ${
                isActive ? 'bg-primary-500' : 'bg-surface dark:bg-stone-700'
              }`}
            >
              <Text
                className={`font-body-medium text-sm ${
                  isActive ? 'text-white' : 'text-text-primary dark:text-white'
                }`}
              >
                Day {day}
              </Text>
            </TouchableOpacity>
          );
        })}
      </View>
    </ScrollView>
  );
}

import { View } from 'react-native';
```

- [ ] **Step 2: Create ActivityCard component**

Create `sarthi-app/components/trip/ActivityCard.tsx`:

```tsx
import { View, Text } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import type { ItineraryActivity } from '@/types/trip.types';

interface ActivityCardProps {
  activity: ItineraryActivity;
  isLast: boolean;
}

export function ActivityCard({ activity, isLast }: ActivityCardProps) {
  return (
    <View className="flex-row">
      {/* Timeline connector */}
      <View className="items-center mr-3 w-6">
        <View className="w-3 h-3 rounded-full bg-primary-500" />
        {!isLast && <View className="w-0.5 flex-1 bg-border mt-1" />}
      </View>

      {/* Content */}
      <View className="flex-1 pb-4">
        <Text className="font-body-medium text-xs text-text-tertiary mb-1">
          {activity.time}
        </Text>
        <View className="bg-white dark:bg-stone-800 rounded-card p-3 shadow-sm">
          <Text className="font-heading-semibold text-base text-text-primary dark:text-white">
            {activity.activity}
          </Text>
          {activity.cost && (
            <View className="flex-row items-center mt-1">
              <Ionicons name="cash-outline" size={14} color="#78716C" />
              <Text className="font-body-regular text-sm text-text-secondary ml-1">
                {activity.cost}
              </Text>
            </View>
          )}
          {activity.healthNote && (
            <View className="flex-row items-center mt-1">
              <Ionicons name="fitness-outline" size={14} color="#F97316" />
              <Text className="font-body-regular text-sm text-secondary-500 ml-1">
                {activity.healthNote}
              </Text>
            </View>
          )}
        </View>
      </View>
    </View>
  );
}
```

- [ ] **Step 3: Create ItineraryTimeline component**

Create `sarthi-app/components/trip/ItineraryTimeline.tsx`:

```tsx
import { View, Text } from 'react-native';
import { ActivityCard } from './ActivityCard';
import type { ItineraryDay } from '@/types/trip.types';

interface ItineraryTimelineProps {
  day: ItineraryDay;
}

export function ItineraryTimeline({ day }: ItineraryTimelineProps) {
  return (
    <View className="px-4">
      <Text className="font-heading-semibold text-lg text-text-primary dark:text-white mb-4">
        Day {day.day}: {day.title}
      </Text>
      {day.activities.map((activity, index) => (
        <ActivityCard
          key={index}
          activity={activity}
          isLast={index === day.activities.length - 1}
        />
      ))}
      {day.dayTotal && (
        <View className="flex-row justify-end mt-2">
          <Text className="font-body-medium text-sm text-text-secondary">
            Day total: {day.dayTotal}
          </Text>
        </View>
      )}
    </View>
  );
}
```

- [ ] **Step 4: Create CostBreakdown component**

Create `sarthi-app/components/trip/CostBreakdown.tsx`:

```tsx
import { View, Text } from 'react-native';
import { useTranslation } from 'react-i18next';
import { Card } from '@/components/ui/Card';

interface CostBreakdownProps {
  breakdown: {
    transport: string;
    stay: string;
    food: string;
    activities: string;
    total: string;
  };
}

const items = [
  { key: 'transport', icon: '🚆', label: 'Transport' },
  { key: 'stay', icon: '🏨', label: 'Stay' },
  { key: 'food', icon: '🍽', label: 'Food' },
  { key: 'activities', icon: '🎯', label: 'Activities' },
] as const;

export function CostBreakdown({ breakdown }: CostBreakdownProps) {
  const { t } = useTranslation();

  return (
    <Card>
      <Text className="font-heading-semibold text-lg text-text-primary dark:text-white mb-3">
        {t('trips.costBreakdown')}
      </Text>
      {items.map(({ key, icon, label }) => (
        <View key={key} className="flex-row justify-between items-center py-2 border-b border-border">
          <Text className="font-body-regular text-base text-text-secondary">
            {icon} {label}
          </Text>
          <Text className="font-body-medium text-base text-text-primary dark:text-white">
            {breakdown[key]}
          </Text>
        </View>
      ))}
      <View className="flex-row justify-between items-center pt-3 mt-1">
        <Text className="font-heading-semibold text-base text-text-primary dark:text-white">
          Total ({t('trips.perPerson')})
        </Text>
        <Text className="font-heading-bold text-lg text-primary-500">
          {breakdown.total}
        </Text>
      </View>
    </Card>
  );
}
```

- [ ] **Step 5: Create trip overview screen**

Create `sarthi-app/app/trip/[id]/index.tsx`:

```tsx
import { View, Text, ScrollView } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Stack, useLocalSearchParams, useRouter } from 'expo-router';
import { useTranslation } from 'react-i18next';
import { Ionicons } from '@expo/vector-icons';
import { useTrip } from '@/hooks/useTrips';
import { LoadingSpinner } from '@/components/ui/LoadingSpinner';
import { Card } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { CostBreakdown } from '@/components/trip/CostBreakdown';
import { formatDate } from '@/config/locale';

export default function TripDetailScreen() {
  const { t } = useTranslation();
  const router = useRouter();
  const { id } = useLocalSearchParams<{ id: string }>();
  const { data: trip, isLoading } = useTrip(id ?? '');

  if (isLoading || !trip) {
    return <LoadingSpinner />;
  }

  return (
    <SafeAreaView className="flex-1 bg-background">
      <Stack.Screen options={{ title: trip.name }} />
      <ScrollView className="flex-1" showsVerticalScrollIndicator={false}>
        {/* Header info */}
        <View className="px-4 pt-4">
          <Text className="font-heading-bold text-2xl text-text-primary dark:text-white mb-1">
            {trip.destination}, {trip.state}
          </Text>
          <Text className="font-body-regular text-base text-text-secondary mb-1">
            {formatDate(trip.dates.from)} — {formatDate(trip.dates.to)}
          </Text>
          {trip.travelMode && (
            <View className="flex-row items-center mb-4">
              <Ionicons name="navigate-outline" size={16} color="#78716C" />
              <Text className="font-body-regular text-sm text-text-secondary ml-1 capitalize">
                {trip.travelMode}
              </Text>
            </View>
          )}
        </View>

        {/* Navigation cards */}
        <View className="flex-row px-4 gap-3 mb-4">
          {trip.itineraryData && (
            <Card className="flex-1">
              <Button
                title={t('trips.itinerary')}
                onPress={() => router.push(`/trip/${id}/itinerary`)}
                variant="ghost"
                icon={<Ionicons name="calendar-outline" size={20} color="#4F46E5" />}
              />
            </Card>
          )}
          {trip.foodGuideData && (
            <Card className="flex-1">
              <Button
                title={t('trips.foodGuide')}
                onPress={() => router.push(`/trip/${id}/food-guide`)}
                variant="ghost"
                icon={<Ionicons name="restaurant-outline" size={20} color="#4F46E5" />}
              />
            </Card>
          )}
        </View>

        {/* Cost breakdown */}
        {trip.itineraryData?.costBreakdown && (
          <View className="px-4 mb-4">
            <CostBreakdown breakdown={trip.itineraryData.costBreakdown} />
          </View>
        )}

        {/* Health advisory */}
        {trip.itineraryData?.healthAdvisory && (
          <View className="px-4 mb-4">
            <Card>
              <Text className="font-heading-semibold text-lg text-text-primary dark:text-white mb-2">
                {t('trips.healthAdvisory')}
              </Text>
              <Text className="font-body-regular text-base text-text-secondary">
                Suitability: {trip.itineraryData.healthAdvisory.suitability}
              </Text>
              <Text className="font-body-regular text-sm text-text-secondary mt-1">
                {trip.itineraryData.healthAdvisory.physicalDemand}
              </Text>
            </Card>
          </View>
        )}

        {/* Share button */}
        <View className="px-4 mb-8">
          <Button
            title={t('share.title')}
            onPress={() => router.push(`/trip/${id}/share`)}
            variant="outline"
            icon={<Ionicons name="share-outline" size={20} color="#4F46E5" />}
          />
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}
```

- [ ] **Step 6: Create itinerary view screen**

Create `sarthi-app/app/trip/[id]/itinerary.tsx`:

```tsx
import { ScrollView } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Stack, useLocalSearchParams } from 'expo-router';
import { useTranslation } from 'react-i18next';
import { useState } from 'react';
import { useTrip } from '@/hooks/useTrips';
import { LoadingSpinner } from '@/components/ui/LoadingSpinner';
import { DayTabs } from '@/components/trip/DayTabs';
import { ItineraryTimeline } from '@/components/trip/ItineraryTimeline';

export default function ItineraryScreen() {
  const { t } = useTranslation();
  const { id } = useLocalSearchParams<{ id: string }>();
  const { data: trip, isLoading } = useTrip(id ?? '');
  const [activeDay, setActiveDay] = useState(1);

  if (isLoading || !trip?.itineraryData) {
    return <LoadingSpinner />;
  }

  const days = trip.itineraryData.days;
  const currentDay = days.find((d) => d.day === activeDay) ?? days[0];

  return (
    <SafeAreaView className="flex-1 bg-background">
      <Stack.Screen options={{ title: `${trip.destination} ${t('trips.itinerary')}` }} />
      <DayTabs
        days={days.length}
        activeDay={activeDay}
        onSelect={setActiveDay}
      />
      <ScrollView className="flex-1" showsVerticalScrollIndicator={false}>
        {currentDay && <ItineraryTimeline day={currentDay} />}
      </ScrollView>
    </SafeAreaView>
  );
}
```

- [ ] **Step 7: Create DishCard component**

Create `sarthi-app/components/food/DishCard.tsx`:

```tsx
import { View, Text } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Card } from '@/components/ui/Card';
import { Badge } from '@/components/ui/Badge';
import type { Dish } from '@/types/food.types';

interface DishCardProps {
  dish: Dish;
}

export function DishCard({ dish }: DishCardProps) {
  return (
    <Card className="mb-3">
      <Text className="font-heading-semibold text-base text-text-primary dark:text-white mb-1">
        {dish.name}
      </Text>
      <Text className="font-body-regular text-sm text-text-secondary mb-2">
        {dish.description}
      </Text>
      <View className="flex-row items-center gap-3 mb-2">
        <View className="flex-row items-center">
          <Ionicons name="location-outline" size={14} color="#78716C" />
          <Text className="font-body-regular text-sm text-text-secondary ml-1">
            {dish.where}
          </Text>
        </View>
        <View className="flex-row items-center">
          <Ionicons name="cash-outline" size={14} color="#78716C" />
          <Text className="font-body-regular text-sm text-text-secondary ml-1">
            {dish.cost}
          </Text>
        </View>
      </View>
      <View className="flex-row gap-2">
        <Badge label={dish.spiceLevel} variant="secondary" />
        {dish.allergyWarning && (
          <Badge label={dish.allergyWarning} variant="danger" />
        )}
      </View>
    </Card>
  );
}
```

- [ ] **Step 8: Create StreetFoodCard component**

Create `sarthi-app/components/food/StreetFoodCard.tsx`:

```tsx
import { View, Text } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Card } from '@/components/ui/Card';
import type { StreetFoodItem } from '@/types/food.types';

interface StreetFoodCardProps {
  item: StreetFoodItem;
}

export function StreetFoodCard({ item }: StreetFoodCardProps) {
  return (
    <Card className="mb-2">
      <View className="flex-row justify-between items-start">
        <View className="flex-1">
          <Text className="font-body-medium text-base text-text-primary dark:text-white">
            {item.name}
          </Text>
          <View className="flex-row items-center mt-1">
            <Ionicons name="location-outline" size={14} color="#78716C" />
            <Text className="font-body-regular text-sm text-text-secondary ml-1">
              {item.where}
            </Text>
          </View>
        </View>
        <Text className="font-body-medium text-sm text-text-secondary">
          {item.cost}
        </Text>
      </View>
      {item.safetyTip && (
        <Text className="font-body-regular text-xs text-secondary-500 mt-2">
          ⚠ {item.safetyTip}
        </Text>
      )}
    </Card>
  );
}
```

- [ ] **Step 9: Create MealPlanDay component**

Create `sarthi-app/components/food/MealPlanDay.tsx`:

```tsx
import { View, Text } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import type { MealPlanDay as MealPlanDayType } from '@/types/food.types';

const mealIcons: Record<string, { icon: string; emoji: string }> = {
  breakfast: { icon: 'sunny-outline', emoji: '🌅' },
  lunch: { icon: 'partly-sunny-outline', emoji: '🌞' },
  dinner: { icon: 'moon-outline', emoji: '🌙' },
  snack: { icon: 'cafe-outline', emoji: '☕' },
};

interface MealPlanDayProps {
  day: MealPlanDayType;
}

export function MealPlanDay({ day }: MealPlanDayProps) {
  return (
    <View className="mb-4">
      <Text className="font-heading-semibold text-base text-text-primary dark:text-white mb-2">
        Day {day.day}
      </Text>
      {day.meals.map((meal, index) => {
        const mealInfo = mealIcons[meal.meal.toLowerCase()] ?? mealIcons.snack;
        return (
          <View key={index} className="flex-row items-start mb-2 ml-2">
            <Text className="text-base mr-2">{mealInfo.emoji}</Text>
            <View className="flex-1">
              <Text className="font-body-medium text-sm text-text-primary dark:text-white">
                {meal.dish}
              </Text>
              <Text className="font-body-regular text-xs text-text-secondary">
                {meal.where} · {meal.cost}
              </Text>
            </View>
          </View>
        );
      })}
    </View>
  );
}
```

- [ ] **Step 10: Create food guide view screen**

Create `sarthi-app/app/trip/[id]/food-guide.tsx`:

```tsx
import { View, Text, ScrollView, SectionList } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Stack, useLocalSearchParams } from 'expo-router';
import { useTranslation } from 'react-i18next';
import { useTrip } from '@/hooks/useTrips';
import { LoadingSpinner } from '@/components/ui/LoadingSpinner';
import { DishCard } from '@/components/food/DishCard';
import { StreetFoodCard } from '@/components/food/StreetFoodCard';
import { MealPlanDay } from '@/components/food/MealPlanDay';
import { Card } from '@/components/ui/Card';
import type { FoodGuideData } from '@/types/food.types';

export default function FoodGuideScreen() {
  const { t } = useTranslation();
  const { id } = useLocalSearchParams<{ id: string }>();
  const { data: trip, isLoading } = useTrip(id ?? '');

  if (isLoading || !trip?.foodGuideData) {
    return <LoadingSpinner />;
  }

  const food = trip.foodGuideData as unknown as FoodGuideData;

  return (
    <SafeAreaView className="flex-1 bg-background">
      <Stack.Screen options={{ title: `${trip.destination} ${t('trips.foodGuide')}` }} />
      <ScrollView className="flex-1 px-4" showsVerticalScrollIndicator={false}>
        {/* Overview */}
        {food.overview && (
          <Card className="mt-4 mb-4">
            <Text className="font-body-regular text-base text-text-secondary">
              {food.overview}
            </Text>
          </Card>
        )}

        {/* Must-try dishes */}
        <Text className="font-heading-semibold text-lg text-text-primary dark:text-white mb-3">
          {t('food.mustTry')}
        </Text>
        {food.mustTryDishes?.map((dish, i) => (
          <DishCard key={i} dish={dish} />
        ))}

        {/* Street food */}
        {food.streetFood && (
          <View className="mt-4">
            <Text className="font-heading-semibold text-lg text-text-primary dark:text-white mb-2">
              {t('food.streetFood')}
            </Text>
            {food.streetFood.safetyTips && (
              <Text className="font-body-regular text-sm text-secondary-500 mb-3">
                ⚠ {food.streetFood.safetyTips}
              </Text>
            )}
            {food.streetFood.items?.map((item, i) => (
              <StreetFoodCard key={i} item={item} />
            ))}
          </View>
        )}

        {/* Meal plan */}
        {food.mealPlan && food.mealPlan.length > 0 && (
          <View className="mt-4">
            <Text className="font-heading-semibold text-lg text-text-primary dark:text-white mb-3">
              {t('food.mealPlan')}
            </Text>
            {food.mealPlan.map((day) => (
              <MealPlanDay key={day.day} day={day} />
            ))}
          </View>
        )}

        {/* Dietary info */}
        {food.dietaryInfo && (
          <Card className="mt-4 mb-8">
            <Text className="font-heading-semibold text-base text-text-primary dark:text-white mb-2">
              {t('food.dietary')}
            </Text>
            <Text className="font-body-regular text-sm text-text-secondary">
              🥬 Veg: {food.dietaryInfo.vegFriendly}
            </Text>
            <Text className="font-body-regular text-sm text-text-secondary mt-1">
              🌱 Vegan: {food.dietaryInfo.veganOptions}
            </Text>
          </Card>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}
```

---

## Task 17: Share Flow & Shared Trip View

**Files:**
- Create: `sarthi-app/app/trip/[id]/share.tsx`
- Create: `sarthi-app/app/shared/[token].tsx`

- [ ] **Step 1: Create share screen**

Create `sarthi-app/app/trip/[id]/share.tsx`:

```tsx
import { View, Text, Alert, Share } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Stack, useLocalSearchParams } from 'expo-router';
import { useTranslation } from 'react-i18next';
import { useState } from 'react';
import { useTrip, useEnableSharing, useDisableSharing } from '@/hooks/useTrips';
import { LoadingSpinner } from '@/components/ui/LoadingSpinner';
import { Button } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';
import * as Clipboard from 'expo-clipboard';

export default function ShareScreen() {
  const { t } = useTranslation();
  const { id } = useLocalSearchParams<{ id: string }>();
  const { data: trip, isLoading } = useTrip(id ?? '');
  const enableSharing = useEnableSharing(id ?? '');
  const disableSharing = useDisableSharing(id ?? '');
  const [shareUrl, setShareUrl] = useState<string | null>(null);

  if (isLoading || !trip) return <LoadingSpinner />;

  const handleEnable = () => {
    enableSharing.mutate(undefined, {
      onSuccess: (result) => {
        setShareUrl(result.shareUrl);
      },
    });
  };

  const handleDisable = () => {
    disableSharing.mutate(undefined, {
      onSuccess: () => {
        setShareUrl(null);
      },
    });
  };

  const handleCopy = async () => {
    if (shareUrl) {
      await Clipboard.setStringAsync(shareUrl);
      Alert.alert(t('share.linkCopied'));
    }
  };

  const handleShare = async () => {
    if (shareUrl) {
      await Share.share({
        message: `Check out my ${trip.destination} trip on Sarthi! ${shareUrl}`,
        url: shareUrl,
      });
    }
  };

  const isShared = !!trip.shareToken || !!shareUrl;

  return (
    <SafeAreaView className="flex-1 bg-background">
      <Stack.Screen options={{ title: t('share.title') }} />
      <View className="flex-1 px-4 pt-8">
        <Card className="mb-4">
          <Text className="font-heading-semibold text-lg text-text-primary dark:text-white mb-2">
            {trip.name}
          </Text>
          <Text className="font-body-regular text-base text-text-secondary mb-4">
            {trip.destination}, {trip.state}
          </Text>

          {isShared ? (
            <View className="gap-3">
              <Text className="font-body-regular text-sm text-text-secondary bg-surface p-3 rounded-input">
                {shareUrl ?? `sarthi://shared/${trip.shareToken}`}
              </Text>
              <Button title={t('share.linkCopied').replace('!', '')} onPress={handleCopy} size="sm" />
              <Button title={t('share.shareVia')} onPress={handleShare} variant="outline" size="sm" />
              <Button
                title={t('share.disableSharing')}
                onPress={handleDisable}
                variant="ghost"
                size="sm"
                loading={disableSharing.isPending}
              />
            </View>
          ) : (
            <Button
              title={t('share.enableSharing')}
              onPress={handleEnable}
              loading={enableSharing.isPending}
              size="lg"
            />
          )}
        </Card>
      </View>
    </SafeAreaView>
  );
}
```

- [ ] **Step 2: Create shared trip view**

Create `sarthi-app/app/shared/[token].tsx`:

```tsx
import { View, Text, ScrollView } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Stack, useLocalSearchParams, useRouter } from 'expo-router';
import { useTranslation } from 'react-i18next';
import { useQuery } from '@tanstack/react-query';
import { sharedService } from '@/services/shared.service';
import { LoadingSpinner } from '@/components/ui/LoadingSpinner';
import { EmptyState } from '@/components/ui/EmptyState';
import { Button } from '@/components/ui/Button';
import { CostBreakdown } from '@/components/trip/CostBreakdown';
import { formatDate } from '@/config/locale';

export default function SharedTripScreen() {
  const { t } = useTranslation();
  const router = useRouter();
  const { token } = useLocalSearchParams<{ token: string }>();

  const { data: trip, isLoading, error } = useQuery({
    queryKey: ['shared-trip', token],
    queryFn: () => sharedService.getByToken(token ?? ''),
    enabled: !!token,
  });

  if (isLoading) return <LoadingSpinner />;

  if (error || !trip) {
    return (
      <EmptyState
        title="Trip not found"
        description="This shared link may have expired or been disabled."
      />
    );
  }

  return (
    <SafeAreaView className="flex-1 bg-background">
      <Stack.Screen options={{ title: trip.name }} />
      <ScrollView className="flex-1 px-4" showsVerticalScrollIndicator={false}>
        {/* Shared by banner */}
        <View className="bg-primary-50 rounded-card p-4 mt-4 mb-4">
          <Text className="font-body-medium text-sm text-primary-500 text-center">
            {t('share.sharedBy', { name: 'A Sarthi traveler' })}
          </Text>
        </View>

        {/* Trip info */}
        <Text className="font-heading-bold text-2xl text-text-primary dark:text-white mb-1">
          {trip.destination}, {trip.state}
        </Text>
        <Text className="font-body-regular text-base text-text-secondary mb-4">
          {formatDate(trip.dates.from)} — {formatDate(trip.dates.to)}
        </Text>

        {/* Cost breakdown if available */}
        {trip.itineraryData?.costBreakdown && (
          <View className="mb-4">
            <CostBreakdown breakdown={trip.itineraryData.costBreakdown} />
          </View>
        )}

        {/* Sign up CTA */}
        <View className="bg-secondary-50 rounded-card p-6 mb-8 items-center">
          <Text className="font-heading-semibold text-base text-text-primary text-center mb-3">
            {t('share.signUpCta')}
          </Text>
          <Button
            title={t('auth.welcome.getStarted')}
            onPress={() => router.push('/(auth)/welcome')}
            variant="secondary"
          />
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}
```

---

## Task 18: Profile Screen

**Files:**
- Create: `sarthi-app/app/(tabs)/profile/index.tsx`

- [ ] **Step 1: Create profile screen**

Create `sarthi-app/app/(tabs)/profile/index.tsx`:

```tsx
import { View, Text, ScrollView, Switch, Alert } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useTranslation } from 'react-i18next';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { TouchableOpacity } from 'react-native';
import { useAuthStore } from '@/stores/auth.store';
import { authService } from '@/services/auth.service';
import { useColorScheme } from '@/hooks/useColorScheme';
import { Card } from '@/components/ui/Card';

function SettingsRow({
  icon,
  label,
  value,
  onPress,
  rightElement,
}: {
  icon: string;
  label: string;
  value?: string;
  onPress?: () => void;
  rightElement?: React.ReactNode;
}) {
  return (
    <TouchableOpacity
      onPress={onPress}
      disabled={!onPress && !rightElement}
      className="flex-row items-center justify-between py-3 border-b border-border"
    >
      <View className="flex-row items-center flex-1">
        <Ionicons name={icon as any} size={20} color="#78716C" />
        <Text className="font-body-regular text-base text-text-primary dark:text-white ml-3">
          {label}
        </Text>
      </View>
      {rightElement ?? (
        <View className="flex-row items-center">
          {value && (
            <Text className="font-body-regular text-sm text-text-secondary mr-2">
              {value}
            </Text>
          )}
          {onPress && (
            <Ionicons name="chevron-forward" size={16} color="#A8A29E" />
          )}
        </View>
      )}
    </TouchableOpacity>
  );
}

export default function ProfileScreen() {
  const { t } = useTranslation();
  const router = useRouter();
  const { user } = useAuthStore();
  const { isDark } = useColorScheme();

  const handleSignOut = () => {
    Alert.alert(t('auth.signOut'), 'Are you sure?', [
      { text: t('common.cancel'), style: 'cancel' },
      {
        text: t('auth.signOut'),
        style: 'destructive',
        onPress: () => authService.signOut(),
      },
    ]);
  };

  const handleDeleteAccount = () => {
    Alert.alert(
      t('auth.deleteAccount'),
      'This action cannot be undone. All your data will be permanently deleted.',
      [
        { text: t('common.cancel'), style: 'cancel' },
        {
          text: t('common.delete'),
          style: 'destructive',
          onPress: () => authService.deleteAccount(),
        },
      ],
    );
  };

  return (
    <SafeAreaView className="flex-1 bg-background">
      <ScrollView className="flex-1 px-4 pt-4">
        {/* User info */}
        <View className="items-center mb-6">
          <View className="w-20 h-20 rounded-full bg-primary-100 items-center justify-center mb-3">
            <Ionicons name="person" size={36} color="#4F46E5" />
          </View>
          <Text className="font-heading-semibold text-xl text-text-primary dark:text-white">
            {user?.displayName ?? 'Traveler'}
          </Text>
          <Text className="font-body-regular text-sm text-text-secondary">
            {user?.email ?? user?.phoneNumber ?? ''}
          </Text>
        </View>

        {/* Settings */}
        <Card className="mb-4">
          <Text className="font-heading-semibold text-base text-text-primary dark:text-white mb-2">
            {t('profile.settings')}
          </Text>
          <SettingsRow
            icon="moon-outline"
            label={t('profile.darkMode')}
            rightElement={
              <Switch
                value={isDark}
                trackColor={{ true: '#4F46E5', false: '#E7E5E4' }}
                thumbColor="#fff"
                // Dark mode is system-driven for now — manual toggle needs Appearance API
                disabled
              />
            }
          />
          <SettingsRow
            icon="globe-outline"
            label={t('profile.language')}
            value="English"
          />
        </Card>

        {/* Account */}
        <Card className="mb-4">
          <Text className="font-heading-semibold text-base text-text-primary dark:text-white mb-2">
            {t('profile.account')}
          </Text>
          <SettingsRow
            icon="log-out-outline"
            label={t('auth.signOut')}
            onPress={handleSignOut}
          />
          <SettingsRow
            icon="trash-outline"
            label={t('auth.deleteAccount')}
            onPress={handleDeleteAccount}
          />
        </Card>

        {/* About */}
        <Card className="mb-8">
          <Text className="font-heading-semibold text-base text-text-primary dark:text-white mb-2">
            {t('profile.about')}
          </Text>
          <Text className="font-body-regular text-sm text-text-secondary">
            {t('profile.version', { version: '1.0.0' })}
          </Text>
        </Card>
      </ScrollView>
    </SafeAreaView>
  );
}
```

---

## Task 19: Deep Linking Setup

**Files:**
- Modify: `sarthi-app/app.json` (already configured in Task 1)

Deep linking is already configured through Expo Router. The `scheme: "sarthi"` in `app.json` and the `shared/[token].tsx` route handle `sarthi://shared/{token}` automatically.

- [ ] **Step 1: Verify deep link routing works**

The route structure already supports:
- `sarthi://shared/{token}` → `app/shared/[token].tsx`
- `sarthi://trip/{id}` → `app/trip/[id]/index.tsx`

No additional configuration needed. Expo Router handles this automatically based on file structure + the `scheme` in `app.json`.

- [ ] **Step 2: Add expo-clipboard for share copy**

```bash
cd sarthi-app && npx expo install expo-clipboard
```

Add `"expo-clipboard"` to the plugins array in `app.json`.

---

## Task 20: Final Wiring & Verification

- [ ] **Step 1: Fix the global.css import path in root layout**

In `sarthi-app/app/_layout.tsx`, the CSS import path should be:

```typescript
import '../global.css';
```

(Not `../../global.css` — the root layout is at `app/_layout.tsx`, and `global.css` is at the project root.)

- [ ] **Step 2: Create the `_layout.tsx` files for nested routes**

Create `sarthi-app/app/(tabs)/search/_layout.tsx`:

```tsx
import { Stack } from 'expo-router';

export default function SearchLayout() {
  return <Stack screenOptions={{ headerShown: false }} />;
}
```

Create `sarthi-app/app/(tabs)/trips/_layout.tsx`:

```tsx
import { Stack } from 'expo-router';

export default function TripsLayout() {
  return <Stack screenOptions={{ headerShown: false }} />;
}
```

Create `sarthi-app/app/(tabs)/profile/_layout.tsx`:

```tsx
import { Stack } from 'expo-router';

export default function ProfileLayout() {
  return <Stack screenOptions={{ headerShown: false }} />;
}
```

Create `sarthi-app/app/trip/_layout.tsx`:

```tsx
import { Stack } from 'expo-router';

export default function TripLayout() {
  return <Stack />;
}
```

Create `sarthi-app/app/trip/[id]/_layout.tsx`:

```tsx
import { Stack } from 'expo-router';

export default function TripIdLayout() {
  return <Stack />;
}
```

Create `sarthi-app/app/itinerary/_layout.tsx`:

```tsx
import { Stack } from 'expo-router';

export default function ItineraryLayout() {
  return <Stack />;
}
```

Create `sarthi-app/app/food-guide/_layout.tsx`:

```tsx
import { Stack } from 'expo-router';

export default function FoodGuideLayout() {
  return <Stack />;
}
```

Create `sarthi-app/app/shared/_layout.tsx`:

```tsx
import { Stack } from 'expo-router';

export default function SharedLayout() {
  return <Stack />;
}
```

- [ ] **Step 3: Start the dev server and verify**

```bash
cd sarthi-app && npx expo start --clear
```

Expected: Metro bundler starts. The app should:
1. Show splash screen briefly
2. Navigate to welcome screen (no auth)
3. Welcome screen shows slides and "Get Started" button
4. Login screen shows phone + Google + email options

- [ ] **Step 4: Test with backend**

Start the NestJS backend:
```bash
cd ../sarthi-backend && npm run start:dev
```

In the app, sign in → search for a destination → verify results render → generate itinerary → save trip → view in "My Trips" tab.

- [ ] **Step 5: Fix the FilterChips import issue**

In `sarthi-app/components/search/FilterChips.tsx`, the `View` import needs to be at the top with other imports from `react-native`, not at the bottom. Move it:

```tsx
import { ScrollView, TouchableOpacity, Text, View } from 'react-native';
```

And remove the standalone `import { View } from 'react-native';` at the bottom.

- [ ] **Step 6: Fix the DayTabs import issue**

Same fix in `sarthi-app/components/trip/DayTabs.tsx` — move `View` to the top import:

```tsx
import { ScrollView, TouchableOpacity, Text, View } from 'react-native';
```

Remove the standalone import at the bottom.

---

## Known Issues / Post-Implementation Notes

1. **Firebase config files**: `google-services.json` (Android) and `GoogleService-Info.plist` (iOS) must be downloaded from Firebase Console and placed in the project root. The app will crash without these.

2. **Google Sign-In webClientId**: In `services/auth.service.ts`, the `YOUR_WEB_CLIENT_ID` placeholder must be replaced with the actual Web Client ID from Firebase Console → Authentication → Sign-in method → Google.

3. **API base URL for physical device**: The `config/api.ts` uses `10.0.2.2` which works for Android emulator. For physical devices, update to the machine's local IP address (e.g., `192.168.1.x`).

4. **SVG illustrations are placeholders**: The welcome screen uses emoji placeholders. Download and add SVG illustrations from unDraw/Storyset to `assets/illustrations/` and replace the emoji content.

5. **Date pickers**: The search form uses plain text inputs for dates. A proper date picker component (e.g., `react-native-date-picker` or `@react-native-community/datetimepicker`) should be added for better UX.

6. **expo-clipboard**: Was listed in Task 19 — install it if the share copy feature is needed.

7. **Search results data flow**: The current approach passes search results via TanStack Query's mutation cache. If the user navigates away and back, results are lost. Consider persisting search results in Zustand store for better UX.
