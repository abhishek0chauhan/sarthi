# Phase 2D: Live Sarthi Mode — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add a WebSocket-powered real-time travel companion (Live Sarthi Mode) with FCM push notifications, today's plan, mark-done/skip, smart replanning, meal nudges, and location-aware suggestions.

**Architecture:** NestJS WebSocket gateway (Socket.io) authenticates via Firebase token in handshake; a `LiveGuideService` handles all business logic and dispatches events to connected WS clients or FCM for offline users; a `SchedulerService` runs a cron job every minute to fire time-based notifications (morning briefing, meal nudges). Two new Prisma models (`UserDevice`, `LiveGuideSession`) persist state. Three new AI methods handle briefing generation, day replanning, and location suggestions.

**Tech Stack:** `@nestjs/websockets`, `@nestjs/platform-socket.io`, `socket.io`, `@nestjs/schedule`, `firebase-admin` (already installed), Prisma 5, NestJS 11, Jest 30.

---

## File Map

### New files
```
prisma/schema.prisma                              (modify — add UserDevice, LiveGuideSession, User.notificationPrefs)

src/devices/
  dto/register-device.dto.ts
  devices.service.ts + .spec.ts
  devices.controller.ts + .spec.ts
  devices.module.ts

src/profile/
  dto/update-notification-prefs.dto.ts            (new)
  users.controller.ts + .spec.ts                  (new — handles /users/me/notification-prefs)

src/ai/
  schemas/live-briefing.schema.ts + .spec.ts
  schemas/live-replan.schema.ts
  schemas/live-suggestion.schema.ts
  prompts/live-briefing.prompt.ts + .spec.ts
  prompts/live-replan.prompt.ts
  prompts/live-suggestion.prompt.ts

src/live-guide/
  dto/activate-guide.dto.ts
  dto/location-update.dto.ts
  dto/mark-activity.dto.ts
  session.service.ts + .spec.ts
  notification.service.ts + .spec.ts
  live-guide.service.ts + .spec.ts
  live-guide.gateway.ts + .spec.ts
  scheduler.service.ts + .spec.ts
  live-guide.controller.ts + .spec.ts
  live-guide.module.ts
```

### Modified files
```
src/ai/ai.service.ts                              (add generateLiveBriefing, replanDay, generateLocationSuggestion)
src/profile/profile.service.ts                    (add updateNotificationPrefs)
src/profile/profile.module.ts                     (add UsersController)
src/app.module.ts                                 (add ScheduleModule, DevicesModule, LiveGuideModule)
src/main.ts                                       (add IoAdapter)
```

---

## Task 1: Install packages + Prisma schema + migration

**Files:**
- Modify: `package.json` (npm install)
- Modify: `prisma/schema.prisma`

- [ ] **Step 1: Install WebSocket and scheduler packages**

Run from `sarthi-backend/`:
```bash
npm install @nestjs/websockets @nestjs/platform-socket.io socket.io @nestjs/schedule
```
Expected: packages added to `dependencies` in `package.json`.

- [ ] **Step 2: Update `prisma/schema.prisma`**

Add the following to `prisma/schema.prisma`. Add after the `TripChatMessage` model.

First, add relations to the existing `User` model (after `corrections Correction[]`):
```prisma
  notificationPrefs Json?
  devices           UserDevice[]
  liveGuideSessions LiveGuideSession[]
```

Add relations to the existing `SavedTrip` model (after `chatMessages TripChatMessage[]`):
```prisma
  liveGuideSessions LiveGuideSession[]
```

Then add the two new models at the bottom:
```prisma
model UserDevice {
  id        String   @id @default(uuid())
  userId    String
  user      User     @relation(fields: [userId], references: [id], onDelete: Cascade)
  fcmToken  String   @unique
  platform  String
  createdAt DateTime @default(now())
  updatedAt DateTime @updatedAt

  @@index([userId])
}

model LiveGuideSession {
  id              String    @id @default(uuid())
  tripId          String
  trip            SavedTrip @relation(fields: [tripId], references: [id], onDelete: Cascade)
  userId          String
  user            User      @relation(fields: [userId], references: [id], onDelete: Cascade)
  isActive        Boolean   @default(true)
  activatedAt     DateTime
  deactivatedAt   DateTime?
  currentDay      Int
  activityStatus  Json
  lastLocation    Json?
  lastBriefingAt  DateTime?
  lastBreakfastAt DateTime?
  lastLunchAt     DateTime?
  lastDinnerAt    DateTime?
  replanCount     Json?
  lastSuggestAt   DateTime?
  createdAt       DateTime  @default(now())
  updatedAt       DateTime  @updatedAt

  @@index([tripId])
  @@index([userId])
  @@index([isActive])
}
```

- [ ] **Step 3: Run migration**

```bash
cd sarthi-backend
npx prisma migrate dev --name add-live-guide
```
Expected: Migration runs, Prisma client regenerated with `userDevice`, `liveGuideSession` models.

- [ ] **Step 4: Verify TypeScript build**

```bash
npm run build
```
Expected: No TypeScript errors.

- [ ] **Step 5: Commit**

```bash
git add prisma/schema.prisma package.json package-lock.json
git commit -m "feat: install websocket/schedule packages and add live guide prisma schema"
```

---

## Task 2: Devices module (FCM token registration)

**Files:**
- Create: `src/devices/dto/register-device.dto.ts`
- Create: `src/devices/devices.service.ts`
- Create: `src/devices/devices.service.spec.ts`
- Create: `src/devices/devices.controller.ts`
- Create: `src/devices/devices.controller.spec.ts`
- Create: `src/devices/devices.module.ts`

- [ ] **Step 1: Create DTO**

`src/devices/dto/register-device.dto.ts`:
```typescript
import { IsEnum, IsString } from 'class-validator';

export class RegisterDeviceDto {
  @IsString()
  fcmToken: string;

  @IsEnum(['android', 'ios', 'web'])
  platform: string;
}
```

- [ ] **Step 2: Write the failing service tests**

`src/devices/devices.service.spec.ts`:
```typescript
import { Test } from '@nestjs/testing';
import { DevicesService } from './devices.service';
import { PrismaService } from '../prisma/prisma.service';

const mockPrisma = {
  user: { upsert: jest.fn() },
  userDevice: { upsert: jest.fn(), findMany: jest.fn(), deleteMany: jest.fn() },
};

describe('DevicesService', () => {
  let service: DevicesService;

  beforeEach(async () => {
    jest.clearAllMocks();
    const module = await Test.createTestingModule({
      providers: [DevicesService, { provide: PrismaService, useValue: mockPrisma }],
    }).compile();
    service = module.get(DevicesService);
  });

  it('register: upserts device under user', async () => {
    mockPrisma.user.upsert.mockResolvedValue({ id: 'db-uid' });
    mockPrisma.userDevice.upsert.mockResolvedValue({ fcmToken: 'tok', platform: 'android' });
    await service.register('fb-uid', { fcmToken: 'tok', platform: 'android' });
    expect(mockPrisma.userDevice.upsert).toHaveBeenCalledWith(
      expect.objectContaining({ where: { fcmToken: 'tok' } }),
    );
  });

  it('unregister: deletes device belonging to user', async () => {
    mockPrisma.user.upsert.mockResolvedValue({ id: 'db-uid' });
    mockPrisma.userDevice.deleteMany.mockResolvedValue({ count: 1 });
    await service.unregister('fb-uid', 'tok');
    expect(mockPrisma.userDevice.deleteMany).toHaveBeenCalledWith({
      where: { fcmToken: 'tok', userId: 'db-uid' },
    });
  });

  it('getTokensForUser: returns array of tokens', async () => {
    mockPrisma.userDevice.findMany.mockResolvedValue([{ fcmToken: 'a' }, { fcmToken: 'b' }]);
    const tokens = await service.getTokensForUser('db-uid');
    expect(tokens).toEqual(['a', 'b']);
  });
});
```

- [ ] **Step 3: Run tests to verify they fail**

```bash
cd sarthi-backend && npx jest devices.service.spec --no-coverage
```
Expected: FAIL — `DevicesService` not found.

- [ ] **Step 4: Implement DevicesService**

`src/devices/devices.service.ts`:
```typescript
import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { RegisterDeviceDto } from './dto/register-device.dto';

@Injectable()
export class DevicesService {
  constructor(private readonly prisma: PrismaService) {}

  private async findOrCreateUser(firebaseUid: string) {
    return this.prisma.user.upsert({
      where: { firebaseUid },
      update: {},
      create: { firebaseUid },
    });
  }

  async register(firebaseUid: string, dto: RegisterDeviceDto) {
    const user = await this.findOrCreateUser(firebaseUid);
    return this.prisma.userDevice.upsert({
      where: { fcmToken: dto.fcmToken },
      update: { platform: dto.platform, userId: user.id },
      create: { fcmToken: dto.fcmToken, platform: dto.platform, userId: user.id },
    });
  }

  async unregister(firebaseUid: string, fcmToken: string) {
    const user = await this.findOrCreateUser(firebaseUid);
    await this.prisma.userDevice.deleteMany({ where: { fcmToken, userId: user.id } });
  }

  async getTokensForUser(userId: string): Promise<string[]> {
    const devices = await this.prisma.userDevice.findMany({
      where: { userId },
      select: { fcmToken: true },
    });
    return devices.map((d) => d.fcmToken);
  }
}
```

- [ ] **Step 5: Run tests to verify they pass**

```bash
npx jest devices.service.spec --no-coverage
```
Expected: PASS — 3 tests.

- [ ] **Step 6: Write the failing controller tests**

`src/devices/devices.controller.spec.ts`:
```typescript
import { Test } from '@nestjs/testing';
import { DevicesController } from './devices.controller';
import { DevicesService } from './devices.service';
import { FirebaseAuthGuard } from '../auth/firebase-auth.guard';

const mockService = { register: jest.fn(), unregister: jest.fn() };

describe('DevicesController', () => {
  let controller: DevicesController;

  beforeEach(async () => {
    jest.clearAllMocks();
    const module = await Test.createTestingModule({
      controllers: [DevicesController],
      providers: [{ provide: DevicesService, useValue: mockService }],
    })
      .overrideGuard(FirebaseAuthGuard)
      .useValue({ canActivate: () => true })
      .compile();
    controller = module.get(DevicesController);
  });

  it('POST /devices calls service.register', async () => {
    mockService.register.mockResolvedValue({ fcmToken: 'tok' });
    const result = await controller.register({ fcmToken: 'tok', platform: 'android' }, { user: { uid: 'fb-uid' } } as any);
    expect(mockService.register).toHaveBeenCalledWith('fb-uid', { fcmToken: 'tok', platform: 'android' });
    expect(result).toEqual({ fcmToken: 'tok' });
  });

  it('DELETE /devices/:fcmToken calls service.unregister', async () => {
    mockService.unregister.mockResolvedValue(undefined);
    await controller.unregister('tok', { user: { uid: 'fb-uid' } } as any);
    expect(mockService.unregister).toHaveBeenCalledWith('fb-uid', 'tok');
  });
});
```

- [ ] **Step 7: Run controller tests to verify they fail**

```bash
npx jest devices.controller.spec --no-coverage
```
Expected: FAIL.

