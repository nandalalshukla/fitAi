import { LEFT, RIGHT } from '@/features/pose/domain/skeleton';

import {
  defineExercise,
  joints,
  kneeAngle,
  kneePastToes,
  stanceWidth,
  torsoLean,
} from '../features';
import type { RepThresholds } from '../types';

interface LungeThresholds extends RepThresholds {
  [key: string]: number;
  maxTorsoLean: number;
  /** Front knee past toes, torso lengths. */
  maxKneePastToes: number;
}

/** Forward/reverse/static lunge, side view. Signal: front-leg knee angle. */
export const lunge = defineExercise<LungeThresholds>({
  id: 'lunge',
  nameKey: 'exercises.names.lunge',
  category: 'lower_body',
  primaryMuscles: ['quads', 'glutes'],
  secondaryMuscles: ['hamstrings', 'adductors', 'calves'],
  cameraPlacement: {
    view: 'side',
    distanceM: [2, 3],
    orientation: 'portrait',
    tipKey: 'placement.sideFullBody',
  },
  required: { joints: ['shoulder', 'hip', 'knee', 'ankle'], sides: 'best' },
  mode: 'reps',
  thresholds: {
    base: {
      start: 155,
      peak: 105,
      partial: 135,
      target: 90,
      maxTorsoLean: 30,
      maxKneePastToes: 0.25,
    },
    difficulty: { beginner: { peak: 115, target: 100 }, advanced: { peak: 100, target: 90 } },
  },
  features: (ctx) => {
    'worklet';
    const s = ctx.skeleton;
    const j = joints(ctx);
    // Facing direction from the visible foot (heel → toes); front leg = ankle further forward.
    const dir = Math.sign((s.x[j.foot] ?? 0) - (s.x[j.heel] ?? 0)) || 1;
    const leftFront = ((s.x[LEFT.ankle] ?? 0) - (s.x[RIGHT.ankle] ?? 0)) * dir >= 0;
    const front = leftFront ? LEFT : RIGHT;
    return {
      knee: kneeAngle(s, front),
      torsoLean: torsoLean(s, j),
      kneePastToes: kneePastToes(s, front, ctx.torso),
      stance: stanceWidth(s, ctx.torso),
    };
  },
  counter: { signals: ['knee'], peakWhen: 'below', minPhaseMs: 80, minRepMs: 700 },
  partialRepCue: 'cues.goLower',
  tempo: { minRepMs: 1200 },
  rules: [
    {
      id: 'lunge.knee_past_toes',
      severity: 'warning',
      cue: 'cues.kneeBehindToes',
      message: 'form.kneeBehindToes',
      cooldownMs: 6000,
      when: 'frame',
      phases: ['peak'],
      views: ['side'],
      persistMs: 200,
      check: (f, th) => {
        'worklet';
        return (f.kneePastToes ?? NaN) > th.maxKneePastToes;
      },
    },
    {
      id: 'lunge.torso_lean',
      severity: 'warning',
      cue: 'cues.torsoUpright',
      message: 'form.torsoUpright',
      cooldownMs: 6000,
      when: 'frame',
      phases: ['peak', 'ascending'],
      views: ['side'],
      persistMs: 250,
      check: (f, th) => {
        'worklet';
        return (f.torsoLean ?? NaN) > th.maxTorsoLean;
      },
    },
  ],
  signature: {
    orientation: 'upright',
    moving: [
      { feature: 'knee', minRange: 40 },
      { feature: 'hipY', minRange: 0.25 },
    ],
    mean: [{ feature: 'stance', min: 0.6, view: 'side' }],
  },
});
