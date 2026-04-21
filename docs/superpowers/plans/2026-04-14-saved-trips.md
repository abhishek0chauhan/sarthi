# Saved Trips Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Let authenticated users save, list, view, update, delete, and share their AI-generated trip bundles (destination + itinerary + food guide).

**Architecture:** Two new Prisma models (`User`, `SavedTrip`), two new NestJS modules (`SavedTripsModule` for auth-protected CRUD, `SharedTripsModule` for public shared-trip viewing), a `UserService` for lazy user creation from Firebase tokens, and a minor extension to the itinerary prompt for travel mode. The frontend sends the full AI response JSON when saving; the backend stores it as JSON columns.

**Tech Stack:** NestJS v11, TypeScript, Prisma 5, PostgreSQL, Jest 30, class-validator. No git commits — user controls commits.

**Spec:** `docs/superpowers/specs/2026-04-14-saved-trips-design.md`

---

## File Map

| File | Action | Responsibility |
|---|---|---|
| `prisma/schema.prisma` | Modify | Add `User` model, `TravelMode` enum, `SavedTrip` model |
| `src/saved-trips/saved-trips.module.ts` | Create | Module wiring for auth-protected saved trips |
| `src/saved-trips/saved-trips.controller.ts` | Create | CRUD + sharing endpoints (auth-protected) |
| `src/saved-trips/saved-trips.service.ts` | Create | Business logic: create, list, get, update, delete, share/unshare |
| `src/saved-trips/saved-trips.service.spec.ts` | Create | Service unit tests |
| `src/saved-trips/saved-trips.controller.spec.ts` | Create | Controller unit tests |
| `src/saved-trips/user.service.ts` | Create | Lazy find-or-create User from Firebase UID |
| `src/saved-trips/user.service.spec.ts` | Create | User service unit tests |
| `src/saved-trips/dto/create-saved-trip.dto.ts` | Create | Validation for POST /saved-trips |
| `src/saved-trips/dto/update-saved-trip.dto.ts` | Create | Validation for PATCH /saved-trips/:id |
| `src/shared-trips/shared-trips.module.ts` | Create | Module wiring for public shared trip viewing (no auth) |
| `src/shared-trips/shared-trips.controller.ts` | Create | GET /shared-trips/:token (public) |
| `src/shared-trips/shared-trips.controller.spec.ts` | Create | Controller unit tests |
| `src/app.module.ts` | Modify | Register SavedTripsModule and SharedTripsModule |
| `src/destination-finder/dto/itinerary.dto.ts` | Modify | Add optional `travelMode` field |
| `src/ai/prompts/destination.prompt.ts` | Modify | Extend `ItineraryParams`, inject travel mode into prompt |
| `src/ai/prompts/destination.prompt.spec.ts` | Modify | Tests for travel mode in itinerary prompt |

---

### Task 1: Prisma schema — add User, TravelMode, SavedTrip

**Files:**
- Modify: `prisma/schema.prisma`

- [ ] **Step 1: Add models to schema.prisma**

Open `prisma/schema.prisma`. After the existing `Destination` model, add:

```prisma
enum TravelMode {
  train
  flight
  bus
  car
}

model User {
  id          String      @id @default(uuid())
  firebaseUid String      @unique
  displayName String?
  email       String?
  createdAt   DateTime    @default(now())
  updatedAt   DateTime    @updatedAt
  savedTrips  SavedTrip[]
}

model SavedTrip {
  id              String      @id @default(uuid())
  userId          String
  user            User        @relation(fields: [userId], references: [id], onDelete: Cascade)
  name            String
  destination     String
  state           String
  dates           Json
  travelMode      TravelMode?
  destinationData Json
  itineraryData   Json?
  foodGuideData   Json?
  shareToken      String?     @unique
  createdAt       DateTime    @default(now())
  updatedAt       DateTime    @updatedAt

  @@index([userId])
  @@index([shareToken])
}
```

- [ ] **Step 2: Generate Prisma client and run migration**

Run:
```bash
cd /home/abhishek/Desktop/Abhishek/Sarthi/sarthi-backend && npx prisma migrate dev --name add-user-and-saved-trips 2>&1 | tail -15
```

Expected: Migration applied successfully, Prisma Client generated.

- [ ] **Step 3: Verify Prisma client has new types**

Run:
```bash
cd /home/abhishek/Desktop/Abhishek/Sarthi/sarthi-backend && npx prisma generate 2>&1 | tail -5
```

Expected: `✔ Generated Prisma Client`

---

### Task 2: UserService — lazy find-or-create

**Files:**
- Create: `src/saved-trips/user.service.ts`
- Create: `src/saved-trips/user.service.spec.ts`

- [ ] **Step 1: Write failing tests for UserService**

Create `src/saved-trips/user.service.spec.ts`:

