import { KEYPOINT_COUNT, KP } from '@/features/pose/domain/keypoints';

/**
 * Procedural 3D stick-figure used for (a) animated exercise demos and (b) synthetic
 * pose sequences in tests. Joint angles drive forward kinematics; the result is
 * projected into the same canonical 21-keypoint skeleton the pose engine uses,
 * so keyframes, live poses and the "ghost" target share one format.
 *
 * World axes (body units, torso length = 1): x = subject's LEFT, y = up, z = forward.
 * Sagittal angles are ABSOLUTE (world) angles in degrees measured from straight
 * down, positive = forward. This keeps lying exercises intuitive.
 */
export interface LimbAngles {
  /** Thigh direction from down, + forward. */
  hipFlex: number;
  /** Thigh abduction (outward), degrees. */
  hipAbd: number;
  /** Knee flexion (shin = thigh − knee), 0 = straight. */
  knee: number;
  /** Shin abduction (outward); defaults to `hipAbd`. Lower than hipAbd = knees out, higher = knees caving. */
  shinAbd?: number;
  /** Foot direction from forward-horizontal, + toes up. */
  footPitch: number;
  /** Upper-arm direction from down, + forward. */
  shoulderFlex: number;
  /** Arm abduction (outward), degrees. */
  shoulderAbd: number;
  /** Elbow flexion (forearm = upper arm + elbow), 0 = straight. */
  elbow: number;
}

export interface BodyPose3D {
  /** Torso (hip → shoulder) from vertical, + leaning forward (+90 prone, −90 supine). */
  torsoPitch: number;
  /** Head flexion relative to the torso, + chin to chest. */
  headFlex: number;
  left: LimbAngles;
  right: LimbAngles;
  /** Extra root translation (body units) applied after anchoring, e.g. jump height. */
  offsetY: number;
  offsetZ: number;
}

export const PROPORTIONS = {
  torso: 1,
  thigh: 0.9,
  shin: 0.85,
  upperArm: 0.62,
  forearm: 0.55,
  shoulderHalf: 0.38,
  hipHalf: 0.18,
  neck: 0.32,
  ankleHeight: 0.08,
  heelBack: 0.12,
  toeFront: 0.38,
} as const;

export type Vec3 = [number, number, number];

/** 21 canonical keypoints in 3D (index = canonical keypoint index). */
export type Body3D = Vec3[];

const RAD = Math.PI / 180;

function limbDir(flexDeg: number, abdDeg: number, side: 1 | -1): Vec3 {
  'worklet';
  const t = flexDeg * RAD;
  const a = abdDeg * RAD;
  return [side * Math.sin(a), -Math.cos(t) * Math.cos(a), Math.sin(t) * Math.cos(a)];
}

const add = (a: Vec3, b: Vec3, k = 1): Vec3 => {
  'worklet';
  return [a[0] + b[0] * k, a[1] + b[1] * k, a[2] + b[2] * k];
};

