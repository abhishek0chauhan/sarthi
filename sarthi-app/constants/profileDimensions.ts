export const DIMENSION_LABELS = {
  travelPace: {
    label: 'Travel Pace',
    values: { packed: 'Packed schedule', loose: 'Loose plan', no_plan: 'No plan' },
  },
  depthVsBreadth: {
    label: 'Style',
    values: { deep: 'Deep explorer', balanced: 'Balanced', cover: 'Cover as much as possible' },
  },
  comfortLevel: {
    label: 'Stay Preference',
    values: { hotel: 'Hotel', homestay: 'Homestay', rough: 'Rough it' },
  },
  crowdTolerance: {
    label: 'Crowd Tolerance',
    values: { worth_it: 'Worth the crowds', hidden: 'Prefer hidden gems', avoid: 'Avoid crowds' },
  },
  physicalReadiness: {
    label: 'Physical Activity',
    values: { yes: 'Loves a challenge', maybe: 'Moderate', no: 'Easy going' },
  },
  spendingStyle: {
    label: 'Spending Style',
    values: { experience: 'Spend on experiences', budget: 'Budget everything', comfort: 'Comfort matters' },
  },
  groundReality: {
    label: 'Ground Reality',
    values: { bring_it: 'Part of the adventure', tolerate: 'Can handle it', need_comfort: 'Need basics' },
  },
  languageComfort: {
    label: 'Language',
    values: { fine: 'Comfortable anywhere', hindi: 'Prefer Hindi regions', english: 'Need English' },
  },
} as const;
