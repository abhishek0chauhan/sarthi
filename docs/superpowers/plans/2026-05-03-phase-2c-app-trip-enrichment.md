# Phase 2C App — Trip Enrichment Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add place context cards, map links, editable itinerary, phrasebook screen, and trip chat screen to the sarthi-app mobile frontend, consuming the already-live Phase 2C backend APIs.

**Architecture:** Five independent features layered on top of existing screens. The itinerary and food guide screens are extended in place; phrasebook and chat are new screens reachable from the trip detail screen. All data access follows the existing `apiRequest` → `tripsService` → React Query hook pattern.

**Tech Stack:** React Native 0.81.5, Expo SDK 54, Expo Router v3, React Query (@tanstack/react-query), Zustand (not needed here), `expo-linking`, `@testing-library/react-native`, Jest

---

## File Map

**New files:**
- `types/enrichment.types.ts` — PlaceContext, PhrasebookData, ChatMessage, enrich DTOs
- `services/enrichment.service.ts` — API calls for enrich, phrasebook, chat, itinerary edits
- `hooks/useEnrichment.ts` — React Query hooks wrapping enrichment.service
- `components/trip/PlaceContextCard.tsx` — expandable card showing whySpecial, tips, etc.
- `components/trip/MapLinkButton.tsx` — single "Open in Maps" pressable
- `app/trip/[id]/phrasebook.tsx` — phrasebook screen
- `app/trip/[id]/chat.tsx` — trip chat screen
- `__tests__/components/trip/PlaceContextCard.test.tsx`
- `__tests__/components/trip/MapLinkButton.test.tsx`
- `__tests__/components/food/DishCard.test.tsx`
- `__tests__/screens/phrasebook.test.tsx`
- `__tests__/screens/trip-chat.test.tsx`

**Modified files:**
- `types/trip.types.ts` — add `placeContext` and `mapQuery` to `ItineraryActivity`; add `phrasebookData` to `SavedTrip`
- `types/food.types.ts` — add `placeContext` and `mapQuery` to `Dish` and `StreetFoodItem`
- `components/trip/ActivityCard.tsx` — add expand/collapse toggle, render `PlaceContextCard` + `MapLinkButton`
- `components/food/DishCard.tsx` — add `MapLinkButton` + light placeContext (bestTimeToVisit, insiderTips)
- `app/trip/[id]/index.tsx` (trip detail) — add Phrasebook and Chat nav tiles; add "Enrich Trip" button
- `app/trip/[id]/food-guide.tsx` — add mapQuery + placeContext to street food items

---

## Task 1: Types + Service Layer

**Files:**
- Create: `types/enrichment.types.ts`
- Modify: `types/trip.types.ts`
- Modify: `types/food.types.ts`
- Create: `services/enrichment.service.ts`
- Create: `hooks/useEnrichment.ts`

- [ ] **Step 1: Write the failing test for PlaceContext shape**

Create `__tests__/types/enrichment.types.test.ts`:

```typescript
import type { PlaceContext, DishContext, PhrasebookData, ChatMessage } from '@/types/enrichment.types';

describe('enrichment types', () => {
  it('PlaceContext has required fields', () => {
    const ctx: PlaceContext = {
      whySpecial: 'Ancient bridge grown by the Khasi tribe',
      bestTimeToVisit: 'Early morning',
      suggestedDuration: '2-3 hours',
      insiderTips: ['Wear grip shoes'],
      whatToCarry: ['Water bottle'],
    };
    expect(ctx.whySpecial).toBeTruthy();
    expect(ctx.insiderTips).toHaveLength(1);
  });

  it('ChatMessage has role and content', () => {
    const msg: ChatMessage = { id: 'abc', role: 'user', content: 'Hello', createdAt: '2026-05-03' };
    expect(msg.role).toBe('user');
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx jest __tests__/types/enrichment.types.test.ts --no-coverage`
Expected: FAIL — cannot find module `@/types/enrichment.types`

- [ ] **Step 3: Create `types/enrichment.types.ts`**

```typescript
export interface PlaceContext {
  whySpecial: string;
  bestTimeToVisit: string;
  suggestedDuration: string;
  insiderTips: string[];
  whatToCarry: string[];
  nearbyAlternative?: string;
}

export interface DishContext {
  bestTimeToVisit: string;
  insiderTips: string[];
}

export interface Phrase {
  english: string;
  local: string;
  pronunciation: string;
}

export interface PhrasebookData {
  language: string;
  script?: string;
  greeting: Phrase[];
  food: Phrase[];
  directions: Phrase[];
  emergency: Phrase[];
  bargaining: Phrase[];
  culturalNotes: string[];
}

export interface ChatMessage {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  createdAt: string;
}

export interface AddActivityDto {
  time: string;
  activity: string;
  cost?: string;
  position?: number;
}

export interface SwapActivityDto {
  time: string;
  activity: string;
  cost?: string;
  healthNote?: string;
}
```

- [ ] **Step 4: Extend `types/trip.types.ts`**

Add `placeContext` and `mapQuery` to `ItineraryActivity`, and `phrasebookData` to `SavedTrip`:

```typescript
// In ItineraryActivity — add after healthNote:
  mapQuery?: string;
  placeContext?: import('./enrichment.types').PlaceContext;

// In SavedTrip — add after foodGuideData:
  phrasebookData?: import('./enrichment.types').PhrasebookData;
```

- [ ] **Step 5: Extend `types/food.types.ts`**

Add `placeContext` and `mapQuery` to `Dish` and `StreetFoodItem`:

```typescript
// In Dish — add after allergyAlert:
  mapQuery?: string;
  placeContext?: import('./enrichment.types').DishContext;

// In StreetFoodItem — add after allergyAlert:
  mapQuery?: string;
```

- [ ] **Step 6: Create `services/enrichment.service.ts`**

```typescript
import { apiRequest } from './api';
import type { PhrasebookData, ChatMessage, AddActivityDto, SwapActivityDto } from '@/types/enrichment.types';
import type { SavedTrip } from '@/types/trip.types';

export const enrichmentService = {
  enrichTrip: (tripId: string) =>
    apiRequest<SavedTrip>(`/saved-trips/${tripId}/enrich`, { method: 'POST' }),

  getPhrasebook: (tripId: string) =>
    apiRequest<PhrasebookData>(`/saved-trips/${tripId}/phrasebook`),

  generatePhrasebook: (tripId: string) =>
    apiRequest<PhrasebookData>(`/saved-trips/${tripId}/phrasebook`, { method: 'POST' }),

  getChatHistory: (tripId: string) =>
    apiRequest<ChatMessage[]>(`/saved-trips/${tripId}/chat`),

  sendChatMessage: (tripId: string, content: string) =>
    apiRequest<ChatMessage>(`/saved-trips/${tripId}/chat`, {
      method: 'POST',
      body: JSON.stringify({ content }),
    }),

  clearChat: (tripId: string) =>
    apiRequest<void>(`/saved-trips/${tripId}/chat`, { method: 'DELETE' }),

  removeActivity: (tripId: string, day: number, index: number) =>
    apiRequest<SavedTrip>(`/saved-trips/${tripId}/itinerary/day/${day}/activity/${index}`, {
      method: 'DELETE',
    }),

  addActivity: (tripId: string, day: number, dto: AddActivityDto) =>
    apiRequest<SavedTrip>(`/saved-trips/${tripId}/itinerary/day/${day}/activity`, {
      method: 'POST',
      body: JSON.stringify(dto),
    }),

  swapActivity: (tripId: string, day: number, index: number, dto: SwapActivityDto) =>
    apiRequest<SavedTrip>(`/saved-trips/${tripId}/itinerary/day/${day}/activity/${index}`, {
      method: 'PUT',
      body: JSON.stringify(dto),
    }),
};
```

- [ ] **Step 7: Create `hooks/useEnrichment.ts`**

```typescript
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { enrichmentService } from '@/services/enrichment.service';
import type { AddActivityDto, SwapActivityDto } from '@/types/enrichment.types';

export function usePhrasebook(tripId: string) {
  return useQuery({
    queryKey: ['phrasebook', tripId],
    queryFn: () => enrichmentService.getPhrasebook(tripId),
    enabled: !!tripId,
    retry: false,
  });
}

export function useGeneratePhrasebook(tripId: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: () => enrichmentService.generatePhrasebook(tripId),
    onSuccess: (data) => {
      queryClient.setQueryData(['phrasebook', tripId], data);
    },
  });
}

export function useChatHistory(tripId: string) {
  return useQuery({
    queryKey: ['chat', tripId],
    queryFn: () => enrichmentService.getChatHistory(tripId),
    enabled: !!tripId,
  });
}

export function useSendChatMessage(tripId: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (content: string) => enrichmentService.sendChatMessage(tripId, content),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['chat', tripId] });
    },
  });
}

export function useEnrichTrip(tripId: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: () => enrichmentService.enrichTrip(tripId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['trip', tripId] });
    },
  });
}

export function useRemoveActivity(tripId: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ day, index }: { day: number; index: number }) =>
      enrichmentService.removeActivity(tripId, day, index),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['trip', tripId] });
    },
  });
}

export function useAddActivity(tripId: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ day, dto }: { day: number; dto: AddActivityDto }) =>
      enrichmentService.addActivity(tripId, day, dto),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['trip', tripId] });
    },
  });
}

export function useSwapActivity(tripId: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ day, index, dto }: { day: number; index: number; dto: SwapActivityDto }) =>
      enrichmentService.swapActivity(tripId, day, index, dto),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['trip', tripId] });
    },
  });
}
```

