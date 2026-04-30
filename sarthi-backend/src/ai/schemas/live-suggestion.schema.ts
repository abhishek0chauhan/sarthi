import { z } from 'zod';

export const liveSuggestionSchema = z.object({
  suggestion: z.string(),
  placeName: z.string(),
  mapQuery: z.string().optional().default(''),
  pushSummary: z.string().max(160),
});

export const liveSuggestionWrapperSchema = z.object({ result: liveSuggestionSchema });

export type LiveSuggestion = z.infer<typeof liveSuggestionSchema>;
