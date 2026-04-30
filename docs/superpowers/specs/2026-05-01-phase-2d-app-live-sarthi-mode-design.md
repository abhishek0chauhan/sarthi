# Phase 2D App — Live Sarthi Mode Design

## Goal

Implement the Live Sarthi Mode feature in the sarthi-app mobile client: real-time WebSocket-driven activity tracking, AI morning briefings, meal nudges via FCM push notifications, and location-based nearby suggestions — all matching the existing Sarthi design system.

## Architecture

**State layer:** Zustand store (`live-guide.store.ts`) holds all live session state. A singleton Socket.io service (`socket.service.ts`) manages the WebSocket connection lifecycle — connects on guide activation, disconnects on deactivation. Hooks (`useLiveGuide.ts`) expose actions to the UI and read reactively from the store.

**Entry point:** The Trip Detail screen detects if today falls within the trip's date range and replaces the large Itinerary tile with a Live Guide tile. Tapping it requests location permission then navigates to the Live Guide screen.

**Tech stack:** `socket.io-client` (install: `npm i socket.io-client`) for WebSocket, `@react-native-firebase/messaging` for FCM, `expo-location` for GPS, Zustand + TanStack React Query (existing patterns), Expo Router for navigation.

---

## Type Definitions

```typescript
// Activity — shape from backend todayPlan array
interface Activity {
  time: string           // e.g. "9:00 AM"
  activity: string       // display name
  cost: number
  healthNote?: string
  mapQuery?: string
  dropped?: boolean
  status?: 'pending' | 'done' | 'skipped'  // client-side tracked in store
}

// Suggestion — shape from backend location_suggestion WS event
// Note: pushSummary is NOT included in the WS event (only used for FCM internally)
interface Suggestion {
  suggestion: string     // AI text
  placeName: string
  mapQuery: string
}

// GuideActivatedPayload — shape of guide_activated event from backend
interface GuideActivatedPayload {
  sessionId: string
  status: 'before' | 'during' | 'after'
  briefing: string | null        // null if AI call failed
  pushSummary: string | null
  // todayPlan is NEVER null at runtime — backend spreads null into { dayIndex } object
  // Check !todayPlan?.activities?.length for empty state — never todayPlan === null
  todayPlan: {
    dayIndex: number             // 0-based index into trip itinerary days
    activities?: Activity[]      // absent when no itinerary exists for this day
  }
}
```

---

## File Structure

### New Files

| File | Responsibility |
|------|---------------|
| `services/socket.service.ts` | Singleton Socket.io client — connection lifecycle, auth token injection, event listeners |
| `stores/live-guide.store.ts` | Zustand store — sessionId, isActive, briefing, todayPlan, nearbySuggestion, connectionState |
| `hooks/useLiveGuide.ts` | Reads store, exposes: activate, markDone, skipActivity, requestReplan, deactivate |
| `app/trip/[id]/live-guide.tsx` | Live Guide screen — briefing card + scrollable activity list |
| `services/notifications.service.ts` | FCM token registration + storage, notification tap → navigate to live guide |

### Modified Files

| File | Change |
|------|--------|
| `app/trip/[id]/index.tsx` | Show Live Guide tile when today is within trip dates |
| `app/(tabs)/profile/index.tsx` | Replace existing local-state Notifications toggle with real API-wired Morning Briefing + Meal Nudges toggles |
| `app/_layout.tsx` | Call `notificationsService.registerDevice()` on auth, set up notification tap listener |
| `sarthi-backend/src/profile/users.controller.ts` | Add `GET me/notification-prefs` endpoint returning `{ notificationPrefs }` |

---

## Socket Events Reference

### Client → Server (emit)

