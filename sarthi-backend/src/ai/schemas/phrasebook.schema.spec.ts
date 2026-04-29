import { phrasebookWrapperSchema } from './phrasebook.schema';

describe('phrasebookWrapperSchema', () => {
  const validPhrasebook = {
    result: {
      language: 'Khasi',
      greeting: [{ english: 'Hello', local: 'Khublei', pronunciation: 'khoo-blay' }],
      food: [{ english: 'How much?', local: 'Katno?', pronunciation: 'kat-no' }],
      directions: [{ english: 'Where is...?', local: 'Hangta dei?', pronunciation: 'hang-ta day' }],
      emergency: [{ english: 'Help!', local: 'Thaw bun!', pronunciation: 'thaw boon' }],
      bargaining: [{ english: 'Too expensive', local: 'Booh pynsit', pronunciation: 'boo pin-sit' }],
      culturalNotes: ['Khasi society is matrilineal — women are highly respected'],
    },
  };

  it('parses a valid phrasebook', () => {
    const result = phrasebookWrapperSchema.parse(validPhrasebook);
    expect(result.result.language).toBe('Khasi');
    expect(result.result.greeting[0].local).toBe('Khublei');
    expect(result.result.culturalNotes).toHaveLength(1);
  });

  it('allows optional script field', () => {
    const withScript = { result: { ...validPhrasebook.result, script: 'Latin' } };
    const result = phrasebookWrapperSchema.parse(withScript);
    expect(result.result.script).toBe('Latin');
  });

  it('defaults missing phrase categories to empty arrays', () => {
    const minimal = {
      result: {
        language: 'Khasi',
        greeting: [],
        food: [],
        directions: [],
        emergency: [],
        bargaining: [],
        culturalNotes: [],
      },
    };
    const result = phrasebookWrapperSchema.parse(minimal);
    expect(result.result.greeting).toEqual([]);
  });

  it('rejects a phrase missing english field', () => {
    const bad = {
      result: {
        ...validPhrasebook.result,
        greeting: [{ local: 'Khublei', pronunciation: 'khoo-blay' }],
      },
    };
    expect(() => phrasebookWrapperSchema.parse(bad)).toThrow();
  });
});
