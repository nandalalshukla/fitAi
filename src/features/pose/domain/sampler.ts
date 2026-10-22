import { type FrameDesc, uprightToBuffer } from './frame';
import type { Roi } from './roi';

/**
 * Crops a rotated ROI out of an RGB(A) frame buffer and writes an n×n×3 tensor.
 * Nearest-neighbour sampling, zero padding outside the frame (like MediaPipe).
 * Float output is scaled from [0, 255] to [lo, hi]; Uint8 output is raw.
 * Runs inside the camera worklet: no allocations in the hot loop.
 */
export function sampleRoiToTensor(
  pixels: Uint8Array,
  desc: FrameDesc,
  roi: Roi,
  n: number,
  out: Float32Array | Uint8Array,
  lo = 0,
  hi = 1,
): void {
  'worklet';
  const swap = desc.orientation === 'left' || desc.orientation === 'right';
  const uw = swap ? desc.height : desc.width;
  const uh = swap ? desc.width : desc.height;
  const isFloat = out instanceof Float32Array;
  const k = (hi - lo) / 255;
  const zero = isFloat ? lo : 0;
  const c = Math.cos(roi.rotation);
  const s = Math.sin(roi.rotation);
  const step = roi.size / n;
  // Upright position of crop pixel (j, i) = origin + j*colStep + i*rowStep.
  const colX = c * step;
  const colY = s * step;
  const rowX = -s * step;
  const rowY = c * step;
  const half = (n / 2 - 0.5) * step;
  const originX = roi.cx - (c * half - s * half);
  const originY = roi.cy - (s * half + c * half);
  const bpp = desc.bytesPerPixel;
  const rOff = desc.channelOrder === 'bgra' ? 2 : 0;
  const bOff = desc.channelOrder === 'bgra' ? 0 : 2;
  // Fast path (default camera config): upright, unmirrored buffer => no per-pixel mapping call.
  const direct = desc.orientation === 'up' && !desc.mirrored;

  let o = 0;
  for (let i = 0; i < n; i++) {
    let px = originX + i * rowX;
    let py = originY + i * rowY;
    for (let j = 0; j < n; j++) {
      let bx: number;
      let by: number;
      if (direct) {
        bx = Math.floor(px);
        by = Math.floor(py);
      } else {
        const p = uprightToBuffer(px, py, desc, uw, uh);
        bx = Math.floor(p[0]);
        by = Math.floor(p[1]);
      }
      if (
        px >= 0 &&
        py >= 0 &&
        px < uw &&
        py < uh &&
        bx >= 0 &&
        by >= 0 &&
        bx < desc.width &&
        by < desc.height
      ) {
        const idx = by * desc.bytesPerRow + bx * bpp;
        const r = pixels[idx + rOff] ?? 0;
        const g = pixels[idx + 1] ?? 0;
        const b = pixels[idx + bOff] ?? 0;
        if (isFloat) {
          out[o] = r * k + lo;
          out[o + 1] = g * k + lo;
          out[o + 2] = b * k + lo;
        } else {
          out[o] = r;
          out[o + 1] = g;
          out[o + 2] = b;
        }
      } else {
        out[o] = zero;
        out[o + 1] = zero;
        out[o + 2] = zero;
      }
      o += 3;
      px += colX;
      py += colY;
    }
  }
}
