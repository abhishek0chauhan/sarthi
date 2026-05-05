# Phase 2D Backend Improvements Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build activity time notifications and personalized location suggestions for Live Sarthi Mode backend.

**Architecture:** Two new features integrated into existing Live Guide WebSocket gateway: (1) Activity Scheduler service calculates travel times + schedules notifications, (2) Enhanced AI service generates personalized suggestions using cached user profile. Both hook into LiveGuideService on guide activation and operate during location updates.

**Tech Stack:** NestJS, Prisma ORM, Socket.io WebSocket, Google Maps Distance Matrix API, Claude AI, Firebase Cloud Messaging (FCM)

---

## File Structure

### New Files
- `src/live-guide/activity-scheduler.service.ts` — Travel time calculation, scheduling logic
- `src/live-guide/dto/activity-approaching.dto.ts` — Type definitions
- `src/live-guide/entities/activity-schedule.entity.ts` — Database entity for persistence

### Modified Files
- `src/live-guide/live-guide.service.ts` — Initialize scheduler, cache profile, pass profile to AI
- `src/ai/ai.service.ts` — Add user profile context to location suggestion generation
- `src/live-guide/live-guide.gateway.ts` — Emit new WebSocket events
- `src/prisma/schema.prisma` — Add ActivitySchedule model

---

## Task 1: Database Schema & Prisma Setup

**Files:**
- Modify: `sarthi-backend/prisma/schema.prisma`
- Modify: `sarthi-backend/src/live-guide/entities/activity-schedule.entity.ts` (create)

- [ ] **Step 1: Add ActivitySchedule model to schema.prisma**

```prisma
model ActivitySchedule {
  id                String    @id @default(cuid())
  sessionId         String
  liveGuideSession  LiveGuideSession @relation(fields: [sessionId], references: [id], onDelete: Cascade)
  tripId            String
  userId            String
  dayIndex          Int
  activityIndex     Int
  activity          String
  scheduledTime     DateTime
  distance          Int       // meters
  estimatedTravelTime Int     // minutes
  notificationSent  Boolean   @default(false)
  idempotencyKey    String    @unique
  createdAt         DateTime  @default(now())
  updatedAt         DateTime  @updatedAt

  @@index([sessionId])
  @@index([tripId, userId])
  @@index([notificationSent, scheduledTime])
}
```

- [ ] **Step 2: Create Prisma migration**

Run: `npm run prisma migrate dev --name add_activity_schedule`

Expected: Migration created, schema.prisma updated

- [ ] **Step 3: Create entity type file**

File: `src/live-guide/entities/activity-schedule.entity.ts`

```typescript
export interface ActivityScheduleEntity {
  id: string;
  sessionId: string;
  tripId: string;
  userId: string;
  dayIndex: number;
  activityIndex: number;
  activity: string;
  scheduledTime: Date;
  distance: number;
  estimatedTravelTime: number;
  notificationSent: boolean;
  idempotencyKey: string;
  createdAt: Date;
  updatedAt: Date;
}
```

- [ ] **Step 4: Commit**

```bash
git add prisma/schema.prisma src/live-guide/entities/activity-schedule.entity.ts
git commit -m "feat: add ActivitySchedule database schema"
```

---

## Task 2: Activity Scheduler Service

**Files:**
- Create: `sarthi-backend/src/live-guide/activity-scheduler.service.ts`
- Create: `sarthi-backend/src/live-guide/dto/activity-approaching.dto.ts`

- [ ] **Step 1: Create DTO type definitions**

File: `src/live-guide/dto/activity-approaching.dto.ts`

```typescript
export class ActivityApproachingDto {
  activityIndex: number;
  activity: string;
  timeToLeave: number;        // Unix timestamp ms
  distance: number;           // meters
  estimatedTravelTime: number; // minutes
  mapQuery: string;
  travelPaceAdjustment: string;
}

export interface ScheduledActivityRecord {
  activityIndex: number;
  activity: string;
  scheduledTime: number;
  distance: number;
  estimatedTravelTime: number;
  idempotencyKey: string;
}
```