- [ ] **Step 8: Run test to verify it passes**

Run: `npx jest __tests__/types/enrichment.types.test.ts --no-coverage`
Expected: PASS

- [ ] **Step 9: Commit**

```bash
git add types/enrichment.types.ts types/trip.types.ts types/food.types.ts services/enrichment.service.ts hooks/useEnrichment.ts __tests__/types/enrichment.types.test.ts
git commit -m "feat(2c): add enrichment types, service, and React Query hooks"
```

---

## Task 2: PlaceContextCard + MapLinkButton Components

**Files:**
- Create: `components/trip/PlaceContextCard.tsx`
- Create: `components/trip/MapLinkButton.tsx`
- Create: `__tests__/components/trip/PlaceContextCard.test.tsx`
- Create: `__tests__/components/trip/MapLinkButton.test.tsx`

- [ ] **Step 1: Write failing test for PlaceContextCard**

Create `__tests__/components/trip/PlaceContextCard.test.tsx`:

```typescript
jest.mock('expo-linking', () => ({ openURL: jest.fn() }));

import React from 'react';
import { render, fireEvent } from '@testing-library/react-native';
import { PlaceContextCard } from '@/components/trip/PlaceContextCard';
import type { PlaceContext } from '@/types/enrichment.types';

const ctx: PlaceContext = {
  whySpecial: 'Ancient living root bridge',
  bestTimeToVisit: 'Early morning',
  suggestedDuration: '2-3 hours',
  insiderTips: ['Wear grip shoes', 'Carry cash'],
  whatToCarry: ['Water bottle'],
  nearbyAlternative: 'Mawryngkhew for quieter experience',
};

describe('PlaceContextCard', () => {
  it('is collapsed by default', () => {
    const { queryByText } = render(<PlaceContextCard context={ctx} />);
    expect(queryByText('Ancient living root bridge')).toBeNull();
  });

  it('expands when tapped', () => {
    const { getByText } = render(<PlaceContextCard context={ctx} />);
    fireEvent.press(getByText('Why visit?'));
    expect(getByText('Ancient living root bridge')).toBeTruthy();
  });

  it('shows insider tips when expanded', () => {
    const { getByText } = render(<PlaceContextCard context={ctx} />);
    fireEvent.press(getByText('Why visit?'));
    expect(getByText('Wear grip shoes')).toBeTruthy();
    expect(getByText('Carry cash')).toBeTruthy();
  });
});
```

- [ ] **Step 2: Write failing test for MapLinkButton**

Create `__tests__/components/trip/MapLinkButton.test.tsx`:

```typescript
const mockOpenURL = jest.fn();
jest.mock('expo-linking', () => ({ openURL: mockOpenURL }));

import React from 'react';
import { render, fireEvent } from '@testing-library/react-native';
import { MapLinkButton } from '@/components/trip/MapLinkButton';

describe('MapLinkButton', () => {
  it('renders label', () => {
    const { getByText } = render(<MapLinkButton mapQuery="Amber Fort, Jaipur" />);
    expect(getByText('📍 Open in Maps')).toBeTruthy();
  });

  it('opens Google Maps URL on press', () => {
    const { getByText } = render(<MapLinkButton mapQuery="Amber Fort, Jaipur" />);
    fireEvent.press(getByText('📍 Open in Maps'));
    expect(mockOpenURL).toHaveBeenCalledWith(
      'https://www.google.com/maps/search/?api=1&query=Amber%20Fort%2C%20Jaipur'
    );
  });
});
```

- [ ] **Step 3: Run tests to verify they fail**

Run: `npx jest __tests__/components/trip/PlaceContextCard.test.tsx __tests__/components/trip/MapLinkButton.test.tsx --no-coverage`
Expected: FAIL — modules not found

- [ ] **Step 4: Create `components/trip/MapLinkButton.tsx`**

```typescript
import { Pressable, Text, StyleSheet } from 'react-native';
import * as Linking from 'expo-linking';
import { useColors } from '@/hooks/useColorScheme';
import type { Colors } from '@/constants/colors';

interface MapLinkButtonProps {
  mapQuery: string;
}

export function MapLinkButton({ mapQuery }: MapLinkButtonProps) {
  const colors = useColors();
  const styles = makeStyles(colors);

  const handlePress = () => {
    const encoded = encodeURIComponent(mapQuery);
    Linking.openURL(`https://www.google.com/maps/search/?api=1&query=${encoded}`);
  };

  return (
    <Pressable style={styles.btn} onPress={handlePress}>
      <Text style={styles.label}>📍 Open in Maps</Text>
    </Pressable>
  );
}

function makeStyles(colors: Colors) {
  return StyleSheet.create({
    btn: {
      alignSelf: 'flex-start',
      paddingVertical: 4,
      paddingHorizontal: 10,
      borderRadius: 8,
      backgroundColor: colors.primary50,
      borderWidth: 1,
      borderColor: colors.primary200,
      marginTop: 6,
    },
    label: { fontSize: 11, fontFamily: 'Inter_600SemiBold', color: colors.primary500 },
  });
}
```

- [ ] **Step 5: Create `components/trip/PlaceContextCard.tsx`**

```typescript
import { useState } from 'react';
import { View, Text, Pressable, StyleSheet } from 'react-native';
import { useColors } from '@/hooks/useColorScheme';
import type { Colors } from '@/constants/colors';
import type { PlaceContext } from '@/types/enrichment.types';

interface PlaceContextCardProps {
  context: PlaceContext;
}

export function PlaceContextCard({ context }: PlaceContextCardProps) {
  const [expanded, setExpanded] = useState(false);
  const colors = useColors();
  const styles = makeStyles(colors);

  return (
    <View style={styles.container}>
      <Pressable style={styles.toggle} onPress={() => setExpanded((v) => !v)}>
        <Text style={styles.toggleLabel}>Why visit?</Text>
        <Text style={styles.toggleIcon}>{expanded ? '▲' : '▼'}</Text>
      </Pressable>

      {expanded && (
        <View style={styles.body}>
          <Text style={styles.whySpecial}>{context.whySpecial}</Text>

          <Text style={styles.label}>Best time</Text>
          <Text style={styles.value}>{context.bestTimeToVisit}</Text>

          <Text style={styles.label}>Duration</Text>
          <Text style={styles.value}>{context.suggestedDuration}</Text>

          {context.insiderTips.length > 0 && (
            <>
              <Text style={styles.label}>Insider tips</Text>
              {context.insiderTips.map((tip, i) => (
                <Text key={i} style={styles.bullet}>• {tip}</Text>
              ))}
            </>
          )}

          {context.whatToCarry.length > 0 && (
            <>
              <Text style={styles.label}>What to carry</Text>
              {context.whatToCarry.map((item, i) => (
                <Text key={i} style={styles.bullet}>• {item}</Text>
              ))}
            </>
          )}

          {context.nearbyAlternative && (
            <>
              <Text style={styles.label}>Nearby alternative</Text>
              <Text style={styles.value}>{context.nearbyAlternative}</Text>
            </>
          )}
        </View>
      )}
    </View>
  );
}

