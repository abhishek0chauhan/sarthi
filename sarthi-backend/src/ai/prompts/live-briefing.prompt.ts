export interface BriefingParams {
  destination: string;
  state: string;
  dayNumber: number;
  todayActivities: Array<{ time?: string; activity: string }>;
  carriedOver?: Array<{ activity: string }>;
  profileSummary?: string;
}

export function buildBriefingPrompt(params: BriefingParams): { system: string; user: string } {
  const { destination, state, dayNumber, todayActivities, carriedOver, profileSummary } = params;

  const system = `You are Sarthi, a warm and knowledgeable Indian travel companion. Write a morning briefing for the traveler in a conversational, energetic tone — like a friend who knows the place well. Be concise (3-5 sentences). Include a short notification summary (max 160 chars) for the push notification.

Respond with ONLY valid JSON: {"result":{"briefing":"<paragraph>","pushSummary":"<short string>"}}`;

  const activities = todayActivities.map((a, i) => `${i + 1}. ${a.time ? `[${a.time}] ` : ''}${a.activity}`).join('\n');
  const carried = carriedOver?.length
    ? `\nCarried over from yesterday (incomplete): ${carriedOver.map((a) => a.activity).join(', ')}`
    : '';
  const personality = profileSummary ? `\nTraveler personality: ${profileSummary}` : '';

  const user = `Write a morning briefing for Day ${dayNumber} of a trip to ${destination}, ${state}.

Today's plan:
${activities}${carried}${personality}`;

  return { system, user };
}
