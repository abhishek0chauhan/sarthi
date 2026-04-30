export interface LocationSuggestionParams {
  destination: string;
  state: string;
  lat: number;
  lng: number;
  existingActivities: string[];
  profileSummary?: string;
}

export function buildLocationSuggestionPrompt(params: LocationSuggestionParams): { system: string; user: string } {
  const { destination, state, lat, lng, existingActivities, profileSummary } = params;

  const system = `You are Sarthi, an expert local guide. Suggest one interesting nearby place the traveler could visit right now — something not already in their plan. Be specific about the place name and keep the suggestion brief and enthusiastic.

Respond with ONLY valid JSON: {"result":{"suggestion":"<why visit + what to expect>","placeName":"<name>","mapQuery":"<place name, area, city>","pushSummary":"<max 160 chars>"}}`;

  const existing = existingActivities.length
    ? `Already in plan (don't suggest these): ${existingActivities.join(', ')}`
    : '';

  const personality = profileSummary ? `Traveler personality: ${profileSummary}` : '';

  const user = `The traveler is near ${destination}, ${state} (lat: ${lat.toFixed(4)}, lng: ${lng.toFixed(4)}).
${existing}
${personality}

Suggest one interesting place within ~2km they could visit now.`;

  return { system, user };
}
