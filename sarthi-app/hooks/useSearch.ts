import { useMutation } from '@tanstack/react-query';
import { searchService } from '@/services/search.service';
import type { SearchDto, ItineraryDto, FoodGuideDto } from '@/types/search.types';

export function useSearchDestinations() {
  return useMutation({ mutationFn: (dto: SearchDto) => searchService.search(dto) });
}

export function useGenerateItinerary() {
  return useMutation({ mutationFn: (dto: ItineraryDto) => searchService.itinerary(dto) });
}

export function useGenerateFoodGuide() {
  return useMutation({ mutationFn: (dto: FoodGuideDto) => searchService.foodGuide(dto) });
}
