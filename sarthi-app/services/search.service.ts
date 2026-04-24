import { apiRequest } from './api';
import type { SearchDto, ItineraryDto, FoodGuideDto, SearchResponse } from '@/types/search.types';
import type { ItineraryData } from '@/types/trip.types';
import type { FoodGuideData } from '@/types/food.types';

export const searchService = {
  search: (dto: SearchDto) =>
    apiRequest<SearchResponse>('/destination-finder/search', { method: 'POST', body: JSON.stringify(dto) }),

  itinerary: (dto: ItineraryDto) =>
    apiRequest<ItineraryData>('/destination-finder/itinerary', { method: 'POST', body: JSON.stringify(dto) }),

  foodGuide: (dto: FoodGuideDto) =>
    apiRequest<FoodGuideData>('/destination-finder/food-guide', { method: 'POST', body: JSON.stringify(dto) }),
};
