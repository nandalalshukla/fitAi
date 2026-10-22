import {
  KEYPOINT_COUNT,
  KEYPOINT_NAMES,
  KEYPOINT_STRIDE,
  KP,
  type KeypointName,
} from '@/features/pose/domain/keypoints';
import type { Pose } from '@/features/pose/domain/types';

import { project, type BodyPose3D } from '../animation/body3d';
import { bodyAt, lerpPose, poseAt } from '../animation/interpolate';
import { ANIMATIONS } from '../animation/keyframes/library';
import type { ExerciseId } from '../domain/types';

/**
 * Deterministic synthetic pose sequences built from the exercise keyframes, with
 * realistic imperfections (tempo/depth variation, pixel jitter, confidence
 * dropouts, occlusion, form faults). Used to generate replay fixtures.
 */
export type FormFault =
  | 'squat_lean'
  | 'squat_knees_cave'
  | 'push_up_sag'
  | 'push_up_pike'
  | 'jack_low_arms'
  | 'plank_sag'
  | 'lunge_lean'
  | 'bridge_overarch';

export interface Occlusion {
  fromMs: number;
  toMs: number;
  keypoints: readonly KeypointName[];
}

export interface SyntheticScenario {
  exercise: ExerciseId;
  view: 'side' | 'front';
  /** Extra camera yaw (deg) to simulate imperfect placement. */
  yawOffsetDeg?: number;
  /** Number of animation loops (reps; alternating exercises do 2 reps per loop). */
  loops: number;
  /** Loop duration(s) in ms; defaults to the animation duration. Array = per loop. */
  loopMs?: number | readonly number[];
  /** Range-of-motion multiplier per loop (1 = full). */
  depth?: number | readonly number[];
  /** Rest at the start position between loops, ms. */
  restMs?: number;
  leadInMs?: number;
  leadOutMs?: number;
  fps: number;
  /** Gaussian position noise, px (σ). */
  noisePx: number;
  /** Probability per keypoint per frame that its confidence collapses. */
  dropoutRate?: number;
  occlusions?: readonly Occlusion[];
  /** Fault applied on these (1-based) loops (all if omitted); holds: from `fromMs`. */
  fault?: { kind: FormFault; loops?: readonly number[]; fromMs?: number };
  /** Side facing the camera in side view (the other side gets lower confidence). */
  nearSide?: 'left' | 'right';
  frame: { width: number; height: number };
  seed: number;
}

