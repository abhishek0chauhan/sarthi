import { Injectable, ForbiddenException, NotFoundException, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { Prisma } from '@prisma/client';
import { UserService } from './user.service';
import { CorrectionsService } from '../corrections/corrections.service';
import { ProfileService } from '../profile/profile.service';
import { AiService } from '../ai/ai.service';
import { CreateSavedTripDto } from './dto/create-saved-trip.dto';
import { UpdateSavedTripDto } from './dto/update-saved-trip.dto';
import { AddActivityDto } from './dto/add-activity.dto';
import { randomUUID } from 'crypto';
import type { TravelerProfileSnapshot, CorrectionRecord } from '../ai/prompts/destination.prompt';

interface FirebaseUser {
  uid: string;
  name?: string;
  email?: string;
}

@Injectable()
export class SavedTripsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly userService: UserService,
    private readonly correctionsService: CorrectionsService,
    private readonly profileService: ProfileService,
    private readonly aiService: AiService,
  ) {}

  async create(dto: CreateSavedTripDto, fbUser: FirebaseUser) {
    const user = await this.userService.findOrCreate(fbUser.uid, fbUser.name, fbUser.email);

    const createData: any = {
      userId: user.id,
      name: dto.name ?? `${dto.destination} Trip`,
      destination: dto.destination,
      state: dto.state,
      dates: dto.dates as unknown as Prisma.JsonValue,
      travelMode: dto.travelMode as any,
      destinationData: dto.destinationData as unknown as Prisma.JsonValue,
    };

    if (dto.itineraryData !== undefined) {
      createData.itineraryData = dto.itineraryData as unknown as Prisma.JsonValue;
    }
    if (dto.foodGuideData !== undefined) {
      createData.foodGuideData = dto.foodGuideData as unknown as Prisma.JsonValue;
    }

    return this.prisma.savedTrip.create({
      data: createData,
    });
  }

  async listByUser(fbUser: FirebaseUser) {
    const user = await this.userService.findOrCreate(fbUser.uid, fbUser.name, fbUser.email);

    const trips = await this.prisma.savedTrip.findMany({
      where: { userId: user.id },
      orderBy: { createdAt: 'desc' },
    });

    return trips.map(trip => ({
      id: trip.id,
      name: trip.name,
      destination: trip.destination,
      state: trip.state,
      dates: trip.dates,
      travelMode: trip.travelMode,
      createdAt: trip.createdAt,
      hasItinerary: trip.itineraryData !== null,
      hasFoodGuide: trip.foodGuideData !== null,
    }));
  }

  async getById(tripId: string, fbUser: FirebaseUser) {
    const user = await this.userService.findOrCreate(fbUser.uid, fbUser.name, fbUser.email);
    const trip = await this.prisma.savedTrip.findUnique({ where: { id: tripId } });

    if (!trip) throw new NotFoundException('Trip not found');
    if (trip.userId !== user.id) throw new ForbiddenException('Not your trip');

    return trip;
  }

  async update(tripId: string, dto: UpdateSavedTripDto, fbUser: FirebaseUser) {
    await this.getById(tripId, fbUser); // validates ownership

    const updateData: any = {};

    if (dto.name !== undefined) updateData.name = dto.name;
    if (dto.travelMode !== undefined) updateData.travelMode = dto.travelMode as any;
    if (dto.itineraryData !== undefined) updateData.itineraryData = dto.itineraryData as unknown as Prisma.JsonValue;
    if (dto.foodGuideData !== undefined) updateData.foodGuideData = dto.foodGuideData as unknown as Prisma.JsonValue;

    return this.prisma.savedTrip.update({
      where: { id: tripId },
      data: updateData,
    });
  }

  async remove(tripId: string, fbUser: FirebaseUser) {
    await this.getById(tripId, fbUser); // validates ownership
    return this.prisma.savedTrip.delete({ where: { id: tripId } });
  }

  async enableSharing(tripId: string, fbUser: FirebaseUser) {
    const trip = await this.getById(tripId, fbUser);

    if (trip.shareToken) {
      return { shareToken: trip.shareToken, url: `/shared-trips/${trip.shareToken}` };
    }

    const shareToken = randomUUID();
    const updated = await this.prisma.savedTrip.update({
      where: { id: tripId },
      data: { shareToken },
    });

    return { shareToken: updated.shareToken, url: `/shared-trips/${updated.shareToken}` };
  }

  async disableSharing(tripId: string, fbUser: FirebaseUser) {
    await this.getById(tripId, fbUser);
    await this.prisma.savedTrip.update({
      where: { id: tripId },
      data: { shareToken: null },
    });
  }

  async getShared(token: string) {
    const trip = await this.prisma.savedTrip.findUnique({
      where: { shareToken: token },
      include: { user: true },
    });

    if (!trip) throw new NotFoundException('Shared trip not found');

    const { user, ...tripData } = trip;
    return { ...tripData, sharedBy: user.displayName ?? 'Anonymous' };
  }

  private getItineraryDay(itineraryData: any, day: number) {
    if (!itineraryData?.itinerary) throw new NotFoundException('No itinerary on this trip');
    const dayObj = itineraryData.itinerary.find((d: any) => d.day === day);
    if (!dayObj) throw new NotFoundException(`Day ${day} not found in itinerary`);
    return dayObj;
  }

  private async updateItinerary(tripId: string, itineraryData: any) {
    return this.prisma.savedTrip.update({
      where: { id: tripId },
      data: { itineraryData: itineraryData as unknown as Prisma.InputJsonValue },
    });
  }

  async addActivity(tripId: string, day: number, dto: AddActivityDto, fbUser: FirebaseUser) {
    const trip = await this.getById(tripId, fbUser);
    const itinerary = JSON.parse(JSON.stringify(trip.itineraryData)) as any;
    const dayObj = this.getItineraryDay(itinerary, day);

    const newActivity = {
      time: dto.time ?? '',
      activity: dto.activity,
      cost: dto.cost ?? '',
      healthNote: dto.healthNote ?? '',
    };

    if (dto.position !== undefined && dto.position >= 0 && dto.position <= dayObj.activities.length) {
      dayObj.activities.splice(dto.position, 0, newActivity);
    } else {
      dayObj.activities.push(newActivity);
    }

    return this.updateItinerary(tripId, itinerary);
  }

  async removeActivity(tripId: string, day: number, activityIndex: number, fbUser: FirebaseUser) {
    const trip = await this.getById(tripId, fbUser);
    const itinerary = JSON.parse(JSON.stringify(trip.itineraryData)) as any;
    const dayObj = this.getItineraryDay(itinerary, day);

    if (activityIndex < 0 || activityIndex >= dayObj.activities.length) {
      throw new BadRequestException(`Activity index ${activityIndex} out of range`);
    }

    const removed = dayObj.activities[activityIndex];
    dayObj.activities.splice(activityIndex, 1);
    const updated = await this.updateItinerary(tripId, itinerary);

    // Log correction so Phase 2B personalisation learns from this removal
    await this.correctionsService.create(fbUser.uid, {
      tripId,
      type: 'removed_place',
      context: { place: removed.activity, day },
    }).catch(() => null);  // non-blocking

    return { removed, trip: updated };
  }

  async swapActivity(tripId: string, day: number, activityIndex: number, dto: AddActivityDto, fbUser: FirebaseUser) {
    const trip = await this.getById(tripId, fbUser);
    const itinerary = JSON.parse(JSON.stringify(trip.itineraryData)) as any;
    const dayObj = this.getItineraryDay(itinerary, day);

    if (activityIndex < 0 || activityIndex >= dayObj.activities.length) {
      throw new BadRequestException(`Activity index ${activityIndex} out of range`);
    }

    const old = dayObj.activities[activityIndex];
    dayObj.activities[activityIndex] = {
      time: dto.time ?? old.time ?? '',
      activity: dto.activity,
      cost: dto.cost ?? old.cost ?? '',
      healthNote: dto.healthNote ?? old.healthNote ?? '',
    };
    const updated = await this.updateItinerary(tripId, itinerary);

    await this.correctionsService.create(fbUser.uid, {
      tripId,
      type: 'swapped_place',
      context: { oldPlace: old.activity, newPlace: dto.activity, day },
    }).catch(() => null);

    return { old, trip: updated };
  }

  async reorderActivities(tripId: string, day: number, indices: number[], fbUser: FirebaseUser) {
    const trip = await this.getById(tripId, fbUser);
    const itinerary = JSON.parse(JSON.stringify(trip.itineraryData)) as any;
    const dayObj = this.getItineraryDay(itinerary, day);

    if (indices.length !== dayObj.activities.length || !indices.every(i => i >= 0 && i < dayObj.activities.length)) {
      throw new BadRequestException('Invalid reorder indices');
    }

    dayObj.activities = indices.map((i: number) => dayObj.activities[i]);
    return this.updateItinerary(tripId, itinerary);
  }

  async suggestReplacement(
    tripId: string,
    day: number,
    activityIndex: number,
    fbUser: FirebaseUser,
  ) {
    const trip = await this.getById(tripId, fbUser);
    const itinerary = trip.itineraryData as any;
    const dayObj = this.getItineraryDay(itinerary, day);

    if (activityIndex < 0 || activityIndex >= dayObj.activities.length) {
      throw new BadRequestException(`Activity index ${activityIndex} out of range`);
    }

    const currentActivity = dayObj.activities[activityIndex];
    const otherActivities: string[] = dayObj.activities
      .filter((_: any, i: number) => i !== activityIndex)
      .map((a: any) => `${a.time}: ${a.activity}`);

    // Fetch personality context (best-effort — don't fail if unavailable)
    let profile: TravelerProfileSnapshot | null = null;
    let corrections: CorrectionRecord[] = [];
    try {
      profile = await this.profileService.getProfile(fbUser.uid);
      if (profile) {
        const user = await this.userService.findOrCreate(fbUser.uid);
        corrections = (await this.correctionsService.getRecentForPrompt(user.id)) as CorrectionRecord[];
      }
    } catch { /* non-fatal */ }

    return this.aiService.suggestActivityReplacement({
      destination: trip.destination,
      state: trip.state,
      day,
      currentActivity,
      dayActivities: otherActivities,
      profile,
      corrections,
    });
  }
}
