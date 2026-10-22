import { BLAZEPOSE_ANCHOR_COUNT, BLAZEPOSE_DETECTOR_INPUT } from './anchors';
import { BLAZEPOSE_TO_CANONICAL, KEYPOINT_STRIDE } from './keypoints';
import { sigmoid } from './math';
import { projectFromRoi, roiFromAlignmentPoints, type Roi } from './roi';

/** Values per detector box: [cx, cy, w, h, kp0x, kp0y, ..., kp3x, kp3y]. */
const BOX_VALUES = 12;
/** Landmark model: 33 body landmarks + 6 auxiliary, 5 values each (x, y, z, visibility, presence). */
export const BLAZEPOSE_LANDMARK_INPUT = 256;
const LANDMARK_VALUES = 5;
const AUX_HIP_CENTRE = 33;
const AUX_ALIGNMENT = 34;

export interface Detection {
  score: number;
  /** Body-centre and alignment keypoints in frame pixels. */
  centreX: number;
  centreY: number;
  alignX: number;
  alignY: number;
}

/**
 * Picks the highest-scoring detector box (single-person app) and returns its
 * alignment keypoints projected from the letterboxed detector input to frame pixels.
 */
export function decodeBestDetection(
  boxes: Float32Array,
  scores: Float32Array,
  anchors: Float32Array,
  letterbox: Roi,
  minScore = 0.5,
): Detection | null {
  'worklet';
  let best = -1;
  let bestLogit = -Infinity;
  for (let i = 0; i < BLAZEPOSE_ANCHOR_COUNT; i++) {
    const s = scores[i] ?? -Infinity;
    if (s > bestLogit) {
      bestLogit = s;
      best = i;
    }
  }
  if (best < 0) return null;
  const score = sigmoid(bestLogit);
  if (score < minScore) return null;
  const o = best * BOX_VALUES;
  const ax = anchors[best * 2] ?? 0;
  const ay = anchors[best * 2 + 1] ?? 0;
  const k0x = (boxes[o + 4] ?? 0) / BLAZEPOSE_DETECTOR_INPUT + ax;
  const k0y = (boxes[o + 5] ?? 0) / BLAZEPOSE_DETECTOR_INPUT + ay;
  const k1x = (boxes[o + 6] ?? 0) / BLAZEPOSE_DETECTOR_INPUT + ax;
  const k1y = (boxes[o + 7] ?? 0) / BLAZEPOSE_DETECTOR_INPUT + ay;
  const c = projectFromRoi(k0x, k0y, letterbox);
  const a = projectFromRoi(k1x, k1y, letterbox);
  return { score, centreX: c[0], centreY: c[1], alignX: a[0], alignY: a[1] };
}

export function roiFromDetection(d: Detection): Roi {
  'worklet';
  return roiFromAlignmentPoints(d.centreX, d.centreY, d.alignX, d.alignY);
}

export interface LandmarkDecodeResult {
  /** Canonical keypoints [x, y, score] normalized to the upright frame. */
  points: number[];
  /** ROI to use for the next frame (tracking), derived from auxiliary landmarks. */
  nextRoi: Roi;
}

/**
 * Converts raw landmark-model output (crop pixel coords) to canonical keypoints in
 * normalized frame coordinates. Keypoint score = sigmoid(visibility).
 */
export function decodeLandmarks(
  raw: Float32Array,
  roi: Roi,
  frameWidth: number,
  frameHeight: number,
  out: number[],
): LandmarkDecodeResult {
  'worklet';
  const n = BLAZEPOSE_LANDMARK_INPUT;
  for (let k = 0; k < BLAZEPOSE_TO_CANONICAL.length; k++) {
    const src = (BLAZEPOSE_TO_CANONICAL[k] ?? 0) * LANDMARK_VALUES;
    const p = projectFromRoi((raw[src] ?? 0) / n, (raw[src + 1] ?? 0) / n, roi);
    const dst = k * KEYPOINT_STRIDE;
    out[dst] = p[0] / frameWidth;
    out[dst + 1] = p[1] / frameHeight;
    out[dst + 2] = sigmoid(raw[src + 3] ?? -100);
  }
  const hc = AUX_HIP_CENTRE * LANDMARK_VALUES;
  const al = AUX_ALIGNMENT * LANDMARK_VALUES;
  const c = projectFromRoi((raw[hc] ?? 0) / n, (raw[hc + 1] ?? 0) / n, roi);
  const a = projectFromRoi((raw[al] ?? 0) / n, (raw[al + 1] ?? 0) / n, roi);
  return { points: out, nextRoi: roiFromAlignmentPoints(c[0], c[1], a[0], a[1]) };
}
