export interface SearchDto {
  freeText: string;
  dates: { from: string; to: string };
  budget: { min: number; max: number };
  experienceTypes: string[];
  departureCity: string;
  group: { size: number; type: 'solo' | 'couple' | 'friends' | 'family' };
  gender?: string;
  age?: number;
  weight?: number;
  height?: number;
  medicalConditions?: string[];
  dietType?: string;
  spiceTolerance?: string;
  foodBudget?: string;
  allergies?: string[];
  hiddenGem?: boolean;
}

export interface ItineraryDto {
  destination: string;
  state: string;
  dates: { from: string; to: string };
  budget: { min: number; max: number };
  group: { size: number; type: string };
  departureCity: string;
  freeText: string;
  travelMode?: string;
  gender?: string;
  age?: number;
  weight?: number;
  height?: number;
  medicalConditions?: string[];
}

export interface FoodGuideDto {
  destination: string;
  state: string;
  dates: { from: string; to: string };
  group: { size: number; type: string };
  departureCity: string;
  freeText: string;
  dietType?: string;
  spiceTolerance?: string;
  foodBudget?: string;
  allergies?: string[];
  cuisinePreferences?: string[];
}

export interface HealthAdvisory {
  suitability: string;
  physicalDemand: string;
  considerations: string[];
  recommendations: string[];
}

export interface TripReadiness {
  score: number;
  breakdown: { weather: number; budget: number; accessibility: number; safety: number };
  tips: string[];
}

export interface SearchResultDestination {
  name: string;
  state: string;
  whyItMatches: string;
  budgetEstimate: string;
  weatherNow: string;
  travelTime: string;
  healthAdvisory: HealthAdvisory;
  tripReadiness: TripReadiness;
  isHiddenGem: boolean;
  highlights: string[];
}

export interface TrekResult {
  name: string;
  region: string;
  state: string;
  altitude: string;
  difficulty: string;
  duration: string;
  terrain: string;
  whyItMatches: string;
  bestMonths: string[];
  highlights: string[];
  healthAdvisory: HealthAdvisory;
}

export interface SearchResponse {
  destinations?: SearchResultDestination[];
  treks?: TrekResult[];
  isTrekMode: boolean;
}
