export type TravelMode = 'train' | 'flight' | 'bus' | 'car';

export interface TripDates { from: string; to: string }

export interface ItineraryActivity {
  time: string;
  activity: string;
  cost: string;
  healthNote?: string;
  mapQuery?: string;
  placeContext?: import('./enrichment.types').PlaceContext;
}

export interface ItineraryMeals {
  breakfast: string;
  lunch: string;
  dinner: string;
}

export interface ItineraryDay {
  day: number;
  title: string;
  activities: ItineraryActivity[];
  meals: ItineraryMeals;
  healthNote?: string;
}

export interface ItineraryData {
  destination: string;
  totalEstimate: string;
  itinerary: ItineraryDay[];
  packingList: string[];
  permits?: { required: boolean; documents?: string[]; notes?: string };
  healthAdvisory: { suitability: string; altitude?: string; physicalDemand: string; alerts?: string[]; prepTips?: string[] };
  costBreakdown?: { transport: string; stay: string; food: string; activities: string; total: string };
  tripReadiness?: number;
  highlights?: string[];
}

export interface SavedTrip {
  id: string;
  name: string;
  destination: string;
  state: string;
  dates: TripDates;
  travelMode?: TravelMode;
  destinationData: Record<string, unknown>;
  itineraryData?: ItineraryData;
  foodGuideData?: Record<string, unknown>;
  phrasebookData?: import('./enrichment.types').PhrasebookData;
  shareToken?: string;
  createdAt: string;
  updatedAt: string;
}

export interface TripSummary {
  id: string;
  name: string;
  destination: string;
  state: string;
  dates: TripDates;
  travelMode?: TravelMode;
  hasItinerary: boolean;
  hasFoodGuide: boolean;
  createdAt: string;
}

export interface CreateTripDto {
  destination: string;
  state: string;
  dates: TripDates;
  destinationData: Record<string, unknown>;
  name?: string;
  travelMode?: TravelMode;
  itineraryData?: Record<string, unknown>;
  foodGuideData?: Record<string, unknown>;
}

export interface UpdateTripDto {
  name?: string;
  travelMode?: TravelMode;
  itineraryData?: Record<string, unknown>;
  foodGuideData?: Record<string, unknown>;
}

export interface ShareResult {
  shareToken: string;
  shareUrl: string;
}