function makeStyles(colors: Colors) {
  return StyleSheet.create({
    container: {
      marginTop: 8,
      borderRadius: 8,
      backgroundColor: colors.bgSurface,
      borderWidth: 1,
      borderColor: colors.border,
      overflow: 'hidden',
    },
    toggle: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
      paddingHorizontal: 10,
      paddingVertical: 7,
    },
    toggleLabel: { fontSize: 11, fontFamily: 'Inter_600SemiBold', color: colors.primary500 },
    toggleIcon: { fontSize: 9, color: colors.textTertiary },
    body: { paddingHorizontal: 10, paddingBottom: 10, gap: 3 },
    whySpecial: { fontSize: 12, color: colors.textPrimary, lineHeight: 18, marginBottom: 4 },
    label: { fontSize: 10, fontFamily: 'Inter_700Bold', color: colors.textTertiary, textTransform: 'uppercase', letterSpacing: 0.5, marginTop: 6 },
    value: { fontSize: 12, color: colors.textSecondary, lineHeight: 17 },
    bullet: { fontSize: 12, color: colors.textSecondary, lineHeight: 18 },
  });
}
```

- [ ] **Step 6: Run tests to verify they pass**

Run: `npx jest __tests__/components/trip/PlaceContextCard.test.tsx __tests__/components/trip/MapLinkButton.test.tsx --no-coverage`
Expected: PASS

- [ ] **Step 7: Commit**

```bash
git add components/trip/PlaceContextCard.tsx components/trip/MapLinkButton.tsx __tests__/components/trip/PlaceContextCard.test.tsx __tests__/components/trip/MapLinkButton.test.tsx
git commit -m "feat(2c): add PlaceContextCard and MapLinkButton components"
```

---

## Task 3: Enrich ActivityCard and DishCard

**Files:**
- Modify: `components/trip/ActivityCard.tsx`
- Modify: `components/food/DishCard.tsx`

- [ ] **Step 1: Write failing test for enriched ActivityCard**

Create `__tests__/components/trip/ActivityCard.test.tsx`:

```typescript
jest.mock('expo-linking', () => ({ openURL: jest.fn() }));
jest.mock('@/components/trip/PlaceContextCard', () => ({
  PlaceContextCard: ({ context }: any) => <Text testID="place-context">{context.whySpecial}</Text>,
}));
jest.mock('@/components/trip/MapLinkButton', () => ({
  MapLinkButton: ({ mapQuery }: any) => <Text testID="map-link">{mapQuery}</Text>,
}));

import React from 'react';
import { render, fireEvent } from '@testing-library/react-native';
import { Text } from 'react-native';
import { ActivityCard } from '@/components/trip/ActivityCard';

const activityWithContext = {
  time: '9:00 AM',
  activity: 'Amber Fort',
  cost: '₹550',
  mapQuery: 'Amber Fort, Jaipur, Rajasthan',
  placeContext: {
    whySpecial: 'Stunning hilltop fort',
    bestTimeToVisit: 'Morning',
    suggestedDuration: '3 hours',
    insiderTips: [],
    whatToCarry: [],
  },
};