```typescript
import { UserService } from './user.service';

describe('UserService', () => {
  let service: UserService;
  let prisma: { user: { upsert: jest.Mock } };

  beforeEach(() => {
    prisma = { user: { upsert: jest.fn() } };
    service = new UserService(prisma as any);
  });

  it('creates a new user when firebaseUid not found', async () => {
    const mockUser = { id: 'uuid-1', firebaseUid: 'fb-123', displayName: 'Abhishek', email: 'a@b.com' };
    prisma.user.upsert.mockResolvedValue(mockUser);

    const result = await service.findOrCreate('fb-123', 'Abhishek', 'a@b.com');

    expect(prisma.user.upsert).toHaveBeenCalledWith({
      where: { firebaseUid: 'fb-123' },
      update: { displayName: 'Abhishek', email: 'a@b.com' },
      create: { firebaseUid: 'fb-123', displayName: 'Abhishek', email: 'a@b.com' },
    });
    expect(result).toEqual(mockUser);
  });

  it('returns existing user and updates profile on match', async () => {
    const existing = { id: 'uuid-1', firebaseUid: 'fb-123', displayName: 'Updated', email: 'new@b.com' };
    prisma.user.upsert.mockResolvedValue(existing);

    const result = await service.findOrCreate('fb-123', 'Updated', 'new@b.com');
    expect(result.displayName).toBe('Updated');
  });

  it('handles missing displayName and email', async () => {
    const mockUser = { id: 'uuid-1', firebaseUid: 'fb-123', displayName: undefined, email: undefined };
    prisma.user.upsert.mockResolvedValue(mockUser);

    const result = await service.findOrCreate('fb-123');

    expect(prisma.user.upsert).toHaveBeenCalledWith({
      where: { firebaseUid: 'fb-123' },
      update: { displayName: undefined, email: undefined },
      create: { firebaseUid: 'fb-123', displayName: undefined, email: undefined },
    });
    expect(result).toEqual(mockUser);
  });
});
```

- [ ] **Step 2: Run tests to verify they fail**

Run:
```bash
cd /home/abhishek/Desktop/Abhishek/Sarthi/sarthi-backend && npx jest src/saved-trips/user.service.spec.ts --no-coverage 2>&1 | tail -10
```

Expected: FAIL — Cannot find module `./user.service`.

- [ ] **Step 3: Implement UserService**

Create `src/saved-trips/user.service.ts`:

```typescript
import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { User } from '@prisma/client';

@Injectable()
export class UserService {
  constructor(private readonly prisma: PrismaService) {}

  async findOrCreate(firebaseUid: string, displayName?: string, email?: string): Promise<User> {
    return this.prisma.user.upsert({
      where: { firebaseUid },
      update: { displayName, email },
      create: { firebaseUid, displayName, email },
    });
  }
}
```

- [ ] **Step 4: Run tests to verify they pass**

Run:
```bash
cd /home/abhishek/Desktop/Abhishek/Sarthi/sarthi-backend && npx jest src/saved-trips/user.service.spec.ts --no-coverage 2>&1 | tail -10
```

Expected: 3 tests pass.

---

### Task 3: DTOs — CreateSavedTripDto and UpdateSavedTripDto

**Files:**
- Create: `src/saved-trips/dto/create-saved-trip.dto.ts`
- Create: `src/saved-trips/dto/update-saved-trip.dto.ts`

- [ ] **Step 1: Create CreateSavedTripDto**

Create `src/saved-trips/dto/create-saved-trip.dto.ts`:

```typescript
import {
  IsDateString,
  IsEnum,
  IsObject,
  IsOptional,
  IsString,
  MaxLength,
  ValidateNested,
} from 'class-validator';
import { Type } from 'class-transformer';

class DateRangeDto {
  @IsDateString()
  from: string;

  @IsDateString()
  to: string;
}

export class CreateSavedTripDto {
  @IsOptional()
  @IsString()
  @MaxLength(100)
  name?: string;

  @IsString()
  destination: string;

  @IsString()
  state: string;

  @ValidateNested()
  @Type(() => DateRangeDto)
  dates: DateRangeDto;

  @IsOptional()
  @IsEnum(['train', 'flight', 'bus', 'car'])
  travelMode?: string;

  @IsObject()
  destinationData: object;

  @IsOptional()
  @IsObject()
  itineraryData?: object;

  @IsOptional()
  @IsObject()
  foodGuideData?: object;
}
```

- [ ] **Step 2: Create UpdateSavedTripDto**

Create `src/saved-trips/dto/update-saved-trip.dto.ts`:

```typescript
import { IsEnum, IsObject, IsOptional, IsString, MaxLength } from 'class-validator';

export class UpdateSavedTripDto {
  @IsOptional()
  @IsString()
  @MaxLength(100)
  name?: string;

  @IsOptional()
  @IsEnum(['train', 'flight', 'bus', 'car'])
  travelMode?: string;

  @IsOptional()
  @IsObject()
  itineraryData?: object;

  @IsOptional()
  @IsObject()
  foodGuideData?: object;
}
```

- [ ] **Step 3: Verify build compiles**

