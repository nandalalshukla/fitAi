import {
  estimateView,
  torsoLength,
  torsoTilt,
  type CameraView,
} from '@/features/pose/domain/geometry';
import { LEFT, RIGHT, type Skeleton } from '@/features/pose/domain/skeleton';

import { angleOf, ankleSpread, armRaise, meanOf, stanceWidth, trunkLift } from '../features';
import type { ClassifierFeature } from '../types';

export const CLASSIFIER_FEATURES: readonly ClassifierFeature[] = [
  'knee',
  'hip',
  'leftHip',
  'rightHip',
  'elbow',
  'armRaise',
  'spread',
  'stance',
  'trunk',
  'legs',
  'kneeHeight',
  'hipY',
];

export type FrameVector = Record<ClassifierFeature, number> & { tilt: number; view: CameraView };

const minFinite = (a: number, b: number) => {
  'worklet';
  if (Number.isNaN(a)) return b;
  if (Number.isNaN(b)) return a;
  return Math.min(a, b);
};

function kneeToShoulder(s: Skeleton, shoulder: number, knee: number, torso: number): number {
  'worklet';
  if ((s.score[shoulder] ?? 0) < 0.3 || (s.score[knee] ?? 0) < 0.3 || torso <= 0) return NaN;
  return (
    Math.hypot((s.x[shoulder] ?? 0) - (s.x[knee] ?? 0), (s.y[shoulder] ?? 0) - (s.y[knee] ?? 0)) /
    torso
  );
}

/** Generic, exercise-agnostic measurements for one frame (input of the classifier). */
export function frameVector(s: Skeleton, torsoRef: number): FrameVector {
  'worklet';
  const torso = torsoRef > 0 ? torsoRef : torsoLength(s);
  const bestLeft =
    (s.score[LEFT.hip] ?? 0) + (s.score[LEFT.shoulder] ?? 0) >=
    (s.score[RIGHT.hip] ?? 0) + (s.score[RIGHT.shoulder] ?? 0);
  const j = bestLeft ? LEFT : RIGHT;
  return {
    knee: minFinite(
      angleOf(s, LEFT.hip, LEFT.knee, LEFT.ankle),
      angleOf(s, RIGHT.hip, RIGHT.knee, RIGHT.ankle),
    ),
    hip: minFinite(
      angleOf(s, LEFT.shoulder, LEFT.hip, LEFT.knee),
      angleOf(s, RIGHT.shoulder, RIGHT.hip, RIGHT.knee),
    ),
    leftHip: kneeToShoulder(s, LEFT.shoulder, LEFT.knee, torso),
    rightHip: kneeToShoulder(s, RIGHT.shoulder, RIGHT.knee, torso),
    elbow: minFinite(
      angleOf(s, LEFT.shoulder, LEFT.elbow, LEFT.wrist),
      angleOf(s, RIGHT.shoulder, RIGHT.elbow, RIGHT.wrist),
    ),
    armRaise: meanOf(armRaise(s, LEFT), armRaise(s, RIGHT)),
    spread: ankleSpread(s, torso),
    stance: stanceWidth(s, torso),
    trunk: trunkLift(s, j),
    legs: angleOf(s, j.shoulder, j.hip, j.ankle),
    kneeHeight:
      torso > 0
        ? meanOf(
            (s.score[LEFT.knee] ?? 0) >= 0.3
              ? ((s.y[LEFT.hip] ?? 0) - (s.y[LEFT.knee] ?? 0)) / torso
              : NaN,
            (s.score[RIGHT.knee] ?? 0) >= 0.3
              ? ((s.y[RIGHT.hip] ?? 0) - (s.y[RIGHT.knee] ?? 0)) / torso
              : NaN,
          )
        : NaN,
    hipY:
      torso > 0 && (s.score[LEFT.hip] ?? 0) >= 0.3 && (s.score[RIGHT.hip] ?? 0) >= 0.3
        ? ((s.y[LEFT.hip] ?? 0) + (s.y[RIGHT.hip] ?? 0)) / 2 / torso
        : NaN,
    tilt: torsoTilt(s),
    view: estimateView(s),
  };
}

export interface FeatureStats {
  /** 5th-95th percentile range (robust to outliers). */
  range: number;
  mean: number;
  count: number;
}

export function stats(values: readonly number[]): FeatureStats {
  const v = values.filter((x) => !Number.isNaN(x)).sort((a, b) => a - b);
  if (v.length === 0) return { range: NaN, mean: NaN, count: 0 };
  const q = (p: number) =>
    v[Math.min(v.length - 1, Math.max(0, Math.round(p * (v.length - 1))))] ?? NaN;
  return {
    range: q(0.95) - q(0.05),
    mean: v.reduce((a, b) => a + b, 0) / v.length,
    count: v.length,
  };
}

/** Pearson correlation of two aligned series (NaN pairs skipped). */
export function correlation(a: readonly number[], b: readonly number[]): number {
  const xs: number[] = [];
  const ys: number[] = [];
  for (let i = 0; i < Math.min(a.length, b.length); i++) {
    const x = a[i]!;
    const y = b[i]!;
    if (!Number.isNaN(x) && !Number.isNaN(y)) {
      xs.push(x);
      ys.push(y);
    }
  }
  const n = xs.length;
  if (n < 5) return NaN;
  const mx = xs.reduce((p, c) => p + c, 0) / n;
  const my = ys.reduce((p, c) => p + c, 0) / n;
  let sxy = 0;
  let sxx = 0;
  let syy = 0;
  for (let i = 0; i < n; i++) {
    sxy += (xs[i]! - mx) * (ys[i]! - my);
    sxx += (xs[i]! - mx) ** 2;
    syy += (ys[i]! - my) ** 2;
  }
  return sxx > 0 && syy > 0 ? sxy / Math.sqrt(sxx * syy) : NaN;
}

/**
 * Co-activation of two series: overlap of their absolute excursions from the
 * median, Σ min(|a−ã|, |b−b̃|) / Σ max(...). ≈0 when they move at different times
 * (alternating legs), ≈1 when they move together (both legs in a squat).
 */
export function coActivation(a: readonly number[], b: readonly number[]): number {
  const med = (v: readonly number[]) => {
    const f = v.filter((x) => !Number.isNaN(x)).sort((x, y) => x - y);
    return f.length ? (f[Math.floor(f.length / 2)] ?? NaN) : NaN;
  };
  const ma = med(a);
  const mb = med(b);
  const ra = stats(a).range;
  const rb = stats(b).range;
  if (Number.isNaN(ma) || Number.isNaN(mb) || !(ra > 0) || !(rb > 0)) return NaN;
  let lo = 0;
  let hi = 0;
  for (let i = 0; i < Math.min(a.length, b.length); i++) {
    const x = a[i]!;
    const y = b[i]!;
    if (Number.isNaN(x) || Number.isNaN(y)) continue;
    const ea = Math.abs(x - ma) / ra;
    const eb = Math.abs(y - mb) / rb;
    lo += Math.min(ea, eb);
    hi += Math.max(ea, eb);
  }
  return hi > 0 ? lo / hi : NaN;
}
