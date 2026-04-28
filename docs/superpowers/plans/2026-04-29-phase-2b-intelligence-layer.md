# Phase 2B: Intelligence Layer Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add a persistent Traveler Personality Profile (9 dimensions, story or quiz onboarding) that feeds into every AI prompt, plus a Corrections system so the AI learns from what users change.

**Architecture:** Two new NestJS modules (`profile`, `corrections`) backed by two new Prisma models (`TravelerProfile`, `Correction`). `UserService` is shared from `saved-trips` — import it via `SavedTripsModule` exports. A new `buildPersonalityBlock()` and `buildCorrectionsBlock()` helper in `destination.prompt.ts` injects the profile into all existing prompt builders. AI story extraction uses a new slim Zod schema + `AiService.extractPersonality()` method. `personalMatch` is added to result schemas but is optional — prompts without a profile omit it, so existing behavior is unchanged.

**Tech Stack:** NestJS v11, Prisma 5, PostgreSQL, Firebase Auth, Vercel AI SDK, Zod v4, Jest 30. No git commits — user controls commits.

---

## File Map

| File | Action | Responsibility |
|---|---|---|
| `prisma/schema.prisma` | Modify | Add `TravelerProfile` and `Correction` models |
| `src/ai/schemas/profile.schema.ts` | **Create** | Zod schema for story extraction AI response |
| `src/ai/schemas/destination.schema.ts` | Modify | Add `personalMatch` field (optional) to `rankResultSchema`, `generateResultSchema`, `trekResultSchema` |
| `src/ai/prompts/destination.prompt.ts` | Modify | Add `buildPersonalityBlock()`, `buildCorrectionsBlock()`, wire into all 5 prompt builders |
| `src/ai/ai.service.ts` | Modify | Add `extractPersonality()` method |
| `src/profile/dto/submit-story.dto.ts` | **Create** | DTO: `{ story: string }` |
| `src/profile/dto/submit-quiz.dto.ts` | **Create** | DTO: all 9 optional dimension fields |
| `src/profile/profile.service.ts` | **Create** | CRUD for TravelerProfile + AI extraction orchestration |
| `src/profile/profile.service.spec.ts` | **Create** | Unit tests for profile service |
| `src/profile/profile.controller.ts` | **Create** | REST: POST /profile/story, GET /profile, PUT /profile/quiz, GET /profile/quiz-prefill, DELETE /profile |
| `src/profile/profile.controller.spec.ts` | **Create** | Controller tests |
| `src/profile/profile.module.ts` | **Create** | Module wiring |
| `src/corrections/dto/create-correction.dto.ts` | **Create** | DTO: `{ tripId, type, context }` |
| `src/corrections/corrections.service.ts` | **Create** | CRUD for Correction, getRecent(userId, 10) |
| `src/corrections/corrections.service.spec.ts` | **Create** | Unit tests |
| `src/corrections/corrections.controller.ts` | **Create** | REST: POST /corrections, GET /corrections |
| `src/corrections/corrections.controller.spec.ts` | **Create** | Controller tests |
| `src/corrections/corrections.module.ts` | **Create** | Module wiring |
| `src/destination-finder/destination-finder.service.ts` | Modify | Accept optional `userId`, fetch profile + corrections, inject into prompts |
| `src/destination-finder/destination-finder.controller.ts` | Modify | Pass `req.user` to service for personalisation |
| `src/destination-finder/destination-finder.module.ts` | Modify | Import `ProfileModule` + `CorrectionsModule` |
| `src/app.module.ts` | Modify | Register `ProfileModule` + `CorrectionsModule` |

---

### Task 1: Prisma schema — TravelerProfile + Correction models

**Files:**
- Modify: `prisma/schema.prisma`

- [ ] **Step 1: Add the two new models**

Open `prisma/schema.prisma` and add to the `User` model a relation, then append the two new models at the end:

```prisma
// In User model, add:
  travelerProfile TravelerProfile?
  corrections     Correction[]

// Append at the end of the file:
model TravelerProfile {
  id                 String   @id @default(uuid())
  userId             String   @unique
  user               User     @relation(fields: [userId], references: [id], onDelete: Cascade)
  story              String?
  travelPace         String?
  depthVsBreadth     String?
  comfortLevel       String?
  crowdTolerance     String?
  travelMotivations  String[]
  physicalReadiness  String?
  spendingStyle      String?
  groundReality      String?
  languageComfort    String?
  completeness       Int      @default(0)
  createdAt          DateTime @default(now())
  updatedAt          DateTime @updatedAt
}

model Correction {
  id        String   @id @default(uuid())
  userId    String
  user      User     @relation(fields: [userId], references: [id], onDelete: Cascade)
  tripId    String
  type      String
  context   Json
  createdAt DateTime @default(now())

  @@index([userId])
  @@index([tripId])
}
```

- [ ] **Step 2: Run migration**

```bash
cd sarthi-backend
npx prisma migrate dev --name add-traveler-profile-corrections
```

Expected: Migration created and applied. Prisma Client regenerated.

- [ ] **Step 3: Verify build still passes**

```bash
npm run build 2>&1 | tail -5
```

Expected: No TypeScript errors.

---

### Task 2: Profile Zod schema + AI extraction method

**Files:**
- Create: `src/ai/schemas/profile.schema.ts`
- Modify: `src/ai/ai.service.ts`

- [ ] **Step 1: Write failing test for the extraction schema**

Create `src/ai/schemas/profile.schema.spec.ts`:

