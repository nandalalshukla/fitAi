import { defineExercise, joints, neckAngle, trunkLift } from '../features';
import type { ExerciseDefinition, ExerciseId, RepThresholds } from '../types';

interface TrunkCurlThresholds extends RepThresholds {
  [key: string]: number;
  /** Hip-shoulder-ear angle below which the user is pulling on the neck. */
  minNeckAngle: number;
}

/** Sit-ups and crunches share the trunk-lift signal with different ranges. */
function trunkCurl(
  id: Extract<ExerciseId, 'sit_up' | 'crunch'>,
  base: TrunkCurlThresholds,
  beginner: Partial<TrunkCurlThresholds>,
): ExerciseDefinition<TrunkCurlThresholds> {
  return defineExercise<TrunkCurlThresholds>({
    id,
    nameKey: `exercises.names.${id}`,
    category: 'core',
    primaryMuscles: ['abs'],
    secondaryMuscles: id === 'sit_up' ? ['hip_flexors', 'obliques'] : ['obliques'],
    cameraPlacement: {
      view: 'side',
      distanceM: [1.5, 2.5],
      orientation: 'landscape',
      tipKey: 'placement.sideFloor',
    },
    required: { joints: ['shoulder', 'hip', 'knee'], sides: 'best' },
    mode: 'reps',
    thresholds: { base, difficulty: { beginner } },
    features: (ctx) => {
      'worklet';
      const s = ctx.skeleton;
      const j = joints(ctx);
      return { trunk: trunkLift(s, j), neck: neckAngle(s, j) };
    },
    counter: { signals: ['trunk'], peakWhen: 'above', minPhaseMs: 80, minRepMs: 700 },
    partialRepCue: id === 'sit_up' ? 'cues.allTheWayUp' : 'cues.liftShoulders',
    tempo: { minRepMs: 1000 },
    rules: [
      {
        id: `${id}.neck_pull`,
        severity: 'warning',
        cue: 'cues.neckRelaxed',
        message: 'form.neckRelaxed',
        cooldownMs: 6000,
        when: 'frame',
        phases: ['descending', 'peak'],
        persistMs: 250,
        check: (f, th) => {
          'worklet';
          return (f.neck ?? NaN) < th.minNeckAngle;
        },
      },
    ],
    signature: {
      // Sit-ups travel from lying to upright (mean tilt ≈ inclined); crunches stay low.
      orientation: id === 'sit_up' ? 'any' : 'horizontal',
      moving: [{ feature: 'trunk', minRange: id === 'sit_up' ? 40 : 12 }],
      still:
        id === 'sit_up'
          ? [{ feature: 'knee', maxRange: 30 }]
          : [{ feature: 'trunk', maxRange: 38 }],
      mean: [
        { feature: 'knee', max: 125 },
        { feature: 'kneeHeight', min: 0.3 },
      ],
    },
  });
}

/** Full sit-up: trunk from lying (≈0°) to upright (≥60°). */
export const sitUp = trunkCurl(
  'sit_up',
  { start: 20, peak: 60, partial: 40, target: 75, minNeckAngle: 120 },
  { peak: 50, target: 65 },
);

/** Crunch: shoulder blades off the floor (trunk ≈ 25-35°). */
export const crunch = trunkCurl(
  'crunch',
  { start: 8, peak: 25, partial: 16, target: 32, minNeckAngle: 120 },
  { peak: 20, target: 28 },
);
