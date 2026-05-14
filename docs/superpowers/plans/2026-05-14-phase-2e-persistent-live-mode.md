# Phase 2E: Persistent Live Mode Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Keep the Live Guide session alive when the user navigates away, auto-resume on app foreground, and add explicit Stop buttons on both the trip detail page and live guide header.

**Architecture:** Two new singleton services (persistence + location) decouple live mode from the screen lifecycle. The store gains `activeTripId` so any screen can read session state reactively. The root layout gains an AppState listener for auto-resume. All UI changes are confined to two screens.

**Tech Stack:** React Native (Expo), Zustand, AsyncStorage, expo-location, socket.io-client, Firebase Cloud Messaging

---

## File Map

| File | Action |
|------|--------|
| `sarthi-app/services/live-mode.persistence.ts` | **Create** — AsyncStorage wrapper (save/clear/get) |
| `sarthi-app/services/location.service.ts` | **Create** — singleton owning watchPositionAsync subscription |
| `sarthi-app/stores/live-guide.store.ts` | **Modify** — add `activeTripId` field |
| `sarthi-app/hooks/useLiveGuide.ts` | **Modify** — re-entrancy guard, listener cleanup, wire persistence + location |
| `sarthi-app/services/notifications.service.ts` | **Modify** — add `notificationNavState` export, update `setupTapHandler` |
| `sarthi-app/app/_layout.tsx` | **Modify** — add AppState auto-resume listener |
| `sarthi-app/app/trip/[id]/live-guide.tsx` | **Modify** — remove screen-level location tracking, fix back btn, add Stop btn |
| `sarthi-app/app/trip/[id]/index.tsx` | **Modify** — add Live Active Banner with Stop button |
| `sarthi-app/__tests__/screens/live-guide.test.tsx` | **Modify** — update mocks, add Stop button test |
| `sarthi-app/__tests__/screens/trip-detail-live-tile.test.tsx` | **Modify** — add Live Active Banner tests |

---

## Task 1: Create `live-mode.persistence.ts`

**Files:**
- Create: `sarthi-app/services/live-mode.persistence.ts`

This is a thin AsyncStorage wrapper — three methods, one fixed key, no business logic.

- [ ] **Step 1: Create the file with full implementation**

```typescript
import AsyncStorage from '@react-native-async-storage/async-storage';

const KEY = 'live_mode_session';

export interface LiveModeSession {
  tripId: string;
  sessionId: string;
  dayIndex: number;
}

export const liveModePersistence = {
  save: (session: LiveModeSession) =>
    AsyncStorage.setItem(KEY, JSON.stringify(session)),

  clear: () => AsyncStorage.removeItem(KEY),

  get: async (): Promise<LiveModeSession | null> => {
    const raw = await AsyncStorage.getItem(KEY);
    if (!raw) return null;
    try { return JSON.parse(raw); } catch { return null; }
  },
};
```

- [ ] **Step 2: Verify TypeScript passes**

Run from `sarthi-app/`:
```bash
npx tsc --noEmit
```
Expected: zero errors in this file.

- [ ] **Step 3: Commit**

```bash
git add sarthi-app/services/live-mode.persistence.ts
git commit -m "feat: add live mode persistence service (AsyncStorage wrapper)"
```

---

## Task 2: Create `location.service.ts`

**Files:**
- Create: `sarthi-app/services/location.service.ts`

Singleton that owns the `watchPositionAsync` subscription. Survives screen navigations. Requests foreground permission before starting — returns silently if denied.

- [ ] **Step 1: Create the file with full implementation**

