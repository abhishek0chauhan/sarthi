import { z } from 'zod';

const clampedConfidence = z.preprocess(
  (v) => Math.min(100, Math.max(0, Number(v) || 0)),
  z.number().min(0).max(100),
);

export const profileExtractionSchema = z.object({
  travelPace:        z.enum(['packed', 'loose', 'no_plan']).optional(),
  depthVsBreadth:    z.enum(['deep', 'balanced', 'cover']).optional(),
  comfortLevel:      z.enum(['hotel', 'homestay', 'rough']).optional(),
  crowdTolerance:    z.enum(['worth_it', 'hidden', 'avoid']).optional(),
  travelMotivations: z.array(z.string()).default([]),
  physicalReadiness: z.enum(['yes', 'maybe', 'no']).optional(),
  spendingStyle:     z.enum(['experience', 'budget', 'comfort']).optional(),
  groundReality:     z.enum(['bring_it', 'tolerate', 'need_comfort']).optional(),
  languageComfort:   z.enum(['fine', 'hindi', 'english']).optional(),
  confidence:        clampedConfidence,
});

export const profileExtractionWrapperSchema = z.object({
  result: profileExtractionSchema,
});

export type ProfileExtraction = z.infer<typeof profileExtractionSchema>;
