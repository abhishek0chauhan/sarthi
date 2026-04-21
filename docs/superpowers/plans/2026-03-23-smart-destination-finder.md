# Smart Destination Finder Implementation Plan

> **For agentic workers:** REQUIRED: Use superpowers:subagent-driven-development (if subagents available) or superpowers:executing-plans to implement this plan. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build the `POST /destination-finder/search` endpoint — takes structured filters + free text, queries DB for a shortlist, sends it to Claude for ranking/personalization, returns rich destination cards. ~580 tokens per search in hybrid mode.

**Architecture:** DB-first hybrid approach. Structured filters narrow the destination DB to ≤15 results. Claude receives only compact fields and writes one `whyItMatches` line per destination. Mode (`hybrid`/`claude_full`) is controlled per-feature via env var. Results are cached in Redis by SHA-256 fingerprint for 24h. Firebase Auth JWT required. Rate limit: 20 req/user/min.

**Tech Stack:** NestJS, TypeScript, Prisma (PostgreSQL), ioredis, `@anthropic-ai/sdk`, Firebase Admin SDK, `class-validator`, `class-transformer`, `@nestjs/throttler`, Jest

---

## Prerequisites

Before starting, ensure:
- [ ] NestJS project created: `npx @nestjs/cli new sarthi-backend` (select `npm`)
- [ ] Working directory is the NestJS project root for all tasks
- [ ] PostgreSQL running (local or Docker: `docker run -d -p 5432:5432 -e POSTGRES_PASSWORD=postgres postgres`)
- [ ] Redis running (Docker: `docker run -d -p 6379:6379 redis`)
- [ ] `.env` file created at project root (see Task 1)

---

## File Map

| File | Responsibility |
|---|---|
| `prisma/schema.prisma` | Destination model |
| `src/prisma/prisma.service.ts` | PrismaClient wrapper (NestJS injectable) |
| `src/prisma/prisma.module.ts` | Exports PrismaService globally |
| `src/auth/firebase-auth.guard.ts` | Verifies Firebase JWT on incoming requests |
| `src/auth/firebase-auth.guard.spec.ts` | Unit tests for auth guard |
| `src/cache/cache.service.ts` | Redis get/set + cache key builder + text normalizer |
| `src/cache/cache.service.spec.ts` | Unit tests for cache service |
| `src/cache/cache.module.ts` | Exports CacheService globally |
| `src/claude/prompts/hybrid.prompt.ts` | Builds both hybrid and claude-full prompts (both functions exported from this file) |
| `src/claude/prompts/hybrid.prompt.spec.ts` | Unit tests for both prompt builders |
| `src/claude/claude.service.ts` | Calls Claude API, validates + parses output |
| `src/claude/claude.service.spec.ts` | Unit tests with mocked Anthropic client |
| `src/claude/claude.module.ts` | Exports ClaudeService globally |
| `src/destination-finder/dto/search-destinations.dto.ts` | Request validation (class-validator) |
| `src/destination-finder/dto/destination-result.dto.ts` | Response type |
| `src/destination-finder/destination-query.service.ts` | Prisma DB queries with filter logic |
| `src/destination-finder/destination-query.service.spec.ts` | Unit tests with mocked Prisma |
| `src/destination-finder/destination-finder.service.ts` | Orchestrates cache → DB → Claude flow |
| `src/destination-finder/destination-finder.service.spec.ts` | Unit tests with mocked dependencies |
| `src/destination-finder/destination-finder.controller.ts` | HTTP endpoint, auth guard, throttle |
| `src/destination-finder/destination-finder.controller.spec.ts` | Unit tests with mocked service |
| `src/destination-finder/destination-finder.module.ts` | Wires all the above together |
| `src/app.module.ts` | Root module — add ThrottlerModule + feature module |

---

## Task 1: Install Dependencies & Configure Environment

**Files:**
- Modify: `package.json` (via npm install)
- Create: `.env`
- Create: `.env.example`

- [ ] **Step 1: Install all required packages**

```bash
npm install @prisma/client @anthropic-ai/sdk ioredis firebase-admin \
  class-validator class-transformer @nestjs/config @nestjs/throttler@^4

npm install --save-dev prisma @types/ioredis
```

- [ ] **Step 2: Enable global validation pipe in `src/main.ts`**

Open `src/main.ts` and replace its contents with:

```typescript
import { NestFactory } from '@nestjs/core';
import { ValidationPipe } from '@nestjs/common';
import { AppModule } from './app.module';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);
  app.useGlobalPipes(new ValidationPipe({ whitelist: true, transform: true }));
  await app.listen(3000);
}
bootstrap();
```

> **NestJS concept:** `ValidationPipe` with `whitelist: true` strips unknown fields from incoming requests. `transform: true` auto-converts string query params to their declared types. This is how class-validator DTOs get enforced globally.

- [ ] **Step 3: Create `.env`**

```env
DATABASE_URL="postgresql://postgres:postgres@localhost:5432/sarthi"
REDIS_URL="redis://localhost:6379"
ANTHROPIC_API_KEY="your-key-here"
DESTINATION_FINDER_AI_MODE="hybrid"
FIREBASE_PROJECT_ID="your-firebase-project-id"
```

- [ ] **Step 4: Create `.env.example`** (safe to commit)

```env
DATABASE_URL="postgresql://user:password@localhost:5432/sarthi"
REDIS_URL="redis://localhost:6379"
ANTHROPIC_API_KEY=""
DESTINATION_FINDER_AI_MODE="hybrid"
FIREBASE_PROJECT_ID=""
```

