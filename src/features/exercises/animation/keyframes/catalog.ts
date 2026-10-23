import { PRONE_HIGH, STANDING, SUPINE, pose } from './poses';
import type { ExerciseAnimation, Keyframe } from './types';

/**
 * Keyframes for the exercises that are not camera-tracked (warm-up, mobility,
 * variations). Same skeleton format as the tracked ones in library.ts; the
 * keyframe tests check every animation for loop-perfection, rigid limbs and
 * anatomical joint ranges.
 */

type Anim = Omit<ExerciseAnimation, 'keyframes'> & { keyframes: Keyframe[] };

/** A rep that goes start → peak (held briefly) → start, with optional step numbers. */
function rep(
  id: string,
  start: Keyframe['pose'],
  peak: Keyframe['pose'],
  o: Partial<Omit<Anim, 'id' | 'keyframes'>> & { steps?: [number, number, number] } = {},
): Anim {
  const [s1, s2, s3] = o.steps ?? [1, 2, 3];
  return {
    id,
    yawDeg: o.yawDeg ?? 90,
    durationMs: o.durationMs ?? 2600,
    anchor: o.anchor ?? 'floor',
    peakT: 0.5,
    keyframes: [
      { t: 0, pose: start, step: s1 },
      { t: 0.42, pose: peak, step: s2 },
      { t: 0.58, pose: peak, step: s2 },
      { t: 1, pose: start, step: s3 },
    ],
  };
}

/** A static hold with a subtle breathing motion. */
function hold(
  id: string,
  p: Keyframe['pose'],
  o: Partial<Omit<Anim, 'id' | 'keyframes'>> = {},
): Anim {
  return {
    id,
    yawDeg: o.yawDeg ?? 90,
    durationMs: o.durationMs ?? 4000,
    anchor: o.anchor ?? 'floor',
    peakT: 0.5,
    keyframes: [
      { t: 0, pose: p, step: 1 },
      { t: 0.5, pose: pose(p, { offsetY: p.offsetY + 0.012 }), step: 2 },
      { t: 1, pose: p, step: 2 },
    ],
  };
}

/** Alternating sides: start → left peak → start → right peak → start. */
function alternate(
  id: string,
  start: Keyframe['pose'],
  leftPeak: Keyframe['pose'],
  rightPeak: Keyframe['pose'],
  o: Partial<Omit<Anim, 'id' | 'keyframes'>> = {},
): Anim {
  return {
    id,
    yawDeg: o.yawDeg ?? 90,
    durationMs: o.durationMs ?? 3200,
    anchor: o.anchor ?? 'floor',
    peakT: 0.25,
    keyframes: [
      { t: 0, pose: start, step: 1 },
      { t: 0.25, pose: leftPeak, step: 2 },
      { t: 0.5, pose: start, step: 2 },
      { t: 0.75, pose: rightPeak, step: 3 },
      { t: 1, pose: start, step: 3 },
    ],
  };
}

// ---------- Bases ----------

/** Hands and knees, shoulders over wrists, hips over knees. */
const QUADRUPED = pose(STANDING, {
  torsoPitch: 74,
  both: { hipFlex: 0, knee: 90, footPitch: 180, shoulderFlex: 0, shoulderAbd: 5, elbow: 0 },
});

/** Lying face down, arms reaching forward along the floor. */
const PRONE_FLAT = pose(STANDING, {
  torsoPitch: 90,
  both: { hipFlex: -90, knee: 0, footPitch: -90, shoulderFlex: 90, shoulderAbd: 10, elbow: 0 },
});

/** Lying on the back with knees bent, feet flat, arms by the sides. */
const HOOK_LYING = pose(SUPINE, {
  both: { hipFlex: 135, knee: 95, footPitch: 0, shoulderFlex: 90, shoulderAbd: 8, elbow: 0 },
});

/** Kneeling plank (knee push-up top): straight line knees → shoulders. */
const KNEE_PLANK = pose(STANDING, {
  torsoPitch: 52,
  both: { hipFlex: -52, knee: 90, footPitch: -60, shoulderFlex: 0, shoulderAbd: 5, elbow: 0 },
});

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

// ---------- Upper body ----------

