import { apiRequest } from './api';
import type { TravelerProfile, QuizDto, StoryResponse, Correction } from '@/types/profile.types';

export const profileService = {
  getProfile: () => apiRequest<TravelerProfile>('/profile'),

  submitStory: (story: string) =>
    apiRequest<StoryResponse>('/profile/story', {
      method: 'POST',
      body: JSON.stringify({ story }),
    }),

  submitQuiz: (dto: QuizDto) =>
    apiRequest<TravelerProfile>('/profile/quiz', {
      method: 'PUT',
      body: JSON.stringify(dto),
    }),

  getQuizPrefill: () => apiRequest<QuizDto>('/profile/quiz-prefill'),

  resetProfile: () => apiRequest<void>('/profile', { method: 'DELETE' }),

  logCorrection: (dto: Correction) =>
    apiRequest<void>('/corrections', {
      method: 'POST',
      body: JSON.stringify(dto),
    }),
};