- [ ] **Step 8: Implement DevicesController**

`src/devices/devices.controller.ts`:
```typescript
import { Body, Controller, Delete, HttpCode, Param, Post, Req, UseGuards } from '@nestjs/common';
import { FirebaseAuthGuard } from '../auth/firebase-auth.guard';
import { DevicesService } from './devices.service';
import { RegisterDeviceDto } from './dto/register-device.dto';

@Controller('devices')
@UseGuards(FirebaseAuthGuard)
export class DevicesController {
  constructor(private readonly service: DevicesService) {}

  @Post()
  async register(@Body() dto: RegisterDeviceDto, @Req() req: any) {
    return this.service.register(req.user.uid, dto);
  }

  @Delete(':fcmToken')
  @HttpCode(204)
  async unregister(@Param('fcmToken') fcmToken: string, @Req() req: any) {
    await this.service.unregister(req.user.uid, fcmToken);
  }
}
```

`src/devices/devices.module.ts`:
```typescript
import { Module } from '@nestjs/common';
import { DevicesController } from './devices.controller';
import { DevicesService } from './devices.service';

@Module({
  controllers: [DevicesController],
  providers: [DevicesService],
  exports: [DevicesService],
})
export class DevicesModule {}
```

- [ ] **Step 9: Run all devices tests**

```bash
npx jest devices --no-coverage
```
Expected: PASS — 5 tests.

- [ ] **Step 10: Commit**

```bash
git add src/devices/
git commit -m "feat: add devices module for FCM token registration"
```

---

## Task 3: Notification preferences endpoint

**Files:**
- Create: `src/profile/dto/update-notification-prefs.dto.ts`
- Create: `src/profile/users.controller.ts`
- Create: `src/profile/users.controller.spec.ts`
- Modify: `src/profile/profile.service.ts`
- Modify: `src/profile/profile.module.ts`

- [ ] **Step 1: Create DTO and add service method**

`src/profile/dto/update-notification-prefs.dto.ts`:
```typescript
import { IsBoolean, IsOptional } from 'class-validator';

export class UpdateNotificationPrefsDto {
  @IsOptional() @IsBoolean() morningBriefing?: boolean;
  @IsOptional() @IsBoolean() mealNudges?: boolean;
  @IsOptional() @IsBoolean() smartSuggestions?: boolean;
  @IsOptional() @IsBoolean() locationAlerts?: boolean;
  @IsOptional() @IsBoolean() tripReminders?: boolean;
}
```

- [ ] **Step 2: Write failing test for profile service method**

Add to `src/profile/profile.service.spec.ts` (open existing spec and add):
```typescript
it('updateNotificationPrefs: merges prefs onto user', async () => {
  // Add this test to the existing describe block
  // Setup: mockPrisma.user.upsert returns { id: 'uid' }
  // mockPrisma.user.update should be called with the merged prefs
  // Verify the prefs JSON is stored on the user model
});
```

Write this fully by adding to the existing spec file at `src/profile/profile.service.spec.ts`:

Look at the existing spec first, then add:
```typescript
  it('updateNotificationPrefs: patches user notificationPrefs', async () => {
    mockPrisma.user.upsert.mockResolvedValue({ id: 'uid', notificationPrefs: null });
    mockPrisma.user.update = jest.fn().mockResolvedValue({
      notificationPrefs: { morningBriefing: false, mealNudges: true, smartSuggestions: true, locationAlerts: true, tripReminders: true },
    });
    const result = await service.updateNotificationPrefs('fb-uid', { morningBriefing: false });
    expect(mockPrisma.user.update).toHaveBeenCalledWith({
      where: { id: 'uid' },
      data: { notificationPrefs: expect.objectContaining({ morningBriefing: false }) },
    });
    expect(result).toBeDefined();
  });
```

- [ ] **Step 3: Run the new test to verify it fails**

```bash
npx jest profile.service.spec --no-coverage
```
Expected: FAIL on the new `updateNotificationPrefs` test.

- [ ] **Step 4: Implement `updateNotificationPrefs` in ProfileService**

Add to `src/profile/profile.service.ts` (after `resetProfile`):
```typescript
  async updateNotificationPrefs(firebaseUid: string, prefs: Partial<{
    morningBriefing: boolean;
    mealNudges: boolean;
    smartSuggestions: boolean;
    locationAlerts: boolean;
    tripReminders: boolean;
  }>) {
    const user = await this.findOrCreateUser(firebaseUid);
    const defaults = {
      morningBriefing: true,
      mealNudges: true,
      smartSuggestions: true,
      locationAlerts: true,
      tripReminders: true,
    };
    const current = (user as any).notificationPrefs ?? defaults;
    const merged = { ...defaults, ...current, ...prefs };
    return this.prisma.user.update({
      where: { id: user.id },
      data: { notificationPrefs: merged },
      select: { notificationPrefs: true },
    });
  }
```

Note: `findOrCreateUser` currently returns the upserted user. Update it to include `notificationPrefs` in the select by changing the upsert in `profile.service.ts`. Currently it's:
```typescript
private async findOrCreateUser(firebaseUid: string) {
  return this.prisma.user.upsert({
    where: { firebaseUid },
    update: {},
    create: { firebaseUid },
  });
}
```
That's fine — Prisma returns all scalar fields by default, including `notificationPrefs`.

- [ ] **Step 5: Run service tests**

```bash
npx jest profile.service.spec --no-coverage
```
Expected: PASS.

- [ ] **Step 6: Write failing controller test**

`src/profile/users.controller.spec.ts`:
```typescript
import { Test } from '@nestjs/testing';
import { UsersController } from './users.controller';
import { ProfileService } from './profile.service';
import { FirebaseAuthGuard } from '../auth/firebase-auth.guard';

const mockService = { updateNotificationPrefs: jest.fn() };

describe('UsersController', () => {
  let controller: UsersController;

  beforeEach(async () => {
    jest.clearAllMocks();
    const module = await Test.createTestingModule({
      controllers: [UsersController],
      providers: [{ provide: ProfileService, useValue: mockService }],
    })
      .overrideGuard(FirebaseAuthGuard)
      .useValue({ canActivate: () => true })
      .compile();
    controller = module.get(UsersController);
  });

  it('PATCH /users/me/notification-prefs calls service', async () => {
    mockService.updateNotificationPrefs.mockResolvedValue({ notificationPrefs: { morningBriefing: false } });
    const result = await controller.updatePrefs({ morningBriefing: false }, { user: { uid: 'fb' } } as any);
    expect(mockService.updateNotificationPrefs).toHaveBeenCalledWith('fb', { morningBriefing: false });
    expect(result).toBeDefined();
  });
});
```

- [ ] **Step 7: Run to verify it fails**

```bash
npx jest users.controller.spec --no-coverage
```
Expected: FAIL.

- [ ] **Step 8: Implement UsersController and update ProfileModule**

`src/profile/users.controller.ts`:
```typescript
import { Body, Controller, Patch, Req, UseGuards } from '@nestjs/common';
import { FirebaseAuthGuard } from '../auth/firebase-auth.guard';
import { ProfileService } from './profile.service';
import { UpdateNotificationPrefsDto } from './dto/update-notification-prefs.dto';

@Controller('users')
@UseGuards(FirebaseAuthGuard)
export class UsersController {
  constructor(private readonly service: ProfileService) {}

  @Patch('me/notification-prefs')
  async updatePrefs(@Body() dto: UpdateNotificationPrefsDto, @Req() req: any) {
    return this.service.updateNotificationPrefs(req.user.uid, dto);
  }
}
```

Update `src/profile/profile.module.ts` to add `UsersController`:
```typescript
import { Module } from '@nestjs/common';
import { ProfileController } from './profile.controller';
import { UsersController } from './users.controller';
import { ProfileService } from './profile.service';
import { AiModule } from '../ai/ai.module';

@Module({
  imports: [AiModule],
  controllers: [ProfileController, UsersController],
  providers: [ProfileService],
  exports: [ProfileService],
})
export class ProfileModule {}
```

- [ ] **Step 9: Run all tests**

```bash
npx jest profile --no-coverage && npx jest users.controller --no-coverage
```
Expected: PASS all.

- [ ] **Step 10: Commit**

```bash
git add src/profile/
git commit -m "feat: add notification preferences endpoint and updateNotificationPrefs service method"
```

---

## Task 4: Live AI — schemas, prompts, AiService methods

**Files:**
- Create: `src/ai/schemas/live-briefing.schema.ts`
- Create: `src/ai/schemas/live-briefing.schema.spec.ts`
- Create: `src/ai/schemas/live-replan.schema.ts`
- Create: `src/ai/schemas/live-suggestion.schema.ts`
- Create: `src/ai/prompts/live-briefing.prompt.ts`
- Create: `src/ai/prompts/live-briefing.prompt.spec.ts`
- Create: `src/ai/prompts/live-replan.prompt.ts`
- Create: `src/ai/prompts/live-suggestion.prompt.ts`
- Modify: `src/ai/ai.service.ts`

- [ ] **Step 1: Create schemas**

`src/ai/schemas/live-briefing.schema.ts`:
```typescript
import { z } from 'zod';

export const liveBriefingSchema = z.object({
  briefing: z.string(),
  pushSummary: z.string().max(160),
});

export const liveBriefingWrapperSchema = z.object({ result: liveBriefingSchema });

export type LiveBriefing = z.infer<typeof liveBriefingSchema>;
```

`src/ai/schemas/live-replan.schema.ts`:
```typescript
import { z } from 'zod';

const replanActivitySchema = z.object({
  time: z.string().optional().default(''),
  activity: z.string(),
  cost: z.string().optional().default(''),
  healthNote: z.string().optional().default(''),
  mapQuery: z.string().optional().default(''),
  dropped: z.boolean().optional().default(false),
});

export const liveReplanSchema = z.object({
  activities: z.array(replanActivitySchema),
});

export const liveReplanWrapperSchema = z.object({ result: liveReplanSchema });

export type ReplanActivity = z.infer<typeof replanActivitySchema>;
export type LiveReplan = z.infer<typeof liveReplanSchema>;
```

`src/ai/schemas/live-suggestion.schema.ts`:
```typescript
import { z } from 'zod';

export const liveSuggestionSchema = z.object({
  suggestion: z.string(),
  placeName: z.string(),
  mapQuery: z.string().optional().default(''),
  pushSummary: z.string().max(160),
});

export const liveSuggestionWrapperSchema = z.object({ result: liveSuggestionSchema });

export type LiveSuggestion = z.infer<typeof liveSuggestionSchema>;
```

- [ ] **Step 2: Write failing schema tests**

`src/ai/schemas/live-briefing.schema.spec.ts`:
```typescript
import { liveBriefingSchema } from './live-briefing.schema';

describe('liveBriefingSchema', () => {
  it('parses valid briefing', () => {
    const result = liveBriefingSchema.parse({ briefing: 'Good morning!', pushSummary: 'Day 2 in Meghalaya' });
    expect(result.briefing).toBe('Good morning!');
    expect(result.pushSummary).toBe('Day 2 in Meghalaya');
  });

  it('rejects pushSummary over 160 chars', () => {
    expect(() =>
      liveBriefingSchema.parse({ briefing: 'hi', pushSummary: 'x'.repeat(161) })
    ).toThrow();
  });
});
```