const inclinePushUp = rep(
  'incline_push_up',
  pose(STANDING, {
    torsoPitch: 50,
    both: { hipFlex: -50, knee: 0, footPitch: -40, shoulderFlex: 20, shoulderAbd: 5, elbow: 0 },
  }),
  pose(STANDING, {
    torsoPitch: 62,
    both: { hipFlex: -62, knee: 0, footPitch: -50, shoulderFlex: -40, shoulderAbd: 5, elbow: 105 },
  }),
  { anchor: 'ground', durationMs: 2200 },
);

const kneePushUp = rep(
  'knee_push_up',
  KNEE_PLANK,
  pose(KNEE_PLANK, { torsoPitch: 74, both: { hipFlex: -74, shoulderFlex: -50, elbow: 110 } }),
  { anchor: 'ground', durationMs: 2200 },
);

const DECLINE_TOP = pose(PRONE_HIGH, {
  torsoPitch: 98,
  both: { hipFlex: -98, footPitch: -100, shoulderFlex: 10 },
});
const declinePushUp = rep(
  'decline_push_up',
  DECLINE_TOP,
  pose(DECLINE_TOP, { torsoPitch: 104, both: { hipFlex: -104, shoulderFlex: -45, elbow: 115 } }),
  { anchor: 'ground', durationMs: 2400 },
);

const PIKE_TOP = pose(STANDING, {
  torsoPitch: 140,
  headFlex: 10,
  both: { hipFlex: -40, knee: 0, footPitch: -30, shoulderFlex: 0, shoulderAbd: 5, elbow: 0 },
});
const pikePushUp = rep(
  'pike_push_up',
  PIKE_TOP,
  pose(PIKE_TOP, { torsoPitch: 150, both: { hipFlex: -30, shoulderFlex: -35, elbow: 95 } }),
  { anchor: 'ground', durationMs: 2600 },
);

const DIP_TOP = pose(STANDING, {
  torsoPitch: 4,
  both: { hipFlex: 80, knee: 80, footPitch: 0, shoulderFlex: -25, shoulderAbd: 5, elbow: 0 },
});
const chairDip = rep(
  'chair_dip',
  DIP_TOP,
  pose(DIP_TOP, { torsoPitch: 8, both: { hipFlex: 70, knee: 100, shoulderFlex: -65, elbow: 95 } }),
  { anchor: 'ground', durationMs: 2400 },
);

const superman = rep(
  'superman',
  PRONE_FLAT,
  pose(PRONE_FLAT, {
    torsoPitch: 80,
    headFlex: 0,
    both: { hipFlex: -105, shoulderFlex: 105 },
  }),
  { anchor: 'ground', durationMs: 3000 },
);

const PRONE_Y = pose(PRONE_FLAT, { both: { shoulderFlex: 90, shoulderAbd: 40 } });
const proneYRaise = rep(
  'prone_y_raise',
  PRONE_Y,
  pose(PRONE_Y, { torsoPitch: 86, both: { shoulderFlex: 112, shoulderAbd: 40 } }),
  { anchor: 'ground', durationMs: 2600, yawDeg: 60 },
);

const SHOULDER_TAP_BASE = pose(PRONE_HIGH, { both: { hipAbd: 12 } });
const plankShoulderTap = alternate(
  'plank_shoulder_tap',
  SHOULDER_TAP_BASE,
  pose(SHOULDER_TAP_BASE, { right: { shoulderFlex: 35, shoulderAbd: 0, elbow: 140 } }),
  pose(SHOULDER_TAP_BASE, { left: { shoulderFlex: 35, shoulderAbd: 0, elbow: 140 } }),
  { anchor: 'ground', yawDeg: 75, durationMs: 2000 },
);

// ---------- Lower body ----------

const lungeBottom = pose(STANDING, {
  torsoPitch: 5,
  left: { hipFlex: 80, knee: 86 },
  right: { hipFlex: -15, knee: 98, footPitch: -60 },
});
const splitStance = pose(STANDING, {
  left: { hipFlex: 25, knee: 5 },
  right: { hipFlex: -25, knee: 5, footPitch: -30 },
});

const reverseLunge = rep('reverse_lunge', STANDING, lungeBottom, {
  anchor: 'ground',
  durationMs: 3000,
});
const splitSquat = rep('split_squat', splitStance, lungeBottom, { anchor: 'ground' });

const wallSit = hold(
  'wall_sit',
  pose(STANDING, { both: { hipFlex: 88, knee: 88, footPitch: 0, shoulderFlex: 0, elbow: 5 } }),
);

const calfRaise = rep('calf_raise', STANDING, pose(STANDING, { both: { footPitch: -28 } }), {
  durationMs: 2000,
});

