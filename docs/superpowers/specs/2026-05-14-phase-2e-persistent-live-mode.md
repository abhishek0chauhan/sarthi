# Phase 2E: Persistent Live Mode — Design Spec

**Date:** 2026-05-14  
**Status:** Approved  

---

## Goal

Keep the Live Guide session alive when the user navigates away from the live guide screen or backgrounds the app. Location tracking continues in the background (with "Always" permission). When the app is reopened, it auto-resumes to the live guide screen. A "Stop Live Mode" button on both the trip detail page and the live guide header is the only way to end the session.

---

## Background

Currently, live mode is tied to the `live-guide.tsx` screen's lifecycle. Navigating back calls `deactivate()`, which disconnects the socket and stops location tracking. This means the user must stay on the live guide screen to receive location-based suggestions and activity alerts.

Phase 2E decouples live mode from the screen lifecycle so the session persists until explicitly stopped.

---

## Architecture

Five components work together:

| Component | Role |
|-----------|------|
| `services/live-mode.persistence.ts` (new) | AsyncStorage wrapper — saves/loads/clears active session state |
| `services/location.service.ts` (new) | Singleton owning the `watchPositionAsync` subscription — persists across screen navigations |
| `stores/live-guide.store.ts` (extend) | Add `activeTripId` field so UI can read live mode status without hitting AsyncStorage |
| `app/_layout.tsx` (extend) | AppState listener — auto-navigates to live guide on foreground if session is active and not already there |
| UI changes (trip detail + live guide) | Live Active banner, Stop buttons, back arrow behavior fix |

---

## New Files

### `sarthi-app/services/live-mode.persistence.ts`

Thin AsyncStorage wrapper with a fixed key. Three methods only.

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

---

### `sarthi-app/services/location.service.ts`

Singleton that owns the `watchPositionAsync` subscription. Screen components call `startTracking` / `stopTracking`; the subscription survives navigation.

`startTracking` checks and requests foreground permission before starting the watcher. If denied, it returns without throwing — location simply does not track.

```typescript
import * as Location from 'expo-location';
import { socketService } from './socket.service';

class LocationService {
  private subscription: Location.LocationSubscription | null = null;

  async startTracking(): Promise<void> {
    if (this.subscription) return; // already tracking

    // Ensure foreground permission — required for watchPositionAsync
    const { status } = await Location.requestForegroundPermissionsAsync();
    if (status !== 'granted') return;

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

**Note:** `index.tsx`'s `handleLiveGuidePress` currently calls `Location.requestForegroundPermissionsAsync()` before navigating. This call should remain as-is — it is the user-facing permission prompt. `locationService.startTracking()` re-checks permission silently as a safety guard for the notification-tap and AppState auto-resume code paths that bypass `handleLiveGuidePress`.

---

## Modified Files

### `sarthi-app/stores/live-guide.store.ts`

Add `activeTripId` to the `LiveGuideState` interface, `initialState`, and store implementation.

```typescript
// Add to LiveGuideState interface:
activeTripId: string | null;
setActiveTripId: (id: string | null) => void;

// Add to initialState object (this ensures reset() clears it):
activeTripId: null,

