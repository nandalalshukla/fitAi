import { KEYPOINT_COUNT, KEYPOINT_NAMES, KP, SKELETON_EDGES } from '../keypoints';
import { decodeMoveNet, meanScore } from '../movenet';
import { createPerfState, onFrame, onInference } from '../perf';
import { fullFrameRoi, normalizeRadians, projectFromRoi, roiFromAlignmentPoints } from '../roi';
import { emptyPoints, getKeypoint } from '../types';
import { computeViewTransform, toView } from '../viewTransform';

describe('keypoints', () => {
  it('has a consistent index map and valid edges', () => {
    expect(KEYPOINT_COUNT).toBe(21);
    KEYPOINT_NAMES.forEach((n, i) => expect(KP[n]).toBe(i));
    SKELETON_EDGES.forEach(([a, b]) => {
      expect(a).toBeLessThan(KEYPOINT_COUNT);
      expect(b).toBeLessThan(KEYPOINT_COUNT);
    });
  });
});

describe('roi math', () => {
  it('normalizes angles into [-π, π)', () => {
    expect(normalizeRadians(3 * Math.PI)).toBeCloseTo(-Math.PI);
    expect(normalizeRadians(0.5)).toBeCloseTo(0.5);
  });

  it('upright body (alignment point straight above centre) has zero rotation', () => {
    const roi = roiFromAlignmentPoints(100, 200, 100, 100);
    expect(roi.rotation).toBeCloseTo(0);
    expect(roi.size).toBeCloseTo(2 * 100 * 1.25);
  });

  it('projects crop centre to ROI centre and corners with rotation', () => {
    const roi = { cx: 10, cy: 20, size: 4, rotation: Math.PI / 2 };
    expect(projectFromRoi(0.5, 0.5, roi)).toEqual([10, 20]);
    const [x, y] = projectFromRoi(1, 0.5, roi);
    expect(x).toBeCloseTo(10);
    expect(y).toBeCloseTo(22);
  });
});

describe('MoveNet decoding', () => {
  it('converts (y, x, score) through the letterbox into frame coordinates', () => {
    const raw = new Float32Array(51);
    raw[0] = 0.5; // nose y
    raw[1] = 0.5; // nose x
    raw[2] = 0.9;
    // keypoint 1 at the top-left of the letterboxed square
    raw[5] = 0.8;
    const pts = decodeMoveNet(raw, fullFrameRoi(640, 480), 640, 480, emptyPoints());
    expect(pts[0]).toBeCloseTo(0.5);
    expect(pts[1]).toBeCloseTo(0.5);
    expect(pts[2]).toBeCloseTo(0.9);
    // Letterbox square is 640 wide; y=0 maps to (240 - 320) / 480 = -1/6.
    expect(pts[4]).toBeCloseTo(-1 / 6);
    expect(pts[17 * 3 + 2]).toBe(0);
    expect(meanScore(pts)).toBeCloseTo((0.9 + 0.8) / 17);
  });
});

describe('view transform', () => {
  it('cover-crops a 3:4 frame into a 9:16 view', () => {
    const t = computeViewTransform(480, 640, 360, 640, 'cover');
    expect(t.scale).toBeCloseTo(1);
    expect(t.offsetX).toBeCloseTo(-60);
    expect(toView(0.5, 0.5, t)).toEqual([180, 320]);
  });

  it('contain-fits with letterbox offsets', () => {
    const t = computeViewTransform(480, 640, 480, 800, 'contain');
    expect(t.offsetY).toBeCloseTo(80);
  });
});

describe('perf + adaptive throttle', () => {
  it('tracks fps and backs off when inference exceeds budget', () => {
    const s = createPerfState();
    let t = 0;
    for (let i = 0; i < 60; i++) {
      t += 33.3;
      if (onFrame(s, t)) onInference(s, t, 60, 33.3);
    }
    expect(s.cameraFps).toBeGreaterThan(28);
    expect(s.frameStride).toBeGreaterThan(1);
    expect(s.droppedByThrottle).toBeGreaterThan(0);
  });

  it('recovers stride when inference becomes cheap', () => {
    const s = createPerfState();
    s.frameStride = 3;
    let t = 0;
    for (let i = 0; i < 300; i++) {
      t += 33.3;
      if (onFrame(s, t)) onInference(s, t, 5, 33.3);
    }
    expect(s.frameStride).toBe(1);
  });
});

describe('getKeypoint', () => {
  it('reads a named keypoint from a pose', () => {
    const points = emptyPoints();
    points[KP.left_knee * 3] = 0.25;
    points[KP.left_knee * 3 + 2] = 0.7;
    const kp = getKeypoint(
      { points, score: 1, timestamp: 0, frameWidth: 1, frameHeight: 1 },
      'left_knee',
    );
    expect(kp).toEqual({ name: 'left_knee', x: 0.25, y: 0, score: 0.7 });
  });
});
