import type { PerfStats } from './perf';

export interface BenchmarkSummary {
  samples: number;
  durationS: number;
  cameraFps: { p50: number; p5: number };
  poseFps: { p50: number; p5: number };
  inferenceMs: { p50: number; p95: number; max: number };
  maxStride: number;
}

function percentile(values: number[], p: number): number {
  if (values.length === 0) return 0;
  const sorted = [...values].sort((a, b) => a - b);
  const idx = Math.min(sorted.length - 1, Math.max(0, Math.round((p / 100) * (sorted.length - 1))));
  return sorted[idx] ?? 0;
}

const round1 = (v: number) => Math.round(v * 10) / 10;

/** Summarizes periodic PerfStats snapshots collected during a benchmark run. */
export function summarizeBenchmark(samples: PerfStats[], durationS: number): BenchmarkSummary {
  const cam = samples.map((s) => s.cameraFps);
  const fps = samples.map((s) => s.inferenceFps);
  const ms = samples.map((s) => s.inferenceMs);
  return {
    samples: samples.length,
    durationS: round1(durationS),
    cameraFps: { p50: round1(percentile(cam, 50)), p5: round1(percentile(cam, 5)) },
    poseFps: { p50: round1(percentile(fps, 50)), p5: round1(percentile(fps, 5)) },
    inferenceMs: {
      p50: round1(percentile(ms, 50)),
      p95: round1(percentile(ms, 95)),
      max: round1(Math.max(0, ...samples.map((s) => s.maxInferenceMs))),
    },
    maxStride: Math.max(1, ...samples.map((s) => s.frameStride)),
  };
}