// Add to store implementation:
setActiveTripId: (activeTripId) => set({ activeTripId }),
```

**Critical:** `initialState` must include `activeTripId: null`. The existing `reset()` spreads `initialState`, so adding it there ensures `reset()` clears `activeTripId` automatically — no change to `reset()` is needed.

---

### `sarthi-app/hooks/useLiveGuide.ts`

#### Re-entrancy guard

Add at the very top of `activate()`, before anything else. Prevents double-activation and ensures the listener deregistration below does not wipe in-flight listeners if `activate()` is called while a connection is already live:

```typescript
if (store.connectionState !== 'idle') return;
```

#### Listener deregistration guard

`activate()` registers multiple socket event listeners. If `activate()` is called more than once (e.g., on reconnect after `deactivate()` clears the socket), listeners accumulate and fire multiple times. After the re-entrancy guard, before registering any listener, call `socketService.off(eventName)` to remove any prior registration. This is only safe to run when `connectionState === 'idle'` (enforced by the guard above), meaning `socketService.disconnect()` has already been called and `this.socket` is null, so `off()` is a no-op on any residual internal socket:

```typescript
// Runs only when connectionState === 'idle' (socket already null)
const events = [
  'guide_activated', 'activity_marked', 'replan_result',
  'location_suggestion', 'activity_approaching', 'morning_briefing',
  'meal_nudge', 'guide_deactivated', 'error', 'connect', 'disconnect',
];
events.forEach((e) => socketService.off(e));
```

#### Background permission request

After the foreground permission check (already handled by `locationService.startTracking`), request background permission. Do not block activation if denied:

```typescript
// Inside activate(), before socketService.connect():
await Location.requestBackgroundPermissionsAsync();
// No check on status — denied is silently accepted
```

#### `guide_activated` handler additions

Inside the existing `guide_activated` socket listener, after calling `store.setSession()` and `store.setTodayPlan()`, add:

```typescript
store.setActiveTripId(tripId); // tripId is the parameter passed to activate()
liveModePersistence.save({ tripId, sessionId: payload.sessionId, dayIndex: payload.todayPlan.dayIndex });
locationService.startTracking(); // starts or no-ops if already running
```

#### `deactivate()` additions

In the `deactivate()` function, before the existing calls:

```typescript
locationService.stopTracking();
liveModePersistence.clear();
store.setActiveTripId(null);
// existing: socketService.emit('deactivate_guide'), socketService.disconnect(), store.reset()
```

Note: `store.reset()` (existing) will also clear `activeTripId` because it is in `initialState`. The explicit `store.setActiveTripId(null)` call above is a safety guard in case the order of execution matters for any reactive UI.

---

### `sarthi-app/app/_layout.tsx`

Add an AppState listener that auto-resumes live mode. The listener must **not** navigate if the user is already on the live guide screen, and must **not** double-navigate when the notification tap handler fires at the same time.

**The race problem:** when a notification is tapped while the app is backgrounded, the OS brings the app to the foreground (firing `AppState 'active'`) and the notification tap handler both run. Both would navigate to the same route. The fix is a module-level flag (outside the React component) that the notification tap handler sets before navigating — so the AppState listener sees it and skips.

**Add a shared nav-state object in `services/notifications.service.ts`:**

Metro (React Native's bundler) compiles modules as CommonJS, where primitive `let` exports are copied at import time — changes in the exporting module are not reflected in importers. To share mutable state, export an **object** whose property is mutated. Both the exporting module and all importers reference the same object in memory:

```typescript
// Module-level object — property mutations visible to all importers under CommonJS
export const notificationNavState = { navigatingToLiveGuide: false };
```

**Update `setupTapHandler` in `notifications.service.ts`** to set the flag before navigating:

```typescript
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
```

**In `app/_layout.tsx`:**

```typescript
import { AppState } from 'react-native';
import { liveModePersistence } from '@/services/live-mode.persistence';
import { notificationNavState } from '@/services/notifications.service';
import { router, usePathname } from 'expo-router';
import { useRef, useEffect } from 'react';

// Inside the root layout component:
const pathname = usePathname();
const pathnameRef = useRef(pathname);
useEffect(() => { pathnameRef.current = pathname; }, [pathname]);

