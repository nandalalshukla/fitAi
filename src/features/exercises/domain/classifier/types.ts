import type { Skeleton } from '@/features/pose/domain/skeleton';

import type { ExerciseId } from '../types';

export interface Classification {
  exercise: ExerciseId;
  /** 0..1 */
  confidence: number;
}

/**
 * Recognises which supported exercise is being performed from a sliding window
 * of poses. The rule-based implementation can be replaced by a learned model
 * (e.g. a <1 MB TFLite classifier over keypoint windows) behind this interface —
 * see docs/EXERCISE_CLASSIFIER.md.
 */
export interface ExerciseClassifier {
  /** Adds one (smoothed) skeleton. `torsoRef` = reference torso length in px. */
  push(skeleton: Skeleton, torsoRef: number): void;
  /** Ranked candidates (best first). Empty when there is not enough data or no movement. */
  classify(): Classification[];
  reset(): void;
}
