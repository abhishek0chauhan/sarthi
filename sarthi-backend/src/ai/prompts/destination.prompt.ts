export interface CompactDestination {
  id: string;
  name: string;
  state: string;
  experienceTypes: string[];
  isHiddenGem: boolean;
  weatherSummary: string;
  budgetMin: number;
  budgetMax: number;
}

export interface HealthProfile {
  gender?: string;
  age?: number;
  weight?: number;
  height?: number;
  medicalConditions?: string[];
}

export interface PromptParams extends HealthProfile {
  freeText: string;
  group: { size: number; type: string };
  budget: { min: number; max: number };
  dates: { from: string; to: string };
  departureCity: string;
  hiddenGem?: boolean;
}

const SYSTEM_PROMPT = 'You are a travel recommendation engine for Indian destinations. You also assess health and fitness suitability for each destination based on the traveler\'s profile.';

export function computeBmi(weight: number, heightCm: number): number {
  const heightM = heightCm / 100;
  return Math.round((weight / (heightM * heightM)) * 10) / 10;
}

export function computeTripDays(dates: { from: string; to: string }): number {
  const from = new Date(dates.from);
  const to = new Date(dates.to);
  return Math.ceil((to.getTime() - from.getTime()) / 86_400_000) + 1;
}

const MONTH_NAMES = [
  'January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December',
];

export function monthNameFromDate(dateStr: string): string {
  const d = new Date(dateStr);
  if (isNaN(d.getTime())) {
    throw new Error(`monthNameFromDate: invalid date "${dateStr}"`);
  }
  return MONTH_NAMES[d.getMonth()];
}

const GROUP_HINTS: Record<string, string> = {
  solo:    'prioritize safe, social destinations with good transport connectivity',
  couple:  'prioritize romantic, scenic stays and intimate experiences',
  friends: 'prioritize nightlife, adventure activities, and shared experiences',
  family:  'prioritize kid-friendly activities and accessible family stays',
};

const GROUP_HINT_FALLBACK = "tailor to the group's vibe";

export interface SearchContextParams {
  dates: { from: string; to: string };
  group: { size: number; type: string };
  budget: { min: number; max: number };
  departureCity: string;
  hiddenGem?: boolean;
}

export interface SearchContextOptions {
  mode?: 'destination' | 'trek';
}

export function buildSearchContext(
  params: SearchContextParams,
  options: SearchContextOptions = {},
): string {
  const mode = options.mode ?? 'destination';
  const tripDays = computeTripDays(params.dates);
  const monthName = monthNameFromDate(params.dates.from);
  const groupHint = GROUP_HINTS[params.group.type] ?? GROUP_HINT_FALLBACK;

  const seasonRule = mode === 'trek'
    ? `- Season: Flag any trek where conditions in ${monthName} are borderline (late-season snow, early-season monsoon) in healthAdvisory.alerts.`
    : `- Season: If ${monthName} is sub-optimal for a destination (peak summer heat in the plains, monsoon flooding in the ghats, winter closures in the hills), surface it in weatherSnapshot and healthAdvisory.alerts. Do not pretend the weather is pleasant when it isn't.`;

  const nearbyGemsRule = (() => {
    if (mode === 'trek') return '';
    if (params.hiddenGem) {
      return `\n- Hidden gems ONLY: User explicitly requested offbeat destinations. Recommend ONLY lesser-known places. Avoid mainstream tourist circuits (e.g., Jaipur, Manali, Goa, Udaipur, Varanasi, Rishikesh, Agra, Shimla, Ooty). Prefer offbeat options (e.g., Champaner, Gokarna, Spiti, Araku Valley, Majuli, Chopta, Kasol, Polo Forest, Gandikota). Set "isHiddenGem": true for all results. If the budget/date constraints make true hidden gems scarce, pick the least-touristy option available and explain the trade-off in whyItMatches.`;
    }
    return `\n- Nearby gems: Surface at least one less-touristy option within easy reach of ${params.departureCity} when possible (set isHiddenGem: true).`;
  })();

  return `## Context
- Trip length: ${tripDays} days (${params.dates.from} to ${params.dates.to})
- Travel month: ${monthName}
- Departure city: ${params.departureCity}
- Group: ${params.group.size} ${params.group.type} — ${groupHint}
- Budget: ₹${params.budget.min}–${params.budget.max}/person total

## Rules
- Proximity: Prefer destinations reachable within 6–8h of ${params.departureCity}. For trips of ≤3 days, avoid destinations that need >4h one-way travel — it eats into the trip. Flag long travel in tripReadiness (e.g. "6h each way leaves only 1 full day onsite").
${seasonRule}
- Group-fit: Tailor picks to the group type — do not recommend backpacker hostels to a family or temple tours to a friends trip unless explicitly requested.
- Budget: If realistic cost exceeds ₹${params.budget.min}–${params.budget.max}/person, set costBreakdown.total to the honest number and explain the gap in tripReadiness.budget (e.g. "₹2000 over — drop to budget guesthouses and local transport to fit").${nearbyGemsRule}`;
}

