const { lightColors } = require('./constants/colors');

module.exports = {
  content: ['./app/**/*.{js,ts,tsx}', './components/**/*.{js,ts,tsx}'],
  presets: [require('nativewind/preset')],
  theme: {
    extend: {
      colors: {
        'bg-base':    lightColors.bgBase,
        'bg-surface': lightColors.bgSurface,
        'bg-card':    lightColors.bgCard,
        'primary':    lightColors.primary500,
        'primary-50': lightColors.primary50,
        'primary-200':lightColors.primary200,
        'primary-600':lightColors.primary600,
        'text-primary':   lightColors.textPrimary,
        'text-secondary': lightColors.textSecondary,
        'text-tertiary':  lightColors.textTertiary,
        'border-default': lightColors.border,
        'border-focus':   lightColors.borderFocus,
      },
    },
  },
};
