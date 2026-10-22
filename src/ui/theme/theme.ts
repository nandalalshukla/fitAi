import { darkColors, lightColors, type ColorTokens } from './colors';
import { durations, easings, pressScale, springs, staggerMaxItems, staggerStep } from './motion';
import { elevation, hitTarget, iconSizes, radii, spacing, zIndex } from './tokens';
import { fontFamilies, typography } from './typography';

export type ColorScheme = 'dark' | 'light';

export interface Theme {
  scheme: ColorScheme;
  colors: ColorTokens;
  spacing: typeof spacing;
  radii: typeof radii;
  elevation: typeof elevation;
  typography: typeof typography;
  fonts: typeof fontFamilies;
  iconSizes: typeof iconSizes;
  hitTarget: number;
  zIndex: typeof zIndex;
  motion: {
    durations: typeof durations;
    easings: typeof easings;
    springs: typeof springs;
    pressScale: number;
    staggerStep: number;
    staggerMaxItems: number;
  };
}

const base = {
  spacing,
  radii,
  elevation,
  typography,
  fonts: fontFamilies,
  iconSizes,
  hitTarget,
  zIndex,
  motion: { durations, easings, springs, pressScale, staggerStep, staggerMaxItems },
};

export const darkTheme: Theme = { scheme: 'dark', colors: darkColors, ...base };
export const lightTheme: Theme = { scheme: 'light', colors: lightColors, ...base };

export const themes: Record<ColorScheme, Theme> = { dark: darkTheme, light: lightTheme };
