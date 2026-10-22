import fixture from '../__fixtures__/blazepose-astronaut.json';
import { BLAZEPOSE_ANCHOR_COUNT, generateBlazePoseAnchors } from '../anchors';
import { decodeBestDetection, decodeLandmarks, roiFromDetection } from '../blazepose';
import type { FrameDesc } from '../frame';
import { BLAZEPOSE_TO_CANONICAL, KEYPOINT_COUNT, KP } from '../keypoints';
import { fullFrameRoi } from '../roi';
import { sampleRoiToTensor } from '../sampler';
import { emptyPoints } from '../types';

/**
 * Fixture produced by a numpy reference implementation of MediaPipe's pose graph,
 * run with the bundled BlazePose models on the scikit-image "astronaut" photo
 * (see docs/POSE_MODELS.md). These tests check the TS port matches it.
 */
const { width: W, height: H } = fixture.image;

describe('BlazePose anchors', () => {
  it('generates 2254 anchors with centres inside the unit square', () => {
    const a = generateBlazePoseAnchors();
    expect(a.length).toBe(BLAZEPOSE_ANCHOR_COUNT * 2);
    expect(Math.min(...a)).toBeGreaterThan(0);
    expect(Math.max(...a)).toBeLessThan(1);
    // First layer: 28×28 grid, 2 anchors per cell.
    expect(a[0]).toBeCloseTo(0.5 / 28);
    expect(a[2]).toBeCloseTo(0.5 / 28);
    expect(a[4]).toBeCloseTo(1.5 / 28);
  });
});

describe('BlazePose detector decoding', () => {
  const anchors = generateBlazePoseAnchors();
  const boxes = new Float32Array(BLAZEPOSE_ANCHOR_COUNT * 12);
  const scores = new Float32Array(BLAZEPOSE_ANCHOR_COUNT).fill(-10);
  const best = fixture.detector.bestIndex;
  boxes.set(fixture.detector.rawBox, best * 12);
  const p = fixture.detector.score;
  scores[best] = Math.log(p / (1 - p));

  it('selects the best box and projects keypoints like the reference', () => {
    const d = decodeBestDetection(boxes, scores, anchors, fullFrameRoi(W, H));
    expect(d).not.toBeNull();
    const [c, a] = fixture.detector.expectedKeypointsPx;
    expect(d!.score).toBeCloseTo(p, 5);
    expect(d!.centreX).toBeCloseTo(c![0]!, 2);
    expect(d!.centreY).toBeCloseTo(c![1]!, 2);
    expect(d!.alignX).toBeCloseTo(a![0]!, 2);
    expect(d!.alignY).toBeCloseTo(a![1]!, 2);
  });

  it('derives the same ROI as the reference', () => {
    const roi = roiFromDetection(decodeBestDetection(boxes, scores, anchors, fullFrameRoi(W, H))!);
    expect(roi.cx).toBeCloseTo(fixture.roi.cx, 2);
    expect(roi.cy).toBeCloseTo(fixture.roi.cy, 2);
    expect(roi.size).toBeCloseTo(fixture.roi.size, 1);
    expect(roi.rotation).toBeCloseTo(fixture.roi.rotation, 5);
  });

  it('returns null below the score threshold', () => {
    const low = new Float32Array(BLAZEPOSE_ANCHOR_COUNT).fill(-5);
    expect(decodeBestDetection(boxes, low, anchors, fullFrameRoi(W, H))).toBeNull();
  });
});

describe('BlazePose landmark decoding', () => {
  const raw = Float32Array.from(fixture.landmarks.raw);
  const roi = fixture.roi;
  const { points, nextRoi } = decodeLandmarks(
    raw,
    { cx: roi.cx, cy: roi.cy, size: roi.size, rotation: roi.rotation },
    W,
    H,
    emptyPoints(),
  );

  it('maps all 21 canonical keypoints to the reference positions', () => {
    expect(points).toHaveLength(KEYPOINT_COUNT * 3);
    BLAZEPOSE_TO_CANONICAL.forEach((src, k) => {
      const e = fixture.landmarks.expected[src]!;
      expect(points[k * 3]).toBeCloseTo(e.x, 3);
      expect(points[k * 3 + 1]).toBeCloseTo(e.y, 3);
      expect(points[k * 3 + 2]).toBeCloseTo(e.visibility, 3);
    });
  });

  it('places the face where it is in the photo (sanity check)', () => {
    // Astronaut photo: face centred around x≈0.44, y≈0.25; shoulders below it.
    expect(points[KP.nose * 3]).toBeGreaterThan(0.38);
    expect(points[KP.nose * 3]).toBeLessThan(0.5);
    expect(points[KP.nose * 3 + 1]).toBeLessThan(points[KP.left_shoulder * 3 + 1]!);
    expect(points[KP.nose * 3 + 2]).toBeGreaterThan(0.9);
  });

  it('produces a tracking ROI for the next frame', () => {
    expect(nextRoi.size).toBeGreaterThan(0);
    expect(Number.isFinite(nextRoi.rotation)).toBe(true);
  });
});

describe('ROI sampler', () => {
  it('matches the reference nearest-neighbour rotated crop', () => {
    const s = fixture.sampler;
    const desc: FrameDesc = {
      width: s.width,
      height: s.height,
      bytesPerRow: s.width * 3,
      bytesPerPixel: 3,
      channelOrder: 'rgb',
      orientation: 'up',
      mirrored: false,
    };
    const out = new Float32Array(s.size * s.size * 3);
    const [cx, cy, size, rotation] = s.roi as [number, number, number, number];
    sampleRoiToTensor(
      Uint8Array.from(s.pixels),
      desc,
      { cx, cy, size, rotation },
      s.size,
      out,
      0,
      1,
    );
    Array.from(out).forEach((v, i) => expect(v).toBeCloseTo(s.expected[i]!, 5));
  });
});