```typescript
import { profileExtractionSchema } from './profile.schema';

describe('profileExtractionSchema', () => {
  it('parses a fully extracted profile', () => {
    const result = profileExtractionSchema.parse({
      travelPace: 'loose',
      depthVsBreadth: 'deep',
      comfortLevel: 'homestay',
      crowdTolerance: 'avoid',
      travelMotivations: ['nature', 'culture'],
      physicalReadiness: 'yes',
      spendingStyle: 'budget',
      groundReality: 'bring_it',
      languageComfort: 'fine',
      confidence: 85,
    });
    expect(result.travelPace).toBe('loose');
    expect(result.confidence).toBe(85);
  });

  it('allows all dimensions to be absent (partial extraction)', () => {
    const result = profileExtractionSchema.parse({ confidence: 30 });
    expect(result.travelPace).toBeUndefined();
    expect(result.confidence).toBe(30);
  });

  it('clamps confidence to 0-100', () => {
    const result = profileExtractionSchema.parse({ confidence: 150 });
    expect(result.confidence).toBe(100);
  });

  it('rejects invalid travelPace values', () => {
    expect(() => profileExtractionSchema.parse({ confidence: 50, travelPace: 'fast' })).toThrow();
  });

  it('defaults travelMotivations to empty array', () => {
    const result = profileExtractionSchema.parse({ confidence: 40 });
    expect(result.travelMotivations).toEqual([]);
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

```bash
cd sarthi-backend && npx jest src/ai/schemas/profile.schema.spec.ts --no-coverage 2>&1 | tail -5
```

Expected: FAIL — `Cannot find module './profile.schema'`

- [ ] **Step 3: Create `src/ai/schemas/profile.schema.ts`**

```typescript
import { z } from 'zod';

const clampedConfidence = z.preprocess(
  (v) => Math.min(100, Math.max(0, Number(v) || 0)),
  z.number().min(0).max(100),
);

export const profileExtractionSchema = z.object({
  travelPace:        z.enum(['packed', 'loose', 'no_plan']).optional(),
  depthVsBreadth:    z.enum(['deep', 'balanced', 'cover']).optional(),
  comfortLevel:      z.enum(['hotel', 'homestay', 'rough']).optional(),
  crowdTolerance:    z.enum(['worth_it', 'hidden', 'avoid']).optional(),
  travelMotivations: z.array(z.string()).default([]),
  physicalReadiness: z.enum(['yes', 'maybe', 'no']).optional(),
  spendingStyle:     z.enum(['experience', 'budget', 'comfort']).optional(),
  groundReality:     z.enum(['bring_it', 'tolerate', 'need_comfort']).optional(),
  languageComfort:   z.enum(['fine', 'hindi', 'english']).optional(),
  confidence:        clampedConfidence,
});

export const profileExtractionWrapperSchema = z.object({
  result: profileExtractionSchema,
});

export type ProfileExtraction = z.infer<typeof profileExtractionSchema>;
```

- [ ] **Step 4: Run test to verify it passes**

```bash
cd sarthi-backend && npx jest src/ai/schemas/profile.schema.spec.ts --no-coverage 2>&1 | tail -5
```

Expected: `Tests: 5 passed`

- [ ] **Step 5: Add `extractPersonality()` to `src/ai/ai.service.ts`**

Add the import at the top of `ai.service.ts`:

```typescript
import { profileExtractionWrapperSchema } from './schemas/profile.schema';
import type { ProfileExtraction } from './schemas/profile.schema';
```

Add the method at the end of the `AiService` class:

```typescript
  async extractPersonality(story: string): Promise<ProfileExtraction> {
    const system = 'You are a travel personality analyst. Extract the traveler\'s personality dimensions from their story. Only extract dimensions you are confident about from the story — leave others absent.';
    const user = `Analyze this traveler story and extract personality dimensions:

"${story}"

Respond ONLY with a JSON object in exactly this format (no extra text):
{"result":{"travelPace":"<packed|loose|no_plan or omit>","depthVsBreadth":"<deep|balanced|cover or omit>","comfortLevel":"<hotel|homestay|rough or omit>","crowdTolerance":"<worth_it|hidden|avoid or omit>","travelMotivations":["<food|nature|culture|adventure|photography|spiritual|nightlife|shopping|relaxation>"],"physicalReadiness":"<yes|maybe|no or omit>","spendingStyle":"<experience|budget|comfort or omit>","groundReality":"<bring_it|tolerate|need_comfort or omit>","languageComfort":"<fine|hindi|english or omit>","confidence":<0-100>}}

Set confidence to how much the story revealed (0=nothing useful, 100=all 9 dimensions clear).`;

    const result = await generateJson({
      model: this.model,
      schema: profileExtractionWrapperSchema,
      system,
      prompt: user,
    });
    return result.result;
  }
```

- [ ] **Step 6: Verify build passes**

```bash
cd sarthi-backend && npm run build 2>&1 | tail -5
```

Expected: No errors.

---

### Task 3: Profile DTOs

**Files:**
- Create: `src/profile/dto/submit-story.dto.ts`
- Create: `src/profile/dto/submit-quiz.dto.ts`

- [ ] **Step 1: Create `src/profile/dto/submit-story.dto.ts`**

```typescript
import { IsString, MinLength, MaxLength } from 'class-validator';

export class SubmitStoryDto {
  @IsString()
  @MinLength(20, { message: 'Story must be at least 20 characters' })
  @MaxLength(2000, { message: 'Story must be at most 2000 characters' })
  story: string;
}
```

- [ ] **Step 2: Create `src/profile/dto/submit-quiz.dto.ts`**

```typescript
import { IsOptional, IsString, IsIn, IsArray } from 'class-validator';

const MOTIVATIONS = ['food','nature','culture','adventure','photography','spiritual','nightlife','shopping','relaxation'];

export class SubmitQuizDto {
  @IsOptional() @IsString() @IsIn(['packed','loose','no_plan'])
  travelPace?: string;

  @IsOptional() @IsString() @IsIn(['deep','balanced','cover'])
  depthVsBreadth?: string;

  @IsOptional() @IsString() @IsIn(['hotel','homestay','rough'])
  comfortLevel?: string;

