export interface SearchDto {
  freeText?: string;
  destination?: string;
  mode: 'find' | 'plan';
  dates: { from: string; to: string };
  budget: { min: number; max: number };
  experienceTypes: string[];
  departureCity: string;
  group: { type: 'solo' | 'couple' | 'friends' | 'family' };
  gender?: string;
  age?: number;
  weight?: number;
  height?: number;
  medicalConditions?: string[];
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
  group: { type: string };
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
  group: { type: string };
  departureCity: string;
  freeText: string;
  spiceTolerance?: string;
  foodBudget?: string;
  allergies?: string[];
  cuisinePreferences?: string[];
}

export interface HealthAdvisory {
  suitability: string;
  altitude: string;
  physicalDemand: string;
  alerts: string[];
  prepTips: string[];
}

export interface CostBreakdown {
  transport: string;
  stay: string;
  food: string;
  activities: string;
  total: string;
}

export interface Permits {
  required: boolean;
  documents: string[];
  notes: string;
}

export interface TripReadiness {
  score: number;
  label: string;
  fitness: string;
  weather: string;
  documents: string;
  budget: string;
  actionItems: string[];
}

export interface SearchResultDestination {
  name: string;
  state: string;
  isHiddenGem: boolean;
  budgetEstimate: string;
  weatherSnapshot: string;
  travelTime: string;
  highlights: string[];
  whyItMatches: string;
  // Slim fields for free-tier models; expand when using paid model:
  suitability: string;
  readinessScore: number;
  // Personal match signal showing personality alignment
  personalMatch?: {
    level: 'great_match' | 'good_match' | 'heads_up' | 'not_your_style';
    reason: string;
  };
  // healthAdvisory?: HealthAdvisory;
  // costBreakdown?: CostBreakdown;
  // permits?: Permits;
  // tripReadiness?: TripReadiness;
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

export interface PlanConfirmedResponse {
  mode: 'plan_confirmed';
  destination: string;
  reasoning?: string;
}

export interface SearchResponse {
  mode: 'hybrid' | 'ai_full' | 'trek';
  results: SearchResultDestination[] | TrekResult[];
}

export type SearchResponseWithPlan = SearchResponse | PlanConfirmedResponse;
