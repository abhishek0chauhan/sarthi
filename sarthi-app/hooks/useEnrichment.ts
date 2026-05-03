import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { enrichmentService } from '@/services/enrichment.service';
import type { AddActivityDto, SwapActivityDto } from '@/types/enrichment.types';

export function usePhrasebook(tripId: string) {
  return useQuery({
    queryKey: ['phrasebook', tripId],
    queryFn: () => enrichmentService.getPhrasebook(tripId),
    enabled: !!tripId,
    retry: false,
  });
}

export function useGeneratePhrasebook(tripId: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: () => enrichmentService.generatePhrasebook(tripId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['phrasebook', tripId] });
    },
  });
}

export function useChatHistory(tripId: string) {
  return useQuery({
    queryKey: ['chat', tripId],
    queryFn: () => enrichmentService.getChatHistory(tripId),
    enabled: !!tripId,
  });
}

export function useSendChatMessage(tripId: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (content: string) => enrichmentService.sendChatMessage(tripId, content),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['chat', tripId] });
    },
  });
}

export function useEnrichTrip(tripId: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: () => enrichmentService.enrichTrip(tripId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['trip', tripId] });
    },
  });
}

export function useRemoveActivity(tripId: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ day, index }: { day: number; index: number }) =>
      enrichmentService.removeActivity(tripId, day, index),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['trip', tripId] });
    },
  });
}

export function useAddActivity(tripId: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ day, dto }: { day: number; dto: AddActivityDto }) =>
      enrichmentService.addActivity(tripId, day, dto),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['trip', tripId] });
    },
  });
}

export function useSwapActivity(tripId: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ day, index, dto }: { day: number; index: number; dto: SwapActivityDto }) =>
      enrichmentService.swapActivity(tripId, day, index, dto),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['trip', tripId] });
    },
  });
}
