import type { CameraView } from '@/features/pose/domain/geometry';

import type { Difficulty, ThresholdConfig, ThresholdSet } from './types';

/** Merges base thresholds with difficulty then camera-view overrides (view wins). */
export function resolveThresholds<T extends ThresholdSet>(
  config: ThresholdConfig<T>,
  difficulty: Difficulty,
  view: CameraView,
): T {
  'worklet';
  return {
    ...config.base,
    ...(config.difficulty?.[difficulty] ?? {}),
    ...(config.view?.[view] ?? {}),
  } as T;
}
