# Phase 2D: Live Sarthi Mode — Design Spec

**Date:** 2026-04-16
**Status:** Approved
**Depends on:** Phase 2C (Trip Enrichment) — place context, editable itinerary, trip chat
**Goal:** Turn Sarthi into a real-time travel companion that walks with the user through their trip.

---

## Overview

Live Sarthi Mode is the defining feature of the app — the "Sarthi" (guide/charioteer) comes alive. When activated on a saved trip, the app becomes a real-time companion that knows today's plan, the user's location, and their personality. It suggests what to do now, nudges at meal times, sends push notifications, and replans when things change.

This phase uses **WebSocket** for real-time communication and **Firebase Cloud Messaging (FCM)** for push notifications when the app is in the background.

---

## User Experience

### Activation

User opens a saved trip and taps **"Activate Live Guide"**. This:
1. Establishes a WebSocket connection
2. Registers the device's FCM token for push notifications
3. Starts periodic location sharing (frontend sends location every 15-30 min or on demand)
4. Shows today's plan based on the trip dates
5. Sarthi is now "live" — actively guiding

### What the User Sees

**Morning briefing** (push notification at ~7-8 AM local time, even if app is closed):
> "Good morning! Day 3 of your Meghalaya trip. Weather looks clear — perfect for the Root Bridge trek. Open Sarthi for your full plan."

Opening the app shows the detailed briefing:
> "Today you're headed to the Double Decker Root Bridge. Don't forget: grip shoes, 2L water, and ₹20 entry fee. The hike takes ~3 hours round trip, and you'll want to start by 8 AM to avoid the afternoon crowd."

**Activity tracking** — today's activities shown as a checklist. User marks each as done:
- [x] ~~8:00 AM — Trek to Double Decker Root Bridge~~
- [ ] 12:00 PM — Lunch at local Khasi kitchen
- [ ] 2:30 PM — Rainbow Falls viewpoint
- [ ] 5:00 PM — Drive to Dawki

**Smart suggestions** when user finishes early or skips something:
> "You finished the Root Bridge trek by 10:30 AM — 1.5 hours ahead of schedule! Rainbow Falls is just 20 minutes from here. Want to go now instead of after lunch?"

**Meal-time nudges** (push notification around 1 PM, 7 PM):
> "Lunch time! Your food guide recommends Jadoh at the Khasi kitchen near Tyrna — 10 min walk. Tap to navigate."

**Location-aware context:**
> "You're near Mawlynnong. It's on tomorrow's plan — but since you're here now, want to visit today and we'll reshuffle tomorrow?"

---

## Technical Architecture

### WebSocket Gateway

NestJS `@WebSocketGateway` using Socket.io (included with `@nestjs/platform-socket.io`).

```
WebSocket Events (Client → Server):
  - activate_guide    { tripId: string, fcmToken: string }
  - location_update   { lat: number, lng: number, timestamp: number }
  - mark_done         { dayIndex: number, activityIndex: number }
  - skip_activity     { dayIndex: number, activityIndex: number, reason?: string }
  - request_replan    { dayIndex: number }
  - update_fcm_token  { fcmToken: string }
  - deactivate_guide  {}

WebSocket Events (Server → Client):
  - guide_activated   { todayPlan: DayPlan, briefing: string }
  - suggestion        { type: string, message: string, actions: Action[] }
  - meal_nudge        { meal: string, suggestion: MealSuggestion, mapQuery: string }
  - replan_result     { updatedDayPlan: DayPlan }
  - activity_marked   { dayIndex: number, activityIndex: number, status: 'done' | 'skipped' }
  - error             { message: string }
```

### Push Notifications (Firebase Cloud Messaging)

FCM handles notifications when the app is in the background or closed. The backend uses `firebase-admin` (already a dependency) to send push messages.

#### Notification Types

| Type | Trigger | When Sent |
|---|---|---|
| **Morning briefing** | Scheduled daily during active trip | ~7-8 AM local time |
| **Meal nudge** | Scheduled at meal times | ~8 AM, ~1 PM, ~7 PM |
| **Smart suggestion** | User finishes early / skips | Real-time |
| **Location alert** | User near interesting place | When location update triggers it |
| **Trip reminder** | Day before trip starts | Evening before Day 1 |
| **End of trip** | Trip dates end | Morning after last day |

#### Delivery Strategy

- **App in foreground (WebSocket connected):** Send via WebSocket only. No push notification (avoids duplicate).
- **App in background / closed:** Send via FCM push notification.
- The gateway tracks connection state — if the client is connected, use WebSocket; if disconnected, fall back to FCM.

#### FCM Token Storage

```
UserDevice
  id        String   @id @default(uuid())
  userId    String   (FK -> User)
  fcmToken  String   @unique
  platform  String   (enum: android/ios/web)
  createdAt DateTime @default(now())
  updatedAt DateTime @updatedAt

  @@index([userId])
```

