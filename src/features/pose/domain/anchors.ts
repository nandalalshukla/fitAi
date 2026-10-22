/**
 * SSD anchors for the BlazePose detector (MediaPipe pose_detection graph):
 * input 224×224, strides [8, 16, 32, 32, 32], aspect ratio 1 + interpolated
 * scale, fixed anchor size => 2254 anchors. Only centres are needed.
 * Returns a flat Float32Array [x0, y0, x1, y1, ...] in normalized coordinates.
 */
export const BLAZEPOSE_DETECTOR_INPUT = 224;
export const BLAZEPOSE_ANCHOR_COUNT = 2254;

export function generateBlazePoseAnchors(
  inputSize = BLAZEPOSE_DETECTOR_INPUT,
  strides: readonly number[] = [8, 16, 32, 32, 32],
): Float32Array {
  const centres: number[] = [];
  let layer = 0;
  while (layer < strides.length) {
    let anchorsPerCell = 0;
    let last = layer;
    while (last < strides.length && strides[last] === strides[layer]) {
      anchorsPerCell += 2; // aspect ratio 1.0 + interpolated scale anchor
      last++;
    }
    const stride = strides[layer] ?? 1;
    const fm = Math.ceil(inputSize / stride);
    for (let y = 0; y < fm; y++) {
      for (let x = 0; x < fm; x++) {
        for (let a = 0; a < anchorsPerCell; a++) centres.push((x + 0.5) / fm, (y + 0.5) / fm);
      }
    }
    layer = last;
  }
  return Float32Array.from(centres);
}