```typescript
import * as Location from 'expo-location';
import { socketService } from './socket.service';

class LocationService {
  private subscription: Location.LocationSubscription | null = null;

  async startTracking(): Promise<void> {
    if (this.subscription) return; // already tracking — no-op

    const { status } = await Location.requestForegroundPermissionsAsync();
    if (status !== 'granted') return; // denied — silent return, no throw

    this.subscription = await Location.watchPositionAsync(
      { accuracy: Location.Accuracy.Balanced, timeInterval: 60000, distanceInterval: 0 },
      (loc) => {
        socketService.emit('location_update', {
          lat: loc.coords.latitude,
          lng: loc.coords.longitude,
          timestamp: loc.timestamp,
        });
      }
    );
  }

  stopTracking(): void {
    this.subscription?.remove();
    this.subscription = null;
  }
}

export const locationService = new LocationService();
```

- [ ] **Step 2: Verify TypeScript passes**

```bash
npx tsc --noEmit
```
Expected: zero errors.

- [ ] **Step 3: Commit**

```bash
git add sarthi-app/services/location.service.ts
git commit -m "feat: add location service singleton for persistent tracking"
```

---

## Task 3: Extend Store with `activeTripId`

**Files:**
- Modify: `sarthi-app/stores/live-guide.store.ts`

Add `activeTripId` to the interface, `initialState`, and store implementation. Because `reset()` spreads `initialState`, no change to `reset()` is needed — it will clear `activeTripId` automatically.

- [ ] **Step 1: Add to `LiveGuideState` interface**

In the interface block (after the existing `setActivityAlert` line), add:
```typescript
activeTripId: string | null;
setActiveTripId: (id: string | null) => void;
```

- [ ] **Step 2: Add to `initialState`**

In the `initialState` object (after `activityAlert: null`), add:
```typescript
activeTripId: null,
```

- [ ] **Step 3: Add to store implementation**

In the `create<LiveGuideState>` callback (after the existing `setActivityAlert` implementation), add:
```typescript
setActiveTripId: (activeTripId) => set({ activeTripId }),
```

- [ ] **Step 4: Verify TypeScript passes**

```bash
npx tsc --noEmit
```
Expected: zero errors.

- [ ] **Step 5: Verify existing tests still pass**

```bash
npm test -- --testPathPattern="live-guide" 2>&1 | tail -20
```
Expected: all existing tests pass (store change is additive only).

- [ ] **Step 6: Commit**

```bash
git add sarthi-app/stores/live-guide.store.ts
git commit -m "feat: add activeTripId to live guide store"
```

---

## Task 4: Update `useLiveGuide` Hook

**Files:**
- Modify: `sarthi-app/hooks/useLiveGuide.ts`

Four changes: (1) re-entrancy guard at top of `activate()`, (2) listener deregistration sweep before registering events, (3) persistence + location wired into `guide_activated` handler, (4) persistence + location cleanup in `deactivate()`.

**Read the file first** — the current `activate()` starts at line 9. All four changes go inside this function or in `deactivate()`.

- [ ] **Step 1: Add imports at the top of the file**

After the existing imports, add:
```typescript
import { liveModePersistence } from '@/services/live-mode.persistence';
import { locationService } from '@/services/location.service';
```

- [ ] **Step 2: Add re-entrancy guard as the very first line of `activate()`**

The current first line of `activate()` is `store.setConnectionState('connecting')`. Insert before it:
```typescript
if (store.connectionState !== 'idle') return;
```

- [ ] **Step 3: Add `expo-location` import to `useLiveGuide.ts`**

`useLiveGuide.ts` does **not** currently import `expo-location`. Add this import line at the top of the file, alongside the existing imports:
```typescript
import * as Location from 'expo-location';
```

- [ ] **Step 4: Add background permission request**

After the re-entrancy guard and before `store.setConnectionState('connecting')`, add:
```typescript
await Location.requestBackgroundPermissionsAsync();
// No status check — denied is silently accepted
```

- [ ] **Step 5: Add listener deregistration sweep**

After `store.setConnectionState('connecting')` and before `socketService.connect(token)`, add:
```typescript
const events = [
  'guide_activated', 'activity_marked', 'replan_result',
  'location_suggestion', 'activity_approaching', 'morning_briefing',
  'meal_nudge', 'guide_deactivated', 'error', 'connect', 'disconnect',
] as const;
events.forEach((e) => socketService.off(e));
```

