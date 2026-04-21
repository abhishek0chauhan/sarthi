import { z } from 'zod';

// AI models sometimes return a single string instead of an array — coerce gracefully
const stringArray = z.preprocess(
  (v) => {
    if (Array.isArray(v)) return v;
    if (typeof v === 'string') return v.length ? [v] : [];
    return [];
  },
  z.array(z.string()),
);

// AI models sometimes return "true"/"false" strings instead of booleans
const coercedBoolean = z.preprocess(
  (v) => {
    if (typeof v === 'boolean') return v;
    if (v === 'true' || v === '1' || v === 1) return true;
    return false;
  },
  z.boolean(),
);

// AI models sometimes return free-form suitability strings — map to nearest valid value
const suitabilityEnum = z.preprocess(
  (v) => {
    if (typeof v !== 'string') return 'moderate';
    const s = v.toLowerCase();
    if (s === 'easy' || s.includes('easy') || s.includes('low')) return 'easy';
    if (s === 'not_recommended' || s.includes('not rec') || s.includes('avoid')) return 'not_recommended';
    if (s === 'challenging' || s.includes('challeng') || s.includes('hard') || s.includes('difficult') || s.includes('strenuous')) return 'challenging';
    return 'moderate';
  },
  z.enum(['easy', 'moderate', 'challenging', 'not_recommended']),
);

export const healthAdvisorySchema = z.object({
  suitability: suitabilityEnum,
  altitude: z.string(),
  physicalDemand: z.string(),
  alerts: stringArray,
  prepTips: stringArray,
});

export const costBreakdownSchema = z.object({
  transport: z.string(),
  stay: z.string(),
  food: z.string(),
  activities: z.string(),
  total: z.string(),
});

export const permitsSchema = z.object({
  required: z.boolean(),
  documents: stringArray,
  notes: z.string(),
});

export const tripReadinessSchema = z.object({
  score: z.number().min(0).max(100),
  label: z.string(),
  fitness: z.string(),
  weather: z.string(),
  documents: z.string(),
  budget: z.string(),
  actionItems: stringArray,
});

export const rankResultSchema = z.object({
  id: z.string(),
  whyItMatches: z.string(),
  healthAdvisory: healthAdvisorySchema,
  costBreakdown: costBreakdownSchema,
  permits: permitsSchema,
  tripReadiness: tripReadinessSchema,
});

export const rankResultsSchema = z.object({
  rankings: z.array(rankResultSchema),
});

export const generateResultSchema = z.object({
  name: z.string(),
  state: z.string(),
  isHiddenGem: coercedBoolean,
  budgetEstimate: z.string(),
  weatherSnapshot: z.string(),
  travelTime: z.string(),
  highlights: stringArray,
  whyItMatches: z.string(),
  healthAdvisory: healthAdvisorySchema,
  costBreakdown: costBreakdownSchema,
  permits: permitsSchema,
  tripReadiness: tripReadinessSchema,
});

export const generateResultsSchema = z.object({
  destinations: z.array(generateResultSchema),
});

export const trekResultSchema = z.object({
  name: z.string(),
  region: z.string(),
  baseCamp: z.string(),
  peakAltitude: z.string(),
  difficulty: z.string(),
  durationDays: z.string(),
  terrain: z.string(),
  whyItMatches: z.string(),
  highlights: stringArray,
  healthAdvisory: healthAdvisorySchema,
  costBreakdown: costBreakdownSchema,
  permits: permitsSchema,
  tripReadiness: tripReadinessSchema,
});

export const trekResultsSchema = z.object({
  treks: z.array(trekResultSchema),
});

export const itineraryActivitySchema = z.object({
  time: z.string(),
  activity: z.string(),
  cost: z.string(),
  healthNote: z.string(),
});

export const itineraryMealsSchema = z.object({
  breakfast: z.string(),
  lunch: z.string(),
  dinner: z.string(),
});

export const itineraryDaySchema = z.object({
  day: z.number(),
  title: z.string(),
  activities: z.array(itineraryActivitySchema),
  meals: itineraryMealsSchema,
  healthNote: z.string(),
});

