export function sigmoid(x: number): number {
  'worklet';
  const clipped = x < -100 ? -100 : x > 100 ? 100 : x;
  return 1 / (1 + Math.exp(-clipped));
}
