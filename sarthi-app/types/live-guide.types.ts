export interface Activity {
  time: string;
  activity: string;
  cost: number;
  healthNote?: string;
  mapQuery?: string;
  dropped?: boolean;
  status: 'pending' | 'done' | 'skipped';
}

export interface Suggestion {
  suggestion: string;
  placeName: string;
  mapQuery: string;
  reasoning?: string;
  estimatedTravelTime?: number;
  matchScore?: number;
}

export interface ActivityApproachingAlert {
  activityIndex: number;
  activity: string;
  distance: number;
  estimatedTravelTime: number;
  mapQuery: string;
}

export interface ActivityScheduleEntry {
  activityIndex: number;
  activity: string;
  scheduledTime: number;
  distance: number;
  estimatedTravelTime: number;
}

export interface GuideActivatedPayload {
  sessionId: string;
  status: 'before' | 'during' | 'after';
  briefing: string | null;
  pushSummary: string | null;
  // Never truly null — backend spreads null into { dayIndex }.
  // Check !todayPlan?.activities?.length for empty state.
  todayPlan: {
    dayIndex: number;
    activities?: Activity[];
  };
  // Persisted done/skipped statuses so reconnect restores progress
  activityStatus?: Record<string, 'done' | 'skipped' | 'pending'>;
}

export type ConnectionState = 'idle' | 'connecting' | 'connected' | 'reconnecting';