- [ ] **Step 3: Run schema tests to verify they fail**

```bash
npx jest live-briefing.schema.spec --no-coverage
```
Expected: FAIL (file not found).

- [ ] **Step 4: Run tests after creating schema files**

```bash
npx jest live-briefing.schema.spec --no-coverage
```
Expected: PASS — 2 tests.

- [ ] **Step 5: Create prompts**

`src/ai/prompts/live-briefing.prompt.ts`:
```typescript
export interface BriefingParams {
  destination: string;
  state: string;
  dayNumber: number;
  todayActivities: Array<{ time?: string; activity: string }>;
  carriedOver?: Array<{ activity: string }>;
  profileSummary?: string;
}

export function buildBriefingPrompt(params: BriefingParams): { system: string; user: string } {
  const { destination, state, dayNumber, todayActivities, carriedOver, profileSummary } = params;

  const system = `You are Sarthi, a warm and knowledgeable Indian travel companion. Write a morning briefing for the traveler in a conversational, energetic tone — like a friend who knows the place well. Be concise (3-5 sentences). Include a short notification summary (max 160 chars) for the push notification.

Respond with ONLY valid JSON: {"result":{"briefing":"<paragraph>","pushSummary":"<short string>"}}`;

  const activities = todayActivities.map((a, i) => `${i + 1}. ${a.time ? `[${a.time}] ` : ''}${a.activity}`).join('\n');
  const carried = carriedOver?.length
    ? `\nCarried over from yesterday (incomplete): ${carriedOver.map((a) => a.activity).join(', ')}`
    : '';
  const personality = profileSummary ? `\nTraveler personality: ${profileSummary}` : '';

  const user = `Write a morning briefing for Day ${dayNumber} of a trip to ${destination}, ${state}.

Today's plan:
${activities}${carried}${personality}`;

  return { system, user };
}
```

`src/ai/prompts/live-replan.prompt.ts`:
```typescript
export interface ReplanParams {
  destination: string;
  currentTime: string;
  remainingActivities: Array<{ time?: string; activity: string; mapQuery?: string }>;
  triggeredBy: 'finished_early' | 'skip' | 'manual';
  profileSummary?: string;
}

export function buildReplanPrompt(params: ReplanParams): { system: string; user: string } {
  const { destination, currentTime, remainingActivities, triggeredBy, profileSummary } = params;

  const system = `You are Sarthi, a smart Indian travel planner. Reorder the remaining activities for today given the traveler's current time. You may drop activities if there is clearly not enough time. Return only the activities that can realistically be done. Set dropped:true for any you are removing.

Respond with ONLY valid JSON: {"result":{"activities":[{"time":"<HH:MM>","activity":"<name>","cost":"<est>","healthNote":"<note>","mapQuery":"<place, city>","dropped":<bool>}]}}`;

  const acts = remainingActivities
    .map((a, i) => `${i + 1}. ${a.time ? `[${a.time}] ` : ''}${a.activity}`)
    .join('\n');

  const reason =
    triggeredBy === 'finished_early'
      ? 'The traveler finished an activity early.'
      : triggeredBy === 'skip'
      ? 'The traveler skipped an activity.'
      : 'The traveler manually requested a replan.';

  const personality = profileSummary ? `\nTraveler personality: ${profileSummary}` : '';

  const user = `Replan the rest of Day for a trip to ${destination}.
Current time: ${currentTime}
Reason: ${reason}${personality}

Remaining activities to reorder/trim:
${acts}`;

  return { system, user };
}
```

`src/ai/prompts/live-suggestion.prompt.ts`:
```typescript
export interface LocationSuggestionParams {
  destination: string;
  state: string;
  lat: number;
  lng: number;
  existingActivities: string[];
  profileSummary?: string;
}

export function buildLocationSuggestionPrompt(params: LocationSuggestionParams): { system: string; user: string } {
  const { destination, state, lat, lng, existingActivities, profileSummary } = params;

  const system = `You are Sarthi, an expert local guide. Suggest one interesting nearby place the traveler could visit right now — something not already in their plan. Be specific about the place name and keep the suggestion brief and enthusiastic.

Respond with ONLY valid JSON: {"result":{"suggestion":"<why visit + what to expect>","placeName":"<name>","mapQuery":"<place name, area, city>","pushSummary":"<max 160 chars>"}}`;

  const existing = existingActivities.length
    ? `Already in plan (don't suggest these): ${existingActivities.join(', ')}`
    : '';

  const personality = profileSummary ? `Traveler personality: ${profileSummary}` : '';

  const user = `The traveler is near ${destination}, ${state} (lat: ${lat.toFixed(4)}, lng: ${lng.toFixed(4)}).
${existing}
${personality}

Suggest one interesting place within ~2km they could visit now.`;

  return { system, user };
}
```

- [ ] **Step 6: Write failing prompt tests**

`src/ai/prompts/live-briefing.prompt.spec.ts`:
```typescript
import { buildBriefingPrompt } from './live-briefing.prompt';

describe('buildBriefingPrompt', () => {
  const base = {
    destination: 'Cherrapunji',
    state: 'Meghalaya',
    dayNumber: 2,
    todayActivities: [{ time: '08:00', activity: 'Double Decker Root Bridge' }, { activity: 'Rainbow Falls' }],
  };

  it('returns system and user strings', () => {
    const { system, user } = buildBriefingPrompt(base);
    expect(typeof system).toBe('string');
    expect(typeof user).toBe('string');
  });

  it('includes destination in user prompt', () => {
    const { user } = buildBriefingPrompt(base);
    expect(user).toContain('Cherrapunji');
  });

  it('includes day number', () => {
    const { user } = buildBriefingPrompt(base);
    expect(user).toContain('Day 2');
  });

  it('includes carried-over activities when provided', () => {
    const { user } = buildBriefingPrompt({ ...base, carriedOver: [{ activity: 'Mawlynnong' }] });
    expect(user).toContain('Mawlynnong');
  });

  it('includes personality when provided', () => {
    const { user } = buildBriefingPrompt({ ...base, profileSummary: 'Adventure seeker, budget traveler' });
    expect(user).toContain('Adventure seeker');
  });
});
```

- [ ] **Step 7: Run prompt tests to verify they fail**

```bash
npx jest live-briefing.prompt.spec --no-coverage
```
Expected: FAIL.

- [ ] **Step 8: Run prompt tests after file creation**

```bash
npx jest live-briefing.prompt.spec --no-coverage
```
Expected: PASS — 5 tests.

- [ ] **Step 9: Add methods to AiService**

Add to `src/ai/ai.service.ts` — add imports and methods:

Add imports at top (after existing imports):
```typescript
import { liveBriefingWrapperSchema } from './schemas/live-briefing.schema';
import { liveReplanWrapperSchema } from './schemas/live-replan.schema';
import { liveSuggestionWrapperSchema } from './schemas/live-suggestion.schema';
import type { LiveBriefing } from './schemas/live-briefing.schema';
import type { ReplanActivity } from './schemas/live-replan.schema';
import type { LiveSuggestion } from './schemas/live-suggestion.schema';
import { buildBriefingPrompt } from './prompts/live-briefing.prompt';
import type { BriefingParams } from './prompts/live-briefing.prompt';
import { buildReplanPrompt } from './prompts/live-replan.prompt';
import type { ReplanParams } from './prompts/live-replan.prompt';
import { buildLocationSuggestionPrompt } from './prompts/live-suggestion.prompt';
import type { LocationSuggestionParams } from './prompts/live-suggestion.prompt';
```

Add methods after `tripChat`:
```typescript
  async generateLiveBriefing(params: BriefingParams): Promise<LiveBriefing> {
    const prompt = buildBriefingPrompt(params);
    const result = await generateJson({
      model: this.model,
      schema: liveBriefingWrapperSchema,
      system: prompt.system,
      prompt: prompt.user,
    });
    return result.result;
  }

  async replanDay(params: ReplanParams): Promise<ReplanActivity[]> {
    const prompt = buildReplanPrompt(params);
    const result = await generateJson({
      model: this.model,
      schema: liveReplanWrapperSchema,
      system: prompt.system,
      prompt: prompt.user,
    });
    return result.result.activities;
  }

  async generateLocationSuggestion(params: LocationSuggestionParams): Promise<LiveSuggestion> {
    const prompt = buildLocationSuggestionPrompt(params);
    const result = await generateJson({
      model: this.model,
      schema: liveSuggestionWrapperSchema,
      system: prompt.system,
      prompt: prompt.user,
    });
    return result.result;
  }
```

- [ ] **Step 10: Build and run all AI tests**

```bash
npm run build && npx jest ai --no-coverage
```
Expected: Build passes, all AI tests pass.

- [ ] **Step 11: Commit**

```bash
git add src/ai/
git commit -m "feat: add live briefing, replan, and location suggestion AI schemas/prompts/methods"
```

---

## Task 5: Session Service

**Files:**
- Create: `src/live-guide/session.service.ts`
- Create: `src/live-guide/session.service.spec.ts`

- [ ] **Step 1: Write failing tests**

`src/live-guide/session.service.spec.ts`:
```typescript
import { Test } from '@nestjs/testing';
import { SessionService } from './session.service';
import { PrismaService } from '../prisma/prisma.service';

const mockPrisma = {
  liveGuideSession: {
    create: jest.fn(),
    findFirst: jest.fn(),
    update: jest.fn(),
    findMany: jest.fn(),
  },
};

describe('SessionService', () => {
  let service: SessionService;

  beforeEach(async () => {
    jest.clearAllMocks();
    const module = await Test.createTestingModule({
      providers: [SessionService, { provide: PrismaService, useValue: mockPrisma }],
    }).compile();
    service = module.get(SessionService);
  });

  describe('computeCurrentDay', () => {
    it('returns before status when trip has not started', () => {
      const result = service.computeCurrentDay({ from: '2099-01-01', to: '2099-01-05' });
      expect(result.status).toBe('before');
      expect(result.dayIndex).toBe(-1);
    });

    it('returns after status when trip has ended', () => {
      const result = service.computeCurrentDay({ from: '2020-01-01', to: '2020-01-05' });
      expect(result.status).toBe('after');
    });

    it('returns during status with correct dayIndex', () => {
      const today = new Date();
      const from = today.toISOString().split('T')[0];
      const future = new Date(today.getTime() + 5 * 86400000).toISOString().split('T')[0];
      const result = service.computeCurrentDay({ from, to: future });
      expect(result.status).toBe('during');
      expect(result.dayIndex).toBe(0);
    });

    it('returns dayIndex 2 when today is the 3rd day', () => {
      const today = new Date();
      const from = new Date(today.getTime() - 2 * 86400000).toISOString().split('T')[0];
      const to = new Date(today.getTime() + 2 * 86400000).toISOString().split('T')[0];
      const result = service.computeCurrentDay({ from, to });
      expect(result.dayIndex).toBe(2);
    });
  });

  it('findActive: returns session or null', async () => {
    mockPrisma.liveGuideSession.findFirst.mockResolvedValue({ id: 'sess-1' });
    const result = await service.findActive('trip-1', 'user-1');
    expect(result).toEqual({ id: 'sess-1' });
  });

  it('create: creates a session with defaults', async () => {
    mockPrisma.liveGuideSession.create.mockResolvedValue({ id: 'sess-1' });
    const result = await service.create('trip-1', 'user-1', 0);
    expect(mockPrisma.liveGuideSession.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({ tripId: 'trip-1', userId: 'user-1', currentDay: 0, isActive: true }),
      }),
    );
    expect(result).toEqual({ id: 'sess-1' });
  });

  it('getAllActiveSessions: returns active sessions', async () => {
    mockPrisma.liveGuideSession.findMany.mockResolvedValue([{ id: 's1' }, { id: 's2' }]);
    const result = await service.getAllActiveSessions();
    expect(result).toHaveLength(2);
  });
});
```

- [ ] **Step 2: Run tests to verify they fail**

```bash
npx jest session.service.spec --no-coverage
```
Expected: FAIL.

- [ ] **Step 3: Implement SessionService**

`src/live-guide/session.service.ts`:
```typescript
import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import type { LiveGuideSession } from '@prisma/client';

