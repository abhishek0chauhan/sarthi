# Saved Trips — Design Spec

**Date:** 2026-04-14
**Status:** Approved, ready for implementation planning
**Scope:** Backend-only. New `User` and `SavedTrip` Prisma models, new `SavedTripsModule` with CRUD + sharing endpoints. No frontend changes. Phase 2A of the multi-phase "personal travel companion" initiative.

## Goal

Let users save AI-generated trip results (destination, itinerary, food guide) into persistent storage so they can revisit, share, and later interact with their plans. This is the foundation for Phase 2B (trip chat, editable locations) and Phase 2C (live trip mode, offline download).

## Non-Goals

- No trip chat (Phase 2B)
- No editable locations or correction feedback loop (Phase 2B)
- No local phrasebook (Phase 2B)
- No live trip mode or offline download (Phase 2C)
- No frontend/UI work — backend exposes the API
- No map link generation — frontend constructs Google Maps URLs from existing `where`/location fields
- No "Surprise Me" mode (separate feature)

## Architecture

### New Modules

| Module | Responsibility |
|---|---|
| `SavedTripsModule` | CRUD + sharing for saved trips; lazy user creation |
| `UserService` | Find-or-create User from Firebase token |

### Database

Two new Prisma models added to the existing schema. No changes to the `Destination` model.

### Auth

All saved-trips endpoints (except shared trip viewing) use the existing `FirebaseAuthGuard`. The shared trip endpoint is public (no auth).

## Database Schema

### User

Created lazily on first `POST /saved-trips`. Linked to Firebase UID.

```prisma
model User {
  id          String      @id @default(uuid())
  firebaseUid String      @unique
  displayName String?
  email       String?
  createdAt   DateTime    @default(now())
  updatedAt   DateTime    @updatedAt
  savedTrips  SavedTrip[]
}
```

### SavedTrip

Stores the full AI response JSON blobs. `itineraryData` and `foodGuideData` are nullable because users may save a destination before generating those.

```prisma
enum TravelMode {
  train
  flight
  bus
  car
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

**Design decisions:**
- `destinationData`, `itineraryData`, `foodGuideData` are JSON columns storing the full AI response. This avoids normalizing AI output into relational tables — the data is read-heavy and rarely edited.
- `shareToken` is a unique nullable UUID. Null means not shared. Populated when user enables sharing.
- `onDelete: Cascade` — deleting a user deletes all their saved trips.
- `@@index([userId])` — fast lookup of all trips for a user.
- `@@index([shareToken])` — fast lookup for shared trip viewing.

## API Endpoints

All under `/saved-trips` controller. Auth-protected unless noted.

### Save a Trip

```
POST /saved-trips
```

**Body (CreateSavedTripDto):**
```typescript
{
  name?: string;                    // optional — defaults to "${destination} Trip"
  destination: string;              // required
  state: string;                    // required
  dates: { from: string; to: string };  // required
  travelMode?: 'train' | 'flight' | 'bus' | 'car';
  destinationData: object;          // required — full destination search result
  itineraryData?: object;           // optional — full itinerary response
  foodGuideData?: object;           // optional — full food guide response
}
```

**Behavior:**
1. Extract `firebaseUid`, `displayName`, `email` from `request.user` (Firebase decoded token)
2. Call `UserService.findOrCreate(firebaseUid, displayName, email)` — returns User
3. Create SavedTrip with `userId = user.id`
4. Default `name` to `"${destination} Trip"` if not provided
5. Return the created SavedTrip

**Response:** `201 Created` with the full SavedTrip object.

### List My Trips

```
GET /saved-trips
```

Returns all saved trips for the authenticated user, ordered by `createdAt` descending (newest first). Returns a lean projection: `id`, `name`, `destination`, `state`, `dates`, `travelMode`, `createdAt`, and boolean flags `hasItinerary`, `hasFoodGuide` (derived from whether `itineraryData`/`foodGuideData` is non-null).

**Response:** `200 OK` with array of trip summaries.

### View a Trip

```
GET /saved-trips/:id
```

Returns the full SavedTrip including all JSON data. Validates that the trip belongs to the authenticated user (403 otherwise).

**Response:** `200 OK` with full SavedTrip.

### Update a Trip

```
PATCH /saved-trips/:id
```

**Body (UpdateSavedTripDto):**
```typescript
{
  name?: string;
  travelMode?: 'train' | 'flight' | 'bus' | 'car' | null;
  itineraryData?: object;
  foodGuideData?: object;
}
```

Use cases:
- Rename the trip
- Add/update itinerary or food guide after initial save
- Set or change travel mode

Validates trip ownership (403 if not owner). Only provided fields are updated (Prisma partial update).

**Response:** `200 OK` with updated SavedTrip.

### Delete a Trip

```
DELETE /saved-trips/:id
```

Validates trip ownership. Hard delete.

**Response:** `204 No Content`.

### Enable Sharing

```
POST /saved-trips/:id/share
```

Generates a random UUID `shareToken`, stores it on the trip. Returns the shareable URL path.

If already shared (token exists), returns the existing token — does not regenerate.

**Response:** `200 OK` with `{ shareToken: "abc-123", url: "/shared-trips/abc-123" }`.

### Disable Sharing

```
DELETE /saved-trips/:id/share
```

Sets `shareToken` to null.

**Response:** `204 No Content`.

### View Shared Trip (Public)

```
GET /shared-trips/:token
```

**No auth required.** Looks up SavedTrip by `shareToken`. Returns the full trip data plus the sharer's `displayName` (joined from User table).

**Response:** `200 OK` with trip data + `sharedBy: "Abhishek"`. Returns `404` if token not found.

## Travel Mode Integration with Itinerary

When a user generates an itinerary (via existing `POST /destination-finder/itinerary`) for a destination that has a saved trip with `travelMode` set, the frontend can include the travel mode in the request. This requires a minor addition to the existing `ItineraryDto`:

```typescript
// Add to ItineraryDto
@IsOptional()
@IsEnum(['train', 'flight', 'bus', 'car'])
travelMode?: string;
```

And in `buildItineraryPrompt`, when `travelMode` is present:
```
Traveler is arriving by ${travelMode} from ${departureCity}.
```

This lets the AI adjust Day 1 plans for arrival time. If `travelMode` is not provided, behavior is unchanged (backward compatible).

## Lazy User Creation

`UserService.findOrCreate(firebaseUid, displayName, email)`:

```typescript
async findOrCreate(firebaseUid: string, displayName?: string, email?: string): Promise<User> {
  return this.prisma.user.upsert({
    where: { firebaseUid },
    update: { displayName, email },
    create: { firebaseUid, displayName, email },
  });
}
```

The `upsert` also updates `displayName`/`email` on every call, so if a user changes their Firebase profile, it's reflected here. This is intentional — keeps the local cache fresh without a separate sync mechanism.

## DTOs

### CreateSavedTripDto

```typescript
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
  dates: { from: string; to: string };

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

