import { TrekService } from './trek.service';

describe('TrekService', () => {
  let service: TrekService;

  beforeEach(() => {
    service = new TrekService();
  });

  describe('getAll', () => {
    it('returns all treks', () => {
      const treks = service.getAll();
      expect(treks.length).toBeGreaterThan(90);
      expect(treks[0]).toHaveProperty('name');
      expect(treks[0]).toHaveProperty('peakAltitude');
    });
  });

  describe('isTrekkingIntent', () => {
    it('returns true when experienceTypes includes trekking', () => {
      expect(service.isTrekkingIntent(['trekking'], '')).toBe(true);
    });

    it('returns false when experienceTypes includes only adventure (not a trek keyword)', () => {
      expect(service.isTrekkingIntent(['adventure'], '')).toBe(false);
    });

    it('returns true when experienceTypes includes hiking', () => {
      expect(service.isTrekkingIntent(['hiking'], '')).toBe(true);
    });

    it('returns true when freeText mentions trek', () => {
      expect(
        service.isTrekkingIntent(['nature'], 'want to do a challenging trek'),
      ).toBe(true);
    });

    it('returns true when freeText mentions hike', () => {
      expect(service.isTrekkingIntent([], 'looking for a mountain hike')).toBe(
        true,
      );
    });

    it('returns true when freeText mentions summit', () => {
      expect(service.isTrekkingIntent([], 'want to reach a summit')).toBe(true);
    });

    it('returns false for beach vacation', () => {
      expect(
        service.isTrekkingIntent(['beach'], 'relaxing beach vacation'),
      ).toBe(false);
    });

    it('returns false for culture trip', () => {
      expect(
        service.isTrekkingIntent(['culture', 'food'], 'explore temples'),
      ).toBe(false);
    });
  });

  describe('filterTreks', () => {
    it('filters by travel month', () => {
      const result = service.filterTreks({ month: 1 });
      result.forEach((t) => expect(t.bestMonths).toContain(1));
    });

    it('filters by max duration', () => {
      const result = service.filterTreks({ maxDays: 5 });
      result.forEach((t) => expect(t.durationDays).toBeLessThanOrEqual(5));
    });

    it('filters by difficulty levels', () => {
      const result = service.filterTreks({
        difficulties: ['easy', 'easy_to_moderate'],
      });
      result.forEach((t) =>
        expect(['easy', 'easy_to_moderate']).toContain(t.difficulty),
      );
    });

    it('filters by state', () => {
      const result = service.filterTreks({ state: 'Uttarakhand' });
      result.forEach((t) => expect(t.state).toBe('Uttarakhand'));
    });

    it('combines multiple filters', () => {
      const result = service.filterTreks({
        month: 6,
        maxDays: 7,
        state: 'Himachal Pradesh',
      });
      result.forEach((t) => {
        expect(t.bestMonths).toContain(6);
        expect(t.durationDays).toBeLessThanOrEqual(7);
        expect(t.state).toBe('Himachal Pradesh');
      });
    });

    it('returns all treks when no filters applied', () => {
      const all = service.getAll();
      const filtered = service.filterTreks({});
      expect(filtered.length).toBe(all.length);
    });
  });

  describe('filterForSearch', () => {
    it('filters by date range month and duration', () => {
      const result = service.filterForSearch({
        dates: { from: '2026-06-01', to: '2026-06-08' },
      });
      result.forEach((t) => {
        expect(t.bestMonths).toContain(6);
        expect(t.durationDays).toBeLessThanOrEqual(8);
      });
    });

    it('suggests easier treks for users with medical conditions', () => {
      const result = service.filterForSearch({
        dates: { from: '2026-06-01', to: '2026-06-15' },
        medicalConditions: ['knee_issue'],
      });
      result.forEach((t) => {
        expect(['easy', 'easy_to_moderate', 'moderate']).toContain(
          t.difficulty,
        );
      });
    });

    it('suggests easier treks for seniors (age >= 55)', () => {
      const result = service.filterForSearch({
        dates: { from: '2026-06-01', to: '2026-06-15' },
        age: 60,
      });
      result.forEach((t) => {
        expect(['easy', 'easy_to_moderate', 'moderate']).toContain(
          t.difficulty,
        );
      });
    });

    it('allows all difficulties for young fit users', () => {
      const result = service.filterForSearch({
        dates: { from: '2026-06-01', to: '2026-06-15' },
        age: 25,
      });
      const difficulties = new Set(result.map((t) => t.difficulty));
      expect(difficulties.size).toBeGreaterThan(1);
    });

    it('caps results at 20', () => {
      const result = service.filterForSearch({
        dates: { from: '2026-10-01', to: '2026-10-30' },
      });
      expect(result.length).toBeLessThanOrEqual(20);
    });
  });
});
