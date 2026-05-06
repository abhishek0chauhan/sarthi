import { Injectable, Logger, HttpException, HttpStatus } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Destination } from '@prisma/client';
import { DestinationQueryService } from './destination-query.service';
import { AiService } from '../ai/ai.service';
import { CacheService } from '../cache/cache.service';
import {
  buildHybridPrompt,
  buildAiFullPrompt,
  buildItineraryPrompt,
  buildFoodGuidePrompt,
  buildTrekPrompt,
} from '../ai/prompts/destination.prompt';
import { TrekService } from '../treks/trek.service';
import { SearchDestinationsDto } from './dto/search-destinations.dto';
import { ItineraryDto } from './dto/itinerary.dto';
import { FoodGuideDto } from './dto/food-guide.dto';
import { ProfileService } from '../profile/profile.service';
import { CorrectionsService } from '../corrections/corrections.service';
import type {
  TravelerProfileSnapshot,
  CorrectionRecord,
} from '../ai/prompts/destination.prompt';

@Injectable()
export class DestinationFinderService {
  private readonly logger = new Logger(DestinationFinderService.name);

  constructor(
    private readonly queryService: DestinationQueryService,
    private readonly aiService: AiService,
    private readonly cacheService: CacheService,
    private readonly config: ConfigService,
    private readonly trekService: TrekService,
    private readonly profileService: ProfileService,
    private readonly correctionsService: CorrectionsService,
  ) {}

  private async getPersonalContext(firebaseUid?: string): Promise<{
    profile: TravelerProfileSnapshot | null;
    corrections: CorrectionRecord[];
  }> {
    if (!firebaseUid) return { profile: null, corrections: [] };
    try {
      const profile = await this.profileService.getProfile(firebaseUid);
      if (!profile) return { profile: null, corrections: [] };
      const user = await this.profileService['findOrCreateUser'](firebaseUid);
      const corrections = await this.correctionsService.getRecentForPrompt(
        user.id,
      );
      return { profile, corrections: corrections as CorrectionRecord[] };
    } catch {
      return { profile: null, corrections: [] };
    }
  }

  async search(dto: SearchDestinationsDto, bust = false, firebaseUid?: string) {
    const aiMode = this.config.get<string>(
      'DESTINATION_FINDER_AI_MODE',
      'hybrid',
    );

    const { freeText, destination, ...rest } = dto;
    const cacheKey = this.cacheService.buildKey({
      ...rest,
      normalizedFreeText: freeText ? this.cacheService.normalizeText(freeText) : '',
      destination: destination || '',
    });

    if (!bust) {
      const cached = await this.cacheService.get(cacheKey);
      if (cached) return cached;
    }

    const { profile, corrections } = await this.getPersonalContext(firebaseUid);

    try {
      let result;

      if (
        this.trekService.isTrekkingIntent(dto.experienceTypes, dto.freeText || '')
      ) {
        result = await this.runTrekMode(dto, profile, corrections);
      }

      if (!result) {
        result =
          aiMode === 'ai_full'
            ? await this.runAiFull(dto, profile, corrections)
            : await this.runHybrid(dto, profile, corrections);
      }

      await this.cacheService.set(cacheKey, result, 86400);
      return result;
    } catch (error) {
      this.logger.error('AI API error during search', error);
      throw new HttpException(
        'Our AI is temporarily unavailable. Please try again in a moment.',
        HttpStatus.SERVICE_UNAVAILABLE,
      );
    }
  }

  private async runTrekMode(
    dto: SearchDestinationsDto,
    profile?: TravelerProfileSnapshot | null,
    corrections?: CorrectionRecord[],
  ) {
    const filtered = this.trekService.filterForSearch({
      dates: dto.dates,
      age: dto.age,
      medicalConditions: dto.medicalConditions,
    });

    if (filtered.length === 0) {
      this.logger.warn(
        'No treks match filters — falling back to normal search',
      );
      return null;
    }

    const prompt = buildTrekPrompt({
      ...dto,
      freeText: dto.freeText || '',
      mode: (dto.mode as 'find' | 'plan' | undefined),
      treks: filtered,
      profile,
      corrections,
    });
    const treks = await this.aiService.rankTreks(prompt);

    if (treks.length === 0) {
      this.logger.warn(
        'AI returned no trek results — falling back to normal search',
      );
      return null;
    }

    return { mode: 'trek', results: treks };
  }

