export interface Trek {
  name: string;
  region: string;
  state: string;
  baseCamp: string;
  peakAltitude: number;
  difficulty:
    | 'easy'
    | 'easy_to_moderate'
    | 'moderate'
    | 'moderate_to_difficult'
    | 'difficult';
  durationDays: number;
  bestMonths: number[];
  terrain: string[];
  highlights: string[];
  nearestCity: string;
  permits: boolean;
  fitnessDemand: string;
}