Run:
```bash
cd /home/abhishek/Desktop/Abhishek/Sarthi/sarthi-backend && npm run build 2>&1 | tail -5
```

Expected: Build succeeds.

---

### Task 4: SavedTripsService — CRUD + sharing logic

**Files:**
- Create: `src/saved-trips/saved-trips.service.ts`
- Create: `src/saved-trips/saved-trips.service.spec.ts`

- [ ] **Step 1: Write failing tests for SavedTripsService**

Create `src/saved-trips/saved-trips.service.spec.ts`:

```typescript
import { SavedTripsService } from './saved-trips.service';
import { UserService } from './user.service';
import { ForbiddenException, NotFoundException } from '@nestjs/common';

const mockUser = { id: 'user-1', firebaseUid: 'fb-123', displayName: 'Abhishek', email: 'a@b.com' };

const mockTrip = {
  id: 'trip-1',
  userId: 'user-1',
  name: 'Goa Trip',
  destination: 'Goa',
  state: 'Goa',
  dates: { from: '2026-11-10', to: '2026-11-14' },
  travelMode: null,
  destinationData: { name: 'Goa' },
  itineraryData: null,
  foodGuideData: null,
  shareToken: null,
  createdAt: new Date(),
  updatedAt: new Date(),
};

describe('SavedTripsService', () => {
  let service: SavedTripsService;
  let prisma: { savedTrip: { create: jest.Mock; findMany: jest.Mock; findUnique: jest.Mock; update: jest.Mock; delete: jest.Mock } };
  let userService: { findOrCreate: jest.Mock };

  beforeEach(() => {
    prisma = {
      savedTrip: {
        create: jest.fn(),
        findMany: jest.fn(),
        findUnique: jest.fn(),
        update: jest.fn(),
        delete: jest.fn(),
      },
    };
    userService = { findOrCreate: jest.fn() };
    service = new SavedTripsService(prisma as any, userService as any);
  });

  describe('create', () => {
    it('creates a trip with all fields populated', async () => {
      userService.findOrCreate.mockResolvedValue(mockUser);
      prisma.savedTrip.create.mockResolvedValue(mockTrip);

      const dto = {
        destination: 'Goa',
        state: 'Goa',
        dates: { from: '2026-11-10', to: '2026-11-14' },
        destinationData: { name: 'Goa' },
      };

      const result = await service.create(dto as any, { uid: 'fb-123', name: 'Abhishek', email: 'a@b.com' });

      expect(userService.findOrCreate).toHaveBeenCalledWith('fb-123', 'Abhishek', 'a@b.com');
      expect(prisma.savedTrip.create).toHaveBeenCalledWith({
        data: {
          userId: 'user-1',
          name: 'Goa Trip',
          destination: 'Goa',
          state: 'Goa',
          dates: { from: '2026-11-10', to: '2026-11-14' },
          travelMode: undefined,
          destinationData: { name: 'Goa' },
          itineraryData: undefined,
          foodGuideData: undefined,
        },
      });
      expect(result).toEqual(mockTrip);
    });

    it('uses provided name instead of default', async () => {
      userService.findOrCreate.mockResolvedValue(mockUser);
      prisma.savedTrip.create.mockResolvedValue({ ...mockTrip, name: 'My Custom Trip' });

      const dto = {
        name: 'My Custom Trip',
        destination: 'Goa',
        state: 'Goa',
        dates: { from: '2026-11-10', to: '2026-11-14' },
        destinationData: { name: 'Goa' },
      };

      await service.create(dto as any, { uid: 'fb-123', name: 'Abhishek', email: 'a@b.com' });

      expect(prisma.savedTrip.create).toHaveBeenCalledWith(
        expect.objectContaining({ data: expect.objectContaining({ name: 'My Custom Trip' }) }),
      );
    });
  });

  describe('listByUser', () => {
    it('returns trips ordered by createdAt desc with summary flags', async () => {
      userService.findOrCreate.mockResolvedValue(mockUser);
      prisma.savedTrip.findMany.mockResolvedValue([
        { ...mockTrip, itineraryData: { day: 1 }, foodGuideData: null },
        { ...mockTrip, id: 'trip-2', itineraryData: null, foodGuideData: { overview: 'x' } },
      ]);

      const result = await service.listByUser({ uid: 'fb-123', name: 'Abhishek', email: 'a@b.com' });

      expect(prisma.savedTrip.findMany).toHaveBeenCalledWith({
        where: { userId: 'user-1' },
        orderBy: { createdAt: 'desc' },
      });
      expect(result[0].hasItinerary).toBe(true);
      expect(result[0].hasFoodGuide).toBe(false);
      expect(result[1].hasItinerary).toBe(false);
      expect(result[1].hasFoodGuide).toBe(true);
    });
  });

  describe('getById', () => {
    it('returns full trip for owner', async () => {
      userService.findOrCreate.mockResolvedValue(mockUser);
      prisma.savedTrip.findUnique.mockResolvedValue(mockTrip);

      const result = await service.getById('trip-1', { uid: 'fb-123', name: 'Abhishek', email: 'a@b.com' });
      expect(result).toEqual(mockTrip);
    });

    it('throws 404 when trip not found', async () => {
      userService.findOrCreate.mockResolvedValue(mockUser);
      prisma.savedTrip.findUnique.mockResolvedValue(null);

      await expect(service.getById('bad-id', { uid: 'fb-123', name: 'Abhishek', email: 'a@b.com' }))
        .rejects.toThrow(NotFoundException);
    });

    it('throws 403 when trip belongs to another user', async () => {
      userService.findOrCreate.mockResolvedValue(mockUser);
      prisma.savedTrip.findUnique.mockResolvedValue({ ...mockTrip, userId: 'other-user' });

      await expect(service.getById('trip-1', { uid: 'fb-123', name: 'Abhishek', email: 'a@b.com' }))
        .rejects.toThrow(ForbiddenException);
    });
  });

  describe('update', () => {
    it('updates trip name and travel mode', async () => {
      userService.findOrCreate.mockResolvedValue(mockUser);
      prisma.savedTrip.findUnique.mockResolvedValue(mockTrip);
      prisma.savedTrip.update.mockResolvedValue({ ...mockTrip, name: 'Updated', travelMode: 'train' });

      const result = await service.update('trip-1', { name: 'Updated', travelMode: 'train' } as any, { uid: 'fb-123', name: 'Abhishek', email: 'a@b.com' });

      expect(prisma.savedTrip.update).toHaveBeenCalledWith({
        where: { id: 'trip-1' },
        data: { name: 'Updated', travelMode: 'train' },
      });
      expect(result.name).toBe('Updated');
    });

    it('rejects update for non-owner', async () => {
      userService.findOrCreate.mockResolvedValue(mockUser);
      prisma.savedTrip.findUnique.mockResolvedValue({ ...mockTrip, userId: 'other-user' });

      await expect(service.update('trip-1', { name: 'x' } as any, { uid: 'fb-123', name: 'Abhishek', email: 'a@b.com' }))
        .rejects.toThrow(ForbiddenException);
    });
  });

  describe('delete', () => {
    it('deletes trip for owner', async () => {
      userService.findOrCreate.mockResolvedValue(mockUser);
      prisma.savedTrip.findUnique.mockResolvedValue(mockTrip);
      prisma.savedTrip.delete.mockResolvedValue(mockTrip);

      await service.remove('trip-1', { uid: 'fb-123', name: 'Abhishek', email: 'a@b.com' });
      expect(prisma.savedTrip.delete).toHaveBeenCalledWith({ where: { id: 'trip-1' } });
    });
  });

  describe('sharing', () => {
    it('generates share token', async () => {
      userService.findOrCreate.mockResolvedValue(mockUser);
      prisma.savedTrip.findUnique.mockResolvedValue(mockTrip);
      prisma.savedTrip.update.mockResolvedValue({ ...mockTrip, shareToken: 'token-uuid' });

      const result = await service.enableSharing('trip-1', { uid: 'fb-123', name: 'Abhishek', email: 'a@b.com' });
      expect(result.shareToken).toBe('token-uuid');
      expect(prisma.savedTrip.update).toHaveBeenCalled();
    });

    it('returns existing token if already shared', async () => {
      userService.findOrCreate.mockResolvedValue(mockUser);
      prisma.savedTrip.findUnique.mockResolvedValue({ ...mockTrip, shareToken: 'existing-token' });

      const result = await service.enableSharing('trip-1', { uid: 'fb-123', name: 'Abhishek', email: 'a@b.com' });
      expect(result.shareToken).toBe('existing-token');
      expect(prisma.savedTrip.update).not.toHaveBeenCalled();
    });

    it('removes share token on disable', async () => {
      userService.findOrCreate.mockResolvedValue(mockUser);
      prisma.savedTrip.findUnique.mockResolvedValue({ ...mockTrip, shareToken: 'token' });
      prisma.savedTrip.update.mockResolvedValue({ ...mockTrip, shareToken: null });

      await service.disableSharing('trip-1', { uid: 'fb-123', name: 'Abhishek', email: 'a@b.com' });
      expect(prisma.savedTrip.update).toHaveBeenCalledWith({
        where: { id: 'trip-1' },
        data: { shareToken: null },
      });
    });

    it('getShared returns trip with sharer name', async () => {
      prisma.savedTrip.findUnique.mockResolvedValue({ ...mockTrip, shareToken: 'token', user: mockUser });

      const result = await service.getShared('token');
      expect(result.sharedBy).toBe('Abhishek');
    });

    it('getShared throws 404 for invalid token', async () => {
      prisma.savedTrip.findUnique.mockResolvedValue(null);

      await expect(service.getShared('bad-token')).rejects.toThrow(NotFoundException);
    });
  });
});
```

