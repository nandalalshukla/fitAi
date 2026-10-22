import type { Difficulty } from '../domain/types';
import type { SyntheticScenario } from '../testing/synthetic';
import type { ReplayExpectation } from './fixture';

/**
 * Synthetic replay scenarios. `npm run fixtures:generate` renders each into
 * src/features/exercises/replay/__fixtures__/<name>.json, which the replay tests
 * run through the real engine. Device recordings (Pose lab → Record) use the same
 * format and live next to them with source: 'device'.
 */
export interface ScenarioSpec {
  name: string;
  description: string;
  scenario: SyntheticScenario;
  options: { difficulty: Difficulty; view?: 'side' | 'front' };
  expect: ReplayExpectation;
}

const PORTRAIT = { width: 720, height: 1280 };
const LANDSCAPE = { width: 1280, height: 720 };
const FPS = 15;
const NOISE = 3;
const DROPOUT = 0.01;
const varied = (n: number, base: number, spread: number) =>
  Array.from({ length: n }, (_, i) => base + spread * Math.sin(i * 2.1));

const S = (
  name: string,
  description: string,
  spec: Omit<ScenarioSpec, 'name' | 'description'>,
): ScenarioSpec => ({
  name,
  description,
  ...spec,
});

const base = { fps: FPS, noisePx: NOISE, dropoutRate: DROPOUT, restMs: 400 };
const inter = { difficulty: 'intermediate' as const };

