import { forwardRef, Inject, Injectable, NotFoundException, Logger } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { SessionService } from './session.service';
import { NotificationService } from './notification.service';
import { AiService } from '../ai/ai.service';
import { ProfileService } from '../profile/profile.service';
import { CorrectionsService } from '../corrections/corrections.service';
import { LiveGuideGateway } from './live-guide.gateway';
import type { LiveGuideSession } from '@prisma/client';

interface FirebaseUser { uid: string; name?: string; email?: string; }

type ActivityStatus = Record<string, 'done' | 'skipped' | 'pending'>;

@Injectable()
export class LiveGuideService {
  private readonly logger = new Logger(LiveGuideService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly sessionService: SessionService,
    private readonly notificationService: NotificationService,
    private readonly aiService: AiService,
    private readonly profileService: ProfileService,
    private readonly correctionsService: CorrectionsService,
    @Inject(forwardRef(() => LiveGuideGateway))
    private readonly gateway: LiveGuideGateway,
  ) {}

  private async findOrCreateUser(firebaseUid: string) {
    return this.prisma.user.upsert({
      where: { firebaseUid },
      update: {},
      create: { firebaseUid },
    });
  }

  private async getTrip(tripId: string, userId: string) {
    const trip = await this.prisma.savedTrip.findFirst({ where: { id: tripId, userId } });
    if (!trip) throw new NotFoundException('Trip not found');
    return trip;
  }

  private buildProfileSummary(profile: any): string | undefined {
    if (!profile) return undefined;
    const parts: string[] = [];
    if (profile.travelPace) parts.push(`pace: ${profile.travelPace}`);
    if (profile.comfortLevel) parts.push(`comfort: ${profile.comfortLevel}`);
    if (profile.physicalReadiness) parts.push(`fitness: ${profile.physicalReadiness}`);
    if (profile.spendingStyle) parts.push(`budget style: ${profile.spendingStyle}`);
    return parts.length ? parts.join(', ') : undefined;
  }

  private getTodayPlan(itineraryData: any, dayIndex: number) {
    const itinerary: any[] = itineraryData?.itinerary ?? [];
    return itinerary[dayIndex] ?? null;
  }

  private dispatch(userId: string, event: string, data: any, fcmTitle: string, fcmBody: string) {
    if (this.gateway.isConnected(userId)) {
      this.gateway.sendToUser(userId, event, data);
    } else {
      this.notificationService.sendToUser(userId, fcmTitle, fcmBody).catch(() => null);
    }
  }

  async activateGuide(tripId: string, firebaseUid: string, fcmToken: string) {
    const user = await this.findOrCreateUser(firebaseUid);
    const trip = await this.getTrip(tripId, user.id);

    const { dayIndex, status } = this.sessionService.computeCurrentDay(trip.dates as any);

    let session = await this.sessionService.findActive(tripId, user.id);
    if (!session) {
      session = await this.sessionService.create(tripId, user.id, Math.max(dayIndex, 0));
    }

    const todayPlan = this.getTodayPlan(trip.itineraryData, Math.max(dayIndex, 0));
    const activities = todayPlan?.activities ?? [];

    let briefing = 'Welcome to your trip!';
    let pushSummary = `Day ${Math.max(dayIndex + 1, 1)} has begun. Open Sarthi for your plan.`;

    if (status === 'during' && activities.length > 0) {
      try {
        const profile = await this.profileService.getProfile(firebaseUid).catch(() => null);
        const result = await this.aiService.generateLiveBriefing({
          destination: trip.destination,
          state: trip.state,
          dayNumber: dayIndex + 1,
          todayActivities: activities.map((a: any) => ({ time: a.time, activity: a.activity })),
          profileSummary: this.buildProfileSummary(profile),
        });
        briefing = result.briefing;
        pushSummary = result.pushSummary;
      } catch (err) {
        this.logger.warn(`Briefing generation failed: ${(err as Error).message}`);
      }
    }

    return { todayPlan: { ...todayPlan, dayIndex }, briefing, pushSummary, sessionId: session.id, status };
  }

  async markActivityDone(sessionId: string, session: LiveGuideSession, dayIndex: number, activityIndex: number) {
    const status = session.activityStatus as ActivityStatus;
    status[`${dayIndex}:${activityIndex}`] = 'done';
    await this.sessionService.update(sessionId, { activityStatus: status });
    return { dayIndex, activityIndex, status: 'done' };
  }

  async skipActivity(
    sessionId: string,
    tripId: string,
    firebaseUid: string,
    session: LiveGuideSession,
    dayIndex: number,
    activityIndex: number,
    reason?: string,
  ) {
    const actStatus = session.activityStatus as ActivityStatus;
    actStatus[`${dayIndex}:${activityIndex}`] = 'skipped';
    await this.sessionService.update(sessionId, { activityStatus: actStatus });

    this.correctionsService
      .create(firebaseUid, {
        tripId,
        type: 'live_skip_activity',
        context: { dayIndex, activityIndex, reason: reason ?? '' },
      })
      .catch(() => null);

    return { dayIndex, activityIndex, status: 'skipped' };
  }