Users can have multiple devices. All active devices receive push notifications.

#### Notification Preferences

Users can control which notifications they receive:

```
NotificationPreferences (stored as JSON on User or as separate fields)
  morningBriefing:  boolean (default: true)
  mealNudges:       boolean (default: true)
  smartSuggestions:  boolean (default: true)
  locationAlerts:   boolean (default: true)
  tripReminders:    boolean (default: true)
```

Added as a JSON field on the `User` model: `notificationPrefs Json?`

### Authentication

WebSocket connections are authenticated via the same Firebase token. The client sends the token during the handshake (`auth: { token: "Bearer ..." }`). The gateway validates it before accepting the connection.

### Connection Lifecycle

```
Client connects with Firebase token + FCM token
  → Server validates Firebase token
  → Server stores/updates FCM token for this user+device
  → Server loads user profile, trip data, personality, corrections
  → Server computes today's date vs trip dates → selects today's plan
  → Server sends guide_activated with today's plan + morning briefing
  
Client sends location_update periodically
  → Server checks proximity to planned activities
  → Server may send suggestion via WebSocket (or FCM if disconnected)
  
Client sends mark_done
  → Server updates activity status
  → Server checks remaining time + remaining activities
  → Server may send suggestion for replanning
  
Client disconnects
  → Server saves current activity statuses to DB
  → Server continues sending scheduled notifications via FCM
  → Guide stays "active" until deactivated or trip ends

Client sends deactivate_guide
  → Server saves state, stops all notifications
  → Connection closed
```

**Key difference from a WebSocket-only design:** The guide remains active even when the app is closed. Scheduled notifications (morning briefing, meal nudges) are sent via FCM regardless of connection state. Only real-time suggestions require an active WebSocket.

### Scheduled Notification Service

A lightweight scheduler that runs on the backend to trigger time-based notifications:

- Checks every minute for active guide sessions
- For each active session, checks if a scheduled notification is due (morning briefing, meal nudge)
- Sends via FCM if user is not WebSocket-connected, via WebSocket if they are

Implementation: NestJS `@Cron` decorator (from `@nestjs/schedule`) or a simple `setInterval` per active session.

### State Management

Live guide state is stored in-memory during active sessions and persisted to DB on disconnect or periodically.

New Prisma model:

```
LiveGuideSession
  id              String    @id @default(uuid())
  tripId          String    (FK -> SavedTrip)
  userId          String    (FK -> User)
  isActive        Boolean   @default(true)
  activatedAt     DateTime
  deactivatedAt   DateTime?
  currentDay      Int       (which day of the trip)
  activityStatus  Json      (map of dayIndex.activityIndex → done/skipped/pending)
  lastLocation    Json?     ({ lat, lng, timestamp })
  lastBriefingAt  DateTime? (when morning briefing was last sent)
  createdAt       DateTime  @default(now())
  updatedAt       DateTime  @updatedAt

  @@index([tripId])
  @@index([userId])
  @@index([isActive])
```

---

## Core Features

### 1. Today's Plan

**Logic:** Compare `today's date` with `trip.dates.from` → compute which day of the trip it is → return that day's itinerary.

Edge cases:
- Before trip starts: "Your trip starts in 3 days! Here's a preview of Day 1."
- After trip ends: "Hope you had an amazing trip! Want to save your experience?"
- Rest day / no activities planned: "Today is a free day. Here are some suggestions based on your location."

### 2. Morning Briefing

AI-generated daily briefing. Prompt includes:
- Today's planned activities
- Traveler personality profile
- Any activities carried over from yesterday (skipped/incomplete)
- Place context cards for today's destinations

**Delivery:** Push notification with short summary + full briefing in-app.

Returns a conversational paragraph — not a list.

### 3. Mark Done / Skip

User marks activities as done or skipped. When skipped:
- A `Correction` is logged (Phase 2B) with the skip reason
- Remaining schedule is evaluated for gaps
- If time freed up, AI suggests alternatives or pulling forward later activities

### 4. Smart Replanning

Triggered when:
- User finishes early (large gap between done activity and next planned one)
- User skips an activity
- User explicitly requests replan
- User's location suggests they've gone off-plan

**Replan logic:**
1. Take remaining undone activities for today
2. Take user's current time and location
3. Send to AI with personality profile: "Given these remaining activities and the current time/location, suggest the optimal order. You may drop activities if time is insufficient."
4. Return reordered/adjusted plan

### 5. Meal-Time Nudges

At configurable meal times (defaults: breakfast 8 AM, lunch 1 PM, dinner 7 PM):
- Check if the food guide has a suggestion for this day/meal
- Add location context if available
- Include map link
- Include personalMatch from personality profile