/** Forward kinematics with the hip centre at the origin. */
export function forwardKinematics(p: BodyPose3D): Body3D {
  'worklet';
  const P = PROPORTIONS;
  const out: Body3D = new Array<Vec3>(KEYPOINT_COUNT);
  for (let i = 0; i < KEYPOINT_COUNT; i++) out[i] = [0, 0, 0];
  const pt = p.torsoPitch * RAD;
  const up: Vec3 = [0, Math.cos(pt), Math.sin(pt)];
  const shoulderC: Vec3 = add([0, 0, 0], up, P.torso);

  const sides: [1 | -1, LimbAngles][] = [
    [1, p.left],
    [-1, p.right],
  ];
  for (const [side, l] of sides) {
    const isLeft = side === 1;
    const hip: Vec3 = [side * P.hipHalf, 0, 0];
    const knee = add(hip, limbDir(l.hipFlex, l.hipAbd, side), P.thigh);
    const ankle = add(knee, limbDir(l.hipFlex - l.knee, l.shinAbd ?? l.hipAbd, side), P.shin);
    const fp = l.footPitch * RAD;
    const fwd: Vec3 = [0, Math.sin(fp), Math.cos(fp)];
    const footUp: Vec3 = [0, Math.cos(fp), -Math.sin(fp)];
    const heel = add(add(ankle, fwd, -P.heelBack), footUp, -P.ankleHeight);
    const toe = add(add(ankle, fwd, P.toeFront), footUp, -P.ankleHeight);
    const shoulder = add(shoulderC, [side * P.shoulderHalf, 0, 0]);
    const elbow = add(shoulder, limbDir(l.shoulderFlex, l.shoulderAbd, side), P.upperArm);
    const wrist = add(elbow, limbDir(l.shoulderFlex + l.elbow, l.shoulderAbd, side), P.forearm);
    out[isLeft ? KP.left_hip : KP.right_hip] = hip;
    out[isLeft ? KP.left_knee : KP.right_knee] = knee;
    out[isLeft ? KP.left_ankle : KP.right_ankle] = ankle;
    out[isLeft ? KP.left_heel : KP.right_heel] = heel;
    out[isLeft ? KP.left_foot_index : KP.right_foot_index] = toe;
    out[isLeft ? KP.left_shoulder : KP.right_shoulder] = shoulder;
    out[isLeft ? KP.left_elbow : KP.right_elbow] = elbow;
    out[isLeft ? KP.left_wrist : KP.right_wrist] = wrist;
  }

  // Head: along the torso axis tilted by neck flexion; face points "forward" of the head axis.
  const hp = (p.torsoPitch + p.headFlex) * RAD;
  const headUp: Vec3 = [0, Math.cos(hp), Math.sin(hp)];
  const face: Vec3 = [0, -Math.sin(hp), Math.cos(hp)];
  const head = add(shoulderC, headUp, P.neck);
  out[KP.nose] = add(head, face, 0.12);
  out[KP.left_eye] = add(add(add(head, face, 0.09), headUp, 0.04), [0.035, 0, 0]);
  out[KP.right_eye] = add(add(add(head, face, 0.09), headUp, 0.04), [-0.035, 0, 0]);
  out[KP.left_ear] = add(add(head, face, -0.02), [0.08, 0, 0]);
  out[KP.right_ear] = add(add(head, face, -0.02), [-0.08, 0, 0]);
  return out;
}

export type Anchor = 'leftAnkle' | 'floor' | 'wrists' | 'shoulders' | 'hips';

/**
 * Translates the body so the anchor stays put across keyframes (feet planted,
 * hands on the floor...). 'floor' only lifts the lowest foot point to y = 0.
 */
export function anchorBody(body: Body3D, anchor: Anchor, reference: Body3D | null): Body3D {
  'worklet';
  let dy = 0;
  let dz = 0;
  const pick = (b: Body3D, a: Anchor): Vec3 => {
    switch (a) {
      case 'leftAnkle':
        return b[KP.left_ankle] ?? [0, 0, 0];
      case 'wrists': {
        const l = b[KP.left_wrist] ?? [0, 0, 0];
        const r = b[KP.right_wrist] ?? [0, 0, 0];
        return [0, Math.min(l[1], r[1]), (l[2] + r[2]) / 2];
      }
      case 'shoulders':
        return b[KP.left_shoulder] ?? [0, 0, 0];
      case 'hips':
        return b[KP.left_hip] ?? [0, 0, 0];
      default:
        return [0, 0, 0];
    }
  };
  if (anchor === 'floor') {
    let minY = Infinity;
    for (const k of [KP.left_heel, KP.right_heel, KP.left_foot_index, KP.right_foot_index]) {
      minY = Math.min(minY, body[k]?.[1] ?? Infinity);
    }
    dy = -minY;
  } else {
    const target = reference ? pick(reference, anchor) : pick(body, anchor);
    const cur = pick(body, anchor);
    dy = target[1] - cur[1];
    dz = target[2] - cur[2];
  }
  return body.map((v) => [v[0], v[1] + dy, v[2] + dz] as Vec3);
}

export interface Projection {
  /** Camera yaw around the vertical axis: 90 = side view (forward → screen right), 0 = facing the camera. */
  yawDeg: number;
  /** Small camera pitch (looking down), degrees. */
  pitchDeg?: number;
}

/** Orthographic projection to 2D screen coords (x right, y DOWN), body units. */
export function project(
  body: Body3D,
  proj: Projection,
): { x: number[]; y: number[]; depth: number[] } {
  'worklet';
  const yaw = proj.yawDeg * RAD;
  const pitch = (proj.pitchDeg ?? 0) * RAD;
  const x: number[] = [];
  const y: number[] = [];
  const depth: number[] = [];
  for (const v of body) {
    const u = v[0] * Math.cos(yaw) + v[2] * Math.sin(yaw);
    const d = -v[0] * Math.sin(yaw) + v[2] * Math.cos(yaw);
    // Pitch: rotate around the screen x axis.
    const vy = v[1] * Math.cos(pitch) - d * Math.sin(pitch);
    const vd = v[1] * Math.sin(pitch) + d * Math.cos(pitch);
    x.push(u);
    y.push(-vy);
    depth.push(vd);
  }
  return { x, y, depth };
}
