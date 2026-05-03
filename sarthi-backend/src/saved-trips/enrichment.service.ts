import { Injectable, Logger, BadRequestException } from '@nestjs/common';
import { AiService } from '../ai/ai.service';
import { buildEnrichmentPrompt } from '../ai/prompts/enrichment.prompt';

export interface ItineraryActivity {
  time?: string;
  activity: string;
  cost?: string;
  healthNote?: string;
  mapQuery?: string;
  placeContext?: any;
}

export interface ItineraryDay {
  day: number;
  title?: string;
  activities: ItineraryActivity[];
  meals?: any;
  healthNote?: string;
}

export interface ItineraryData {
  destination: string;
  totalEstimate?: string;
  itinerary: ItineraryDay[];
  packingList?: string[];
  healthAdvisory?: any;
  permits?: any;
}

@Injectable()
export class EnrichmentService {
  private readonly logger = new Logger(EnrichmentService.name);

  constructor(private readonly aiService: AiService) {}

  async enrichTrip(itineraryData: ItineraryData, destination: string, state: string): Promise<ItineraryData> {
    if (!itineraryData.itinerary || itineraryData.itinerary.length === 0) {
      throw new BadRequestException('Itinerary is empty');
    }

    // Collect all activities that need enrichment
    const activitiesToEnrich: { dayIndex: number; activityIndex: number; activity: ItineraryActivity }[] = [];
    itineraryData.itinerary.forEach((day, dayIndex) => {
      day.activities.forEach((activity, activityIndex) => {
        if (!activity.placeContext) {
          activitiesToEnrich.push({ dayIndex, activityIndex, activity });
        }
      });
    });

    if (activitiesToEnrich.length === 0) {
      this.logger.log('No activities to enrich');
      return itineraryData;
    }

    // Generate context for all activities at once
    const prompt = buildEnrichmentPrompt(
      destination,
      state,
      activitiesToEnrich.map((a) => a.activity),
    );

    this.logger.log(`Enriching ${activitiesToEnrich.length} activities for ${destination}, ${state}`);

    const response = await this.aiService.enrichActivities(prompt);

    // Apply enriched context back to itinerary
    let contextIndex = 0;
    activitiesToEnrich.forEach(({ dayIndex, activityIndex }) => {
      if (contextIndex < response.length) {
        itineraryData.itinerary[dayIndex].activities[activityIndex].placeContext = response[contextIndex];
        contextIndex++;
      }
    });

    return itineraryData;
  }
}
