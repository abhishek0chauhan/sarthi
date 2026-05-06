import { Injectable, Logger, BadRequestException } from '@nestjs/common';
import { createOpenAICompatible } from '@ai-sdk/openai-compatible';
import { generateJson } from './generate-json';
import { generateText } from 'ai';
import {
  rankResultsSchema,
  generateResultsSchema,
  itineraryResponseWrapperSchema,
  foodGuideResponseWrapperSchema,
  trekResultsSchema,
  suggestionsResponseWrapperSchema,
} from './schemas/destination.schema';
import type {
  RankResult,
  GenerateResult,
  ItineraryResponse,
  FoodGuideResponse,
  TrekResult,
  ActivitySuggestion,
} from './schemas/destination.schema';
import { profileExtractionWrapperSchema } from './schemas/profile.schema';
import type { ProfileExtraction } from './schemas/profile.schema';
import { phrasebookWrapperSchema } from './schemas/phrasebook.schema';
import type { Phrasebook } from './schemas/phrasebook.schema';
import { buildPhrasebookPrompt } from './prompts/phrasebook.prompt';
import { buildSuggestReplacementPrompt } from './prompts/destination.prompt';
import type { SuggestReplacementParams } from './prompts/destination.prompt';
import { liveBriefingWrapperSchema } from './schemas/live-briefing.schema';
import { liveReplanWrapperSchema } from './schemas/live-replan.schema';
import { liveSuggestionWrapperSchema } from './schemas/live-suggestion.schema';
import type { LiveBriefing } from './schemas/live-briefing.schema';
import type { ReplanActivity } from './schemas/live-replan.schema';
import type { LiveSuggestion } from './schemas/live-suggestion.schema';
import { buildBriefingPrompt } from './prompts/live-briefing.prompt';
import type { BriefingParams } from './prompts/live-briefing.prompt';
import { buildReplanPrompt } from './prompts/live-replan.prompt';
import type { ReplanParams } from './prompts/live-replan.prompt';
import { buildLocationSuggestionPrompt } from './prompts/live-suggestion.prompt';
import type { LocationSuggestionParams } from './prompts/live-suggestion.prompt';
import {
  enrichmentWrapperSchema,
  enrichmentContextSchema,
} from './schemas/enrichment.schema';
import type { EnrichmentContext } from './schemas/enrichment.schema';
import { buildPersonalizedLocationPrompt } from './prompts/personalized-location.prompt';
import { personalizedSuggestionWrapperSchema } from './schemas/personalized-location.schema';
import type { PersonalizedSuggestion } from './schemas/personalized-location.schema';
import type {
  TravelerProfile,
  NearbyPlace,
} from './interfaces/personalized-location.interface';

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
      sdkSignal.addEventListener('abort', () => controller.abort(), {
        once: true,
      });
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
const NVIDIA_MODEL_ID = 'google/gemma-3n-e4b-it';
const GEMINI_MODEL_ID = 'gemini-2.0-flash';

@Injectable()
export class AiService {
  private readonly logger = new Logger(AiService.name);
  private readonly model =
    AI_PROVIDER === 'gemini'
      ? gemini(GEMINI_MODEL_ID)
      : nvidia(NVIDIA_MODEL_ID);

  constructor() {
    const modelId =
      AI_PROVIDER === 'gemini' ? GEMINI_MODEL_ID : NVIDIA_MODEL_ID;
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

    return rankings
      .filter((item) => shortlistIds.includes(item.id))
      .slice(0, 5);
  }

  async generateDestinations(prompt: {
    system: string;
    user: string;
  }): Promise<GenerateResult[]> {
    const result = await generateJson({
      model: this.model,
      schema: generateResultsSchema,
      system: prompt.system,
      prompt: prompt.user,
    });

    return (result?.destinations ?? []).slice(0, 5);
  }

  async generateItinerary(prompt: {
    system: string;
    user: string;
  }): Promise<ItineraryResponse> {
    const result = await generateJson({
      model: this.model,
      schema: itineraryResponseWrapperSchema,
      system: prompt.system,
      prompt: prompt.user,
    });

    return result.result;
  }

  async generateFoodGuide(prompt: {
    system: string;
    user: string;
  }): Promise<FoodGuideResponse> {
    const result = await generateJson({
      model: this.model,
      schema: foodGuideResponseWrapperSchema,
      system: prompt.system,
      prompt: prompt.user,
    });

    return result.result;
  }

  async rankTreks(prompt: {
    system: string;
    user: string;
  }): Promise<TrekResult[]> {
    const result = await generateJson({
      model: this.model,
      schema: trekResultsSchema,
      system: prompt.system,
      prompt: prompt.user,
    });

    return (result?.treks ?? []).slice(0, 5);
  }

