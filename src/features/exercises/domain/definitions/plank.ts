import { deviationFromHorizontal } from '@/features/pose/domain/geometry';

import { defineExercise, elbowAngle, hipOffset, joints, neckAngle } from '../features';

interface PlankThresholds {
  [key: string]: number;
  /** Max torso deviation from horizontal to count as "in plank". */
  maxTilt: number;
  maxSag: number;
  maxPike: number;
  minNeckAngle: number;
}

/** Plank (forearm or high), side view. Timed hold with time milestones. */
export const plank = defineExercise<PlankThresholds>({
  id: 'plank',
  nameKey: 'exercises.names.plank',
  category: 'core',
  primaryMuscles: ['abs'],
  secondaryMuscles: ['shoulders', 'glutes', 'lower_back'],
  cameraPlacement: {
    view: 'side',
    distanceM: [1.5, 2.5],
    orientation: 'landscape',
    tipKey: 'placement.sideFloor',
  },
  required: { joints: ['shoulder', 'elbow', 'hip', 'ankle'], sides: 'best' },
  mode: 'hold',
  thresholds: {
    base: { maxTilt: 30, maxSag: 0.15, maxPike: 0.25, minNeckAngle: 140 },
    difficulty: { beginner: { maxSag: 0.2, maxPike: 0.3 } },
  },
  features: (ctx) => {
    'worklet';
    const s = ctx.skeleton;
    const j = joints(ctx);
    const tilt = deviationFromHorizontal(
      s.x[j.ankle] ?? 0,
      s.y[j.ankle] ?? 0,
      s.x[j.shoulder] ?? 0,
      s.y[j.shoulder] ?? 0,
    );
    return {
      bodyTilt: tilt,
      hipOffset: hipOffset(s, j, ctx.torso),
      neck: neckAngle(s, j),
      elbow: elbowAngle(s, j),
    };
  },
  hold: {
    inPosition: (f, th) => {
      'worklet';
      const tilt = f.bodyTilt ?? NaN;
      const off = f.hipOffset ?? NaN;
      // Hold continues even with mild sag/pike (those trigger cues), but not when kneeling/standing.
      return tilt <= th.maxTilt && off > -th.maxSag * 2.5 && off < th.maxPike * 2;
    },
    milestoneEveryS: 10,
    graceMs: 800,
  },
  rules: [
    {
      id: 'plank.hips_sag',
      severity: 'critical',
      cue: 'cues.hipsUp',
      message: 'form.hipsSag',
      cooldownMs: 5000,
      when: 'frame',
      persistMs: 500,
      check: (f, th) => {
        'worklet';
        return (f.hipOffset ?? NaN) < -th.maxSag;
      },
    },
    {
      id: 'plank.hips_high',
      severity: 'warning',
      cue: 'cues.hipsDown',
      message: 'form.hipsPike',
      cooldownMs: 5000,
      when: 'frame',
      persistMs: 500,
      check: (f, th) => {
        'worklet';
        return (f.hipOffset ?? NaN) > th.maxPike;
      },
    },
    {
      id: 'plank.neck',
      severity: 'info',
      cue: 'cues.neckNeutral',
      message: 'form.neckNeutral',
      cooldownMs: 10000,
      when: 'frame',
      persistMs: 800,
      check: (f, th) => {
        'worklet';
        return (f.neck ?? NaN) < th.minNeckAngle;
      },
    },
  ],
  signature: {
    orientation: 'horizontal',
    moving: [],
    still: [
      { feature: 'elbow', maxRange: 20 },
      { feature: 'knee', maxRange: 20 },
      { feature: 'hip', maxRange: 20 },
    ],
  },
});
