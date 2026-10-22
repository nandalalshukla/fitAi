import {
  deviationFromHorizontal,
  deviationFromVertical,
  jointAngle,
} from '@/features/pose/domain/geometry';
import {
  LEFT,
  RIGHT,
  sideJoints,
  type SideJoints,
  type Skeleton,
} from '@/features/pose/domain/skeleton';

import type { ExerciseDefinition, FeatureContext, ThresholdSet } from './types';

/**
 * Feature helpers shared by exercise definitions. Every helper returns NaN when
 * one of its keypoints is below FEATURE_MIN_SCORE so rules can ignore it.
 */
export const FEATURE_MIN_SCORE = 0.3;

const ok = (s: Skeleton, ...idx: number[]) => {
  'worklet';
  for (const i of idx) if ((s.score[i] ?? 0) < FEATURE_MIN_SCORE) return false;
  return true;
};

export function angleOf(s: Skeleton, a: number, b: number, c: number): number {
  'worklet';
  return ok(s, a, b, c) ? jointAngle(s, a, b, c) : NaN;
}

export const kneeAngle = (s: Skeleton, j: SideJoints) => {
  'worklet';
  return angleOf(s, j.hip, j.knee, j.ankle);
};
export const hipAngle = (s: Skeleton, j: SideJoints) => {
  'worklet';
  return angleOf(s, j.shoulder, j.hip, j.knee);
};
export const elbowAngle = (s: Skeleton, j: SideJoints) => {
  'worklet';
  return angleOf(s, j.shoulder, j.elbow, j.wrist);
};
/** Shoulder flexion/abduction proxy: angle hip-shoulder-wrist (≈0 arms down, ≈180 overhead). */
export const armRaise = (s: Skeleton, j: SideJoints) => {
  'worklet';
  return angleOf(s, j.hip, j.shoulder, j.wrist);
};
/** Shoulder-hip-ankle angle: 180 = straight body line. */
export const bodyLine = (s: Skeleton, j: SideJoints) => {
  'worklet';
  return angleOf(s, j.shoulder, j.hip, j.ankle);
};
/** Shoulder-hip-knee angle used for bridges (hips extended ≈ 180). */
export const hipExtension = hipAngle;

/** Neck alignment: hip-shoulder-ear (≈180 neutral, smaller = head dropped/forward). */
export const neckAngle = (s: Skeleton, j: SideJoints) => {
  'worklet';
  return angleOf(s, j.hip, j.shoulder, j.ear);
};

/** Torso deviation from vertical for one side, degrees. */
export function torsoLean(s: Skeleton, j: SideJoints): number {
  'worklet';
  if (!ok(s, j.hip, j.shoulder)) return NaN;
  return deviationFromVertical(
    s.x[j.hip] ?? 0,
    s.y[j.hip] ?? 0,
    s.x[j.shoulder] ?? 0,
    s.y[j.shoulder] ?? 0,
  );
}

/** Trunk lift above horizontal (sit-ups/crunches): 0 lying flat, 90 sitting upright. */
export function trunkLift(s: Skeleton, j: SideJoints): number {
  'worklet';
  if (!ok(s, j.hip, j.shoulder)) return NaN;
  if ((s.y[j.shoulder] ?? 0) > (s.y[j.hip] ?? 0)) return 0; // shoulder below hip
  return deviationFromHorizontal(
    s.x[j.hip] ?? 0,
    s.y[j.hip] ?? 0,
    s.x[j.shoulder] ?? 0,
    s.y[j.shoulder] ?? 0,
  );
}

/**
 * Signed distance of point p ABOVE (+) or BELOW (−) the line a→b on screen,
 * measured vertically at p's projection, in torso lengths.
 */
export function offsetAboveLine(
  s: Skeleton,
  a: number,
  b: number,
  p: number,
  torso: number,
): number {
  'worklet';
  if (!ok(s, a, b, p) || torso <= 0) return NaN;
  const ax = s.x[a] ?? 0;
  const ay = s.y[a] ?? 0;
  const dx = (s.x[b] ?? 0) - ax;
  const dy = (s.y[b] ?? 0) - ay;
  const len2 = dx * dx + dy * dy;
  if (len2 === 0) return NaN;
  const px = s.x[p] ?? 0;
  const py = s.y[p] ?? 0;
  const t = ((px - ax) * dx + (py - ay) * dy) / len2;
  return (ay + t * dy - py) / torso;
}

