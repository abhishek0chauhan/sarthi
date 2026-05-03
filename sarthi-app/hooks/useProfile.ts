import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { profileService } from '@/services/profile.service';
import { useAuth } from '@/hooks/useAuth';
import type { QuizDto, Correction } from '@/types/profile.types';

export function useProfile() {
  const { isAuthenticated } = useAuth();

  return useQuery({
    queryKey: ['profile'],
    queryFn: () => profileService.getProfile(),
    enabled: !!isAuthenticated,
    retry: 1,
    staleTime: 5 * 60 * 1000, // 5 minutes
  });
}

export function useSubmitStory(story: string) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: () => profileService.submitStory(story),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['profile'] });
    },
  });
}

export function useSubmitQuiz() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (dto: QuizDto) => profileService.submitQuiz(dto),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['profile'] });
    },
  });
}

export function useResetProfile() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: () => profileService.resetProfile(),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['profile'] });
    },
  });
}

export function useLogCorrection() {
  return useMutation({
    mutationFn: (dto: Correction) => profileService.logCorrection(dto),
  });
}
