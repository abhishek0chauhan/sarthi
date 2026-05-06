export interface ReplanParams {
  destination: string;
  currentTime: string;
  remainingActivities: Array<{
    time?: string;
    activity: string;
    mapQuery?: string;
  }>;
  triggeredBy: 'finished_early' | 'skip' | 'manual';
  profileSummary?: string;
}

export function buildReplanPrompt(params: ReplanParams): {
  system: string;
  user: string;
} {
  const {
    destination,
    currentTime,
    remainingActivities,
    triggeredBy,
    profileSummary,
  } = params;

  const system = `You are Sarthi, a smart Indian travel planner. Reorder the remaining activities for today given the traveler's current time. You may drop activities if there is clearly not enough time. Return only the activities that can realistically be done. Set dropped:true for any you are removing.

Respond with ONLY valid JSON: {"result":{"activities":[{"time":"<HH:MM>","activity":"<name>","cost":"<est>","healthNote":"<note>","mapQuery":"<place, city>","dropped":<bool>}]}}`;

  const acts = remainingActivities
    .map((a, i) => `${i + 1}. ${a.time ? `[${a.time}] ` : ''}${a.activity}`)
    .join('\n');

  const reason =
    triggeredBy === 'finished_early'
      ? 'The traveler finished an activity early.'
      : triggeredBy === 'skip'
        ? 'The traveler skipped an activity.'
        : 'The traveler manually requested a replan.';

  const personality = profileSummary
    ? `\nTraveler personality: ${profileSummary}`
    : '';

  const user = `Replan the rest of Day for a trip to ${destination}.
Current time: ${currentTime}
Reason: ${reason}${personality}

Remaining activities to reorder/trim:
${acts}`;

  return { system, user };
}
