import { apiRequest } from './api';
import type { SavedTrip, TripSummary, CreateTripDto, UpdateTripDto, ShareResult } from '@/types/trip.types';
import type { ActivityScheduleEntry } from '@/types/live-guide.types';

export const tripsService = {
  list: () => apiRequest<TripSummary[]>('/saved-trips'),
  getById: (id: string) => apiRequest<SavedTrip>(`/saved-trips/${id}`),
  create: (dto: CreateTripDto) =>
    apiRequest<SavedTrip>('/saved-trips', { method: 'POST', body: JSON.stringify(dto) }),
  update: (id: string, dto: UpdateTripDto) =>
    apiRequest<SavedTrip>(`/saved-trips/${id}`, { method: 'PATCH', body: JSON.stringify(dto) }),
  remove: (id: string) =>
    apiRequest<void>(`/saved-trips/${id}`, { method: 'DELETE' }),
  enableSharing: (id: string) =>
    apiRequest<ShareResult>(`/saved-trips/${id}/share`, { method: 'POST' }),
  disableSharing: (id: string) =>
    apiRequest<void>(`/saved-trips/${id}/share`, { method: 'DELETE' }),
  getActivitySchedule: (tripId: string) =>
    apiRequest<{ scheduledActivities: ActivityScheduleEntry[] }>(`/live-guide/${tripId}/activity-schedule`),
};
