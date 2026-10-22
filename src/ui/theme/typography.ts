import type { TextStyle } from 'react-native';

/**
 * Font pairing: Barlow Condensed (bold display, numerals readable from 2 m)
 * + Inter (clean UI body). Loaded via expo-font in the root layout.
 */
export const fontFamilies = {
  display: 'BarlowCondensed_700Bold',
  displayHeavy: 'BarlowCondensed_800ExtraBold',
  displayMedium: 'BarlowCondensed_600SemiBold',
  body: 'Inter_400Regular',
  bodyMedium: 'Inter_500Medium',
  bodySemiBold: 'Inter_600SemiBold',
  bodyBold: 'Inter_700Bold',
} as const;

export type TypographyVariant =
  | 'counter'
  | 'timer'
  | 'displayL'
  | 'displayM'
  | 'h1'
  | 'h2'
  | 'h3'
  | 'bodyL'
  | 'body'
  | 'bodyStrong'
  | 'label'
  | 'caption'
  | 'overline';

type Variant = Pick<
  TextStyle,
  'fontFamily' | 'fontSize' | 'lineHeight' | 'letterSpacing' | 'textTransform' | 'fontVariant'
> & {
  /** Cap for dynamic type so huge numerals never overflow the screen. */
  maxFontSizeMultiplier?: number;
};

const tabular: TextStyle['fontVariant'] = ['tabular-nums'];

export const typography: Record<TypographyVariant, Variant> = {
  counter: {
    fontFamily: fontFamilies.displayHeavy,
    fontSize: 144,
    lineHeight: 144,
    letterSpacing: -2,
    fontVariant: tabular,
    maxFontSizeMultiplier: 1,
  },
  timer: {
    fontFamily: fontFamilies.display,
    fontSize: 88,
    lineHeight: 92,
    letterSpacing: -1,
    fontVariant: tabular,
    maxFontSizeMultiplier: 1.1,
  },
  displayL: {
    fontFamily: fontFamilies.displayHeavy,
    fontSize: 56,
    lineHeight: 58,
    letterSpacing: -0.5,
    textTransform: 'uppercase',
    maxFontSizeMultiplier: 1.2,
  },
  displayM: {
    fontFamily: fontFamilies.display,
    fontSize: 40,
    lineHeight: 44,
    letterSpacing: -0.25,
    textTransform: 'uppercase',
    maxFontSizeMultiplier: 1.3,
  },
  h1: { fontFamily: fontFamilies.bodyBold, fontSize: 28, lineHeight: 34, letterSpacing: -0.4 },
  h2: { fontFamily: fontFamilies.bodyBold, fontSize: 22, lineHeight: 28, letterSpacing: -0.2 },
  h3: { fontFamily: fontFamilies.bodySemiBold, fontSize: 18, lineHeight: 24 },
  bodyL: { fontFamily: fontFamilies.body, fontSize: 17, lineHeight: 26 },
  body: { fontFamily: fontFamilies.body, fontSize: 15, lineHeight: 22 },
  bodyStrong: { fontFamily: fontFamilies.bodySemiBold, fontSize: 15, lineHeight: 22 },
  label: {
    fontFamily: fontFamilies.bodySemiBold,
    fontSize: 15,
    lineHeight: 20,
    letterSpacing: 0.1,
  },
  caption: { fontFamily: fontFamilies.bodyMedium, fontSize: 13, lineHeight: 18 },
  overline: {
    fontFamily: fontFamilies.bodyBold,
    fontSize: 12,
    lineHeight: 16,
    letterSpacing: 1.2,
    textTransform: 'uppercase',
  },
};