@Injectable()
export class SessionService {
  constructor(private readonly prisma: PrismaService) {}

  computeCurrentDay(dates: { from: string; to: string }): {
    dayIndex: number;
    status: 'before' | 'during' | 'after';
    totalDays: number;
  } {
    const todayStr = new Date().toISOString().split('T')[0];
    const today = new Date(todayStr);
    const from = new Date(dates.from);
    const to = new Date(dates.to);

    const totalDays = Math.round((to.getTime() - from.getTime()) / 86400000) + 1;

    if (today < from) return { dayIndex: -1, status: 'before', totalDays };
    if (today > to) return { dayIndex: totalDays, status: 'after', totalDays };

    const dayIndex = Math.round((today.getTime() - from.getTime()) / 86400000);
    return { dayIndex, status: 'during', totalDays };
  }

  async findActive(tripId: string, userId: string): Promise<LiveGuideSession | null> {
    return this.prisma.liveGuideSession.findFirst({
      where: { tripId, userId, isActive: true },
    });
  }

  async create(tripId: string, userId: string, currentDay: number): Promise<LiveGuideSession> {
    return this.prisma.liveGuideSession.create({
      data: {
        tripId,
        userId,
        currentDay,
        isActive: true,
        activatedAt: new Date(),
        activityStatus: {},
      },
    });
  }

  async update(sessionId: string, data: Partial<Omit<LiveGuideSession, 'id' | 'createdAt'>>): Promise<LiveGuideSession> {
    return this.prisma.liveGuideSession.update({
      where: { id: sessionId },
      data: { ...data, updatedAt: new Date() } as any,
    });
  }

  async deactivate(sessionId: string): Promise<void> {
    await this.prisma.liveGuideSession.update({
      where: { id: sessionId },
      data: { isActive: false, deactivatedAt: new Date() },
    });
  }

  async getAllActiveSessions(): Promise<LiveGuideSession[]> {
    return this.prisma.liveGuideSession.findMany({
      where: { isActive: true },
    });
  }
}
```

- [ ] **Step 4: Run tests to verify they pass**

```bash
npx jest session.service.spec --no-coverage
```
Expected: PASS — 7 tests.

- [ ] **Step 5: Commit**

```bash
git add src/live-guide/session.service.ts src/live-guide/session.service.spec.ts
git commit -m "feat: add session service for live guide state persistence"
```

---

## Task 6: Notification Service

**Files:**
- Create: `src/live-guide/notification.service.ts`
- Create: `src/live-guide/notification.service.spec.ts`

- [ ] **Step 1: Write failing tests**

`src/live-guide/notification.service.spec.ts`:
```typescript
import { Test } from '@nestjs/testing';
import { NotificationService } from './notification.service';
import { DevicesService } from '../devices/devices.service';

const mockMessaging = { sendEachForMulticast: jest.fn().mockResolvedValue({ responses: [] }) };

jest.mock('firebase-admin', () => ({
  messaging: () => mockMessaging,
  apps: { length: 1 },
  initializeApp: jest.fn(),
  auth: () => ({ verifyIdToken: jest.fn() }),
}));

const mockDevicesService = { getTokensForUser: jest.fn() };

describe('NotificationService', () => {
  let service: NotificationService;

  beforeEach(async () => {
    jest.clearAllMocks();
    const module = await Test.createTestingModule({
      providers: [
        NotificationService,
        { provide: DevicesService, useValue: mockDevicesService },
      ],
    }).compile();
    service = module.get(NotificationService);
  });

  it('sendPush: calls FCM with tokens, title, body', async () => {
    await service.sendPush(['tok1', 'tok2'], 'Hello', 'World');
    expect(mockMessaging.sendEachForMulticast).toHaveBeenCalledWith(
      expect.objectContaining({
        tokens: ['tok1', 'tok2'],
        notification: { title: 'Hello', body: 'World' },
      }),
    );
  });

  it('sendPush: does nothing when tokens array is empty', async () => {
    await service.sendPush([], 'Hello', 'World');
    expect(mockMessaging.sendEachForMulticast).not.toHaveBeenCalled();
  });

  it('sendToUser: fetches tokens then sends', async () => {
    mockDevicesService.getTokensForUser.mockResolvedValue(['tok-a']);
    await service.sendToUser('db-user-id', 'Title', 'Body');
    expect(mockDevicesService.getTokensForUser).toHaveBeenCalledWith('db-user-id');
    expect(mockMessaging.sendEachForMulticast).toHaveBeenCalled();
  });

  it('sendPush: swallows FCM errors (non-blocking)', async () => {
    mockMessaging.sendEachForMulticast.mockRejectedValueOnce(new Error('FCM error'));
    await expect(service.sendPush(['tok'], 'T', 'B')).resolves.not.toThrow();
  });
});
```

- [ ] **Step 2: Run tests to verify they fail**

```bash
npx jest notification.service.spec --no-coverage
```
Expected: FAIL.

- [ ] **Step 3: Implement NotificationService**

`src/live-guide/notification.service.ts`:
```typescript
import { Injectable, Logger } from '@nestjs/common';
import * as admin from 'firebase-admin';
import { DevicesService } from '../devices/devices.service';

@Injectable()
export class NotificationService {
  private readonly logger = new Logger(NotificationService.name);

  constructor(private readonly devicesService: DevicesService) {}

  async sendPush(tokens: string[], title: string, body: string, data?: Record<string, string>): Promise<void> {
    if (!tokens.length) return;
    try {
      await admin.messaging().sendEachForMulticast({
        tokens,
        notification: { title, body },
        ...(data ? { data } : {}),
      } as any);
    } catch (err) {
      this.logger.warn(`FCM send failed: ${(err as Error).message}`);
    }
  }

  async sendToUser(userId: string, title: string, body: string, data?: Record<string, string>): Promise<void> {
    const tokens = await this.devicesService.getTokensForUser(userId);
    await this.sendPush(tokens, title, body, data);
  }
}
```

- [ ] **Step 4: Run tests to verify they pass**

```bash
npx jest notification.service.spec --no-coverage
```
Expected: PASS — 4 tests.

- [ ] **Step 5: Commit**

```bash
git add src/live-guide/notification.service.ts src/live-guide/notification.service.spec.ts
git commit -m "feat: add notification service for FCM push dispatch"
```

---

## Task 7: Live Guide Service — core (activate, mark done, skip)

**Files:**
- Create: `src/live-guide/live-guide.service.ts`
- Create: `src/live-guide/live-guide.service.spec.ts`

This task covers `activateGuide`, `markActivityDone`, `skipActivity`, and `getSessionStatus`.

- [ ] **Step 1: Write failing tests for core methods**

`src/live-guide/live-guide.service.spec.ts`:
```typescript
import { Test } from '@nestjs/testing';
import { forwardRef } from '@nestjs/common';
import { LiveGuideService } from './live-guide.service';
import { SessionService } from './session.service';
import { NotificationService } from './notification.service';
import { LiveGuideGateway } from './live-guide.gateway';
import { AiService } from '../ai/ai.service';
import { ProfileService } from '../profile/profile.service';
import { PrismaService } from '../prisma/prisma.service';
import { CorrectionsService } from '../corrections/corrections.service';

const mockPrisma = {
  user: { upsert: jest.fn() },
  savedTrip: { findFirst: jest.fn() },
};
const mockSession = {
  computeCurrentDay: jest.fn(),
  findActive: jest.fn(),
  create: jest.fn(),
  update: jest.fn(),
  deactivate: jest.fn(),
  getAllActiveSessions: jest.fn(),
};
const mockNotification = { sendToUser: jest.fn(), sendPush: jest.fn() };
const mockGateway = { isConnected: jest.fn(), sendToUser: jest.fn() };
const mockAi = { generateLiveBriefing: jest.fn(), replanDay: jest.fn(), generateLocationSuggestion: jest.fn() };
const mockProfile = { getProfile: jest.fn() };
const mockCorrections = { create: jest.fn() };

const tripFixture = {
  id: 'trip-1',
  userId: 'db-uid',
  destination: 'Cherrapunji',
  state: 'Meghalaya',
  dates: { from: '2026-01-01', to: '2026-01-05' },
  itineraryData: { itinerary: [{ day: 1, activities: [{ activity: 'Root Bridge' }, { activity: 'Rainbow Falls' }] }] },
  foodGuideData: { mealPlan: [{ day: 1, breakfast: { suggestion: 'Jadoh', cost: '₹50' }, lunch: { suggestion: 'Dohneiong' }, dinner: { suggestion: 'Symdong' } }] },
};

