import { z } from 'zod';

const phraseSchema = z.object({
  english: z.string(),
  local: z.string(),
  pronunciation: z.string(),
});

export const phrasebookSchema = z.object({
  language: z.string(),
  script: z.string().optional(),
  greeting: z.array(phraseSchema).default([]),
  food: z.array(phraseSchema).default([]),
  directions: z.array(phraseSchema).default([]),
  emergency: z.array(phraseSchema).default([]),
  bargaining: z.array(phraseSchema).default([]),
  culturalNotes: z.array(z.string()).default([]),
});

export const phrasebookWrapperSchema = z.object({
  result: phrasebookSchema,
});

export type Phrasebook = z.infer<typeof phrasebookSchema>;
