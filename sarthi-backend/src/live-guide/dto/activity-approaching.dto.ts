export class ActivityApproachingDto {
  activityIndex: number;
  activity: string;
  timeToLeave: number;        // Unix timestamp ms
  distance: number;           // meters
  estimatedTravelTime: number; // minutes
  mapQuery: string;
  travelPaceAdjustment: string;
}

export interface ScheduledActivityRecord {
  activityIndex: number;
  activity: string;
  scheduledTime: number;
  distance: number;
  estimatedTravelTime: number;
  idempotencyKey: string;
}
