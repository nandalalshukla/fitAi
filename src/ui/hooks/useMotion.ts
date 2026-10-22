import { useMemo } from 'react';
import {
  Easing,
  FadeIn,
  FadeInDown,
  FadeOut,
  ReduceMotion,
  useReducedMotion,
  type WithSpringConfig,
  type WithTimingConfig,
} from 'react-native-reanimated';

import { durations, easings, springs, staggerMaxItems, staggerStep } from '../theme/motion';

export type EasingName = keyof typeof easings;
export type SpringName = keyof typeof springs;

export const bezier = (name: EasingName) => {
  const [x1, y1, x2, y2] = easings[name];
  return Easing.bezier(x1, y1, x2, y2);
};

export const timing = (
  duration: keyof typeof durations = 'base',
  easing: EasingName = 'standard',
): WithTimingConfig => ({
  duration: durations[duration],
  easing: bezier(easing),
  reduceMotion: ReduceMotion.System,
});

export const spring = (name: SpringName = 'gentle'): WithSpringConfig => ({
  ...springs[name],
  reduceMotion: ReduceMotion.System,
});

/**
 * Motion helpers that respect the OS "Reduce Motion" setting. When reduced,
 * entrances become plain fades and decorative motion is disabled.
 */
export function useMotion() {
  const reduceMotion = useReducedMotion();
  return useMemo(
    () => ({
      reduceMotion,
      /** Staggered list entrance for item `index`. */
      enterStagger: (index: number) => {
        const delay = Math.min(index, staggerMaxItems) * staggerStep;
        return reduceMotion
          ? FadeIn.duration(durations.fast)
          : FadeInDown.delay(delay).duration(durations.slow).easing(bezier('decelerate'));
      },
      enterFade: FadeIn.duration(durations.base),
      exitFade: FadeOut.duration(durations.fast),
    }),
    [reduceMotion],
  );
}