- [ ] **Step 5: Add `.env` to `.gitignore`** (verify it's there — NestJS CLI usually adds it)

```bash
grep -q "^.env$" .gitignore && echo "already ignored" || echo ".env" >> .gitignore
```

- [ ] **Step 6: Commit**

```bash
git add package.json package-lock.json src/main.ts .env.example .gitignore
git commit -m "feat: install dependencies and configure environment"
```

---

## Task 2: Prisma Setup & Destination Schema

**Files:**
- Modify: `prisma/schema.prisma`
- Create: `src/prisma/prisma.service.ts`
- Create: `src/prisma/prisma.module.ts`

- [ ] **Step 1: Initialize Prisma**

```bash
npx prisma init
```

This creates `prisma/schema.prisma` and adds `DATABASE_URL` to `.env`. Your `.env` already has `DATABASE_URL` so the generated one can be ignored.

- [ ] **Step 2: Write the Destination schema**

Replace the contents of `prisma/schema.prisma` with:

```prisma
generator client {
  provider = "prisma-client-js"
}

datasource db {
  provider = "postgresql"
  url      = env("DATABASE_URL")
}

model Destination {
  id              String   @id @default(uuid())
  name            String
  state           String
  region          String
  experienceTypes String[]
  budgetMin       Int
  budgetMax       Int
  bestMonths      Int[]
  highlights      String[]
  isHiddenGem     Boolean  @default(false)
  weatherSummary  String
  travelTimes     Json
  createdAt       DateTime @default(now())
  updatedAt       DateTime @updatedAt
}
```

- [ ] **Step 3: Run migration**

```bash
npx prisma migrate dev --name init
```

Expected: `Your database is now in sync with your schema.`

- [ ] **Step 4: Generate Prisma client**

```bash
npx prisma generate
```

- [ ] **Step 5: Create `src/prisma/prisma.service.ts`**

```typescript
import { Injectable, OnModuleInit, OnModuleDestroy } from '@nestjs/common';
import { PrismaClient } from '@prisma/client';

@Injectable()
export class PrismaService extends PrismaClient implements OnModuleInit, OnModuleDestroy {
  async onModuleInit() {
    await this.$connect();
  }

  async onModuleDestroy() {
    await this.$disconnect();
  }
}
```

> **NestJS concept:** By implementing `OnModuleInit` and `OnModuleDestroy`, Prisma connects when the app starts and disconnects cleanly on shutdown.

- [ ] **Step 6: Create `src/prisma/prisma.module.ts`**

```typescript
import { Global, Module } from '@nestjs/common';
import { PrismaService } from './prisma.service';

@Global()
@Module({
  providers: [PrismaService],
  exports: [PrismaService],
})
export class PrismaModule {}
```

> **NestJS concept:** `@Global()` means you only need to import `PrismaModule` once in `AppModule` — all other modules can inject `PrismaService` without re-importing.

- [ ] **Step 7: Commit**

```bash
git add prisma/ src/prisma/
git commit -m "feat: add Prisma schema and PrismaService"
```

---

## Task 3: Firebase Auth Guard

**Files:**
- Create: `src/auth/firebase-auth.guard.ts`
- Create: `src/auth/firebase-auth.guard.spec.ts`

- [ ] **Step 1: Write the failing test**

Create `src/auth/firebase-auth.guard.spec.ts`:

```typescript
import { ExecutionContext, UnauthorizedException } from '@nestjs/common';
import { FirebaseAuthGuard } from './firebase-auth.guard';

// Mock the firebase-admin module before importing the guard
jest.mock('firebase-admin', () => ({
  auth: jest.fn(() => ({
    verifyIdToken: jest.fn(),
  })),
  apps: ['mock-app'], // prevents re-initialization
}));

import * as admin from 'firebase-admin';

function mockContext(authHeader?: string): ExecutionContext {
  return {
    switchToHttp: () => ({
      getRequest: () => ({ headers: { authorization: authHeader } }),
    }),
  } as unknown as ExecutionContext;
}

describe('FirebaseAuthGuard', () => {
  let guard: FirebaseAuthGuard;
  let verifyIdToken: jest.Mock;

  beforeEach(() => {
    guard = new FirebaseAuthGuard();
    verifyIdToken = (admin.auth() as any).verifyIdToken;
    verifyIdToken.mockReset();
  });

  it('throws 401 when no Authorization header', async () => {
    await expect(guard.canActivate(mockContext())).rejects.toThrow(UnauthorizedException);
  });

  it('throws 401 when header is not Bearer', async () => {
    await expect(guard.canActivate(mockContext('Basic abc123'))).rejects.toThrow(UnauthorizedException);
  });

  it('throws 401 when token is invalid', async () => {
    verifyIdToken.mockRejectedValue(new Error('invalid token'));
    await expect(guard.canActivate(mockContext('Bearer bad-token'))).rejects.toThrow(UnauthorizedException);
  });

  it('returns true and attaches user when token is valid', async () => {
    const decodedToken = { uid: 'user-123', email: 'test@test.com' };
    verifyIdToken.mockResolvedValue(decodedToken);

    const request: any = { headers: { authorization: 'Bearer valid-token' } };
    const ctx = {
      switchToHttp: () => ({ getRequest: () => request }),
    } as unknown as ExecutionContext;

    const result = await guard.canActivate(ctx);
    expect(result).toBe(true);
    expect(request.user).toEqual(decodedToken);
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

```bash
npx jest --testPathPattern="firebase-auth.guard" --no-coverage
```

Expected: FAIL — `Cannot find module './firebase-auth.guard'`

- [ ] **Step 3: Create `src/auth/firebase-auth.guard.ts`**

```typescript
import { Injectable, CanActivate, ExecutionContext, UnauthorizedException } from '@nestjs/common';
import * as admin from 'firebase-admin';

if (!admin.apps.length) {
  admin.initializeApp({
    projectId: process.env.FIREBASE_PROJECT_ID,
  });
}

@Injectable()
export class FirebaseAuthGuard implements CanActivate {
  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context.switchToHttp().getRequest();
    const authHeader: string | undefined = request.headers.authorization;

    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      throw new UnauthorizedException();
    }

    const token = authHeader.split('Bearer ')[1];

    try {
      const decodedToken = await admin.auth().verifyIdToken(token);
      request.user = decodedToken;
      return true;
    } catch {
      throw new UnauthorizedException();
    }
  }
}
```

- [ ] **Step 4: Run test to verify it passes**

```bash
npx jest --testPathPattern="firebase-auth.guard" --no-coverage
```

Expected: PASS — 4 tests passing

- [ ] **Step 5: Commit**

```bash
git add src/auth/
git commit -m "feat: add Firebase auth guard"
```

---

## Task 4: Cache Service

**Files:**
- Create: `src/cache/cache.service.ts`
- Create: `src/cache/cache.service.spec.ts`
- Create: `src/cache/cache.module.ts`

- [ ] **Step 1: Write the failing tests**

Create `src/cache/cache.service.spec.ts`:

```typescript
import { CacheService } from './cache.service';

// Mock ioredis before the module is imported
jest.mock('ioredis', () => {
  return jest.fn().mockImplementation(() => ({
    get: jest.fn(),
    setex: jest.fn(),
  }));
});

import Redis from 'ioredis';

