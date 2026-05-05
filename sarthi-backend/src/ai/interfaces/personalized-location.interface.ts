export interface TravelerProfile {
  travelPace?: 'packed' | 'loose' | 'no_plan';
  travelMotivations?: string[];
  spendingStyle?: 'experience' | 'budget' | 'comfort';
  physicalReadiness?: 'yes' | 'maybe' | 'no';
  comfortLevel?: 'hotel' | 'homestay' | 'rough';
  depthVsBreadth?: 'deep' | 'balanced' | 'cover';
  crowdTolerance?: 'worth_it' | 'hidden' | 'avoid';
}

export interface NearbyPlace {
  name: string;
  type: string;
  distance: number;
}

export interface PersonalizedSuggestion {
  placeName: string;
  reasoning: string;
  distance: number;
  estimatedTime: number;
  confidence: number;
}
