/**
 * Maps normalized upright-frame coordinates to view coordinates for a preview
 * rendered with `resizeMode` cover (crop) or contain (letterbox).
 */
export interface ViewTransform {
  scale: number;
  offsetX: number;
  offsetY: number;
  frameWidth: number;
  frameHeight: number;
}

export function computeViewTransform(
  frameWidth: number,
  frameHeight: number,
  viewWidth: number,
  viewHeight: number,
  mode: 'cover' | 'contain' = 'cover',
): ViewTransform {
  'worklet';
  if (frameWidth <= 0 || frameHeight <= 0) {
    return { scale: 1, offsetX: 0, offsetY: 0, frameWidth: 1, frameHeight: 1 };
  }
  const sx = viewWidth / frameWidth;
  const sy = viewHeight / frameHeight;
  const scale = mode === 'cover' ? Math.max(sx, sy) : Math.min(sx, sy);
  return {
    scale,
    offsetX: (viewWidth - frameWidth * scale) / 2,
    offsetY: (viewHeight - frameHeight * scale) / 2,
    frameWidth,
    frameHeight,
  };
}

export function toView(nx: number, ny: number, t: ViewTransform): [number, number] {
  'worklet';
  return [t.offsetX + nx * t.frameWidth * t.scale, t.offsetY + ny * t.frameHeight * t.scale];
}
