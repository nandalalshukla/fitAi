import { angleOf, defineExercise, joints, kneeAngle } from '../features';
import type { RepThresholds } from '../types';

interface LegRaiseThresholds extends RepThresholds {
  [key: string]: number;
  /** Knees should stay (nearly) straight. */
  minKneeAngle: number;
}

/** Lying leg raise, side view. Signal: shoulder-hip-ankle angle (≈175 flat, ≈90 legs vertical). */
export const legRaise = defineExercise<LegRaiseThresholds>({
  id: 'leg_raise',
  nameKey: 'exercises.names.leg_raise',
  category: 'core',
  primaryMuscles: ['abs', 'hip_flexors'],
  secondaryMuscles: ['obliques'],
  cameraPlacement: {
    view: 'side',
    distanceM: [1.5, 2.5],
    orientation: 'landscape',
    tipKey: 'placement.sideFloor',
  },
  required: { joints: ['shoulder', 'hip', 'knee', 'ankle'], sides: 'best' },
  mode: 'reps',
  thresholds: {
    base: { start: 155, peak: 110, partial: 135, target: 95, minKneeAngle: 140 },
    difficulty: { beginner: { peak: 120, target: 105, minKneeAngle: 120 } },
  },
  features: (ctx) => {
    'worklet';
    const s = ctx.skeleton;
    const j = joints(ctx);
    return { legs: angleOf(s, j.shoulder, j.hip, j.ankle), knee: kneeAngle(s, j) };
  },
  counter: { signals: ['legs'], peakWhen: 'below', minPhaseMs: 80, minRepMs: 900 },
  partialRepCue: 'cues.legsHigher',
  tempo: { minRepMs: 1400 },
  rules: [
    {
      id: 'leg_raise.knees_bent',
      severity: 'info',
      cue: 'cues.legsStraight',
      message: 'form.legsStraight',
      cooldownMs: 8000,
      when: 'frame',
      phases: ['descending', 'peak', 'ascending'],
      persistMs: 300,
      check: (f, th) => {
        'worklet';
        return (f.knee ?? NaN) < th.minKneeAngle;
      },
    },
  ],
  signature: {
    orientation: 'horizontal',
    moving: [{ feature: 'legs', minRange: 40 }],
    still: [{ feature: 'trunk', maxRange: 20 }],
    mean: [{ feature: 'knee', min: 140 }],
  },
});