| Event | Payload | Notes |
|-------|---------|-------|
| `activate_guide` | `{ tripId: string, fcmToken?: string }` | Initiates session |
| `location_update` | `{ lat: number, lng: number, timestamp?: number }` | Sent every ~60s from GPS watcher |
| `mark_done` | `{ dayIndex: number, activityIndex: number }` | No sessionId — server reads from socket context |
| `skip_activity` | `{ dayIndex: number, activityIndex: number, reason?: string }` | No sessionId |
| `request_replan` | `{ dayIndex: number }` | No sessionId — dayIndex is required |
| `deactivate_guide` | _(no payload)_ | Ends session |

### Server → Client (listen)

| Event | Payload | Action |
|-------|---------|--------|
| `guide_activated` | `GuideActivatedPayload` | Store session + plan + briefing |
| `activity_marked` | `{ dayIndex: number, activityIndex: number, status: string }` | `store.patchActivity(payload.dayIndex, payload.activityIndex, payload.status)` |
| `replan_result` | `{ activities: Activity[] }` | `store.setTodayPlan(payload.activities)` |
| `location_suggestion` | `Suggestion` | Set nearbySuggestion in store |
| `morning_briefing` | `{ briefing: string, todayPlan: any }` | Update `briefing` in store only — ignore `todayPlan` field |
| `meal_nudge` | `{ meal: string, suggestion: string }` | Show in-app toast/card |
| `guide_deactivated` | _(any)_ | Reset store |
| `error` | `{ message: string }` | Show toast |

---

## Screen Designs

### Trip Detail (`app/trip/[id]/index.tsx`)

**Active trip day (today within trip dates):**
- Large Live Guide tile (`#FEF0E6` background, `#E8601C` border, pulsing green dot, "Day N · Active now") replaces the Itinerary tile
- Itinerary + Food Guide become smaller equal-width secondary tiles beside it
- Tapping Live Guide tile → request `expo-location` `requestForegroundPermissionsAsync()` → on grant, navigate to `/trip/[id]/live-guide` → on deny, show inline prompt with "Open Settings" link and still navigate (guide activates, nearby suggestions disabled)

**Non-active days:**
- Normal layout: large Itinerary tile + Food Guide tile (no Live Guide tile)

**Date check logic:**
```typescript
// trip.dates shape is TripDates: { from: string, to: string } — NOT trip.startDate/endDate
const today = new Date().toISOString().split('T')[0]
const isActiveDay = trip.dates.from <= today && today <= trip.dates.to
```

### Live Guide Screen (`app/trip/[id]/live-guide.tsx`)

**On mount:**
1. Read `fcmToken` from `notificationsService.getCachedToken()`
2. Call `useLiveGuide.activate(tripId, fcmToken)` → emits `activate_guide`
3. Backend responds with `guide_activated` → store updates
4. If `!todayPlan?.activities?.length` → show empty state: "No itinerary for today. Generate one from the trip detail screen."
   Note: `todayPlan` is never truly null — when no itinerary exists the backend returns `{ dayIndex }` with no `activities` field. Always check `activities?.length`, not `todayPlan === null`.
5. Start `expo-location` `watchPositionAsync` with `accuracy: Location.Accuracy.Balanced`, interval 60 000ms → each update emits `location_update`

**On unmount / back:**
- Stop location watcher (`subscription.remove()`)
- Emit `deactivate_guide`
- Socket disconnects

**Layout (top → bottom, scrollable):**
1. **Header** — back button ("← TripName"), "Live Guide" title, green pulsing "Live" badge, "Day N of M · Date" subtitle
2. **Morning Briefing card** — dark (`#1B3A2D`) rounded card, "☀️ MORNING BRIEFING" overline, briefing text, "Generated by Sarthi AI" caption. Hidden if `briefing` is null.
3. **"Today's Plan" section label**
4. **Activity list:**
   - Past activities (`status === 'done' | 'skipped'`): dimmed (opacity 0.45), "✓ Done" or "Skipped" tag
   - Current activity (first `status === 'pending'`): saffron border, "NOW · HH:MM", Done + Skip + Replan Day buttons
   - Upcoming activities: normal opacity, no action buttons
