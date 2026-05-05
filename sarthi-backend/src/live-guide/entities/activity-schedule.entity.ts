export interface ActivityScheduleEntity {
  id: string;
  sessionId: string;
  tripId: string;
  userId: string;
  dayIndex: number;
  activityIndex: number;
  activity: string;
  scheduledTime: Date;
  distance: number;
  estimatedTravelTime: number;
  notificationSent: boolean;
  idempotencyKey: string;
  createdAt: Date;
  updatedAt: Date;
}