- [ ] **Step 6: Wire persistence and location into `guide_activated` handler**

Find the existing `socketService.on('guide_activated', ...)` handler. After the existing `store.setTodayPlan(...)` call inside it, add:
```typescript
store.setActiveTripId(tripId);
liveModePersistence.save({
  tripId,
  sessionId: payload.sessionId,
  dayIndex: payload.todayPlan.dayIndex,
});
locationService.startTracking();
```

- [ ] **Step 7: Update `deactivate()` function**

The current `deactivate()` is:
```typescript
const deactivate = () => {
  socketService.emit('deactivate_guide');
  socketService.disconnect();
  store.reset();
};
```

Replace with:
```typescript
const deactivate = () => {
  locationService.stopTracking();
  liveModePersistence.clear();
  store.setActiveTripId(null);
  socketService.emit('deactivate_guide');
  socketService.disconnect();
  store.reset();
};
```

- [ ] **Step 8: Verify TypeScript passes**

```bash
npx tsc --noEmit
```
Expected: zero errors.

- [ ] **Step 9: Run tests**

```bash
npm test -- --testPathPattern="useLiveGuide" 2>&1 | tail -30
```
Expected: all existing hook tests still pass.

- [ ] **Step 10: Commit**

```bash
git add sarthi-app/hooks/useLiveGuide.ts
git commit -m "feat: wire persistence and location into useLiveGuide hook"
```

---

## Task 5: Update `notifications.service.ts`

**Files:**
- Modify: `sarthi-app/services/notifications.service.ts`

Add a module-level shared object that the AppState listener in `_layout.tsx` can read. Under Metro/CommonJS, primitive `let` exports are copied at import time — mutations are not visible to importers. An object's property mutations **are** visible because both files share the same object reference.

- [ ] **Step 1: Add `notificationNavState` export at module level**

At the top of the file (before the `getMessaging` function), add:
```typescript
// Shared mutable flag — object property so mutations are visible to all importers under CommonJS/Metro
export const notificationNavState = { navigatingToLiveGuide: false };
```

- [ ] **Step 2: Update `setupTapHandler` to set the flag before navigating**

Replace the existing `setupTapHandler` method body with:
```typescript
setupTapHandler(): void {
  const messaging = getMessaging();
  if (!messaging) return;

  messaging.onNotificationOpenedApp((notification: any) => {
    const tripId = notification?.data?.tripId;
    if (tripId) {
      notificationNavState.navigatingToLiveGuide = true;
      setTimeout(() => { notificationNavState.navigatingToLiveGuide = false; }, 1500);
      router.push(`/trip/${tripId}/live-guide`);
    }
  });

  messaging.getInitialNotification().then((notification: any) => {
    if (!notification) return;
    const tripId = notification?.data?.tripId;
    if (tripId) {
      notificationNavState.navigatingToLiveGuide = true;
      setTimeout(() => { notificationNavState.navigatingToLiveGuide = false; }, 1500);
      router.push(`/trip/${tripId}/live-guide`);
    }
  });
}
```

- [ ] **Step 3: Update existing test mock for `notifications.service`**

In `sarthi-app/__tests__/screens/live-guide.test.tsx`, the existing mock is:
```typescript
jest.mock('@/services/notifications.service', () => ({
  notificationsService: { getCachedToken: () => 'fcm-token' },
}));
```

Update it to also export the new object:
```typescript
jest.mock('@/services/notifications.service', () => ({
  notificationsService: { getCachedToken: () => 'fcm-token' },
  notificationNavState: { navigatingToLiveGuide: false },
}));
```

- [ ] **Step 4: Verify TypeScript passes**

```bash
npx tsc --noEmit
```

- [ ] **Step 5: Run tests**

```bash
npm test -- --testPathPattern="live-guide" 2>&1 | tail -20
```
Expected: all pass.

- [ ] **Step 6: Commit**

```bash
git add sarthi-app/services/notifications.service.ts sarthi-app/__tests__/screens/live-guide.test.tsx
git commit -m "feat: add notificationNavState flag to prevent AppState double-navigate"
```

