/**
 * Describes a camera frame's CPU pixel buffer and how to read it upright.
 * Pure helpers: no VisionCamera imports so they can be unit-tested.
 */
export type Orientation = 'up' | 'right' | 'down' | 'left';
export type ChannelOrder = 'rgba' | 'bgra' | 'rgb';

export interface FrameDesc {
  /** Buffer width/height in pixels (as stored, before orientation). */
  width: number;
  height: number;
  bytesPerRow: number;
  bytesPerPixel: number;
  channelOrder: ChannelOrder;
  /** Pixel data rotation relative to upright (VisionCamera `Frame.orientation`). */
  orientation: Orientation;
  /** Pixels must be read mirrored horizontally (VisionCamera `Frame.isMirrored`). */
  mirrored: boolean;
}

export function uprightSize(desc: FrameDesc): { width: number; height: number } {
  'worklet';
  const swap = desc.orientation === 'left' || desc.orientation === 'right';
  return swap
    ? { width: desc.height, height: desc.width }
    : { width: desc.width, height: desc.height };
}

/** Maps VisionCamera pixel formats to a channel order (null = unsupported, e.g. YUV). */
export function channelOrderFor(
  pixelFormat: string,
  bytesPerRow: number,
  width: number,
): { order: ChannelOrder; bytesPerPixel: number } | null {
  'worklet';
  if (pixelFormat === 'rgb-bgra-8-bit') return { order: 'bgra', bytesPerPixel: 4 };
  if (pixelFormat === 'rgb-rgba-8-bit') return { order: 'rgba', bytesPerPixel: 4 };
  if (pixelFormat === 'rgb-rgb-8-bit') {
    // "RGB/RGBX": infer padding from the row stride.
    return { order: 'rgb', bytesPerPixel: bytesPerRow >= width * 4 ? 4 : 3 };
  }
  return null;
}

/**
 * Converts a point in upright pixel space to buffer pixel space.
 * 'right' = buffer content rotated +90° (clockwise) from upright, 'left' = -90°.
 */
export function uprightToBuffer(
  x: number,
  y: number,
  desc: FrameDesc,
  uprightW: number,
  uprightH: number,
): [number, number] {
  'worklet';
  const ux = desc.mirrored ? uprightW - x : x;
  switch (desc.orientation) {
    case 'right':
      return [uprightH - y, ux];
    case 'left':
      return [y, uprightW - ux];
    case 'down':
      return [uprightW - ux, uprightH - y];
    default:
      return [ux, y];
  }
}