const SUMO_TOP = pose(STANDING, {
  both: { hipAbd: 24, shinAbd: 24, shoulderFlex: 35, elbow: 110 },
});
const sumoSquat = rep(
  'sumo_squat',
  SUMO_TOP,
  pose(SUMO_TOP, {
    torsoPitch: 15,
    both: { hipFlex: 70, hipAbd: 34, shinAbd: 14, knee: 92 },
  }),
  { yawDeg: 0 },
);

const stepUp: Anim = {
  id: 'step_up',
  yawDeg: 90,
  durationMs: 3200,
  anchor: 'floor',
  peakT: 0.5,
  keyframes: [
    { t: 0, pose: STANDING, step: 1 },
    { t: 0.25, pose: pose(STANDING, { left: { hipFlex: 70, knee: 75 } }), step: 2 },
    {
      t: 0.5,
      pose: pose(STANDING, { offsetY: 0.45, right: { hipFlex: -5, knee: 35, footPitch: -30 } }),
      step: 3,
    },
    { t: 0.75, pose: pose(STANDING, { left: { hipFlex: 70, knee: 75 } }), step: 4 },
    { t: 1, pose: STANDING, step: 4 },
  ],
};

const singleLegBridge = rep(
  'single_leg_glute_bridge',
  pose(HOOK_LYING, { right: { hipFlex: 140, knee: 0, footPitch: 60 } }),
  pose(HOOK_LYING, {
    torsoPitch: -121,
    left: { hipFlex: 121, knee: 128 },
    right: { hipFlex: 121, knee: 0, footPitch: 60 },
  }),
  { anchor: 'ground' },
);

const SIDE_LYING_KNEES = pose(STANDING, {
  roll: 90,
  both: { hipFlex: 45, knee: 90, footPitch: 0, shoulderFlex: 0, elbow: 10 },
  left: { shoulderAbd: 160, elbow: 90 },
  right: { shoulderAbd: 10 },
});
const clamshell = rep(
  'clamshell',
  SIDE_LYING_KNEES,
  pose(SIDE_LYING_KNEES, { right: { hipAbd: 35, shinAbd: 10 } }),
  { yawDeg: 0, anchor: 'ground', durationMs: 2400 },
);

const jumpSquat: Anim = {
  id: 'jump_squat',
  yawDeg: 90,
  durationMs: 1800,
  anchor: 'floor',
  peakT: 0.3,
  keyframes: [
    { t: 0, pose: STANDING, step: 1 },
    { t: 0.3, pose: squatBottom, step: 2 },
    {
      t: 0.55,
      pose: pose(STANDING, { offsetY: 0.35, both: { shoulderFlex: -20, footPitch: -25 } }),
      step: 3,
    },
    {
      t: 0.75,
      pose: pose(squatBottom, { torsoPitch: 25, both: { hipFlex: 55, knee: 70 } }),
      step: 4,
    },
    { t: 1, pose: STANDING, step: 4 },
  ],
};

const HANDS_BEHIND_HEAD = { shoulderFlex: 150, shoulderAbd: 40, elbow: 140 };
const ARMS_CROSSED = { shoulderFlex: 25, shoulderAbd: 5, elbow: 135 };
const goodMorning = rep(
  'good_morning',
  pose(STANDING, { both: { knee: 12, ...ARMS_CROSSED } }),
  pose(STANDING, {
    torsoPitch: 72,
    both: { hipFlex: -8, knee: 18, ...ARMS_CROSSED, shoulderFlex: 95 },
  }),
  { durationMs: 3000 },
);

const standingHipAbduction = alternate(
  'standing_hip_abduction',
  pose(STANDING, { both: { shoulderAbd: 30, elbow: 90 } }),
  pose(STANDING, { both: { shoulderAbd: 30, elbow: 90 }, left: { hipAbd: 32 } }),
  pose(STANDING, { both: { shoulderAbd: 30, elbow: 90 }, right: { hipAbd: 32 } }),
  { yawDeg: 0 },
);

// ---------- Core ----------

const birdDog = alternate(
  'bird_dog',
  QUADRUPED,
  pose(QUADRUPED, { left: { shoulderFlex: 95, shoulderAbd: 5 }, right: { hipFlex: -88, knee: 0 } }),
  pose(QUADRUPED, { right: { shoulderFlex: 95, shoulderAbd: 5 }, left: { hipFlex: -88, knee: 0 } }),
  { anchor: 'ground', durationMs: 4400 },
);

