/** Spacing on a 4/8 pt grid. Use `spacing[n]` — never raw numbers in feature code. */
export const spacing = {
  0: 0,
  1: 4,
  2: 8,
  3: 12,
  4: 16,
  5: 20,
  6: 24,
  8: 32,
  10: 40,
  12: 48,
  16: 64,
} as const;
export type SpacingKey = keyof typeof spacing;

export const radii = {
  xs: 6,
  sm: 10,
  md: 14,
  lg: 20,
  xl: 28,
  pill: 999,
} as const;

/** Minimum touch target (dp). Spec: >= 48. */
export const hitTarget = 48;

export const elevation = {
  none: {
    shadowOpacity: 0,
    shadowRadius: 0,
    shadowOffset: { width: 0, height: 0 },
    elevation: 0,
  },
  low: {
    shadowColor: '#000000',
    shadowOpacity: 0.18,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 4 },
    elevation: 2,
  },
  high: {
    shadowColor: '#000000',
    shadowOpacity: 0.32,
    shadowRadius: 24,
    shadowOffset: { width: 0, height: 12 },
    elevation: 8,
  },
} as const;

export const iconSizes = { sm: 16, md: 20, lg: 24, xl: 32, xxl: 48 } as const;

export const zIndex = { base: 0, sheet: 10, modal: 20, toast: 30 } as const;
