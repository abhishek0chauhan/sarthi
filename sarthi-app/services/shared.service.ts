import { apiRequest } from './api';
import type { SavedTrip } from '@/types/trip.types';

export const sharedService = {
  getByToken: (token: string) => apiRequest<SavedTrip>(`/shared-trips/${token}`),
};