const CURL_UP_BASE = pose(SUPINE, {
  left: { hipFlex: 135, knee: 95, footPitch: 0 },
  right: { hipFlex: 90, knee: 0, footPitch: 70 },
  both: { shoulderFlex: 175, shoulderAbd: 10, elbow: 150 },
});
const curlUp = rep('curl_up', CURL_UP_BASE, pose(CURL_UP_BASE, { torsoPitch: -78 }), {
  anchor: 'ground',
  durationMs: 3600,
});

const V_SIT = pose(STANDING, {
  torsoPitch: -40,
  both: { hipFlex: 125, knee: 60, footPitch: 20, shoulderFlex: 55, shoulderAbd: 10, elbow: 70 },
});
const russianTwist = alternate(
  'russian_twist',
  V_SIT,
  pose(V_SIT, { left: { shoulderAbd: 50, elbow: 40 }, right: { shoulderAbd: 0, elbow: 120 } }),
  pose(V_SIT, { right: { shoulderAbd: 50, elbow: 40 }, left: { shoulderAbd: 0, elbow: 120 } }),
  { yawDeg: 20, anchor: 'ground', durationMs: 2000 },
);

const FLUTTER = pose(SUPINE, {
  headFlex: 10,
  both: { hipFlex: 112, knee: 0, footPitch: 90, shoulderFlex: 90, elbow: 0 },
});
const flutterKicks = alternate(
  'flutter_kicks',
  FLUTTER,
  pose(FLUTTER, { left: { hipFlex: 128 }, right: { hipFlex: 104 } }),
  pose(FLUTTER, { right: { hipFlex: 128 }, left: { hipFlex: 104 } }),
  { anchor: 'ground', durationMs: 1200 },
);

const TABLETOP = pose(SUPINE, {
  both: { hipFlex: 180, knee: 90, footPitch: 90, shoulderFlex: 90, elbow: 0 },
});
const reverseCrunch = rep(
  'reverse_crunch',
  TABLETOP,
  pose(TABLETOP, { both: { hipFlex: 228, knee: 100 } }),
  { anchor: 'ground', durationMs: 2600 },
);

const hollowHold = hold(
  'hollow_hold',
  pose(SUPINE, {
    torsoPitch: -76,
    headFlex: 15,
    both: { hipFlex: 104, knee: 0, footPitch: 80, shoulderFlex: -100, shoulderAbd: 5, elbow: 0 },
  }),
  { anchor: 'ground' },
);

const DEAD_BUG = pose(SUPINE, {
  both: { hipFlex: 180, knee: 90, footPitch: 90, shoulderFlex: 180, shoulderAbd: 5, elbow: 0 },
});
const deadBug = alternate(
  'dead_bug',
  DEAD_BUG,
  pose(DEAD_BUG, { left: { shoulderFlex: -95 }, right: { hipFlex: 100, knee: 5, footPitch: 70 } }),
  pose(DEAD_BUG, { right: { shoulderFlex: -95 }, left: { hipFlex: 100, knee: 5, footPitch: 70 } }),
  { anchor: 'ground', durationMs: 4400 },
);

const BICYCLE = pose(SUPINE, {
  torsoPitch: -70,
  both: { hipFlex: 150, knee: 60, footPitch: 60, ...HANDS_BEHIND_HEAD },
});
const bicycleCrunch = alternate(
  'bicycle_crunch',
  BICYCLE,
  pose(BICYCLE, {
    torsoPitch: -62,
    left: { hipFlex: 205, knee: 110 },
    right: { hipFlex: 118, knee: 5 },
  }),
  pose(BICYCLE, {
    torsoPitch: -62,
    right: { hipFlex: 205, knee: 110 },
    left: { hipFlex: 118, knee: 5 },
  }),
  { anchor: 'ground', durationMs: 2400 },
);

/** Forearm side plank: body rolled onto the left side, upper arm vertical, forearm on the floor. */
const SIDE_PLANK = pose(STANDING, {
  roll: 77,
  both: { hipAbd: 3, knee: 0 },
  left: { shoulderAbd: 77, shoulderFlex: 0, elbow: 90, forearmAbd: 0 },
  right: { shoulderAbd: 10, elbow: 0 },
});
const sidePlank = hold('side_plank', SIDE_PLANK, { yawDeg: 0, anchor: 'ground' });

// ---------- Cardio ----------

