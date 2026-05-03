interface ItineraryActivity {
  time?: string;
  activity: string;
  cost?: string;
  healthNote?: string;
  mapQuery?: string;
  placeContext?: any;
}

export function buildEnrichmentPrompt(destination: string, state: string, activities: ItineraryActivity[]): string {
  const activitiesText = activities
    .map((a, i) => `${i + 1}. ${a.activity} (${a.time || 'time TBD'})${a.cost ? ` - ${a.cost}` : ''}`)
    .join('\n');

  return `You are a travel expert enriching an existing trip itinerary with detailed context.

For each activity in the ${destination}, ${state} itinerary below, generate rich context that helps travelers get the most out of their visit. Focus on practical, insider knowledge.

Activities to enrich:
${activitiesText}

For EACH activity, generate a JSON object with:
- whySpecial: One sentence why this place/activity is worth experiencing
- bestTimeToVisit: Best time of day or season for this activity
- suggestedDuration: How long to spend (e.g., "2-3 hours")
- insiderTips: Array of 2-3 practical tips (e.g., wear specific shoes, best photo spot, crowds)
- whatToCarry: Array of 2-3 essential items for this activity
- nearbyAlternative: Optional - a nearby alternative if this is crowded

Format your response as a valid JSON array with objects in the same order as the activities above:
[
  {
    "whySpecial": "...",
    "bestTimeToVisit": "...",
    "suggestedDuration": "...",
    "insiderTips": ["...", "..."],
    "whatToCarry": ["...", "..."],
    "nearbyAlternative": "..."
  },
  ...
]`;
}
