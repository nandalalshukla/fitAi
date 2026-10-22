import { channelOrderFor, type FrameDesc, uprightSize, uprightToBuffer } from '../frame';
import { sampleRoiToTensor } from '../sampler';

const base: FrameDesc = {
  width: 4,
  height: 2,
  bytesPerRow: 16,
  bytesPerPixel: 4,
  channelOrder: 'rgba',
  orientation: 'up',
  mirrored: false,
};

/** 4×2 RGBA buffer where each pixel's red channel encodes its buffer index. */
const pixels = Uint8Array.from({ length: 32 }, (_, i) => (i % 4 === 0 ? i / 4 : 0));

describe('frame orientation mapping', () => {
  it('swaps upright size for rotated buffers', () => {
    expect(uprightSize({ ...base, orientation: 'right' })).toEqual({ width: 2, height: 4 });
    expect(uprightSize(base)).toEqual({ width: 4, height: 2 });
  });

  it('maps upright corners to the right buffer corners', () => {
    // 'right': buffer rotated 90° clockwise => upright top-left is buffer top-right.
    expect(uprightToBuffer(0, 0, { ...base, orientation: 'right' }, 2, 4)).toEqual([4, 0]);
    expect(uprightToBuffer(0, 0, { ...base, orientation: 'left' }, 2, 4)).toEqual([0, 2]);
    expect(uprightToBuffer(0, 0, { ...base, orientation: 'down' }, 4, 2)).toEqual([4, 2]);
    expect(uprightToBuffer(1, 0, { ...base, mirrored: true }, 4, 2)).toEqual([3, 0]);
  });

  it('samples the identity crop of an upright buffer in order', () => {
    const out = new Uint8Array(2 * 2 * 3);
    // Square ROI covering the left 2×2 block.
    sampleRoiToTensor(pixels, base, { cx: 1, cy: 1, size: 2, rotation: 0 }, 2, out);
    expect([out[0], out[3], out[6], out[9]]).toEqual([0, 1, 4, 5]);
  });

  it('reads BGRA channel order', () => {
    const bgra = Uint8Array.from([10, 20, 30, 255]);
    const out = new Uint8Array(3);
    sampleRoiToTensor(
      bgra,
      { ...base, width: 1, height: 1, bytesPerRow: 4, channelOrder: 'bgra' },
      { cx: 0.5, cy: 0.5, size: 1, rotation: 0 },
      1,
      out,
    );
    expect(Array.from(out)).toEqual([30, 20, 10]);
  });

  it('pads outside the frame with the low value', () => {
    const out = new Float32Array(3);
    sampleRoiToTensor(pixels, base, { cx: -5, cy: -5, size: 1, rotation: 0 }, 1, out, -1, 1);
    expect(Array.from(out)).toEqual([-1, -1, -1]);
  });

  it('recognises supported RGB pixel formats', () => {
    expect(channelOrderFor('rgb-bgra-8-bit', 16, 4)).toEqual({ order: 'bgra', bytesPerPixel: 4 });
    expect(channelOrderFor('rgb-rgb-8-bit', 12, 4)).toEqual({ order: 'rgb', bytesPerPixel: 3 });
    expect(channelOrderFor('yuv-420-8-bit-full', 4, 4)).toBeNull();
  });
});
