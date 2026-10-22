import { LEFT, RIGHT } from '@/features/pose/domain/skeleton';

import { defineExercise, hipAngle, hipOffset, joints, thighDrop } from '../features';
import type { RepThresholds } from '../types';

interface HighKneesThresholds extends RepThresholds {
  [key: string]: number;
}

interface MountainClimberThresholds extends RepThresholds {
  [key: string]: number;
  /** Hips above the shoulder-ankle line (torso lengths) before "hips down". */
  maxPike: number;
}

/**
 * High knees (standing) — each knee lift is one rep. Signal per side: vertical
 * thigh drop (≈0.9 standing, ≈0 knee at hip height), which works from any angle.
 */
export const highKnees = defineExercise<HighKneesThresholds>({
  id: 'high_knees',
  nameKey: 'exercises.names.high_knees',
  category: 'cardio',
  primaryMuscles: ['hip_flexors', 'quads'],
  secondaryMuscles: ['calves', 'abs'],
  cameraPlacement: {
    view: 'either',
    distanceM: [2, 3],
    orientation: 'portrait',
    tipKey: 'placement.frontFullBody',
  },
  required: { joints: ['shoulder', 'hip', 'knee'], sides: 'both' },
  mode: 'reps',
  thresholds: {
    base: { start: 0.7, peak: 0.3, partial: 0.5, target: 0.1 },
    difficulty: { beginner: { peak: 0.4, target: 0.2 }, advanced: { peak: 0.2, target: 0.05 } },
  },
  features: (ctx) => {
    'worklet';
    const s = ctx.skeleton;
    return { leftHip: thighDrop(s, LEFT, ctx.torso), rightHip: thighDrop(s, RIGHT, ctx.torso) };
  },
  counter: { signals: ['leftHip', 'rightHip'], peakWhen: 'below', minPhaseMs: 50, minRepMs: 250 },
  partialRepCue: 'cues.kneesHigher',
  rules: [],
  signature: {
    orientation: 'upright',
    moving: [],
    still: [{ feature: 'hipY', maxRange: 0.2 }],
    alternating: ['leftHip', 'rightHip'],
  },
});

/**
 * Mountain climbers (plank position, side view) — each knee drive is one rep.
 * Rule: hips must stay level (no piking).
 */
export const mountainClimber = defineExercise<MountainClimberThresholds>({
  id: 'mountain_climber',
  nameKey: 'exercises.names.mountain_climber',
  category: 'cardio',
  primaryMuscles: ['abs', 'hip_flexors'],
  secondaryMuscles: ['shoulders', 'quads'],
  cameraPlacement: {
    view: 'side',
    distanceM: [1.5, 2.5],
    orientation: 'landscape',
    tipKey: 'placement.sideFloor',
  },
  required: { joints: ['shoulder', 'wrist', 'hip', 'knee'], sides: 'both' },
  mode: 'reps',
  thresholds: {
    base: { start: 145, peak: 105, partial: 125, target: 85, maxPike: 0.35 },
    difficulty: { beginner: { peak: 115, target: 95 } },
  },
  features: (ctx) => {
    'worklet';
    const s = ctx.skeleton;
    return {
      leftHip: hipAngle(s, LEFT),
      rightHip: hipAngle(s, RIGHT),
      hipOffset: hipOffset(s, joints(ctx), ctx.torso),
    };
  },
  counter: { signals: ['leftHip', 'rightHip'], peakWhen: 'below', minPhaseMs: 50, minRepMs: 250 },
  partialRepCue: 'cues.kneesToChest',
  rules: [
    {
      id: 'mountain_climber.hips_high',
      severity: 'warning',
      cue: 'cues.hipsDown',
      message: 'form.hipsPike',
      cooldownMs: 6000,
      when: 'frame',
      persistMs: 400,
      check: (f, th) => {
        'worklet';
        return (f.hipOffset ?? NaN) > th.maxPike;
      },
    },
  ],
  signature: {
    orientation: 'horizontal',
    moving: [],
    mean: [{ feature: 'kneeHeight', max: 0.15 }],
    alternating: ['leftHip', 'rightHip'],
  },
});
