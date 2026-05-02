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
}

export type ConnectionState = 'idle' | 'connecting' | 'connected' | 'reconnecting';
