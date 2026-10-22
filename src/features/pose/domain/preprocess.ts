import type { FrameDesc } from './frame';
import type { Roi } from './roi';

/**
 * Parameters for the bundled ROI preprocessing TFLite graphs
 * (assets/models/roi_preprocess_{224,256}.tflite, built by tools/pose/build_preprocess.py).
 * The graph does the rotated crop + channel reorder + normalization natively, so
 * the camera worklet does no per-pixel JavaScript work (~22 ms → ~3 ms per frame).
 */
export const PREPROCESS_MAX_PIXELS = 1280 * 960;
export const PREPROCESS_PARAM_COUNT = 15;

/** [a, b, c, d, e, f]: bx = a·ux + b·uy + c, by = d·ux + e·uy + f (upright → buffer). */
export type Affine = [number, number, number, number, number, number];

/** Orientation + mirroring as one affine map; equivalent to `uprightToBuffer`. */
export function orientationAffine(desc: FrameDesc, uprightW: number, uprightH: number): Affine {
  'worklet';
  // Mirroring (in upright space) first: ux' = m·ux + mc.
  const m = desc.mirrored ? -1 : 1;
  const mc = desc.mirrored ? uprightW : 0;
  switch (desc.orientation) {
    case 'right': // bx = uh - y, by = ux'
      return [0, -1, uprightH, m, 0, mc];
    case 'left': // bx = y, by = uw - ux'
      return [0, 1, 0, -m, 0, uprightW - mc];
    case 'down': // bx = uw - ux', by = uh - y
      return [-m, 0, uprightW - mc, 0, -1, uprightH];
    default: // bx = ux', by = y
      return [m, 0, mc, 0, 1, 0];
  }
}

/** Whether a frame can use the native preprocessing graph (4-byte pixels that fit the staging buffer). */
export function canUseNativePreprocess(desc: FrameDesc): boolean {
  'worklet';
  return (
    desc.bytesPerPixel === 4 &&
    desc.bytesPerRow % 4 === 0 &&
    // The last staging pixel is reserved (always zero) for out-of-frame samples.
    (desc.bytesPerRow / 4) * desc.height < PREPROCESS_MAX_PIXELS
  );
}

/** Fills `out` (Float32Array(15)) with graph parameters for an n×n crop of `roi`. */
export function writePreprocessParams(
  desc: FrameDesc,
  roi: Roi,
  n: number,
  lo: number,
  hi: number,
  out: Float32Array,
): Float32Array {
  'worklet';
  const swap = desc.orientation === 'left' || desc.orientation === 'right';
  const uw = swap ? desc.height : desc.width;
  const uh = swap ? desc.width : desc.height;
  const c = Math.cos(roi.rotation);
  const s = Math.sin(roi.rotation);
  const step = roi.size / n;
  const half = (n / 2 - 0.5) * step;
  // Upright-space origin and steps (same as sampler.ts).
  const ox = roi.cx - (c * half - s * half);
  const oy = roi.cy - (s * half + c * half);
  const [a, b, tx, d, e, ty] = orientationAffine(desc, uw, uh);
  out[0] = a * ox + b * oy + tx;
  out[1] = d * ox + e * oy + ty;
  out[2] = a * c * step + b * s * step; // column step
  out[3] = d * c * step + e * s * step;
  out[4] = a * -s * step + b * c * step; // row step
  out[5] = d * -s * step + e * c * step;
  out[6] = desc.width;
  out[7] = desc.height;
  out[8] = desc.bytesPerRow / 4;
  out[9] = 0;
  out[10] = (hi - lo) / 255;
  out[11] = lo;
  const bgra = desc.channelOrder === 'bgra';
  out[12] = bgra ? 2 : 0;
  out[13] = 1;
  out[14] = bgra ? 0 : 2;
  return out;
}
