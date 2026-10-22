/**
 * Canonical skeleton used across the app, independent of the pose model.
 * Indices 0-16 follow COCO-17 (MoveNet order); 17-20 are foot points only
 * BlazePose provides (MoveNet reports them with score 0).
 * "left"/"right" are the SUBJECT's left/right.
 */
export const KEYPOINT_NAMES = [
  'nose',
  'left_eye',
  'right_eye',
  'left_ear',
  'right_ear',
  'left_shoulder',
  'right_shoulder',
  'left_elbow',
  'right_elbow',
  'left_wrist',
  'right_wrist',
  'left_hip',
  'right_hip',
  'left_knee',
  'right_knee',
  'left_ankle',
  'right_ankle',
  'left_heel',
  'right_heel',
  'left_foot_index',
  'right_foot_index',
] as const;

export type KeypointName = (typeof KEYPOINT_NAMES)[number];

export const KEYPOINT_COUNT = KEYPOINT_NAMES.length;
/** Values per keypoint in `Pose.points`: x, y, score. */
export const KEYPOINT_STRIDE = 3;

export const KP: Readonly<Record<KeypointName, number>> = Object.freeze(
  Object.fromEntries(KEYPOINT_NAMES.map((n, i) => [n, i])) as Record<KeypointName, number>,
);

/** BlazePose (33 landmarks) index for each canonical keypoint. */
export const BLAZEPOSE_TO_CANONICAL: readonly number[] = [
  0, 2, 5, 7, 8, 11, 12, 13, 14, 15, 16, 23, 24, 25, 26, 27, 28, 29, 30, 31, 32,
];

/** Bones drawn by the skeleton overlay (pairs of canonical indices). */
export const SKELETON_EDGES: readonly (readonly [number, number])[] = [
  [KP.left_shoulder, KP.right_shoulder],
  [KP.left_shoulder, KP.left_elbow],
  [KP.left_elbow, KP.left_wrist],
  [KP.right_shoulder, KP.right_elbow],
  [KP.right_elbow, KP.right_wrist],
  [KP.left_shoulder, KP.left_hip],
  [KP.right_shoulder, KP.right_hip],
  [KP.left_hip, KP.right_hip],
  [KP.left_hip, KP.left_knee],
  [KP.left_knee, KP.left_ankle],
  [KP.right_hip, KP.right_knee],
  [KP.right_knee, KP.right_ankle],
  [KP.left_ankle, KP.left_heel],
  [KP.left_heel, KP.left_foot_index],
  [KP.left_ankle, KP.left_foot_index],
  [KP.right_ankle, KP.right_heel],
  [KP.right_heel, KP.right_foot_index],
  [KP.right_ankle, KP.right_foot_index],
  [KP.nose, KP.left_eye],
  [KP.nose, KP.right_eye],
  [KP.left_eye, KP.left_ear],
  [KP.right_eye, KP.right_ear],
];