describe('CacheService', () => {
  let service: CacheService;
  let redisMock: { get: jest.Mock; setex: jest.Mock };

  beforeEach(() => {
    service = new CacheService();
    redisMock = (Redis as unknown as jest.Mock).mock.results[
      (Redis as unknown as jest.Mock).mock.results.length - 1
    ].value;
  });

  describe('get', () => {
    it('returns null when key does not exist', async () => {
      redisMock.get.mockResolvedValue(null);
      expect(await service.get('missing-key')).toBeNull();
    });

    it('parses and returns cached value', async () => {
      redisMock.get.mockResolvedValue(JSON.stringify({ mode: 'hybrid', results: [] }));
      expect(await service.get('some-key')).toEqual({ mode: 'hybrid', results: [] });
    });
  });

  describe('set', () => {
    it('serializes value and calls setex with TTL', async () => {
      redisMock.setex.mockResolvedValue('OK');
      await service.set('my-key', { foo: 'bar' }, 3600);
      expect(redisMock.setex).toHaveBeenCalledWith('my-key', 3600, JSON.stringify({ foo: 'bar' }));
    });
  });

  describe('normalizeText', () => {
    it('lowercases text', () => {
      expect(service.normalizeText('Hello WORLD')).toBe('hello world');
    });

    it('trims leading and trailing whitespace', () => {
      expect(service.normalizeText('  hello  ')).toBe('hello');
    });

    it('collapses multiple spaces into one', () => {
      expect(service.normalizeText('hello   world')).toBe('hello world');
    });

    it('strips punctuation', () => {
      expect(service.normalizeText('offbeat, trek!')).toBe('offbeat trek');
    });

    it('handles combined transformations', () => {
      expect(service.normalizeText('  Want something OFFBEAT, not too touristy!  ')).toBe(
        'want something offbeat not too touristy',
      );
    });
  });

  describe('buildKey', () => {
    it('returns a 64-character hex SHA-256 hash', () => {
      const key = service.buildKey({ a: 1, b: 'foo' });
      expect(key).toMatch(/^[a-f0-9]{64}$/);
    });

    it('returns the same hash for identical params', () => {
      const key1 = service.buildKey({ dates: { from: '2025-05-01' }, budget: { min: 5000 } });
      const key2 = service.buildKey({ dates: { from: '2025-05-01' }, budget: { min: 5000 } });
      expect(key1).toBe(key2);
    });

    it('returns different hashes for different params', () => {
      const key1 = service.buildKey({ budget: { min: 5000 } });
      const key2 = service.buildKey({ budget: { min: 10000 } });
      expect(key1).not.toBe(key2);
    });

    it('produces different hashes for normalizedFreeText vs freeText field names', () => {
      const key1 = service.buildKey({ normalizedFreeText: 'offbeat trek' });
      const key2 = service.buildKey({ freeText: 'offbeat trek' });
      expect(key1).not.toBe(key2);
    });
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

```bash
npx jest --testPathPattern="cache.service" --no-coverage
```

Expected: FAIL — `Cannot find module './cache.service'`

- [ ] **Step 3: Create `src/cache/cache.service.ts`**

```typescript
import { Injectable } from '@nestjs/common';
import Redis from 'ioredis';
import { createHash } from 'crypto';

@Injectable()
export class CacheService {
  private readonly redis: Redis;

  constructor() {
    this.redis = new Redis(process.env.REDIS_URL || 'redis://localhost:6379');
  }

  async get<T>(key: string): Promise<T | null> {
    const value = await this.redis.get(key);
    if (!value) return null;
    return JSON.parse(value) as T;
  }

  async set(key: string, value: unknown, ttlSeconds: number): Promise<void> {
    await this.redis.setex(key, ttlSeconds, JSON.stringify(value));
  }

  buildKey(params: Record<string, unknown>): string {
    return createHash('sha256').update(JSON.stringify(params)).digest('hex');
  }

  normalizeText(text: string): string {
    return text
      .toLowerCase()
      .trim()
      .replace(/\s+/g, ' ')
      .replace(/[^a-z0-9 ]/g, '');
  }
}
```

- [ ] **Step 4: Run test to verify it passes**

```bash
npx jest --testPathPattern="cache.service" --no-coverage
```

Expected: PASS — all tests passing

- [ ] **Step 5: Create `src/cache/cache.module.ts`**

```typescript
import { Global, Module } from '@nestjs/common';
import { CacheService } from './cache.service';

@Global()
@Module({
  providers: [CacheService],
  exports: [CacheService],
})
export class CacheModule {}
```

- [ ] **Step 6: Commit**

```bash
git add src/cache/
git commit -m "feat: add Redis CacheService with key builder and text normalizer"
```

---

## Task 5: Claude Prompt Builders

**Files:**
- Create: `src/claude/prompts/hybrid.prompt.ts` (exports both `buildHybridPrompt` and `buildClaudeFullPrompt`)
- Create: `src/claude/prompts/hybrid.prompt.spec.ts`

- [ ] **Step 1: Write the failing tests**

Create `src/claude/prompts/hybrid.prompt.spec.ts`:

```typescript
import { buildHybridPrompt, buildClaudeFullPrompt } from './hybrid.prompt';

const baseParams = {
  freeText: 'want something offbeat',
  group: { size: 4, type: 'friends' },
  budget: { min: 5000, max: 15000 },
  dates: { from: '2025-05-01', to: '2025-05-07' },
  departureCity: 'Mumbai',
};

describe('buildHybridPrompt', () => {
  const destinations = [
    {
      id: 'uuid-1',
      name: 'Kasol',
      state: 'Himachal Pradesh',
      experienceTypes: ['mountains', 'adventure'],
      isHiddenGem: true,
      weatherSummary: 'Pleasant in May',
      budgetMin: 700,
      budgetMax: 1200,
    },
  ];

  it('returns system and user keys', () => {
    const prompt = buildHybridPrompt({ ...baseParams, destinations });
    expect(prompt).toHaveProperty('system');
    expect(prompt).toHaveProperty('user');
  });

  it('system prompt instructs JSON-only response', () => {
    const { system } = buildHybridPrompt({ ...baseParams, destinations });
    expect(system).toContain('valid JSON');
    expect(system).toContain('No explanations');
  });

  it('user prompt contains traveler free text', () => {
    const { user } = buildHybridPrompt({ ...baseParams, destinations });
    expect(user).toContain('want something offbeat');
  });

  it('user prompt contains group, budget, dates, departure city', () => {
    const { user } = buildHybridPrompt({ ...baseParams, destinations });
    expect(user).toContain('4 friends');
    expect(user).toContain('₹5000–15000');
    expect(user).toContain('2025-05-01');
    expect(user).toContain('Mumbai');
  });

  it('user prompt contains serialized destination data', () => {
    const { user } = buildHybridPrompt({ ...baseParams, destinations });
    expect(user).toContain('uuid-1');
    expect(user).toContain('Kasol');
  });

  it('user prompt requests max 5 results in JSON', () => {
    const { user } = buildHybridPrompt({ ...baseParams, destinations });
    expect(user).toContain('Max 5 results');
    expect(user).toContain('whyItMatches');
  });
});

describe('buildClaudeFullPrompt', () => {
  it('returns system and user keys', () => {
    const prompt = buildClaudeFullPrompt(baseParams);
    expect(prompt).toHaveProperty('system');
    expect(prompt).toHaveProperty('user');
  });

  it('asks Claude to generate destination fields', () => {
    const { user } = buildClaudeFullPrompt(baseParams);
    expect(user).toContain('budgetEstimate');
    expect(user).toContain('weatherSnapshot');
    expect(user).toContain('travelTime');
    expect(user).toContain('highlights');
  });

  it('includes departure city in travel time instruction', () => {
    const { user } = buildClaudeFullPrompt(baseParams);
    expect(user).toContain('Mumbai');
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

```bash
npx jest --testPathPattern="hybrid.prompt" --no-coverage
```

Expected: FAIL — `Cannot find module './hybrid.prompt'`

- [ ] **Step 3: Create `src/claude/prompts/hybrid.prompt.ts`**

```typescript
export interface HybridPromptDestination {
  id: string;
  name: string;
  state: string;
  experienceTypes: string[];
  isHiddenGem: boolean;
  weatherSummary: string;
  budgetMin: number;
  budgetMax: number;
}

export interface PromptParams {
  freeText: string;
  group: { size: number; type: string };
  budget: { min: number; max: number };
  dates: { from: string; to: string };
  departureCity: string;
}

const SYSTEM_PROMPT =
  'You are a travel recommendation engine for Indian destinations.\nRespond only in valid JSON. No explanations.';

export function buildHybridPrompt(
  params: PromptParams & { destinations: HybridPromptDestination[] },
): { system: string; user: string } {
  return {
    system: SYSTEM_PROMPT,
    user: `Traveler context: ${params.freeText}
Group: ${params.group.size} ${params.group.type} | Budget: ₹${params.budget.min}–${params.budget.max}/person | Dates: ${params.dates.from} to ${params.dates.to} | From: ${params.departureCity}

Rank these destinations and write a one-line "whyItMatches" for each:
${JSON.stringify(params.destinations)}

Return: [{ "id": "...", "whyItMatches": "..." }] ranked by best match. Max 5 results.`,
  };
}

export function buildClaudeFullPrompt(params: PromptParams): { system: string; user: string } {
  return {
    system: SYSTEM_PROMPT,
    user: `Traveler context: ${params.freeText}
Group: ${params.group.size} ${params.group.type} | Budget: ₹${params.budget.min}–${params.budget.max}/person | Dates: ${params.dates.from} to ${params.dates.to} | From: ${params.departureCity}

Recommend up to 5 Indian travel destinations that best match this traveler.
For each destination return:
{
  "name": "...",
  "state": "...",
  "isHiddenGem": true/false,
  "budgetEstimate": "₹X–Y per person for N days",
  "weatherSnapshot": "...",
  "travelTime": "estimated travel time from ${params.departureCity}",
  "highlights": ["...", "...", "..."],
  "whyItMatches": "one line explanation"
}

Return a JSON array. No explanations outside the array.`,
  };
}
```

- [ ] **Step 4: Run test to verify it passes**

```bash
npx jest --testPathPattern="hybrid.prompt" --no-coverage
```

Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add src/claude/prompts/
git commit -m "feat: add hybrid and claude-full prompt builders"
```

---

## Task 6: Claude Service

**Files:**
- Create: `src/claude/claude.service.ts`
- Create: `src/claude/claude.service.spec.ts`
- Create: `src/claude/claude.module.ts`

- [ ] **Step 1: Write the failing tests**

Create `src/claude/claude.service.spec.ts`:

```typescript
import { ClaudeService } from './claude.service';

jest.mock('@anthropic-ai/sdk', () => {
  return {
    default: jest.fn().mockImplementation(() => ({
      messages: {
        create: jest.fn(),
      },
    })),
  };
});

import Anthropic from '@anthropic-ai/sdk';

const PROMPT = { system: 'sys', user: 'usr' };
const SHORTLIST_IDS = ['id-1', 'id-2', 'id-3'];

describe('ClaudeService', () => {
  let service: ClaudeService;
  let mockCreate: jest.Mock;

  beforeEach(() => {
    service = new ClaudeService();
    mockCreate = (Anthropic as unknown as jest.Mock).mock.results[
      (Anthropic as unknown as jest.Mock).mock.results.length - 1
    ].value.messages.create;
    mockCreate.mockReset();
  });

  describe('rankDestinations', () => {
    it('returns ranked results filtered to shortlist IDs, capped at 5', async () => {
      const claudeResponse = [
        { id: 'id-1', whyItMatches: 'Great for trekking' },
        { id: 'id-2', whyItMatches: 'Offbeat and scenic' },
        { id: 'unknown-id', whyItMatches: 'Should be filtered out' },
      ];
      mockCreate.mockResolvedValue({
        content: [{ type: 'text', text: JSON.stringify(claudeResponse) }],
      });

      const result = await service.rankDestinations(PROMPT, SHORTLIST_IDS);
      expect(result).toHaveLength(2);
      expect(result[0]).toEqual({ id: 'id-1', whyItMatches: 'Great for trekking' });
      expect(result.find(r => r.id === 'unknown-id')).toBeUndefined();
    });

    it('returns empty array when Claude returns malformed JSON', async () => {
      mockCreate.mockResolvedValue({
        content: [{ type: 'text', text: 'not valid json {{{' }],
      });

      const result = await service.rankDestinations(PROMPT, SHORTLIST_IDS);
      expect(result).toEqual([]);
    });

    it('returns empty array when Claude returns empty array', async () => {
      mockCreate.mockResolvedValue({
        content: [{ type: 'text', text: '[]' }],
      });

      const result = await service.rankDestinations(PROMPT, SHORTLIST_IDS);
      expect(result).toEqual([]);
    });

    it('caps results at 5 even if Claude returns more', async () => {
      const manyResults = Array.from({ length: 10 }, (_, i) => ({
        id: `id-${i + 1}`,
        whyItMatches: `reason ${i}`,
      }));
      const largeShortlist = manyResults.map(r => r.id);
      mockCreate.mockResolvedValue({
        content: [{ type: 'text', text: JSON.stringify(manyResults) }],
      });

      const result = await service.rankDestinations(PROMPT, largeShortlist);
      expect(result).toHaveLength(5);
    });

    it('throws when Claude API itself throws', async () => {
      mockCreate.mockRejectedValue(new Error('API error'));
      await expect(service.rankDestinations(PROMPT, SHORTLIST_IDS)).rejects.toThrow('API error');
    });
  });

  describe('generateDestinations', () => {
    it('returns parsed array from Claude', async () => {
      const destinations = [{ name: 'Kasol', state: 'HP' }];
      mockCreate.mockResolvedValue({
        content: [{ type: 'text', text: JSON.stringify(destinations) }],
      });

      const result = await service.generateDestinations(PROMPT);
      expect(result).toEqual(destinations);
    });

    it('returns empty array on malformed JSON', async () => {
      mockCreate.mockResolvedValue({
        content: [{ type: 'text', text: 'bad json' }],
      });

      const result = await service.generateDestinations(PROMPT);
      expect(result).toEqual([]);
    });

    it('caps results at 5', async () => {
      const many = Array.from({ length: 8 }, (_, i) => ({ name: `Place ${i}` }));
      mockCreate.mockResolvedValue({
        content: [{ type: 'text', text: JSON.stringify(many) }],
      });

      const result = await service.generateDestinations(PROMPT);
      expect(result).toHaveLength(5);
    });
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

```bash
npx jest --testPathPattern="claude.service" --no-coverage
```

Expected: FAIL — `Cannot find module './claude.service'`

- [ ] **Step 3: Create `src/claude/claude.service.ts`**

```typescript
import { Injectable, Logger } from '@nestjs/common';
import Anthropic from '@anthropic-ai/sdk';

@Injectable()
export class ClaudeService {
  private readonly client: Anthropic;
  private readonly logger = new Logger(ClaudeService.name);

  constructor() {
    this.client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });
  }

  async rankDestinations(
    prompt: { system: string; user: string },
    shortlistIds: string[],
  ): Promise<Array<{ id: string; whyItMatches: string }>> {
    const message = await this.client.messages.create({
      model: 'claude-sonnet-4-6',
      max_tokens: 1024,
      system: prompt.system,
      messages: [{ role: 'user', content: prompt.user }],
    });

    const text = message.content[0].type === 'text' ? message.content[0].text : '';

    let parsed: Array<{ id: string; whyItMatches: string }>;
    try {
      parsed = JSON.parse(text);
    } catch {
      this.logger.error('Claude returned malformed JSON in rankDestinations', text);
      return [];
    }

    if (!Array.isArray(parsed) || parsed.length === 0) {
      this.logger.warn('Claude returned empty array in rankDestinations');
      return [];
    }

    return parsed.filter(item => shortlistIds.includes(item.id)).slice(0, 5);
  }

  async generateDestinations(
    prompt: { system: string; user: string },
  ): Promise<Array<Record<string, unknown>>> {
    const message = await this.client.messages.create({
      model: 'claude-sonnet-4-6',
      max_tokens: 2048,
      system: prompt.system,
      messages: [{ role: 'user', content: prompt.user }],
    });

    const text = message.content[0].type === 'text' ? message.content[0].text : '[]';

    try {
      const parsed = JSON.parse(text);
      return Array.isArray(parsed) ? parsed.slice(0, 5) : [];
    } catch {
      this.logger.error('Claude returned malformed JSON in generateDestinations', text);
      return [];
    }
  }
}
```

- [ ] **Step 4: Run test to verify it passes**

```bash
npx jest --testPathPattern="claude.service" --no-coverage
```

Expected: PASS

- [ ] **Step 5: Create `src/claude/claude.module.ts`**

```typescript
import { Global, Module } from '@nestjs/common';
import { ClaudeService } from './claude.service';

@Global()
@Module({
  providers: [ClaudeService],
  exports: [ClaudeService],
})
export class ClaudeModule {}
```

- [ ] **Step 6: Commit**

```bash
git add src/claude/
git commit -m "feat: add ClaudeService with rankDestinations and generateDestinations"
```

---

## Task 7: Destination Query Service

**Files:**
- Create: `src/destination-finder/dto/search-destinations.dto.ts`
- Create: `src/destination-finder/destination-query.service.ts`
- Create: `src/destination-finder/destination-query.service.spec.ts`

- [ ] **Step 1: Create the DTO first** (the query service depends on it)

Create `src/destination-finder/dto/search-destinations.dto.ts`:

```typescript
import {
  IsArray,
  IsDateString,
  IsEnum,
  IsInt,
  IsString,
  Min,
  ValidateNested,
} from 'class-validator';
import { Type } from 'class-transformer';

class DateRangeDto {
  @IsDateString()
  from: string;

  @IsDateString()
  to: string;
}

class BudgetDto {
  @IsInt()
  @Min(0)
  min: number;

  @IsInt()
  @Min(0)
  max: number;
}

class GroupDto {
  @IsInt()
  @Min(1)
  size: number;

  @IsEnum(['solo', 'couple', 'friends', 'family'])
  type: string;
}

export class SearchDestinationsDto {
  @ValidateNested()
  @Type(() => DateRangeDto)
  dates: DateRangeDto;

  @ValidateNested()
  @Type(() => BudgetDto)
  budget: BudgetDto;

  @IsArray()
  @IsString({ each: true })
  experienceTypes: string[];

  @IsString()
  departureCity: string;

  @ValidateNested()
  @Type(() => GroupDto)
  group: GroupDto;

  @IsString()
  freeText: string;
}
```

- [ ] **Step 2: Write the failing tests for DestinationQueryService**

Create `src/destination-finder/destination-query.service.spec.ts`:

```typescript
import { DestinationQueryService } from './destination-query.service';
import { PrismaService } from '../prisma/prisma.service';
import { SearchDestinationsDto } from './dto/search-destinations.dto';

function makeDto(overrides: Partial<SearchDestinationsDto> = {}): SearchDestinationsDto {
  return {
    dates: { from: '2025-05-01', to: '2025-05-07' },
    budget: { min: 5000, max: 15000 },
    experienceTypes: ['mountains', 'adventure'],
    departureCity: 'Mumbai',
    group: { size: 4, type: 'friends' },
    freeText: 'offbeat trek',
    ...overrides,
  };
}

describe('DestinationQueryService', () => {
  let service: DestinationQueryService;
  let prismaMock: { destination: { findMany: jest.Mock } };

  beforeEach(() => {
    prismaMock = { destination: { findMany: jest.fn() } };
    service = new DestinationQueryService(prismaMock as unknown as PrismaService);
  });

  describe('findShortlist', () => {
    it('calls prisma with correct budget overlap filter', async () => {
      prismaMock.destination.findMany.mockResolvedValue([]);
      await service.findShortlist(makeDto());

      expect(prismaMock.destination.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({
            budgetMin: { lte: 15000 },
            budgetMax: { gte: 5000 },
          }),
        }),
      );
    });

    it('filters on experienceTypes using hasSome', async () => {
      prismaMock.destination.findMany.mockResolvedValue([]);
      await service.findShortlist(makeDto());

      expect(prismaMock.destination.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({
            experienceTypes: { hasSome: ['mountains', 'adventure'] },
          }),
        }),
      );
    });

    it('extracts month 5 for a May trip', async () => {
      prismaMock.destination.findMany.mockResolvedValue([]);
      await service.findShortlist(makeDto({ dates: { from: '2025-05-01', to: '2025-05-07' } }));

      expect(prismaMock.destination.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({
            bestMonths: { hasSome: [5] },
          }),
        }),
      );
    });

    it('extracts both months for a cross-month trip', async () => {
      prismaMock.destination.findMany.mockResolvedValue([]);
      await service.findShortlist(makeDto({ dates: { from: '2025-04-28', to: '2025-05-03' } }));

      const call = prismaMock.destination.findMany.mock.calls[0][0];
      expect(call.where.bestMonths.hasSome).toEqual(expect.arrayContaining([4, 5]));
    });

    it('limits results to 15', async () => {
      prismaMock.destination.findMany.mockResolvedValue([]);
      await service.findShortlist(makeDto());

      expect(prismaMock.destination.findMany).toHaveBeenCalledWith(
        expect.objectContaining({ take: 15 }),
      );
    });

    it('returns the destinations from prisma', async () => {
      const mockDests = [{ id: 'uuid-1', name: 'Kasol' }];
      prismaMock.destination.findMany.mockResolvedValue(mockDests);

      const result = await service.findShortlist(makeDto());
      expect(result).toEqual(mockDests);
    });
  });
});
```

- [ ] **Step 3: Run test to verify it fails**

```bash
npx jest --testPathPattern="destination-query.service" --no-coverage
```

Expected: FAIL

- [ ] **Step 4: Create `src/destination-finder/destination-query.service.ts`**

```typescript
import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { SearchDestinationsDto } from './dto/search-destinations.dto';