describe('LiveGuideService', () => {
  let service: LiveGuideService;

  beforeEach(async () => {
    jest.clearAllMocks();
    const module = await Test.createTestingModule({
      providers: [
        LiveGuideService,
        { provide: PrismaService, useValue: mockPrisma },
        { provide: SessionService, useValue: mockSession },
        { provide: NotificationService, useValue: mockNotification },
        { provide: LiveGuideGateway, useValue: mockGateway },
        { provide: AiService, useValue: mockAi },
        { provide: ProfileService, useValue: mockProfile },
        { provide: CorrectionsService, useValue: mockCorrections },
      ],
    }).compile();
    service = module.get(LiveGuideService);
  });

  describe('activateGuide', () => {
    beforeEach(() => {
      mockPrisma.user.upsert.mockResolvedValue({ id: 'db-uid' });
      mockPrisma.savedTrip.findFirst.mockResolvedValue(tripFixture);
      mockSession.computeCurrentDay.mockReturnValue({ dayIndex: 0, status: 'during', totalDays: 5 });
      mockSession.findActive.mockResolvedValue(null);
      mockSession.create.mockResolvedValue({ id: 'sess-1', activityStatus: {} });
      mockAi.generateLiveBriefing.mockResolvedValue({ briefing: 'Good morning!', pushSummary: 'Day 1!' });
      mockProfile.getProfile.mockResolvedValue(null);
    });

    it('creates a new session and returns todayPlan + briefing', async () => {
      const result = await service.activateGuide('trip-1', 'fb-uid', 'fcm-tok');
      expect(mockSession.create).toHaveBeenCalled();
      expect(result.briefing).toBe('Good morning!');
      expect(result.todayPlan).toBeDefined();
    });

    it('reuses existing active session', async () => {
      mockSession.findActive.mockResolvedValue({ id: 'sess-existing', currentDay: 0, activityStatus: {} });
      const result = await service.activateGuide('trip-1', 'fb-uid', 'fcm-tok');
      expect(mockSession.create).not.toHaveBeenCalled();
      expect(result).toBeDefined();
    });

    it('throws NotFoundException if trip not found', async () => {
      mockPrisma.savedTrip.findFirst.mockResolvedValue(null);
      await expect(service.activateGuide('bad-trip', 'fb-uid', 'fcm-tok')).rejects.toThrow();
    });
  });

  describe('markActivityDone', () => {
    it('updates activityStatus in session', async () => {
      mockSession.update.mockResolvedValue({ id: 'sess-1' });
      await service.markActivityDone('sess-1', { activityStatus: {} } as any, 0, 1);
      expect(mockSession.update).toHaveBeenCalledWith(
        'sess-1',
        expect.objectContaining({ activityStatus: { '0:1': 'done' } }),
      );
    });
  });

  describe('skipActivity', () => {
    it('updates activityStatus to skipped and logs correction', async () => {
      mockPrisma.savedTrip.findFirst.mockResolvedValue(tripFixture);
      mockSession.update.mockResolvedValue({ id: 'sess-1' });
      mockCorrections.create.mockResolvedValue({});
      await service.skipActivity('sess-1', 'trip-1', 'fb-uid', { activityStatus: {} } as any, 0, 0, 'too tired');
      expect(mockSession.update).toHaveBeenCalledWith(
        'sess-1',
        expect.objectContaining({ activityStatus: { '0:0': 'skipped' } }),
      );
    });
  });

  describe('getSessionStatus', () => {
    it('returns null when no active session', async () => {
      mockPrisma.user.upsert.mockResolvedValue({ id: 'db-uid' });
      mockSession.findActive.mockResolvedValue(null);
      const result = await service.getSessionStatus('trip-1', 'fb-uid');
      expect(result).toBeNull();
    });
  });
});
```

- [ ] **Step 2: Run tests to verify they fail**

```bash
npx jest live-guide.service.spec --no-coverage
```
Expected: FAIL.

- [ ] **Step 3: Implement LiveGuideService core methods**

`src/live-guide/live-guide.service.ts`:
```typescript
import { forwardRef, Inject, Injectable, NotFoundException, Logger } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { SessionService } from './session.service';
import { NotificationService } from './notification.service';
import { AiService } from '../ai/ai.service';
import { ProfileService } from '../profile/profile.service';
import { CorrectionsService } from '../corrections/corrections.service';
import { LiveGuideGateway } from './live-guide.gateway';
import type { LiveGuideSession } from '@prisma/client';

interface FirebaseUser { uid: string; name?: string; email?: string; }

type ActivityStatus = Record<string, 'done' | 'skipped' | 'pending'>;

@Injectable()
export class LiveGuideService {
  private readonly logger = new Logger(LiveGuideService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly sessionService: SessionService,
    private readonly notificationService: NotificationService,
    private readonly aiService: AiService,
    private readonly profileService: ProfileService,
    private readonly correctionsService: CorrectionsService,
    @Inject(forwardRef(() => LiveGuideGateway))
    private readonly gateway: LiveGuideGateway,
  ) {}

  private async findOrCreateUser(firebaseUid: string) {
    return this.prisma.user.upsert({
      where: { firebaseUid },
      update: {},
      create: { firebaseUid },
    });
  }

  private async getTrip(tripId: string, userId: string) {
    const trip = await this.prisma.savedTrip.findFirst({ where: { id: tripId, userId } });
    if (!trip) throw new NotFoundException('Trip not found');
    return trip;
  }

  private buildProfileSummary(profile: any): string | undefined {
    if (!profile) return undefined;
    const parts: string[] = [];
    if (profile.travelPace) parts.push(`pace: ${profile.travelPace}`);
    if (profile.comfortLevel) parts.push(`comfort: ${profile.comfortLevel}`);
    if (profile.physicalReadiness) parts.push(`fitness: ${profile.physicalReadiness}`);
    if (profile.spendingStyle) parts.push(`budget style: ${profile.spendingStyle}`);
    return parts.length ? parts.join(', ') : undefined;
  }

  private getTodayPlan(itineraryData: any, dayIndex: number) {
    const itinerary: any[] = itineraryData?.itinerary ?? [];
    return itinerary[dayIndex] ?? null;
  }

  private dispatch(userId: string, event: string, data: any, fcmTitle: string, fcmBody: string) {
    if (this.gateway.isConnected(userId)) {
      this.gateway.sendToUser(userId, event, data);
    } else {
      this.notificationService.sendToUser(userId, fcmTitle, fcmBody).catch(() => null);
    }
  }

  async activateGuide(tripId: string, firebaseUid: string, fcmToken: string) {
    const user = await this.findOrCreateUser(firebaseUid);
    const trip = await this.getTrip(tripId, user.id);

    const { dayIndex, status } = this.sessionService.computeCurrentDay(trip.dates as any);

    let session = await this.sessionService.findActive(tripId, user.id);
    if (!session) {
      session = await this.sessionService.create(tripId, user.id, Math.max(dayIndex, 0));
    }

    const todayPlan = this.getTodayPlan(trip.itineraryData, Math.max(dayIndex, 0));
    const activities = todayPlan?.activities ?? [];

    let briefing = 'Welcome to your trip!';
    let pushSummary = `Day ${Math.max(dayIndex + 1, 1)} has begun. Open Sarthi for your plan.`;

    if (status === 'during' && activities.length > 0) {
      try {
        const profile = await this.profileService.getProfile(firebaseUid).catch(() => null);
        const result = await this.aiService.generateLiveBriefing({
          destination: trip.destination,
          state: trip.state,
          dayNumber: dayIndex + 1,
          todayActivities: activities.map((a: any) => ({ time: a.time, activity: a.activity })),
          profileSummary: this.buildProfileSummary(profile),
        });
        briefing = result.briefing;
        pushSummary = result.pushSummary;
      } catch (err) {
        this.logger.warn(`Briefing generation failed: ${(err as Error).message}`);
      }
    }

    return { todayPlan: { ...todayPlan, dayIndex }, briefing, pushSummary, sessionId: session.id, status };
  }

  async markActivityDone(sessionId: string, session: LiveGuideSession, dayIndex: number, activityIndex: number) {
    const status = session.activityStatus as ActivityStatus;
    status[`${dayIndex}:${activityIndex}`] = 'done';
    await this.sessionService.update(sessionId, { activityStatus: status });
    return { dayIndex, activityIndex, status: 'done' };
  }

  async skipActivity(
    sessionId: string,
    tripId: string,
    firebaseUid: string,
    session: LiveGuideSession,
    dayIndex: number,
    activityIndex: number,
    reason?: string,
  ) {
    const actStatus = session.activityStatus as ActivityStatus;
    actStatus[`${dayIndex}:${activityIndex}`] = 'skipped';
    await this.sessionService.update(sessionId, { activityStatus: actStatus });

    this.correctionsService
      .create(firebaseUid, {
        tripId,
        type: 'live_skip_activity',
        context: { dayIndex, activityIndex, reason: reason ?? '' },
      })
      .catch(() => null);

    return { dayIndex, activityIndex, status: 'skipped' };
  }

  async getSessionStatus(tripId: string, firebaseUid: string) {
    const user = await this.findOrCreateUser(firebaseUid);
    const session = await this.sessionService.findActive(tripId, user.id);
    if (!session) return null;
    return { sessionId: session.id, currentDay: session.currentDay, activityStatus: session.activityStatus, isActive: session.isActive };
  }

  async deactivate(sessionId: string) {
    await this.sessionService.deactivate(sessionId);
  }
}
```

- [ ] **Step 4: Run tests to verify they pass**

```bash
npx jest live-guide.service.spec --no-coverage
```
Expected: PASS — 7 tests.

- [ ] **Step 5: Commit**

```bash
git add src/live-guide/live-guide.service.ts src/live-guide/live-guide.service.spec.ts
git commit -m "feat: add live guide service core (activate, mark done, skip)"
```

---

## Task 8: Live Guide Service — smart features (replan, briefing, meal nudge, location)

**Files:**
- Modify: `src/live-guide/live-guide.service.ts`
- Modify: `src/live-guide/live-guide.service.spec.ts`

- [ ] **Step 1: Add tests for smart features**

Add to `live-guide.service.spec.ts` — inside the `describe('LiveGuideService')` block, after existing tests:

```typescript
  describe('replanDay', () => {
    it('calls AI and returns replanned activities', async () => {
      mockPrisma.savedTrip.findFirst.mockResolvedValue(tripFixture);
      mockPrisma.user.upsert.mockResolvedValue({ id: 'db-uid' });
      mockSession.update.mockResolvedValue({});
      mockAi.replanDay.mockResolvedValue([{ activity: 'Rainbow Falls', dropped: false }]);
      mockProfile.getProfile.mockResolvedValue(null);

      const session = { id: 'sess-1', currentDay: 0, activityStatus: {}, replanCount: null } as any;
      const result = await service.replanDay('sess-1', 'trip-1', 'fb-uid', session, 0, 'manual');
      expect(mockAi.replanDay).toHaveBeenCalled();
      expect(result.activities).toBeDefined();
    });

    it('rejects if replan limit (3) reached today', async () => {
      const today = new Date().toISOString().split('T')[0];
      const session = { id: 'sess-1', currentDay: 0, activityStatus: {}, replanCount: { date: today, count: 3 } } as any;
      await expect(service.replanDay('sess-1', 'trip-1', 'fb-uid', session, 0, 'manual')).rejects.toThrow();
    });
  });

  describe('sendMorningBriefing', () => {
    it('generates briefing and dispatches it', async () => {
      mockPrisma.savedTrip.findFirst.mockResolvedValue(tripFixture);
      mockPrisma.user.upsert.mockResolvedValue({ id: 'db-uid' });
      mockAi.generateLiveBriefing.mockResolvedValue({ briefing: 'Good morning!', pushSummary: 'Day 1' });
      mockProfile.getProfile.mockResolvedValue(null);
      mockGateway.isConnected.mockReturnValue(false);
      mockSession.update.mockResolvedValue({});

      const session = { id: 'sess-1', tripId: 'trip-1', userId: 'db-uid', currentDay: 0, activityStatus: {} } as any;
      await service.sendMorningBriefing(session);
      expect(mockNotification.sendToUser).toHaveBeenCalled();
    });
  });

  describe('sendMealNudge', () => {
    it('dispatches meal nudge when food guide available', async () => {
      mockPrisma.savedTrip.findFirst.mockResolvedValue(tripFixture);
      mockGateway.isConnected.mockReturnValue(false);
      mockSession.update.mockResolvedValue({});

      const session = { id: 'sess-1', tripId: 'trip-1', userId: 'db-uid', currentDay: 0 } as any;
      await service.sendMealNudge(session, 'breakfast');
      expect(mockNotification.sendToUser).toHaveBeenCalled();
    });
  });

  describe('handleLocationUpdate', () => {
    it('skips suggestion if rate limit not reached', async () => {
      const recentTime = new Date(Date.now() - 30 * 60 * 1000); // 30 min ago
      const session = { id: 'sess-1', tripId: 'trip-1', userId: 'db-uid', currentDay: 0, activityStatus: {}, lastSuggestAt: recentTime } as any;
      mockSession.update.mockResolvedValue({});

      await service.handleLocationUpdate('sess-1', session, 25.0, 91.8);
      expect(mockAi.generateLocationSuggestion).not.toHaveBeenCalled();
    });

    it('calls AI when rate limit allows', async () => {
      const oldTime = new Date(Date.now() - 90 * 60 * 1000); // 90 min ago
      mockPrisma.savedTrip.findFirst.mockResolvedValue(tripFixture);
      mockAi.generateLocationSuggestion.mockResolvedValue({ suggestion: 'Great place!', placeName: 'Mawlynnong', mapQuery: 'Mawlynnong, Meghalaya', pushSummary: 'Visit Mawlynnong!' });
      mockGateway.isConnected.mockReturnValue(false);
      mockSession.update.mockResolvedValue({});

      const session = { id: 'sess-1', tripId: 'trip-1', userId: 'db-uid', currentDay: 0, activityStatus: {}, lastSuggestAt: oldTime } as any;
      await service.handleLocationUpdate('sess-1', session, 25.0, 91.8);
      expect(mockAi.generateLocationSuggestion).toHaveBeenCalled();
    });
  });
