import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { AiService } from '../ai/ai.service';
import type { SubmitQuizDto } from './dto/submit-quiz.dto';

const DIMENSION_KEYS = [
  'travelPace', 'depthVsBreadth', 'comfortLevel', 'crowdTolerance',
  'travelMotivations', 'physicalReadiness', 'spendingStyle', 'groundReality', 'languageComfort',
] as const;

@Injectable()
export class ProfileService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly aiService: AiService,
  ) {}

  private async findOrCreateUser(firebaseUid: string) {
    return this.prisma.user.upsert({
      where: { firebaseUid },
      update: {},
      create: { firebaseUid },
    });
  }

  computeCompleteness(dimensions: Partial<Record<string, any>>): number {
    const filled = DIMENSION_KEYS.filter((k) => {
      const v = dimensions[k];
      return v !== null && v !== undefined && (Array.isArray(v) ? v.length > 0 : true);
    }).length;
    return Math.round((filled / DIMENSION_KEYS.length) * 100);
  }

  async getProfile(firebaseUid: string) {
    const user = await this.findOrCreateUser(firebaseUid);
    return this.prisma.travelerProfile.findUnique({ where: { userId: user.id } });
  }

  async submitStory(firebaseUid: string, story: string) {
    const user = await this.findOrCreateUser(firebaseUid);
    const extracted = await this.aiService.extractPersonality(story);

    const dimensions: Record<string, any> = {};
    for (const key of DIMENSION_KEYS) {
      const val = (extracted as any)[key];
      if (val !== undefined && val !== null) {
        dimensions[key] = val;
      }
    }

    const completeness = this.computeCompleteness(dimensions);

    return this.prisma.travelerProfile.upsert({
      where: { userId: user.id },
      update: { story, ...dimensions, completeness },
      create: { userId: user.id, story, ...dimensions, completeness },
    });
  }

  async submitQuiz(firebaseUid: string, dto: SubmitQuizDto) {
    const user = await this.findOrCreateUser(firebaseUid);

    const existing = await this.prisma.travelerProfile.findUnique({ where: { userId: user.id } });
    const merged = { ...(existing ?? {}), ...dto };
    const completeness = this.computeCompleteness(merged);

    return this.prisma.travelerProfile.upsert({
      where: { userId: user.id },
      update: { ...dto, completeness },
      create: { userId: user.id, ...dto, completeness },
    });
  }

  async getQuizPrefill(firebaseUid: string) {
    return this.getProfile(firebaseUid);
  }

  async resetProfile(firebaseUid: string) {
    const user = await this.findOrCreateUser(firebaseUid);
    await this.prisma.travelerProfile.delete({ where: { userId: user.id } }).catch(() => null);
  }

  async updateNotificationPrefs(
    firebaseUid: string,
    prefs: Partial<{
      morningBriefing: boolean;
      mealNudges: boolean;
      smartSuggestions: boolean;
      locationAlerts: boolean;
      tripReminders: boolean;
    }>,
  ) {
    const user = await this.findOrCreateUser(firebaseUid);
    const defaults = {
      morningBriefing: true,
      mealNudges: true,
      smartSuggestions: true,
      locationAlerts: true,
      tripReminders: true,
    };
    const current = (user as any).notificationPrefs ?? defaults;
    const merged = { ...defaults, ...current, ...prefs };
    return this.prisma.user.update({
      where: { id: user.id },
      data: { notificationPrefs: merged },
      select: { notificationPrefs: true },
    });
  }

  async getNotificationPrefs(firebaseUid: string): Promise<{ notificationPrefs: { morningBriefing: boolean; mealNudges: boolean; smartSuggestions: boolean; locationAlerts: boolean; tripReminders: boolean } }> {
    const user = await this.findOrCreateUser(firebaseUid);
    const prefs = ((user?.notificationPrefs ?? {}) as Record<string, boolean>);
    return {
      notificationPrefs: {
        morningBriefing: prefs.morningBriefing ?? true,
        mealNudges: prefs.mealNudges ?? true,
        smartSuggestions: prefs.smartSuggestions ?? true,
        locationAlerts: prefs.locationAlerts ?? true,
        tripReminders: prefs.tripReminders ?? true,
      },
    };
  }
}
