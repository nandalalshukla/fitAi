import { KEYPOINT_STRIDE } from './keypoints';
import { projectFromRoi, type Roi } from './roi';

/** MoveNet SinglePose: output [1, 1, 17, 3] = (y, x, score) normalized to the (letterboxed) input. */
export const MOVENET_KEYPOINTS = 17;

export function decodeMoveNet(
  raw: Float32Array,
  letterbox: Roi,
  frameWidth: number,
  frameHeight: number,
  out: number[],
): number[] {
  'worklet';
  for (let k = 0; k < MOVENET_KEYPOINTS; k++) {
    const y = raw[k * 3] ?? 0;
    const x = raw[k * 3 + 1] ?? 0;
    const p = projectFromRoi(x, y, letterbox);
    out[k * KEYPOINT_STRIDE] = p[0] / frameWidth;
    out[k * KEYPOINT_STRIDE + 1] = p[1] / frameHeight;
    out[k * KEYPOINT_STRIDE + 2] = raw[k * 3 + 2] ?? 0;
  }
  // Foot points (17-20) are not produced by MoveNet.
  for (let i = MOVENET_KEYPOINTS * KEYPOINT_STRIDE; i < out.length; i++) out[i] = 0;
  return out;
}

/** Mean keypoint score, used as overall pose confidence for MoveNet. */
export function meanScore(points: number[], count = MOVENET_KEYPOINTS): number {
  'worklet';
  let sum = 0;
  for (let k = 0; k < count; k++) sum += points[k * KEYPOINT_STRIDE + 2] ?? 0;
  return sum / count;
}