- [ ] **Step 2: Run tests to verify they fail**

Run:
```bash
cd /home/abhishek/Desktop/Abhishek/Sarthi/sarthi-backend && npx jest src/saved-trips/saved-trips.service.spec.ts --no-coverage 2>&1 | tail -10
```

Expected: FAIL — Cannot find module `./saved-trips.service`.

- [ ] **Step 3: Implement SavedTripsService**

Create `src/saved-trips/saved-trips.service.ts`:

```typescript
import { Injectable, ForbiddenException, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { UserService } from './user.service';
import { CreateSavedTripDto } from './dto/create-saved-trip.dto';
import { UpdateSavedTripDto } from './dto/update-saved-trip.dto';
import { randomUUID } from 'crypto';

interface FirebaseUser {
  uid: string;
  name?: string;
  email?: string;
}

@Injectable()
export class SavedTripsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly userService: UserService,
  ) {}

  async create(dto: CreateSavedTripDto, fbUser: FirebaseUser) {
    const user = await this.userService.findOrCreate(fbUser.uid, fbUser.name, fbUser.email);

    return this.prisma.savedTrip.create({
      data: {
        userId: user.id,
        name: dto.name ?? `${dto.destination} Trip`,
        destination: dto.destination,
        state: dto.state,
        dates: dto.dates,
        travelMode: dto.travelMode as any,
        destinationData: dto.destinationData,
        itineraryData: dto.itineraryData,
        foodGuideData: dto.foodGuideData,
      },
    });
  }

  async listByUser(fbUser: FirebaseUser) {
    const user = await this.userService.findOrCreate(fbUser.uid, fbUser.name, fbUser.email);

    const trips = await this.prisma.savedTrip.findMany({
      where: { userId: user.id },
      orderBy: { createdAt: 'desc' },
    });

    return trips.map(trip => ({
      id: trip.id,
      name: trip.name,
      destination: trip.destination,
      state: trip.state,
      dates: trip.dates,
      travelMode: trip.travelMode,
      createdAt: trip.createdAt,
      hasItinerary: trip.itineraryData !== null,
      hasFoodGuide: trip.foodGuideData !== null,
    }));
  }

  async getById(tripId: string, fbUser: FirebaseUser) {
    const user = await this.userService.findOrCreate(fbUser.uid, fbUser.name, fbUser.email);
    const trip = await this.prisma.savedTrip.findUnique({ where: { id: tripId } });

    if (!trip) throw new NotFoundException('Trip not found');
    if (trip.userId !== user.id) throw new ForbiddenException('Not your trip');

    return trip;
  }

  async update(tripId: string, dto: UpdateSavedTripDto, fbUser: FirebaseUser) {
    await this.getById(tripId, fbUser); // validates ownership

    return this.prisma.savedTrip.update({
      where: { id: tripId },
      data: { ...dto, travelMode: dto.travelMode as any },
    });
  }

  async remove(tripId: string, fbUser: FirebaseUser) {
    await this.getById(tripId, fbUser); // validates ownership
    return this.prisma.savedTrip.delete({ where: { id: tripId } });
  }

  async enableSharing(tripId: string, fbUser: FirebaseUser) {
    const trip = await this.getById(tripId, fbUser);

    if (trip.shareToken) {
      return { shareToken: trip.shareToken, url: `/shared-trips/${trip.shareToken}` };
    }

    const shareToken = randomUUID();
    const updated = await this.prisma.savedTrip.update({
      where: { id: tripId },
      data: { shareToken },
    });

    return { shareToken: updated.shareToken, url: `/shared-trips/${updated.shareToken}` };
  }

  async disableSharing(tripId: string, fbUser: FirebaseUser) {
    await this.getById(tripId, fbUser);
    await this.prisma.savedTrip.update({
      where: { id: tripId },
      data: { shareToken: null },
    });
  }

  async getShared(token: string) {
    const trip = await this.prisma.savedTrip.findUnique({
      where: { shareToken: token },
      include: { user: true },
    });

    if (!trip) throw new NotFoundException('Shared trip not found');

    const { user, ...tripData } = trip;
    return { ...tripData, sharedBy: user.displayName ?? 'Anonymous' };
  }
}
```

