import { forwardRef, Inject, Injectable, NotFoundException, Logger } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { SessionService } from './session.service';
import { NotificationService } from './notification.service';
import { AiService } from '../ai/ai.service';
import { ProfileService } from '../profile/profile.service';
import { CorrectionsService } from '../corrections/corrections.service';
import { LiveGuideGateway } from './live-guide.gateway';
import { ActivitySchedulerService } from './activity-scheduler.service';
import type { LiveGuideSession } from '@prisma/client';
import type { TravelerProfile } from '../ai/interfaces/personalized-location.interface';
import type { PersonalizedSuggestion } from '../ai/interfaces/personalized-location.interface';

interface FirebaseUser { uid: string; name?: string; email?: string; }

type ActivityStatus = Record<string, 'done' | 'skipped' | 'pending'>;

@Injectable()
export class LiveGuideService {
  private readonly logger = new Logger(LiveGuideService.name);

  // Store profile cache per session (TTL = duration of session)
  private profileCache = new Map<string, TravelerProfile | null>();

  constructor(
    private readonly prisma: PrismaService,
    private readonly sessionService: SessionService,
    private readonly notificationService: NotificationService,
    private readonly aiService: AiService,
    private readonly profileService: ProfileService,
    private readonly correctionsService: CorrectionsService,
    @Inject(forwardRef(() => LiveGuideGateway))
    private readonly gateway: LiveGuideGateway,
    private readonly activityScheduler: ActivitySchedulerService,
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

    // NEW: Fetch and cache user profile
    const profile = await this.profileService.getProfile(firebaseUid).catch(() => null);
    if (session?.id && profile) {
      // NOTE: Cast profile to TravelerProfile (null fields become undefined)
      const profileData = profile as unknown as TravelerProfile;
      this.profileCache.set(session.id, profileData);
    }

    const todayPlan = this.getTodayPlan(trip.itineraryData, Math.max(dayIndex, 0));
    const activities = todayPlan?.activities ?? [];

    let briefing = 'Welcome to your trip!';
    let pushSummary = `Day ${Math.max(dayIndex + 1, 1)} has begun. Open Sarthi for your plan.`;

    if (status === 'during' && activities.length > 0) {
      try {
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

      // NEW: Schedule activity notifications for today's activities
      if (activities.length > 0 && profile?.travelPace) {
        await this.scheduleActivityNotifications(
          session.id,
          tripId,
          Math.max(dayIndex, 0),
          activities,
          profile.travelPace,
          trip.travelMode || 'public_transit'
        );
      }
    }

    return { todayPlan: { ...todayPlan, dayIndex }, briefing, pushSummary, sessionId: session.id, status };
  }

  private async scheduleActivityNotifications(
    sessionId: string,
    tripId: string,
    dayIndex: number,
    activities: any[],
    userPace: string,
    transportMode: string
  ): Promise<void> {
    // Get the current session to access userId
    const session = await this.prisma.liveGuideSession.findFirst({
      where: { id: sessionId }
    }).catch(() => null);
    if (!session) {
      this.logger.warn(`Session ${sessionId} not found, skipping activity scheduling`);
      return;
    }

    const now = Date.now();

    for (let i = 0; i < activities.length; i++) {
      const activity = activities[i];

      // Skip past activities (use the scheduler's isActivityTime method)
      // NOTE: Commented out original logic — using scheduler's method instead
      // if (activity.time && this.activityScheduler.isActivityTime(activity.time)) {
      //   continue;
      // }
      if (this.activityScheduler.isActivityTime(activity.time)) {
        continue;
      }

      // In real implementation, calculate distance using Google Maps
      // For now, use rough estimate: 2km + 500m per activity index
      const roughDistance = 2000 + (i * 500); // meters

      // Calculate travel time with user's pace preference
      const travelTime = this.activityScheduler.calculateTravelTime(
        roughDistance,
        userPace,
        transportMode
      );

      // Parse activity time and calculate when to send notification
      const activityMinutes = this.activityScheduler.parseActivityTime(activity.time);
      const today = new Date();
      const activityDate = new Date(
        today.getFullYear(),
        today.getMonth(),
        today.getDate()
      );
      const scheduledMs = activityDate.getTime() + (activityMinutes - travelTime) * 60 * 1000;

      // Generate idempotency key to prevent duplicate notifications
      const idempotencyKey = this.activityScheduler.generateIdempotencyKey(
        tripId,
        dayIndex,
        i,
        scheduledMs
      );

      // Persist to database with upsert (no-op if already exists)
      // NOTE: Original logic to persist activity schedule to database
      await this.prisma.activitySchedule
        .upsert({
          where: { idempotencyKey },
          update: {},
          create: {
            sessionId,
            tripId,
            userId: session.userId,
            dayIndex,
            activityIndex: i,
            activity: activity.activity,
            scheduledTime: new Date(scheduledMs),
            distance: roughDistance,
            estimatedTravelTime: travelTime,
            idempotencyKey
          }
        })
        .catch((err) => {
          this.logger.warn(`Failed to schedule activity notification: ${(err as Error).message}`);
        });
    }
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

    // NEW: Check for pending activity notifications
    const now = new Date();
    const pendingActivities = await this.prisma.activitySchedule.findMany({
      where: {
        sessionId,
        notificationSent: false,
        scheduledTime: { lte: now }
      }
    }).catch(() => []);

    for (const scheduled of pendingActivities) {
      // Emit activity_approaching event
      this.dispatch(
        session.userId,
        'activity_approaching',
        {
          activityIndex: scheduled.activityIndex,
          activity: scheduled.activity,
          distance: scheduled.distance,
          estimatedTravelTime: scheduled.estimatedTravelTime,
          mapQuery: scheduled.activity
        },
        `Time for ${scheduled.activity}`,
        `Leave now to arrive on time. ${scheduled.estimatedTravelTime} min away.`
      );

      // Mark as sent
      // NOTE: Commented out original logic to mark notification as sent
      await this.prisma.activitySchedule
        .update({
          where: { id: scheduled.id },
          data: { notificationSent: true }
        })
        .catch((err) => {
          this.logger.warn(`Failed to mark notification as sent: ${(err as Error).message}`);
        });
    }

    // NEW: Check for location-based suggestions (rate limited to 1 per hour)
    const oneHourAgo = Date.now() - 3_600_000;
    const lastSuggest = session.lastSuggestAt ? new Date(session.lastSuggestAt).getTime() : 0;

    if (lastSuggest < oneHourAgo) {
      // Try to generate personalized suggestion
      const trip = await this.prisma.savedTrip.findFirst({
        where: { id: session.tripId }
      }).catch(() => null);

      if (trip) {
        try {
          const profile = this.profileCache.get(sessionId);
          const todayPlan = this.getTodayPlan(trip.itineraryData, session.currentDay);
          const alreadyPlanned = (todayPlan?.activities ?? []).map((a: any) => a.activity);

          // NEW: Pass profile to AI for personalization
          const result = await this.aiService.generatePersonalizedLocationSuggestion(
            trip.destination,
            trip.state,
            profile || {},
            120, // In real code, calculate from next activity time
            [], // In real code, fetch from Google Places API
            alreadyPlanned
          );

          // Emit location_suggestion event with personalized data
          this.dispatch(
            session.userId,
            'location_suggestion',
            {
              suggestion: result.reasoning,
              placeName: result.placeName,
              mapQuery: result.placeName,
              distance: result.distance,
              estimatedTravelTime: Math.ceil(result.estimatedTime / 60),
              matchScore: result.confidence
            },
            'Nearby suggestion',
            `${result.placeName} — ${result.reasoning}`
          );

          // Update last suggestion timestamp
          await this.sessionService.update(sessionId, { lastSuggestAt: new Date() });
        } catch (err) {
          this.logger.warn(
            `Personalized suggestion failed: ${(err as Error).message}`
          );

          // NOTE: Fallback to non-personalized location suggestion
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
          } catch (fallbackErr) {
            this.logger.warn(`Fallback location suggestion also failed: ${(fallbackErr as Error).message}`);
          }
        }
      }
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
