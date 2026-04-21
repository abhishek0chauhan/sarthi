import { Injectable, ForbiddenException, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { UserService } from './user.service';
import { CreateSavedTripDto } from './dto/create-saved-trip.dto';
import { UpdateSavedTripDto } from './dto/update-saved-trip.dto';
import { randomUUID } from 'crypto';
import { Prisma } from '@prisma/client';

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
}
