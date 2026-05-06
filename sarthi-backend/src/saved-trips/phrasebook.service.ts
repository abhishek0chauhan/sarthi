import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { AiService } from '../ai/ai.service';
import { SavedTripsService } from './saved-trips.service';
import { Prisma } from '@prisma/client';

interface FirebaseUser {
  uid: string;
  name?: string;
  email?: string;
}

@Injectable()
export class PhrasebookService {
  private readonly logger = new Logger(PhrasebookService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly aiService: AiService,
    private readonly savedTripsService: SavedTripsService,
  ) {}

  async getPhrasebook(tripId: string, fbUser: FirebaseUser) {
    const trip = await this.savedTripsService.getById(tripId, fbUser);
    return trip.phrasebookData ?? null;
  }

  async generateAndStore(tripId: string, fbUser: FirebaseUser) {
    const trip = await this.savedTripsService.getById(tripId, fbUser);
    this.logger.log(
      `Generating phrasebook for ${trip.destination}, ${trip.state}`,
    );

    try {
      const phrasebook = await this.aiService.generatePhrasebook(
        trip.destination,
        trip.state,
      );
      this.logger.log(
        `Successfully generated phrasebook for ${trip.destination}`,
      );

      await this.prisma.savedTrip.update({
        where: { id: tripId },
        data: { phrasebookData: phrasebook as any },
      });
      return phrasebook;
    } catch (err) {
      this.logger.error(
        `Failed to generate phrasebook for ${trip.destination}`,
        err,
      );
      throw err;
    }
  }
}
