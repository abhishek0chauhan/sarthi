import { apiRequest } from './api';
import type { SavedTrip, ItineraryActivity } from '@/types/trip.types';
import type { PhrasebookData, ChatMessage, AddActivityDto, SwapActivityDto } from '@/types/enrichment.types';

export const enrichmentService = {
  enrichTrip: (tripId: string) =>
    apiRequest<SavedTrip>(`/saved-trips/${tripId}/enrich`, { method: 'POST' }),

  getPhrasebook: (tripId: string) =>
    apiRequest<PhrasebookData>(`/saved-trips/${tripId}/phrasebook`),

  generatePhrasebook: (tripId: string) =>
    apiRequest<PhrasebookData>(`/saved-trips/${tripId}/phrasebook`, { method: 'POST' }),

  getChatHistory: (tripId: string) =>
    apiRequest<ChatMessage[]>(`/saved-trips/${tripId}/chat`),

  sendChatMessage: (tripId: string, content: string) =>
    apiRequest<ChatMessage>(`/saved-trips/${tripId}/chat`, {
      method: 'POST',
      body: JSON.stringify({ message: content }),
    }),

  clearChat: (tripId: string) =>
    apiRequest<void>(`/saved-trips/${tripId}/chat`, { method: 'DELETE' }),

  removeActivity: (tripId: string, day: number, index: number) =>
    apiRequest<SavedTrip>(`/saved-trips/${tripId}/itinerary/day/${day}/activity/${index}`, {
      method: 'DELETE',
    }),

  addActivity: (tripId: string, day: number, dto: AddActivityDto) =>
    apiRequest<SavedTrip>(`/saved-trips/${tripId}/itinerary/day/${day}/activity`, {
      method: 'POST',
      body: JSON.stringify(dto),
    }),

  swapActivity: (tripId: string, day: number, index: number, dto: SwapActivityDto) =>
    apiRequest<SavedTrip>(`/saved-trips/${tripId}/itinerary/day/${day}/activity/${index}`, {
      method: 'PUT',
      body: JSON.stringify(dto),
    }),
};