```

- [ ] **Step 2: Run new tests to verify they fail**

```bash
npx jest live-guide.service.spec --no-coverage
```
Expected: FAIL on the new tests.

- [ ] **Step 3: Add smart feature methods to LiveGuideService**

Add these methods to `src/live-guide/live-guide.service.ts` (after `deactivate`):

```typescript
  async replanDay(
    sessionId: string,
    tripId: string,
    firebaseUid: string,
    session: LiveGuideSession,
    dayIndex: number,
    triggeredBy: 'finished_early' | 'skip' | 'manual',
  ) {
    const today = new Date().toISOString().split('T')[0];
    const replanCount = (session.replanCount as any) ?? { date: '', count: 0 };
    const todayCount = replanCount.date === today ? replanCount.count : 0;
    if (todayCount >= 3) throw new Error('Replan limit reached: max 3 replans per day');

    const user = await this.findOrCreateUser(firebaseUid);
    const trip = await this.getTrip(tripId, user.id);
    const todayPlan = this.getTodayPlan(trip.itineraryData, dayIndex);
    const allActivities: any[] = todayPlan?.activities ?? [];

    const status = session.activityStatus as ActivityStatus;
    const remaining = allActivities.filter(
      (_: any, i: number) => status[`${dayIndex}:${i}`] !== 'done' && status[`${dayIndex}:${i}`] !== 'skipped',
    );

    const currentTime = new Date().toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit', timeZone: 'Asia/Kolkata' });
    const profile = await this.profileService.getProfile(firebaseUid).catch(() => null);

    const activities = await this.aiService.replanDay({
      destination: trip.destination,
      currentTime,
      remainingActivities: remaining.map((a: any) => ({ time: a.time, activity: a.activity, mapQuery: a.mapQuery })),
      triggeredBy,
      profileSummary: this.buildProfileSummary(profile),
    });

    await this.sessionService.update(sessionId, {
      replanCount: { date: today, count: todayCount + 1 },
    });

    return { activities };
  }

  async sendMorningBriefing(session: LiveGuideSession) {
    const trip = await this.prisma.savedTrip.findFirst({ where: { id: session.tripId } });
    if (!trip) return;

    const todayPlan = this.getTodayPlan(trip.itineraryData, session.currentDay);
    const activities: any[] = todayPlan?.activities ?? [];

    try {
      const profile = await this.profileService.getProfile(session.userId).catch(() => null);
      const result = await this.aiService.generateLiveBriefing({
        destination: trip.destination,
        state: trip.state,
        dayNumber: session.currentDay + 1,
        todayActivities: activities.map((a: any) => ({ time: a.time, activity: a.activity })),
        profileSummary: this.buildProfileSummary(profile),
      });

      this.dispatch(session.userId, 'morning_briefing', { briefing: result.briefing, todayPlan }, result.pushSummary, result.briefing);
      await this.sessionService.update(session.id, { lastBriefingAt: new Date() });
    } catch (err) {
      this.logger.warn(`Morning briefing failed for session ${session.id}: ${(err as Error).message}`);
    }
  }

  async sendMealNudge(session: LiveGuideSession, meal: 'breakfast' | 'lunch' | 'dinner') {
    const trip = await this.prisma.savedTrip.findFirst({ where: { id: session.tripId } });
    if (!trip) return;

    const mealPlan: any[] = (trip.foodGuideData as any)?.mealPlan ?? [];
    const dayMeal = mealPlan.find((m: any) => m.day === session.currentDay + 1);
    if (!dayMeal) return;

    const suggestion = dayMeal[meal];
    if (!suggestion) return;

    const title = `${meal.charAt(0).toUpperCase() + meal.slice(1)} time!`;
    const body = `${suggestion.suggestion} — ${suggestion.cost ?? ''}`.trim();

    this.dispatch(session.userId, 'meal_nudge', { meal, suggestion }, title, body);

    const updateField: any = {};
    if (meal === 'breakfast') updateField.lastBreakfastAt = new Date();
    if (meal === 'lunch') updateField.lastLunchAt = new Date();
    if (meal === 'dinner') updateField.lastDinnerAt = new Date();
    await this.sessionService.update(session.id, updateField);
  }

  async handleLocationUpdate(sessionId: string, session: LiveGuideSession, lat: number, lng: number) {
    await this.sessionService.update(sessionId, { lastLocation: { lat, lng, timestamp: Date.now() } });

    const oneHourAgo = Date.now() - 3_600_000;
    const lastSuggest = session.lastSuggestAt ? new Date(session.lastSuggestAt).getTime() : 0;
    if (lastSuggest > oneHourAgo) return;

    const trip = await this.prisma.savedTrip.findFirst({ where: { id: session.tripId } });
    if (!trip) return;

    try {
      const todayPlan = this.getTodayPlan(trip.itineraryData, session.currentDay);
      const existing = (todayPlan?.activities ?? []).map((a: any) => a.activity);

      const result = await this.aiService.generateLocationSuggestion({
        destination: trip.destination,
        state: trip.state,
        lat,
        lng,
        existingActivities: existing,
      });

      this.dispatch(
        session.userId,
        'location_suggestion',
        { suggestion: result.suggestion, placeName: result.placeName, mapQuery: result.mapQuery },
        'Nearby suggestion',
        result.pushSummary,
      );

      await this.sessionService.update(sessionId, { lastSuggestAt: new Date() });
    } catch (err) {
      this.logger.warn(`Location suggestion failed: ${(err as Error).message}`);
    }
  }
```

- [ ] **Step 4: Run all live-guide service tests**

```bash
npx jest live-guide.service.spec --no-coverage
```
Expected: PASS — all tests.

- [ ] **Step 5: Commit**

```bash
git add src/live-guide/live-guide.service.ts src/live-guide/live-guide.service.spec.ts
git commit -m "feat: add live guide smart features (replan, morning briefing, meal nudge, location)"
```

---

## Task 9: WebSocket Gateway

**Files:**
- Create: `src/live-guide/dto/activate-guide.dto.ts`
- Create: `src/live-guide/dto/location-update.dto.ts`
- Create: `src/live-guide/dto/mark-activity.dto.ts`
- Create: `src/live-guide/live-guide.gateway.ts`
- Create: `src/live-guide/live-guide.gateway.spec.ts`

- [ ] **Step 1: Create DTOs**

`src/live-guide/dto/activate-guide.dto.ts`:
```typescript
import { IsOptional, IsString } from 'class-validator';

export class ActivateGuideDto {
  @IsString()
  tripId: string;

  @IsOptional()
  @IsString()
  fcmToken?: string;
}
```

`src/live-guide/dto/location-update.dto.ts`:
```typescript
import { IsNumber, IsOptional } from 'class-validator';

export class LocationUpdateDto {
  @IsNumber()
  lat: number;

  @IsNumber()
  lng: number;

  @IsOptional()
  @IsNumber()
  timestamp?: number;
}
```

`src/live-guide/dto/mark-activity.dto.ts`:
```typescript
import { IsNumber, IsOptional, IsString, Min } from 'class-validator';

export class MarkActivityDto {
  @IsNumber() @Min(0)
  dayIndex: number;

  @IsNumber() @Min(0)
  activityIndex: number;

  @IsOptional()
  @IsString()
  reason?: string;
}
```

- [ ] **Step 2: Write failing gateway tests**

`src/live-guide/live-guide.gateway.spec.ts`:
```typescript
import { Test } from '@nestjs/testing';
import { forwardRef } from '@nestjs/common';
import { LiveGuideGateway } from './live-guide.gateway';
import { LiveGuideService } from './live-guide.service';

const mockLiveGuideService = {
  activateGuide: jest.fn(),
  markActivityDone: jest.fn(),
  skipActivity: jest.fn(),
  replanDay: jest.fn(),
  handleLocationUpdate: jest.fn(),
  deactivate: jest.fn(),
};

const mockSocket = () => ({
  id: 'socket-1',
  data: {} as Record<string, any>,
  disconnect: jest.fn(),
  emit: jest.fn(),
  handshake: { auth: {} },
});

jest.mock('firebase-admin', () => ({
  auth: () => ({
    verifyIdToken: jest.fn().mockResolvedValue({ uid: 'fb-uid', name: 'Test User' }),
  }),
  apps: { length: 1 },
  initializeApp: jest.fn(),
  messaging: () => ({ sendEachForMulticast: jest.fn() }),
}));

describe('LiveGuideGateway', () => {
  let gateway: LiveGuideGateway;

  beforeEach(async () => {
    jest.clearAllMocks();
    const module = await Test.createTestingModule({
      providers: [
        LiveGuideGateway,
        { provide: LiveGuideService, useValue: mockLiveGuideService },
      ],
    }).compile();
    gateway = module.get(LiveGuideGateway);
  });

  describe('handleConnection', () => {
    it('disconnects socket without token', async () => {
      const socket = mockSocket();
      socket.handshake.auth = {};
      await gateway.handleConnection(socket as any);
      expect(socket.disconnect).toHaveBeenCalled();
    });

    it('stores userId on socket.data when token is valid', async () => {
      const socket = mockSocket();
      socket.handshake.auth = { token: 'Bearer valid-token' };
      await gateway.handleConnection(socket as any);
      expect(socket.data.userId).toBe('fb-uid');
    });
  });

  describe('onActivateGuide', () => {
    it('emits guide_activated on success', async () => {
      const socket = mockSocket();
      socket.data = { userId: 'fb-uid' };
      mockLiveGuideService.activateGuide.mockResolvedValue({ todayPlan: {}, briefing: 'GM!', sessionId: 'sess-1', status: 'during' });
      await gateway.onActivateGuide(socket as any, { tripId: 'trip-1' });
      expect(socket.emit).toHaveBeenCalledWith('guide_activated', expect.objectContaining({ briefing: 'GM!' }));
    });

    it('emits error if not authenticated', async () => {
      const socket = mockSocket();
      socket.data = {};
      await gateway.onActivateGuide(socket as any, { tripId: 'trip-1' });
      expect(socket.emit).toHaveBeenCalledWith('error', expect.objectContaining({ message: expect.any(String) }));
    });
  });

  describe('isConnected / sendToUser', () => {
    it('returns false for unknown user', () => {
      expect(gateway.isConnected('unknown-uid')).toBe(false);
    });
  });
});
```

- [ ] **Step 3: Run to verify they fail**

```bash
npx jest live-guide.gateway.spec --no-coverage
```
Expected: FAIL.

- [ ] **Step 4: Implement LiveGuideGateway**

`src/live-guide/live-guide.gateway.ts`:
```typescript
import {
  WebSocketGateway,
  WebSocketServer,
  SubscribeMessage,
  OnGatewayConnection,
  OnGatewayDisconnect,
  ConnectedSocket,
  MessageBody,
} from '@nestjs/websockets';
import { forwardRef, Inject, Logger } from '@nestjs/common';
import { Server, Socket } from 'socket.io';
import * as admin from 'firebase-admin';
import { LiveGuideService } from './live-guide.service';