/** mulberry32 PRNG — deterministic across platforms. */
export function rng(seed: number): () => number {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

function gaussian(rand: () => number): number {
  const u = Math.max(rand(), 1e-12);
  return Math.sqrt(-2 * Math.log(u)) * Math.cos(2 * Math.PI * rand());
}

const perLoop = <T>(v: T | readonly T[] | undefined, i: number, fallback: T): T => {
  if (v === undefined) return fallback;
  return Array.isArray(v) ? ((v as readonly T[])[i] ?? fallback) : (v as T);
};

/** Applies a form fault with intensity k (0..1 = progress toward the rep's peak). */
function applyFault(p: BodyPose3D, fault: FormFault, k: number): BodyPose3D {
  const both = (f: (l: BodyPose3D['left']) => Partial<BodyPose3D['left']>) => ({
    ...p,
    left: { ...p.left, ...f(p.left) },
    right: { ...p.right, ...f(p.right) },
  });
  switch (fault) {
    case 'squat_lean':
      return { ...p, torsoPitch: p.torsoPitch + 32 * k };
    case 'squat_knees_cave':
      return both((l) => ({
        hipAbd: l.hipAbd - 16 * k,
        shinAbd: (l.shinAbd ?? l.hipAbd) + 10 * k,
      }));
    case 'push_up_sag':
      return both((l) => ({ hipFlex: l.hipFlex - 22 }));
    case 'push_up_pike':
      return both((l) => ({ hipFlex: l.hipFlex + 40 }));
    case 'plank_sag':
      return both((l) => ({ hipFlex: l.hipFlex - 22 }));
    case 'jack_low_arms':
      return both((l) => ({ shoulderAbd: Math.min(l.shoulderAbd, 100) }));
    case 'lunge_lean':
      return { ...p, torsoPitch: p.torsoPitch + 40 * k };
    case 'bridge_overarch':
      // Shoulders stay anchored; dropping the torso angle pushes the hips above the shoulder-knee line.
      return { ...p, torsoPitch: p.torsoPitch - 28 * k };
  }
}

interface Segment {
  startMs: number;
  durationMs: number;
  loop: number; // -1 = rest
  depth: number;
}

/** Generates the pose sequence for a scenario (normalized frame coordinates). */
export function generateSequence(sc: SyntheticScenario): Pose[] {
  const anim = ANIMATIONS[sc.exercise];
  const rand = rng(sc.seed);
  const start = anim.keyframes[0]!.pose;
  const isHold = sc.exercise === 'plank';

  // Timeline.
  const segments: Segment[] = [];
  let t = 0;
  const push = (durationMs: number, loop: number, depth: number) => {
    segments.push({ startMs: t, durationMs, loop, depth });
    t += durationMs;
  };
  push(sc.leadInMs ?? 1500, -1, 0);
  for (let i = 0; i < sc.loops; i++) {
    push(perLoop(sc.loopMs, i, anim.durationMs), i, perLoop(sc.depth, i, 1));
    if (i < sc.loops - 1 && (sc.restMs ?? 0) > 0) push(sc.restMs ?? 0, -1, 0);
  }
  push(sc.leadOutMs ?? 1500, -1, 0);
  const total = t;

  // Framing: fixed scale/offset from the body's extent over the animation.
  const yaw = (sc.view === 'side' ? 90 : 0) + (sc.yawOffsetDeg ?? 0);
  let minX = Infinity;
  let maxX = -Infinity;
  let minY = Infinity;
  let maxY = -Infinity;
  for (let i = 0; i <= 40; i++) {
    const pr = project(bodyAt(anim, i / 40), { yawDeg: yaw });
    for (let k = 0; k < KEYPOINT_COUNT; k++) {
      minX = Math.min(minX, pr.x[k]!);
      maxX = Math.max(maxX, pr.x[k]!);
      minY = Math.min(minY, pr.y[k]!);
      maxY = Math.max(maxY, pr.y[k]!);
    }
  }
  const { width: W, height: H } = sc.frame;
  const ppu = Math.min(
    (0.75 * W) / Math.max(maxX - minX, 0.5),
    (0.8 * H) / Math.max(maxY - minY, 0.5),
  );
  const ox = W / 2 - ((minX + maxX) / 2) * ppu;
  const oy = H / 2 - ((minY + maxY) / 2) * ppu;

  const far = sc.view === 'side' ? (sc.nearSide === 'right' ? 'left_' : 'right_') : null;
  const frames: Pose[] = [];
  const dt = 1000 / sc.fps;
  for (let ms = 0; ms < total; ms += dt) {
    const seg =
      segments.find((s) => ms >= s.startMs && ms < s.startMs + s.durationMs) ??
      segments[segments.length - 1]!;
    let p: BodyPose3D;
    let loopT = 0;
    if (isHold) {
      // Timed holds: loop the (subtle) hold animation for the whole sequence.
      p = poseAt(anim, (ms % anim.durationMs) / anim.durationMs);
      if (sc.fault && ms >= (sc.fault.fromMs ?? 0)) p = applyFault(p, sc.fault.kind, 1);
    } else if (seg.loop < 0) {
      p = start;
    } else {
      loopT = (ms - seg.startMs) / seg.durationMs;
      p = lerpPose(start, poseAt(anim, loopT), seg.depth);
      const f = sc.fault;
      if (f && (!f.loops || f.loops.includes(seg.loop + 1))) {
        // Fault intensity follows progress toward the peak (triangle around peakT).
        const k = isHold
          ? 1
          : Math.max(0, 1 - Math.abs(loopT - anim.peakT) / Math.max(anim.peakT, 1 - anim.peakT));
        p = applyFault(p, f.kind, Math.min(1, k * 1.6));
      }
    }
    // Small postural sway.
    p = { ...p, offsetZ: p.offsetZ + 0.01 * Math.sin(ms / 900) };

    const pr = project(bodyAt(anim, loopT, p), { yawDeg: yaw });
    const points = new Array<number>(KEYPOINT_COUNT * KEYPOINT_STRIDE);
    for (let k = 0; k < KEYPOINT_COUNT; k++) {
      const name = KEYPOINT_NAMES[k]!;
      let score = far && name.startsWith(far) ? 0.7 + 0.1 * rand() : 0.9 + 0.08 * rand();
      let x = ox + pr.x[k]! * ppu + gaussian(rand) * sc.noisePx;
      let y = oy + pr.y[k]! * ppu + gaussian(rand) * sc.noisePx;
      if (rand() < (sc.dropoutRate ?? 0)) score = 0.1 + 0.2 * rand();
      for (const o of sc.occlusions ?? []) {
        if (ms >= o.fromMs && ms < o.toMs && o.keypoints.includes(name)) {
          score = 0.05 + 0.1 * rand();
          x += (rand() - 0.5) * 60;
          y += (rand() - 0.5) * 60;
        }
      }
      points[k * 3] = x / W;
      points[k * 3 + 1] = y / H;
      points[k * 3 + 2] = score;
    }
    frames.push({ points, score: 0.95, timestamp: Math.round(ms), frameWidth: W, frameHeight: H });
  }
  return frames;
}

/** Keypoint index list helper for occlusion specs. */
export const kp = (...names: KeypointName[]) => names.map((n) => KP[n]);