@Injectable()
export class DestinationQueryService {
  constructor(private readonly prisma: PrismaService) {}

  async findShortlist(dto: SearchDestinationsDto) {
    const months = this.extractMonths(dto.dates.from, dto.dates.to);

    return this.prisma.destination.findMany({
      where: {
        experienceTypes: { hasSome: dto.experienceTypes },
        budgetMin: { lte: dto.budget.max },
        budgetMax: { gte: dto.budget.min },
        bestMonths: { hasSome: months },
      },
      take: 15,
    });
  }

  private extractMonths(from: string, to: string): number[] {
    const start = new Date(from);
    const end = new Date(to);
    const months = new Set<number>();

    months.add(start.getMonth() + 1);

    const current = new Date(start.getFullYear(), start.getMonth() + 1, 1);
    while (current <= end) {
      months.add(current.getMonth() + 1);
      current.setMonth(current.getMonth() + 1);
    }

    return Array.from(months);
  }
}
```

- [ ] **Step 5: Run test to verify it passes**

```bash
npx jest --testPathPattern="destination-query.service" --no-coverage
```

Expected: PASS

- [ ] **Step 6: Commit**

```bash
git add src/destination-finder/dto/ src/destination-finder/destination-query.service.ts src/destination-finder/destination-query.service.spec.ts
git commit -m "feat: add DestinationQueryService with filter logic and SearchDestinationsDto"
```

---

## Task 8: Destination Finder Service (Orchestrator)

**Files:**
- Create: `src/destination-finder/destination-finder.service.ts`
- Create: `src/destination-finder/destination-finder.service.spec.ts`

- [ ] **Step 1: Write the failing tests**

Create `src/destination-finder/destination-finder.service.spec.ts`:

```typescript
import { DestinationFinderService } from './destination-finder.service';
import { DestinationQueryService } from './destination-query.service';
import { ClaudeService } from '../claude/claude.service';
import { CacheService } from '../cache/cache.service';
import { ConfigService } from '@nestjs/config';
import { SearchDestinationsDto } from './dto/search-destinations.dto';

