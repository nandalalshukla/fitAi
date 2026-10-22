import type { BodyPose3D, LimbAngles } from '../body3d';

/** Pose-building helpers for keyframes. */
export const NEUTRAL_LIMB: LimbAngles = {
  hipFlex: 0,
  hipAbd: 3,
  knee: 0,
  footPitch: 0,
  shoulderFlex: 0,
  shoulderAbd: 8,
  elbow: 5,
};

export const STANDING: BodyPose3D = {
  torsoPitch: 0,
  headFlex: 0,
  left: NEUTRAL_LIMB,
  right: NEUTRAL_LIMB,
  offsetY: 0,
  offsetZ: 0,
};

type PoseOverrides = Partial<Omit<BodyPose3D, 'left' | 'right'>> & {
  both?: Partial<LimbAngles>;
  left?: Partial<LimbAngles>;
  right?: Partial<LimbAngles>;
};

/** Builds a pose from a base with overrides (`both` applies to left and right). */
export function pose(base: BodyPose3D, o: PoseOverrides): BodyPose3D {
  const { both, left, right, ...rest } = o;
  return {
    ...base,
    ...rest,
    left: { ...base.left, ...both, ...left },
    right: { ...base.right, ...both, ...right },
  };
}

/** Prone straight-body base (push-up top / high plank): torso inclined, arms vertical. */
export const PRONE_HIGH: BodyPose3D = pose(STANDING, {
  torsoPitch: 72,
  headFlex: 0,
  both: { hipFlex: -72, knee: 0, footPitch: -80, shoulderFlex: -72 + 72, shoulderAbd: 5, elbow: 0 },
});

/** Supine base: lying on the back, legs straight. */
export const SUPINE: BodyPose3D = pose(STANDING, {
  torsoPitch: -90,
  headFlex: 0,
  both: { hipFlex: 90, knee: 0, footPitch: 70, shoulderFlex: -90, shoulderAbd: 5, elbow: 0 },
});
