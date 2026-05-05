export function buildPersonalizedLocationPrompt(
  destination: string,
  state: string,
  userProfile: any,
  availableMinutes: number,
  nearbyPlaces: any[],
  alreadyPlanned: string[]
): { system: string; user: string } {
  return {
    system: `You are a travel AI that understands regional travel preferences. Generate ONE nearby place suggestion that matches the traveler's style, not just any tourist spot.`,
    user: `Suggest a nearby place for a traveler in ${destination}, ${state}.

**Traveler Profile:**
- Travel pace: ${userProfile.travelPace}
- Interests: ${userProfile.travelMotivations?.join(', ') || 'unknown'}
- Budget style: ${userProfile.spendingStyle}
- Activity level: ${userProfile.physicalReadiness}
- Comfort preference: ${userProfile.comfortLevel}
- Travel style: ${userProfile.depthVsBreadth}
- Crowd tolerance: ${userProfile.crowdTolerance}

**Context:**
- Available time: ${availableMinutes} minutes
- Already planned today: ${alreadyPlanned.join(', ') || 'nothing specific'}

**Nearby places to consider:**
${nearbyPlaces.map((p: any) => `- ${p.name} (${p.type}, ${p.distance}m away)`).join('\n')}

**Generate:**
1. Pick ONE place that matches their style
2. Explain WHY it matches (reference their profile)
3. Include distance and time estimate
4. Score your confidence 0-100

Respond as JSON:
{
  "placeName": "<place name>",
  "reasoning": "<why this matches their style>",
  "distance": <meters>,
  "estimatedTime": <minutes to visit>,
  "confidence": <0-100>
}`,
  };
}
