import { z } from 'zod';

export const personalizedSuggestionSchema = z.object({
  placeName: z.string(),
  reasoning: z.string(),
  distance: z.number(),
  estimatedTime: z.number(),
  confidence: z.number(),
});

export const personalizedSuggestionWrapperSchema = z.object({
  result: personalizedSuggestionSchema,
});

export type PersonalizedSuggestion = z.infer<typeof personalizedSuggestionSchema>;
