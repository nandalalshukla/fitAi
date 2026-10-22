import { LEFT, RIGHT } from '@/features/pose/domain/skeleton';

import { ankleSpread, armRaise, clamp01, defineExercise, meanOf } from '../features';
import type { RepThresholds } from '../types';

interface JumpingJackThresholds extends RepThresholds {
  [key: string]: number;
  /** Arm-raise angle counted as "arms down" / "arms overhead". */
  armDown: number;
  armUp: number;
  /** Ankle spread (torso lengths) counted as feet together / apart. */
  feetTogether: number;
  feetApart: number;
  /** Rep-level checks: minimum arm raise and spread reached during the rep. */
  minArmPeak: number;
  minSpreadPeak: number;
}

/**
 * Jumping jack, front view. Counting signal: "openness" 0..1 combining arm raise
 * and leg spread; one rep = closed → open → closed.
 */
export const jumpingJack = defineExercise<JumpingJackThresholds>({
  id: 'jumping_jack',
  nameKey: 'exercises.names.jumping_jack',
  category: 'cardio',
  primaryMuscles: ['calves', 'shoulders'],
  secondaryMuscles: ['glutes', 'adductors'],
  cameraPlacement: {
    view: 'front',
    distanceM: [2, 3],
    orientation: 'portrait',
    tipKey: 'placement.frontFullBody',
  },
  required: { joints: ['shoulder', 'wrist', 'hip', 'ankle'], sides: 'both' },
  mode: 'reps',
  thresholds: {
    base: {
      start: 0.3,
      peak: 0.7,
      partial: 0.5,
      target: 0.9,
      armDown: 25,
      armUp: 160,
      feetTogether: 0.35,
      feetApart: 1.0,
      minArmPeak: 140,
      minSpreadPeak: 0.8,
    },
    difficulty: { beginner: { minArmPeak: 120, minSpreadPeak: 0.65 } },
  },
  features: (ctx, th) => {
    'worklet';
    const s = ctx.skeleton;
    const arms = meanOf(armRaise(s, LEFT), armRaise(s, RIGHT));
    const spread = ankleSpread(s, ctx.torso);
    const openArms = clamp01((arms - th.armDown) / (th.armUp - th.armDown));
    const openLegs = clamp01((spread - th.feetTogether) / (th.feetApart - th.feetTogether));
    return {
      openness: Number.isNaN(arms) || Number.isNaN(spread) ? NaN : (openArms + openLegs) / 2,
      armRaise: arms,
      spread,
    };
  },
  counter: { signals: ['openness'], peakWhen: 'above', minPhaseMs: 60, minRepMs: 450 },
  rules: [
    {
      id: 'jumping_jack.arms_low',
      severity: 'warning',
      cue: 'cues.armsHigher',
      message: 'form.armsHigher',
      cooldownMs: 6000,
      when: 'rep',
      check: (_f, th, rep) => {
        'worklet';
        return rep !== null && (rep.max.armRaise ?? 180) < th.minArmPeak;
      },
    },
    {
      id: 'jumping_jack.feet_narrow',
      severity: 'info',
      cue: 'cues.feetWider',
      message: 'form.feetWider',
      cooldownMs: 6000,
      when: 'rep',
      check: (_f, th, rep) => {
        'worklet';
        return rep !== null && (rep.max.spread ?? 9) < th.minSpreadPeak;
      },
    },
  ],
  signature: {
    orientation: 'upright',
    moving: [
      { feature: 'armRaise', minRange: 80 },
      { feature: 'spread', minRange: 0.35 },
    ],
  },
});