5. **Nearby suggestion card** (saffron-light `#FEF0E6`) — appears below current activity when `nearbySuggestion` is set. Shows `placeName` + `suggestion` text.

**Activity actions:**
- **Done** → optimistic patch activity to `done` → emit `mark_done { dayIndex, activityIndex }` → rollback + toast on `error` event
- **Skip** → optimistic patch to `skipped` → emit `skip_activity { dayIndex, activityIndex }` → rollback on error
- **Replan Day** → emit `request_replan { dayIndex }` → show loading spinner on button → on `replan_result`, replace activities → on `error` with rate-limit message show toast "You've used all replans for today"

**Foreground socket events:**
- `morning_briefing` → update `briefing` in store
- `meal_nudge` → show toast with meal suggestion text
- `location_suggestion` → set `nearbySuggestion` in store

**Connection state:**
- `reconnecting` → subtle amber banner "Reconnecting…" at top of screen
- On reconnect → re-emit `activate_guide` (same `tripId` + `fcmToken`) to restore full session state. Do not use REST `/status` (it does not return `todayPlan`).

### Profile Screen (`app/(tabs)/profile/index.tsx`)

**Replace** the existing local-state-only `Notifications` toggle (currently `const [notifs, setNotifs] = useState(true)`, not wired to any API) with two real API-backed toggles in a `NOTIFICATIONS` section:

- **Morning Briefing** — "Daily AI briefing at 7 AM during your trip"
  - `PATCH /users/me/notification-prefs { morningBriefing: bool }`
- **Meal Nudges** — "Breakfast, lunch & dinner reminders"
  - `PATCH /users/me/notification-prefs { mealNudges: bool }`

On mount: fetch current prefs via `GET /users/me/notification-prefs` — **this endpoint does not yet exist and must be added to the backend's `UsersController`** (`src/profile/users.controller.ts`). It should return `{ notificationPrefs: { morningBriefing: boolean, mealNudges: boolean } }` by reading `user.notificationPrefs` from the database. Add it alongside the existing `PATCH me/notification-prefs` route. Each toggle updates optimistically and rolls back on API error.

---

## Services

### `socket.service.ts`

```typescript
class SocketService {
  private socket: Socket | null = null

  connect(token: string): void
    // init with io(WS_URL, { auth: { token }, transports: ['websocket'] })
    // WS_URL from config/api.ts

  disconnect(): void          // socket.disconnect(), clear all listeners
  emit(event: string, data?: any): void
  on(event: string, cb: (data: any) => void): void
  off(event: string): void
  isConnected(): boolean
}

export const socketService = new SocketService()  // singleton
```

### `notifications.service.ts`

```typescript
class NotificationsService {
  private cachedToken: string | null = null

  async registerDevice(): Promise<void>
    // messaging().getToken() → store in this.cachedToken
    // → POST /devices { fcmToken, platform: 'android' | 'ios' }

  getCachedToken(): string | null  // read by useLiveGuide.activate

  setupTapHandler(): void
    // messaging().onNotificationOpenedApp → parse tripId from notification.data
    // → router.push(`/trip/${tripId}/live-guide`)
    // Also check messaging().getInitialNotification() for cold-start taps
}

export const notificationsService = new NotificationsService()
```

### `live-guide.store.ts` (Zustand)

```typescript
interface LiveGuideState {
  sessionId: string | null
  isActive: boolean
  connectionState: 'idle' | 'connecting' | 'connected' | 'reconnecting'
  briefing: string | null
  dayIndex: number | null
  todayPlan: Activity[] | null    // null = no itinerary for today
  nearbySuggestion: Suggestion | null
}

// Actions: setSession, setBriefing, setTodayPlan, patchActivity,
//          setSuggestion, setConnectionState, reset
```

---

## Data Flow

