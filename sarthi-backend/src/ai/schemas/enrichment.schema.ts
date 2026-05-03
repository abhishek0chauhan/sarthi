import { z } from 'zod';

export const enrichmentContextSchema = z.object({
  whySpecial: z.string().optional().default(''),
  bestTimeToVisit: z.string().optional().default(''),
  suggestedDuration: z.string().optional().default(''),
  insiderTips: z.array(z.string()).optional().default([]),
  whatToCarry: z.array(z.string()).optional().default([]),
  nearbyAlternative: z.string().optional(),
}).optional();

export const enrichmentWrapperSchema = z.object({
  contexts: z.array(enrichmentContextSchema),
});

export type EnrichmentContext = z.infer<typeof enrichmentContextSchema>;
export type EnrichmentWrapper = z.infer<typeof enrichmentWrapperSchema>;
