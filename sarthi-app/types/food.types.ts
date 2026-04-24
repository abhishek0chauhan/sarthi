export interface TasteProfile { spicy: number; salty: number; sweet: number; sour: number; umami: number }

export interface Dish {
  name: string;
  description: string;
  where: string;
  cost: string;
  spiceLevel: string;
  dietaryInfo?: string[];
  tasteProfile?: TasteProfile;
  allergyWarning?: string;
}

export interface StreetFoodItem { name: string; where: string; cost: string; safetyTip?: string }

export interface MealSuggestion { meal: string; dish: string; where: string; cost: string }

export interface MealPlanDay { day: number; meals: MealSuggestion[] }

export interface FoodGuideData {
  overview: string;
  mustTryDishes: Dish[];
  streetFood: { safetyTips: string; items: StreetFoodItem[] };
  mealPlan: MealPlanDay[];
  dietaryInfo: { vegFriendly: string; veganOptions: string; halalOptions?: string; allergyNotes?: string };
}
