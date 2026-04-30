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
})
