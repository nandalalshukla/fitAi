import { defineExercise, elbowAngle, hipOffset, joints, neckAngle } from '../features';
import type { RepThresholds } from '../types';

interface PushUpThresholds extends RepThresholds {
  [key: string]: number;
  /** Hip below the shoulder-ankle line (torso lengths) before "hips sagging". */
  maxSag: number;
  /** Hip above the line before "hips too high". */
  maxPike: number;
  /** Min hip-shoulder-ear angle before "head dropping". */
  minNeckAngle: number;
}

/** Push-up, side view. Counting signal: elbow angle. */
export const pushUp = defineExercise<PushUpThresholds>({
  id: 'push_up',
  nameKey: 'exercises.names.push_up',
  category: 'upper_body',
  primaryMuscles: ['chest', 'triceps'],
  secondaryMuscles: ['shoulders', 'abs'],
  cameraPlacement: {
    view: 'side',
    distanceM: [1.5, 2.5],
    orientation: 'landscape',
    tipKey: 'placement.sideFloor',
  },
  required: { joints: ['shoulder', 'elbow', 'wrist', 'hip', 'ankle'], sides: 'best' },
  mode: 'reps',
  thresholds: {
    base: {
      start: 150,
      peak: 95,
      partial: 125,
      target: 80,
      maxSag: 0.18,
      maxPike: 0.3,
      minNeckAngle: 140,
    },
    difficulty: {
      beginner: { peak: 105, target: 90, maxSag: 0.22 },
      advanced: { peak: 85, target: 70 },
    },
  },
  features: (ctx) => {
    'worklet';
    const s = ctx.skeleton;
    const j = joints(ctx);
    return {
      elbow: elbowAngle(s, j),
      hipOffset: hipOffset(s, j, ctx.torso),
      neck: neckAngle(s, j),
    };
  },
  counter: { signals: ['elbow'], peakWhen: 'below', minPhaseMs: 80, minRepMs: 600 },
  partialRepCue: 'cues.goLower',
  tempo: { minRepMs: 1000 },
  rules: [
    {
      id: 'push_up.hips_sag',
      severity: 'critical',
      cue: 'cues.hipsUp',
      message: 'form.hipsSag',
      cooldownMs: 5000,
      when: 'frame',
      persistMs: 300,
      check: (f, th) => {
        'worklet';
        return (f.hipOffset ?? NaN) < -th.maxSag;
      },
    },
    {
      id: 'push_up.hips_pike',
      severity: 'warning',
      cue: 'cues.hipsDown',
      message: 'form.hipsPike',
      cooldownMs: 5000,
      when: 'frame',
      persistMs: 300,
      check: (f, th) => {
        'worklet';
        return (f.hipOffset ?? NaN) > th.maxPike;
      },
    },
    {
      id: 'push_up.head_drop',
      severity: 'info',
      cue: 'cues.neckNeutral',
      message: 'form.neckNeutral',
      cooldownMs: 8000,
      when: 'frame',
      phases: ['peak'],
      persistMs: 200,
      check: (f, th) => {
        'worklet';
        return (f.neck ?? NaN) < th.minNeckAngle;
      },
    },
  ],
  signature: {
    orientation: 'horizontal',
    moving: [{ feature: 'elbow', minRange: 35 }],
    still: [{ feature: 'knee', maxRange: 35 }],
  },
});
