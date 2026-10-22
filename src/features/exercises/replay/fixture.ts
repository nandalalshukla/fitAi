import { KEYPOINT_COUNT, KEYPOINT_STRIDE } from '@/features/pose/domain/keypoints';
import type { Pose } from '@/features/pose/domain/types';

import type { Difficulty, ExerciseId } from '../domain/types';

/**
 * Replay fixture: a recorded (device) or synthetic keypoint sequence plus the
 * outcome it must produce. Coordinates are stored as integers to keep files
 * small: x,y in 1/10000 of the frame, score in 1/100.
 */
export const FIXTURE_VERSION = 1;

export interface ReplayExpectation {
  reps?: number;
  /** Allowed |counted − expected| (default 0: exact). */
  repTolerance?: number;
  /** Minimum number of partial-rep ("go lower") events. */
  minPartialReps?: number;
  /** Rule ids that must fire at least once. */
  formFlags?: string[];
  /** Rule ids that must NOT fire (false-positive guard). */
  forbiddenFlags?: string[];
  /** Tempo ("slow down") events expected (≥1) or forbidden (false). */
  tempo?: boolean;
  /** The person must be reported as not visible at some point. */
  visibilityLost?: boolean;
  holdSeconds?: { min: number; max: number };
  milestones?: number[];
  /** Expected top-1 classifier result (null = must not classify confidently). */
  classifiedAs?: ExerciseId | null;
}

export interface PoseFixture {
  version: typeof FIXTURE_VERSION;
  name: string;
  description: string;
  source: 'synthetic' | 'device';
  exercise: ExerciseId;
  options: { difficulty: Difficulty; view?: 'side' | 'front' };
  frame: { width: number; height: number };
  fps: number;
  expect: ReplayExpectation;
  /** [timestampMs, ...keypoints(x, y, score) as ints] per frame; `[t]` alone = no person detected. */
  frames: number[][];
}

export function encodePose(pose: Pose | null, t: number): number[] {
  if (pose === null) return [Math.round(t)];
  const row: number[] = [Math.round(t)];
  for (let k = 0; k < KEYPOINT_COUNT; k++) {
    const i = k * KEYPOINT_STRIDE;
    row.push(
      Math.round((pose.points[i] ?? 0) * 10000),
      Math.round((pose.points[i + 1] ?? 0) * 10000),
      Math.round((pose.points[i + 2] ?? 0) * 100),
    );
  }
  return row;
}

export function decodeFrame(
  row: readonly number[],
  frame: { width: number; height: number },
): { t: number; pose: Pose | null } {
  const t = row[0] ?? 0;
  if (row.length < 1 + KEYPOINT_COUNT * 3) return { t, pose: null };
  const points = new Array<number>(KEYPOINT_COUNT * KEYPOINT_STRIDE);
  for (let k = 0; k < KEYPOINT_COUNT; k++) {
    points[k * 3] = (row[1 + k * 3] ?? 0) / 10000;
    points[k * 3 + 1] = (row[2 + k * 3] ?? 0) / 10000;
    points[k * 3 + 2] = (row[3 + k * 3] ?? 0) / 100;
  }
  return {
    t,
    pose: { points, score: 1, timestamp: t, frameWidth: frame.width, frameHeight: frame.height },
  };
}

export function validateFixture(fx: unknown): fx is PoseFixture {
  const f = fx as Partial<PoseFixture>;
  return (
    typeof f === 'object' &&
    f !== null &&
    f.version === FIXTURE_VERSION &&
    typeof f.exercise === 'string' &&
    Array.isArray(f.frames) &&
    typeof f.frame?.width === 'number'
  );
}