function buildHealthContext(params: HealthProfile): string {
  const lines: string[] = [];

  if (params.gender) lines.push(`Gender: ${params.gender}`);
  if (params.age) lines.push(`Age: ${params.age}`);

  if (params.weight && params.height) {
    const bmi = computeBmi(params.weight, params.height);
    lines.push(`BMI: ${bmi} (${params.weight}kg, ${params.height}cm)`);
  } else {
    if (params.weight) lines.push(`Weight: ${params.weight}kg`);
    if (params.height) lines.push(`Height: ${params.height}cm`);
  }

  if (params.medicalConditions?.length) {
    lines.push(`Medical conditions: ${params.medicalConditions.join(', ')}`);
  }

  return lines.length > 0 ? `\nTraveler health profile: ${lines.join(' | ')}` : '';
}

const HEALTH_ADVISORY_FORMAT = `"healthAdvisory":{"suitability":"<easy|moderate|challenging|not_recommended>","altitude":"<altitude info or Sea level>","physicalDemand":"<physical effort description>","alerts":["<health/safety warning>"],"prepTips":["<exercise or preparation tip>"]}`;

const COST_BREAKDOWN_FORMAT = `"costBreakdown":{"transport":"<₹ amount>","stay":"<₹ amount (N nights)>","food":"<₹ amount>","activities":"<₹ amount>","total":"<₹ total>"}`;

const PERMITS_FORMAT = `"permits":{"required":<true/false>,"documents":["<permit name if required>"],"notes":"<how to obtain or empty string>"}`;

const TRIP_READINESS_FORMAT = `"tripReadiness":{"score":<0-100>,"label":"<Ready/Needs Preparation/Not Recommended>","fitness":"<one line>","weather":"<one line>","documents":"<one line>","budget":"<one line>","actionItems":["<action item>"]}`;

export function buildHybridPrompt(
  params: PromptParams & { destinations: CompactDestination[] },
): { system: string; user: string } {
  const destinationList = params.destinations
    .map(d => `  {"id":"${d.id}","name":"${d.name}","state":"${d.state}"}`)
    .join(',\n');

  const healthContext = buildHealthContext(params);
  const searchContext = buildSearchContext(params);

  return {
    system: SYSTEM_PROMPT,
    user: `Traveler: ${params.freeText}${healthContext}

${searchContext}

Rank these destinations best to worst match and write one sentence explaining why each matches.
For each destination, assess health/fitness suitability based on the traveler's profile.
Destinations:
[
${destinationList}
]

Respond ONLY with a JSON object in exactly this format (no extra text):
{"rankings":[{"id":"<exact id from above>","whyItMatches":"<one sentence>",${HEALTH_ADVISORY_FORMAT},${COST_BREAKDOWN_FORMAT},${PERMITS_FORMAT},${TRIP_READINESS_FORMAT}}]}

Max 5 results, best match first.`,
  };
}