- [ ] **Step 2: Create activity scheduler service**

File: `src/live-guide/activity-scheduler.service.ts`

```typescript
import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import type { TravelerProfile } from '../profile/types';

interface Activity {
  time: string;
  activity: string;
  mapQuery?: string;
}

@Injectable()
export class ActivitySchedulerService {
  private readonly logger = new Logger(ActivitySchedulerService.name);

  constructor(private readonly prisma: PrismaService) {}

  // Calculate travel time based on distance + user pace
  calculateTravelTime(
    distanceMeters: number,
    userPace: string,
    transportMode: string = 'public_transit'
  ): number {
    const speeds = {
      walking: 1.4,        // m/s (5 km/h)
      public_transit: 8.3, // m/s (30 km/h)
      taxi: 8.3,
      car: 11.1
    };

    const speed = speeds[transportMode as keyof typeof speeds] || speeds.public_transit;
    const baseTravelTime = (distanceMeters / speed) / 60; // minutes

    const bufferMultipliers = {
      packed: 1.2,
      loose: 1.1,
      no_plan: 1.0
    };

    const multiplier = bufferMultipliers[userPace as keyof typeof bufferMultipliers] || 1.0;
    return Math.ceil(baseTravelTime * multiplier);
  }

  // Generate idempotency key to prevent duplicates
  generateIdempotencyKey(tripId: string, dayIndex: number, activityIndex: number, scheduledTime: number): string {
    return `${tripId}:${dayIndex}:${activityIndex}:${scheduledTime}`;
  }

  // Time string (e.g. "9:00 AM") to minutes since midnight
  parseActivityTime(timeStr: string): number {
    // Parse "9:00 AM" or "14:30" format
    const match = timeStr.match(/(\d{1,2}):(\d{2})(?:\s*(AM|PM))?/i);
    if (!match) return 0;

    let hours = parseInt(match[1], 10);
    const minutes = parseInt(match[2], 10);
    const period = match[3]?.toUpperCase();

    if (period === 'PM' && hours !== 12) hours += 12;
    if (period === 'AM' && hours === 12) hours = 0;

    return hours * 60 + minutes;
  }

  // Check if current time is past activity time
  isActivityTime(activityTimeStr: string): boolean {
    const now = new Date();
    const currentMinutes = now.getHours() * 60 + now.getMinutes();
    const activityMinutes = this.parseActivityTime(activityTimeStr);
    return currentMinutes >= activityMinutes;
  }
}
```

- [ ] **Step 3: Commit**

```bash
git add src/live-guide/dto/activity-approaching.dto.ts src/live-guide/activity-scheduler.service.ts
git commit -m "feat: add ActivitySchedulerService for travel time calculation"
```

---

## Task 3: Enhance AI Service for Personalized Suggestions

**Files:**
- Modify: `sarthi-backend/src/ai/ai.service.ts`
- Create: `sarthi-backend/src/ai/prompts/personalized-location.prompt.ts`

- [ ] **Step 1: Create personalized location suggestion prompt**

File: `src/ai/prompts/personalized-location.prompt.ts`

