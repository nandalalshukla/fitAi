import type { ExerciseId } from '../../domain/types';
import { NEUTRAL_LIMB, PRONE_HIGH, STANDING, SUPINE, pose } from './poses';
import type { ExerciseAnimation } from './types';

/**
 * Canonical keyframes for every camera-tracked exercise (one loop = one rep or
 * one alternating cycle). Tests assert these are anatomically plausible and land
 * inside each exercise's start/peak thresholds.
 */

const squatBottom = pose(STANDING, {
  torsoPitch: 38,
  headFlex: -25,
  both: {
    hipFlex: 88,
    hipAbd: 14,
    shinAbd: 4,
    knee: 105,
    shoulderFlex: 85,
    shoulderAbd: 5,
    elbow: 0,
  },
});

const squat: ExerciseAnimation = {
  id: 'squat',
  yawDeg: 90,
  durationMs: 2600,
  anchor: 'leftAnkle',
  peakT: 0.5,
  keyframes: [
    { t: 0, pose: STANDING, step: 1 },
    { t: 0.42, pose: squatBottom, step: 3 },
    { t: 0.58, pose: squatBottom, step: 3 },
    { t: 1, pose: STANDING, step: 4 },
  ],
};

const pushUpBottom = pose(PRONE_HIGH, {
  torsoPitch: 82,
  both: { hipFlex: -82, shoulderFlex: -55, elbow: 112 },
});

const pushUp: ExerciseAnimation = {
  id: 'push_up',
  yawDeg: 90,
  durationMs: 2200,
  anchor: 'leftAnkle',
  peakT: 0.5,
  keyframes: [
    { t: 0, pose: PRONE_HIGH, step: 1 },
    { t: 0.45, pose: pushUpBottom, step: 2 },
    { t: 0.55, pose: pushUpBottom, step: 2 },
    { t: 1, pose: PRONE_HIGH, step: 3 },
  ],
};

const jackClosed = pose(STANDING, { both: { hipAbd: 3, shoulderAbd: 10, elbow: 5 } });
const jackOpen = pose(STANDING, {
  offsetY: 0.12,
  both: { hipAbd: 19, shoulderAbd: 168, elbow: 5 },
});

const jumpingJack: ExerciseAnimation = {
  id: 'jumping_jack',
  yawDeg: 0,
  durationMs: 1100,
  anchor: 'floor',
  peakT: 0.5,
  keyframes: [
    { t: 0, pose: jackClosed, step: 1 },
    { t: 0.45, pose: jackOpen, step: 2 },
    { t: 0.55, pose: jackOpen, step: 2 },
    { t: 1, pose: jackClosed, step: 3 },
  ],
};

const forearmPlank = pose(PRONE_HIGH, {
  torsoPitch: 84,
  both: { hipFlex: -84, shoulderFlex: 0, elbow: 90 },
});

const plank: ExerciseAnimation = {
  id: 'plank',
  yawDeg: 90,
  durationMs: 4000,
  anchor: 'leftAnkle',
  peakT: 0.5,
  keyframes: [
    { t: 0, pose: forearmPlank, step: 1 },
    { t: 0.5, pose: pose(forearmPlank, { offsetY: 0.01 }), step: 2 },
    { t: 1, pose: forearmPlank, step: 2 },
  ],
};

const supineKneesBent = pose(SUPINE, {
  headFlex: 15,
  both: { hipFlex: 135, knee: 95, footPitch: 0, shoulderFlex: 100, elbow: 0 },
});

const sitUpTop = pose(supineKneesBent, {
  torsoPitch: -10,
  headFlex: 10,
  both: { shoulderFlex: 80 },
});
const crunchTop = pose(supineKneesBent, {
  torsoPitch: -58,
  headFlex: 15,
  both: { shoulderFlex: 120 },
});

const sitUp: ExerciseAnimation = {
  id: 'sit_up',
  yawDeg: 90,
  durationMs: 2600,
  anchor: 'hips',
  peakT: 0.5,
  keyframes: [
    { t: 0, pose: supineKneesBent, step: 1 },
    { t: 0.45, pose: sitUpTop, step: 2 },
    { t: 0.55, pose: sitUpTop, step: 2 },
    { t: 1, pose: supineKneesBent, step: 3 },
  ],
};

const crunch: ExerciseAnimation = {
  id: 'crunch',
  yawDeg: 90,
  durationMs: 2000,
  anchor: 'hips',
  peakT: 0.5,
  keyframes: [
    { t: 0, pose: supineKneesBent, step: 1 },
    { t: 0.42, pose: crunchTop, step: 2 },
    { t: 0.58, pose: crunchTop, step: 2 },
    { t: 1, pose: supineKneesBent, step: 3 },
  ],
};