interface SocketContext {
  userId: string;
  sessionId: string | null;
  tripId: string | null;
}

@WebSocketGateway({ cors: { origin: '*' } })
export class LiveGuideGateway implements OnGatewayConnection, OnGatewayDisconnect {
  @WebSocketServer()
  server: Server;

  private readonly logger = new Logger(LiveGuideGateway.name);

  // socketId → context
  private readonly connectedSockets = new Map<string, SocketContext>();

  // userId → Set<socketId>
  private readonly userSockets = new Map<string, Set<string>>();

  constructor(
    @Inject(forwardRef(() => LiveGuideService))
    private readonly liveGuideService: LiveGuideService,
  ) {}

  async handleConnection(client: Socket): Promise<void> {
    const rawToken = client.handshake.auth?.token ?? '';
    const token = typeof rawToken === 'string' ? rawToken.replace('Bearer ', '') : '';

    if (!token) {
      client.disconnect();
      return;
    }

    try {
      const decoded = await admin.auth().verifyIdToken(token);
      client.data.userId = decoded.uid;
      client.data.displayName = decoded.name ?? '';

      this.connectedSockets.set(client.id, { userId: decoded.uid, sessionId: null, tripId: null });
      if (!this.userSockets.has(decoded.uid)) this.userSockets.set(decoded.uid, new Set());
      this.userSockets.get(decoded.uid)!.add(client.id);

      this.logger.log(`WS connected: ${decoded.uid}`);
    } catch {
      client.disconnect();
    }
  }

  handleDisconnect(client: Socket): void {
    const ctx = this.connectedSockets.get(client.id);
    if (ctx) {
      this.userSockets.get(ctx.userId)?.delete(client.id);
      if (this.userSockets.get(ctx.userId)?.size === 0) this.userSockets.delete(ctx.userId);
      this.connectedSockets.delete(client.id);
      this.logger.log(`WS disconnected: ${ctx.userId}`);
    }
  }

  isConnected(userId: string): boolean {
    return (this.userSockets.get(userId)?.size ?? 0) > 0;
  }

  sendToUser(userId: string, event: string, data: any): void {
    for (const socketId of this.userSockets.get(userId) ?? []) {
      this.server?.to(socketId).emit(event, data);
    }
  }

  @SubscribeMessage('activate_guide')
  async onActivateGuide(
    @ConnectedSocket() client: Socket,
    @MessageBody() payload: { tripId: string; fcmToken?: string },
  ) {
    const userId: string = client.data?.userId;
    if (!userId) {
      client.emit('error', { message: 'Not authenticated' });
      return;
    }

    try {
      const result = await this.liveGuideService.activateGuide(payload.tripId, userId, payload.fcmToken ?? '');
      const ctx = this.connectedSockets.get(client.id);
      if (ctx) {
        ctx.sessionId = result.sessionId;
        ctx.tripId = payload.tripId;
      }
      client.emit('guide_activated', result);
    } catch (err) {
      client.emit('error', { message: (err as Error).message });
    }
  }

  @SubscribeMessage('location_update')
  async onLocationUpdate(
    @ConnectedSocket() client: Socket,
    @MessageBody() payload: { lat: number; lng: number; timestamp?: number },
  ) {
    const ctx = this.connectedSockets.get(client.id);
    if (!ctx?.sessionId) return;
    try {
      const session = await this.getSession(ctx.sessionId);
      if (session) await this.liveGuideService.handleLocationUpdate(ctx.sessionId, session, payload.lat, payload.lng);
    } catch (err) {
      this.logger.warn(`location_update error: ${(err as Error).message}`);
    }
  }

  @SubscribeMessage('mark_done')
  async onMarkDone(
    @ConnectedSocket() client: Socket,
    @MessageBody() payload: { dayIndex: number; activityIndex: number },
  ) {
    const ctx = this.connectedSockets.get(client.id);
    if (!ctx?.sessionId) return;
    try {
      const session = await this.getSession(ctx.sessionId);
      if (!session) return;
      const result = await this.liveGuideService.markActivityDone(ctx.sessionId, session, payload.dayIndex, payload.activityIndex);
      client.emit('activity_marked', result);
    } catch (err) {
      client.emit('error', { message: (err as Error).message });
    }
  }

  @SubscribeMessage('skip_activity')
  async onSkipActivity(
    @ConnectedSocket() client: Socket,
    @MessageBody() payload: { dayIndex: number; activityIndex: number; reason?: string },
  ) {
    const ctx = this.connectedSockets.get(client.id);
    if (!ctx?.sessionId || !ctx.tripId || !client.data?.userId) return;
    try {
      const session = await this.getSession(ctx.sessionId);
      if (!session) return;
      const result = await this.liveGuideService.skipActivity(
        ctx.sessionId, ctx.tripId, client.data.userId, session, payload.dayIndex, payload.activityIndex, payload.reason,
      );
      client.emit('activity_marked', result);
    } catch (err) {
      client.emit('error', { message: (err as Error).message });
    }
  }

  @SubscribeMessage('request_replan')
  async onRequestReplan(
    @ConnectedSocket() client: Socket,
    @MessageBody() payload: { dayIndex: number },
  ) {
    const ctx = this.connectedSockets.get(client.id);
    if (!ctx?.sessionId || !ctx.tripId || !client.data?.userId) return;
    try {
      const session = await this.getSession(ctx.sessionId);
      if (!session) return;
      const result = await this.liveGuideService.replanDay(ctx.sessionId, ctx.tripId, client.data.userId, session, payload.dayIndex, 'manual');
      client.emit('replan_result', result);
    } catch (err) {
      client.emit('error', { message: (err as Error).message });
    }
  }

  @SubscribeMessage('deactivate_guide')
  async onDeactivateGuide(@ConnectedSocket() client: Socket) {
    const ctx = this.connectedSockets.get(client.id);
    if (!ctx?.sessionId) return;
    try {
      await this.liveGuideService.deactivate(ctx.sessionId);
      ctx.sessionId = null;
      ctx.tripId = null;
      client.emit('guide_deactivated', {});
    } catch (err) {
      client.emit('error', { message: (err as Error).message });
    }
  }

  private async getSession(sessionId: string) {
    const { PrismaService } = await import('../prisma/prisma.service');
    // Use prisma directly — we can't inject it here without circular dep.
    // Instead we import it lazily. Note: In production, the module is already resolved.
    // The cleaner pattern is to inject PrismaService in the constructor.
    return null; // See note below — this is replaced in Task 9 Step 5
  }
}
```

**Note on `getSession`:** The gateway needs to load the current session to pass to service methods. Since `PrismaService` is global, inject it directly in the constructor. Replace the `getSession` implementation with:

```typescript
// In constructor, add:
private readonly prisma: PrismaService

// Inject it:
constructor(
  @Inject(forwardRef(() => LiveGuideService))
  private readonly liveGuideService: LiveGuideService,
  private readonly prisma: PrismaService,
) {}

// Replace getSession:
private async getSession(sessionId: string) {
  return this.prisma.liveGuideSession.findUnique({ where: { id: sessionId } });
}
```

Write the final gateway with `PrismaService` injected from the start (not the lazy version above). The complete constructor is:
```typescript
constructor(
  @Inject(forwardRef(() => LiveGuideService))
  private readonly liveGuideService: LiveGuideService,
  private readonly prisma: PrismaService,
) {}
```

- [ ] **Step 5: Run gateway tests**

```bash
npx jest live-guide.gateway.spec --no-coverage
```
Expected: PASS — all tests.

- [ ] **Step 6: Commit**

```bash
git add src/live-guide/live-guide.gateway.ts src/live-guide/live-guide.gateway.spec.ts src/live-guide/dto/
git commit -m "feat: add WebSocket gateway with Firebase auth and live guide event handling"
```

---

## Task 10: Scheduler Service

**Files:**
- Create: `src/live-guide/scheduler.service.ts`
- Create: `src/live-guide/scheduler.service.spec.ts`

The scheduler runs every minute in IST timezone and fires time-based notifications (morning briefing at 7:00-7:59 AM IST, meal nudges at 8:00, 13:00, 19:00 IST).

- [ ] **Step 1: Write failing tests**

`src/live-guide/scheduler.service.spec.ts`:
```typescript
import { Test } from '@nestjs/testing';
import { SchedulerService } from './scheduler.service';
import { LiveGuideService } from './live-guide.service';
import { SessionService } from './session.service';

const mockLiveGuideService = { sendMorningBriefing: jest.fn(), sendMealNudge: jest.fn() };
const mockSessionService = { getAllActiveSessions: jest.fn() };

