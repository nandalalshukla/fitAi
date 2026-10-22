import { KP } from './keypoints';
import type { Skeleton } from './skeleton';

/**
 * Pure 2D geometry on skeleton pixel coordinates (y down). Angles in degrees.
 * All functions are worklet-safe and unit-tested.
 */
const RAD = 180 / Math.PI;

/** Interior angle at b formed by a-b-c, 0..180°. Returns NaN if a segment has zero length. */
export function angle(
  ax: number,
  ay: number,
  bx: number,
  by: number,
  cx: number,
  cy: number,
): number {
  'worklet';
  const v1x = ax - bx;
  const v1y = ay - by;
  const v2x = cx - bx;
  const v2y = cy - by;
  const n = Math.hypot(v1x, v1y) * Math.hypot(v2x, v2y);
  if (n === 0) return NaN;
  const cos = Math.max(-1, Math.min(1, (v1x * v2x + v1y * v2y) / n));
  return Math.acos(cos) * RAD;
}

/** Angle a-b-c between skeleton keypoints. */
export function jointAngle(s: Skeleton, a: number, b: number, c: number): number {
  'worklet';
  return angle(s.x[a] ?? 0, s.y[a] ?? 0, s.x[b] ?? 0, s.y[b] ?? 0, s.x[c] ?? 0, s.y[c] ?? 0);
}

/**
 * Signed angle a-b-c in (-180, 180]: positive when c is counter-clockwise from a
 * as seen on screen (y down). Used to tell which side of a line a joint is on.
 */
export function signedAngle(
  ax: number,
  ay: number,
  bx: number,
  by: number,
  cx: number,
  cy: number,
): number {
  'worklet';
  const a1 = Math.atan2(-(ay - by), ax - bx);
  const a2 = Math.atan2(-(cy - by), cx - bx);
  let d = (a2 - a1) * RAD;
  while (d <= -180) d += 360;
  while (d > 180) d -= 360;
  return d;
}

export function distance(s: Skeleton, a: number, b: number): number {
  'worklet';
  return Math.hypot((s.x[a] ?? 0) - (s.x[b] ?? 0), (s.y[a] ?? 0) - (s.y[b] ?? 0));
}

/** Deviation of segment a→b from vertical, 0..90° (direction-agnostic). */
export function deviationFromVertical(ax: number, ay: number, bx: number, by: number): number {
  'worklet';
  const dx = Math.abs(bx - ax);
  const dy = Math.abs(by - ay);
  if (dx === 0 && dy === 0) return NaN;
  return Math.atan2(dx, dy) * RAD;
}

/** Deviation of segment a→b from horizontal, 0..90°. */
export function deviationFromHorizontal(ax: number, ay: number, bx: number, by: number): number {
  'worklet';
  const d = deviationFromVertical(ax, ay, bx, by);
  return Number.isNaN(d) ? NaN : 90 - d;
}

/** Signed distance of point p from the line a→b (pixels). Positive = left of a→b on screen. */
export function pointLineDistance(
  px: number,
  py: number,
  ax: number,
  ay: number,
  bx: number,
  by: number,
): number {
  'worklet';
  const len = Math.hypot(bx - ax, by - ay);
  if (len === 0) return 0;
  return ((bx - ax) * (ay - py) - (by - ay) * (ax - px)) / len;
}

export interface Point {
  x: number;
  y: number;
}

/** Midpoint of two keypoints. */
export function mid(s: Skeleton, a: number, b: number): Point {
  'worklet';
  return { x: ((s.x[a] ?? 0) + (s.x[b] ?? 0)) / 2, y: ((s.y[a] ?? 0) + (s.y[b] ?? 0)) / 2 };
}

/**
 * Torso length (shoulder-centre to hip-centre, px). The scale reference so rules are
 * independent of distance to the camera. Falls back to the more visible side.
 */
export function torsoLength(s: Skeleton): number {
  'worklet';
  const sh = mid(s, KP.left_shoulder, KP.right_shoulder);
  const hp = mid(s, KP.left_hip, KP.right_hip);
  const both = Math.hypot(sh.x - hp.x, sh.y - hp.y);
  const left = distance(s, KP.left_shoulder, KP.left_hip);
  const right = distance(s, KP.right_shoulder, KP.right_hip);
  return Math.max(both, left, right);
}

/** Distance normalized by torso length (scale-invariant). */
export function normalized(s: Skeleton, px: number): number {
  'worklet';
  const t = torsoLength(s);
  return t > 0 ? px / t : 0;
}

export type BodyOrientation = 'upright' | 'horizontal' | 'inclined';
export type CameraView = 'front' | 'side';

/** Torso (hip-centre → shoulder-centre) deviation from vertical, 0..90°. */
export function torsoTilt(s: Skeleton): number {
  'worklet';
  const sh = mid(s, KP.left_shoulder, KP.right_shoulder);
  const hp = mid(s, KP.left_hip, KP.right_hip);
  return deviationFromVertical(hp.x, hp.y, sh.x, sh.y);
}

/** Standing (torso near vertical), horizontal (prone/supine) or in between. */
export function bodyOrientation(s: Skeleton, uprightMax = 35, horizontalMin = 60): BodyOrientation {
  'worklet';
  const tilt = torsoTilt(s);
  if (Number.isNaN(tilt)) return 'inclined';
  if (tilt <= uprightMax) return 'upright';
  if (tilt >= horizontalMin) return 'horizontal';
  return 'inclined';
}

/**
 * Camera view estimate: in a side view both shoulders (and hips) project close
 * together relative to torso length; facing the camera they are far apart.
 */
export function shoulderWidthRatio(s: Skeleton): number {
  'worklet';
  const t = torsoLength(s);
  if (t <= 0) return 0;
  const sw = distance(s, KP.left_shoulder, KP.right_shoulder);
  const hw = distance(s, KP.left_hip, KP.right_hip);
  return Math.max(sw, hw * 1.6) / t;
}

export function estimateView(s: Skeleton, sideMax = 0.45): CameraView {
  'worklet';
  return shoulderWidthRatio(s) <= sideMax ? 'side' : 'front';
}