describe('ActivityCard', () => {
  it('renders activity name and time', () => {
    const { getByText } = render(<ActivityCard activity={activityWithContext} isLast={false} />);
    expect(getByText('Amber Fort')).toBeTruthy();
    expect(getByText('9:00 AM')).toBeTruthy();
  });

  it('shows map link when mapQuery present', () => {
    const { getByTestId } = render(<ActivityCard activity={activityWithContext} isLast={false} />);
    expect(getByTestId('map-link')).toBeTruthy();
  });

  it('shows PlaceContextCard when placeContext present', () => {
    const { getByTestId } = render(<ActivityCard activity={activityWithContext} isLast={false} />);
    expect(getByTestId('place-context')).toBeTruthy();
  });

  it('does not show map link when mapQuery absent', () => {
    const plain = { time: '9:00 AM', activity: 'Rest', cost: '₹0' };
    const { queryByTestId } = render(<ActivityCard activity={plain} isLast={true} />);
    expect(queryByTestId('map-link')).toBeNull();
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx jest __tests__/components/trip/ActivityCard.test.tsx --no-coverage`
Expected: FAIL — map-link or place-context not rendered

- [ ] **Step 3: Update `components/trip/ActivityCard.tsx`**

```typescript
import { View, Text, StyleSheet } from 'react-native';
import { useColors } from '@/hooks/useColorScheme';
import type { Colors } from '@/constants/colors';
import { type } from '@/constants/typography';
import type { ItineraryActivity } from '@/types/trip.types';
import { PlaceContextCard } from './PlaceContextCard';
import { MapLinkButton } from './MapLinkButton';

interface ActivityCardProps {
  activity: ItineraryActivity;
  isLast: boolean;
}

export function ActivityCard({ activity, isLast }: ActivityCardProps) {
  const colors = useColors();
  const styles = makeStyles(colors);

  return (
    <View style={styles.row}>
      <View style={styles.timeline}>
        <View style={styles.dot} />
        {!isLast && <View style={styles.line} />}
      </View>
      <View style={styles.content}>
        <Text style={styles.time}>{activity.time}</Text>
        <View style={styles.card}>
          <Text style={styles.activity}>{activity.activity}</Text>
          {activity.cost && <Text style={styles.meta}>💰 {activity.cost}</Text>}
          {activity.healthNote && <Text style={styles.healthNote}>💪 {activity.healthNote}</Text>}
          {activity.mapQuery && <MapLinkButton mapQuery={activity.mapQuery} />}
          {activity.placeContext && <PlaceContextCard context={activity.placeContext} />}
        </View>
      </View>
    </View>
  );
}

function makeStyles(colors: Colors) {
  return StyleSheet.create({
    row: { flexDirection: 'row' },
    timeline: { alignItems: 'center', marginRight: 12, width: 20 },
    dot: { width: 12, height: 12, borderRadius: 6, backgroundColor: colors.primary500 },
    line: { width: 1.5, flex: 1, backgroundColor: colors.border, marginTop: 4 },
    content: { flex: 1, paddingBottom: 16 },
    time: { ...type.caption, color: colors.textTertiary, marginBottom: 4 },
    card: {
      backgroundColor: colors.bgCard,
      borderRadius: 10,
      padding: 12,
      borderWidth: 1,
      borderColor: colors.border,
      gap: 4,
    },
    activity: { ...type.body, color: colors.textPrimary, fontFamily: 'Inter_600SemiBold' },
    meta: { ...type.caption, color: colors.textSecondary },
    healthNote: { ...type.caption, color: colors.warning },
  });
}
```

- [ ] **Step 4: Write failing test for enriched DishCard**

Create `__tests__/components/food/DishCard.test.tsx`:

```typescript
const mockOpenURL = jest.fn();
jest.mock('expo-linking', () => ({ openURL: mockOpenURL }));
jest.mock('@/components/trip/MapLinkButton', () => ({
  MapLinkButton: ({ mapQuery }: any) => <Text testID="map-link">{mapQuery}</Text>,
}));

import React from 'react';
import { Text } from 'react-native';
import { render } from '@testing-library/react-native';
import { DishCard } from '@/components/food/DishCard';

const dish = {
  name: 'Jadoh',
  description: 'Rice and pork',
  where: 'Police Bazaar, Shillong',
  priceRange: '₹80-120',
  spiceLevel: 'Medium',
  mapQuery: 'Police Bazaar, Shillong, Meghalaya',
  placeContext: {
    bestTimeToVisit: 'Lunch hours',
    insiderTips: ['Cash only', 'Try the thali'],
  },
};

describe('DishCard', () => {
  it('renders dish name and price', () => {
    const { getByText } = render(<DishCard dish={dish} />);
    expect(getByText('Jadoh')).toBeTruthy();
    expect(getByText('₹80-120')).toBeTruthy();
  });

  it('renders map link when mapQuery present', () => {
    const { getByTestId } = render(<DishCard dish={dish} />);
    expect(getByTestId('map-link')).toBeTruthy();
  });

  it('renders place context tips', () => {
    const { getByText } = render(<DishCard dish={dish} />);
    expect(getByText('Lunch hours')).toBeTruthy();
    expect(getByText('• Cash only')).toBeTruthy();
  });

  it('does not show map link when mapQuery absent', () => {
    const plain = { ...dish, mapQuery: undefined, placeContext: undefined };
    const { queryByTestId } = render(<DishCard dish={plain} />);
    expect(queryByTestId('map-link')).toBeNull();
  });
});
```

Run: `npx jest __tests__/components/food/DishCard.test.tsx --no-coverage`
Expected: FAIL — DishCard does not yet render MapLinkButton or placeContext

- [ ] **Step 4b: Update `components/food/DishCard.tsx`**

Add map link and light placeContext (bestTimeToVisit + insiderTips) to the dish card:

```typescript
import { View, Text, StyleSheet } from 'react-native';
import { useColors } from '@/hooks/useColorScheme';
import type { Colors } from '@/constants/colors';
import { type } from '@/constants/typography';
import type { Dish } from '@/types/food.types';
import { MapLinkButton } from '@/components/trip/MapLinkButton';

export function DishCard({ dish }: { dish: Dish }) {
  const colors = useColors();
  const styles = makeStyles(colors);

  return (
    <View style={styles.card}>
      <View style={styles.header}>
        <Text style={styles.name}>{dish.name}</Text>
        <Text style={styles.cost}>{dish.priceRange}</Text>
      </View>
      <Text style={styles.description}>{dish.description}</Text>
      <Text style={styles.meta}>📍 {dish.where} · 🌶️ {dish.spiceLevel}</Text>
      {dish.allergyAlert && <Text style={styles.warning}>⚠️ {dish.allergyAlert}</Text>}
      {dish.mapQuery && <MapLinkButton mapQuery={dish.mapQuery} />}
      {dish.placeContext && (
        <View style={styles.contextBlock}>
          <Text style={styles.contextLabel}>Best time</Text>
          <Text style={styles.contextValue}>{dish.placeContext.bestTimeToVisit}</Text>
          {dish.placeContext.insiderTips.map((tip, i) => (
            <Text key={i} style={styles.contextTip}>• {tip}</Text>
          ))}
        </View>
      )}
    </View>
  );
}

function makeStyles(colors: Colors) {
  return StyleSheet.create({
    card: {
      backgroundColor: colors.bgCard,
      borderRadius: 12,
      padding: 14,
      marginBottom: 10,
      borderWidth: 1,
      borderColor: colors.border,
      gap: 6,
    },
    header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start' },
    name: { ...type.body, color: colors.textPrimary, fontFamily: 'Inter_600SemiBold', flex: 1 },
    cost: { ...type.caption, color: colors.primary500, fontFamily: 'Inter_600SemiBold' },
    description: { ...type.caption, color: colors.textSecondary },
    meta: { ...type.caption, color: colors.textTertiary },
    warning: { ...type.caption, color: colors.warning },
    contextBlock: { marginTop: 4, gap: 2 },
    contextLabel: { fontSize: 10, fontFamily: 'Inter_700Bold', color: colors.textTertiary, textTransform: 'uppercase', letterSpacing: 0.5 },
    contextValue: { fontSize: 11, color: colors.textSecondary },
    contextTip: { fontSize: 11, color: colors.textSecondary },
  });
}
```

- [ ] **Step 5: Run tests to verify they pass**

Run: `npx jest __tests__/components/trip/ActivityCard.test.tsx __tests__/components/food/DishCard.test.tsx --no-coverage`
Expected: PASS

- [ ] **Step 6: Commit**

```bash
git add components/trip/ActivityCard.tsx components/food/DishCard.tsx __tests__/components/trip/ActivityCard.test.tsx __tests__/components/food/DishCard.test.tsx
git commit -m "feat(2c): enrich ActivityCard and DishCard with map links and place context"
```

---

## Task 4: Food Guide Street Food Map Links

**Files:**
- Modify: `app/trip/[id]/food-guide.tsx`
- Create: `__tests__/screens/food-guide-map.test.tsx`

Add `mapQuery` (map link) to inline street food items in the food guide screen. The `DishCard` enrichment (must-try dishes) is already handled by Task 3; this task covers the street food section that is rendered inline in `food-guide.tsx`.

- [ ] **Step 1: Write failing test**

Create `__tests__/screens/food-guide-map.test.tsx`:

```typescript
const mockOpenURL = jest.fn();
jest.mock('expo-linking', () => ({ openURL: mockOpenURL }));
jest.mock('expo-router', () => ({
  useLocalSearchParams: () => ({ id: 'trip-1' }),
}));
jest.mock('@/hooks/useTrips', () => ({
  useTrip: () => ({
    data: {
      foodGuideData: {
        overview: 'Great food',
        mustTryDishes: [],
        healthConscious: [],
        streetFood: {
          safetyTips: ['Drink bottled water'],
          items: [{
            name: 'Momos',
            where: 'Police Bazaar',
            price: '₹50',
            mapQuery: 'Police Bazaar, Shillong, Meghalaya',
          }],
        },
        mealPlan: [],
        dietaryInfo: { vegFriendly: 'Yes', veganOptions: 'Limited', halalAvailability: '', waterAdvice: '' },
      },
    },
    isLoading: false,
  }),
}));

import React from 'react';
import { render, fireEvent } from '@testing-library/react-native';
import TripFoodGuideScreen from '@/app/trip/[id]/food-guide';

describe('FoodGuide street food map link', () => {
  it('renders street food item', () => {
    const { getByText } = render(<TripFoodGuideScreen />);
    expect(getByText('Momos')).toBeTruthy();
  });

  it('renders map link button for street food with mapQuery', () => {
    const { getByText } = render(<TripFoodGuideScreen />);
    expect(getByText('📍 Open in Maps')).toBeTruthy();
  });

  it('opens Google Maps URL on map link press', () => {
    const { getByText } = render(<TripFoodGuideScreen />);
    fireEvent.press(getByText('📍 Open in Maps'));
    expect(mockOpenURL).toHaveBeenCalledWith(
      expect.stringContaining('Police%20Bazaar')
    );
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx jest __tests__/screens/food-guide-map.test.tsx --no-coverage`
Expected: FAIL — map link button not rendered

- [ ] **Step 3: Update `app/trip/[id]/food-guide.tsx`**

Import `MapLinkButton` and add it conditionally inside the street food items section:

```typescript
// Add import at top:
import { MapLinkButton } from '@/components/trip/MapLinkButton';

// In the street food items.map, replace the existing <View key={i} style={styles.streetItem}> block with:
{guide.streetFood.items.map((item, i) => (
  <View key={i} style={styles.streetItem}>
    <Text style={styles.streetName}>{item.name}</Text>
    <Text style={styles.streetMeta}>📍 {item.where} · {item.price}</Text>
    {item.healthNote && <Text style={styles.streetSafety}>{item.healthNote}</Text>}
    {item.mapQuery && <MapLinkButton mapQuery={item.mapQuery} />}
  </View>
))}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npx jest __tests__/screens/food-guide-map.test.tsx --no-coverage`
Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add app/trip/[id]/food-guide.tsx __tests__/screens/food-guide-map.test.tsx
git commit -m "feat(2c): add map links to street food items in food guide screen"
```

---

## Task 5: Editable Itinerary (moved from Task 4)

**Files:**
- Modify: `app/trip/[id]/itinerary.tsx`
- Create: `__tests__/screens/itinerary-edit.test.tsx`

The itinerary screen gains:
1. A delete (×) button on each activity card (calls `useRemoveActivity`)
2. An "Add Activity" FAB that opens a bottom modal with time + name + cost fields
3. An "Enrich Trip" button (visible when no `placeContext` on any activity) that calls `useEnrichTrip`

- [ ] **Step 1: Write failing test**

Create `__tests__/screens/itinerary-edit.test.tsx`:

```typescript
const mockRemove = jest.fn();
const mockAdd = jest.fn();
const mockEnrich = jest.fn();

jest.mock('@/hooks/useEnrichment', () => ({
  useRemoveActivity: () => ({ mutate: mockRemove, isPending: false }),
  useAddActivity: () => ({ mutate: mockAdd, isPending: false }),
  useEnrichTrip: () => ({ mutate: mockEnrich, isPending: false }),
}));
jest.mock('expo-router', () => ({
  useLocalSearchParams: () => ({ id: 'trip-1' }),
}));
jest.mock('@/hooks/useTrips', () => ({
  useTrip: () => ({
    data: {
      id: 'trip-1',
      itineraryData: {
        itinerary: [{
          day: 1,
          title: 'Explore Old City',
          activities: [{ time: '9:00 AM', activity: 'Amber Fort', cost: '₹550' }],
          meals: { breakfast: 'Hotel', lunch: 'Local', dinner: 'Restaurant' },
        }],
      },
    },
    isLoading: false,
  }),
}));

import React from 'react';
import { render, fireEvent } from '@testing-library/react-native';
import TripItineraryScreen from '@/app/trip/[id]/itinerary';

describe('Itinerary edit', () => {
  it('renders activity', () => {
    const { getByText } = render(<TripItineraryScreen />);
    expect(getByText('Amber Fort')).toBeTruthy();
  });

  it('shows delete button for each activity', () => {
    const { getByTestId } = render(<TripItineraryScreen />);
    expect(getByTestId('delete-activity-0')).toBeTruthy();
  });

  it('calls removeActivity when delete pressed', () => {
    const { getByTestId } = render(<TripItineraryScreen />);
    fireEvent.press(getByTestId('delete-activity-0'));
    expect(mockRemove).toHaveBeenCalledWith({ day: 1, index: 0 });
  });

  it('shows Add Activity button', () => {
    const { getByText } = render(<TripItineraryScreen />);
    expect(getByText('+ Add Activity')).toBeTruthy();
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx jest __tests__/screens/itinerary-edit.test.tsx --no-coverage`
Expected: FAIL

- [ ] **Step 3: Update `app/trip/[id]/itinerary.tsx`**

```typescript
import { useState } from 'react';
import { ScrollView, View, Text, StyleSheet, Pressable, Modal, TextInput, Alert } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useLocalSearchParams } from 'expo-router';
import { useTrip } from '@/hooks/useTrips';
import { useRemoveActivity, useAddActivity, useEnrichTrip } from '@/hooks/useEnrichment';
import { LoadingSpinner } from '@/components/ui/LoadingSpinner';
import { EmptyState } from '@/components/ui/EmptyState';
import { DayTabs } from '@/components/trip/DayTabs';
import { ActivityCard } from '@/components/trip/ActivityCard';
import { CostBreakdown } from '@/components/trip/CostBreakdown';
import { useColors } from '@/hooks/useColorScheme';
import type { Colors } from '@/constants/colors';
import { type } from '@/constants/typography';
import type { ItineraryData } from '@/types/trip.types';

export default function TripItineraryScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const { data: trip, isLoading } = useTrip(id ?? '');
  const [activeDay, setActiveDay] = useState(1);
  const [addModalVisible, setAddModalVisible] = useState(false);
  const [newTime, setNewTime] = useState('');
  const [newActivity, setNewActivity] = useState('');
  const [newCost, setNewCost] = useState('');
  const colors = useColors();
  const styles = makeStyles(colors);

  const { mutate: removeActivity } = useRemoveActivity(id ?? '');
  const { mutate: addActivity, isPending: isAdding } = useAddActivity(id ?? '');
  const { mutate: enrichTrip, isPending: isEnriching } = useEnrichTrip(id ?? '');

  if (isLoading) return <LoadingSpinner />;
  if (!trip?.itineraryData) return <EmptyState title="No itinerary" />;

  const itinerary = trip.itineraryData as unknown as ItineraryData;
  const days = itinerary.itinerary ?? [];
  const currentDay = days.find((d) => d.day === activeDay) ?? days[0];

  const hasPlaceContext = days.some((d) =>
    d.activities.some((a) => a.placeContext)
  );

  const handleAddActivity = () => {
    if (!newActivity.trim() || !newTime.trim()) return;
    addActivity(
      { day: activeDay, dto: { time: newTime.trim(), activity: newActivity.trim(), cost: newCost.trim() || undefined } },
      { onSuccess: () => { setAddModalVisible(false); setNewTime(''); setNewActivity(''); setNewCost(''); } }
    );
  };

  return (
    <SafeAreaView style={styles.safe}>
      <DayTabs days={days.length} activeDay={activeDay} onSelect={setActiveDay} />
      <View style={styles.divider} />

      {!hasPlaceContext && (
        <Pressable
          style={[styles.enrichBtn, isEnriching && styles.enrichBtnDisabled]}
          onPress={() => enrichTrip()}
          disabled={isEnriching}
        >
          <Text style={styles.enrichBtnText}>
            {isEnriching ? 'Enriching…' : '✨ Enrich Trip — Add Place Context'}
          </Text>
        </Pressable>
      )}

      <ScrollView contentContainerStyle={styles.content}>
        {currentDay && (
          <View>
            <Text style={styles.dayTitle}>Day {currentDay.day}: {currentDay.title}</Text>
            {currentDay.activities.map((activity, i) => (
              <View key={i} style={styles.activityRow}>
                <View style={styles.activityCardWrapper}>
                  <ActivityCard activity={activity} isLast={i === currentDay.activities.length - 1} />
                </View>
                <Pressable
                  testID={`delete-activity-${i}`}
                  style={styles.deleteBtn}
                  onPress={() => {
                    Alert.alert('Remove Activity', `Remove "${activity.activity}"?`, [
                      { text: 'Cancel', style: 'cancel' },
                      { text: 'Remove', style: 'destructive', onPress: () => removeActivity({ day: activeDay, index: i }) },
                    ]);
                  }}
                >
                  <Text style={styles.deleteBtnText}>×</Text>
                </Pressable>
              </View>
            ))}
          </View>
        )}
        {activeDay === days.length && itinerary.costBreakdown && (
          <CostBreakdown breakdown={itinerary.costBreakdown} />
        )}
      </ScrollView>

      {/* FAB */}
      <Pressable style={styles.fab} onPress={() => setAddModalVisible(true)}>
        <Text style={styles.fabText}>+ Add Activity</Text>
      </Pressable>

      {/* Add Activity Modal */}
      <Modal visible={addModalVisible} transparent animationType="slide">
        <View style={styles.modalOverlay}>
          <View style={styles.modalSheet}>
            <Text style={styles.modalTitle}>Add Activity — Day {activeDay}</Text>
            <TextInput
              style={styles.input}
              placeholder="Time (e.g. 10:00 AM)"
              placeholderTextColor={colors.textTertiary}
              value={newTime}
              onChangeText={setNewTime}
            />
            <TextInput
              style={styles.input}
              placeholder="Activity name"
              placeholderTextColor={colors.textTertiary}
              value={newActivity}
              onChangeText={setNewActivity}
            />
            <TextInput
              style={styles.input}
              placeholder="Cost (optional, e.g. ₹200)"
              placeholderTextColor={colors.textTertiary}
              value={newCost}
              onChangeText={setNewCost}
            />
            <View style={styles.modalBtns}>
              <Pressable style={styles.modalCancel} onPress={() => setAddModalVisible(false)}>
                <Text style={styles.modalCancelText}>Cancel</Text>
              </Pressable>
              <Pressable
                style={[styles.modalAdd, isAdding && styles.enrichBtnDisabled]}
                onPress={handleAddActivity}
                disabled={isAdding}
              >
                <Text style={styles.modalAddText}>{isAdding ? 'Adding…' : 'Add'}</Text>
              </Pressable>
            </View>
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
}

function makeStyles(colors: Colors) {
  return StyleSheet.create({
    safe: { flex: 1, backgroundColor: colors.bgBase },
    divider: { height: 1, backgroundColor: colors.border, marginHorizontal: 20, marginBottom: 4 },
    enrichBtn: {
      margin: 12,
      marginBottom: 0,
      backgroundColor: colors.primary50,
      borderRadius: 10,
      padding: 10,
      alignItems: 'center',
      borderWidth: 1,
      borderColor: colors.primary200,
    },
    enrichBtnDisabled: { opacity: 0.5 },
    enrichBtnText: { fontSize: 12, fontFamily: 'Inter_600SemiBold', color: colors.primary500 },
    content: { padding: 20, gap: 16, paddingBottom: 80 },
    dayTitle: { ...type.screenTitle, color: colors.textPrimary, marginBottom: 16 },
    activityRow: { flexDirection: 'row', alignItems: 'flex-start' },
    activityCardWrapper: { flex: 1 },
    deleteBtn: {
      width: 28,
      height: 28,
      borderRadius: 14,
      backgroundColor: colors.bgSurface,
      borderWidth: 1,
      borderColor: colors.border,
      alignItems: 'center',
      justifyContent: 'center',
      marginTop: 18,
      marginLeft: 4,
    },
    deleteBtnText: { fontSize: 18, color: colors.textTertiary, lineHeight: 22 },
    fab: {
      position: 'absolute',
      bottom: 24,
      right: 20,
      backgroundColor: colors.primary500,
      borderRadius: 24,
      paddingVertical: 10,
      paddingHorizontal: 20,
      shadowColor: colors.primary500,
      shadowOpacity: 0.3,
      shadowRadius: 8,
      shadowOffset: { width: 0, height: 4 },
      elevation: 6,
    },
    fabText: { color: '#fff', fontFamily: 'Inter_700Bold', fontSize: 14 },
    modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'flex-end' },
    modalSheet: {
      backgroundColor: colors.bgBase,
      borderTopLeftRadius: 20,
      borderTopRightRadius: 20,
      padding: 24,
      gap: 12,
    },
    modalTitle: { ...type.screenTitle, color: colors.textPrimary, fontSize: 16 },
    input: {
      borderWidth: 1.5,
      borderColor: colors.border,
      borderRadius: 10,
      padding: 12,
      fontSize: 14,
      color: colors.textPrimary,
      backgroundColor: colors.bgCard,
    },
    modalBtns: { flexDirection: 'row', gap: 10, marginTop: 4 },
    modalCancel: {
      flex: 1,
      borderWidth: 1.5,
      borderColor: colors.border,
      borderRadius: 10,
      padding: 12,
      alignItems: 'center',
    },
    modalCancelText: { color: colors.textSecondary, fontFamily: 'Inter_600SemiBold' },
    modalAdd: { flex: 1, backgroundColor: colors.primary500, borderRadius: 10, padding: 12, alignItems: 'center' },
    modalAddText: { color: '#fff', fontFamily: 'Inter_700Bold' },
  });
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npx jest __tests__/screens/itinerary-edit.test.tsx --no-coverage`
Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add app/trip/[id]/itinerary.tsx __tests__/screens/itinerary-edit.test.tsx
git commit -m "feat(2c): add editable itinerary with delete, add, and enrich-trip actions"
```

---

## Task 6: Phrasebook Screen

**Files:**
- Create: `app/trip/[id]/phrasebook.tsx`
- Create: `__tests__/screens/phrasebook.test.tsx`

- [ ] **Step 1: Write failing test**

Create `__tests__/screens/phrasebook.test.tsx`:

```typescript
const mockGenerate = jest.fn();

jest.mock('@/hooks/useEnrichment', () => ({
  usePhrasebook: (tripId: string) => ({
    data: {
      language: 'Khasi',
      greeting: [{ english: 'Hello', local: 'Khublei', pronunciation: 'Khoo-blei' }],
      food: [],
      directions: [],
      emergency: [],
      bargaining: [],
      culturalNotes: ['Khasi people love greetings'],
    },
    isLoading: false,
    error: null,
  }),
  useGeneratePhrasebook: () => ({ mutate: mockGenerate, isPending: false }),
}));
jest.mock('expo-router', () => ({
  useLocalSearchParams: () => ({ id: 'trip-1' }),
}));
jest.mock('@/hooks/useTrips', () => ({
  useTrip: () => ({ data: { destination: 'Cherrapunji', state: 'Meghalaya' } }),
}));

import React from 'react';
import { render, fireEvent } from '@testing-library/react-native';
import PhrasebookScreen from '@/app/trip/[id]/phrasebook';

describe('PhrasebookScreen', () => {
  it('renders language name', () => {
    const { getByText } = render(<PhrasebookScreen />);
    expect(getByText('Khasi')).toBeTruthy();
  });

  it('renders greeting phrase', () => {
    const { getByText } = render(<PhrasebookScreen />);
    expect(getByText('Hello')).toBeTruthy();
    expect(getByText('Khublei')).toBeTruthy();
  });

  it('renders cultural note', () => {
    const { getByText } = render(<PhrasebookScreen />);
    expect(getByText('Khasi people love greetings')).toBeTruthy();
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx jest __tests__/screens/phrasebook.test.tsx --no-coverage`
Expected: FAIL — module not found

- [ ] **Step 3: Create `app/trip/[id]/phrasebook.tsx`**

```typescript
import { ScrollView, View, Text, StyleSheet, Pressable } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useTrip } from '@/hooks/useTrips';
import { usePhrasebook, useGeneratePhrasebook } from '@/hooks/useEnrichment';
import { LoadingSpinner } from '@/components/ui/LoadingSpinner';
import { useColors } from '@/hooks/useColorScheme';
import type { Colors } from '@/constants/colors';
import { type } from '@/constants/typography';
import type { Phrase } from '@/types/enrichment.types';

function PhraseRow({ phrase }: { phrase: Phrase }) {
  const colors = useColors();
  const styles = makePhraseStyles(colors);
  return (
    <View style={styles.row}>
      <Text style={styles.english}>{phrase.english}</Text>
      <Text style={styles.local}>{phrase.local}</Text>
      <Text style={styles.pronunciation}>{phrase.pronunciation}</Text>
    </View>
  );
}

function makePhraseStyles(colors: Colors) {
  return StyleSheet.create({
    row: { paddingVertical: 8, borderBottomWidth: 1, borderBottomColor: colors.border, gap: 2 },
    english: { fontSize: 13, fontFamily: 'Inter_600SemiBold', color: colors.textPrimary },
    local: { fontSize: 14, fontFamily: 'Inter_700Bold', color: colors.primary500 },
    pronunciation: { fontSize: 11, color: colors.textTertiary, fontStyle: 'italic' },
  });
}

export default function PhrasebookScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const { data: trip } = useTrip(id ?? '');
  const { data: phrasebook, isLoading, error } = usePhrasebook(id ?? '');
  const { mutate: generate, isPending: isGenerating } = useGeneratePhrasebook(id ?? '');
  const colors = useColors();
  const styles = makeStyles(colors);

  if (isLoading) return <LoadingSpinner />;

  return (
    <SafeAreaView style={styles.safe}>
      <View style={styles.header}>
        <Pressable onPress={() => router.back()}>
          <Text style={styles.back}>← {trip?.destination ?? 'Trip'}</Text>
        </Pressable>
      </View>
      <Text style={styles.title}>Phrasebook</Text>

      {!phrasebook && !isLoading && (
        <View style={styles.empty}>
          <Text style={styles.emptyText}>No phrasebook yet for this trip.</Text>
          <Pressable
            style={[styles.generateBtn, isGenerating && styles.generateBtnDisabled]}
            onPress={() => generate()}
            disabled={isGenerating}
          >
            <Text style={styles.generateBtnText}>{isGenerating ? 'Generating…' : '✨ Generate Phrasebook'}</Text>
          </Pressable>
        </View>
      )}

      {phrasebook && (
        <ScrollView contentContainerStyle={styles.content}>
          <View style={styles.langBadge}>
            <Text style={styles.langText}>{phrasebook.language}</Text>
            {phrasebook.script && <Text style={styles.scriptText}>({phrasebook.script} script)</Text>}
          </View>

          {[
            { label: 'Greetings', phrases: phrasebook.greeting },
            { label: 'Food', phrases: phrasebook.food },
            { label: 'Directions', phrases: phrasebook.directions },
            { label: 'Emergency', phrases: phrasebook.emergency },
            { label: 'Bargaining', phrases: phrasebook.bargaining },
          ].map(({ label, phrases }) =>
            phrases?.length ? (
              <View key={label} style={styles.section}>
                <Text style={styles.sectionLabel}>{label}</Text>
                {phrases.map((p, i) => <PhraseRow key={i} phrase={p} />)}
              </View>
            ) : null
          )}

          {phrasebook.culturalNotes?.length > 0 && (
            <View style={styles.culturalCard}>
              <Text style={styles.sectionLabel}>Cultural Notes</Text>
              {phrasebook.culturalNotes.map((note, i) => (
                <Text key={i} style={styles.culturalNote}>• {note}</Text>
              ))}
            </View>
          )}
        </ScrollView>
      )}
    </SafeAreaView>
  );
}

function makeStyles(colors: Colors) {
  return StyleSheet.create({
    safe: { flex: 1, backgroundColor: colors.bgBase },
    header: { paddingHorizontal: 16, paddingTop: 8, paddingBottom: 4 },
    back: { fontSize: 14, fontFamily: 'Inter_700Bold', color: colors.primary500 },
    title: { fontSize: 22, fontFamily: 'Inter_800ExtraBold', color: colors.textPrimary, paddingHorizontal: 16, marginBottom: 8, letterSpacing: -0.5 },
    empty: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: 16, padding: 32 },
    emptyText: { fontSize: 14, color: colors.textSecondary, textAlign: 'center' },
    generateBtn: { backgroundColor: colors.primary500, borderRadius: 12, paddingVertical: 12, paddingHorizontal: 24 },
    generateBtnDisabled: { opacity: 0.5 },
    generateBtnText: { color: '#fff', fontFamily: 'Inter_700Bold', fontSize: 14 },
    content: { padding: 16, gap: 20, paddingBottom: 40 },
    langBadge: { flexDirection: 'row', gap: 8, alignItems: 'center', marginBottom: 4 },
    langText: { fontSize: 18, fontFamily: 'Inter_700Bold', color: colors.textPrimary },
    scriptText: { fontSize: 12, color: colors.textTertiary },
    section: { gap: 4 },
    sectionLabel: { ...type.overline, color: colors.textTertiary, marginBottom: 4 },
    culturalCard: {
      backgroundColor: colors.bgCard,
      borderRadius: 12,
      padding: 14,
      borderWidth: 1,
      borderColor: colors.border,
      gap: 6,
    },
    culturalNote: { fontSize: 13, color: colors.textSecondary, lineHeight: 20 },
  });
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npx jest __tests__/screens/phrasebook.test.tsx --no-coverage`
Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add app/trip/[id]/phrasebook.tsx __tests__/screens/phrasebook.test.tsx
git commit -m "feat(2c): add Phrasebook screen with generate and phrase list"
```

---

## Task 7: Trip Chat Screen

**Files:**
- Create: `app/trip/[id]/chat.tsx`
- Create: `__tests__/screens/trip-chat.test.tsx`

- [ ] **Step 1: Write failing test**

Create `__tests__/screens/trip-chat.test.tsx`:

```typescript
const mockSend = jest.fn();

jest.mock('@/hooks/useEnrichment', () => ({
  useChatHistory: () => ({
    data: [
      { id: '1', role: 'user', content: 'Is there an ATM near Dawki?', createdAt: '2026-05-03T09:00:00Z' },
      { id: '2', role: 'assistant', content: 'Yes, SBI ATM is 2 km from Dawki bridge.', createdAt: '2026-05-03T09:00:05Z' },
    ],
    isLoading: false,
  }),
  useSendChatMessage: () => ({ mutate: mockSend, isPending: false }),
}));
jest.mock('expo-router', () => ({
  useLocalSearchParams: () => ({ id: 'trip-1' }),
  useRouter: () => ({ back: jest.fn() }),
}));
jest.mock('@/hooks/useTrips', () => ({
  useTrip: () => ({ data: { destination: 'Shillong', state: 'Meghalaya' } }),
}));

import React from 'react';
import { render, fireEvent } from '@testing-library/react-native';
import TripChatScreen from '@/app/trip/[id]/chat';

describe('TripChatScreen', () => {
  it('renders chat history', () => {
    const { getByText } = render(<TripChatScreen />);
    expect(getByText('Is there an ATM near Dawki?')).toBeTruthy();
    expect(getByText('Yes, SBI ATM is 2 km from Dawki bridge.')).toBeTruthy();
  });

  it('sends message when send button pressed with text', () => {
    const { getByPlaceholderText, getByText } = render(<TripChatScreen />);
    fireEvent.changeText(getByPlaceholderText('Ask anything about your trip…'), 'What to pack?');
    fireEvent.press(getByText('Send'));
    expect(mockSend).toHaveBeenCalledWith('What to pack?');
  });

  it('does not send when input is empty', () => {
    mockSend.mockClear();
    const { getByText } = render(<TripChatScreen />);
    fireEvent.press(getByText('Send'));
    expect(mockSend).not.toHaveBeenCalled();
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx jest __tests__/screens/trip-chat.test.tsx --no-coverage`
Expected: FAIL — module not found

- [ ] **Step 3: Create `app/trip/[id]/chat.tsx`**

```typescript
import { useState, useRef } from 'react';
import { View, Text, ScrollView, TextInput, Pressable, StyleSheet, KeyboardAvoidingView, Platform } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useTrip } from '@/hooks/useTrips';
import { useChatHistory, useSendChatMessage } from '@/hooks/useEnrichment';
import { LoadingSpinner } from '@/components/ui/LoadingSpinner';
import { useColors } from '@/hooks/useColorScheme';
import type { Colors } from '@/constants/colors';
import type { ChatMessage } from '@/types/enrichment.types';

export default function TripChatScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const { data: trip } = useTrip(id ?? '');
  const { data: messages, isLoading } = useChatHistory(id ?? '');
  const { mutate: sendMessage, isPending: isSending } = useSendChatMessage(id ?? '');
  const [input, setInput] = useState('');
  const scrollRef = useRef<ScrollView>(null);
  const colors = useColors();
  const styles = makeStyles(colors);

  const handleSend = () => {
    const text = input.trim();
    if (!text) return;
    setInput('');
    sendMessage(text, { onSuccess: () => scrollRef.current?.scrollToEnd({ animated: true }) });
  };

  if (isLoading) return <LoadingSpinner />;

  return (
    <SafeAreaView style={styles.safe}>
      <View style={styles.header}>
        <Pressable onPress={() => router.back()}>
          <Text style={styles.back}>← {trip?.destination ?? 'Trip'}</Text>
        </Pressable>
        <Text style={styles.headerTitle}>Trip Chat</Text>
      </View>

      <KeyboardAvoidingView
        style={styles.flex}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        keyboardVerticalOffset={88}
      >
        <ScrollView
          ref={scrollRef}
          style={styles.messageList}
          contentContainerStyle={styles.messageContent}
          onContentSizeChange={() => scrollRef.current?.scrollToEnd({ animated: false })}
        >
          {!messages?.length && (
            <View style={styles.emptyChat}>
              <Text style={styles.emptyChatText}>Ask anything about your trip — itinerary, food, logistics, packing.</Text>
            </View>
          )}
          {messages?.map((msg: ChatMessage) => (
            <View
              key={msg.id}
              style={[styles.bubble, msg.role === 'user' ? styles.bubbleUser : styles.bubbleAssistant]}
            >
              <Text style={msg.role === 'user' ? styles.bubbleUserText : styles.bubbleAssistantText}>
                {msg.content}
              </Text>
            </View>
          ))}
          {isSending && (
            <View style={[styles.bubble, styles.bubbleAssistant]}>
              <Text style={styles.bubbleAssistantText}>…</Text>
            </View>
          )}
        </ScrollView>

        <View style={styles.inputRow}>
          <TextInput
            style={styles.input}
            value={input}
            onChangeText={setInput}
            placeholder="Ask anything about your trip…"
            placeholderTextColor={colors.textTertiary}
            multiline
            returnKeyType="send"
            onSubmitEditing={handleSend}
          />
          <Pressable
            style={[styles.sendBtn, isSending && styles.sendBtnDisabled]}
            onPress={handleSend}
            disabled={isSending}
          >
            <Text style={styles.sendBtnText}>Send</Text>
          </Pressable>
        </View>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

function makeStyles(colors: Colors) {
  return StyleSheet.create({
    safe: { flex: 1, backgroundColor: colors.bgBase },
    flex: { flex: 1 },
    header: {
      paddingHorizontal: 16,
      paddingTop: 8,
      paddingBottom: 12,
      flexDirection: 'row',
      alignItems: 'center',
      gap: 12,
      borderBottomWidth: 1,
      borderBottomColor: colors.border,
    },
    back: { fontSize: 14, fontFamily: 'Inter_700Bold', color: colors.primary500 },
    headerTitle: { fontSize: 16, fontFamily: 'Inter_700Bold', color: colors.textPrimary },
    messageList: { flex: 1 },
    messageContent: { padding: 16, gap: 8, paddingBottom: 16 },
    emptyChat: { alignItems: 'center', paddingVertical: 40, paddingHorizontal: 24 },
    emptyChatText: { fontSize: 14, color: colors.textSecondary, textAlign: 'center', lineHeight: 22 },
    bubble: { maxWidth: '82%', borderRadius: 14, padding: 10 },
    bubbleUser: {
      alignSelf: 'flex-end',
      backgroundColor: colors.primary500,
      borderBottomRightRadius: 4,
    },
    bubbleAssistant: {
      alignSelf: 'flex-start',
      backgroundColor: colors.bgCard,
      borderWidth: 1,
      borderColor: colors.border,
      borderBottomLeftRadius: 4,
    },
    bubbleUserText: { fontSize: 13, color: '#fff', lineHeight: 20 },
    bubbleAssistantText: { fontSize: 13, color: colors.textPrimary, lineHeight: 20 },
    inputRow: {
      flexDirection: 'row',
      gap: 8,
      padding: 12,
      borderTopWidth: 1,
      borderTopColor: colors.border,
      backgroundColor: colors.bgBase,
    },
    input: {
      flex: 1,
      borderWidth: 1.5,
      borderColor: colors.border,
      borderRadius: 12,
      paddingHorizontal: 12,
      paddingVertical: 8,
      fontSize: 14,
      color: colors.textPrimary,
      backgroundColor: colors.bgCard,
      maxHeight: 100,
    },
    sendBtn: {
      backgroundColor: colors.primary500,
      borderRadius: 12,
      paddingHorizontal: 16,
      alignItems: 'center',
      justifyContent: 'center',
    },
    sendBtnDisabled: { opacity: 0.5 },
    sendBtnText: { color: '#fff', fontFamily: 'Inter_700Bold', fontSize: 13 },
  });
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npx jest __tests__/screens/trip-chat.test.tsx --no-coverage`
Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add app/trip/[id]/chat.tsx __tests__/screens/trip-chat.test.tsx
git commit -m "feat(2c): add Trip Chat screen with message history and AI replies"
```

---

## Task 8: Wire Up Trip Detail Navigation

**Files:**
- Modify: `app/trip/[id]/index.tsx`
- Create: `__tests__/screens/trip-detail-enrichment.test.tsx`

Add Phrasebook and Chat nav tiles to the trip detail screen, and an "Enrich Trip" button so users can discover enrichment from the main detail screen (not buried in the itinerary sub-tab).

- [ ] **Step 1: Read `app/trip/[id]/index.tsx` to locate where to add tiles**

The navGrid section (line ~117–143) holds the Itinerary and Food Guide tiles. We add two more tiles below: Phrasebook and Chat. The Highlights card is a good anchor — add tiles immediately above it.

- [ ] **Step 2: Write failing test for new tiles**

Create `__tests__/screens/trip-detail-enrichment.test.tsx`:

```typescript
const mockPush = jest.fn();
jest.mock('expo-router', () => ({
  useLocalSearchParams: () => ({ id: 'trip-1' }),
  useRouter: () => ({ back: jest.fn(), push: mockPush }),
}));
jest.mock('@/hooks/useTrips', () => ({
  useTrip: () => ({
    data: {
      id: 'trip-1', name: 'Meghalaya Trip', destination: 'Shillong', state: 'Meghalaya',
      dates: { from: '2026-06-01', to: '2026-06-05' },
      itineraryData: { itinerary: [{ day: 1, activities: [] }], tripReadiness: 80, highlights: [] },
      foodGuideData: null,
    },
    isLoading: false, error: null,
  }),
}));
jest.mock('@/hooks/useEnrichment', () => ({
  useEnrichTrip: () => ({ mutate: jest.fn(), isPending: false }),
}));
jest.mock('expo-linear-gradient', () => ({
  LinearGradient: ({ children }: any) => children,
}));
jest.mock('expo-location', () => ({ requestForegroundPermissionsAsync: jest.fn().mockResolvedValue({ granted: false }) }));

import React from 'react';
import { render, fireEvent } from '@testing-library/react-native';
import TripDetailScreen from '@/app/trip/[id]/index';

describe('TripDetail enrichment tiles', () => {
  it('renders Phrasebook tile', () => {
    const { getByText } = render(<TripDetailScreen />);
    expect(getByText('Phrasebook')).toBeTruthy();
  });

  it('renders Trip Chat tile', () => {
    const { getByText } = render(<TripDetailScreen />);
    expect(getByText('Trip Chat')).toBeTruthy();
  });

  it('navigates to phrasebook on tile press', () => {
    const { getByText } = render(<TripDetailScreen />);
    fireEvent.press(getByText('Phrasebook'));
    expect(mockPush).toHaveBeenCalledWith('/trip/trip-1/phrasebook');
  });

  it('navigates to chat on tile press', () => {
    const { getByText } = render(<TripDetailScreen />);
    fireEvent.press(getByText('Trip Chat'));
    expect(mockPush).toHaveBeenCalledWith('/trip/trip-1/chat');
  });
});
```

- [ ] **Step 3: Run test to verify it fails**

Run: `npx jest __tests__/screens/trip-detail-enrichment.test.tsx --no-coverage`
Expected: FAIL

- [ ] **Step 4: Add Phrasebook + Chat tiles and Enrich Trip button to `app/trip/[id]/index.tsx`**

Three changes to this file:

**a) Add import at top:**
```typescript
import { useEnrichTrip } from '@/hooks/useEnrichment';
```

**b) Add hook call inside the component (after existing hook calls):**
```typescript
const { mutate: enrichTrip, isPending: isEnriching } = useEnrichTrip(id ?? '');
const hasPlaceContext = (trip.itineraryData?.itinerary ?? []).some((d: any) =>
  d.activities?.some((a: any) => a.placeContext)
);
```

**c) Add Enrich Trip button after the cost breakdown card and before the Highlights card (in the padded content area):**
```typescript
{/* Enrich Trip — shown when itinerary exists but has no place context yet */}
{trip.itineraryData && !hasPlaceContext && (
  <Pressable
    style={[styles.enrichBtn, isEnriching && styles.enrichBtnDisabled]}
    onPress={() => enrichTrip()}
    disabled={isEnriching}
  >
    <Text style={styles.enrichBtnText}>
      {isEnriching ? '✨ Enriching…' : '✨ Enrich Trip — Add Place Context & Map Links'}
    </Text>
  </Pressable>
)}
```

**d) Add styles:**
```typescript
enrichBtn: {
  backgroundColor: colors.primary50,
  borderRadius: 12,
  padding: 12,
  alignItems: 'center',
  borderWidth: 1,
  borderColor: colors.primary200,
},
enrichBtnDisabled: { opacity: 0.5 },
enrichBtnText: { fontSize: 13, fontFamily: 'Inter_600SemiBold', color: colors.primary500 },
```

**e) In the non-`isActiveDay` navGrid section, add a second row of tiles below the existing Food Guide tile:**

```typescript
// Add second navGrid row below the existing navGrid:
<View style={styles.navGrid}>
  <Pressable
    style={[styles.navTile, styles.navTileSecondary]}
    onPress={() => router.push(`/trip/${id}/phrasebook` as any)}
  >
    <Text style={styles.navTileIcon}>🗣️</Text>
    <Text style={[styles.navTileLabel, { color: colors.textPrimary }]}>Phrasebook</Text>
    <Text style={[styles.navTileDetail, { color: colors.textTertiary }]}>
      {trip.phrasebookData ? 'Ready' : 'Tap to generate'}
    </Text>
  </Pressable>
  <Pressable
    style={[styles.navTile, styles.navTileSecondary]}
    onPress={() => router.push(`/trip/${id}/chat` as any)}
  >
    <Text style={styles.navTileIcon}>💬</Text>
    <Text style={[styles.navTileLabel, { color: colors.textPrimary }]}>Trip Chat</Text>
    <Text style={[styles.navTileDetail, { color: colors.textTertiary }]}>Ask Sarthi AI</Text>
  </Pressable>
</View>
```

Note: use `trip.phrasebookData` (no cast needed — `SavedTrip` type was updated in Task 1).

**f) In the `isActiveDay` branch, add a second row below the existing tilesGrid:**

```typescript
// Keep the existing navGrid (Itinerary + Food Guide tiles) unchanged.
// Add a second navGrid row immediately below it:
<View style={styles.navGrid}>
  <Pressable
    style={[styles.navTile, styles.navTileSecondary]}
    onPress={() => router.push(`/trip/${id}/phrasebook` as any)}
  >
    <Text style={styles.navTileIcon}>🗣️</Text>
    <Text style={[styles.navTileLabel, { color: colors.textPrimary }]}>Phrasebook</Text>
    <Text style={[styles.navTileDetail, { color: colors.textTertiary }]}>
      {trip.phrasebookData ? 'Ready' : 'Tap to generate'}
    </Text>
  </Pressable>
  <Pressable
    style={[styles.navTile, styles.navTileSecondary]}
    onPress={() => router.push(`/trip/${id}/chat` as any)}
  >
    <Text style={styles.navTileIcon}>💬</Text>
    <Text style={[styles.navTileLabel, { color: colors.textPrimary }]}>Trip Chat</Text>
    <Text style={[styles.navTileDetail, { color: colors.textTertiary }]}>Ask Sarthi AI</Text>
  </Pressable>
</View>
```

Note: `trip.phrasebookData` works without a cast because `SavedTrip` was updated in Task 1.

In the `isActiveDay` section, add Phrasebook and Chat as a second row below the existing tilesGrid:

```typescript
{/* below the existing tilesGrid */}
<View style={styles.navGrid}>
  <Pressable
    style={[styles.navTile, styles.navTileSecondary]}
    onPress={() => router.push(`/trip/${id}/phrasebook` as any)}
  >
    <Text style={styles.navTileIconSm}>🗣️</Text>
    <Text style={styles.navTileLabelSm}>Phrasebook</Text>
  </Pressable>
  <Pressable
    style={[styles.navTile, styles.navTileSecondary]}
    onPress={() => router.push(`/trip/${id}/chat` as any)}
  >
    <Text style={styles.navTileIconSm}>💬</Text>
    <Text style={styles.navTileLabelSm}>Trip Chat</Text>
  </Pressable>
</View>
```

- [ ] **Step 5: Run new tile test + existing regression test**

Run: `npx jest __tests__/screens/trip-detail-enrichment.test.tsx __tests__/screens/trip-detail-live-tile.test.tsx --no-coverage`
Expected: PASS — new tiles render and existing live tile tests unaffected

- [ ] **Step 6: Commit**

```bash
git add app/trip/[id]/index.tsx __tests__/screens/trip-detail-enrichment.test.tsx
git commit -m "feat(2c): add Phrasebook, Chat tiles and Enrich Trip button to trip detail screen"
```

---

## Task 9: Full Test Suite + Final Verification

- [ ] **Step 1: Run full test suite**

Run: `npx jest --no-coverage`
Expected: All existing tests pass + all 2C tests pass. No regressions.

- [ ] **Step 2: Check TypeScript**

Run: `npx tsc --noEmit`
Expected: No type errors (the `placeContext` and `mapQuery` additions are optional fields so old data is unaffected).

- [ ] **Step 3: Commit if any cleanup was needed**

```bash
git add -A
git commit -m "chore(2c): fix any type errors or test issues from full suite run"
```

---

## Notes for Implementer

- All backend endpoints for Phase 2C are already live. The `enrichTrip` POST endpoint enriches existing itinerary data with `placeContext` and `mapQuery` fields in-place and returns the updated trip.
- The `placeContext` and `mapQuery` fields are optional on all types — old trips without enrichment work unchanged.
- `expo-linking` is already in the Expo SDK — no install needed.
- React Query's `retry: false` on `usePhrasebook` prevents repeated 404 calls when no phrasebook exists yet.
- `trip.phrasebookData` does not need a cast — `SavedTrip` is updated in Task 1, Step 4.