  async itinerary(dto: ItineraryDto, bust = false) {
    const cacheKey = this.cacheService.buildKey({
      type: 'itinerary',
      destination: dto.destination,
      state: dto.state,
      dates: dto.dates,
      budget: dto.budget,
      group: dto.group,
      departureCity: dto.departureCity,
      normalizedFreeText: this.cacheService.normalizeText(dto.freeText),
    });

    if (!bust) {
      const cached = await this.cacheService.get(cacheKey);
      if (cached) return cached;
    }

    try {
      const prompt = buildItineraryPrompt(dto);
      const result = await this.aiService.generateItinerary(prompt);
      await this.cacheService.set(cacheKey, result, 86400);
      return result;
    } catch (error) {
      this.logger.error('AI error during itinerary generation', error);
      throw new HttpException(
        'Our AI is temporarily unavailable. Please try again in a moment.',
        HttpStatus.SERVICE_UNAVAILABLE,
      );
    }
  }

  async foodGuide(dto: FoodGuideDto, bust = false) {
    const cacheKey = this.cacheService.buildKey({
      type: 'food-guide',
      destination: dto.destination,
      state: dto.state,
      dates: dto.dates,
      group: dto.group,
      spiceTolerance: dto.spiceTolerance,
      foodBudget: dto.foodBudget,
      allergies: dto.allergies,
      normalizedFreeText: this.cacheService.normalizeText(dto.freeText),
      cuisinePreferences: dto.cuisinePreferences,
      cookingStyles: dto.cookingStyles,
      flavorPreferences: dto.flavorPreferences,
      adventurousness: dto.adventurousness,
      favoriteDishes: this.cacheService.normalizeText(dto.favoriteDishes ?? ''),
      meatPreferences: dto.meatPreferences,
    });

    if (!bust) {
      const cached = await this.cacheService.get(cacheKey);
      if (cached) return cached;
    }

    try {
      const prompt = buildFoodGuidePrompt(dto);
      const result = await this.aiService.generateFoodGuide(prompt);
      await this.cacheService.set(cacheKey, result, 86400);
      return result;
    } catch (error) {
      this.logger.error('AI error during food guide generation', error);
      throw new HttpException(
        'Our AI is temporarily unavailable. Please try again in a moment.',
        HttpStatus.SERVICE_UNAVAILABLE,
      );
    }
  }

  private async runHybrid(
    dto: SearchDestinationsDto,
    profile?: TravelerProfileSnapshot | null,
    corrections?: CorrectionRecord[],
  ) {
    const shortlist = await this.queryService.findShortlist(dto);

    if (shortlist.length === 0) {
      this.logger.warn('DB shortlist empty — falling back to ai_full', dto);
      return this.runAiFull(dto, profile, corrections);
    }

    const compactShortlist = shortlist.map((d) => ({
      id: d.id,
      name: d.name,
      state: d.state,
      experienceTypes: d.experienceTypes,
      isHiddenGem: d.isHiddenGem,
      weatherSummary: d.weatherSummary,
      budgetMin: d.budgetMin,
      budgetMax: d.budgetMax,
    }));

    const prompt = buildHybridPrompt({
      ...dto,
      mode: (dto.mode as 'find' | 'plan' | undefined),
      destinations: compactShortlist,
      profile,
      corrections,
    });
    const shortlistIds = shortlist.map((d) => d.id);
    const ranked = await this.aiService.rankDestinations(prompt, shortlistIds);

    if (ranked.length === 0) {
      this.logger.warn('AI returned no results — returning top 5 DB results');
      return {
        mode: 'hybrid',
        results: shortlist
          .slice(0, 5)
          .map((d) => this.formatDbResult(d, dto.departureCity)),
      };
    }

    const destinationMap = new Map(shortlist.map((d) => [d.id, d]));
    const results = ranked.map(
      ({
        id,
        whyItMatches,
        healthAdvisory,
        costBreakdown,
        permits,
        tripReadiness,
      }) => ({
        ...this.formatDbResult(destinationMap.get(id)!, dto.departureCity),
        whyItMatches,
        healthAdvisory,
        costBreakdown,
        permits,
        tripReadiness,
      }),
    );

    return { mode: 'hybrid', results };
  }

  private async runAiFull(
    dto: SearchDestinationsDto,
    profile?: TravelerProfileSnapshot | null,
    corrections?: CorrectionRecord[],
  ) {
    const prompt = buildAiFullPrompt({ ...dto, mode: (dto.mode as 'find' | 'plan' | undefined), profile, corrections });
    const destinations = await this.aiService.generateDestinations(prompt);
    return { mode: 'ai_full', results: destinations };
  }

  private formatDbResult(d: Destination, departureCity: string) {
    const travelTimes = d.travelTimes as Record<string, string> | null;
    const result: Record<string, unknown> = {
      name: d.name,
      state: d.state,
      isHiddenGem: d.isHiddenGem,
      budgetEstimate: `₹${d.budgetMin}–${d.budgetMax} per person per day`,
      weatherSnapshot: d.weatherSummary,
      highlights: d.highlights,
    };

    if (travelTimes?.[departureCity]) {
      result.travelTime = travelTimes[departureCity];
    }

    return result;
  }
}
