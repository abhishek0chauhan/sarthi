import { Injectable, Logger } from '@nestjs/common';
import { createOpenAICompatible } from '@ai-sdk/openai-compatible';
import { generateJson } from './generate-json';
import {
  rankResultsSchema,
  generateResultsSchema,
  itineraryResponseWrapperSchema,
  foodGuideResponseWrapperSchema,
  trekResultsSchema,
} from './schemas/destination.schema';
import type {
  RankResult,
  GenerateResult,
  ItineraryResponse,
  FoodGuideResponse,
  TrekResult,
} from './schemas/destination.schema';

// Custom fetch with longer timeout for NVIDIA API (free tier can queue for 3+ minutes)
const nvidiaFetch = (url: string, init?: RequestInit) => {
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), 180000); // 3 minutes

  // Respect SDK's own abort signal (e.g. retries, cancellation) alongside our timeout
  const sdkSignal = init?.signal as AbortSignal | undefined;
  if (sdkSignal) {
    if (sdkSignal.aborted) {
      controller.abort();
    } else {
      sdkSignal.addEventListener('abort', () => controller.abort(), { once: true });
    }
  }

  return fetch(url, {
    ...init,
    signal: controller.signal,
  }).finally(() => clearTimeout(timeoutId));
};

const nvidia = createOpenAICompatible({
  name: 'nvidia',
  baseURL: 'https://integrate.api.nvidia.com/v1',
  apiKey: process.env.NVIDIA_API_KEY,
  fetch: nvidiaFetch,
});

// Gemini via OpenAI-compatible endpoint — fast, no custom timeout needed
const gemini = createOpenAICompatible({
  name: 'gemini',
  baseURL: 'https://generativelanguage.googleapis.com/v1beta/openai',
  apiKey: process.env.GEMINI_API_KEY,
});

const AI_PROVIDER = (process.env.AI_PROVIDER ?? 'nvidia').toLowerCase();
const NVIDIA_MODEL_ID = 'google/gemma-3n-e2b-it';
const GEMINI_MODEL_ID = 'gemini-2.0-flash';

@Injectable()
export class AiService {
  private readonly logger = new Logger(AiService.name);
  private readonly model =
    AI_PROVIDER === 'gemini'
      ? gemini(GEMINI_MODEL_ID)
      : nvidia(NVIDIA_MODEL_ID);

  constructor() {
    const modelId = AI_PROVIDER === 'gemini' ? GEMINI_MODEL_ID : NVIDIA_MODEL_ID;
    this.logger.log(`AI provider: ${AI_PROVIDER} (model: ${modelId})`);
  }

  async rankDestinations(
    prompt: { system: string; user: string },
    shortlistIds: string[],
  ): Promise<RankResult[]> {
    const result = await generateJson({
      model: this.model,
      schema: rankResultsSchema,
      system: prompt.system,
      prompt: prompt.user,
    });

    const rankings = result?.rankings ?? [];
    if (rankings.length === 0) {
      this.logger.warn('AI returned empty array in rankDestinations');
      return [];
    }

    return rankings.filter(item => shortlistIds.includes(item.id)).slice(0, 5);
  }

  async generateDestinations(
    prompt: { system: string; user: string },
  ): Promise<GenerateResult[]> {
    const result = await generateJson({
      model: this.model,
      schema: generateResultsSchema,
      system: prompt.system,
      prompt: prompt.user,
    });

    return (result?.destinations ?? []).slice(0, 5);
  }

  async generateItinerary(
    prompt: { system: string; user: string },
  ): Promise<ItineraryResponse> {
    const result = await generateJson({
      model: this.model,
      schema: itineraryResponseWrapperSchema,
      system: prompt.system,
      prompt: prompt.user,
    });

    return result.result;
  }

  async generateFoodGuide(
    prompt: { system: string; user: string },
  ): Promise<FoodGuideResponse> {
    const result = await generateJson({
      model: this.model,
      schema: foodGuideResponseWrapperSchema,
      system: prompt.system,
      prompt: prompt.user,
    });

    return result.result;
  }

  async rankTreks(
    prompt: { system: string; user: string },
  ): Promise<TrekResult[]> {
    const result = await generateJson({
      model: this.model,
      schema: trekResultsSchema,
      system: prompt.system,
      prompt: prompt.user,
    });

    return (result?.treks ?? []).slice(0, 5);
  }
}
