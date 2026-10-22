import { LEFT, RIGHT } from '@/features/pose/domain/skeleton';

import {
  defineExercise,
  heelLift,
  joints,
  kneeAngle,
  kneeAnkleRatio,
  meanOf,
  thighDrop,
  torsoLean,
} from '../features';
import type { RepThresholds } from '../types';

interface SquatThresholds extends RepThresholds {
  [key: string]: number;
  /** Max torso lean from vertical at the bottom (side view), degrees. */
  maxTorsoLean: number;
  /** Min knee/ankle width ratio (front view) before "knees caving". */
  minKneeAnkleRatio: number;
  /** Max heel lift, torso lengths. */
  maxHeelLift: number;
}

/**
 * Bodyweight squat. Counting signal `depth`: knee angle (hip-knee-ankle) in side
 * view; vertical thigh drop in front view, where knee flexion is foreshortened.
 */
export const squat = defineExercise<SquatThresholds>({
  id: 'squat',
  nameKey: 'exercises.names.squat',
  category: 'lower_body',
  primaryMuscles: ['quads', 'glutes'],
  secondaryMuscles: ['hamstrings', 'adductors', 'calves'],
  cameraPlacement: {
    view: 'side',
    distanceM: [1.5, 2.5],
    orientation: 'portrait',
    tipKey: 'placement.sideFullBody',
  },
  required: { joints: ['shoulder', 'hip', 'knee', 'ankle'], sides: 'best' },
  mode: 'reps',
  thresholds: {
    base: {
      start: 160,
      peak: 100,
      partial: 135,
      target: 85,
      maxTorsoLean: 50,
      minKneeAnkleRatio: 0.75,
      maxHeelLift: 0.12,
    },
    difficulty: { beginner: { peak: 110, target: 95 }, advanced: { peak: 95, target: 80 } },
    // Front view uses thigh drop (torso lengths) instead of the foreshortened knee angle.
    view: { front: { start: 0.7, peak: 0.3, partial: 0.48, target: 0.12 } },
  },
  features: (ctx) => {
    'worklet';
    const s = ctx.skeleton;
    const j = joints(ctx);
    return {
      // Side view: knee angle (deg). Front view: mean thigh drop (torso lengths) — yaw-invariant.
      depth:
        ctx.view === 'front'
          ? meanOf(thighDrop(s, LEFT, ctx.torso), thighDrop(s, RIGHT, ctx.torso))
          : kneeAngle(s, j),
      torsoLean: torsoLean(s, j),
      kneeAnkleRatio: kneeAnkleRatio(s),
      heelLift: heelLift(s, j, ctx.torso),
    };
  },
  counter: { signals: ['depth'], peakWhen: 'below', minPhaseMs: 80, minRepMs: 600 },
  partialRepCue: 'cues.goLower',
  tempo: { minRepMs: 1200 },
  rules: [
    {
      id: 'squat.torso_lean',
      severity: 'warning',
      cue: 'cues.chestUp',
      message: 'form.chestUp',
      cooldownMs: 5000,
      when: 'frame',
      phases: ['peak', 'ascending'],
      views: ['side'],
      persistMs: 250,
      check: (f, th) => {
        'worklet';
        return (f.torsoLean ?? NaN) > th.maxTorsoLean;
      },
    },
    {
      id: 'squat.knees_cave',
      severity: 'critical',
      cue: 'cues.kneesOut',
      message: 'form.kneesOut',
      cooldownMs: 5000,
      when: 'frame',
      phases: ['descending', 'peak', 'ascending'],
      views: ['front'],
      persistMs: 250,
      check: (f, th) => {
        'worklet';
        return (f.kneeAnkleRatio ?? NaN) < th.minKneeAnkleRatio;
      },
    },
    {
      id: 'squat.heels_lift',
      severity: 'warning',
      cue: 'cues.heelsDown',
      message: 'form.heelsDown',
      cooldownMs: 6000,
      when: 'frame',
      phases: ['peak'],
      views: ['side'],
      persistMs: 200,
      check: (f, th) => {
        'worklet';
        return (f.heelLift ?? NaN) > th.maxHeelLift;
      },
    },
  ],
  signature: {
    orientation: 'upright',
    moving: [
      { feature: 'knee', minRange: 45 },
      { feature: 'hipY', minRange: 0.3 },
    ],
    mean: [{ feature: 'stance', max: 0.55, view: 'side' }],
    synchronous: ['leftHip', 'rightHip'],
  },
});