### UpdateSavedTripDto

```typescript
export class UpdateSavedTripDto {
  @IsOptional()
  @IsString()
  @MaxLength(100)
  name?: string;

  @IsOptional()
  @IsEnum(['train', 'flight', 'bus', 'car', null])
  travelMode?: string | null;

  @IsOptional()
  @IsObject()
  itineraryData?: object;

  @IsOptional()
  @IsObject()
  foodGuideData?: object;
}
```

## Files Changed

| File | Action | Responsibility |
|---|---|---|
| `prisma/schema.prisma` | Modify | Add `User` model, `TravelMode` enum, `SavedTrip` model |
| `src/saved-trips/saved-trips.module.ts` | Create | NestJS module wiring |
| `src/saved-trips/saved-trips.controller.ts` | Create | CRUD + sharing endpoints |
| `src/saved-trips/saved-trips.service.ts` | Create | Business logic, trip CRUD, sharing |
| `src/saved-trips/user.service.ts` | Create | Lazy user find-or-create |
| `src/saved-trips/dto/create-saved-trip.dto.ts` | Create | Validation for create |
| `src/saved-trips/dto/update-saved-trip.dto.ts` | Create | Validation for update |
| `src/saved-trips/saved-trips.controller.spec.ts` | Create | Controller tests |
| `src/saved-trips/saved-trips.service.spec.ts` | Create | Service tests |
| `src/saved-trips/user.service.spec.ts` | Create | User service tests |
| `src/destination-finder/dto/itinerary.dto.ts` | Modify | Add optional `travelMode` field |
| `src/ai/prompts/destination.prompt.ts` | Modify | Inject travel mode into itinerary prompt |
| `src/ai/prompts/destination.prompt.spec.ts` | Modify | Tests for travel mode in prompt |
| `src/shared-trips/shared-trips.controller.ts` | Create | Public shared trip endpoint |
| `src/shared-trips/shared-trips.module.ts` | Create | Wiring for shared trips (no auth) |
| `src/app.module.ts` | Modify | Register SavedTripsModule and SharedTripsModule |

## Testing Plan

~25 tests:

**UserService (3)**
- Creates new user when firebaseUid not found
- Returns existing user when firebaseUid found
- Updates displayName/email on existing user (upsert behavior)

**SavedTripsService (10)**
- Creates a trip with all fields populated
- Creates a trip with default name when name not provided
- Creates user lazily on first save
- Lists trips for a user (ordered by createdAt desc)
- Lists trips returns lean projection with `hasItinerary`/`hasFoodGuide` flags
- Returns full trip by ID for owner
- Rejects get/update/delete for non-owner (throws 403)
- Updates trip name and travel mode
- Adds itinerary data to existing trip
- Deletes a trip

**Sharing (5)**
- Generates share token on POST /share
- Returns existing token if already shared (idempotent)
- Removes share token on DELETE /share
- Shared trip endpoint returns trip + sharer displayName
- Shared trip endpoint returns 404 for invalid token

**Controller (4)**
- Each endpoint calls the correct service method

**Itinerary Prompt (3)**
- Prompt includes travel mode line when travelMode provided
- Prompt omits travel mode line when travelMode is undefined
- Prompt works with all four travel mode values

## Error Handling

- Invalid DTO → class-validator 400 (existing NestJS pipe)
- Trip not found → 404
- Trip belongs to different user → 403 Forbidden
- Invalid share token → 404
- Database errors → 500 (default NestJS handler)

No new error paths beyond standard CRUD patterns.

## Rollout

Purely additive:
- New database tables via Prisma migration — no changes to existing `Destination` table
- New API endpoints — no changes to existing destination-finder endpoints (except optional `travelMode` on itinerary DTO, fully backward compatible)
- Existing clients unaware of saved trips continue working unchanged

## Open Questions

None. Design is locked.

## Future Phases

This spec is Phase 2A. Subsequent phases build on top:

- **Phase 2B:** Trip Chat (context injection over saved trip JSON), editable locations with correction feedback loop, local phrasebook
- **Phase 2C:** Live Trip Mode (real-time day view), offline trip download (PDF/static)
