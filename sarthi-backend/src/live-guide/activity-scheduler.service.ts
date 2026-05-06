import { Injectable, Logger, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

interface Activity {
  time: string;
  activity: string;
  mapQuery?: string;
}

// Constants for transport speeds (meters per second)
const TRANSPORT_SPEEDS = {
  walking: 1.4, // m/s (5 km/h)
  public_transit: 8.3, // m/s (30 km/h)
  taxi: 8.3,
  car: 11.1,
} as const;

// Travel time buffer multipliers based on user pace
const PACE_BUFFERS = {
  packed: 1.2,
  loose: 1.1,
  no_plan: 1.0,
} as const;

// Valid transport modes
const VALID_TRANSPORT_MODES = Object.keys(TRANSPORT_SPEEDS);

// Valid pace values
const VALID_PACES = Object.keys(PACE_BUFFERS);

@Injectable()
export class ActivitySchedulerService {
  private readonly logger = new Logger(ActivitySchedulerService.name);

  constructor(private readonly prisma: PrismaService) {}

  /**
   * Calculate travel time based on distance, user pace, and transport mode.
   * @param distanceMeters - Distance to travel in meters (must be > 0)
   * @param userPace - Travel pace ('packed', 'loose', or 'no_plan')
   * @param transportMode - Mode of transport ('walking', 'public_transit', 'taxi', 'car')
   * @returns Estimated travel time in minutes
   * @throws BadRequestException if inputs are invalid
   */
  calculateTravelTime(
    distanceMeters: number,
    userPace: string,
    transportMode: string = 'public_transit',
  ): number {
    // Validate distance
    if (distanceMeters == null || distanceMeters <= 0) {
      const errorMsg = `Invalid distance: ${distanceMeters}. Distance must be greater than 0 meters.`;
      this.logger.error(errorMsg);
      throw new BadRequestException(errorMsg);
    }

    // Validate transport mode
    if (!VALID_TRANSPORT_MODES.includes(transportMode)) {
      const errorMsg = `Invalid transport mode: ${transportMode}. Must be one of: ${VALID_TRANSPORT_MODES.join(', ')}`;
      this.logger.error(errorMsg);
      throw new BadRequestException(errorMsg);
    }

    // Validate pace
    if (!VALID_PACES.includes(userPace)) {
      const errorMsg = `Invalid pace: ${userPace}. Must be one of: ${VALID_PACES.join(', ')}`;
      this.logger.error(errorMsg);
      throw new BadRequestException(errorMsg);
    }

    const speed =
      TRANSPORT_SPEEDS[transportMode as keyof typeof TRANSPORT_SPEEDS];
    const baseTravelTime = distanceMeters / speed / 60; // minutes

    const multiplier = PACE_BUFFERS[userPace as keyof typeof PACE_BUFFERS];
    const travelTime = Math.ceil(baseTravelTime * multiplier);

    this.logger.debug(
      `Travel time calculation: distance=${distanceMeters}m, mode=${transportMode}, pace=${userPace}, baseTime=${baseTravelTime.toFixed(2)}min, multiplier=${multiplier}, totalTime=${travelTime}min`,
    );

    return travelTime;
  }

  // Generate idempotency key to prevent duplicates (3-part key without time to allow rescheduling)
  generateIdempotencyKey(
    tripId: string,
    dayIndex: number,
    activityIndex: number,
  ): string {
    return `${tripId}:${dayIndex}:${activityIndex}`;
  }

  /**
   * Parse time string (e.g. "9:00 AM" or "14:30") to minutes since midnight.
   * @param timeStr - Time string in format "HH:MM [AM|PM]" or "HH:MM"
   * @returns Minutes since midnight (0-1439)
   * @throws BadRequestException if input is null, undefined, or invalid format
   */
  parseActivityTime(timeStr: string): number {
    // Validate input
    if (!timeStr || typeof timeStr !== 'string' || timeStr.trim() === '') {
      const errorMsg = `Invalid time string: ${timeStr}. Must be a non-empty string.`;
      this.logger.error(errorMsg);
      throw new BadRequestException(errorMsg);
    }

    // Parse "9:00 AM" or "14:30" format
    const match = timeStr.match(/(\d{1,2}):(\d{2})(?:\s*(AM|PM))?/i);
    if (!match) {
      const errorMsg = `Failed to parse time string: "${timeStr}". Expected format: "HH:MM [AM|PM]" (e.g., "9:00 AM" or "14:30").`;
      this.logger.error(errorMsg);
      throw new BadRequestException(errorMsg);
    }

    let hours = parseInt(match[1], 10);
    const minutes = parseInt(match[2], 10);
    const period = match[3]?.toUpperCase();

    // Validate ranges
    if (hours < 0 || hours > 23 || minutes < 0 || minutes > 59) {
      const errorMsg = `Time out of range: hours=${hours}, minutes=${minutes}. Hours must be 0-23, minutes must be 0-59.`;
      this.logger.error(errorMsg);
      throw new BadRequestException(errorMsg);
    }

    // Handle 12-hour format
    if (period === 'PM' && hours !== 12) hours += 12;
    if (period === 'AM' && hours === 12) hours = 0;

    const totalMinutes = hours * 60 + minutes;

    this.logger.debug(
      `Parsed activity time: "${timeStr}" -> ${hours}:${minutes.toString().padStart(2, '0')} (${totalMinutes} minutes since midnight)`,
    );

    return totalMinutes;
  }

  /**
   * Check if current time is past the activity time (time-of-day only, ignores date).
   * NOTE: This method only compares time-of-day and does not account for dates.
   * For date-aware comparisons, use shouldLeaveNow() instead.
   * @param activityTimeStr - Time string (e.g., "9:00 AM")
   * @returns True if current time-of-day >= activity time-of-day
   */
  isActivityTime(activityTimeStr: string): boolean {
    const now = new Date();
    const currentMinutes = now.getHours() * 60 + now.getMinutes();
    const activityMinutes = this.parseActivityTime(activityTimeStr);
    const isPast = currentMinutes >= activityMinutes;

    this.logger.debug(
      `isActivityTime check: current=${currentMinutes}min, activity=${activityMinutes}min, isPast=${isPast}`,
    );

    return isPast;
  }

  /**
   * Check if it's time to leave for an activity (considers both date and time).
   * @param activityTimeStr - Activity time in "HH:MM [AM|PM]" or "HH:MM" format
   * @param scheduledDate - Date of the activity (or null for today)
   * @returns True if current date-time >= activity scheduled date-time
   * @throws BadRequestException if time string is invalid
   */
  shouldLeaveNow(
    activityTimeStr: string,
    scheduledDate: Date | null = null,
  ): boolean {
    const targetDate = scheduledDate ? new Date(scheduledDate) : new Date();
    const activityMinutes = this.parseActivityTime(activityTimeStr);

    // Set the activity time on the target date
    targetDate.setHours(
      Math.floor(activityMinutes / 60),
      activityMinutes % 60,
      0,
      0,
    );

    const now = new Date();
    const shouldLeave = now >= targetDate;

    this.logger.debug(
      `shouldLeaveNow check: now=${now.toISOString()}, targetTime=${targetDate.toISOString()}, shouldLeave=${shouldLeave}`,
    );

    return shouldLeave;
  }
}