export function buildAiFullPrompt(params: PromptParams): { system: string; user: string } {
  const healthContext = buildHealthContext(params);
  const searchContext = buildSearchContext(params);

  return {
    system: SYSTEM_PROMPT,
    user: `Traveler: ${params.freeText}${healthContext}

${searchContext}

Recommend up to 5 Indian travel destinations that best match this traveler.
For each destination, assess health/fitness suitability based on the traveler's profile.

Respond ONLY with a JSON object in exactly this format (no extra text):
{"destinations":[{"name":"<city>","state":"<state>","isHiddenGem":<true/false>,"budgetEstimate":"<e.g. ₹8000-15000/person>","weatherSnapshot":"<one sentence>","travelTime":"<e.g. 2h flight from Mumbai>","highlights":["<highlight1>","<highlight2>","<highlight3>"],"whyItMatches":"<one sentence>",${HEALTH_ADVISORY_FORMAT},${COST_BREAKDOWN_FORMAT},${PERMITS_FORMAT},${TRIP_READINESS_FORMAT}}]}`,
  };
}

export interface ItineraryParams extends HealthProfile {
  destination: string;
  state: string;
  freeText: string;
  group: { size: number; type: string };
  budget: { min: number; max: number };
  dates: { from: string; to: string };
  departureCity: string;
  travelMode?: string;
}

export function buildItineraryPrompt(params: ItineraryParams): { system: string; user: string } {
  const travelerProfile = [
    `Group: ${params.group.size} ${params.group.type}`,
    `Budget: ₹${params.budget.min}–${params.budget.max}/person`,
    `Dates: ${params.dates.from} to ${params.dates.to}`,
    `From: ${params.departureCity}`,
  ].join(' | ');

  const healthContext = buildHealthContext(params);
  const travelLine = params.travelMode
    ? `\nTraveler is arriving by ${params.travelMode} from ${params.departureCity}.`
    : '';
  const numDays = Math.ceil(
    (new Date(params.dates.to).getTime() - new Date(params.dates.from).getTime()) / 86400000,
  ) + 1;

  return {
    system: 'You are an expert Indian travel itinerary planner. You create detailed day-by-day plans personalized to the traveler\'s health, budget, and interests.',
    user: `Plan a ${numDays}-day itinerary for ${params.destination}, ${params.state}.
Traveler: ${params.freeText}
${travelerProfile}${healthContext}${travelLine}

Create a detailed day-by-day plan with specific activities, timings, meal suggestions with costs, and health notes.

Respond ONLY with a JSON object in exactly this format (no extra text):
{"result":{"destination":"${params.destination}","totalEstimate":"<₹ total for group>","itinerary":[{"day":<number>,"title":"<day theme>","activities":[{"time":"<HH:MM AM/PM>","activity":"<description>","cost":"<₹ amount>","healthNote":"<note or empty>"}],"meals":{"breakfast":"<₹cost — suggestion>","lunch":"<₹cost — suggestion>","dinner":"<₹cost — suggestion>"},"healthNote":"<overall day health note>"}],"packingList":["<item>"],${HEALTH_ADVISORY_FORMAT},${PERMITS_FORMAT}}}`,
  };
}

export interface FoodGuideParams extends HealthProfile {
  destination: string;
  state: string;
  freeText: string;
  group: { size: number; type: string };
  dates: { from: string; to: string };
  departureCity: string;
  dietType?: string;
  spiceTolerance?: string;
  foodBudget?: string;
  allergies?: string[];
  cuisinePreferences?: string[];
  cookingStyles?: string[];
  flavorPreferences?: string[];
  adventurousness?: string;
  favoriteDishes?: string;
  meatPreferences?: string[];
}