describe('SchedulerService', () => {
  let service: SchedulerService;

  beforeEach(async () => {
    jest.clearAllMocks();
    const module = await Test.createTestingModule({
      providers: [
        SchedulerService,
        { provide: LiveGuideService, useValue: mockLiveGuideService },
        { provide: SessionService, useValue: mockSessionService },
      ],
    }).compile();
    service = module.get(SchedulerService);
  });

  it('tick: calls sendMorningBriefing when IST hour is 7 and briefing not sent today', async () => {
    const session = {
      id: 'sess-1',
      lastBriefingAt: null,
      lastBreakfastAt: null, lastLunchAt: null, lastDinnerAt: null,
    };
    mockSessionService.getAllActiveSessions.mockResolvedValue([session]);
    mockLiveGuideService.sendMorningBriefing.mockResolvedValue(undefined);

    await service.tick(7, 30); // simulate 7:30 AM IST
    expect(mockLiveGuideService.sendMorningBriefing).toHaveBeenCalledWith(session);
  });

  it('tick: skips morning briefing if already sent today', async () => {
    const today = new Date().toISOString().split('T')[0];
    const session = {
      id: 'sess-1',
      lastBriefingAt: new Date(`${today}T02:00:00Z`), // already sent today
      lastBreakfastAt: null, lastLunchAt: null, lastDinnerAt: null,
    };
    mockSessionService.getAllActiveSessions.mockResolvedValue([session]);

    await service.tick(7, 30);
    expect(mockLiveGuideService.sendMorningBriefing).not.toHaveBeenCalled();
  });

  it('tick: sends lunch nudge at 13:00 IST', async () => {
    const session = {
      id: 'sess-1',
      lastBriefingAt: new Date(),
      lastBreakfastAt: null, lastLunchAt: null, lastDinnerAt: null,
    };
    mockSessionService.getAllActiveSessions.mockResolvedValue([session]);
    mockLiveGuideService.sendMealNudge.mockResolvedValue(undefined);

    await service.tick(13, 0);
    expect(mockLiveGuideService.sendMealNudge).toHaveBeenCalledWith(session, 'lunch');
  });

  it('tick: does nothing outside trigger windows', async () => {
    const session = { id: 'sess-1', lastBriefingAt: null, lastBreakfastAt: null, lastLunchAt: null, lastDinnerAt: null };
    mockSessionService.getAllActiveSessions.mockResolvedValue([session]);

    await service.tick(10, 0); // 10 AM — no trigger
    expect(mockLiveGuideService.sendMorningBriefing).not.toHaveBeenCalled();
    expect(mockLiveGuideService.sendMealNudge).not.toHaveBeenCalled();
  });
});
```

- [ ] **Step 2: Run to verify they fail**

```bash
npx jest scheduler.service.spec --no-coverage
```
Expected: FAIL.

- [ ] **Step 3: Implement SchedulerService**

`src/live-guide/scheduler.service.ts`:
```typescript
import { Injectable, Logger } from '@nestjs/common';
import { Cron } from '@nestjs/schedule';
import { LiveGuideService } from './live-guide.service';
import { SessionService } from './session.service';

@Injectable()
export class SchedulerService {
  private readonly logger = new Logger(SchedulerService.name);

  constructor(
    private readonly liveGuideService: LiveGuideService,
    private readonly sessionService: SessionService,
  ) {}

  @Cron('* * * * *')
  async tickCron(): Promise<void> {
    const now = new Date();
    const istHour = Number(now.toLocaleString('en-GB', { hour: 'numeric', hour12: false, timeZone: 'Asia/Kolkata' }));
    const istMinute = now.getMinutes();
    await this.tick(istHour, istMinute);
  }

  async tick(istHour: number, istMinute: number): Promise<void> {
    const sessions = await this.sessionService.getAllActiveSessions();
    const today = new Date().toISOString().split('T')[0];

    for (const session of sessions) {
      try {
        // Morning briefing: 7:00–7:59 AM IST
        if (istHour === 7) {
          const lastBriefing = session.lastBriefingAt ? new Date(session.lastBriefingAt).toISOString().split('T')[0] : null;
          if (lastBriefing !== today) {
            await this.liveGuideService.sendMorningBriefing(session as any);
          }
        }

        // Breakfast: 8:00 AM IST
        if (istHour === 8 && istMinute === 0) {
          const lastBreakfast = session.lastBreakfastAt ? new Date(session.lastBreakfastAt).toISOString().split('T')[0] : null;
          if (lastBreakfast !== today) {
            await this.liveGuideService.sendMealNudge(session as any, 'breakfast');
          }
        }

        // Lunch: 1:00 PM IST
        if (istHour === 13 && istMinute === 0) {
          const lastLunch = session.lastLunchAt ? new Date(session.lastLunchAt).toISOString().split('T')[0] : null;
          if (lastLunch !== today) {
            await this.liveGuideService.sendMealNudge(session as any, 'lunch');
          }
        }

        // Dinner: 7:00 PM IST
        if (istHour === 19 && istMinute === 0) {
          const lastDinner = session.lastDinnerAt ? new Date(session.lastDinnerAt).toISOString().split('T')[0] : null;
          if (lastDinner !== today) {
            await this.liveGuideService.sendMealNudge(session as any, 'dinner');
          }
        }
      } catch (err) {
        this.logger.warn(`Scheduler tick error for session ${session.id}: ${(err as Error).message}`);
      }
    }
  }
}
```

- [ ] **Step 4: Run tests to verify they pass**

```bash
npx jest scheduler.service.spec --no-coverage
```
Expected: PASS — 4 tests.

- [ ] **Step 5: Commit**

```bash
git add src/live-guide/scheduler.service.ts src/live-guide/scheduler.service.spec.ts
git commit -m "feat: add scheduler service for timed push notifications"
```

---

## Task 11: REST controller + LiveGuideModule + AppModule wiring

**Files:**
- Create: `src/live-guide/live-guide.controller.ts`
- Create: `src/live-guide/live-guide.controller.spec.ts`
- Create: `src/live-guide/live-guide.module.ts`
- Modify: `src/app.module.ts`
- Modify: `src/main.ts`

- [ ] **Step 1: Write failing controller tests**

`src/live-guide/live-guide.controller.spec.ts`:
```typescript
import { Test } from '@nestjs/testing';
import { LiveGuideController } from './live-guide.controller';
import { LiveGuideService } from './live-guide.service';
import { FirebaseAuthGuard } from '../auth/firebase-auth.guard';

const mockService = { getSessionStatus: jest.fn() };

describe('LiveGuideController', () => {
  let controller: LiveGuideController;

  beforeEach(async () => {
    jest.clearAllMocks();
    const module = await Test.createTestingModule({
      controllers: [LiveGuideController],
      providers: [{ provide: LiveGuideService, useValue: mockService }],
    })
      .overrideGuard(FirebaseAuthGuard)
      .useValue({ canActivate: () => true })
      .compile();
    controller = module.get(LiveGuideController);
  });

  it('GET /live-guide/:tripId/status calls getSessionStatus', async () => {
    mockService.getSessionStatus.mockResolvedValue({ sessionId: 's1', isActive: true });
    const result = await controller.status('trip-1', { user: { uid: 'fb' } } as any);
    expect(mockService.getSessionStatus).toHaveBeenCalledWith('trip-1', 'fb');
    expect(result).toEqual({ sessionId: 's1', isActive: true });
  });
});
```

- [ ] **Step 2: Run to verify it fails**

```bash
npx jest live-guide.controller.spec --no-coverage
```
Expected: FAIL.

- [ ] **Step 3: Implement LiveGuideController**

`src/live-guide/live-guide.controller.ts`:
```typescript
import { Controller, Get, Param, Req, UseGuards } from '@nestjs/common';
import { FirebaseAuthGuard } from '../auth/firebase-auth.guard';
import { LiveGuideService } from './live-guide.service';

@Controller('live-guide')
@UseGuards(FirebaseAuthGuard)
export class LiveGuideController {
  constructor(private readonly service: LiveGuideService) {}

  @Get(':tripId/status')
  async status(@Param('tripId') tripId: string, @Req() req: any) {
    return this.service.getSessionStatus(tripId, req.user.uid);
  }
}
```

- [ ] **Step 4: Run controller test**

```bash
npx jest live-guide.controller.spec --no-coverage
```
Expected: PASS.

- [ ] **Step 5: Create LiveGuideModule**

`src/live-guide/live-guide.module.ts`:
```typescript
import { forwardRef, Module } from '@nestjs/common';
import { LiveGuideController } from './live-guide.controller';
import { LiveGuideService } from './live-guide.service';
import { LiveGuideGateway } from './live-guide.gateway';
import { SessionService } from './session.service';
import { NotificationService } from './notification.service';
import { SchedulerService } from './scheduler.service';
import { DevicesModule } from '../devices/devices.module';
import { ProfileModule } from '../profile/profile.module';
import { CorrectionsModule } from '../corrections/corrections.module';

@Module({
  imports: [DevicesModule, ProfileModule, CorrectionsModule],
  controllers: [LiveGuideController],
  providers: [
    LiveGuideService,
    LiveGuideGateway,
    SessionService,
    NotificationService,
    SchedulerService,
  ],
  exports: [LiveGuideService, LiveGuideGateway],
})
export class LiveGuideModule {}
```

- [ ] **Step 6: Update AppModule**

Replace `src/app.module.ts` with:
```typescript
import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { ThrottlerModule } from '@nestjs/throttler';
import { ScheduleModule } from '@nestjs/schedule';
import { PrismaModule } from './prisma/prisma.module';
import { CacheModule } from './cache/cache.module';
import { AiModule } from './ai/ai.module';
import { DestinationFinderModule } from './destination-finder/destination-finder.module';
import { SavedTripsModule } from './saved-trips/saved-trips.module';
import { SharedTripsModule } from './shared-trips/shared-trips.module';
import { ProfileModule } from './profile/profile.module';
import { CorrectionsModule } from './corrections/corrections.module';
import { DevicesModule } from './devices/devices.module';
import { LiveGuideModule } from './live-guide/live-guide.module';

@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true }),
    ThrottlerModule.forRoot([{ ttl: 60000, limit: 20 }]),
    ScheduleModule.forRoot(),
    PrismaModule,
    CacheModule,
    AiModule,
    DestinationFinderModule,
    SavedTripsModule,
    SharedTripsModule,
    ProfileModule,
    CorrectionsModule,
    DevicesModule,
    LiveGuideModule,
  ],
})
export class AppModule {}
```

- [ ] **Step 7: Update main.ts to add IoAdapter**

Replace `src/main.ts` with:
```typescript
import { NestFactory } from '@nestjs/core';
import { ValidationPipe } from '@nestjs/common';
import { IoAdapter } from '@nestjs/platform-socket.io';
import { AppModule } from './app.module';
import { ensureDatabase } from './ensure-db';

async function bootstrap() {
  await ensureDatabase();
  const app = await NestFactory.create(AppModule);
  app.useWebSocketAdapter(new IoAdapter(app));
  app.useGlobalPipes(new ValidationPipe({ whitelist: true, transform: true }));
  app.enableCors({ origin: '*' });
  await app.listen(3000, '0.0.0.0');
}
bootstrap();
```

- [ ] **Step 8: Build and run all tests**

```bash
cd sarthi-backend && npm run build
```
Expected: Clean build, no TypeScript errors.

```bash
npx jest --no-coverage
```
Expected: All tests pass (the new 30+ tests plus the existing 307).

- [ ] **Step 9: Commit**

```bash
git add src/live-guide/live-guide.controller.ts src/live-guide/live-guide.controller.spec.ts src/live-guide/live-guide.module.ts src/app.module.ts src/main.ts
git commit -m "feat: wire live guide module, scheduler, IoAdapter, and REST status endpoint"
```

---

## Summary

After all 11 tasks, the following are live:

**WebSocket events (Socket.io):**
- `activate_guide` → `guide_activated`
- `location_update` → `location_suggestion`
- `mark_done` → `activity_marked`
- `skip_activity` → `activity_marked`
- `request_replan` → `replan_result`
- `deactivate_guide` → `guide_deactivated`

**REST endpoints:**
- `POST /devices` — register FCM token
- `DELETE /devices/:fcmToken` — unregister device
- `GET /live-guide/:tripId/status` — get live session status
- `PATCH /users/me/notification-prefs` — update push preferences

**Scheduled notifications (IST):**
- 7 AM — morning briefing
- 8 AM — breakfast nudge
- 1 PM — lunch nudge
- 7 PM — dinner nudge

**AI calls per active day:** ~5 (1 briefing + up to 3 replans + 1 location suggestion)