- [ ] **Step 4: Run tests to verify they pass**

Run:
```bash
cd /home/abhishek/Desktop/Abhishek/Sarthi/sarthi-backend && npx jest src/saved-trips/saved-trips.service.spec.ts --no-coverage 2>&1 | tail -10
```

Expected: All 12 tests pass.

---

### Task 5: SavedTripsController — auth-protected endpoints

**Files:**
- Create: `src/saved-trips/saved-trips.controller.ts`
- Create: `src/saved-trips/saved-trips.controller.spec.ts`

- [ ] **Step 1: Write failing tests for SavedTripsController**

Create `src/saved-trips/saved-trips.controller.spec.ts`:

```typescript
import { SavedTripsController } from './saved-trips.controller';

const mockService = {
  create: jest.fn(),
  listByUser: jest.fn(),
  getById: jest.fn(),
  update: jest.fn(),
  remove: jest.fn(),
  enableSharing: jest.fn(),
  disableSharing: jest.fn(),
};

const mockRequest = {
  user: { uid: 'fb-123', name: 'Abhishek', email: 'a@b.com' },
};

describe('SavedTripsController', () => {
  let controller: SavedTripsController;

  beforeEach(() => {
    controller = new SavedTripsController(mockService as any);
    Object.values(mockService).forEach(fn => fn.mockReset());
  });

  it('create calls service.create with dto and user', async () => {
    const dto = { destination: 'Goa', state: 'Goa', dates: { from: '2026-11-10', to: '2026-11-14' }, destinationData: {} };
    mockService.create.mockResolvedValue({ id: 'trip-1' });

    const result = await controller.create(dto as any, mockRequest as any);

    expect(mockService.create).toHaveBeenCalledWith(dto, mockRequest.user);
    expect(result).toEqual({ id: 'trip-1' });
  });

  it('list calls service.listByUser', async () => {
    mockService.listByUser.mockResolvedValue([]);
    const result = await controller.list(mockRequest as any);
    expect(mockService.listByUser).toHaveBeenCalledWith(mockRequest.user);
    expect(result).toEqual([]);
  });

  it('get calls service.getById', async () => {
    mockService.getById.mockResolvedValue({ id: 'trip-1' });
    const result = await controller.get('trip-1', mockRequest as any);
    expect(mockService.getById).toHaveBeenCalledWith('trip-1', mockRequest.user);
    expect(result).toEqual({ id: 'trip-1' });
  });

  it('update calls service.update', async () => {
    mockService.update.mockResolvedValue({ id: 'trip-1', name: 'Updated' });
    const result = await controller.update('trip-1', { name: 'Updated' } as any, mockRequest as any);
    expect(mockService.update).toHaveBeenCalledWith('trip-1', { name: 'Updated' }, mockRequest.user);
    expect(result).toEqual({ id: 'trip-1', name: 'Updated' });
  });

  it('delete calls service.remove', async () => {
    mockService.remove.mockResolvedValue(undefined);
    await controller.remove('trip-1', mockRequest as any);
    expect(mockService.remove).toHaveBeenCalledWith('trip-1', mockRequest.user);
  });

  it('share calls service.enableSharing', async () => {
    mockService.enableSharing.mockResolvedValue({ shareToken: 'abc', url: '/shared-trips/abc' });
    const result = await controller.share('trip-1', mockRequest as any);
    expect(mockService.enableSharing).toHaveBeenCalledWith('trip-1', mockRequest.user);
    expect(result).toEqual({ shareToken: 'abc', url: '/shared-trips/abc' });
  });

  it('unshare calls service.disableSharing', async () => {
    mockService.disableSharing.mockResolvedValue(undefined);
    await controller.unshare('trip-1', mockRequest as any);
    expect(mockService.disableSharing).toHaveBeenCalledWith('trip-1', mockRequest.user);
  });
});
```