  async extractPersonality(story: string): Promise<ProfileExtraction> {
    const system =
      "You are a travel personality analyst. Extract the traveler's personality dimensions from their story. Only extract dimensions you are confident about from the story — leave others absent.";
    const user = `Analyze this traveler story and extract personality dimensions:

"${story}"

Respond ONLY with a JSON object in exactly this format (no extra text):
{"result":{"travelPace":"<packed|loose|no_plan or omit>","depthVsBreadth":"<deep|balanced|cover or omit>","comfortLevel":"<hotel|homestay|rough or omit>","crowdTolerance":"<worth_it|hidden|avoid or omit>","travelMotivations":["<food|nature|culture|adventure|photography|spiritual|nightlife|shopping|relaxation>"],"physicalReadiness":"<yes|maybe|no or omit>","spendingStyle":"<experience|budget|comfort or omit>","groundReality":"<bring_it|tolerate|need_comfort or omit>","languageComfort":"<fine|hindi|english or omit>","confidence":<0-100>}}

Set confidence to how much the story revealed (0=nothing useful, 100=all 9 dimensions clear).`;

    const result = await generateJson({
      model: this.model,
      schema: profileExtractionWrapperSchema,
      system,
      prompt: user,
    });
    return result.result;
  }

  async generatePhrasebook(
    destination: string,
    state: string,
  ): Promise<Phrasebook> {
    const prompt = buildPhrasebookPrompt(destination, state);
    const result = await generateJson({
      model: this.model,
      schema: phrasebookWrapperSchema,
      system: prompt.system,
      prompt: prompt.user,
    });
    return result.result;
  }

  async suggestActivityReplacement(
    params: SuggestReplacementParams,
  ): Promise<ActivitySuggestion[]> {
    const prompt = buildSuggestReplacementPrompt(params);
    const result = await generateJson({
      model: this.model,
      schema: suggestionsResponseWrapperSchema,
      system: prompt.system,
      prompt: prompt.user,
    });
    return result.result.suggestions.slice(0, 3);
  }

  async tripChat(system: string, userMessage: string): Promise<string> {
    const { text } = await generateText({
      model: this.model,
      maxOutputTokens: 1024,
      system,
      prompt: userMessage,
    });
    return text.trim();
  }

  async generateLiveBriefing(params: BriefingParams): Promise<LiveBriefing> {
    const prompt = buildBriefingPrompt(params);
    const result = await generateJson({
      model: this.model,
      schema: liveBriefingWrapperSchema,
      system: prompt.system,
      prompt: prompt.user,
    });
    return result.result;
  }

  async replanDay(params: ReplanParams): Promise<ReplanActivity[]> {
    const prompt = buildReplanPrompt(params);
    const result = await generateJson({
      model: this.model,
      schema: liveReplanWrapperSchema,
      system: prompt.system,
      prompt: prompt.user,
    });
    return result.result.activities;
  }

  async generateLocationSuggestion(
    params: LocationSuggestionParams,
  ): Promise<LiveSuggestion> {
    const prompt = buildLocationSuggestionPrompt(params);
    const result = await generateJson({
      model: this.model,
      schema: liveSuggestionWrapperSchema,
      system: prompt.system,
      prompt: prompt.user,
    });
    return result.result;
  }

  async generatePersonalizedLocationSuggestion(
    destination: string,
    state: string,
    userProfile: TravelerProfile,
    availableMinutes: number,
    nearbyPlaces: NearbyPlace[],
    alreadyPlanned: string[],
  ): Promise<PersonalizedSuggestion> {
    // Input validation
    if (!destination?.trim()) {
      throw new BadRequestException('Destination is required');
    }
    if (!state?.trim()) {
      throw new BadRequestException('State is required');
    }
    if (!userProfile) {
      this.logger.warn('User profile not provided for personalized suggestion');
    }
    if (!nearbyPlaces || nearbyPlaces.length === 0) {
      this.logger.warn('No nearby places provided for suggestion');
    }
    if (availableMinutes <= 0) {
      throw new BadRequestException('Available minutes must be greater than 0');
    }
    if (!Array.isArray(alreadyPlanned)) {
      throw new BadRequestException('Already planned must be an array');
    }

    const prompt = buildPersonalizedLocationPrompt(
      destination,
      state,
      userProfile,
      availableMinutes,
      nearbyPlaces,
      alreadyPlanned,
    );

    const result = await generateJson({
      model: this.model,
      schema: personalizedSuggestionWrapperSchema,
      system: prompt.system,
      prompt: prompt.user,
    });

    return result.result;
  }

  async enrichActivities(prompt: string): Promise<EnrichmentContext[]> {
    const result = await generateJson({
      model: this.model,
      schema: enrichmentWrapperSchema,
      system:
        'You are a travel expert enriching trip activities with detailed context.',
      prompt,
    });
    return result.contexts ?? [];
  }
}
