import { IsNumber, IsString, IsArray } from 'class-validator';

/**
 * DTO for a scheduled activity returned from the activity schedule endpoint.
 * Represents a notification that has not yet been sent to the user.
 */
export class ScheduledActivityDto {
  /**
   * Index of this activity in the itinerary
   * @example 0
   */
  @IsNumber()
  activityIndex: number;

  /**
   * Name/description of the activity
   * @example Visit Gateway of India
   */
  @IsString()
  activity: string;

  /**
   * Unix timestamp (milliseconds) when user should be notified
   * @example 1714982400000
   */
  @IsNumber()
  scheduledTime: number;

  /**
   * Estimated distance in meters
   * @example 2400
   */
  @IsNumber()
  distance: number;

  /**
   * Estimated travel time in minutes
   * @example 15
   */
  @IsNumber()
  estimatedTravelTime: number;
}

/**
 * Response DTO for the GET /trips/{tripId}/activity-schedule endpoint.
 * Contains all unsent activity notifications for a trip, ordered by scheduled time.
 */
export class ActivityScheduleResponseDto {
  /**
   * Array of scheduled activities, sorted by scheduled time (earliest first)
   */
  @IsArray()
  scheduledActivities: ScheduledActivityDto[];
}
