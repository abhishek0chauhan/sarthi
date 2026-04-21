import { generateText } from 'ai';
import type { LanguageModel } from 'ai';
import type { ZodSchema } from 'zod';

/**
 * Provider-agnostic structured-output helper.
 * Uses generateText + manual JSON parse + Zod validation so free models
 * (Gemma, etc.) that don't support tool-calling or strict JSON schema
 * still produce validated, typed output.
 */
export async function generateJson<T>(opts: {
  model: LanguageModel;
  schema: ZodSchema<T>;
  system: string;
  prompt: string;
}): Promise<T> {
  const { text } = await generateText({
    model: opts.model,
    system: `${opts.system}\n\nRespond with ONLY valid JSON matching the requested shape. No markdown fences, no prose, no explanations.`,
    prompt: opts.prompt,
  });

  // Strip markdown fences in case the model wraps JSON anyway
  const cleaned = text
    .trim()
    .replace(/^```(?:json)?\s*/i, '')
    .replace(/\s*```$/, '');

  let parsed: unknown;
  try {
    parsed = JSON.parse(cleaned);
  } catch {
    throw new Error(
      `AI returned invalid JSON. First 200 chars: ${cleaned.slice(0, 200)}`,
    );
  }

  return opts.schema.parse(parsed);
}
