/**
 * DTO for a scheduled activity returned from the activity schedule endpoint.
 * Represents a notification that has not yet been sent to the user.
 */
export class ScheduledActivityDto {
  /** Index of the activity in the day's itinerary */
  activityIndex: number;

  /** Activity name/description */
  activity: string;

  /** Unix timestamp in milliseconds when the user should leave for this activity */
  scheduledTime: number;

  /** Distance to activity location in meters */
  distance: number;

  /** Estimated travel time to activity in minutes (includes user's pace-based buffer) */
  estimatedTravelTime: number;
}

/**
 * Response DTO for the GET /trips/{tripId}/activity-schedule endpoint.
 * Contains all unsent activity notifications for a trip, ordered by scheduled time.
 */
export class ActivityScheduleResponseDto {
  /** Array of scheduled activities, sorted by scheduled time (earliest first) */
  scheduledActivities: ScheduledActivityDto[];
}