const burpee: Anim = {
  id: 'burpee',
  yawDeg: 90,
  durationMs: 3200,
  anchor: 'floor',
  peakT: 0.4,
  keyframes: [
    { t: 0, pose: STANDING, step: 1 },
    {
      t: 0.2,
      pose: pose(squatBottom, { torsoPitch: 55, both: { shoulderFlex: 15, elbow: 0 } }),
      step: 2,
    },
    { t: 0.4, pose: PRONE_HIGH, step: 3 },
    {
      t: 0.6,
      pose: pose(squatBottom, { torsoPitch: 55, both: { shoulderFlex: 15, elbow: 0 } }),
      step: 4,
    },
    {
      t: 0.8,
      pose: pose(STANDING, { offsetY: 0.3, both: { shoulderFlex: 170, footPitch: -25 } }),
      step: 5,
    },
    { t: 1, pose: STANDING, step: 5 },
  ],
};

const skaterLeft = pose(STANDING, {
  offsetX: 0.5,
  torsoPitch: 25,
  left: { hipFlex: 40, knee: 50, shoulderFlex: -30 },
  right: { hipFlex: -10, hipAbd: -15, knee: 60, footPitch: -40, shoulderFlex: 50, elbow: 40 },
});
const skaterRight = pose(STANDING, {
  offsetX: -0.5,
  torsoPitch: 25,
  right: { hipFlex: 40, knee: 50, shoulderFlex: -30 },
  left: { hipFlex: -10, hipAbd: -15, knee: 60, footPitch: -40, shoulderFlex: 50, elbow: 40 },
});
const skaterJump = alternate('skater_jump', STANDING, skaterLeft, skaterRight, {
  yawDeg: 0,
  durationMs: 1800,
});

const stepJack = alternate(
  'step_jack',
  STANDING,
  pose(STANDING, { left: { hipAbd: 22 }, both: { shoulderAbd: 150 } }),
  pose(STANDING, { right: { hipAbd: 22 }, both: { shoulderAbd: 150 } }),
  { yawDeg: 0, durationMs: 2000 },
);

const MARCH_ARM = { shoulderFlex: 35, elbow: 80 };
const marchInPlace = alternate(
  'march_in_place',
  STANDING,
  pose(STANDING, { left: { hipFlex: 60, knee: 70 }, right: MARCH_ARM }),
  pose(STANDING, { right: { hipFlex: 60, knee: 70 }, left: MARCH_ARM }),
  { durationMs: 1600 },
);

// ---------- Mobility & warm-up ----------

const ARMS_OUT = pose(STANDING, { both: { shoulderAbd: 80, elbow: 0 } });
const armCircles: Anim = {
  id: 'arm_circles',
  yawDeg: 20,
  durationMs: 1600,
  anchor: 'floor',
  peakT: 0.5,
  keyframes: [
    { t: 0, pose: pose(ARMS_OUT, { both: { shoulderFlex: 0 } }), step: 1 },
    { t: 0.25, pose: pose(ARMS_OUT, { both: { shoulderFlex: 35, shoulderAbd: 70 } }), step: 2 },
    { t: 0.5, pose: pose(ARMS_OUT, { both: { shoulderFlex: 0, shoulderAbd: 60 } }), step: 2 },
    { t: 0.75, pose: pose(ARMS_OUT, { both: { shoulderFlex: -35, shoulderAbd: 70 } }), step: 3 },
    { t: 1, pose: pose(ARMS_OUT, { both: { shoulderFlex: 0 } }), step: 3 },
  ],
};

const HIPS_BASE = pose(STANDING, { both: { hipAbd: 10, shoulderAbd: 25, elbow: 100 } });
const hipCircles: Anim = {
  id: 'hip_circles',
  yawDeg: 30,
  durationMs: 3200,
  anchor: 'floor',
  peakT: 0.5,
  keyframes: [
    { t: 0, pose: pose(HIPS_BASE, { offsetX: 0 }), step: 1 },
    { t: 0.25, pose: pose(HIPS_BASE, { offsetX: 0.1, torsoPitch: -4 }), step: 2 },
    { t: 0.5, pose: pose(HIPS_BASE, { offsetZ: 0.08, torsoPitch: -6 }), step: 2 },
    { t: 0.75, pose: pose(HIPS_BASE, { offsetX: -0.1, torsoPitch: -4 }), step: 3 },
    { t: 1, pose: pose(HIPS_BASE, { offsetX: 0 }), step: 3 },
  ],
};