- [ ] **Step 2: Run tests to verify they fail**

Run:
```bash
cd /home/abhishek/Desktop/Abhishek/Sarthi/sarthi-backend && npx jest src/saved-trips/saved-trips.controller.spec.ts --no-coverage 2>&1 | tail -10
```

Expected: FAIL — Cannot find module `./saved-trips.controller`.

- [ ] **Step 3: Implement SavedTripsController**

Create `src/saved-trips/saved-trips.controller.ts`:

```typescript
import { Body, Controller, Delete, Get, HttpCode, Param, Patch, Post, Req, UseGuards } from '@nestjs/common';
import { Throttle } from '@nestjs/throttler';
import { FirebaseAuthGuard } from '../auth/firebase-auth.guard';
import { SavedTripsService } from './saved-trips.service';
import { CreateSavedTripDto } from './dto/create-saved-trip.dto';
import { UpdateSavedTripDto } from './dto/update-saved-trip.dto';

@Controller('saved-trips')
@UseGuards(FirebaseAuthGuard)
export class SavedTripsController {
  constructor(private readonly service: SavedTripsService) {}

  @Post()
  async create(@Body() dto: CreateSavedTripDto, @Req() req: any) {
    return this.service.create(dto, req.user);
  }

  @Get()
  async list(@Req() req: any) {
    return this.service.listByUser(req.user);
  }

  @Get(':id')
  async get(@Param('id') id: string, @Req() req: any) {
    return this.service.getById(id, req.user);
  }

  @Patch(':id')
  async update(@Param('id') id: string, @Body() dto: UpdateSavedTripDto, @Req() req: any) {
    return this.service.update(id, dto, req.user);
  }

  @Delete(':id')
  @HttpCode(204)
  async remove(@Param('id') id: string, @Req() req: any) {
    await this.service.remove(id, req.user);
  }

  @Post(':id/share')
  async share(@Param('id') id: string, @Req() req: any) {
    return this.service.enableSharing(id, req.user);
  }

  @Delete(':id/share')
  @HttpCode(204)
  async unshare(@Param('id') id: string, @Req() req: any) {
    await this.service.disableSharing(id, req.user);
  }
}
```

