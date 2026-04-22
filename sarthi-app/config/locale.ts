export interface RegionConfig {
  currency: string;
  currencySymbol: string;
  defaultCountryCode: string;
  defaultDialCode: string;
  measurementSystem: 'metric' | 'imperial';
}

export const DEFAULT_REGION: RegionConfig = {
  currency: 'INR',
  currencySymbol: '₹',
  defaultCountryCode: 'IN',
  defaultDialCode: '+91',
  measurementSystem: 'metric',
};