/**
 * How far the hip sits ABOVE (+) or BELOW (−) the shoulder→ankle line, in torso
 * lengths. Push-up/plank: negative = sagging, positive = piking.
 */
export function hipOffset(s: Skeleton, j: SideJoints, torso: number): number {
  'worklet';
  return offsetAboveLine(s, j.shoulder, j.ankle, j.hip, torso);
}

/**
 * Vertical thigh drop: (knee.y − hip.y) / torso. ≈0.9 standing, ≈0 thigh horizontal.
 * Independent of camera yaw (rotation about the vertical axis keeps vertical extents).
 */
export function thighDrop(s: Skeleton, j: SideJoints, torso: number): number {
  'worklet';
  if (!ok(s, j.hip, j.knee) || torso <= 0) return NaN;
  return ((s.y[j.knee] ?? 0) - (s.y[j.hip] ?? 0)) / torso;
}

/** Heel lift (side view): heel above the toes, torso lengths (0 = flat foot). */
export function heelLift(s: Skeleton, j: SideJoints, torso: number): number {
  'worklet';
  if (!ok(s, j.heel, j.foot) || torso <= 0) return NaN;
  return ((s.y[j.foot] ?? 0) - (s.y[j.heel] ?? 0)) / torso;
}

/** Knee travel past the toes along the facing direction (side view), torso lengths. */
export function kneePastToes(s: Skeleton, j: SideJoints, torso: number): number {
  'worklet';
  if (!ok(s, j.knee, j.heel, j.foot) || torso <= 0) return NaN;
  const dir = Math.sign((s.x[j.foot] ?? 0) - (s.x[j.heel] ?? 0)) || 1;
  return (((s.x[j.knee] ?? 0) - (s.x[j.foot] ?? 0)) * dir) / torso;
}

/** Horizontal ankle separation, torso lengths (lunge split stance in side view). */
export function stanceWidth(s: Skeleton, torso: number): number {
  'worklet';
  if (!ok(s, LEFT.ankle, RIGHT.ankle) || torso <= 0) return NaN;
  return Math.abs((s.x[LEFT.ankle] ?? 0) - (s.x[RIGHT.ankle] ?? 0)) / torso;
}

/** Front view: knee separation / ankle separation (< ~0.8 = knees caving in). */
export function kneeAnkleRatio(s: Skeleton): number {
  'worklet';
  if (!ok(s, LEFT.knee, RIGHT.knee, LEFT.ankle, RIGHT.ankle)) return NaN;
  const kd = Math.abs((s.x[LEFT.knee] ?? 0) - (s.x[RIGHT.knee] ?? 0));
  const ad = Math.abs((s.x[LEFT.ankle] ?? 0) - (s.x[RIGHT.ankle] ?? 0));
  return ad > 0 ? kd / ad : NaN;
}

/** Ankle separation in torso lengths (jumping jacks). */
export function ankleSpread(s: Skeleton, torso: number): number {
  'worklet';
  if (!ok(s, LEFT.ankle, RIGHT.ankle) || torso <= 0) return NaN;
  return (
    Math.hypot(
      (s.x[LEFT.ankle] ?? 0) - (s.x[RIGHT.ankle] ?? 0),
      (s.y[LEFT.ankle] ?? 0) - (s.y[RIGHT.ankle] ?? 0),
    ) / torso
  );
}

/** Mean of finite values (NaN if none). */
export function meanOf(...values: number[]): number {
  'worklet';
  let sum = 0;
  let n = 0;
  for (const v of values) {
    if (!Number.isNaN(v)) {
      sum += v;
      n++;
    }
  }
  return n > 0 ? sum / n : NaN;
}

export const clamp01 = (v: number) => {
  'worklet';
  return Math.max(0, Math.min(1, v));
};

/** Chosen side's joints for a feature context. */
export const joints = (ctx: FeatureContext) => {
  'worklet';
  return sideJoints(ctx.side);
};

/** Identity helper that keeps the threshold type parameter inferred. */
export function defineExercise<T extends ThresholdSet>(
  def: ExerciseDefinition<T>,
): ExerciseDefinition<T> {
  return def;
}