```typescript
export function buildPersonalizedLocationPrompt(
  destination: string,
  state: string,
  userProfile: any,
  availableMinutes: number,
  nearbyPlaces: any[],
  alreadyPlanned: string[]
): { system: string; user: string } {
  return {
    system: `You are a travel AI that understands regional travel preferences. Generate ONE nearby place suggestion that matches the traveler's style, not just any tourist spot.`,
    user: `Suggest a nearby place for a traveler in ${destination}, ${state}.

**Traveler Profile:**
- Travel pace: ${userProfile.travelPace}
- Interests: ${userProfile.travelMotivations?.join(', ') || 'unknown'}
- Budget style: ${userProfile.spendingStyle}
- Activity level: ${userProfile.physicalReadiness}
- Comfort preference: ${userProfile.comfortLevel}
- Travel style: ${userProfile.depthVsBreadth}
- Crowd tolerance: ${userProfile.crowdTolerance}

**Context:**
- Available time: ${availableMinutes} minutes
- Already planned today: ${alreadyPlanned.join(', ') || 'nothing specific'}

**Nearby places to consider:**
${nearbyPlaces.map((p: any) => `- ${p.name} (${p.type}, ${p.distance}m away)`).join('\n')}

**Generate:**
1. Pick ONE place that matches their style
2. Explain WHY it matches (reference their profile)
3. Include distance and time estimate
4. Score your confidence 0-100

Respond as JSON:
{
  "placeName": "<place name>",
  "reasoning": "<why this matches their style>",
  "distance": <meters>,
  "estimatedTime": <minutes to visit>,
  "confidence": <0-100>
}`,
  };
}
```

- [ ] **Step 2: Add method to AI service**

Modify: `src/ai/ai.service.ts` — add new method:

```typescript
async generatePersonalizedLocationSuggestion(
  destination: string,
  state: string,
  userProfile: any,
  availableMinutes: number,
  nearbyPlaces: any[],
  alreadyPlanned: string[]
): Promise<{ placeName: string; reasoning: string; distance: number; estimatedTime: number; confidence: number }> {
  const prompt = buildPersonalizedLocationPrompt(
    destination,
    state,
    userProfile,
    availableMinutes,
    nearbyPlaces,
    alreadyPlanned
  );

  const response = await this.callAI(prompt);
  return JSON.parse(response);
}
```

- [ ] **Step 3: Commit**

```bash
git add src/ai/prompts/personalized-location.prompt.ts src/ai/ai.service.ts
git commit -m "feat: add personalized location suggestion to AI service"
```

---

## Task 4: Modify Live Guide Service

**Files:**
- Modify: `sarthi-backend/src/live-guide/live-guide.service.ts`

- [ ] **Step 1: Update imports and constructor**

```typescript
import { ActivitySchedulerService } from './activity-scheduler.service';
import { PrismaService } from '../prisma/prisma.service';

export class LiveGuideService {
  constructor(
    // ... existing
    private readonly activityScheduler: ActivitySchedulerService,
    private readonly prisma: PrismaService
  ) {}

