export interface TasteProfile { spicy: number; salty: number; sweet: number; sour: number; umami: number }

export interface Dish {
  name: string;
  description: string;
  where: string;
  priceRange: string;
  spiceLevel: string;
  healthNote?: string;
  allergens?: string[];
  allergyAlert?: string;
  tasteProfile?: TasteProfile;
}

export interface HealthConsciousDish {
  name: string;
  description: string;
  healthNote?: string;
  allergens?: string[];
  allergyAlert?: string;
  tasteProfile?: TasteProfile;
}

export interface StreetFoodItem {
  name: string;
  where: string;
  price: string;
  healthNote?: string;
  allergens?: string[];
  allergyAlert?: string;
  tasteProfile?: TasteProfile;
}

export interface MealSuggestion { suggestion: string; cost: string; healthNote?: string }

export interface MealPlanDay {
  day: number;
  breakfast: MealSuggestion;
  lunch: MealSuggestion;
  dinner: MealSuggestion;
}

export interface FoodGuideData {
  destination: string;
  overview: string;
  mustTryDishes: Dish[];
  healthConscious: HealthConsciousDish[];
  streetFood: { safetyTips: string[]; items: StreetFoodItem[] };
  mealPlan: MealPlanDay[];
  dietaryInfo: { vegFriendly: string; veganOptions: string; halalAvailability: string; waterAdvice: string };
}
