import { z } from 'zod';
import { activityPlaceContextSchema } from './destination.schema';

export const enrichmentContextArraySchema = z.array(activityPlaceContextSchema);

export type EnrichmentContext = z.infer<typeof enrichmentContextArraySchema>;