export function buildTasteProfileBlock(params: FoodGuideParams): string {
  const hasAny =
    params.cuisinePreferences?.length ||
    params.cookingStyles?.length ||
    params.flavorPreferences?.length ||
    params.adventurousness ||
    params.favoriteDishes ||
    params.meatPreferences?.length;

  if (!hasAny) return '';

  const lines = [
    params.cuisinePreferences?.length && `- Cuisines: ${params.cuisinePreferences.join(', ')}`,
    params.cookingStyles?.length && `- Cooking styles: ${params.cookingStyles.join(', ')}`,
    params.flavorPreferences?.length && `- Flavors: ${params.flavorPreferences.join(', ')}`,
    params.adventurousness && `- Adventurousness: ${params.adventurousness}`,
    params.favoriteDishes && `- Favorite dishes: ${params.favoriteDishes}`,
    params.meatPreferences?.length && `- Meat preferences: ${params.meatPreferences.join(', ')}`,
  ].filter(Boolean).join('\n');

  return `\n## Taste Profile\n${lines}`;
}

export function buildFoodGuidePrompt(params: FoodGuideParams): { system: string; user: string } {
  const healthContext = buildHealthContext(params);
  const numDays = Math.ceil(
    (new Date(params.dates.to).getTime() - new Date(params.dates.from).getTime()) / 86400000,
  ) + 1;

  const dietLines: string[] = [];
  if (params.dietType) dietLines.push(`Diet: ${params.dietType}`);
  if (params.spiceTolerance) dietLines.push(`Spice tolerance: ${params.spiceTolerance}`);
  if (params.foodBudget) dietLines.push(`Food budget: ${params.foodBudget}`);
  if (params.allergies?.length) dietLines.push(`Allergies: ${params.allergies.join(', ')}`);
  const dietContext = dietLines.length > 0 ? `\nFood preferences: ${dietLines.join(' | ')}` : '';

  const tasteProfileBlock = buildTasteProfileBlock(params);

  const allergyAlertRule = params.allergies?.length
    ? `- allergyAlert: string (ONLY include if this dish contains one or more of these exact allergens: [${params.allergies.join(', ')}]. Cross-reference dish ingredients against this list only. If none match, omit the field. Format: "⚠️ Contains X — listed in your allergies")`
    : `- allergyAlert: omit this field (no allergies specified by this traveler)`;

  return {
    system: 'You are an expert Indian food and travel cuisine guide. You recommend local food personalized to the traveler\'s health conditions, dietary preferences, and allergies.',
    user: `Create a personalized food guide for ${params.destination}, ${params.state} (${numDays} days).
Traveler: ${params.freeText}
Group: ${params.group.size} ${params.group.type} | From: ${params.departureCity}${dietContext}${healthContext}${tasteProfileBlock}

## Rules
- For each dish in mustTryDishes, healthConscious, and streetFood.items, populate:
  - allergens: string[] (list major allergens present in the dish; empty array if none)
  ${allergyAlertRule}
  - tasteProfile: { sweet, spicy, sour, salty, umami } — each integer 0-5
- When Taste Profile is present, prioritize dishes matching cuisines/cooking styles/flavors.
- For non-veg travelers with meatPreferences, bias toward those meats; skip meats they don't eat.
- adventurousness=familiar → prefer widely-known dishes; very_adventurous → include niche local specialties.
- mealPlan entries do NOT need allergens or tasteProfile (keep lean).

Respond ONLY with a JSON object in exactly this format (no extra text):
{"result":{"destination":"${params.destination}","overview":"<2-3 sentences about local cuisine + health-aware notes>","mustTryDishes":[{"name":"<dish>","description":"<one line>","where":"<restaurant/area>","priceRange":"<₹ range>","spiceLevel":"<mild/medium/hot>","healthNote":"<health advice for this traveler>","allergens":["<allergen>"],"allergyAlert":"<alert or omit>","tasteProfile":{"sweet":<0-5>,"spicy":<0-5>,"sour":<0-5>,"salty":<0-5>,"umami":<0-5>}}],"healthConscious":[{"name":"<dish>","description":"<one line>","healthNote":"<why it's healthy>","allergens":["<allergen>"],"allergyAlert":"<alert or omit>","tasteProfile":{"sweet":<0-5>,"spicy":<0-5>,"sour":<0-5>,"salty":<0-5>,"umami":<0-5>}}],"streetFood":{"safetyTips":["<tip>"],"items":[{"name":"<item>","where":"<location>","price":"<₹>","healthNote":"<note>","allergens":["<allergen>"],"allergyAlert":"<alert or omit>","tasteProfile":{"sweet":<0-5>,"spicy":<0-5>,"sour":<0-5>,"salty":<0-5>,"umami":<0-5>}}]},"mealPlan":[{"day":<number>,"breakfast":{"suggestion":"<what>","cost":"<₹>","healthNote":"<note>"},"lunch":{"suggestion":"<what>","cost":"<₹>","healthNote":"<note>"},"dinner":{"suggestion":"<what>","cost":"<₹>","healthNote":"<note>"}}],"dietaryInfo":{"vegFriendly":"<assessment>","veganOptions":"<assessment>","halalAvailability":"<assessment>","waterAdvice":"<advice>"}}}

Include 5-8 must-try dishes, 2-3 healthy alternatives, 3-5 street food items, and a ${numDays}-day meal plan.`,
  };
}

