export type TravelMode = 'train' | 'flight' | 'bus' | 'car';

export interface TripDates { from: string; to: string }

export interface ItineraryActivity {
  time: string;
  activity: string;
  cost?: string;
  healthNote?: string;
}

export interface ItineraryDay {
  day: number;
  title: string;
  activities: ItineraryActivity[];
  dayTotal?: string;
}

export interface ItineraryData {
  days: ItineraryDay[];
  costBreakdown: { transport: string; stay: string; food: string; activities: string; total: string };
  packingList: string[];
  permits?: { required: boolean; details?: string; estimatedCost?: string };
  healthAdvisory: { suitability: string; physicalDemand: string; considerations: string[]; recommendations: string[] };
  tripReadiness?: number;   // 0–100, populated by backend in future
  highlights?: string[];    // key highlights for the destination
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