  // Store profile cache per session
  private profileCache = new Map<string, any>();
}
```

- [ ] **Step 2: Update activateGuide to schedule activities**

```typescript
async activateGuide(tripId: string, firebaseUid: string, fcmToken: string) {
  const user = await this.findOrCreateUser(firebaseUid);
  const trip = await this.getTrip(tripId, user.id);
  const { dayIndex, status } = this.sessionService.computeCurrentDay(trip.dates as any);

  let session = await this.sessionService.findActive(tripId, user.id);
  if (!session) {
    session = await this.sessionService.create(tripId, user.id, Math.max(dayIndex, 0));
  }

  // NEW: Fetch and cache profile
  const profile = await this.profileService.getProfile(firebaseUid).catch(() => null);
  this.profileCache.set(session.id, profile);

  const todayPlan = this.getTodayPlan(trip.itineraryData, Math.max(dayIndex, 0));
  const activities = todayPlan?.activities ?? [];

  // NEW: Schedule activity notifications
  if (activities.length > 0 && profile?.travelPace) {
    await this.scheduleActivityNotifications(session.id, tripId, dayIndex, activities, profile.travelPace, trip.travelMode);
  }

  // ... rest of existing code
}
```

- [ ] **Step 3: Add scheduleActivityNotifications method**

```typescript
private async scheduleActivityNotifications(
  sessionId: string,
  tripId: string,
  dayIndex: number,
  activities: any[],
  userPace: string,
  transportMode: string
): Promise<void> {
  const now = Date.now();

  for (let i = 0; i < activities.length; i++) {
    const activity = activities[i];
    
    // Skip past activities
    if (this.activityScheduler.isActivityTime(activity.time)) continue;

    // In real implementation, calculate distance using Google Maps
    // For now, use rough estimate
    const roughDistance = 2000 + (i * 500); // meters
    const travelTime = this.activityScheduler.calculateTravelTime(roughDistance, userPace, transportMode);
    
    // Parse activity time and calculate scheduled time
    const activityMinutes = this.activityScheduler.parseActivityTime(activity.time);
    const today = new Date();
    const activityDate = new Date(today.getFullYear(), today.getMonth(), today.getDate());
    const scheduledMs = activityDate.getTime() + (activityMinutes - travelTime) * 60 * 1000;

    const idempotencyKey = this.activityScheduler.generateIdempotencyKey(tripId, dayIndex, i, scheduledMs);

    await this.prisma.activitySchedule.upsert({
      where: { idempotencyKey },
      update: {},
      create: {
        sessionId,
        tripId,
        userId: session.userId,
        dayIndex,
        activityIndex: i,
        activity: activity.activity,
        scheduledTime: new Date(scheduledMs),
        distance: roughDistance,
        estimatedTravelTime: travelTime,
        idempotencyKey
      }
    }).catch(() => null);
  }
}
```

- [ ] **Step 4: Update handleLocationUpdate for activity notifications**

```typescript
async handleLocationUpdate(sessionId: string, session: LiveGuideSession, lat: number, lng: number) {
  await this.sessionService.update(sessionId, { lastLocation: { lat, lng, timestamp: Date.now() } });

  // NEW: Check for pending activity notifications
  const now = new Date();
  const pendingActivities = await this.prisma.activitySchedule.findMany({
    where: {
      sessionId,
      notificationSent: false,
      scheduledTime: { lte: now }
    }
  });

  for (const scheduled of pendingActivities) {
    const activity = { activity: scheduled.activity };
    this.dispatch(
      session.userId,
      'activity_approaching',
      {
        activityIndex: scheduled.activityIndex,
        activity: scheduled.activity,
        distance: scheduled.distance,
        estimatedTravelTime: scheduled.estimatedTravelTime,
        mapQuery: scheduled.activity // In real code, get from itinerary
      },
      `Time for ${scheduled.activity}`,
      `Leave now to arrive on time. ${scheduled.estimatedTravelTime} min away.`
    );

    await this.prisma.activitySchedule.update({
      where: { id: scheduled.id },
      data: { notificationSent: true }
    });
  }

  // NEW: Check for location-based suggestions (existing logic but with profile)
  const oneHourAgo = Date.now() - 3_600_000;
  const lastSuggest = session.lastSuggestAt ? new Date(session.lastSuggestAt).getTime() : 0;
  if (lastSuggest > oneHourAgo) return;

  const trip = await this.prisma.savedTrip.findFirst({ where: { id: session.tripId } });
  if (!trip) return;

  try {
    const profile = this.profileCache.get(sessionId);
    const todayPlan = this.getTodayPlan(trip.itineraryData, session.currentDay);
    const existing = (todayPlan?.activities ?? []).map((a: any) => a.activity);

    // NEW: Pass profile to AI for personalization
    const result = await this.aiService.generatePersonalizedLocationSuggestion({
      destination: trip.destination,
      state: trip.state,
      userProfile: profile || {},
      availableMinutes: 120, // In real code, calculate from next activity
      nearbyPlaces: [], // In real code, fetch from Google Places
      alreadyPlanned: existing
    });

    this.dispatch(
      session.userId,
      'location_suggestion',
      {
        suggestion: result.reasoning,
        placeName: result.placeName,
        mapQuery: result.placeName,
        distance: result.distance,
        estimatedTravelTime: Math.ceil(result.estimatedTime / 60),
        matchScore: result.confidence
      },
      'Nearby suggestion',
      `${result.placeName} — ${result.reasoning}`
    );

    await this.sessionService.update(sessionId, { lastSuggestAt: new Date() });
  } catch (err) {
    this.logger.warn(`Personalized suggestion failed: ${(err as Error).message}`);
  }
}
```

- [ ] **Step 5: Commit**

```bash
git add src/live-guide/live-guide.service.ts
git commit -m "feat: integrate activity scheduler and personalized suggestions into LiveGuideService"
```

---

## Task 5: Add API Endpoints

**Files:**
- Modify: `sarthi-backend/src/live-guide/live-guide.controller.ts`

- [ ] **Step 1: Add GET endpoint for activity schedule**

```typescript
@Get(':tripId/activity-schedule')
@UseGuards(FirebaseAuthGuard)
async getActivitySchedule(
  @Param('tripId') tripId: string,
  @Req() req: any
): Promise<{ scheduledActivities: any[] }> {
  const schedules = await this.prisma.activitySchedule.findMany({
    where: {
      tripId,
      userId: req.user.uid,
      notificationSent: false
    },
    orderBy: { scheduledTime: 'asc' }
  });

  return {
    scheduledActivities: schedules.map(s => ({
      activityIndex: s.activityIndex,
      activity: s.activity,
      scheduledTime: s.scheduledTime.getTime(),
      distance: s.distance,
      estimatedTravelTime: s.estimatedTravelTime
    }))
  };
}
```

- [ ] **Step 2: Commit**

```bash
git add src/live-guide/live-guide.controller.ts
git commit -m "feat: add GET /trips/{tripId}/activity-schedule endpoint"
```

---

## Task 6: Update WebSocket Gateway

**Files:**
- Modify: `sarthi-backend/src/live-guide/live-guide.gateway.ts`

- [ ] **Step 1: Update gateway to handle new events**

```typescript
// In gateway, ensure these events are emitted:
// Already exists: activity_marked, location_suggestion, morning_briefing, meal_nudge

