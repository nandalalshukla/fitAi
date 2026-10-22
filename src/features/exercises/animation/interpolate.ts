import {
  anchorBody,
  forwardKinematics,
  type Body3D,
  type BodyPose3D,
  type LimbAngles,
} from './body3d';
import type { ExerciseAnimation } from './keyframes/types';

/** Smoothstep easing between keyframes (zero velocity at each keyframe). */
const ease = (x: number) => {
  'worklet';
  return x * x * (3 - 2 * x);
};

function lerpLimb(a: LimbAngles, b: LimbAngles, k: number): LimbAngles {
  'worklet';
  return {
    hipFlex: a.hipFlex + (b.hipFlex - a.hipFlex) * k,
    hipAbd: a.hipAbd + (b.hipAbd - a.hipAbd) * k,
    knee: a.knee + (b.knee - a.knee) * k,
    shinAbd: (a.shinAbd ?? a.hipAbd) + ((b.shinAbd ?? b.hipAbd) - (a.shinAbd ?? a.hipAbd)) * k,
    footPitch: a.footPitch + (b.footPitch - a.footPitch) * k,
    shoulderFlex: a.shoulderFlex + (b.shoulderFlex - a.shoulderFlex) * k,
    shoulderAbd: a.shoulderAbd + (b.shoulderAbd - a.shoulderAbd) * k,
    elbow: a.elbow + (b.elbow - a.elbow) * k,
  };
}

export function lerpPose(a: BodyPose3D, b: BodyPose3D, k: number): BodyPose3D {
  'worklet';
  return {
    torsoPitch: a.torsoPitch + (b.torsoPitch - a.torsoPitch) * k,
    headFlex: a.headFlex + (b.headFlex - a.headFlex) * k,
    left: lerpLimb(a.left, b.left, k),
    right: lerpLimb(a.right, b.right, k),
    offsetY: a.offsetY + (b.offsetY - a.offsetY) * k,
    offsetZ: a.offsetZ + (b.offsetZ - a.offsetZ) * k,
  };
}

/** Pose at loop time t ∈ [0, 1] (wraps), eased between keyframes. */
export function poseAt(anim: ExerciseAnimation, t: number): BodyPose3D {
  'worklet';
  const kf = anim.keyframes;
  const tt = ((t % 1) + 1) % 1;
  for (let i = 0; i < kf.length - 1; i++) {
    const a = kf[i]!;
    const b = kf[i + 1]!;
    if (tt >= a.t && tt <= b.t) {
      const span = b.t - a.t;
      return lerpPose(a.pose, b.pose, span > 0 ? ease((tt - a.t) / span) : 0);
    }
  }
  return kf[0]!.pose;
}

/** Index of the keyframe segment (for step-synced instructions). */
export function stepAt(anim: ExerciseAnimation, t: number): number {
  'worklet';
  const kf = anim.keyframes;
  const tt = ((t % 1) + 1) % 1;
  let step = kf[0]?.step ?? 1;
  for (const k of kf) if (k.t <= tt && k.step !== undefined) step = k.step;
  return step;
}

/** 3D body at time t, anchored to the animation's anchor (relative to the first keyframe). */
export function bodyAt(anim: ExerciseAnimation, t: number, posture?: BodyPose3D): Body3D {
  'worklet';
  const p = posture ?? poseAt(anim, t);
  // Anchor relative to the first keyframe standing on the floor, so planted points don't drift.
  const reference = anchorBody(forwardKinematics(anim.keyframes[0]!.pose), 'floor', null);
  const body = anchorBody(
    forwardKinematics(p),
    anim.anchor,
    anim.anchor === 'floor' ? null : reference,
  );
  return body.map((v) => [v[0], v[1] + p.offsetY, v[2] + p.offsetZ]);
}
