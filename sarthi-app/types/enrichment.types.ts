export interface PlaceContext {
  whySpecial: string;
  bestTimeToVisit: string;
  suggestedDuration: string;
  insiderTips: string[];
  whatToCarry: string[];
  nearbyAlternative?: string;
}

export interface DishContext {
  bestTimeToVisit: string;
  insiderTips: string[];
}

export interface Phrase {
  english: string;
  local: string;
  pronunciation: string;
}

export interface PhrasebookData {
  language: string;
  script?: string;
  greeting: Phrase[];
  food: Phrase[];
  directions: Phrase[];
  emergency: Phrase[];
  bargaining: Phrase[];
  culturalNotes: string[];
}

export interface ChatMessage {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  createdAt: string;
}

export interface AddActivityDto {
  time: string;
  activity: string;
  cost?: string;
  position?: number;
}

export interface SwapActivityDto {
  time: string;
  activity: string;
  cost?: string;
  healthNote?: string;
}

export interface Correction {
  tripId: string;
  type: 'thumbs_up' | 'thumbs_down' | 'removed_place' | 'added_place' | 'swapped_place';
  context: Record<string, unknown>;
}
