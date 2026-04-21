import { CacheService } from './cache.service';

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

    it('returns null when Redis throws (graceful degradation)', async () => {
      redisMock.get.mockRejectedValue(new Error('connection refused'));
      expect(await service.get('some-key')).toBeNull();
    });
  });

  describe('set', () => {
    it('serializes value and calls setex with TTL', async () => {
      redisMock.setex.mockResolvedValue('OK');
      await service.set('my-key', { foo: 'bar' }, 3600);
      expect(redisMock.setex).toHaveBeenCalledWith('my-key', 3600, JSON.stringify({ foo: 'bar' }));
    });

    it('does not throw when Redis is unavailable (graceful degradation)', async () => {
      redisMock.setex.mockRejectedValue(new Error('connection refused'));
      await expect(service.set('my-key', { foo: 'bar' }, 3600)).resolves.toBeUndefined();
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