  @IsOptional() @IsString() @IsIn(['worth_it','hidden','avoid'])
  crowdTolerance?: string;

  @IsOptional() @IsArray() @IsIn(MOTIVATIONS, { each: true })
  travelMotivations?: string[];

  @IsOptional() @IsString() @IsIn(['yes','maybe','no'])
  physicalReadiness?: string;

  @IsOptional() @IsString() @IsIn(['experience','budget','comfort'])
  spendingStyle?: string;

  @IsOptional() @IsString() @IsIn(['bring_it','tolerate','need_comfort'])
  groundReality?: string;

  @IsOptional() @IsString() @IsIn(['fine','hindi','english'])
  languageComfort?: string;
}
```

- [ ] **Step 3: Verify build**

```bash
cd sarthi-backend && npm run build 2>&1 | tail -5
```

Expected: No errors.

---

### Task 4: Profile service + tests

**Files:**
- Create: `src/profile/profile.service.ts`
- Create: `src/profile/profile.service.spec.ts`

- [ ] **Step 1: Write failing tests**

Create `src/profile/profile.service.spec.ts`:

```typescript
import { Test } from '@nestjs/testing';
import { ProfileService } from './profile.service';
import { PrismaService } from '../prisma/prisma.service';
import { AiService } from '../ai/ai.service';

const mockPrisma = {
  travelerProfile: {
    findUnique: jest.fn(),
    upsert: jest.fn(),
    delete: jest.fn(),
  },
  user: {
    upsert: jest.fn().mockResolvedValue({ id: 'user-1', firebaseUid: 'fb-1' }),
  },
};

const mockAi = {
  extractPersonality: jest.fn(),
};

