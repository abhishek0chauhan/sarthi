import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { AiService } from '../ai/ai.service';
import { SavedTripsService } from './saved-trips.service';
import { Prisma } from '@prisma/client';

interface FirebaseUser { uid: string; name?: string; email?: string; }

@Injectable()
export class PhrasebookService {
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
    const phrasebook = await this.aiService.generatePhrasebook(trip.destination, trip.state);
    await this.prisma.savedTrip.update({
      where: { id: tripId },
      data: { phrasebookData: phrasebook as any },
    });
    return phrasebook;
  }
}