function makeDto(): SearchDestinationsDto {
  return {
    dates: { from: '2025-05-01', to: '2025-05-07' },
    budget: { min: 5000, max: 15000 },
    experienceTypes: ['mountains'],
    departureCity: 'Mumbai',
    group: { size: 4, type: 'friends' },
    freeText: 'offbeat trek',
  };
}

const mockDestination = {
  id: 'uuid-1',
  name: 'Kasol',
  state: 'Himachal Pradesh',
  region: 'North',
  experienceTypes: ['mountains', 'adventure'],
  budgetMin: 700,
  budgetMax: 1200,
  bestMonths: [4, 5, 6],
  highlights: ['Kheerganga trek', 'Parvati Valley'],
  isHiddenGem: true,
  weatherSummary: 'Pleasant in May',
  travelTimes: { Mumbai: '14h bus', Delhi: '10h bus' },
};

describe('DestinationFinderService', () => {
  let service: DestinationFinderService;
  let queryService: jest.Mocked<DestinationQueryService>;
  let claudeService: jest.Mocked<ClaudeService>;
  let cacheService: jest.Mocked<CacheService>;
  let configService: jest.Mocked<ConfigService>;

  beforeEach(() => {
    queryService = { findShortlist: jest.fn() } as any;
    claudeService = { rankDestinations: jest.fn(), generateDestinations: jest.fn() } as any;
    cacheService = {
      get: jest.fn(),
      set: jest.fn(),
      buildKey: jest.fn().mockReturnValue('cache-key-hash'),
      normalizeText: jest.fn().mockReturnValue('offbeat trek'),
    } as any;
    configService = { get: jest.fn() } as any;

    service = new DestinationFinderService(queryService, claudeService, cacheService, configService);
  });

  describe('cache hit', () => {
    it('returns cached result without calling DB or Claude', async () => {
      const cached = { mode: 'hybrid', results: [] };
      cacheService.get.mockResolvedValue(cached);

      const result = await service.search(makeDto());

      expect(result).toEqual(cached);
      expect(queryService.findShortlist).not.toHaveBeenCalled();
      expect(claudeService.rankDestinations).not.toHaveBeenCalled();
    });
  });

  describe('hybrid mode', () => {
    beforeEach(() => {
      cacheService.get.mockResolvedValue(null);
      configService.get.mockReturnValue('hybrid');
    });

    it('returns ranked results merged with DB data including travelTime', async () => {
      queryService.findShortlist.mockResolvedValue([mockDestination] as any);
      claudeService.rankDestinations.mockResolvedValue([
        { id: 'uuid-1', whyItMatches: 'Great for trekking' },
      ]);

      const result = await service.search(makeDto()) as any;

      expect(result.mode).toBe('hybrid');
      expect(result.results[0].name).toBe('Kasol');
      expect(result.results[0].travelTime).toBe('14h bus');
      expect(result.results[0].whyItMatches).toBe('Great for trekking');
    });

    it('omits travelTime when departure city not in travelTimes map', async () => {
      const destWithoutCity = { ...mockDestination, travelTimes: { Delhi: '10h bus' } };
      queryService.findShortlist.mockResolvedValue([destWithoutCity] as any);
      claudeService.rankDestinations.mockResolvedValue([
        { id: 'uuid-1', whyItMatches: 'Great trek' },
      ]);

      const result = await service.search(makeDto()) as any;
      expect(result.results[0].travelTime).toBeUndefined();
    });

    it('falls back to top 5 DB results without whyItMatches when Claude returns empty', async () => {
      queryService.findShortlist.mockResolvedValue([mockDestination] as any);
      claudeService.rankDestinations.mockResolvedValue([]);

      const result = await service.search(makeDto()) as any;

      expect(result.mode).toBe('hybrid');
      expect(result.results[0].name).toBe('Kasol');
      expect(result.results[0].whyItMatches).toBeUndefined();
    });

    it('falls back to claude_full when DB returns empty shortlist', async () => {
      queryService.findShortlist.mockResolvedValue([]);
      claudeService.generateDestinations.mockResolvedValue([{ name: 'Spiti', state: 'HP' }]);

      const result = await service.search(makeDto()) as any;

      expect(claudeService.generateDestinations).toHaveBeenCalled();
      expect(result.mode).toBe('claude_full');
    });

    it('caches the result after a successful search', async () => {
      queryService.findShortlist.mockResolvedValue([mockDestination] as any);
      claudeService.rankDestinations.mockResolvedValue([
        { id: 'uuid-1', whyItMatches: 'Great trek' },
      ]);

      await service.search(makeDto());

      expect(cacheService.set).toHaveBeenCalledWith('cache-key-hash', expect.any(Object), 86400);
    });

    it('builds cache key using normalizedFreeText field name (not freeText)', async () => {
      queryService.findShortlist.mockResolvedValue([mockDestination] as any);
      claudeService.rankDestinations.mockResolvedValue([]);

      await service.search(makeDto());

      expect(cacheService.buildKey).toHaveBeenCalledWith(
        expect.objectContaining({ normalizedFreeText: 'offbeat trek' }),
      );
      expect(cacheService.buildKey).toHaveBeenCalledWith(
        expect.not.objectContaining({ freeText: expect.anything() }),
      );
    });

    it('throws 503 when Claude API throws', async () => {
      queryService.findShortlist.mockResolvedValue([mockDestination] as any);
      claudeService.rankDestinations.mockRejectedValue(new Error('Claude API down'));

      await expect(service.search(makeDto())).rejects.toMatchObject({
        status: 503,
      });
    });
  });

  describe('claude_full mode', () => {
    it('skips DB and calls generateDestinations', async () => {
      cacheService.get.mockResolvedValue(null);
      configService.get.mockReturnValue('claude_full');
      claudeService.generateDestinations.mockResolvedValue([{ name: 'Spiti' }]);

      const result = await service.search(makeDto()) as any;

      expect(queryService.findShortlist).not.toHaveBeenCalled();
      expect(result.mode).toBe('claude_full');
    });
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

```bash
npx jest --testPathPattern="destination-finder.service" --no-coverage
```

Expected: FAIL

- [ ] **Step 3: Create `src/destination-finder/destination-finder.service.ts`**

```typescript
import { Injectable, Logger, HttpException, HttpStatus } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Destination } from '@prisma/client';
import { DestinationQueryService } from './destination-query.service';
import { ClaudeService } from '../claude/claude.service';
import { CacheService } from '../cache/cache.service';
import { buildHybridPrompt, buildClaudeFullPrompt } from '../claude/prompts/hybrid.prompt';
import { SearchDestinationsDto } from './dto/search-destinations.dto';

@Injectable()
export class DestinationFinderService {
  private readonly logger = new Logger(DestinationFinderService.name);

  constructor(
    private readonly queryService: DestinationQueryService,
    private readonly claudeService: ClaudeService,
    private readonly cacheService: CacheService,
    private readonly config: ConfigService,
  ) {}

  async search(dto: SearchDestinationsDto) {
    const aiMode = this.config.get<string>('DESTINATION_FINDER_AI_MODE', 'hybrid');

    const { freeText, ...rest } = dto;
    const cacheKey = this.cacheService.buildKey({
      ...rest,
      normalizedFreeText: this.cacheService.normalizeText(freeText),
    });

    const cached = await this.cacheService.get(cacheKey);
    if (cached) return cached;

    try {
      const result =
        aiMode === 'claude_full' ? await this.runClaudeFull(dto) : await this.runHybrid(dto);

      await this.cacheService.set(cacheKey, result, 86400);
      return result;
    } catch (error) {
      this.logger.error('Claude API error during search', error);
      throw new HttpException(
        'Our AI is temporarily unavailable. Please try again in a moment.',
        HttpStatus.SERVICE_UNAVAILABLE,
      );
    }
  }

  private async runHybrid(dto: SearchDestinationsDto) {
    const shortlist = await this.queryService.findShortlist(dto);

    if (shortlist.length === 0) {
      this.logger.warn('DB shortlist empty — falling back to claude_full', dto);
      return this.runClaudeFull(dto);
    }

    const compactShortlist = shortlist.map(d => ({
      id: d.id,
      name: d.name,
      state: d.state,
      experienceTypes: d.experienceTypes,
      isHiddenGem: d.isHiddenGem,
      weatherSummary: d.weatherSummary,
      budgetMin: d.budgetMin,
      budgetMax: d.budgetMax,
    }));

    const prompt = buildHybridPrompt({ ...dto, destinations: compactShortlist });
    const shortlistIds = shortlist.map(d => d.id);
    const ranked = await this.claudeService.rankDestinations(prompt, shortlistIds);

    if (ranked.length === 0) {
      this.logger.warn('Claude returned no results — returning top 5 DB results');
      return {
        mode: 'hybrid',
        results: shortlist.slice(0, 5).map(d => this.formatDbResult(d, dto.departureCity)),
      };
    }

    const destinationMap = new Map(shortlist.map(d => [d.id, d]));
    const results = ranked.map(({ id, whyItMatches }) => ({
      ...this.formatDbResult(destinationMap.get(id)!, dto.departureCity),
      whyItMatches,
    }));

    return { mode: 'hybrid', results };
  }

  private async runClaudeFull(dto: SearchDestinationsDto) {
    const prompt = buildClaudeFullPrompt(dto);
    const destinations = await this.claudeService.generateDestinations(prompt);
    return { mode: 'claude_full', results: destinations };
  }

  private formatDbResult(d: Destination, departureCity: string) {
    const travelTimes = d.travelTimes as Record<string, string> | null;
    const result: Record<string, unknown> = {
      name: d.name,
      state: d.state,
      isHiddenGem: d.isHiddenGem,
      budgetEstimate: `₹${d.budgetMin}–${d.budgetMax} per person per day`,
      weatherSnapshot: d.weatherSummary,
      highlights: d.highlights,
    };

    if (travelTimes?.[departureCity]) {
      result.travelTime = travelTimes[departureCity];
    }

    return result;
  }
}
```

- [ ] **Step 4: Run test to verify it passes**

```bash
npx jest --testPathPattern="destination-finder.service" --no-coverage
```

Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add src/destination-finder/destination-finder.service.ts \
        src/destination-finder/destination-finder.service.spec.ts
git commit -m "feat: add DestinationFinderService with hybrid/claude_full orchestration"
```

---

## Task 9: Controller, Module & App Wiring

**Files:**
- Create: `src/destination-finder/destination-finder.controller.ts`
- Create: `src/destination-finder/destination-finder.controller.spec.ts`
- Create: `src/destination-finder/destination-finder.module.ts`
- Modify: `src/app.module.ts`

- [ ] **Step 1: Write the failing controller tests**

Create `src/destination-finder/destination-finder.controller.spec.ts`:

```typescript
import { Test, TestingModule } from '@nestjs/testing';
import { DestinationFinderController } from './destination-finder.controller';
import { DestinationFinderService } from './destination-finder.service';
import { FirebaseAuthGuard } from '../auth/firebase-auth.guard';
import { ThrottlerGuard } from '@nestjs/throttler';

const mockService = {
  search: jest.fn(),
};

// Override guards so we don't need real Firebase/Redis in unit tests
const mockGuard = { canActivate: jest.fn().mockReturnValue(true) };

describe('DestinationFinderController', () => {
  let controller: DestinationFinderController;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [DestinationFinderController],
      providers: [{ provide: DestinationFinderService, useValue: mockService }],
    })
      .overrideGuard(FirebaseAuthGuard)
      .useValue(mockGuard)
      .overrideGuard(ThrottlerGuard)
      .useValue(mockGuard)
      .compile();

    controller = module.get<DestinationFinderController>(DestinationFinderController);
    mockService.search.mockReset();
  });

  it('calls service.search with the DTO and returns result', async () => {
    const dto = {
      dates: { from: '2025-05-01', to: '2025-05-07' },
      budget: { min: 5000, max: 15000 },
      experienceTypes: ['mountains'],
      departureCity: 'Mumbai',
      group: { size: 4, type: 'friends' },
      freeText: 'offbeat trek',
    };

    const serviceResult = { mode: 'hybrid', results: [{ name: 'Kasol' }] };
    mockService.search.mockResolvedValue(serviceResult);

    const result = await controller.search(dto as any);

    expect(mockService.search).toHaveBeenCalledWith(dto);
    expect(result).toEqual(serviceResult);
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

```bash
npx jest --testPathPattern="destination-finder.controller" --no-coverage
```

Expected: FAIL

- [ ] **Step 3: Create `src/destination-finder/destination-finder.controller.ts`**

```typescript
import { Body, Controller, HttpCode, Post, UseGuards } from '@nestjs/common';
import { Throttle } from '@nestjs/throttler';
import { FirebaseAuthGuard } from '../auth/firebase-auth.guard';
import { DestinationFinderService } from './destination-finder.service';
import { SearchDestinationsDto } from './dto/search-destinations.dto';

@Controller('destination-finder')
@UseGuards(FirebaseAuthGuard)
export class DestinationFinderController {
  constructor(private readonly service: DestinationFinderService) {}

  @Post('search')
  @HttpCode(200)
  @Throttle({ default: { limit: 20, ttl: 60000 } })
  async search(@Body() dto: SearchDestinationsDto) {
    return this.service.search(dto);
  }
}
```

- [ ] **Step 4: Run test to verify it passes**

```bash
npx jest --testPathPattern="destination-finder.controller" --no-coverage
```

Expected: PASS

- [ ] **Step 5: Create `src/destination-finder/destination-finder.module.ts`**

```typescript
import { Module } from '@nestjs/common';
import { DestinationFinderController } from './destination-finder.controller';
import { DestinationFinderService } from './destination-finder.service';
import { DestinationQueryService } from './destination-query.service';

@Module({
  controllers: [DestinationFinderController],
  providers: [DestinationFinderService, DestinationQueryService],
})
export class DestinationFinderModule {}
```

- [ ] **Step 6: Update `src/app.module.ts`**

Replace the contents of `src/app.module.ts`:

```typescript
import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { ThrottlerModule } from '@nestjs/throttler';
import { PrismaModule } from './prisma/prisma.module';
import { CacheModule } from './cache/cache.module';
import { ClaudeModule } from './claude/claude.module';
import { DestinationFinderModule } from './destination-finder/destination-finder.module';

@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true }),
    ThrottlerModule.forRoot([{ ttl: 60000, limit: 20 }]), // ttl is in milliseconds (throttler v4+)
    PrismaModule,
    CacheModule,
    ClaudeModule,
    DestinationFinderModule,
  ],
})
export class AppModule {}
```

> **NestJS concept:** `ConfigModule.forRoot({ isGlobal: true })` makes `ConfigService` injectable everywhere without re-importing. `ThrottlerModule.forRoot` sets the default rate limit; the `@Throttle` decorator on the controller overrides it per-route.

- [ ] **Step 7: Run all tests to verify nothing is broken**

```bash
npx jest --no-coverage
```

Expected: All tests PASS

- [ ] **Step 8: Start the app to verify it boots**

```bash
npm run start:dev
```

Expected: `Application is running on: http://localhost:3000` with no errors.

- [ ] **Step 9: Commit**

```bash
git add src/destination-finder/destination-finder.controller.ts \
        src/destination-finder/destination-finder.controller.spec.ts \
        src/destination-finder/destination-finder.module.ts \
        src/app.module.ts
git commit -m "feat: wire DestinationFinderModule into AppModule with throttling"
```

---

## Task 10: Smoke Test the Endpoint

> This task requires a running database with at least one seed destination and a valid Firebase token. If you don't have a Firebase token yet, test with `claude_full` mode by setting `DESTINATION_FINDER_AI_MODE=claude_full` in `.env`.

- [ ] **Step 1: Seed one destination for testing**

```bash
npx ts-node -e "
const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();
prisma.destination.create({
  data: {
    name: 'Kasol',
    state: 'Himachal Pradesh',
    region: 'North',
    experienceTypes: ['mountains', 'adventure', 'trekking'],
    budgetMin: 700,
    budgetMax: 1200,
    bestMonths: [3,4,5,6,9,10],
    highlights: ['Kheerganga trek', 'Parvati Valley', 'Cafe culture'],
    isHiddenGem: true,
    weatherSummary: 'Pleasant, 12-20°C in May',
    travelTimes: { Mumbai: '14h bus', Delhi: '10h bus' },
  }
}).then(() => { console.log('Seeded'); prisma.\$disconnect(); });
"
```

- [ ] **Step 2: Get a Firebase test token**

In your Firebase project console → Authentication → Users → create a test user. Then get a token via the Firebase REST API:

```bash
curl -X POST \
  "https://identitytoolkit.googleapis.com/v1/accounts:signInWithPassword?key=YOUR_FIREBASE_WEB_API_KEY" \
  -H "Content-Type: application/json" \
  -d '{"email":"test@test.com","password":"testpassword","returnSecureToken":true}'
```

Copy the `idToken` from the response — use it as the Bearer token below.

- [ ] **Step 3: Test the endpoint**

```bash
curl -X POST http://localhost:3000/destination-finder/search \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer YOUR_ID_TOKEN_HERE" \
  -d '{
    "dates": { "from": "2025-05-01", "to": "2025-05-07" },
    "budget": { "min": 5000, "max": 15000 },
    "experienceTypes": ["mountains", "adventure"],
    "departureCity": "Mumbai",
    "group": { "size": 4, "type": "friends" },
    "freeText": "want something offbeat, not too touristy, good for trekking"
  }'
```

Expected: JSON response with `mode: "hybrid"` (or `"claude_full"` if DB has no matching destinations) and up to 5 destination objects.

- [ ] **Step 4: Commit final state**

```bash
git add -A
git commit -m "feat: complete Smart Destination Finder MVP endpoint"
```
