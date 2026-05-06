import { Test, TestingModule } from '@nestjs/testing';
import { BadRequestException } from '@nestjs/common';
import { ActivitySchedulerService } from './activity-scheduler.service';
import { PrismaService } from '../prisma/prisma.service';

describe('ActivitySchedulerService', () => {
  let service: ActivitySchedulerService;
  let prisma: any;

  beforeEach(async () => {
    const mockPrisma = {};

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        ActivitySchedulerService,
        { provide: PrismaService, useValue: mockPrisma },
      ],
    }).compile();

    service = module.get<ActivitySchedulerService>(ActivitySchedulerService);
    prisma = module.get<PrismaService>(PrismaService);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('calculateTravelTime', () => {
    describe('basic calculations', () => {
      it('should calculate travel time for walking at base pace', () => {
        // 1000 meters @ 1.4 m/s * no_plan multiplier (1.0) = 11.9 minutes → 12
        const time = service.calculateTravelTime(1000, 'no_plan', 'walking');
        expect(time).toBe(12);
      });

      it('should calculate travel time for public transit (faster than walking)', () => {
        // 5000 meters @ 8.3 m/s (public transit is faster)
        const walkTime = service.calculateTravelTime(5000, 'no_plan', 'walking');
        const transitTime = service.calculateTravelTime(
          5000,
          'no_plan',
          'public_transit',
        );
        expect(transitTime).toBeLessThan(walkTime);
      });

      it('should calculate travel time for taxi', () => {
        // Taxi has same base speed as public_transit (8.3 m/s)
        const taxiTime = service.calculateTravelTime(5000, 'no_plan', 'taxi');
        const transitTime = service.calculateTravelTime(
          5000,
          'no_plan',
          'public_transit',
        );
        expect(taxiTime).toBe(transitTime);
      });

      it('should calculate travel time for car (fastest)', () => {
        // Car: 11.1 m/s (40 km/h)
        const carTime = service.calculateTravelTime(10000, 'no_plan', 'car');
        const taxiTime = service.calculateTravelTime(10000, 'no_plan', 'taxi');
        expect(carTime).toBeLessThan(taxiTime);
      });
    });

    describe('pace buffers', () => {
      it('should apply packed traveler buffer (+20%)', () => {
        const packedTime = service.calculateTravelTime(1000, 'packed', 'walking');
        const noPlanTime = service.calculateTravelTime(
          1000,
          'no_plan',
          'walking',
        );
        expect(packedTime).toBeGreaterThan(noPlanTime);
        // 1000m @ 1.4 m/s = 11.9 min → 12 (no_plan)
        // 12 * 1.2 = 14.4 → 15 (packed)
        expect(packedTime).toBe(15);
      });

      it('should apply loose traveler buffer (+10%)', () => {
        const looseTime = service.calculateTravelTime(1000, 'loose', 'walking');
        const noPlanTime = service.calculateTravelTime(
          1000,
          'no_plan',
          'walking',
        );
        expect(looseTime).toBeGreaterThan(noPlanTime);
        // 1000m @ 1.4 m/s = 11.9 min → 12 (no_plan)
        // 12 * 1.1 = 13.2 → 14 (loose)
        expect(looseTime).toBe(14);
      });

      it('should apply no_plan pace with no buffer (1.0x multiplier)', () => {
        const time = service.calculateTravelTime(1000, 'no_plan', 'walking');
        expect(time).toBe(12);
      });

      it('should handle large distances with pace buffer', () => {
        const packedTime = service.calculateTravelTime(50000, 'packed', 'car');
        const noPlanTime = service.calculateTravelTime(50000, 'no_plan', 'car');
        expect(packedTime).toBeGreaterThan(noPlanTime);
      });
    });

    describe('error handling', () => {
      it('should throw BadRequestException for invalid distance (zero)', () => {
        expect(() => {
          service.calculateTravelTime(0, 'no_plan', 'walking');
        }).toThrow(BadRequestException);
      });

      it('should throw BadRequestException for negative distance', () => {
        expect(() => {
          service.calculateTravelTime(-100, 'no_plan', 'walking');
        }).toThrow(BadRequestException);
      });

      it('should throw BadRequestException for null distance', () => {
        expect(() => {
          service.calculateTravelTime(null as any, 'no_plan', 'walking');
        }).toThrow(BadRequestException);
      });

      it('should throw BadRequestException for undefined distance', () => {
        expect(() => {
          service.calculateTravelTime(undefined as any, 'no_plan', 'walking');
        }).toThrow(BadRequestException);
      });

      it('should throw BadRequestException for invalid pace', () => {
        expect(() => {
          service.calculateTravelTime(1000, 'invalid_pace', 'walking');
        }).toThrow(BadRequestException);
      });

      it('should throw BadRequestException for invalid transport mode', () => {
        expect(() => {
          service.calculateTravelTime(1000, 'no_plan', 'invalid_mode');
        }).toThrow(BadRequestException);
      });

      it('should throw with descriptive error message for invalid inputs', () => {
        expect(() => {
          service.calculateTravelTime(1000, 'no_plan', 'invalid_mode');
        }).toThrow(/Invalid transport mode/);
      });
    });

    describe('edge cases', () => {
      it('should handle very small distances', () => {
        const time = service.calculateTravelTime(1, 'no_plan', 'walking');
        expect(time).toBeGreaterThan(0);
      });

      it('should handle very large distances', () => {
        const time = service.calculateTravelTime(1000000, 'no_plan', 'public_transit');
        expect(time).toBeGreaterThan(0);
      });

      it('should ceil the result (always round up)', () => {
        // 1000m @ 1.4 m/s = 11.904... should become 12
        const time = service.calculateTravelTime(1000, 'no_plan', 'walking');
        expect(Number.isInteger(time)).toBe(true);
        expect(time).toBeGreaterThanOrEqual(
          Math.floor(1000 / 1.4 / 60 * 1.0),
        );
      });
    });
  });

  describe('parseActivityTime', () => {
    describe('12-hour format with AM/PM', () => {
      it('should parse "9:00 AM" correctly', () => {
        const minutes = service.parseActivityTime('9:00 AM');
        expect(minutes).toBe(9 * 60); // 540 minutes
      });

      it('should parse "12:00 AM" (midnight)', () => {
        const minutes = service.parseActivityTime('12:00 AM');
        expect(minutes).toBe(0); // 0 minutes (midnight)
      });

      it('should parse "12:30 AM" (after midnight)', () => {
        const minutes = service.parseActivityTime('12:30 AM');
        expect(minutes).toBe(30); // 30 minutes
      });

      it('should parse "1:00 AM"', () => {
        const minutes = service.parseActivityTime('1:00 AM');
        expect(minutes).toBe(1 * 60); // 60 minutes
      });

      it('should parse "12:00 PM" (noon)', () => {
        const minutes = service.parseActivityTime('12:00 PM');
        expect(minutes).toBe(12 * 60); // 720 minutes
      });

      it('should parse "12:30 PM" (afternoon)', () => {
        const minutes = service.parseActivityTime('12:30 PM');
        expect(minutes).toBe(12 * 60 + 30); // 750 minutes
      });

      it('should parse "1:00 PM" (afternoon)', () => {
        const minutes = service.parseActivityTime('1:00 PM');
        expect(minutes).toBe(13 * 60); // 780 minutes
      });

      it('should parse "11:59 PM" (just before midnight)', () => {
        const minutes = service.parseActivityTime('11:59 PM');
        expect(minutes).toBe(23 * 60 + 59); // 1439 minutes
      });

      it('should handle case-insensitive AM/PM', () => {
        const lowercaseAm = service.parseActivityTime('9:00 am');
        const uppercaseAm = service.parseActivityTime('9:00 AM');
        const mixedCase = service.parseActivityTime('9:00 Am');
        expect(lowercaseAm).toBe(uppercaseAm);
        expect(lowercaseAm).toBe(mixedCase);
      });
    });

    describe('24-hour format', () => {
      it('should parse "14:30" (24-hour format)', () => {
        const minutes = service.parseActivityTime('14:30');
        expect(minutes).toBe(14 * 60 + 30); // 870 minutes
      });

      it('should parse "00:00" (midnight in 24-hour)', () => {
        const minutes = service.parseActivityTime('00:00');
        expect(minutes).toBe(0);
      });

      it('should parse "23:59" (just before midnight)', () => {
        const minutes = service.parseActivityTime('23:59');
        expect(minutes).toBe(23 * 60 + 59); // 1439 minutes
      });

      it('should parse "06:45"', () => {
        const minutes = service.parseActivityTime('06:45');
        expect(minutes).toBe(6 * 60 + 45); // 405 minutes
      });

      it('should parse "9:30" (without leading zero)', () => {
        const minutes = service.parseActivityTime('9:30');
        expect(minutes).toBe(9 * 60 + 30); // 570 minutes
      });
    });

    describe('error handling', () => {
      it('should throw BadRequestException for invalid format', () => {
        expect(() => service.parseActivityTime('invalid')).toThrow(
          BadRequestException,
        );
      });

      it('should throw BadRequestException for empty string', () => {
        expect(() => service.parseActivityTime('')).toThrow(
          BadRequestException,
        );
      });

      it('should throw BadRequestException for whitespace-only string', () => {
        expect(() => service.parseActivityTime('   ')).toThrow(
          BadRequestException,
        );
      });

      it('should throw BadRequestException for null', () => {
        expect(() => service.parseActivityTime(null as any)).toThrow(
          BadRequestException,
        );
      });

      it('should throw BadRequestException for undefined', () => {
        expect(() => service.parseActivityTime(undefined as any)).toThrow(
          BadRequestException,
        );
      });

      it('should throw BadRequestException for non-string input', () => {
        expect(() => service.parseActivityTime(123 as any)).toThrow(
          BadRequestException,
        );
      });

      it('should throw BadRequestException for invalid hour (25)', () => {
        expect(() => service.parseActivityTime('25:00 AM')).toThrow(
          BadRequestException,
        );
      });

      it('should throw BadRequestException for invalid minute (60)', () => {
        expect(() => service.parseActivityTime('9:60 AM')).toThrow(
          BadRequestException,
        );
      });

      it('should throw BadRequestException for hour above 23', () => {
        expect(() => service.parseActivityTime('24:30 AM')).toThrow(
          BadRequestException,
        );
      });

      it('should throw with descriptive error message', () => {
        expect(() => service.parseActivityTime('invalid')).toThrow(
          /Failed to parse time string/,
        );
      });
    });

    describe('minute boundary cases', () => {
      it('should handle :00 minutes', () => {
        const minutes = service.parseActivityTime('3:00 AM');
        expect(minutes).toBe(3 * 60);
      });

      it('should handle :01 minutes', () => {
        const minutes = service.parseActivityTime('3:01 AM');
        expect(minutes).toBe(3 * 60 + 1);
      });

      it('should handle :59 minutes', () => {
        const minutes = service.parseActivityTime('3:59 AM');
        expect(minutes).toBe(3 * 60 + 59);
      });
    });
  });

  describe('generateIdempotencyKey', () => {
    it('should create unique key per activity', () => {
      const key1 = service.generateIdempotencyKey('trip1', 0, 0);
      const key2 = service.generateIdempotencyKey('trip1', 0, 1);
      expect(key1).not.toBe(key2);
    });

    it('should create unique key per day', () => {
      const key1 = service.generateIdempotencyKey('trip1', 0, 0);
      const key2 = service.generateIdempotencyKey('trip1', 1, 0);
      expect(key1).not.toBe(key2);
    });

    it('should create unique key per trip', () => {
      const key1 = service.generateIdempotencyKey('trip1', 0, 0);
      const key2 = service.generateIdempotencyKey('trip2', 0, 0);
      expect(key1).not.toBe(key2);
    });

    it('should create same key for same inputs (idempotent)', () => {
      const key1 = service.generateIdempotencyKey('trip1', 0, 0);
      const key2 = service.generateIdempotencyKey('trip1', 0, 0);
      expect(key1).toBe(key2);
    });

    it('should format as tripId:dayIndex:activityIndex', () => {
      const key = service.generateIdempotencyKey('trip-abc', 2, 5);
      expect(key).toBe('trip-abc:2:5');
    });

    it('should handle numeric trip IDs', () => {
      const key = service.generateIdempotencyKey('trip123', 0, 0);
      expect(key).toBe('trip123:0:0');
    });

    it('should handle special characters in trip ID', () => {
      const key = service.generateIdempotencyKey('trip-123-abc_def', 1, 2);
      expect(key).toBe('trip-123-abc_def:1:2');
    });

    it('should handle zero indexes', () => {
      const key = service.generateIdempotencyKey('trip1', 0, 0);
      expect(key).toContain(':0:0');
    });

    it('should handle large indexes', () => {
      const key = service.generateIdempotencyKey('trip1', 99, 999);
      expect(key).toBe('trip1:99:999');
    });
  });

  describe('isActivityTime', () => {
    beforeEach(() => {
      jest.useFakeTimers();
    });

    afterEach(() => {
      jest.useRealTimers();
    });

    it('should return true if current time is past activity time', () => {
      // Mock current time to 10:00 AM local time
      const tenAm = new Date(2026, 4, 6, 10, 0, 0); // May 6, 2026, 10:00 AM
      jest.setSystemTime(tenAm.getTime());

      const result = service.isActivityTime('9:00 AM');
      expect(result).toBe(true);
    });

    it('should return false if activity time is in future', () => {
      const tenAm = new Date(2026, 4, 6, 10, 0, 0);
      jest.setSystemTime(tenAm.getTime());

      const result = service.isActivityTime('11:00 AM');
      expect(result).toBe(false);
    });

    it('should return true when current time equals activity time', () => {
      const tenAm = new Date(2026, 4, 6, 10, 0, 0);
      jest.setSystemTime(tenAm.getTime());

      const result = service.isActivityTime('10:00 AM');
      expect(result).toBe(true);
    });

    it('should handle midnight correctly', () => {
      const midnight = new Date(2026, 4, 6, 0, 0, 0);
      jest.setSystemTime(midnight.getTime());

      const result = service.isActivityTime('12:00 AM');
      expect(result).toBe(true);
    });

    it('should handle noon correctly', () => {
      const noon = new Date(2026, 4, 6, 12, 0, 0);
      jest.setSystemTime(noon.getTime());

      const result = service.isActivityTime('12:00 PM');
      expect(result).toBe(true);
    });

    it('should ignore date and only compare time-of-day', () => {
      // Current time: 10:00 AM
      const tenAm = new Date(2026, 4, 6, 10, 0, 0);
      jest.setSystemTime(tenAm.getTime());

      // This activity is from a past day but time hasn't passed today
      const result = service.isActivityTime('9:00 AM');
      expect(result).toBe(true);
    });

    it('should handle activity just before current time', () => {
      const tenThirtyAm = new Date(2026, 4, 6, 10, 30, 0);
      jest.setSystemTime(tenThirtyAm.getTime());

      const result = service.isActivityTime('10:00 AM');
      expect(result).toBe(true);
    });

    it('should handle activity in 24-hour format', () => {
      const twoPmThirty = new Date(2026, 4, 6, 14, 30, 0);
      jest.setSystemTime(twoPmThirty.getTime());

      const result = service.isActivityTime('13:00');
      expect(result).toBe(true);
    });

    it('should handle early morning activities', () => {
      const sixAm = new Date(2026, 4, 6, 6, 0, 0);
      jest.setSystemTime(sixAm.getTime());

      const resultBefore = service.isActivityTime('5:00 AM');
      const resultAfter = service.isActivityTime('7:00 AM');

      expect(resultBefore).toBe(true); // Past
      expect(resultAfter).toBe(false); // Future
    });

    it('should handle late night activities', () => {
      const tenThirtyPm = new Date(2026, 4, 6, 22, 30, 0);
      jest.setSystemTime(tenThirtyPm.getTime());

      const resultBefore = service.isActivityTime('10:00 PM');
      const resultAfter = service.isActivityTime('11:00 PM');

      expect(resultBefore).toBe(true); // Past
      expect(resultAfter).toBe(false); // Future
    });
  });

  describe('shouldLeaveNow', () => {
    beforeEach(() => {
      jest.useFakeTimers();
    });

    afterEach(() => {
      jest.useRealTimers();
    });

    it('should return true if current date-time is past activity date-time', () => {
      const now = new Date(2026, 4, 6, 10, 0, 0);
      jest.setSystemTime(now.getTime());

      const result = service.shouldLeaveNow('9:00 AM');
      expect(result).toBe(true);
    });

    it('should return false if activity date-time is in future', () => {
      const now = new Date(2026, 4, 6, 10, 0, 0);
      jest.setSystemTime(now.getTime());

      const result = service.shouldLeaveNow('11:00 AM');
      expect(result).toBe(false);
    });

    it('should consider date when provided', () => {
      jest.setSystemTime(new Date(2026, 4, 6, 10, 0, 0).getTime());

      // Activity is tomorrow at 9:00 AM
      const tomorrowAt9 = new Date(2026, 4, 7, 9, 0, 0);
      const result = service.shouldLeaveNow('9:00 AM', tomorrowAt9);
      expect(result).toBe(false); // Future
    });

    it('should use today when no date provided', () => {
      jest.setSystemTime(new Date(2026, 4, 6, 10, 0, 0).getTime());

      const result = service.shouldLeaveNow('9:00 AM', null);
      expect(result).toBe(true); // Today's 9 AM is in the past
    });

    it('should return true when time equals now', () => {
      const now = new Date(2026, 4, 6, 10, 0, 0);
      jest.setSystemTime(now.getTime());

      const result = service.shouldLeaveNow('10:00 AM');
      expect(result).toBe(true);
    });

    it('should handle different dates correctly', () => {
      jest.setSystemTime(new Date(2026, 4, 6, 20, 0, 0).getTime());

      // Yesterday at 9 AM should be past
      const yesterdayAt9 = new Date(2026, 4, 5, 9, 0, 0);
      const resultYesterday = service.shouldLeaveNow('9:00 AM', yesterdayAt9);
      expect(resultYesterday).toBe(true);

      // Tomorrow at 9 AM should be future
      const tomorrowAt9 = new Date(2026, 4, 7, 9, 0, 0);
      const resultTomorrow = service.shouldLeaveNow('9:00 AM', tomorrowAt9);
      expect(resultTomorrow).toBe(false);
    });

    it('should throw BadRequestException for invalid time string', () => {
      expect(() => service.shouldLeaveNow('invalid')).toThrow(
        BadRequestException,
      );
    });
  });

  describe('edge cases and integration', () => {
    it('should handle rapid sequential calls', () => {
      const times = Array.from({ length: 100 }, (_, i) =>
        service.generateIdempotencyKey('trip', 0, i),
      );
      expect(new Set(times).size).toBe(100); // All unique
    });

    it('should maintain consistency across multiple method calls', () => {
      const distance = 2000;
      const pace = 'packed';
      const mode = 'walking';

      const time1 = service.calculateTravelTime(distance, pace, mode);
      const time2 = service.calculateTravelTime(distance, pace, mode);

      expect(time1).toBe(time2);
    });

    it('should handle all valid transport modes', () => {
      const modes = ['walking', 'public_transit', 'taxi', 'car'];
      for (const mode of modes) {
        const time = service.calculateTravelTime(5000, 'no_plan', mode);
        expect(time).toBeGreaterThan(0);
      }
    });

    it('should handle all valid paces', () => {
      const paces = ['no_plan', 'loose', 'packed'];
      for (const pace of paces) {
        const time = service.calculateTravelTime(5000, pace, 'walking');
        expect(time).toBeGreaterThan(0);
      }
    });
  });
});