useEffect(() => {
  const sub = AppState.addEventListener('change', async (state) => {
    if (state !== 'active') return;

    // Skip if notification tap handler is already navigating to live guide
    if (notificationNavState.navigatingToLiveGuide) return;

    const session = await liveModePersistence.get();
    if (!session) return;

    // Do not navigate if already on the live guide screen for this trip
    const targetPath = `/trip/${session.tripId}/live-guide`;
    if (pathnameRef.current === targetPath) return;

    router.replace(targetPath as any);
  });
  return () => sub.remove();
}, []);
```

The `pathnameRef` check prevents the navigation loop. The `notificationNavState.navigatingToLiveGuide` flag (object property, visible across all importers under CommonJS/Metro) prevents double-navigation when a notification tap and AppState foreground fire together.

---

### `sarthi-app/services/notifications.service.ts`

Add module-level flag and update `setupTapHandler` as described in the `_layout.tsx` section above. This is the key change that allows the AppState listener to detect an in-flight notification navigation and skip its own navigate call.

---

### `sarthi-app/app/trip/[id]/index.tsx`

**Imports to add:**
```typescript
import { useLiveGuide } from '@/hooks/useLiveGuide';
import { useLiveGuideStore } from '@/stores/live-guide.store';
```

**At top of component, add:**
```typescript
const { deactivate } = useLiveGuide();
const activeTripId = useLiveGuideStore((s) => s.activeTripId);
const dayIndex = useLiveGuideStore((s) => s.dayIndex); // reactive — re-renders when dayIndex changes
```

**Note on cold-launch gap:** On a cold launch, the Zustand store resets to `initialState` (so `activeTripId` is `null`), even if a session exists in AsyncStorage. The AppState listener in `_layout.tsx` will fire shortly after launch and navigate to live guide where the store gets repopulated. During the brief window before that happens, the banner will not show on `index.tsx`. This is an acceptable gap — the user will be auto-navigated to live guide before they can notice the missing banner.

**Live Active Banner** — replace the Live Guide tile (`isActiveDay` block) with a conditional:

```tsx
{activeTripId === id ? (
  // Live Active Banner
  <Pressable style={styles.liveBanner} onPress={() => router.push(`/trip/${id}/live-guide` as any)}>
    <View style={styles.liveBannerLeft}>
      <View style={styles.liveBannerTop}>
        <View style={styles.liveDotPulse} />
        <Text style={styles.liveBannerOverline}>LIVE MODE ACTIVE</Text>
      </View>
      <Text style={styles.liveBannerTitle}>🗺️ Live Guide is running</Text>
      <Text style={styles.liveBannerSub}>Day {(dayIndex ?? 0) + 1} · Tracking your location</Text>
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
  // existing Live Guide tile and secondary tiles — unchanged
  <>
    <View style={styles.tilesGrid}>
      {/* ... existing JSX ... */}
    </View>
    {/* ... rest of isActiveDay block ... */}
  </>
) : (
  // existing non-active-day tiles — unchanged
  <>
    {/* ... existing JSX ... */}
  </>
)}
```

**New styles:**
```typescript
liveBanner: {
  backgroundColor: '#1A2A1A',
  borderRadius: 16,
  borderWidth: 2,
  borderColor: colors.success,
  padding: 14,
  flexDirection: 'row',
  alignItems: 'center',
  gap: 12,
},
liveBannerLeft: { flex: 1, gap: 4 },
liveBannerTop: { flexDirection: 'row', alignItems: 'center', gap: 6 },
liveDotPulse: {
  width: 8, height: 8, borderRadius: 4,
  backgroundColor: colors.success,
},
liveBannerOverline: {
  fontSize: 9, fontWeight: '700', letterSpacing: 1.5,
  textTransform: 'uppercase', color: colors.success,
},
liveBannerTitle: { fontSize: 14, fontWeight: '600', color: colors.textPrimary },
liveBannerSub: { fontSize: 11, color: colors.success },
liveBannerStop: {
  backgroundColor: 'rgba(16,185,129,0.1)',
  borderWidth: 1.5,
  borderColor: colors.success,
  borderRadius: 10,
  paddingHorizontal: 14,
  paddingVertical: 8,
},
liveBannerStopText: { fontSize: 12, fontWeight: '700', color: colors.success },
```

---

### `sarthi-app/app/trip/[id]/live-guide.tsx`

#### Back button — stop deactivating on back

```tsx
// Before:
<Pressable onPress={() => { deactivate(); router.back(); }}>