---

## Task 6: Update `_layout.tsx` — AppState Auto-Resume

**Files:**
- Modify: `sarthi-app/app/_layout.tsx`

Add an AppState listener that navigates to the live guide screen on foreground if a session is saved. Guards: skip if already on that screen (`pathnameRef`), skip if notification tap is handling navigation (`notificationNavState`).

- [ ] **Step 1: Update imports in `_layout.tsx`**

The current imports in `_layout.tsx` are:
- `react`: only imports `useEffect` — **add `useRef`**
- `expo-router`: only imports `Stack` — **add `router` and `usePathname`**

Make these two targeted changes:

```typescript
// Change: import { useEffect } from 'react';
// To:
import { useEffect, useRef } from 'react';

// Change: import { Stack } from 'expo-router';
// To:
import { Stack, router, usePathname } from 'expo-router';
```

Then add three new import lines after the existing imports:
```typescript
import { AppState } from 'react-native';
import { liveModePersistence } from '@/services/live-mode.persistence';
import { notificationNavState } from '@/services/notifications.service';
```

- [ ] **Step 2: Add `pathnameRef` inside `RootLayout` component**

Inside the `RootLayout` function, after the existing state/hook declarations, add:
```typescript
const pathname = usePathname();
const pathnameRef = useRef(pathname);
useEffect(() => { pathnameRef.current = pathname; }, [pathname]);
```

- [ ] **Step 3: Add AppState listener `useEffect`**

Add a new `useEffect` (after the existing ones, before the `return`):
```typescript
useEffect(() => {
  const sub = AppState.addEventListener('change', async (state) => {
    if (state !== 'active') return;

    // Skip if notification tap handler is already navigating to live guide
    if (notificationNavState.navigatingToLiveGuide) return;

    const session = await liveModePersistence.get();
    if (!session) return;

    // Skip if already on the live guide screen for this trip
    const targetPath = `/trip/${session.tripId}/live-guide`;
    if (pathnameRef.current === targetPath) return;

    router.replace(targetPath as any);
  });
  return () => sub.remove();
}, []);
```

- [ ] **Step 4: Verify TypeScript passes**

```bash
npx tsc --noEmit
```
Expected: zero errors.

- [ ] **Step 5: Run full test suite**

```bash
npm test 2>&1 | tail -15
```
Expected: same pass/fail count as before this task (layout tests, if any, still pass).

- [ ] **Step 6: Commit**

```bash
git add sarthi-app/app/_layout.tsx
git commit -m "feat: add AppState auto-resume listener for persistent live mode"
```

---

## Task 7: Update `live-guide.tsx` — Remove Screen Location, Fix Back, Add Stop

**Files:**
- Modify: `sarthi-app/app/trip/[id]/live-guide.tsx`
- Modify: `sarthi-app/__tests__/screens/live-guide.test.tsx`

Three UI changes: (1) remove `watchPositionAsync` and `locationSubscription` ref from screen (location is now owned by `locationService`), (2) back button no longer calls `deactivate()`, (3) Stop button added to header.

- [ ] **Step 1: Write a new test for the Stop button before touching implementation**

In `sarthi-app/__tests__/screens/live-guide.test.tsx`, add inside `describe('LiveGuideScreen', ...)`:
```typescript
it('pressing Stop calls deactivate and navigates back', () => {
  const { getByText } = render(<LiveGuideScreen />);
  fireEvent.press(getByText('■ Stop'));
  expect(mockDeactivate).toHaveBeenCalled();
  expect(require('expo-router').router.back).toHaveBeenCalled();
});

it('pressing back arrow does NOT call deactivate', () => {
  mockDeactivate.mockClear();
  const { getByText } = render(<LiveGuideScreen />);
  fireEvent.press(getByText(`← Jaipur Trip`));
  expect(mockDeactivate).not.toHaveBeenCalled();
});
```

