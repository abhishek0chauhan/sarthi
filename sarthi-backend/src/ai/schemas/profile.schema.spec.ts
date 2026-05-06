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
    expect(() =>
      profileExtractionSchema.parse({ confidence: 50, travelPace: 'fast' }),
    ).toThrow();
  });

  it('defaults travelMotivations to empty array', () => {
    const result = profileExtractionSchema.parse({ confidence: 40 });
    expect(result.travelMotivations).toEqual([]);
  });
});
