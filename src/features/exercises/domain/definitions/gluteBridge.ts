import { defineExercise, hipAngle, joints, kneeAngle, offsetAboveLine } from '../features';
import type { RepThresholds } from '../types';

interface BridgeThresholds extends RepThresholds {
  [key: string]: number;
  /** Hip extension beyond a straight shoulder-hip-knee line (lower-back arch), degrees. */
  maxHyperextension: number;
}

/**
 * Glute bridge (lying on the back, knees bent), side view.
 * Signal: hip extension angle shoulder-hip-knee (≈120-135 down, ≈170-180 bridged,
 * >180 when over-arching).
 */
export const gluteBridge = defineExercise<BridgeThresholds>({
  id: 'glute_bridge',
  nameKey: 'exercises.names.glute_bridge',
  category: 'lower_body',
  primaryMuscles: ['glutes'],
  secondaryMuscles: ['hamstrings', 'lower_back'],
  cameraPlacement: {
    view: 'side',
    distanceM: [1.5, 2.5],
    orientation: 'landscape',
    tipKey: 'placement.sideFloor',
  },
  required: { joints: ['shoulder', 'hip', 'knee'], sides: 'best' },
  mode: 'reps',
  thresholds: {
    base: { start: 145, peak: 165, partial: 155, target: 175, maxHyperextension: 15 },
    difficulty: { beginner: { peak: 160, target: 170 } },
  },
  features: (ctx) => {
    'worklet';
    const s = ctx.skeleton;
    const j = joints(ctx);
    const a = hipAngle(s, j);
    // Hip above the shoulder→knee line = extended beyond straight: report > 180°.
    const above = offsetAboveLine(s, j.shoulder, j.knee, j.hip, ctx.torso) > 0;
    const hip = Number.isNaN(a) ? NaN : above ? 360 - a : a;
    return { hip, hyperextension: Math.max(0, hip - 180), knee: kneeAngle(s, j) };
  },
  counter: { signals: ['hip'], peakWhen: 'above', minPhaseMs: 80, minRepMs: 800 },
  partialRepCue: 'cues.hipsHigher',
  tempo: { minRepMs: 1200 },
  rules: [
    {
      id: 'glute_bridge.overarch',
      severity: 'warning',
      cue: 'cues.ribsDown',
      message: 'form.ribsDown',
      cooldownMs: 6000,
      when: 'frame',
      phases: ['peak'],
      persistMs: 250,
      check: (f, th) => {
        'worklet';
        return (f.hyperextension ?? NaN) > th.maxHyperextension;
      },
    },
  ],
  signature: {
    orientation: 'horizontal',
    moving: [{ feature: 'hip', minRange: 20 }],
    still: [{ feature: 'trunk', maxRange: 25 }],
    mean: [
      { feature: 'knee', max: 125 },
      { feature: 'kneeHeight', min: 0.3 },
    ],
  },
});