  async replanDay(
    sessionId: string,
    tripId: string,
    firebaseUid: string,
    session: LiveGuideSession,
    dayIndex: number,
    triggeredBy: 'finished_early' | 'skip' | 'manual',
  ) {
    const today = new Date().toISOString().split('T')[0];
    const replanCount = (session.replanCount as any) ?? { date: '', count: 0 };
    const todayCount = replanCount.date === today ? replanCount.count : 0;
    if (todayCount >= 3) throw new Error('Replan limit reached: max 3 replans per day');

    const user = await this.findOrCreateUser(firebaseUid);
    const trip = await this.getTrip(tripId, user.id);
    const todayPlan = this.getTodayPlan(trip.itineraryData, dayIndex);
    const allActivities: any[] = todayPlan?.activities ?? [];

    const actStatus = session.activityStatus as ActivityStatus;
    const remaining = allActivities.filter(
      (_: any, i: number) => actStatus[`${dayIndex}:${i}`] !== 'done' && actStatus[`${dayIndex}:${i}`] !== 'skipped',
    );

    const currentTime = new Date().toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit', timeZone: 'Asia/Kolkata' });
    const profile = await this.profileService.getProfile(firebaseUid).catch(() => null);

    const activities = await this.aiService.replanDay({
      destination: trip.destination,
      currentTime,
      remainingActivities: remaining.map((a: any) => ({ time: a.time, activity: a.activity, mapQuery: a.mapQuery })),
      triggeredBy,
      profileSummary: this.buildProfileSummary(profile),
    });

    await this.sessionService.update(sessionId, {
      replanCount: { date: today, count: todayCount + 1 },
    });

    return { activities };
  }

  async sendMorningBriefing(session: LiveGuideSession) {
    const trip = await this.prisma.savedTrip.findFirst({ where: { id: session.tripId } });
    if (!trip) return;

    const todayPlan = this.getTodayPlan(trip.itineraryData, session.currentDay);
    const activities: any[] = todayPlan?.activities ?? [];

    try {
      const profile = await this.profileService.getProfile(session.userId).catch(() => null);
      const result = await this.aiService.generateLiveBriefing({
        destination: trip.destination,
        state: trip.state,
        dayNumber: session.currentDay + 1,
        todayActivities: activities.map((a: any) => ({ time: a.time, activity: a.activity })),
        profileSummary: this.buildProfileSummary(profile),
      });

      this.dispatch(session.userId, 'morning_briefing', { briefing: result.briefing, todayPlan }, result.pushSummary, result.briefing);
      await this.sessionService.update(session.id, { lastBriefingAt: new Date() });
    } catch (err) {
      this.logger.warn(`Morning briefing failed for session ${session.id}: ${(err as Error).message}`);
    }
  }

  async sendMealNudge(session: LiveGuideSession, meal: 'breakfast' | 'lunch' | 'dinner') {
    const trip = await this.prisma.savedTrip.findFirst({ where: { id: session.tripId } });
    if (!trip) return;

    const mealPlan: any[] = (trip.foodGuideData as any)?.mealPlan ?? [];
    const dayMeal = mealPlan.find((m: any) => m.day === session.currentDay + 1);
    if (!dayMeal) return;

    const suggestion = dayMeal[meal];
    if (!suggestion) return;

    const title = `${meal.charAt(0).toUpperCase() + meal.slice(1)} time!`;
    const body = `${suggestion.suggestion} — ${suggestion.cost ?? ''}`.trim();

    this.dispatch(session.userId, 'meal_nudge', { meal, suggestion }, title, body);

    const updateField: any = {};
    if (meal === 'breakfast') updateField.lastBreakfastAt = new Date();
    if (meal === 'lunch') updateField.lastLunchAt = new Date();
    if (meal === 'dinner') updateField.lastDinnerAt = new Date();
    await this.sessionService.update(session.id, updateField);
  }

  async handleLocationUpdate(sessionId: string, session: LiveGuideSession, lat: number, lng: number) {
    await this.sessionService.update(sessionId, { lastLocation: { lat, lng, timestamp: Date.now() } });

    const oneHourAgo = Date.now() - 3_600_000;
    const lastSuggest = session.lastSuggestAt ? new Date(session.lastSuggestAt).getTime() : 0;
    if (lastSuggest > oneHourAgo) return;

    const trip = await this.prisma.savedTrip.findFirst({ where: { id: session.tripId } });
    if (!trip) return;

    try {
      const todayPlan = this.getTodayPlan(trip.itineraryData, session.currentDay);
      const existing = (todayPlan?.activities ?? []).map((a: any) => a.activity);

      const result = await this.aiService.generateLocationSuggestion({
        destination: trip.destination,
        state: trip.state,
        lat,
        lng,
        existingActivities: existing,
      });

      this.dispatch(
        session.userId,
        'location_suggestion',
        { suggestion: result.suggestion, placeName: result.placeName, mapQuery: result.mapQuery },
        'Nearby suggestion',
        result.pushSummary,
      );

      await this.sessionService.update(sessionId, { lastSuggestAt: new Date() });
    } catch (err) {
      this.logger.warn(`Location suggestion failed: ${(err as Error).message}`);
    }
  }

  async getSessionStatus(tripId: string, firebaseUid: string) {
    const user = await this.findOrCreateUser(firebaseUid);
    const session = await this.sessionService.findActive(tripId, user.id);
    if (!session) return null;
    return { sessionId: session.id, currentDay: session.currentDay, activityStatus: session.activityStatus, isActive: session.isActive };
  }

  async deactivate(sessionId: string) {
    await this.sessionService.deactivate(sessionId);
  }
}
