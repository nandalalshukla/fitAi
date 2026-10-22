import {
  angle,
  bodyOrientation,
  deviationFromHorizontal,
  deviationFromVertical,
  estimateView,
  jointAngle,
  pointLineDistance,
  signedAngle,
  torsoLength,
  torsoTilt,
} from '../geometry';
import { KEYPOINT_COUNT, KP } from '../keypoints';
import type { Skeleton } from '../skeleton';
import { bestSide, checkVisibility, toSkeleton } from '../skeleton';

const skeleton = (
  pts: Partial<Record<keyof typeof KP, [number, number]>>,
  score = 0.9,
): Skeleton => {
  const s: Skeleton = {
    x: Array(KEYPOINT_COUNT).fill(0),
    y: Array(KEYPOINT_COUNT).fill(0),
    score: Array(KEYPOINT_COUNT).fill(0),
    t: 0,
  };
  for (const [name, [x, y]] of Object.entries(pts) as [keyof typeof KP, [number, number]][]) {
    s.x[KP[name]] = x;
    s.y[KP[name]] = y;
    s.score[KP[name]] = score;
  }
  return s;
};

describe('angle helpers', () => {
  it('computes interior angles', () => {
    expect(angle(0, 0, 1, 0, 1, 1)).toBeCloseTo(90);
    expect(angle(0, 0, 1, 0, 2, 0)).toBeCloseTo(180);
    expect(angle(1, 1, 0, 0, 1, 1)).toBeCloseTo(0);
    expect(angle(0, 0, 0, 0, 1, 1)).toBeNaN();
  });

  it('signed angle tells the side of the turn (screen coords, y down)', () => {
    // a to the right of b, c above b (smaller y) => counter-clockwise on screen => +90.
    expect(signedAngle(1, 0, 0, 0, 0, -1)).toBeCloseTo(90);
    expect(signedAngle(1, 0, 0, 0, 0, 1)).toBeCloseTo(-90);
  });

  it('deviation from vertical / horizontal', () => {
    expect(deviationFromVertical(0, 0, 0, 10)).toBeCloseTo(0);
    expect(deviationFromVertical(0, 0, 10, 10)).toBeCloseTo(45);
    expect(deviationFromHorizontal(0, 0, 10, 0)).toBeCloseTo(0);
    expect(deviationFromVertical(0, 0, 0, 0)).toBeNaN();
  });

  it('point-line distance is signed', () => {
    expect(Math.abs(pointLineDistance(5, -3, 0, 0, 10, 0))).toBeCloseTo(3);
    expect(Math.sign(pointLineDistance(5, -3, 0, 0, 10, 0))).toBe(
      -Math.sign(pointLineDistance(5, 3, 0, 0, 10, 0)),
    );
  });
});

describe('body geometry', () => {
  const standingFront = skeleton({
    left_shoulder: [140, 100],
    right_shoulder: [60, 100],
    left_hip: [120, 220],
    right_hip: [80, 220],
    left_knee: [120, 320],
    left_ankle: [120, 420],
  });

  it('torso length and tilt', () => {
    // Max of the mid-line (120) and per-side lengths (left side: hypot(20, 120)).
    expect(torsoLength(standingFront)).toBeCloseTo(Math.hypot(20, 120));
    expect(torsoTilt(standingFront)).toBeCloseTo(0);
    expect(jointAngle(standingFront, KP.left_hip, KP.left_knee, KP.left_ankle)).toBeCloseTo(180);
  });

  it('classifies orientation and view', () => {
    expect(bodyOrientation(standingFront)).toBe('upright');
    expect(estimateView(standingFront)).toBe('front');
    const prone = skeleton({
      left_shoulder: [300, 100],
      right_shoulder: [302, 101],
      left_hip: [180, 120],
      right_hip: [181, 121],
    });
    expect(bodyOrientation(prone)).toBe('horizontal');
    expect(estimateView(prone)).toBe('side');
  });

  it('is scale invariant (angles unchanged when the person is farther away)', () => {
    const far = skeleton({ left_hip: [60, 110], left_knee: [80, 160], left_ankle: [60, 210] });
    const near = skeleton({ left_hip: [120, 220], left_knee: [160, 320], left_ankle: [120, 420] });
    expect(jointAngle(far, KP.left_hip, KP.left_knee, KP.left_ankle)).toBeCloseTo(
      jointAngle(near, KP.left_hip, KP.left_knee, KP.left_ankle),
    );
  });
});

describe('skeleton helpers', () => {
  it('converts normalized poses to aspect-correct pixels', () => {
    const points = Array(KEYPOINT_COUNT * 3).fill(0);
    points[KP.nose * 3] = 0.5;
    points[KP.nose * 3 + 1] = 0.25;
    points[KP.nose * 3 + 2] = 0.8;
    const s = toSkeleton({ points, score: 1, timestamp: 42, frameWidth: 720, frameHeight: 1280 });
    expect([s.x[KP.nose], s.y[KP.nose], s.score[KP.nose], s.t]).toEqual([360, 320, 0.8, 42]);
  });

  it('picks the more visible side and gates on confidence', () => {
    const s = skeleton({ left_hip: [0, 0], left_knee: [0, 1] }, 0.9);
    s.score[KP.right_hip] = 0.2;
    expect(bestSide(s, ['hip', 'knee'])).toBe('left');
    expect(checkVisibility(s, [KP.left_hip, KP.right_hip], 0.5)).toEqual({
      visible: false,
      missing: [KP.right_hip],
    });
  });
});
