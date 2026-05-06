/**
 * Enum for travel pace adjustment levels.
 * Affects buffer multiplier applied to calculated travel times.
 */
export enum TravelPace {
  /** Tight schedule, minimal buffer (1.0x multiplier) */
  NO_PLAN = 'no_plan',

  /** Moderate schedule, standard buffer (1.1x multiplier) */
  LOOSE = 'loose',

  /** Tight schedule, maximum buffer (1.2x multiplier) */
  PACKED = 'packed',
}

/**
 * DTO for activity approaching notification.
 * Sent to user when they need to leave for the next activity.
 */
export class ActivityApproachingDto {
  /** Index of the activity in the day's itinerary */
  activityIndex: number;

  /** Activity name/description */
  activity: string;

  /** Unix timestamp in milliseconds indicating when to leave */
  timeToLeave: number;

  /** Distance to activity location in meters */
  distance: number;

  /** Estimated travel time in minutes (includes pace-based buffer) */
  estimatedTravelTime: number;

  /** Map query/location of the activity */
  mapQuery: string;

  /** Travel pace adjustment level for this user */
  travelPaceAdjustment: TravelPace;
}

/**
 * Internal record of a scheduled activity for tracking and deduplication.
 */
export interface ScheduledActivityRecord {
  activityIndex: number;
  activity: string;
  scheduledTime: number;
  distance: number;
  estimatedTravelTime: number;
  idempotencyKey: string;
}