**Delivery:** Push notification with dish name + distance. Full details in-app.

### 6. Location-Aware Suggestions

When `location_update` arrives:
- Check distance to next planned activity
- Check if user is near any activity from a different day → suggest doing it now
- Check if user is near any notable place not in the itinerary → suggest as bonus
  - This requires a small AI call: "User is at lat/lng near [destination]. What's interesting within 1km that's not in their itinerary?"
  - Rate limited: max 1 location-based suggestion per hour

### 7. Trip Reminders

- **Day before trip:** Push notification: "Your Meghalaya trip starts tomorrow! Here's your Day 1 preview. Don't forget: [packing list items from itinerary]"
- **Morning after last day:** Push notification: "Hope Meghalaya was amazing! Rate your trip and help Sarthi learn your preferences."

---

## AI Calls in Live Mode

Live Sarthi Mode generates several AI calls. To stay within free tier limits:

| Trigger | AI Call | Frequency |
|---|---|---|
| Morning briefing | Yes | 1/day |
| Smart replan | Yes | Max 3/day |
| Meal nudge | No (uses stored food guide data) | — |
| Location suggestion | Yes (small) | Max 1/hour |
| Mark done | No (local logic) | — |
| Trip reminder | No (uses stored itinerary data) | — |

**Total: ~5-6 AI calls per active day** — well within Gemini free tier (15 RPM, 1M tokens/day).

---

## What This Phase Does NOT Include

- Offline mode (Phase 2E)
- Multi-user live sync (e.g., group members seeing each other's location)
- Integration with external APIs for real-time weather/traffic
- SMS/WhatsApp notifications (FCM only)

---

## Module Structure

```
src/
├── live-guide/
│   ├── live-guide.module.ts
│   ├── live-guide.gateway.ts          (WebSocket gateway — handles events)
│   ├── live-guide.gateway.spec.ts
│   ├── live-guide.service.ts          (business logic — today's plan, replan, suggestions)
│   ├── live-guide.service.spec.ts
│   ├── session.service.ts             (session persistence — save/restore guide state)
│   ├── session.service.spec.ts
│   ├── notification.service.ts        (FCM push + scheduled notifications)
│   ├── notification.service.spec.ts
│   ├── scheduler.service.ts           (cron/interval for timed notifications)
│   ├── scheduler.service.spec.ts
│   └── dto/
│       ├── activate-guide.dto.ts
│       ├── location-update.dto.ts
│       └── mark-activity.dto.ts
├── devices/
│   ├── devices.module.ts
│   ├── devices.controller.ts          (register/unregister FCM tokens)
│   ├── devices.service.ts
│   ├── devices.service.spec.ts
│   └── dto/
│       └── register-device.dto.ts
├── ai/
│   └── prompts/
│       ├── live-briefing.prompt.ts    (new — morning briefing prompt)
│       ├── live-replan.prompt.ts      (new — smart replanning prompt)
│       └── live-suggestion.prompt.ts  (new — location-aware suggestion prompt)
│   └── schemas/
│       ├── live-briefing.schema.ts    (new)
│       ├── live-replan.schema.ts      (new)
│       └── live-suggestion.schema.ts  (new)
```

---

## API Endpoints (REST — alongside WebSocket)

| Method | Path | Auth | Description |
|---|---|---|---|
| POST | `/devices` | Yes | Register FCM token for push notifications |
| DELETE | `/devices/:fcmToken` | Yes | Unregister a device |
| GET | `/live-guide/:tripId/status` | Yes | Get current guide session status (for app resume) |
| PATCH | `/users/me/notification-prefs` | Yes | Update notification preferences |

---

## Dependencies

New npm packages needed:
- `@nestjs/websockets` — NestJS WebSocket support
- `@nestjs/platform-socket.io` — Socket.io adapter
- `socket.io` — WebSocket library
- `@nestjs/schedule` — Cron/interval scheduling for timed notifications

`firebase-admin` is already installed — used for both auth and FCM.

---

## Testing Strategy

- Unit tests for WebSocket gateway (mock connections, test event handling)
- Unit tests for today's plan computation (various date scenarios)
- Unit tests for replan logic (mock AI, verify activity reordering)
- Unit tests for session persistence (save/restore state)
- Unit tests for meal-time nudge logic (time-based triggers)
- Unit tests for notification service (verify FCM called when disconnected, WebSocket used when connected)
- Unit tests for scheduler (verify correct timing for morning briefing, meal nudges)
- Unit tests for device registration (CRUD, multiple devices per user)
- Integration test: connect → activate → send location → receive suggestion → mark done → replan
- Edge case tests: trip not started yet, trip already ended, no activities today, all activities done
- Push notification tests: verify delivery falls back to FCM when WebSocket disconnected
