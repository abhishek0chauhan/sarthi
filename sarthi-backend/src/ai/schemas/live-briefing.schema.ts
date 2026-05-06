import { z } from 'zod';

export const liveBriefingSchema = z.object({
  briefing: z.string(),
  pushSummary: z.string().max(160),
});

export const liveBriefingWrapperSchema = z.object({
  result: liveBriefingSchema,
});

export type LiveBriefing = z.infer<typeof liveBriefingSchema>;
