import { KEYPOINT_COUNT, KEYPOINT_STRIDE, KP } from './keypoints';
import type { Pose } from './types';

/**
 * A pose in aspect-correct PIXEL space (y down) — the input of all geometry.
 * Normalized pose coordinates are scaled by the frame size so angles are not
 * distorted by the frame aspect ratio.
 */
export interface Skeleton {
  x: number[];
  y: number[];
  score: number[];
  /** Milliseconds. */
  t: number;
}

export function toSkeleton(pose: Pose, out?: Skeleton): Skeleton {
  'worklet';
  const s = out ?? {
    x: new Array<number>(KEYPOINT_COUNT),
    y: new Array<number>(KEYPOINT_COUNT),
    score: new Array<number>(KEYPOINT_COUNT),
    t: 0,
  };
  for (let k = 0; k < KEYPOINT_COUNT; k++) {
    const i = k * KEYPOINT_STRIDE;
    s.x[k] = (pose.points[i] ?? 0) * pose.frameWidth;
    s.y[k] = (pose.points[i + 1] ?? 0) * pose.frameHeight;
    s.score[k] = pose.points[i + 2] ?? 0;
  }
  s.t = pose.timestamp;
  return s;
}

export type Side = 'left' | 'right';

/** Keypoint indices of one body side (subject's left/right). */
export interface SideJoints {
  shoulder: number;
  elbow: number;
  wrist: number;
  hip: number;
  knee: number;
  ankle: number;
  heel: number;
  foot: number;
  ear: number;
  eye: number;
}

export const LEFT: SideJoints = {
  shoulder: KP.left_shoulder,
  elbow: KP.left_elbow,
  wrist: KP.left_wrist,
  hip: KP.left_hip,
  knee: KP.left_knee,
  ankle: KP.left_ankle,
  heel: KP.left_heel,
  foot: KP.left_foot_index,
  ear: KP.left_ear,
  eye: KP.left_eye,
};

export const RIGHT: SideJoints = {
  shoulder: KP.right_shoulder,
  elbow: KP.right_elbow,
  wrist: KP.right_wrist,
  hip: KP.right_hip,
  knee: KP.right_knee,
  ankle: KP.right_ankle,
  heel: KP.right_heel,
  foot: KP.right_foot_index,
  ear: KP.right_ear,
  eye: KP.right_eye,
};

export const sideJoints = (side: Side): SideJoints => {
  'worklet';
  return side === 'left' ? LEFT : RIGHT;
};

/** Logical joint names used by exercise definitions (side resolved at runtime). */
export type JointName = keyof SideJoints;

/** Mean confidence of the given keypoints. */
export function meanScoreOf(s: Skeleton, indices: readonly number[]): number {
  'worklet';
  if (indices.length === 0) return 0;
  let sum = 0;
  for (const i of indices) sum += s.score[i] ?? 0;
  return sum / indices.length;
}

/** The body side whose required joints are most visible (side-view exercises). */
export function bestSide(s: Skeleton, joints: readonly JointName[]): Side {
  'worklet';
  const l = meanScoreOf(
    s,
    joints.map((j) => LEFT[j]),
  );
  const r = meanScoreOf(
    s,
    joints.map((j) => RIGHT[j]),
  );
  return l >= r ? 'left' : 'right';
}

export interface VisibilityResult {
  visible: boolean;
  /** Canonical indices below the threshold. */
  missing: number[];
}

/** Confidence gating: are all required keypoints visible? */
export function checkVisibility(
  s: Skeleton,
  indices: readonly number[],
  minScore: number,
): VisibilityResult {
  'worklet';
  const missing: number[] = [];
  for (const i of indices) if ((s.score[i] ?? 0) < minScore) missing.push(i);
  return { visible: missing.length === 0, missing };
}