// After (navigate only — session stays alive):
<Pressable onPress={() => router.back()}>
```

#### Add Stop button to header

Add next to the Live badge:
```tsx
<Pressable style={styles.stopBtn} onPress={() => { deactivate(); router.back(); }}>
  <Text style={styles.stopBtnText}>■ Stop</Text>
</Pressable>
```

#### Remove location tracking from screen's `useEffect`

The `useEffect` at the top currently:
1. Calls `activate()` ✅ keep
2. Calls `Location.watchPositionAsync(...)` and stores subscription ❌ remove — `locationService` handles this now
3. Returns cleanup that calls `locationSubscription.current?.remove()` and `deactivate()` ❌ remove both — location is owned by `locationService`, deactivate is now explicit-only

**New `useEffect`:**
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

Remove the `locationSubscription` ref entirely:
```typescript
// Remove this line:
const locationSubscription = useRef<Location.LocationSubscription | null>(null);
```

The `import * as Location from 'expo-location'` at the top can also be removed unless it is used elsewhere in the file for permission checks. Verify before removing.

#### New stop button styles

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

---

## Lifecycle Summary

| Scenario | Behavior |
|----------|----------|
| User activates live mode | Background permission requested → socket connects → guide_activated received → persistence saved, activeTripId set, location starts |
| User navigates back from live guide | `router.back()` only — session stays, location keeps tracking, banner appears on trip detail |
| App backgrounded | Socket stays connected, location tracks if background permission granted |
| App fully closed | Socket disconnects, location stops. Zustand store resets (activeTripId → null). Persistence remains. FCM still delivers activity notifications |
| App reopened (cold launch) | AppState fires `active` → persistence read → if session found and not already on live guide screen, `router.replace` to live guide → socket reconnects → store repopulated |
| Trip detail visited on cold launch (before AppState fires) | `activeTripId` is null, banner not shown. AppState fires shortly after, user is redirected to live guide. Brief gap is acceptable |
| Notification tapped (app backgrounded) | `onNotificationOpenedApp` → sets `notificationNavState.navigatingToLiveGuide = true` → `router.push` to live guide. AppState listener sees flag and skips its own navigate |
| Notification tapped (app closed) | `getInitialNotification` → `router.push` to live guide. Normal reconnect flow |
| User presses Stop (trip detail or live guide) | `deactivate()` → persistence cleared → activeTripId null → location stops → socket disconnects → banner gone |

---

## Error Handling

- **Background permission denied** — live mode still starts. Location only tracks while app is foregrounded. No error shown.
- **Foreground permission denied** — `locationService.startTracking()` returns silently. Location does not track. Live mode socket connection still works; activity alerts and briefings still arrive via FCM.
- **AsyncStorage failure on save** — log warning, continue. Session won't auto-resume on restart but functions normally while app is open.
- **AsyncStorage failure on read** — treat as no session, skip auto-navigate.
- **Socket disconnects while backgrounded** — existing reconnect logic in `useLiveGuide.ts` re-emits `activate_guide` on reconnect. Listener deregistration guard in `activate()` prevents listener accumulation across reconnects.
- **Session resume on cold launch / reconnect** — the backend's `activateGuide` service (`live-guide.service.ts:98`) calls `sessionService.findActive(tripId, userId)` first. If an active session exists, it reuses it and returns the existing `sessionId`, `briefing`, and `todayPlan`. Calling `activate_guide` again after reconnect or cold launch is idempotent — no duplicate session, no data loss. No backend changes are needed for Phase 2E.

---

## Out of Scope

- Background location tasks via Expo TaskManager (app-closed tracking) — explicitly deferred
- Ongoing persistent Android notification ("Live Guide is running") — deferred
- Multi-trip live mode — only one trip active at a time (enforced by single persistence key)
- Lock screen widget or iOS Live Activity — deferred