const catCow = alternate(
  'cat_cow',
  QUADRUPED,
  pose(QUADRUPED, { torsoPitch: 70, headFlex: -30 }),
  pose(QUADRUPED, { torsoPitch: 80, headFlex: 35 }),
  { durationMs: 6000, anchor: 'ground' },
);

const childsPose = hold(
  'childs_pose',
  pose(STANDING, {
    torsoPitch: 110,
    headFlex: 10,
    both: { hipFlex: 35, knee: 125, footPitch: 180, shoulderFlex: 80, shoulderAbd: 10, elbow: 0 },
  }),
  { durationMs: 5000, anchor: 'ground' },
);

const hamstringStretch = hold(
  'hamstring_stretch',
  pose(STANDING, {
    torsoPitch: 40,
    left: { hipFlex: 28, knee: 0, footPitch: 60, shoulderFlex: 35, elbow: 10 },
    right: { knee: 22, shoulderFlex: 35, elbow: 10 },
  }),
);

const quadStretch = hold(
  'quad_stretch',
  pose(STANDING, {
    right: { hipFlex: -5, knee: 140, footPitch: -80, shoulderFlex: -40, elbow: 30 },
    left: { shoulderAbd: 30 },
  }),
);

const HALF_KNEEL = pose(STANDING, {
  left: { hipFlex: 80, knee: 85, footPitch: 0 },
  right: { hipFlex: -10, knee: 95, footPitch: 180 },
  both: { shoulderFlex: 0, elbow: 10 },
});
const hipFlexorStretch = rep(
  'hip_flexor_stretch',
  HALF_KNEEL,
  pose(HALF_KNEEL, { left: { hipFlex: 62, knee: 90 }, right: { hipFlex: -28, knee: 85 } }),
  { anchor: 'ground', durationMs: 5000 },
);

const cobraStretch = rep(
  'cobra_stretch',
  pose(PRONE_FLAT, { both: { shoulderFlex: -20, elbow: 120, shoulderAbd: 15 } }),
  pose(PRONE_FLAT, {
    torsoPitch: 62,
    headFlex: -10,
    both: { hipFlex: -90, shoulderFlex: -10, elbow: 40, shoulderAbd: 15 },
  }),
  { anchor: 'ground', durationMs: 5000 },
);

const figureFour = hold(
  'figure_four_stretch',
  pose(SUPINE, {
    right: { hipFlex: 140, knee: 90, footPitch: 30 },
    left: { hipFlex: 122, hipAbd: 35, shinAbd: -10, knee: 100, footPitch: 10 },
    both: { shoulderFlex: 150, elbow: 60 },
  }),
  { anchor: 'ground', yawDeg: 90 },
);

const pelvicTilt = rep(
  'pelvic_tilt',
  HOOK_LYING,
  pose(HOOK_LYING, { torsoPitch: -94, both: { hipFlex: 139 } }),
  { anchor: 'ground', durationMs: 3600 },
);

const wallAngel = rep(
  'wall_angel',
  pose(STANDING, { both: { shoulderAbd: 85, shoulderFlex: 0, elbow: 90 } }),
  pose(STANDING, { both: { shoulderAbd: 160, shoulderFlex: 0, elbow: 20 } }),
  { yawDeg: 0, durationMs: 3600 },
);

export const CATALOG_ANIMATIONS: Readonly<Record<string, ExerciseAnimation>> = Object.fromEntries(
  [
    inclinePushUp,
    kneePushUp,
    declinePushUp,
    pikePushUp,
    chairDip,
    superman,
    proneYRaise,
    plankShoulderTap,
    reverseLunge,
    splitSquat,
    wallSit,
    calfRaise,
    sumoSquat,
    stepUp,
    singleLegBridge,
    clamshell,
    jumpSquat,
    goodMorning,
    standingHipAbduction,
    birdDog,
    curlUp,
    russianTwist,
    flutterKicks,
    reverseCrunch,
    hollowHold,
    deadBug,
    bicycleCrunch,
    sidePlank,
    burpee,
    skaterJump,
    stepJack,
    marchInPlace,
    armCircles,
    hipCircles,
    catCow,
    childsPose,
    hamstringStretch,
    quadStretch,
    hipFlexorStretch,
    cobraStretch,
    figureFour,
    pelvicTilt,
    wallAngel,
  ].map((a) => [a.id, a]),
);