- [ ] **Step 4: Run tests to verify they pass**

Run:
```bash
cd /home/abhishek/Desktop/Abhishek/Sarthi/sarthi-backend && npx jest src/saved-trips/saved-trips.controller.spec.ts --no-coverage 2>&1 | tail -10
```

Expected: All 7 tests pass.

---

### Task 6: SharedTripsController — public endpoint

**Files:**
- Create: `src/shared-trips/shared-trips.controller.ts`
- Create: `src/shared-trips/shared-trips.controller.spec.ts`

- [ ] **Step 1: Write failing tests for SharedTripsController**

Create `src/shared-trips/shared-trips.controller.spec.ts`:

```typescript
import { SharedTripsController } from './shared-trips.controller';

const mockService = {
  getShared: jest.fn(),
};

describe('SharedTripsController', () => {
  let controller: SharedTripsController;

  beforeEach(() => {
    controller = new SharedTripsController(mockService as any);
    mockService.getShared.mockReset();
  });

  it('getShared calls service.getShared with token', async () => {
    const tripData = { id: 'trip-1', destination: 'Goa', sharedBy: 'Abhishek' };
    mockService.getShared.mockResolvedValue(tripData);

    const result = await controller.getShared('abc-token');

    expect(mockService.getShared).toHaveBeenCalledWith('abc-token');
    expect(result).toEqual(tripData);
  });
});
```

- [ ] **Step 2: Run tests to verify they fail**

Run:
```bash
cd /home/abhishek/Desktop/Abhishek/Sarthi/sarthi-backend && npx jest src/shared-trips/shared-trips.controller.spec.ts --no-coverage 2>&1 | tail -10
```

Expected: FAIL — Cannot find module `./shared-trips.controller`.

- [ ] **Step 3: Implement SharedTripsController**

Create `src/shared-trips/shared-trips.controller.ts`:

```typescript
import { Controller, Get, Param } from '@nestjs/common';
import { SavedTripsService } from '../saved-trips/saved-trips.service';

@Controller('shared-trips')
export class SharedTripsController {
  constructor(private readonly service: SavedTripsService) {}

  @Get(':token')
  async getShared(@Param('token') token: string) {
    return this.service.getShared(token);
  }
}
```

- [ ] **Step 4: Run tests to verify they pass**

Run:
```bash
cd /home/abhishek/Desktop/Abhishek/Sarthi/sarthi-backend && npx jest src/shared-trips/shared-trips.controller.spec.ts --no-coverage 2>&1 | tail -10
```

Expected: 1 test passes.

---

### Task 7: NestJS modules — wire everything together

**Files:**
- Create: `src/saved-trips/saved-trips.module.ts`
- Create: `src/shared-trips/shared-trips.module.ts`
- Modify: `src/app.module.ts`

- [ ] **Step 1: Create SavedTripsModule**

Create `src/saved-trips/saved-trips.module.ts`:

```typescript
import { Module } from '@nestjs/common';
import { SavedTripsController } from './saved-trips.controller';
import { SavedTripsService } from './saved-trips.service';
import { UserService } from './user.service';

@Module({
  controllers: [SavedTripsController],
  providers: [SavedTripsService, UserService],
  exports: [SavedTripsService],
})
export class SavedTripsModule {}
```

- [ ] **Step 2: Create SharedTripsModule**

Create `src/shared-trips/shared-trips.module.ts`:

```typescript
import { Module } from '@nestjs/common';
import { SharedTripsController } from './shared-trips.controller';
import { SavedTripsModule } from '../saved-trips/saved-trips.module';

@Module({
  imports: [SavedTripsModule],
  controllers: [SharedTripsController],
})
export class SharedTripsModule {}
```

- [ ] **Step 3: Register modules in AppModule**

Open `src/app.module.ts`. Add imports for both modules:

```typescript
import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { ThrottlerModule } from '@nestjs/throttler';
import { PrismaModule } from './prisma/prisma.module';
import { CacheModule } from './cache/cache.module';
import { AiModule } from './ai/ai.module';
import { DestinationFinderModule } from './destination-finder/destination-finder.module';
import { SavedTripsModule } from './saved-trips/saved-trips.module';
import { SharedTripsModule } from './shared-trips/shared-trips.module';

@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true }),
    ThrottlerModule.forRoot([{ ttl: 60000, limit: 20 }]),
    PrismaModule,
    CacheModule,
    AiModule,
    DestinationFinderModule,
    SavedTripsModule,
    SharedTripsModule,
  ],
})
export class AppModule {}
```

- [ ] **Step 4: Verify build compiles**

Run:
```bash
cd /home/abhishek/Desktop/Abhishek/Sarthi/sarthi-backend && npm run build 2>&1 | tail -10
```