const lungeTop = pose(STANDING, {
  left: { hipFlex: 25, knee: 5 },
  right: { hipFlex: -25, knee: 5, footPitch: -30 },
});
const lungeBottom = pose(STANDING, {
  torsoPitch: 5,
  left: { hipFlex: 80, knee: 86 },
  right: { hipFlex: -15, knee: 98, footPitch: -60 },
});

const lunge: ExerciseAnimation = {
  id: 'lunge',
  yawDeg: 90,
  durationMs: 2800,
  anchor: 'leftAnkle',
  peakT: 0.5,
  keyframes: [
    { t: 0, pose: lungeTop, step: 1 },
    { t: 0.42, pose: lungeBottom, step: 2 },
    { t: 0.58, pose: lungeBottom, step: 2 },
    { t: 1, pose: lungeTop, step: 3 },
  ],
};

const kneeUp = { hipFlex: 88, knee: 92, footPitch: -20 };
const highKnees: ExerciseAnimation = {
  id: 'high_knees',
  yawDeg: 0,
  durationMs: 800,
  anchor: 'floor',
  peakT: 0.25,
  keyframes: [
    { t: 0, pose: STANDING, step: 1 },
    {
      t: 0.25,
      pose: pose(STANDING, { offsetY: 0.04, left: kneeUp, right: { shoulderFlex: 50, elbow: 80 } }),
      step: 2,
    },
    { t: 0.5, pose: STANDING, step: 2 },
    {
      t: 0.75,
      pose: pose(STANDING, { offsetY: 0.04, right: kneeUp, left: { shoulderFlex: 50, elbow: 80 } }),
      step: 3,
    },
    { t: 1, pose: STANDING, step: 3 },
  ],
};

const drive = { hipFlex: 22, knee: 105, footPitch: -60 };
const mountainClimber: ExerciseAnimation = {
  id: 'mountain_climber',
  yawDeg: 90,
  durationMs: 900,
  anchor: 'wrists',
  peakT: 0.25,
  keyframes: [
    { t: 0, pose: PRONE_HIGH, step: 1 },
    { t: 0.25, pose: pose(PRONE_HIGH, { left: drive }), step: 2 },
    { t: 0.5, pose: PRONE_HIGH, step: 2 },
    { t: 0.75, pose: pose(PRONE_HIGH, { right: drive }), step: 3 },
    { t: 1, pose: PRONE_HIGH, step: 3 },
  ],
};

const bridgeDown = pose(SUPINE, {
  both: { hipFlex: 135, knee: 95, footPitch: 0, shoulderFlex: 90, elbow: 0 },
});
const bridgeUp = pose(SUPINE, {
  torsoPitch: -121,
  both: { hipFlex: 121, knee: 128, footPitch: 0, shoulderFlex: 90, elbow: 0 },
});

const gluteBridge: ExerciseAnimation = {
  id: 'glute_bridge',
  yawDeg: 90,
  durationMs: 2600,
  anchor: 'shoulders',
  peakT: 0.5,
  keyframes: [
    { t: 0, pose: bridgeDown, step: 1 },
    { t: 0.42, pose: bridgeUp, step: 2 },
    { t: 0.58, pose: bridgeUp, step: 2 },
    { t: 1, pose: bridgeDown, step: 3 },
  ],
};

const legsDown = pose(SUPINE, {
  both: { hipFlex: 96, knee: 3, footPitch: 70, shoulderFlex: 90, elbow: 0 },
});
const legsUp = pose(SUPINE, {
  both: { hipFlex: 172, knee: 5, footPitch: 150, shoulderFlex: 90, elbow: 0 },
});

const legRaise: ExerciseAnimation = {
  id: 'leg_raise',
  yawDeg: 90,
  durationMs: 2800,
  anchor: 'hips',
  peakT: 0.5,
  keyframes: [
    { t: 0, pose: legsDown, step: 1 },
    { t: 0.45, pose: legsUp, step: 2 },
    { t: 0.55, pose: legsUp, step: 2 },
    { t: 1, pose: legsDown, step: 3 },
  ],
};

export const ANIMATIONS: Record<ExerciseId, ExerciseAnimation> = {
  squat,
  push_up: pushUp,
  jumping_jack: jumpingJack,
  plank,
  sit_up: sitUp,
  crunch,
  lunge,
  high_knees: highKnees,
  mountain_climber: mountainClimber,
  glute_bridge: gluteBridge,
  leg_raise: legRaise,
};

export { NEUTRAL_LIMB };
