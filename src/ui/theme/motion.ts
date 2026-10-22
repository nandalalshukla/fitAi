/**
 * Motion tokens. Pure data (no Reanimated import) so they can be unit-tested and
 * shared with worklets. Durations are within the 150-350 ms band from the spec.
 */
export const durations = {
  instant: 90,
  fast: 150,
  base: 220,
  slow: 300,
  emphasized: 350,
  /** Long, decorative motions (shimmer loop, celebrations). Not used for UI feedback. */
  ambient: 1400,
} as const;

/** Cubic-bezier control points, consumed by `Easing.bezier(...)`. */
export const easings = {
  standard: [0.2, 0, 0, 1],
  decelerate: [0, 0, 0, 1],
  accelerate: [0.3, 0, 1, 1],
  emphasized: [0.2, 0, 0, 1.2],
} as const satisfies Record<string, readonly [number, number, number, number]>;

export interface SpringToken {
  damping: number;
  stiffness: number;
  mass: number;
}

export const springs = {
  /** Press feedback, toggles. */
  snappy: { damping: 20, stiffness: 320, mass: 0.7 },
  /** Sheets, cards, layout. */
  gentle: { damping: 22, stiffness: 180, mass: 1 },
  /** Rep counter pop, celebrations. */
  bouncy: { damping: 11, stiffness: 240, mass: 0.8 },
} as const satisfies Record<string, SpringToken>;

/** Scale applied to pressables while pressed. */
export const pressScale = 0.96;

/** Delay between items in staggered list entrances. */
export const staggerStep = 45;
/** Cap so long lists don't take forever to appear. */
export const staggerMaxItems = 8;
