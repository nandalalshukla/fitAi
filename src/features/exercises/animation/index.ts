import { CATALOG_ANIMATIONS } from './keyframes/catalog';
import { ANIMATIONS } from './keyframes/library';
import type { ExerciseAnimation } from './keyframes/types';

/** Demo animation for any catalog exercise (tracked + untracked), if one exists. */
export function getAnimation(id: string): ExerciseAnimation | undefined {
  return (ANIMATIONS as Record<string, ExerciseAnimation>)[id] ?? CATALOG_ANIMATIONS[id];
}

export const allAnimationIds = (): string[] => [
  ...Object.keys(ANIMATIONS),
  ...Object.keys(CATALOG_ANIMATIONS),
];
