/**
 * Simple typed feature flags for experimental functionality. Flip defaults here;
 * a remote override layer can be added later without changing call sites.
 */
export const featureFlags = {
  /** Free mode: classify the exercise automatically instead of following the plan. */
  freeModeClassifier: true,
  /** Translucent "ghost" target pose next to the user's live skeleton. */
  ghostPoseOverlay: true,
  /** MoveNet Thunder "high accuracy" model option in Settings. */
  highAccuracyModel: true,
  /** Dev-only screens (design-system gallery, animation preview, debug overlay). */
  devTools: __DEV__,
} as const;

export type FeatureFlag = keyof typeof featureFlags;

export const isEnabled = (flag: FeatureFlag): boolean => featureFlags[flag];
