import { buildTripChatSystem } from './trip-chat.prompt';

describe('buildTripChatSystem', () => {
  const tripContext = {
    destination: 'Cherrapunji',
    state: 'Meghalaya',
    dates: { from: '2026-07-10', to: '2026-07-13' },
    itinerarySummary:
      'Day 1: Living Root Bridge, Elephant Falls. Day 2: Dawki.',
  };

  it('returns a system prompt string', () => {
    const system = buildTripChatSystem(tripContext);
    expect(typeof system).toBe('string');
    expect(system.length).toBeGreaterThan(50);
  });

  it('includes destination in the system prompt', () => {
    const system = buildTripChatSystem(tripContext);
    expect(system).toContain('Cherrapunji');
  });

  it('includes itinerary summary when provided', () => {
    const system = buildTripChatSystem(tripContext);
    expect(system).toContain('Living Root Bridge');
  });

  it('includes personality block when profile is provided', () => {
    const system = buildTripChatSystem({
      ...tripContext,
      profile: { travelPace: 'loose', completeness: 11 },
    });
    expect(system).toContain('Traveler Personality');
  });

  it('works without optional fields', () => {
    const system = buildTripChatSystem({ destination: 'Goa', state: 'Goa' });
    expect(system).toContain('Goa');
  });
});