- [ ] **Step 2: Run new tests to verify they fail**

```bash
npm test -- --testPathPattern="live-guide" 2>&1 | tail -20
```
Expected: the two new tests FAIL (Stop button doesn't exist yet, back still calls deactivate).

- [ ] **Step 3: Remove `locationSubscription` ref and `watchPositionAsync` block from `live-guide.tsx`**

Remove this line (the ref declaration near top of component):
```typescript
const locationSubscription = useRef<Location.LocationSubscription | null>(null);
```

Find the `useEffect(() => {`, which currently contains both `activate()` and `Location.watchPositionAsync(...)`. Replace the entire `useEffect` with:
```typescript
useEffect(() => {
  const fcmToken = notificationsService.getCachedToken();
  activate(id ?? '', fcmToken).catch(() => {
    Alert.alert('Live Guide unavailable', 'Live Guide is not available in Expo Go development mode.');
    router.back();
  });
  // No cleanup — session persists after this screen unmounts
}, [id]);
```

Check if `import * as Location from 'expo-location'` is used anywhere else in the file. If not, remove that import line.

- [ ] **Step 4: Fix back button — remove `deactivate()` call**

Find the back button `Pressable` (currently `onPress={() => { deactivate(); router.back(); }}`).

Change to:
```typescript
<Pressable onPress={() => router.back()}>
```

- [ ] **Step 5: Add Stop button to header, next to the Live badge**

Find the `<View style={styles.headerBadges}>` block. Inside it, after the Live badge `<View>`, add:
```tsx
<Pressable style={styles.stopBtn} onPress={() => { deactivate(); router.back(); }}>
  <Text style={styles.stopBtnText}>■ Stop</Text>
</Pressable>
```

- [ ] **Step 6: Add Stop button styles to `makeStyles()`**

Inside the `StyleSheet.create({...})` call, add:
```typescript
stopBtn: {
  backgroundColor: 'rgba(239,68,68,0.1)',
  borderWidth: 1.5,
  borderColor: '#EF4444',
  borderRadius: 10,
  paddingHorizontal: 12,
  paddingVertical: 5,
},
stopBtnText: { fontSize: 11, fontWeight: '700', color: '#EF4444' },
```

- [ ] **Step 7: Update existing location mock in live-guide test — it's no longer used by the screen**

In `sarthi-app/__tests__/screens/live-guide.test.tsx`, the `expo-location` mock:
```typescript
jest.mock('expo-location', () => ({
  watchPositionAsync: jest.fn().mockResolvedValue({ remove: jest.fn() }),
  Accuracy: { Balanced: 3 },
}));
```
Can be removed entirely since the screen no longer imports or uses expo-location directly. Remove it.

- [ ] **Step 8: Run tests — all should pass now**

```bash
npm test -- --testPathPattern="live-guide" 2>&1 | tail -20
```
Expected: all 6 tests pass (4 existing + 2 new).

- [ ] **Step 9: Verify TypeScript passes**

```bash
npx tsc --noEmit
```

- [ ] **Step 10: Commit**

```bash
git add sarthi-app/app/trip/[id]/live-guide.tsx sarthi-app/__tests__/screens/live-guide.test.tsx
git commit -m "feat: remove screen-level location tracking, add Stop button to live guide header"
```

---

## Task 8: Update `trip/[id]/index.tsx` — Live Active Banner

**Files:**
- Modify: `sarthi-app/app/trip/[id]/index.tsx`
- Modify: `sarthi-app/__tests__/screens/trip-detail-live-tile.test.tsx`

When `activeTripId === id`, the Live Guide tile is replaced with a green banner showing "Live Guide is running", a day counter, and a Stop button.

- [ ] **Step 1: Write failing tests for the banner**

Open `sarthi-app/__tests__/screens/trip-detail-live-tile.test.tsx`. Add these two new mocks **at module level** (top of file, before any imports — same place as all other `jest.mock()` calls). `jest.mock` is hoisted by Jest/Babel to before all imports regardless of where you write them, so they must always be at the outermost file scope, never inside a `describe` block.

```typescript
// ADD AT MODULE LEVEL (top of file, alongside other jest.mock calls):
jest.mock('@/stores/live-guide.store', () => ({
  useLiveGuideStore: (selector: any) => selector({
    activeTripId: 'trip-1',
    dayIndex: 1,
  }),
}));

const mockDeactivate = jest.fn();
jest.mock('@/hooks/useLiveGuide', () => ({
  useLiveGuide: () => ({ deactivate: mockDeactivate }),
}));
```

**Why existing tests are unaffected:** The existing `useLocalSearchParams` mock returns `{ id: 'trip-123' }`. The `useLiveGuideStore` mock returns `activeTripId: 'trip-1'`. Since `'trip-1' !== 'trip-123'`, the banner condition `activeTripId === id` is false in all existing tests — they render the normal tile, not the banner. No existing test will break.

Then add a new `describe` block for the banner tests:
```typescript
describe('Live Active Banner', () => {
  it('shows banner when activeTripId matches current trip', () => {
    const { getByText } = render(<TripDetailScreen />);
    expect(getByText('🗺️ Live Guide is running')).toBeTruthy();
    expect(getByText('LIVE MODE ACTIVE')).toBeTruthy();
  });

  it('shows correct day number in banner', () => {
    const { getByText } = render(<TripDetailScreen />);
    expect(getByText(/Day 2/)).toBeTruthy(); // dayIndex 1 → Day 2
  });

  it('pressing Stop in banner calls deactivate', () => {
    const { getByText } = render(<TripDetailScreen />);
    fireEvent.press(getByText('■ Stop'));
    expect(mockDeactivate).toHaveBeenCalled();
  });
});
```

**Note on existing test trip ID:** The banner tests above will use `id: 'trip-123'` from the existing `useLocalSearchParams` mock but the store mock returns `activeTripId: 'trip-1'` — so the banner won't appear for the banner describe tests unless you locally override the `useLocalSearchParams` mock inside `beforeEach` to return `{ id: 'trip-1' }`. Add this inside the `describe('Live Active Banner', ...)` block:
```typescript
beforeEach(() => {
  jest.resetModules();
  // useLocalSearchParams must return trip-1 so banner condition matches
  jest.mock('expo-router', () => ({
    ...jest.requireActual('expo-router'),
    useLocalSearchParams: () => ({ id: 'trip-1' }),
    router: { push: jest.fn(), back: jest.fn() },
    Stack: { Screen: () => null },
  }));
});
```

- [ ] **Step 2: Run new tests to verify they fail**

```bash
npm test -- --testPathPattern="trip-detail-live-tile" 2>&1 | tail -20
```
Expected: new tests FAIL (banner not yet implemented).

- [ ] **Step 3: Add imports to `index.tsx`**

In `sarthi-app/app/trip/[id]/index.tsx`, add to the existing imports:
```typescript
import { useLiveGuide } from '@/hooks/useLiveGuide';
import { useLiveGuideStore } from '@/stores/live-guide.store';
```

- [ ] **Step 4: Add reactive store selectors at top of component**

Inside `TripDetailScreen`, after the existing hook calls, add:
```typescript
const { deactivate } = useLiveGuide();
const activeTripId = useLiveGuideStore((s) => s.activeTripId);
const liveGuideDay = useLiveGuideStore((s) => s.dayIndex);
```

- [ ] **Step 5: Add the Live Active Banner JSX**

Find the `isActiveDay` conditional block in the JSX. Wrap it so that if `activeTripId === id`, the banner shows instead of the normal Live Guide tile. The current structure is:

```tsx
{isActiveDay ? (
  <>...</>
) : (
  <>...</>
)}
```

Change to:

```tsx
{activeTripId === id ? (
  <Pressable style={styles.liveBanner} onPress={() => router.push(`/trip/${id}/live-guide` as any)}>
    <View style={styles.liveBannerLeft}>
      <View style={styles.liveBannerTop}>
        <View style={styles.liveDotPulse} />
        <Text style={styles.liveBannerOverline}>LIVE MODE ACTIVE</Text>
      </View>
      <Text style={styles.liveBannerTitle}>🗺️ Live Guide is running</Text>
      <Text style={styles.liveBannerSub}>Day {(liveGuideDay ?? 0) + 1} · Tracking your location</Text>
    </View>
    <Pressable
      style={styles.liveBannerStop}
      onPress={(e) => { e.stopPropagation(); deactivate(); }}
      hitSlop={8}
    >
      <Text style={styles.liveBannerStopText}>■ Stop</Text>
    </Pressable>
  </Pressable>
) : isActiveDay ? (
  <>
    {/* existing isActiveDay JSX — unchanged */}
  </>
) : (
  <>
    {/* existing non-active-day JSX — unchanged */}
  </>
)}
```

- [ ] **Step 6: Add banner styles to `makeStyles()`**

Inside the `StyleSheet.create({...})` at the bottom, add:
```typescript
liveBanner: {
  backgroundColor: '#1A2A1A',
  borderRadius: 16,
  borderWidth: 2,
  borderColor: '#10B981',
  padding: 14,
  flexDirection: 'row',
  alignItems: 'center',
  gap: 12,
},
liveBannerLeft: { flex: 1, gap: 4 },
liveBannerTop: { flexDirection: 'row', alignItems: 'center', gap: 6 },
liveDotPulse: {
  width: 8, height: 8, borderRadius: 4,
  backgroundColor: '#10B981',
},
liveBannerOverline: {
  fontSize: 9, fontWeight: '700', letterSpacing: 1.5,
  textTransform: 'uppercase', color: '#10B981',
},
liveBannerTitle: { fontSize: 14, fontWeight: '600', color: colors.textPrimary },
liveBannerSub: { fontSize: 11, color: '#10B981' },
liveBannerStop: {
  backgroundColor: 'rgba(16,185,129,0.1)',
  borderWidth: 1.5,
  borderColor: '#10B981',
  borderRadius: 10,
  paddingHorizontal: 14,
  paddingVertical: 8,
},
liveBannerStopText: { fontSize: 12, fontWeight: '700', color: '#10B981' },
```

**Why `#10B981` hardcoded (not `colors.success`):** `colors.success` is `#2E7D32` (light) / `#4CAF50` (dark) — a different green shade. The existing live guide tile uses `#10B981` hardcoded for its live dot. The banner must match that visual, so use `#10B981` directly.

- [ ] **Step 7: Run tests — banner tests should pass**

```bash
npm test -- --testPathPattern="trip-detail" 2>&1 | tail -20
```
Expected: all tests pass.

- [ ] **Step 8: Run full test suite**

```bash
npm test 2>&1 | tail -15
```
Expected: same number of suites pass as at start of Phase 2E work. Zero new failures.

- [ ] **Step 9: Verify TypeScript passes**

```bash
npx tsc --noEmit
```
Expected: zero errors.

- [ ] **Step 10: Commit**

```bash
git add sarthi-app/app/trip/[id]/index.tsx sarthi-app/__tests__/screens/trip-detail-live-tile.test.tsx
git commit -m "feat: add Live Active Banner with Stop button to trip detail screen"
```

---

## Verification Checklist

After all tasks:

1. `npx tsc --noEmit` — zero TypeScript errors across all changed files
2. `npm test` — all suites pass, no regressions
3. **Manual: Activate live mode** → navigate back to trip detail → green banner appears
4. **Manual: Press back** from live guide → session stays alive (back navigates, socket stays connected, banner shows on trip detail)
5. **Manual: Press ■ Stop** in live guide header → session ends, banner gone, Live Guide tile returns on trip detail
6. **Manual: Press ■ Stop** in trip detail banner → same as above
7. **Manual: Background app** while live guide active → foreground it → auto-navigates back to live guide
8. **Manual: Check location** in live guide → location_update still emits to socket while on screen
