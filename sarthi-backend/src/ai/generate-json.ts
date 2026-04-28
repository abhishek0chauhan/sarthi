import { generateText } from 'ai';
import type { LanguageModel } from 'ai';
import type { ZodSchema } from 'zod';

export async function generateJson<T>(opts: {
  model: LanguageModel;
  schema: ZodSchema<T>;
  system: string;
  prompt: string;
}): Promise<T> {
  const { text } = await generateText({
    model: opts.model,
    maxOutputTokens: 8192,
    system: `${opts.system}\n\nRespond with ONLY valid JSON. No markdown fences, no prose, no explanations.`,
    prompt: opts.prompt,
  });

  const cleaned = extractJson(text);

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

function extractJson(text: string): string {
  const trimmed = text.trim();

  // Strip markdown fences
  const fenced = trimmed.replace(/^```(?:json)?\s*/i, '').replace(/\s*```\s*$/i, '').trim();

  const start = Math.min(
    fenced.indexOf('{') === -1 ? Infinity : fenced.indexOf('{'),
    fenced.indexOf('[') === -1 ? Infinity : fenced.indexOf('['),
  );

  if (start === Infinity) return fenced;

  return extractOrRepair(fenced, start);
}

function extractOrRepair(text: string, start: number): string {
  const stack: string[] = [];
  let inString = false;
  let escape = false;

  for (let i = start; i < text.length; i++) {
    const ch = text[i];
    if (escape) { escape = false; continue; }
    if (ch === '\\' && inString) { escape = true; continue; }
    if (ch === '"') { inString = !inString; continue; }
    if (inString) continue;
    if (ch === '{' || ch === '[') stack.push(ch === '{' ? '}' : ']');
    else if (ch === '}' || ch === ']') {
      stack.pop();
      if (stack.length === 0) {
        const complete = text.slice(start, i + 1);
        // Even a "complete" response might have trailing commas from the model
        return sanitize(complete);
      }
    }
  }

  // ── Truncated response — repair ───────────────────────────────────────────
  let repaired = text.slice(start);

  // Close any unclosed string literal
  if (inString) repaired += '"';

  // Strip trailing incomplete key-value fragments before closing brackets:
  //   ,"key": partial_value   (unquoted partial: numbers, booleans)
  //   ,"key":                 (colon with no value)
  //   ,"key"                  (key with no colon)
  //   ,                       (bare trailing comma)
  repaired = repaired.replace(/,\s*"[^"]*"\s*:\s*[^,{[\]}"]*$/, '');
  repaired = repaired.replace(/,\s*"[^"]*"\s*:\s*$/, '');
  repaired = repaired.replace(/,\s*"[^"]*"\s*$/, '');
  repaired = repaired.replace(/,\s*$/, '');

  // Close all open brackets/braces in reverse stack order
  while (stack.length > 0) repaired += stack.pop()!;

  return sanitize(repaired);
}

// Remove trailing commas inside objects/arrays — models sometimes emit them,
// and JSON.parse rejects them even though the overall structure is valid.
function sanitize(json: string): string {
  return json.replace(/,(\s*[}\]])/g, '$1');
}
