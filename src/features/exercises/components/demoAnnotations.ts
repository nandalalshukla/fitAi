import { KP } from '@/features/pose/domain/keypoints';

/**
 * Which skeleton segments light up for each muscle group in the animated demo
 * (stylised: a thigh for quads/hamstrings, the torso for the core, …).
 */
type Segment = readonly [number, number];

const THIGHS: Segment[] = [
  [KP.left_hip, KP.left_knee],
  [KP.right_hip, KP.right_knee],
];
const SHINS: Segment[] = [
  [KP.left_knee, KP.left_ankle],
  [KP.right_knee, KP.right_ankle],
];
const UPPER_ARMS: Segment[] = [
  [KP.left_shoulder, KP.left_elbow],
  [KP.right_shoulder, KP.right_elbow],
];
const TORSO_SIDES: Segment[] = [
  [KP.left_shoulder, KP.left_hip],
  [KP.right_shoulder, KP.right_hip],
];
const SHOULDER_LINE: Segment[] = [[KP.left_shoulder, KP.right_shoulder]];
const HIP_LINE: Segment[] = [[KP.left_hip, KP.right_hip]];

export const MUSCLE_SEGMENTS: Readonly<Record<string, readonly Segment[]>> = {
  quads: THIGHS,
  hamstrings: THIGHS,
  hip_flexors: THIGHS,
  adductors: THIGHS,
  glutes: [...HIP_LINE, ...THIGHS],
  calves: SHINS,
  chest: [...SHOULDER_LINE, ...UPPER_ARMS],
  shoulders: UPPER_ARMS,
  triceps: UPPER_ARMS,
  biceps: UPPER_ARMS,
  upper_back: [...SHOULDER_LINE, ...TORSO_SIDES],
  lats: TORSO_SIDES,
  abs: TORSO_SIDES,
  obliques: TORSO_SIDES,
  lower_back: [...TORSO_SIDES, ...HIP_LINE],
  full_body: [],
};

/** Unique segments to highlight for a list of muscles. */
export function segmentsFor(muscles: readonly string[]): Segment[] {
  const seen = new Set<string>();
  const out: Segment[] = [];
  for (const m of muscles)
    for (const s of MUSCLE_SEGMENTS[m] ?? []) {
      const key = `${s[0]}-${s[1]}`;
      if (!seen.has(key)) {
        seen.add(key);
        out.push(s);
      }
    }
  return out;
}

/** Joint the on-screen label for a voice cue attaches to. */
export const CUE_ANCHORS: Readonly<Record<string, number>> = {
  'cues.goLower': KP.left_hip,
  'cues.chestUp': KP.left_shoulder,
  'cues.kneesOut': KP.left_knee,
  'cues.heelsDown': KP.left_heel,
  'cues.hipsUp': KP.left_hip,
  'cues.hipsDown': KP.left_hip,
  'cues.neckNeutral': KP.nose,
  'cues.armsHigher': KP.left_wrist,
  'cues.feetWider': KP.left_ankle,
  'cues.allTheWayUp': KP.left_shoulder,
  'cues.liftShoulders': KP.left_shoulder,
  'cues.neckRelaxed': KP.nose,
  'cues.kneeBehindToes': KP.left_knee,
  'cues.torsoUpright': KP.left_shoulder,
  'cues.kneesHigher': KP.left_knee,
  'cues.kneesToChest': KP.left_knee,
  'cues.hipsHigher': KP.left_hip,
  'cues.ribsDown': KP.left_hip,
  'cues.legsHigher': KP.left_ankle,
  'cues.legsStraight': KP.left_knee,
};
