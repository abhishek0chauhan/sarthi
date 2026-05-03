import {
  PlaceContext,
  DishContext,
  Phrase,
  PhrasebookData,
  ChatMessage,
  AddActivityDto,
  SwapActivityDto,
} from '@/types/enrichment.types';

describe('Enrichment Types', () => {
  describe('PlaceContext', () => {
    it('should have required fields', () => {
      const placeContext: PlaceContext = {
        whySpecial: 'This place is special',
        bestTimeToVisit: 'Morning',
        suggestedDuration: '2 hours',
        insiderTips: ['Tip 1', 'Tip 2'],
        whatToCarry: ['Water', 'Sunscreen'],
      };
      expect(placeContext.whySpecial).toBeDefined();
      expect(placeContext.bestTimeToVisit).toBeDefined();
      expect(placeContext.suggestedDuration).toBeDefined();
      expect(placeContext.insiderTips).toBeDefined();
      expect(placeContext.whatToCarry).toBeDefined();
    });

    it('should allow optional nearbyAlternative field', () => {
      const placeContext: PlaceContext = {
        whySpecial: 'Special',
        bestTimeToVisit: 'Morning',
        suggestedDuration: '2 hours',
        insiderTips: [],
        whatToCarry: [],
        nearbyAlternative: 'Alternative place',
      };
      expect(placeContext.nearbyAlternative).toBe('Alternative place');
    });
  });

  describe('DishContext', () => {
    it('should have required fields', () => {
      const dishContext: DishContext = {
        bestTimeToVisit: 'Lunch time',
        insiderTips: ['Try it fresh'],
      };
      expect(dishContext.bestTimeToVisit).toBeDefined();
      expect(dishContext.insiderTips).toBeDefined();
    });
  });

  describe('Phrase', () => {
    it('should have english, local, and pronunciation fields', () => {
      const phrase: Phrase = {
        english: 'Hello',
        local: 'Namaste',
        pronunciation: 'nah-mah-stay',
      };
      expect(phrase.english).toBe('Hello');
      expect(phrase.local).toBe('Namaste');
      expect(phrase.pronunciation).toBe('nah-mah-stay');
    });
  });

  describe('PhrasebookData', () => {
    it('should have required fields and phrase arrays', () => {
      const phrasebook: PhrasebookData = {
        language: 'Hindi',
        greeting: [],
        food: [],
        directions: [],
        emergency: [],
        bargaining: [],
        culturalNotes: [],
      };
      expect(phrasebook.language).toBe('Hindi');
      expect(Array.isArray(phrasebook.greeting)).toBe(true);
      expect(Array.isArray(phrasebook.food)).toBe(true);
    });

    it('should allow optional script field', () => {
      const phrasebook: PhrasebookData = {
        language: 'Hindi',
        script: 'Devanagari',
        greeting: [],
        food: [],
        directions: [],
        emergency: [],
        bargaining: [],
        culturalNotes: [],
      };
      expect(phrasebook.script).toBe('Devanagari');
    });
  });

  describe('ChatMessage', () => {
    it('should have id, role, content, and createdAt fields', () => {
      const message: ChatMessage = {
        id: '1',
        role: 'user',
        content: 'What should I eat?',
        createdAt: new Date().toISOString(),
      };
      expect(message.id).toBe('1');
      expect(message.role).toBe('user');
      expect(message.content).toBe('What should I eat?');
      expect(message.createdAt).toBeDefined();
    });

    it('should support assistant role', () => {
      const message: ChatMessage = {
        id: '2',
        role: 'assistant',
        content: 'Try the local curry',
        createdAt: new Date().toISOString(),
      };
      expect(message.role).toBe('assistant');
    });
  });

  describe('AddActivityDto', () => {
    it('should have time and activity fields', () => {
      const dto: AddActivityDto = {
        time: '09:00',
        activity: 'Visit temple',
      };
      expect(dto.time).toBe('09:00');
      expect(dto.activity).toBe('Visit temple');
    });

    it('should allow optional cost and position fields', () => {
      const dto: AddActivityDto = {
        time: '09:00',
        activity: 'Visit temple',
        cost: '500',
        position: 0,
      };
      expect(dto.cost).toBe('500');
      expect(dto.position).toBe(0);
    });
  });

  describe('SwapActivityDto', () => {
    it('should have time and activity fields', () => {
      const dto: SwapActivityDto = {
        time: '14:00',
        activity: 'Lunch at restaurant',
      };
      expect(dto.time).toBe('14:00');
      expect(dto.activity).toBe('Lunch at restaurant');
    });

    it('should allow optional cost and healthNote fields', () => {
      const dto: SwapActivityDto = {
        time: '14:00',
        activity: 'Lunch at restaurant',
        cost: '800',
        healthNote: 'Vegetarian options available',
      };
      expect(dto.cost).toBe('800');
      expect(dto.healthNote).toBe('Vegetarian options available');
    });
  });
});
