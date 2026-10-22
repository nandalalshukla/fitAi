import type { ExerciseId } from '../../domain/types';
import type { Anchor, BodyPose3D } from '../body3d';

export interface Keyframe {
  /** Normalized time in the loop, 0..1. First and last keyframes must be identical (loop-perfect). */
  t: number;
  pose: BodyPose3D;
  /** Instruction step (1-based) this keyframe illustrates, for step-synced demos. */
  step?: number;
}

/** Keyframe animation of one exercise rep (or hold), shared by demos, ghost overlay and tests. */
export interface ExerciseAnimation {
  id: ExerciseId;
  /** Preferred camera yaw for the demo (90 side, 0 front). */
  yawDeg: number;
  /** Duration of one loop at 1× speed, ms. */
  durationMs: number;
  anchor: Anchor;
  keyframes: readonly Keyframe[];
  /** Loop time of the deepest ("peak") position. */
  peakT: number;
}
