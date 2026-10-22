import { summarizeBenchmark } from '../benchmark';
import type { PerfStats } from '../perf';

const stat = (fps: number, ms: number, stride = 1): PerfStats => ({
  cameraFps: 30,
  inferenceFps: fps,
  inferenceMs: ms,
  maxInferenceMs: ms + 5,
  frameStride: stride,
  frames: 0,
  inferences: 0,
  droppedByThrottle: 0,
});

describe('summarizeBenchmark', () => {
  it('computes percentiles over samples', () => {
    const samples = [stat(30, 10), stat(28, 12), stat(25, 20, 2), stat(29, 11), stat(30, 9)];
    const s = summarizeBenchmark(samples, 2.5);
    expect(s.samples).toBe(5);
    expect(s.poseFps.p50).toBe(29);
    expect(s.poseFps.p5).toBe(25);
    expect(s.inferenceMs.p50).toBe(11);
    expect(s.inferenceMs.p95).toBe(20);
    expect(s.inferenceMs.max).toBe(25);
    expect(s.maxStride).toBe(2);
  });

  it('handles empty input', () => {
    expect(summarizeBenchmark([], 0).inferenceMs.p50).toBe(0);
  });
});
