import { liveBriefingSchema } from './live-briefing.schema';

describe('liveBriefingSchema', () => {
  it('parses valid briefing', () => {
    const result = liveBriefingSchema.parse({ briefing: 'Good morning!', pushSummary: 'Day 2 in Meghalaya' });
    expect(result.briefing).toBe('Good morning!');
    expect(result.pushSummary).toBe('Day 2 in Meghalaya');
  });

  it('rejects pushSummary over 160 chars', () => {
    expect(() =>
      liveBriefingSchema.parse({ briefing: 'hi', pushSummary: 'x'.repeat(161) })
    ).toThrow();
  });
})
