import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { tripsService } from '@/services/trips.service';
import type { CreateTripDto, UpdateTripDto } from '@/types/trip.types';
import type { ActivityScheduleEntry } from '@/types/live-guide.types';

export function useTrips() {
  return useQuery({ queryKey: ['trips'], queryFn: tripsService.list });
}

export function useTrip(id: string) {
  return useQuery({
    queryKey: ['trip', id],
    queryFn: () => tripsService.getById(id),
    enabled: !!id,
  });
}

export function useCreateTrip() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (dto: CreateTripDto) => tripsService.create(dto),
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ['trips'] }); },
  });
}

export function useUpdateTrip(id: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (dto: UpdateTripDto) => tripsService.update(id, dto),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['trips'] });
      queryClient.invalidateQueries({ queryKey: ['trip', id] });
    },
  });
}

export function useDeleteTrip() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => tripsService.remove(id),
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ['trips'] }); },
  });
}

export function useEnableSharing(id: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: () => tripsService.enableSharing(id),
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ['trip', id] }); },
  });
}

export function useDisableSharing(id: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: () => tripsService.disableSharing(id),
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ['trip', id] }); },
  });
}

export function useActivitySchedule(tripId: string, enabled: boolean) {
  return useQuery({
    queryKey: ['activity-schedule', tripId],
    queryFn: () => tripsService.getActivitySchedule(tripId),
    enabled: !!tripId && enabled,
    staleTime: 60_000,
    select: (data) => data.scheduledActivities,
  });
}