Expected: Build succeeds.

---

### Task 8: Travel mode in itinerary prompt

**Files:**
- Modify: `src/destination-finder/dto/itinerary.dto.ts`
- Modify: `src/ai/prompts/destination.prompt.ts`
- Modify: `src/ai/prompts/destination.prompt.spec.ts`

- [ ] **Step 1: Write failing tests for travel mode in itinerary prompt**

Open `src/ai/prompts/destination.prompt.spec.ts`. Find the `describe('buildItineraryPrompt', ...)` block. Add these tests inside it:

```typescript
  it('includes travel mode line when travelMode provided', () => {
    const { user } = buildItineraryPrompt({
      ...itineraryParams,
      travelMode: 'train',
    });
    expect(user).toContain('arriving by train');
  });

  it('omits travel mode line when travelMode is undefined', () => {
    const { user } = buildItineraryPrompt(itineraryParams);
    expect(user).not.toContain('arriving by');
  });

  it('works with all travel mode values', () => {
    for (const mode of ['train', 'flight', 'bus', 'car']) {
      const { user } = buildItineraryPrompt({
        ...itineraryParams,
        travelMode: mode,
      });
      expect(user).toContain(`arriving by ${mode}`);
    }
  });
```

- [ ] **Step 2: Run tests to verify they fail**

Run:
```bash
cd /home/abhishek/Desktop/Abhishek/Sarthi/sarthi-backend && npx jest src/ai/prompts/destination.prompt.spec.ts --no-coverage -t "travel mode" 2>&1 | tail -15
```

Expected: FAIL — TypeScript error, `travelMode` not in `ItineraryParams`.

- [ ] **Step 3: Extend ItineraryParams and buildItineraryPrompt**

Open `src/ai/prompts/destination.prompt.ts`. Find the `ItineraryParams` interface (around line 188). Add `travelMode?`:

```typescript
export interface ItineraryParams extends HealthProfile {
  destination: string;
  state: string;
  freeText: string;
  group: { size: number; type: string };
  budget: { min: number; max: number };
  dates: { from: string; to: string };
  departureCity: string;
  travelMode?: string;
}
```

Find the `buildItineraryPrompt` function (around line 198). After the `healthContext` line, add travel mode injection:

Replace:
```typescript
  const healthContext = buildHealthContext(params);
  const numDays = Math.ceil(
```

With:
```typescript
  const healthContext = buildHealthContext(params);
  const travelLine = params.travelMode
    ? `\nTraveler is arriving by ${params.travelMode} from ${params.departureCity}.`
    : '';
  const numDays = Math.ceil(
```

Then in the user prompt template, find:
```typescript
${travelerProfile}${healthContext}
```

Replace with:
```typescript
${travelerProfile}${healthContext}${travelLine}
```

- [ ] **Step 4: Add travelMode to ItineraryDto**

Open `src/destination-finder/dto/itinerary.dto.ts`. Add `IsEnum` to the imports if not present. At the end of the `ItineraryDto` class, add:

```typescript
  @IsOptional()
  @IsEnum(['train', 'flight', 'bus', 'car'])
  travelMode?: string;
```

- [ ] **Step 5: Run tests to verify they pass**

Run:
```bash
cd /home/abhishek/Desktop/Abhishek/Sarthi/sarthi-backend && npx jest src/ai/prompts/destination.prompt.spec.ts --no-coverage 2>&1 | tail -10
```

Expected: All tests pass (existing + 3 new).

---

### Task 9: Full-suite verification and build

**Files:** none

- [ ] **Step 1: Run full test suite**

Run:
```bash
cd /home/abhishek/Desktop/Abhishek/Sarthi/sarthi-backend && npx jest --no-coverage 2>&1 | tail -10
```

Expected: All test suites pass (~13 suites, ~240+ tests).

- [ ] **Step 2: Run production build**

Run:
```bash
cd /home/abhishek/Desktop/Abhishek/Sarthi/sarthi-backend && npm run build 2>&1 | tail -10
```

Expected: Build completes with no TypeScript errors.

- [ ] **Step 3: Optional smoke test**

If dev server is running, test the full flow:

```bash
# Save a trip
curl -X POST http://localhost:3000/saved-trips \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer <firebase-token>" \
  -d '{
    "destination": "Goa",
    "state": "Goa",
    "dates": { "from": "2026-11-10", "to": "2026-11-14" },
    "travelMode": "train",
    "destinationData": { "name": "Goa", "state": "Goa", "isHiddenGem": false }
  }'

# List saved trips
curl http://localhost:3000/saved-trips \
  -H "Authorization: Bearer <firebase-token>"

# Enable sharing (use the trip ID from create response)
curl -X POST http://localhost:3000/saved-trips/<trip-id>/share \
  -H "Authorization: Bearer <firebase-token>"

# View shared trip (no auth, use the shareToken from share response)
curl http://localhost:3000/shared-trips/<share-token>
```
