export const fonts = {
  extraBold: 'Inter_800ExtraBold',
  bold:      'Inter_700Bold',
  semiBold:  'Inter_600SemiBold',
  medium:    'Inter_500Medium',
  regular:   'Inter_400Regular',
};

export const type = {
  display:      { fontSize: 32, fontFamily: fonts.extraBold, letterSpacing: -1,   lineHeight: 38 },
  screenTitle:  { fontSize: 24, fontFamily: fonts.extraBold, letterSpacing: -0.5, lineHeight: 30 },
  cardHeading:  { fontSize: 18, fontFamily: fonts.bold,      letterSpacing: -0.3, lineHeight: 24 },
  sectionLabel: { fontSize: 15, fontFamily: fonts.semiBold,  letterSpacing: -0.2, lineHeight: 21 },
  body:         { fontSize: 14, fontFamily: fonts.regular,   letterSpacing: 0,    lineHeight: 22 },
  caption:      { fontSize: 12, fontFamily: fonts.medium,    letterSpacing: 0,    lineHeight: 18 },
  overline:     { fontSize: 10, fontFamily: fonts.bold,      letterSpacing: 1.5,  lineHeight: 14, textTransform: 'uppercase' as const },
};
