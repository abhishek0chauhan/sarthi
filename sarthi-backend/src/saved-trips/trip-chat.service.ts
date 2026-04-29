import { Injectable, TooManyRequestsException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { AiService } from '../ai/ai.service';
import { ProfileService } from '../profile/profile.service';
import { SavedTripsService } from './saved-trips.service';
import { buildTripChatSystem } from '../ai/prompts/trip-chat.prompt';

interface FirebaseUser { uid: string; name?: string; email?: string; }

const RATE_LIMIT = 10;

@Injectable()
export class TripChatService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly aiService: AiService,
    private readonly savedTripsService: SavedTripsService,
    private readonly profileService: ProfileService,
  ) {}

  private summariseItinerary(itineraryData: any): string {
    if (!itineraryData?.itinerary) return '';
    return itineraryData.itinerary
      .map((d: any) => {
        const acts = (d.activities ?? []).map((a: any) => a.activity).join(', ');
        return `Day ${d.day}: ${acts || d.title}`;
      })
      .join('. ');
  }

  async sendMessage(tripId: string, message: string, fbUser: FirebaseUser) {
    const trip = await this.savedTripsService.getById(tripId, fbUser);

    // Rate limit: 10 user messages per trip per hour
    const oneHourAgo = new Date(Date.now() - 3_600_000);
    const recentCount = await this.prisma.tripChatMessage.count({
      where: { tripId, role: 'user', createdAt: { gte: oneHourAgo } },
    });
    if (recentCount >= RATE_LIMIT) {
      throw new TooManyRequestsException('Rate limit: 10 messages per trip per hour');
    }

    // Fetch last 3 messages for context continuity
    const history = await this.prisma.tripChatMessage.findMany({
      where: { tripId },
      orderBy: { createdAt: 'desc' },
      take: 6,  // 3 pairs (user+assistant)
    });
    const recentMessages = history.reverse().map(m => ({ role: m.role, content: m.content }));

    // Fetch personality (best-effort)
    let profile = null;
    try { profile = await this.profileService.getProfile(fbUser.uid); } catch { /* non-fatal */ }

    const system = buildTripChatSystem({
      destination: trip.destination,
      state: trip.state,
      dates: trip.dates as any,
      itinerarySummary: this.summariseItinerary(trip.itineraryData),
      profile,
      recentMessages,
    });

    const reply = await this.aiService.tripChat(system, message);

    // Store both messages
    await this.prisma.tripChatMessage.create({ data: { tripId, role: 'user', content: message } });
    await this.prisma.tripChatMessage.create({ data: { tripId, role: 'assistant', content: reply } });

    return { reply };
  }

  async getHistory(tripId: string, fbUser: FirebaseUser) {
    await this.savedTripsService.getById(tripId, fbUser); // validates ownership
    return this.prisma.tripChatMessage.findMany({
      where: { tripId },
      orderBy: { createdAt: 'asc' },
    });
  }

  async clearHistory(tripId: string, fbUser: FirebaseUser) {
    await this.savedTripsService.getById(tripId, fbUser); // validates ownership
    await this.prisma.tripChatMessage.deleteMany({ where: { tripId } });
  }
}