```
App start (_layout.tsx)
  → notificationsService.registerDevice()   // store FCM token
  → notificationsService.setupTapHandler()  // handle background tap

User taps Live Guide tile (trip/[id]/index.tsx)
  → requestForegroundPermissionsAsync()
  → navigate to /trip/[id]/live-guide

Live Guide screen mounts
  → fcmToken = notificationsService.getCachedToken()
  → firebaseIdToken = await authService.getToken()  // from services/auth.service.ts
  //   returns null in Expo Go dev mode — socket will be rejected; show error + navigate back
  → socketService.connect(firebaseIdToken)
  → socket.emit('activate_guide', { tripId, fcmToken })
  → receive 'guide_activated' → store.setSession + setBriefing + setTodayPlan
  → start Location.watchPositionAsync → each tick: emit 'location_update'

User taps Done on activity
  → store.patchActivity(idx, 'done')  [optimistic]
  → socket.emit('mark_done', { dayIndex, activityIndex })
  → receive 'activity_marked' → confirms state
  → receive 'error' → rollback + toast

User taps Replan Day
  → socket.emit('request_replan', { dayIndex })
  → receive 'replan_result' → store.setTodayPlan(newActivities)

Backend pushes location_suggestion
  → store.setSuggestion(suggestion)
  → UI shows suggestion card below current activity

FCM notification tap (app in background/killed)
  → notificationsService tap handler fires
  → router.push('/trip/[tripId]/live-guide')
  → screen activates guide as normal

Socket disconnects
  → store.setConnectionState('reconnecting')
  → socket.io auto-reconnects
  → on reconnect: re-emit 'activate_guide' to restore full session

Back button pressed
  → stop location watcher
  → socket.emit('deactivate_guide')
  → socketService.disconnect()
  → store.reset()
```

---

## Error Handling

| Scenario | Behaviour |
|----------|-----------|
| Socket disconnects mid-session | `connectionState = 'reconnecting'`, amber banner, auto-reconnect, re-emit `activate_guide` on reconnect |
| Location permission denied | Navigate to live guide anyway, skip starting location watcher, show inline "Enable location for nearby suggestions" prompt |
| FCM token unavailable | Skip device registration silently, WS still works, activate guide with no `fcmToken` |
| Action fails (mark done / skip) | Rollback optimistic update, toast "Couldn't update, try again" |
| Replan rate limited (error message contains "limit") | Toast "You've used all replans for today" |
| `todayPlan.activities` empty or absent after activation | Show empty state: "No itinerary for today. Generate one from the trip detail screen." — check `!todayPlan?.activities?.length`, not `todayPlan === null` |
| `firebaseIdToken` is null (Expo Go dev mode) | Show toast "Live Guide unavailable in Expo Go", navigate back |
| Cold-start from notification when not logged in | Auth check in `_layout.tsx` redirects to login first; after login, deep link resumes |

---

## Testing

| Test | Type | What it verifies |
|------|------|-----------------|
| `live-guide.store` state transitions | Unit | `setTodayPlan`, `patchActivity`, `setSuggestion`, `reset` produce correct state |
| `socket.service` event emission | Unit | Correct events emitted with correct payloads (mock `socket.io-client`) |
| `useLiveGuide` hook — activate | Unit | Calls `socketService.connect`, emits `activate_guide`, updates store |
| `useLiveGuide` hook — markDone optimistic + rollback | Unit | Patches store immediately, rolls back on error event |
| Trip Detail — active day | Integration | Live Guide tile visible when today in trip date range |
| Trip Detail — non-active day | Integration | Live Guide tile absent, normal Itinerary + Food layout shown |
| Notification tap handler — foreground | Integration | `setupTapHandler` pushes correct route |
| Notification tap handler — cold start | Integration | `getInitialNotification` navigates correctly after auth |
| Profile prefs fetch + toggle | Integration | Prefs fetched on mount, toggle calls PATCH, rolls back on error |