export const SCENARIOS: ScenarioSpec[] = [
  // ── Squat ───────────────────────────────────────────────────────────────
  S('squat_side_good', '10 good squats, side view, varied tempo', {
    scenario: {
      ...base,
      exercise: 'squat',
      view: 'side',
      loops: 10,
      loopMs: varied(10, 2700, 400),
      frame: PORTRAIT,
      seed: 101,
    },
    options: inter,
    expect: {
      reps: 10,
      forbiddenFlags: ['squat.torso_lean', 'squat.heels_lift', 'squat.knees_cave'],
      tempo: false,
      classifiedAs: 'squat',
    },
  }),
  S(
    'squat_side_shallow',
    '5 full + 3 shallow squats: shallow ones are not counted and trigger "go lower"',
    {
      scenario: {
        ...base,
        exercise: 'squat',
        view: 'side',
        loops: 8,
        depth: [1, 0.45, 1, 1, 0.5, 1, 0.45, 1],
        restMs: 1500,
        frame: PORTRAIT,
        seed: 102,
      },
      options: inter,
      expect: { reps: 5, minPartialReps: 2 },
    },
  ),
  S(
    'squat_side_jitter',
    '10 squats with heavy keypoint jitter (8 px) and 4 % confidence dropouts',
    {
      scenario: {
        ...base,
        exercise: 'squat',
        view: 'side',
        loops: 10,
        noisePx: 8,
        dropoutRate: 0.04,
        frame: PORTRAIT,
        seed: 103,
      },
      options: inter,
      expect: { reps: 10, forbiddenFlags: ['squat.torso_lean'] },
    },
  ),
  S(
    'squat_side_occluded_rest',
    '8 squats; legs occluded for 1 s between reps 4 and 5 → counting pauses and resumes',
    {
      scenario: {
        ...base,
        exercise: 'squat',
        view: 'side',
        loops: 8,
        restMs: 1400,
        frame: PORTRAIT,
        seed: 104,
        occlusions: [
          {
            fromMs: 1500 + 4 * 2600 + 3 * 1400 + 150,
            toMs: 1500 + 4 * 2600 + 3 * 1400 + 1250,
            keypoints: ['left_knee', 'right_knee', 'left_ankle', 'right_ankle'],
          },
        ],
      },
      options: inter,
      expect: { reps: 8, visibilityLost: true },
    },
  ),
  S(
    'squat_side_brief_occlusion',
    '8 squats; ankles drop out for 250 ms mid-rep (shorter than the gating hysteresis)',
    {
      scenario: {
        ...base,
        exercise: 'squat',
        view: 'side',
        loops: 8,
        frame: PORTRAIT,
        seed: 105,
        occlusions: [
          {
            fromMs: 1500 + 2 * 3000 + 900,
            toMs: 1500 + 2 * 3000 + 1150,
            keypoints: ['left_ankle', 'right_ankle'],
          },
        ],
      },
      options: inter,
      expect: { reps: 8, visibilityLost: false },
    },
  ),
  S('squat_side_lean', '6 squats with excessive forward torso lean', {
    scenario: {
      ...base,
      exercise: 'squat',
      view: 'side',
      loops: 6,
      fault: { kind: 'squat_lean' },
      frame: PORTRAIT,
      seed: 106,
    },
    options: inter,
    expect: { reps: 6, formFlags: ['squat.torso_lean'] },
  }),
  S('squat_side_fast', '8 rushed squats (0.9 s each) → tempo cue', {
    scenario: {
      ...base,
      exercise: 'squat',
      view: 'side',
      loops: 8,
      loopMs: 900,
      frame: PORTRAIT,
      seed: 107,
    },
    options: inter,
    expect: { reps: 8, tempo: true },
  }),
  S('squat_side_yaw', '10 squats filmed 25° off the side (imperfect camera placement)', {
    scenario: {
      ...base,
      exercise: 'squat',
      view: 'side',
      yawOffsetDeg: 25,
      loops: 10,
      frame: PORTRAIT,
      seed: 108,
    },
    options: inter,
    expect: { reps: 10 },
  }),
  S('squat_front_good', '8 squats facing the camera (thigh-drop signal), knees tracking out', {
    scenario: { ...base, exercise: 'squat', view: 'front', loops: 8, frame: PORTRAIT, seed: 109 },
    options: { difficulty: 'intermediate', view: 'front' },
    expect: { reps: 8, forbiddenFlags: ['squat.knees_cave'], classifiedAs: 'squat' },
  }),
  S('squat_front_knees_cave', '6 front-view squats with knees caving in', {
    scenario: {
      ...base,
      exercise: 'squat',
      view: 'front',
      loops: 6,
      fault: { kind: 'squat_knees_cave' },
      frame: PORTRAIT,
      seed: 110,
    },
    options: { difficulty: 'intermediate', view: 'front' },
    expect: { reps: 6, formFlags: ['squat.knees_cave'] },
  }),
  S('idle_standing', 'Standing still with sway and noise for 10 s: no reps, no cues', {
    scenario: {
      ...base,
      exercise: 'squat',
      view: 'side',
      loops: 0,
      leadInMs: 10000,
      leadOutMs: 0,
      noisePx: 5,
      frame: PORTRAIT,
      seed: 111,
    },
    options: inter,
    expect: {
      reps: 0,
      minPartialReps: 0,
      forbiddenFlags: ['squat.torso_lean', 'squat.heels_lift'],
      classifiedAs: null,
    },
  }),

  // ── Push-up ─────────────────────────────────────────────────────────────
  S('push_up_side_good', '10 good push-ups', {
    scenario: {
      ...base,
      exercise: 'push_up',
      view: 'side',
      loops: 10,
      loopMs: varied(10, 2200, 300),
      frame: LANDSCAPE,
      seed: 201,
    },
    options: inter,
    expect: {
      reps: 10,
      forbiddenFlags: ['push_up.hips_sag', 'push_up.hips_pike'],
      classifiedAs: 'push_up',
    },
  }),
  S('push_up_side_sag', '6 push-ups with sagging hips', {
    scenario: {
      ...base,
      exercise: 'push_up',
      view: 'side',
      loops: 6,
      fault: { kind: 'push_up_sag' },
      frame: LANDSCAPE,
      seed: 202,
    },
    options: inter,
    expect: { reps: 6, formFlags: ['push_up.hips_sag'], forbiddenFlags: ['push_up.hips_pike'] },
  }),
  S('push_up_side_pike', '6 push-ups with hips piked up', {
    scenario: {
      ...base,
      exercise: 'push_up',
      view: 'side',
      loops: 6,
      fault: { kind: 'push_up_pike' },
      frame: LANDSCAPE,
      seed: 203,
    },
    options: inter,
    expect: { reps: 6, formFlags: ['push_up.hips_pike'], forbiddenFlags: ['push_up.hips_sag'] },
  }),
  S('push_up_side_shallow', '4 full + 4 half push-ups', {
    scenario: {
      ...base,
      exercise: 'push_up',
      view: 'side',
      loops: 8,
      depth: [1, 0.55, 1, 0.55, 1, 0.55, 1, 0.55],
      restMs: 1200,
      frame: LANDSCAPE,
      seed: 204,
    },
    options: inter,
    expect: { reps: 4, minPartialReps: 2 },
  }),
  S('push_up_side_jitter', '10 push-ups with 8 px jitter and dropouts', {
    scenario: {
      ...base,
      exercise: 'push_up',
      view: 'side',
      loops: 10,
      noisePx: 8,
      dropoutRate: 0.04,
      frame: LANDSCAPE,
      seed: 205,
    },
    options: inter,
    expect: { reps: 10 },
  }),

  // ── Jumping jack ────────────────────────────────────────────────────────
  S('jumping_jack_front_good', '15 jumping jacks', {
    scenario: {
      ...base,
      exercise: 'jumping_jack',
      view: 'front',
      loops: 15,
      loopMs: varied(15, 1100, 150),
      restMs: 0,
      frame: PORTRAIT,
      seed: 301,
    },
    options: inter,
    expect: {
      reps: 15,
      forbiddenFlags: ['jumping_jack.arms_low', 'jumping_jack.feet_narrow'],
      classifiedAs: 'jumping_jack',
    },
  }),
  S('jumping_jack_front_low_arms', '10 jumping jacks with arms only to shoulder height', {
    scenario: {
      ...base,
      exercise: 'jumping_jack',
      view: 'front',
      loops: 10,
      restMs: 0,
      fault: { kind: 'jack_low_arms' },
      frame: PORTRAIT,
      seed: 302,
    },
    options: inter,
    expect: { reps: 10, formFlags: ['jumping_jack.arms_low'] },
  }),

  // ── Plank ───────────────────────────────────────────────────────────────
  S('plank_side_good', '32 s forearm plank → milestones at 10/20/30 s', {
    scenario: {
      ...base,
      exercise: 'plank',
      view: 'side',
      loops: 0,
      leadInMs: 32000,
      leadOutMs: 0,
      frame: LANDSCAPE,
      seed: 401,
    },
    options: inter,
    expect: {
      holdSeconds: { min: 30, max: 32.5 },
      milestones: [10, 20, 30],
      forbiddenFlags: ['plank.hips_sag', 'plank.hips_high'],
      classifiedAs: 'plank',
    },
  }),
  S('plank_side_sag', '20 s plank, hips sag after 5 s', {
    scenario: {
      ...base,
      exercise: 'plank',
      view: 'side',
      loops: 0,
      leadInMs: 20000,
      leadOutMs: 0,
      fault: { kind: 'plank_sag', fromMs: 5000 },
      frame: LANDSCAPE,
      seed: 402,
    },
    options: inter,
    expect: { formFlags: ['plank.hips_sag'], holdSeconds: { min: 15, max: 20.5 } },
  }),

  // ── Core ────────────────────────────────────────────────────────────────
  S('sit_up_side_good', '8 sit-ups', {
    scenario: { ...base, exercise: 'sit_up', view: 'side', loops: 8, frame: LANDSCAPE, seed: 501 },
    options: inter,
    expect: { reps: 8, forbiddenFlags: ['sit_up.neck_pull'], classifiedAs: 'sit_up' },
  }),
  S('crunch_side_good', '10 crunches', {
    scenario: { ...base, exercise: 'crunch', view: 'side', loops: 10, frame: LANDSCAPE, seed: 502 },
    options: inter,
    expect: { reps: 10, forbiddenFlags: ['crunch.neck_pull'], classifiedAs: 'crunch' },
  }),
  S('glute_bridge_side_good', '8 glute bridges', {
    scenario: {
      ...base,
      exercise: 'glute_bridge',
      view: 'side',
      loops: 8,
      frame: LANDSCAPE,
      seed: 503,
    },
    options: inter,
    expect: { reps: 8, forbiddenFlags: ['glute_bridge.overarch'], classifiedAs: 'glute_bridge' },
  }),
  S('glute_bridge_side_overarch', '6 bridges with lower-back over-arch at the top', {
    scenario: {
      ...base,
      exercise: 'glute_bridge',
      view: 'side',
      loops: 6,
      fault: { kind: 'bridge_overarch' },
      frame: LANDSCAPE,
      seed: 504,
    },
    options: inter,
    expect: { reps: 6, formFlags: ['glute_bridge.overarch'] },
  }),
  S('leg_raise_side_good', '8 lying leg raises', {
    scenario: {
      ...base,
      exercise: 'leg_raise',
      view: 'side',
      loops: 8,
      frame: LANDSCAPE,
      seed: 505,
    },
    options: inter,
    expect: { reps: 8, forbiddenFlags: ['leg_raise.knees_bent'], classifiedAs: 'leg_raise' },
  }),

  // ── Lunge ───────────────────────────────────────────────────────────────
  S('lunge_side_good', '8 lunges', {
    scenario: { ...base, exercise: 'lunge', view: 'side', loops: 8, frame: PORTRAIT, seed: 601 },
    options: inter,
    expect: {
      reps: 8,
      forbiddenFlags: ['lunge.knee_past_toes', 'lunge.torso_lean'],
      classifiedAs: 'lunge',
    },
  }),
  S('lunge_side_lean', '6 lunges leaning forward', {
    scenario: {
      ...base,
      exercise: 'lunge',
      view: 'side',
      loops: 6,
      fault: { kind: 'lunge_lean' },
      frame: PORTRAIT,
      seed: 602,
    },
    options: inter,
    expect: { reps: 6, formFlags: ['lunge.torso_lean'] },
  }),

  // ── Cardio (alternating) ────────────────────────────────────────────────
  S('high_knees_front', '12 high-knee cycles facing the camera (24 knee lifts)', {
    scenario: {
      ...base,
      exercise: 'high_knees',
      view: 'front',
      loops: 12,
      loopMs: varied(12, 800, 80),
      restMs: 0,
      frame: PORTRAIT,
      seed: 701,
    },
    options: inter,
    expect: { reps: 24, classifiedAs: 'high_knees' },
  }),
  S('high_knees_side', '10 high-knee cycles from the side (20 knee lifts)', {
    scenario: {
      ...base,
      exercise: 'high_knees',
      view: 'side',
      loops: 10,
      restMs: 0,
      frame: PORTRAIT,
      seed: 702,
    },
    options: { difficulty: 'intermediate', view: 'side' },
    expect: { reps: 20, classifiedAs: 'high_knees' },
  }),
  S('mountain_climber_side', '12 mountain-climber cycles (24 knee drives)', {
    scenario: {
      ...base,
      exercise: 'mountain_climber',
      view: 'side',
      loops: 12,
      loopMs: varied(12, 900, 100),
      restMs: 0,
      frame: LANDSCAPE,
      seed: 801,
    },
    options: inter,
    expect: {
      reps: 24,
      forbiddenFlags: ['mountain_climber.hips_high'],
      classifiedAs: 'mountain_climber',
    },
  }),
];