describe('ProfileService', () => {
  let service: ProfileService;

  beforeEach(async () => {
    const module = await Test.createTestingModule({
      providers: [
        ProfileService,
        { provide: PrismaService, useValue: mockPrisma },
        { provide: AiService, useValue: mockAi },
      ],
    }).compile();
    service = module.get(ProfileService);
    jest.clearAllMocks();
  });

  describe('getProfile', () => {
    it('returns null when no profile exists', async () => {
      mockPrisma.travelerProfile.findUnique.mockResolvedValue(null);
      const result = await service.getProfile('fb-1');
      expect(result).toBeNull();
    });

    it('returns profile when it exists', async () => {
      const profile = { id: 'p-1', userId: 'user-1', travelPace: 'loose', completeness: 20 };
      mockPrisma.travelerProfile.findUnique.mockResolvedValue(profile);
      const result = await service.getProfile('fb-1');
      expect(result).toEqual(profile);
    });
  });

  describe('submitStory', () => {
    it('extracts personality and upserts profile', async () => {
      mockAi.extractPersonality.mockResolvedValue({
        travelPace: 'loose',
        comfortLevel: 'homestay',
        crowdTolerance: 'avoid',
        travelMotivations: ['nature'],
        confidence: 60,
      });
      mockPrisma.travelerProfile.upsert.mockResolvedValue({
        id: 'p-1', userId: 'user-1', story: 'test story', travelPace: 'loose', completeness: 33,
      });

      const result = await service.submitStory('fb-1', 'test story');
      expect(mockAi.extractPersonality).toHaveBeenCalledWith('test story');
      expect(mockPrisma.travelerProfile.upsert).toHaveBeenCalled();
      expect(result).toHaveProperty('travelPace', 'loose');
    });
  });

  describe('submitQuiz', () => {
    it('merges quiz answers into existing profile', async () => {
      mockPrisma.travelerProfile.upsert.mockResolvedValue({
        id: 'p-1', userId: 'user-1', travelPace: 'packed', completeness: 55,
      });

      const result = await service.submitQuiz('fb-1', { travelPace: 'packed', spendingStyle: 'budget' });
      expect(mockPrisma.travelerProfile.upsert).toHaveBeenCalled();
      expect(result).toHaveProperty('travelPace', 'packed');
    });
  });

  describe('computeCompleteness', () => {
    it('returns 0 for empty profile', () => {
      expect(service.computeCompleteness({})).toBe(0);
    });

    it('returns 100 when all 9 dimensions are filled', () => {
      expect(service.computeCompleteness({
        travelPace: 'loose', depthVsBreadth: 'deep', comfortLevel: 'homestay',
        crowdTolerance: 'avoid', travelMotivations: ['nature'], physicalReadiness: 'yes',
        spendingStyle: 'budget', groundReality: 'bring_it', languageComfort: 'fine',
      })).toBe(100);
    });

    it('counts each filled dimension correctly', () => {
      expect(service.computeCompleteness({ travelPace: 'loose', comfortLevel: 'rough' })).toBe(22);
    });
  });

  describe('resetProfile', () => {
    it('deletes the profile', async () => {
      mockPrisma.travelerProfile.delete.mockResolvedValue({});
      await service.resetProfile('fb-1');
      expect(mockPrisma.travelerProfile.delete).toHaveBeenCalled();
    });
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

```bash
cd sarthi-backend && npx jest src/profile/profile.service.spec.ts --no-coverage 2>&1 | tail -5
```

Expected: FAIL — `Cannot find module './profile.service'`

- [ ] **Step 3: Create `src/profile/profile.service.ts`**

```typescript
import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { AiService } from '../ai/ai.service';
import type { SubmitQuizDto } from './dto/submit-quiz.dto';

interface FirebaseUser { uid: string; name?: string; email?: string; }

const DIMENSION_KEYS = [
  'travelPace', 'depthVsBreadth', 'comfortLevel', 'crowdTolerance',
  'travelMotivations', 'physicalReadiness', 'spendingStyle', 'groundReality', 'languageComfort',
] as const;

@Injectable()
export class ProfileService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly aiService: AiService,
  ) {}

  private async findOrCreateUser(firebaseUid: string) {
    return this.prisma.user.upsert({
      where: { firebaseUid },
      update: {},
      create: { firebaseUid },
    });
  }

  computeCompleteness(dimensions: Partial<Record<string, any>>): number {
    const filled = DIMENSION_KEYS.filter((k) => {
      const v = dimensions[k];
      return v !== null && v !== undefined && (Array.isArray(v) ? v.length > 0 : true);
    }).length;
    return Math.round((filled / DIMENSION_KEYS.length) * 100);
  }

  async getProfile(firebaseUid: string) {
    const user = await this.findOrCreateUser(firebaseUid);
    return this.prisma.travelerProfile.findUnique({ where: { userId: user.id } });
  }

  async submitStory(firebaseUid: string, story: string) {
    const user = await this.findOrCreateUser(firebaseUid);
    const extracted = await this.aiService.extractPersonality(story);

    const dimensions: Record<string, any> = {};
    for (const key of DIMENSION_KEYS) {
      const val = (extracted as any)[key];
      if (val !== undefined && val !== null) {
        dimensions[key] = val;
      }
    }

    const completeness = this.computeCompleteness(dimensions);

    return this.prisma.travelerProfile.upsert({
      where: { userId: user.id },
      update: { story, ...dimensions, completeness },
      create: { userId: user.id, story, ...dimensions, completeness },
    });
  }

  async submitQuiz(firebaseUid: string, dto: SubmitQuizDto) {
    const user = await this.findOrCreateUser(firebaseUid);

    const existing = await this.prisma.travelerProfile.findUnique({ where: { userId: user.id } });
    const merged = { ...(existing ?? {}), ...dto };
    const completeness = this.computeCompleteness(merged);

    return this.prisma.travelerProfile.upsert({
      where: { userId: user.id },
      update: { ...dto, completeness },
      create: { userId: user.id, ...dto, completeness },
    });
  }

  async getQuizPrefill(firebaseUid: string) {
    return this.getProfile(firebaseUid);
  }

  async resetProfile(firebaseUid: string) {
    const user = await this.findOrCreateUser(firebaseUid);
    await this.prisma.travelerProfile.delete({ where: { userId: user.id } }).catch(() => null);
  }
}
```

- [ ] **Step 4: Run tests to verify they pass**

```bash
cd sarthi-backend && npx jest src/profile/profile.service.spec.ts --no-coverage 2>&1 | tail -5
```

Expected: `Tests: 7 passed`

---

### Task 5: Profile controller + module

**Files:**
- Create: `src/profile/profile.controller.ts`
- Create: `src/profile/profile.controller.spec.ts`
- Create: `src/profile/profile.module.ts`

- [ ] **Step 1: Write failing controller test**

Create `src/profile/profile.controller.spec.ts`:

```typescript
import { Test } from '@nestjs/testing';
import { ProfileController } from './profile.controller';
import { ProfileService } from './profile.service';

const mockService = {
  getProfile: jest.fn(),
  submitStory: jest.fn(),
  submitQuiz: jest.fn(),
  getQuizPrefill: jest.fn(),
  resetProfile: jest.fn(),
};

const req = { user: { uid: 'fb-1' } };

describe('ProfileController', () => {
  let controller: ProfileController;

  beforeEach(async () => {
    const module = await Test.createTestingModule({
      controllers: [ProfileController],
      providers: [{ provide: ProfileService, useValue: mockService }],
    }).compile();
    controller = module.get(ProfileController);
    jest.clearAllMocks();
  });

  it('GET /profile calls service.getProfile', async () => {
    mockService.getProfile.mockResolvedValue({ id: 'p-1' });
    const result = await controller.get(req);
    expect(mockService.getProfile).toHaveBeenCalledWith('fb-1');
    expect(result).toEqual({ id: 'p-1' });
  });

  it('POST /profile/story calls service.submitStory', async () => {
    mockService.submitStory.mockResolvedValue({ id: 'p-1', travelPace: 'loose' });
    const result = await controller.story(req, { story: 'I loved Spiti...' });
    expect(mockService.submitStory).toHaveBeenCalledWith('fb-1', 'I loved Spiti...');
    expect(result).toHaveProperty('travelPace', 'loose');
  });

  it('PUT /profile/quiz calls service.submitQuiz', async () => {
    mockService.submitQuiz.mockResolvedValue({ id: 'p-1', travelPace: 'packed' });
    const result = await controller.quiz(req, { travelPace: 'packed' });
    expect(mockService.submitQuiz).toHaveBeenCalledWith('fb-1', { travelPace: 'packed' });
    expect(result).toHaveProperty('travelPace', 'packed');
  });

  it('GET /profile/quiz-prefill calls service.getQuizPrefill', async () => {
    mockService.getQuizPrefill.mockResolvedValue({ id: 'p-1' });
    const result = await controller.quizPrefill(req);
    expect(mockService.getQuizPrefill).toHaveBeenCalledWith('fb-1');
  });

  it('DELETE /profile calls service.resetProfile', async () => {
    await controller.reset(req);
    expect(mockService.resetProfile).toHaveBeenCalledWith('fb-1');
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

```bash
cd sarthi-backend && npx jest src/profile/profile.controller.spec.ts --no-coverage 2>&1 | tail -5
```

Expected: FAIL — `Cannot find module './profile.controller'`

- [ ] **Step 3: Create `src/profile/profile.controller.ts`**

```typescript
import { Body, Controller, Delete, Get, HttpCode, Post, Put, Req, UseGuards } from '@nestjs/common';
import { FirebaseAuthGuard } from '../auth/firebase-auth.guard';
import { ProfileService } from './profile.service';
import { SubmitStoryDto } from './dto/submit-story.dto';
import { SubmitQuizDto } from './dto/submit-quiz.dto';

@Controller('profile')
@UseGuards(FirebaseAuthGuard)
export class ProfileController {
  constructor(private readonly service: ProfileService) {}

  @Get()
  async get(@Req() req: any) {
    return this.service.getProfile(req.user.uid);
  }

  @Post('story')
  async story(@Req() req: any, @Body() dto: SubmitStoryDto) {
    return this.service.submitStory(req.user.uid, dto.story);
  }

  @Put('quiz')
  async quiz(@Req() req: any, @Body() dto: SubmitQuizDto) {
    return this.service.submitQuiz(req.user.uid, dto);
  }

  @Get('quiz-prefill')
  async quizPrefill(@Req() req: any) {
    return this.service.getQuizPrefill(req.user.uid);
  }

  @Delete()
  @HttpCode(204)
  async reset(@Req() req: any) {
    await this.service.resetProfile(req.user.uid);
  }
}
```

- [ ] **Step 4: Create `src/profile/profile.module.ts`**

```typescript
import { Module } from '@nestjs/common';
import { ProfileController } from './profile.controller';
import { ProfileService } from './profile.service';
import { AiModule } from '../ai/ai.module';

@Module({
  imports: [AiModule],
  controllers: [ProfileController],
  providers: [ProfileService],
  exports: [ProfileService],
})
export class ProfileModule {}
```

- [ ] **Step 5: Run controller tests**

```bash
cd sarthi-backend && npx jest src/profile/ --no-coverage 2>&1 | tail -5
```

Expected: `Tests: 12 passed`

---

### Task 6: Corrections service + controller + module

**Files:**
- Create: `src/corrections/dto/create-correction.dto.ts`
- Create: `src/corrections/corrections.service.ts`
- Create: `src/corrections/corrections.service.spec.ts`
- Create: `src/corrections/corrections.controller.ts`
- Create: `src/corrections/corrections.controller.spec.ts`
- Create: `src/corrections/corrections.module.ts`

- [ ] **Step 1: Create `src/corrections/dto/create-correction.dto.ts`**

```typescript
import { IsString, IsIn, IsObject } from 'class-validator';

const CORRECTION_TYPES = ['removed_place','added_place','swapped_place','thumbs_down','thumbs_up'];

export class CreateCorrectionDto {
  @IsString()
  tripId: string;

  @IsString()
  @IsIn(CORRECTION_TYPES)
  type: string;

  @IsObject()
  context: Record<string, unknown>;
}
```

- [ ] **Step 2: Write failing service tests**

Create `src/corrections/corrections.service.spec.ts`:

```typescript
import { Test } from '@nestjs/testing';
import { CorrectionsService } from './corrections.service';
import { PrismaService } from '../prisma/prisma.service';

const mockPrisma = {
  correction: {
    create: jest.fn(),
    findMany: jest.fn(),
  },
  user: {
    upsert: jest.fn().mockResolvedValue({ id: 'user-1' }),
  },
};

describe('CorrectionsService', () => {
  let service: CorrectionsService;

  beforeEach(async () => {
    const module = await Test.createTestingModule({
      providers: [
        CorrectionsService,
        { provide: PrismaService, useValue: mockPrisma },
      ],
    }).compile();
    service = module.get(CorrectionsService);
    jest.clearAllMocks();
  });

  describe('create', () => {
    it('creates a correction record', async () => {
      mockPrisma.correction.create.mockResolvedValue({ id: 'c-1', type: 'thumbs_down' });
      const result = await service.create('fb-1', { tripId: 't-1', type: 'thumbs_down', context: { place: 'Elephant Falls' } });
      expect(mockPrisma.correction.create).toHaveBeenCalled();
      expect(result).toHaveProperty('type', 'thumbs_down');
    });
  });

  describe('listByUser', () => {
    it('returns corrections for the user', async () => {
      mockPrisma.correction.findMany.mockResolvedValue([{ id: 'c-1' }, { id: 'c-2' }]);
      const result = await service.listByUser('fb-1');
      expect(result).toHaveLength(2);
    });
  });

  describe('getRecentForPrompt', () => {
    it('returns at most 10 corrections', async () => {
      const many = Array.from({ length: 15 }, (_, i) => ({ id: `c-${i}`, type: 'thumbs_down', context: {} }));
      mockPrisma.correction.findMany.mockResolvedValue(many.slice(0, 10));
      const result = await service.getRecentForPrompt('user-1');
      expect(result.length).toBeLessThanOrEqual(10);
    });

    it('returns empty array when no corrections', async () => {
      mockPrisma.correction.findMany.mockResolvedValue([]);
      const result = await service.getRecentForPrompt('user-1');
      expect(result).toEqual([]);
    });
  });
});
```

- [ ] **Step 3: Run test to verify it fails**

```bash
cd sarthi-backend && npx jest src/corrections/corrections.service.spec.ts --no-coverage 2>&1 | tail -5
```

Expected: FAIL — `Cannot find module './corrections.service'`

- [ ] **Step 4: Create `src/corrections/corrections.service.ts`**

```typescript
import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreateCorrectionDto } from './dto/create-correction.dto';
import { Prisma } from '@prisma/client';

@Injectable()
export class CorrectionsService {
  constructor(private readonly prisma: PrismaService) {}

  private async findOrCreateUser(firebaseUid: string) {
    return this.prisma.user.upsert({
      where: { firebaseUid },
      update: {},
      create: { firebaseUid },
    });
  }

  async create(firebaseUid: string, dto: CreateCorrectionDto) {
    const user = await this.findOrCreateUser(firebaseUid);
    return this.prisma.correction.create({
      data: {
        userId: user.id,
        tripId: dto.tripId,
        type: dto.type,
        context: dto.context as Prisma.JsonValue,
      },
    });
  }

  async listByUser(firebaseUid: string) {
    const user = await this.findOrCreateUser(firebaseUid);
    return this.prisma.correction.findMany({
      where: { userId: user.id },
      orderBy: { createdAt: 'desc' },
    });
  }

  async getRecentForPrompt(userId: string) {
    return this.prisma.correction.findMany({
      where: { userId },
      orderBy: { createdAt: 'desc' },
      take: 10,
    });
  }
}
```

- [ ] **Step 5: Create `src/corrections/corrections.controller.ts`**

```typescript
import { Body, Controller, Get, Post, Req, UseGuards } from '@nestjs/common';
import { FirebaseAuthGuard } from '../auth/firebase-auth.guard';
import { CorrectionsService } from './corrections.service';
import { CreateCorrectionDto } from './dto/create-correction.dto';

@Controller('corrections')
@UseGuards(FirebaseAuthGuard)
export class CorrectionsController {
  constructor(private readonly service: CorrectionsService) {}

  @Post()
  async create(@Req() req: any, @Body() dto: CreateCorrectionDto) {
    return this.service.create(req.user.uid, dto);
  }

  @Get()
  async list(@Req() req: any) {
    return this.service.listByUser(req.user.uid);
  }
}
```

- [ ] **Step 6: Write and run controller tests**

Create `src/corrections/corrections.controller.spec.ts`:

```typescript
import { Test } from '@nestjs/testing';
import { CorrectionsController } from './corrections.controller';
import { CorrectionsService } from './corrections.service';

const mockService = {
  create: jest.fn(),
  listByUser: jest.fn(),
};

const req = { user: { uid: 'fb-1' } };

describe('CorrectionsController', () => {
  let controller: CorrectionsController;

  beforeEach(async () => {
    const module = await Test.createTestingModule({
      controllers: [CorrectionsController],
      providers: [{ provide: CorrectionsService, useValue: mockService }],
    }).compile();
    controller = module.get(CorrectionsController);
    jest.clearAllMocks();
  });

  it('POST /corrections calls service.create', async () => {
    mockService.create.mockResolvedValue({ id: 'c-1' });
    const dto = { tripId: 't-1', type: 'thumbs_down', context: { place: 'Elephant Falls' } };
    const result = await controller.create(req, dto as any);
    expect(mockService.create).toHaveBeenCalledWith('fb-1', dto);
  });

  it('GET /corrections calls service.listByUser', async () => {
    mockService.listByUser.mockResolvedValue([]);
    await controller.list(req);
    expect(mockService.listByUser).toHaveBeenCalledWith('fb-1');
  });
});
```

- [ ] **Step 7: Create `src/corrections/corrections.module.ts`**

```typescript
import { Module } from '@nestjs/common';
import { CorrectionsController } from './corrections.controller';
import { CorrectionsService } from './corrections.service';

@Module({
  controllers: [CorrectionsController],
  providers: [CorrectionsService],
  exports: [CorrectionsService],
})
export class CorrectionsModule {}
```

- [ ] **Step 8: Run all corrections tests**

```bash
cd sarthi-backend && npx jest src/corrections/ --no-coverage 2>&1 | tail -5
```

Expected: `Tests: 6 passed`

---

### Task 7: Personality + corrections prompt injection

**Files:**
- Modify: `src/ai/prompts/destination.prompt.ts`
- Modify: `src/ai/prompts/destination.prompt.spec.ts`

- [ ] **Step 1: Write failing tests for `buildPersonalityBlock`**

Add to `src/ai/prompts/destination.prompt.spec.ts` — update the import line to include `buildPersonalityBlock` and `buildCorrectionsBlock`:

```typescript
import { ..., buildPersonalityBlock, buildCorrectionsBlock } from './destination.prompt';
```

Add these describe blocks at the end of the file:

```typescript
describe('buildPersonalityBlock', () => {
  it('returns empty string when profile is null', () => {
    expect(buildPersonalityBlock(null)).toBe('');
  });

  it('returns empty string when profile has no dimensions set', () => {
    expect(buildPersonalityBlock({ travelPace: null, completeness: 0 } as any)).toBe('');
  });

  it('includes filled dimensions', () => {
    const block = buildPersonalityBlock({
      travelPace: 'loose',
      comfortLevel: 'homestay',
      crowdTolerance: 'avoid',
      travelMotivations: ['nature', 'culture'],
      completeness: 44,
    } as any);
    expect(block).toContain('## Traveler Personality');
    expect(block).toContain('Pace: loose');
    expect(block).toContain('Comfort: homestay');
    expect(block).toContain('Crowds: avoid');
    expect(block).toContain('Motivations: nature, culture');
  });

  it('omits dimensions that are null/undefined', () => {
    const block = buildPersonalityBlock({ travelPace: 'packed', completeness: 11 } as any);
    expect(block).not.toContain('Comfort:');
    expect(block).not.toContain('Crowds:');
  });

  it('includes personalMatch instruction', () => {
    const block = buildPersonalityBlock({ travelPace: 'loose', completeness: 11 } as any);
    expect(block).toContain('personalMatch');
    expect(block).toContain('matchLevel');
  });
});

describe('buildCorrectionsBlock', () => {
  it('returns empty string for empty corrections array', () => {
    expect(buildCorrectionsBlock([])).toBe('');
  });

  it('returns empty string for null', () => {
    expect(buildCorrectionsBlock(null as any)).toBe('');
  });

  it('includes corrections summary heading', () => {
    const block = buildCorrectionsBlock([
      { type: 'thumbs_down', context: { place: 'Elephant Falls', reason: 'touristy' } },
    ] as any);
    expect(block).toContain('## Past Preferences');
    expect(block).toContain('thumbs_down');
  });
});
```

- [ ] **Step 2: Run tests to verify they fail**

```bash
cd sarthi-backend && npx jest src/ai/prompts/destination.prompt.spec.ts --no-coverage -t "buildPersonalityBlock|buildCorrectionsBlock" 2>&1 | tail -5
```

Expected: FAIL — `buildPersonalityBlock is not exported`

- [ ] **Step 3: Add `buildPersonalityBlock` and `buildCorrectionsBlock` to `destination.prompt.ts`**

Add after the `buildSearchContext` function (before `buildHealthContext`):

```typescript
export interface TravelerProfileSnapshot {
  travelPace?: string | null;
  depthVsBreadth?: string | null;
  comfortLevel?: string | null;
  crowdTolerance?: string | null;
  travelMotivations?: string[];
  physicalReadiness?: string | null;
  spendingStyle?: string | null;
  groundReality?: string | null;
  languageComfort?: string | null;
  completeness?: number;
}

export function buildPersonalityBlock(profile: TravelerProfileSnapshot | null): string {
  if (!profile) return '';

  const lines: string[] = [];
  if (profile.travelPace)       lines.push(`- Pace: ${profile.travelPace}`);
  if (profile.depthVsBreadth)   lines.push(`- Depth: ${profile.depthVsBreadth}`);
  if (profile.comfortLevel)     lines.push(`- Comfort: ${profile.comfortLevel}`);
  if (profile.crowdTolerance)   lines.push(`- Crowds: ${profile.crowdTolerance}`);
  if (profile.travelMotivations?.length) lines.push(`- Motivations: ${profile.travelMotivations.join(', ')}`);
  if (profile.physicalReadiness) lines.push(`- Physical: ${profile.physicalReadiness}`);
  if (profile.spendingStyle)    lines.push(`- Spending: ${profile.spendingStyle}`);
  if (profile.groundReality)    lines.push(`- Ground reality: ${profile.groundReality}`);
  if (profile.languageComfort)  lines.push(`- Language: ${profile.languageComfort}`);

  if (lines.length === 0) return '';

  return `\n## Traveler Personality\n${lines.join('\n')}\n\nFor each result include: "personalMatch":{"matchLevel":"<great_match|good_match|heads_up|not_your_style>","reason":"<one sentence why this fits or doesn't fit this specific traveler>"}`;
}

export interface CorrectionRecord {
  type: string;
  context: Record<string, unknown>;
}

export function buildCorrectionsBlock(corrections: CorrectionRecord[] | null): string {
  if (!corrections?.length) return '';

  const lines = corrections.map((c) => {
    const ctx = c.context as any;
    const place = ctx.place ?? ctx.name ?? 'unknown place';
    const reason = ctx.reason ? ` (${ctx.reason})` : '';
    return `- ${c.type}: "${place}"${reason}`;
  });

  return `\n## Past Preferences (learned from your trips)\n${lines.join('\n')}\n\nAvoid places similar to removed/thumbs-down items. Favour places similar to thumbs-up items.`;
}
```

- [ ] **Step 4: Wire personality + corrections into all 5 prompt builders**

In `buildHybridPrompt`, `buildAiFullPrompt`, `buildItineraryPrompt`, `buildFoodGuidePrompt`, and `buildTrekPrompt`, update the function signatures to accept optional `profile` and `corrections`, and inject the blocks into the user prompt.

For `buildHybridPrompt` — update signature and user string:

```typescript
export function buildHybridPrompt(
  params: PromptParams & { destinations: CompactDestination[]; profile?: TravelerProfileSnapshot | null; corrections?: CorrectionRecord[] },
): { system: string; user: string } {
  // ... existing code ...
  const personalityBlock = buildPersonalityBlock(params.profile ?? null);
  const correctionsBlock = buildCorrectionsBlock(params.corrections ?? []);

  return {
    system: SYSTEM_PROMPT,
    user: `Traveler: ${params.freeText}${healthContext}

${searchContext}${personalityBlock}${correctionsBlock}

Rank these destinations ...
```

Apply the same pattern to `buildAiFullPrompt`, `buildItineraryPrompt`, `buildFoodGuidePrompt`, `buildTrekPrompt` — each gets `profile?` and `corrections?` optional params, calls `buildPersonalityBlock` and `buildCorrectionsBlock`, appends them after `searchContext` (or after `healthContext` for prompts without searchContext).

Full updated signatures:

```typescript
// buildAiFullPrompt
export function buildAiFullPrompt(params: PromptParams & { profile?: TravelerProfileSnapshot | null; corrections?: CorrectionRecord[] }): { system: string; user: string }

// buildItineraryPrompt  
export function buildItineraryPrompt(params: ItineraryParams & { profile?: TravelerProfileSnapshot | null; corrections?: CorrectionRecord[] }): { system: string; user: string }

// buildFoodGuidePrompt
export function buildFoodGuidePrompt(params: FoodGuideParams & { profile?: TravelerProfileSnapshot | null; corrections?: CorrectionRecord[] }): { system: string; user: string }

// buildTrekPrompt
export function buildTrekPrompt(params: TrekPromptParams & { profile?: TravelerProfileSnapshot | null; corrections?: CorrectionRecord[] }): { system: string; user: string }
```

In each user string, add after the context block (before the format instruction):
```
${personalityBlock}${correctionsBlock}
```

- [ ] **Step 5: Run all prompt tests**

```bash
cd sarthi-backend && npx jest src/ai/prompts/destination.prompt.spec.ts --no-coverage 2>&1 | tail -8
```

Expected: All tests pass (including the 8 new ones).

---

### Task 8: Add personalMatch to destination schemas

**Files:**
- Modify: `src/ai/schemas/destination.schema.ts`

- [ ] **Step 1: Add `personalMatchSchema` and wire it in**

Add to `destination.schema.ts` after the `tripReadinessSchema`:

```typescript
export const personalMatchSchema = z.object({
  matchLevel: z.enum(['great_match', 'good_match', 'heads_up', 'not_your_style']),
  reason: z.string(),
}).optional();
```

Then add `personalMatch: personalMatchSchema` to `rankResultSchema`, `generateResultSchema`, and `trekResultSchema`.

Example for `rankResultSchema`:

```typescript
export const rankResultSchema = z.object({
  id: z.string(),
  whyItMatches: z.string(),
  healthAdvisory: healthAdvisorySchema,
  costBreakdown: costBreakdownSchema,
  permits: permitsSchema,
  tripReadiness: tripReadinessSchema,
  personalMatch: personalMatchSchema,  // add this line
});
```

- [ ] **Step 2: Run full test suite to verify no regressions**

```bash
cd sarthi-backend && npx jest --no-coverage 2>&1 | tail -8
```

Expected: All existing tests still pass (personalMatch is optional so existing mock data without it still parses fine).

---

### Task 9: Wire profile + corrections into destination-finder

**Files:**
- Modify: `src/destination-finder/destination-finder.service.ts`
- Modify: `src/destination-finder/destination-finder.controller.ts`
- Modify: `src/destination-finder/destination-finder.module.ts`

- [ ] **Step 1: Update `destination-finder.service.ts`**

Import `ProfileService` and `CorrectionsService`:

```typescript
import { ProfileService } from '../profile/profile.service';
import { CorrectionsService } from '../corrections/corrections.service';
import type { TravelerProfileSnapshot, CorrectionRecord } from '../ai/prompts/destination.prompt';
```

Add to constructor:

```typescript
constructor(
  // ... existing ...
  private readonly profileService: ProfileService,
  private readonly correctionsService: CorrectionsService,
) {}
```

Add a private helper to fetch personality context:

```typescript
private async getPersonalContext(firebaseUid?: string): Promise<{
  profile: TravelerProfileSnapshot | null;
  corrections: CorrectionRecord[];
}> {
  if (!firebaseUid) return { profile: null, corrections: [] };
  try {
    const profile = await this.profileService.getProfile(firebaseUid);
    const user = profile ? await this.prismaUser(firebaseUid) : null;
    const corrections = user
      ? await this.correctionsService.getRecentForPrompt(user.id)
      : [];
    return { profile, corrections: corrections as CorrectionRecord[] };
  } catch {
    return { profile: null, corrections: [] };
  }
}
```

Note: `prismaUser` is a tiny inline helper — add it:

```typescript
private async prismaUser(firebaseUid: string) {
  return this.profileService['findOrCreateUser']?.(firebaseUid) ?? null;
}
```

Update `search()` signature to accept `firebaseUid?`:

```typescript
async search(dto: SearchDestinationsDto, bust = false, firebaseUid?: string) {
  const { profile, corrections } = await this.getPersonalContext(firebaseUid);
  // ... then pass profile + corrections to runTrekMode, runAiFull, runHybrid
```

Update each `run*` method to accept and pass `profile` and `corrections` to the prompt builders.

- [ ] **Step 2: Update `destination-finder.controller.ts`**

Pass `req.user?.uid` to `service.search()`:

```typescript
@Post('search')
async search(@Body() dto: SearchDestinationsDto, @Req() req: any) {
  return this.service.search(dto, false, req.user?.uid);
}
```

Do the same for `/bust-cache` if it exists.

Also update `itinerary` and `food-guide` routes to pass `req.user?.uid` to the service.

- [ ] **Step 3: Update `destination-finder.module.ts`**

```typescript
import { ProfileModule } from '../profile/profile.module';
import { CorrectionsModule } from '../corrections/corrections.module';

@Module({
  imports: [/* existing... */ ProfileModule, CorrectionsModule],
  // ...
})
```

- [ ] **Step 4: Run full test suite**

```bash
cd sarthi-backend && npx jest --no-coverage 2>&1 | tail -8
```

Expected: All tests pass.

---

### Task 10: Register new modules in AppModule + full verification

**Files:**
- Modify: `src/app.module.ts`

- [ ] **Step 1: Register ProfileModule + CorrectionsModule**

```typescript
import { ProfileModule } from './profile/profile.module';
import { CorrectionsModule } from './corrections/corrections.module';

@Module({
  imports: [
    // existing...
    ProfileModule,
    CorrectionsModule,
  ],
})
export class AppModule {}
```

- [ ] **Step 2: Run full test suite**

```bash
cd sarthi-backend && npx jest --no-coverage 2>&1 | tail -10
```

Expected: All test suites pass.

- [ ] **Step 3: Build**

```bash
cd sarthi-backend && npm run build 2>&1 | tail -5
```

Expected: No TypeScript errors.

- [ ] **Step 4: Start server and smoke test**

In a separate terminal, start the server:
```bash
npm run start:dev
```

Test profile endpoints:
```bash
# Create profile via story
curl -X POST http://localhost:3000/profile/story \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer <your-token>" \
  -d '{"story":"I loved Spiti — stayed with locals, terrible roads but amazing views. Hated Manali, too crowded."}'

# Should return extracted dimensions + completeness score

# Get profile
curl http://localhost:3000/profile \
  -H "Authorization: Bearer <your-token>"

# Log a correction
curl -X POST http://localhost:3000/corrections \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer <your-token>" \
  -d '{"tripId":"<any-trip-id>","type":"thumbs_down","context":{"place":"Elephant Falls","reason":"too touristy"}}'

# Search with profile now active — results should include personalMatch
curl -X POST http://localhost:3000/destination-finder/search \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer <your-token>" \
  -d '{"freeText":"weekend trip","dates":{"from":"2026-05-10","to":"2026-05-12"},"budget":{"min":5000,"max":10000},"group":{"size":2,"type":"couple"},"departureCity":"Mumbai"}'
```

Expected: Search results include `"personalMatch":{"matchLevel":"...","reason":"..."}` on each destination.