export const itineraryResponseSchema = z.object({
  destination: z.string(),
  totalEstimate: z.string(),
  itinerary: z.array(itineraryDaySchema),
  packingList: z.array(z.string()),
  healthAdvisory: healthAdvisorySchema,
  permits: permitsSchema,
});

export const itineraryResponseWrapperSchema = z.object({
  result: itineraryResponseSchema,
});

export const tasteProfileSchema = z.object({
  sweet: z.number().min(0).max(5).default(0),
  spicy: z.number().min(0).max(5).default(0),
  sour: z.number().min(0).max(5).default(0),
  salty: z.number().min(0).max(5).default(0),
  umami: z.number().min(0).max(5).default(0),
}).default({ sweet: 0, spicy: 0, sour: 0, salty: 0, umami: 0 });

export const dishSchema = z.object({
  name: z.string(),
  description: z.string(),
  where: z.string(),
  priceRange: z.string(),
  spiceLevel: z.string(),
  healthNote: z.string(),
  allergens: z.preprocess((v) => { if (Array.isArray(v)) return v; if (typeof v === 'string') return v.length ? [v] : []; return []; }, z.array(z.string())).default([]),
  allergyAlert: z.string().optional(),
  tasteProfile: tasteProfileSchema,
});

export const healthConsciousDishSchema = z.object({
  name: z.string(),
  description: z.string(),
  healthNote: z.string(),
  allergens: z.preprocess((v) => { if (Array.isArray(v)) return v; if (typeof v === 'string') return v.length ? [v] : []; return []; }, z.array(z.string())).default([]),
  allergyAlert: z.string().optional(),
  tasteProfile: tasteProfileSchema,
});

export const streetFoodItemSchema = z.object({
  name: z.string(),
  where: z.string(),
  price: z.string(),
  healthNote: z.string(),
  allergens: z.preprocess((v) => { if (Array.isArray(v)) return v; if (typeof v === 'string') return v.length ? [v] : []; return []; }, z.array(z.string())).default([]),
  allergyAlert: z.string().optional(),
  tasteProfile: tasteProfileSchema,
});

export const mealSuggestionSchema = z.object({
  suggestion: z.string(),
  cost: z.string(),
  healthNote: z.string(),
});

export const dailyMealPlanSchema = z.object({
  day: z.number(),
  breakfast: mealSuggestionSchema,
  lunch: mealSuggestionSchema,
  dinner: mealSuggestionSchema,
});

export const foodGuideResponseSchema = z.object({
  destination: z.string(),
  overview: z.string(),
  mustTryDishes: z.array(dishSchema),
  healthConscious: z.array(healthConsciousDishSchema),
  streetFood: z.object({
    safetyTips: z.array(z.string()),
    items: z.array(streetFoodItemSchema),
  }),
  mealPlan: z.array(dailyMealPlanSchema),
  dietaryInfo: z.object({
    vegFriendly: z.string(),
    veganOptions: z.string(),
    halalAvailability: z.string(),
    waterAdvice: z.string(),
  }),
});

export const foodGuideResponseWrapperSchema = z.object({
  result: foodGuideResponseSchema,
});

export type HealthAdvisory = z.infer<typeof healthAdvisorySchema>;
export type RankResult = z.infer<typeof rankResultSchema>;
export type GenerateResult = z.infer<typeof generateResultSchema>;
export type CostBreakdown = z.infer<typeof costBreakdownSchema>;
export type Permits = z.infer<typeof permitsSchema>;
export type TripReadiness = z.infer<typeof tripReadinessSchema>;
export type TrekResult = z.infer<typeof trekResultSchema>;
export type TrekResults = z.infer<typeof trekResultsSchema>;
export type ItineraryResponse = z.infer<typeof itineraryResponseSchema>;
export type FoodGuideResponse = z.infer<typeof foodGuideResponseSchema>;
export type TasteProfile = z.infer<typeof tasteProfileSchema>;
