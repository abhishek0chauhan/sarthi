export interface TravelerProfile {
  id: string;
  story?: string;
  travelPace?: 'packed' | 'loose' | 'no_plan';
  depthVsBreadth?: 'deep' | 'balanced' | 'cover';
  comfortLevel?: 'hotel' | 'homestay' | 'rough';
  crowdTolerance?: 'worth_it' | 'hidden' | 'avoid';
  travelMotivations?: string[];
  physicalReadiness?: 'yes' | 'maybe' | 'no';
  spendingStyle?: 'experience' | 'budget' | 'comfort';
  groundReality?: 'bring_it' | 'tolerate' | 'need_comfort';
  languageComfort?: 'fine' | 'hindi' | 'english';
  completeness: number;
}

export type QuizDto = Omit<TravelerProfile, 'id' | 'story' | 'completeness'>;

export interface StoryResponse {
  profile: TravelerProfile;
  confidence: number;
}

export interface Correction {
  tripId: string;
  type: 'removed_place' | 'added_place' | 'swapped_place' | 'thumbs_down' | 'thumbs_up';
  context: Record<string, unknown>;
}
