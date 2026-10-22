/**
 * Rotated square region of interest in upright frame PIXELS.
 * Matches MediaPipe's NormalizedRect semantics (rotation in radians, clockwise
 * in image space where +y is down).
 */
export interface Roi {
  cx: number;
  cy: number;
  size: number;
  rotation: number;
}

export function normalizeRadians(angle: number): number {
  'worklet';
  return angle - 2 * Math.PI * Math.floor((angle + Math.PI) / (2 * Math.PI));
}

/** Letterbox ROI covering the whole frame (used for full-frame detection). */
export function fullFrameRoi(width: number, height: number): Roi {
  'worklet';
  return { cx: width / 2, cy: height / 2, size: Math.max(width, height), rotation: 0 };
}

/**
 * MediaPipe AlignmentPointsRectsCalculator (target angle 90°) + RectTransformation:
 * p0 = body centre (hip mid-point), p1 = alignment point; output is a square ROI
 * of side 2 * |p1 - p0| * scale, rotated so the body is upright inside the crop.
 */
export function roiFromAlignmentPoints(
  x0: number,
  y0: number,
  x1: number,
  y1: number,
  scale = 1.25,
): Roi {
  'worklet';
  const dist = Math.hypot(x1 - x0, y1 - y0);
  const rotation = normalizeRadians(Math.PI / 2 - Math.atan2(-(y1 - y0), x1 - x0));
  return { cx: x0, cy: y0, size: 2 * dist * scale, rotation };
}

/** Projects normalized crop coordinates (u, v in 0..1) back to frame pixels. */
export function projectFromRoi(u: number, v: number, roi: Roi): [number, number] {
  'worklet';
  const c = Math.cos(roi.rotation);
  const s = Math.sin(roi.rotation);
  const du = u - 0.5;
  const dv = v - 0.5;
  return [roi.cx + (du * c - dv * s) * roi.size, roi.cy + (du * s + dv * c) * roi.size];
}