export interface TrekPromptParams extends HealthProfile {
  freeText: string;
  group: { size: number; type: string };
  budget: { min: number; max: number };
  dates: { from: string; to: string };
  departureCity: string;
  treks: Array<{
    name: string;
    region: string;
    state: string;
    baseCamp: string;
    peakAltitude: number; // raw number from dataset; AI returns formatted string (e.g. "4,270m") — trekResultSchema uses z.string()
    difficulty: string;
    durationDays: number; // raw number; AI returns formatted string (e.g. "5 days")
    bestMonths: number[];
    terrain: string[];
    highlights: string[];
    nearestCity: string;
    permits: boolean;
    fitnessDemand: string;
  }>;
}

export function buildTrekPrompt(params: TrekPromptParams): { system: string; user: string } {
  const healthContext = buildHealthContext(params);
  const searchContext = buildSearchContext(params, { mode: 'trek' });

  const trekList = params.treks
    .map(t => `  - ${t.name} | ${t.region} | ${t.peakAltitude}m | ${t.difficulty} | ${t.durationDays} days | Base: ${t.baseCamp} | Nearest city: ${t.nearestCity} | Terrain: ${t.terrain.join(', ')} | Highlights: ${t.highlights.join(', ')} | Permits: ${t.permits ? 'Yes' : 'No'} | Fitness: ${t.fitnessDemand}`)
    .join('\n');

  return {
    system: 'You are an expert Indian trek recommendation engine. You recommend specific named treks (not cities) based on the traveler\'s fitness, experience, dates, and preferences. You assess health and fitness suitability for each trek.',
    user: `Traveler: ${params.freeText}${healthContext}

${searchContext}

Recommend the best matching treks from this list. Rank best match first. For each, explain why it matches and assess health/fitness suitability.

Available treks:
${trekList}

Respond ONLY with a JSON object in exactly this format (no extra text):
{"treks":[{"name":"<exact trek name from above>","region":"<region>","baseCamp":"<base camp>","peakAltitude":"<e.g. 4,270m>","difficulty":"<difficulty>","durationDays":"<e.g. 5 days>","terrain":"<terrain summary>","whyItMatches":"<one sentence personalized to this traveler>","highlights":["<highlight1>","<highlight2>"],${HEALTH_ADVISORY_FORMAT},${COST_BREAKDOWN_FORMAT},${PERMITS_FORMAT},${TRIP_READINESS_FORMAT}}]}

Max 5 results, best match first.`,
  };
}
