import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

interface Activity {
  time: string;
  activity: string;
  mapQuery?: string;
}

@Injectable()
export class ActivitySchedulerService {
  private readonly logger = new Logger(ActivitySchedulerService.name);

  constructor(private readonly prisma: PrismaService) {}

  // Calculate travel time based on distance + user pace
  calculateTravelTime(
    distanceMeters: number,
    userPace: string,
    transportMode: string = 'public_transit'
  ): number {
    const speeds = {
      walking: 1.4,        // m/s (5 km/h)
      public_transit: 8.3, // m/s (30 km/h)
      taxi: 8.3,
      car: 11.1
    };

    const speed = speeds[transportMode as keyof typeof speeds] || speeds.public_transit;
    const baseTravelTime = (distanceMeters / speed) / 60; // minutes

    const bufferMultipliers = {
      packed: 1.2,
      loose: 1.1,
      no_plan: 1.0
    };

    const multiplier = bufferMultipliers[userPace as keyof typeof bufferMultipliers] || 1.0;
    return Math.ceil(baseTravelTime * multiplier);
  }

  // Generate idempotency key to prevent duplicates
  generateIdempotencyKey(tripId: string, dayIndex: number, activityIndex: number, scheduledTime: number): string {
    return `${tripId}:${dayIndex}:${activityIndex}:${scheduledTime}`;
  }

  // Time string (e.g. "9:00 AM") to minutes since midnight
  parseActivityTime(timeStr: string): number {
    // Parse "9:00 AM" or "14:30" format
    const match = timeStr.match(/(\d{1,2}):(\d{2})(?:\s*(AM|PM))?/i);
    if (!match) return 0;

    let hours = parseInt(match[1], 10);
    const minutes = parseInt(match[2], 10);
    const period = match[3]?.toUpperCase();

    if (period === 'PM' && hours !== 12) hours += 12;
    if (period === 'AM' && hours === 12) hours = 0;

    return hours * 60 + minutes;
  }

  // Check if current time is past activity time
  isActivityTime(activityTimeStr: string): boolean {
    const now = new Date();
    const currentMinutes = now.getHours() * 60 + now.getMinutes();
    const activityMinutes = this.parseActivityTime(activityTimeStr);
    return currentMinutes >= activityMinutes;
  }
}
