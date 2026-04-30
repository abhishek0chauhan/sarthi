import { z } from 'zod';

const replanActivitySchema = z.object({
  time: z.string().optional().default(''),
  activity: z.string(),
  cost: z.string().optional().default(''),
  healthNote: z.string().optional().default(''),
  mapQuery: z.string().optional().default(''),
  dropped: z.boolean().optional().default(false),
});

export const liveReplanSchema = z.object({
  activities: z.array(replanActivitySchema),
});

export const liveReplanWrapperSchema = z.object({ result: liveReplanSchema });

export type ReplanActivity = z.infer<typeof replanActivitySchema>;
export type LiveReplan = z.infer<typeof liveReplanSchema>;
