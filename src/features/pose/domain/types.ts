import { KEYPOINT_COUNT, KEYPOINT_STRIDE, KP, type KeypointName } from './keypoints';

/**
 * A detected pose. `points` is a flat array `[x0, y0, s0, x1, y1, s1, ...]` of
 * KEYPOINT_COUNT keypoints in normalized, upright frame coordinates (0..1,
 * origin top-left, already mirrored like the preview when the frame is mirrored).
 * Flat number arrays are cheap to pass between worklet runtimes.
 */
export interface Pose {
  points: number[];
  /** Overall pose presence/confidence 0..1. */
  score: number;
  /** Frame timestamp (ms). */
  timestamp: number;
  /** Upright frame size in pixels (for aspect-correct geometry). */
  frameWidth: number;
  frameHeight: number;
}

export interface Keypoint {
  name: KeypointName;
  x: number;
  y: number;
  score: number;
}

export const emptyPoints = (): number[] => {
  'worklet';
  return new Array<number>(KEYPOINT_COUNT * KEYPOINT_STRIDE).fill(0);
};

export function getKeypoint(pose: Pose, name: KeypointName): Keypoint {
  const i = KP[name] * KEYPOINT_STRIDE;
  return {
    name,
    x: pose.points[i] ?? 0,
    y: pose.points[i + 1] ?? 0,
    score: pose.points[i + 2] ?? 0,
  };
}
