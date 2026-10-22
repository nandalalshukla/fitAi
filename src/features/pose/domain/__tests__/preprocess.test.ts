import { type FrameDesc, uprightSize, uprightToBuffer } from '../frame';
import {
  canUseNativePreprocess,
  orientationAffine,
  PREPROCESS_MAX_PIXELS,
  writePreprocessParams,
} from '../preprocess';
import { sampleRoiToTensor } from '../sampler';

/**
 * JS port of the preprocessing graph (tools/pose/build_preprocess.py), used to
 * check that the params we send make the native graph sample exactly the pixels
 * the reference JS sampler does, for every orientation/mirroring combination.
 * (The graph itself is verified bit-exact against the Python reference in tools/pose.)
 */
function simulateGraph(pixels: Uint8Array, p: Float32Array, n: number): Float32Array {
  const f = (v: number) => Math.fround(v);
  const out = new Float32Array(n * n * 3);
  for (let i = 0; i < n; i++) {
    for (let j = 0; j < n; j++) {
      const x = Math.floor(f(f(p[0]! + f(j * p[2]!)) + f(i * p[4]!)));
      const y = Math.floor(f(f(p[1]! + f(j * p[3]!)) + f(i * p[5]!)));
      const inb = x >= 0 && y >= 0 && x < p[6]! && y < p[7]!;
      const idx = inb ? y * p[8]! + x : -1;
      for (let ch = 0; ch < 3; ch++) {
        const byte = idx < 0 ? 0 : (pixels[idx * 4 + p[12 + ch]!] ?? 0);
        out[(i * n + j) * 3 + ch] = f(byte * p[10]! + p[11]!);
      }
    }
  }
  return out;
}

const W = 40;
const H = 30;
const pixels = Uint8Array.from({ length: W * H * 4 }, (_, i) => (i * 37 + 11) % 251);
const orientations = ['up', 'right', 'down', 'left'] as const;

describe.each(orientations.flatMap((o) => [false, true].map((m) => [o, m] as const)))(
  'native preprocess params (orientation=%s, mirrored=%s)',
  (orientation, mirrored) => {
    const desc: FrameDesc = {
      width: W,
      height: H,
      bytesPerRow: W * 4,
      bytesPerPixel: 4,
      channelOrder: 'bgra',
      orientation,
      mirrored,
    };
    const { width: uw, height: uh } = uprightSize(desc);

    it('affine matches uprightToBuffer', () => {
      const [a, b, c, d, e, f] = orientationAffine(desc, uw, uh);
      for (const [x, y] of [
        [0, 0],
        [3.5, 7.25],
        [uw, uh],
        [12, 1],
      ] as const) {
        const [bx, by] = uprightToBuffer(x, y, desc, uw, uh);
        expect(a * x + b * y + c).toBeCloseTo(bx);
        expect(d * x + e * y + f).toBeCloseTo(by);
      }
    });

    it('samples the same pixels as the JS sampler', () => {
      const n = 16;
      // Rotated ROI fully inside the frame plus one partially outside.
      for (const roi of [
        { cx: uw / 2, cy: uh / 2, size: Math.min(uw, uh) * 0.8, rotation: 0.4 },
        { cx: uw * 0.2, cy: uh * 0.8, size: Math.max(uw, uh), rotation: -1.1 },
      ]) {
        const expected = new Float32Array(n * n * 3);
        sampleRoiToTensor(pixels, desc, roi, n, expected, 0, 1);
        const actual = simulateGraph(
          pixels,
          writePreprocessParams(desc, roi, n, 0, 1, new Float32Array(15)),
          n,
        );
        let mismatched = 0;
        for (let k = 0; k < expected.length; k += 3) {
          if (Math.abs(expected[k]! - actual[k]!) > 1e-6) mismatched++;
        }
        // Float32 vs float64 can flip a floor() exactly on pixel boundaries; allow ≤1 %.
        expect(mismatched / (n * n)).toBeLessThanOrEqual(0.01);
      }
    });
  },
);

describe('canUseNativePreprocess', () => {
  const base: FrameDesc = {
    width: 480,
    height: 640,
    bytesPerRow: 1920,
    bytesPerPixel: 4,
    channelOrder: 'bgra',
    orientation: 'up',
    mirrored: false,
  };
  it('accepts 4-byte frames that fit the staging buffer', () => {
    expect(canUseNativePreprocess(base)).toBe(true);
  });
  it('rejects 3-byte RGB and oversized frames', () => {
    expect(canUseNativePreprocess({ ...base, bytesPerPixel: 3, bytesPerRow: 1440 })).toBe(false);
    expect(canUseNativePreprocess({ ...base, width: 1920, height: 1080, bytesPerRow: 7680 })).toBe(
      false,
    );
    expect(PREPROCESS_MAX_PIXELS).toBe(1228800);
  });
});