// NEW events to emit:
@SubscribeMessage('activity_approaching')
// Emitted by LiveGuideService.dispatch()

@SubscribeMessage('activity_schedule_updated')
// Emitted when schedule changes (replans, skips, etc.)
```

- [ ] **Step 2: Verify gateway integration**

Check that `sendToUser(userId, 'activity_approaching', data)` works correctly

- [ ] **Step 3: Commit**

```bash
git add src/live-guide/live-guide.gateway.ts
git commit -m "feat: add activity_approaching WebSocket event to gateway"
```

---

## Task 7: Add Tests

**Files:**
- Create: `sarthi-backend/src/live-guide/activity-scheduler.service.spec.ts`
- Create: `sarthi-backend/src/live-guide/live-guide.service.activity.spec.ts`

- [ ] **Step 1: Test travel time calculation**

File: `src/live-guide/activity-scheduler.service.spec.ts`

```typescript
describe('ActivitySchedulerService', () => {
  let service: ActivitySchedulerService;

  beforeEach(() => {
    service = new ActivitySchedulerService(null as any);
  });

  describe('calculateTravelTime', () => {
    it('should calculate travel time for walking', () => {
      // 1000 meters @ 1.4 m/s = ~12 minutes
      const time = service.calculateTravelTime(1000, 'no_plan', 'walking');
      expect(time).toBe(12);
    });

    it('should apply packed traveler buffer (+20%)', () => {
      const time = service.calculateTravelTime(1000, 'packed', 'walking');
      expect(time).toBeGreaterThan(12);
    });

    it('should apply loose traveler buffer (+10%)', () => {
      const time = service.calculateTravelTime(1000, 'loose', 'walking');
      const noPlanTime = service.calculateTravelTime(1000, 'no_plan', 'walking');
      expect(time).toBeGreaterThan(noPlanTime);
    });

    it('should calculate for public transit', () => {
      const time = service.calculateTravelTime(5000, 'no_plan', 'public_transit');
      expect(time).toBeLessThan(service.calculateTravelTime(5000, 'no_plan', 'walking'));
    });
  });

  describe('parseActivityTime', () => {
    it('should parse "9:00 AM"', () => {
      const minutes = service.parseActivityTime('9:00 AM');
      expect(minutes).toBe(9 * 60); // 540 minutes
    });

    it('should parse "14:30" (24-hour format)', () => {
      const minutes = service.parseActivityTime('14:30');
      expect(minutes).toBe(14 * 60 + 30);
    });

    it('should handle "12:00 PM" (noon)', () => {
      const minutes = service.parseActivityTime('12:00 PM');
      expect(minutes).toBe(12 * 60);
    });
  });

  describe('generateIdempotencyKey', () => {
    it('should create unique key per activity', () => {
      const key1 = service.generateIdempotencyKey('trip1', 0, 0, 123456);
      const key2 = service.generateIdempotencyKey('trip1', 0, 1, 123456);
      expect(key1).not.toBe(key2);
    });
  });
});
```

- [ ] **Step 2: Run tests**

Run: `npm run test src/live-guide/activity-scheduler.service.spec.ts`

Expected: All tests pass

- [ ] **Step 3: Test activity notification scheduling**

File: `src/live-guide/live-guide.service.activity.spec.ts`

```typescript
describe('LiveGuideService - Activity Notifications', () => {
  let service: LiveGuideService;
  let prisma: any;

  beforeEach(() => {
    prisma = {
      activitySchedule: {
        upsert: jest.fn(),
        findMany: jest.fn(),
        update: jest.fn()
      }
    };
    service = new LiveGuideService(
      prisma,
      null as any, // other dependencies
      new ActivitySchedulerService(prisma)
    );
  });

  it('should schedule activities with correct travel time buffers', async () => {
    const activities = [
      { time: '9:00 AM', activity: 'Visit Gateway' },
      { time: '12:00 PM', activity: 'Lunch' }
    ];

    // Should call upsert for each activity
    expect(prisma.activitySchedule.upsert).toHaveBeenCalled();
  });

  it('should not schedule past activities', async () => {
    const activities = [
      { time: '6:00 AM', activity: 'Early activity' } // Already past
    ];

    // Should skip if already past current time
  });

  it('should send activity_approaching on location update', async () => {
    prisma.activitySchedule.findMany.mockResolvedValue([
      {
        id: '1',
        activityIndex: 0,
        activity: 'Visit Gateway',
        distance: 2000,
        estimatedTravelTime: 15
      }
    ]);

    // Should emit activity_approaching event
  });
});
```

- [ ] **Step 4: Run all tests**

Run: `npm run test src/live-guide/`

Expected: All tests pass

- [ ] **Step 5: Commit**

```bash
git add src/live-guide/*.spec.ts
git commit -m "test: add unit tests for activity scheduler and notifications"
```

---

## Task 8: Integration Testing & End-to-End Flow

**Files:**
- Create: `sarthi-backend/src/live-guide/live-guide.e2e.spec.ts`

- [ ] **Step 1: Create E2E test scenario**

```typescript
describe('Live Guide E2E - Activity Notifications', () => {
  // Setup: Create trip, activate guide, schedule activities
  // Test 1: Verify activities scheduled with correct timing
  // Test 2: Simulate location update, verify activity_approaching event
  // Test 3: Verify idempotency (no duplicate on reconnect)
  // Test 4: Verify personalized suggestion with profile
});
```

- [ ] **Step 2: Run E2E tests**

Run: `npm run test:e2e src/live-guide/live-guide.e2e.spec.ts`

Expected: All E2E tests pass

- [ ] **Step 3: Manual testing checklist**

- [ ] Create a test trip for today (start date = today)
- [ ] Activate Live Guide
- [ ] Verify activity notifications scheduled in ActivitySchedule table
- [ ] Simulate location update via WebSocket
- [ ] Verify `activity_approaching` event received
- [ ] Verify notification not duplicated on reconnect
- [ ] Check personalized location suggestion uses profile data
- [ ] Verify rate limiting (only 1 suggestion per hour)

- [ ] **Step 4: Commit**

```bash
git add src/live-guide/live-guide.e2e.spec.ts
git commit -m "test: add E2E tests for activity notifications and personalized suggestions"
```

---

## Task 9: Documentation & Cleanup

**Files:**
- Modify: `sarthi-backend/README.md` or create `docs/LIVE_GUIDE_FEATURES.md`

- [ ] **Step 1: Document new features**

Create: `docs/LIVE_GUIDE_FEATURES.md`

```markdown
# Live Guide Features

## Activity Time Notifications

Automatically notify users when to leave for their next scheduled activity based on:
- Distance to destination (Google Maps)
- Travel mode (walking, transit, car)
- User's travel pace preference (packed/loose/no_plan)

### Configuration
- Pace multipliers: packed=1.2x, loose=1.1x, no_plan=1.0x
- Adds buffer to account for preparation time

### Implementation
- Service: `ActivitySchedulerService`
- Event: `activity_approaching` (WebSocket)
- Persistence: `ActivitySchedule` table (deduplication via idempotency key)

## Personalized Location Suggestions

Generate nearby place recommendations based on user profile:
- Travel interests (culture, adventure, relaxation, food, nature)
- Budget style (budget, comfort, experience)
- Activity level (easy-going, moderate, loves challenge)
- Comfort preference (rough, homestay, hotel)

### Rate Limiting
- Max 1 suggestion per hour per session
- Triggers on location update or user movement >500m

### Implementation
- Enhanced: `ai.service.ts` with profile context
- Event: `location_suggestion` (WebSocket)
- Scoring: Match confidence 0-100
```

- [ ] **Step 2: Update API documentation**

Document new endpoints:
- `GET /trips/{tripId}/activity-schedule` — List scheduled notifications

- [ ] **Step 3: Commit**

```bash
git add docs/LIVE_GUIDE_FEATURES.md
git commit -m "docs: add documentation for activity notifications and personalized suggestions"
```

---

## Task 10: Deployment Verification

**Files:**
- N/A (verification steps only)

- [ ] **Step 1: Verify all tests pass**

Run: `npm run test`

Expected: All tests ≥95% passing

- [ ] **Step 2: Verify no TypeScript errors**

Run: `npm run build`

Expected: Build succeeds, no errors

- [ ] **Step 3: Verify database migration**

Run: `npm run prisma db push`

Expected: ActivitySchedule table created

- [ ] **Step 4: Performance check**

- Verify profile caching reduces database queries
- Verify activity scheduler doesn't impact WebSocket latency
- Check AI API call batching reduces costs

- [ ] **Step 5: Commit final status**

```bash
git commit --allow-empty -m "build: Phase 2D backend improvements complete and verified

- Activity time notifications with travel time calculation
- Personalized location suggestions using user profile
- ActivitySchedule persistence for deduplication
- Full test coverage (unit + E2E)
- Zero new external dependencies
- Performance optimized with session caching"
```

---

## Verification Checklist

- [ ] All 10 tasks completed
- [ ] No TypeScript errors
- [ ] All tests passing (>95%)
- [ ] ActivitySchedule table created in production schema
- [ ] Activity notifications sent at correct time
- [ ] Personalized suggestions ranked by match score
- [ ] No duplicate notifications on reconnect
- [ ] Profile cached in session (1 fetch per session)
- [ ] Rate limiting enforced (1 suggestion/hour)
- [ ] Documentation updated

---

## Estimated Timeline

- Task 1 (Schema): 30 min
- Task 2 (Scheduler Service): 1 hour
- Task 3 (AI Enhancement): 1 hour
- Task 4 (LiveGuideService Integration): 1.5 hours
- Task 5 (API Endpoints): 30 min
- Task 6 (Gateway Updates): 30 min
- Task 7 (Unit Tests): 1.5 hours
- Task 8 (E2E Tests): 1 hour
- Task 9 (Docs): 30 min
- Task 10 (Deployment): 30 min

**Total: ~8-9 hours** (matches spec estimate of 5-8 days for careful implementation)
