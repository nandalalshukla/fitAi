import type { Pose } from '@/features/pose/domain/types';

import { generateSequence } from '../../testing/synthetic';
import { createEngine, engineSnapshot, processPose } from '../engine';
import { getExercise } from '../registry';
import type { EngineEvent } from '../types';

/**
 * Soak test: one hour of continuous squats at 30 fps (108 000 frames) through the
 * engine. Engine state must stay constant-size (no growth over a 60-minute session)
 * and per-frame cost must stay far below the frame budget.
 */
jest.setTimeout(120_000);

function sizeOf(state: object): number {
  let n = 0;
  const walk = (v: unknown, depth: number) => {
    if (depth > 4 || v === null || typeof v !== 'object') return;
    if (Array.isArray(v)) n += v.length;
    else n += Object.keys(v).length;
    for (const x of Object.values(v as object)) walk(x, depth + 1);
  };
  walk(state, 0);
  return n;
}

describe('engine over a 60-minute session', () => {
  it('keeps constant memory and stays well under the frame budget', () => {
    const chunk = generateSequence({
      exercise: 'squat',
      view: 'side',
      loops: 20,
      loopMs: 2800,
      fps: 30,
      noisePx: 3,
      frame: { width: 720, height: 1280 },
      seed: 7,
    });
    const chunkMs = (chunk.at(-1)!.timestamp ?? 0) + 1000 / 30;
    const engine = createEngine(getExercise('squat'), { difficulty: 'intermediate' });
    const events: EngineEvent[] = [];
    const hourMs = 60 * 60 * 1000;
    let frames = 0;
    let offset = 0;
    let sizeAfterWarmup = 0;
    const started = performance.now();
    while (offset < hourMs) {
      for (const p of chunk) {
        const pose: Pose = { ...p, timestamp: p.timestamp + offset };
        events.length = 0;
        processPose(engine, pose, pose.timestamp, events);
        frames++;
      }
      offset += chunkMs;
      if (sizeAfterWarmup === 0) sizeAfterWarmup = sizeOf(engine);
    }
    const msPerFrame = (performance.now() - started) / frames;

    expect(frames).toBeGreaterThan(100_000);
    // Counting still works after an hour.
    expect(engineSnapshot(engine).reps).toBeGreaterThan(1200);
    // No growth: state size after an hour equals the size after the first minute.
    expect(sizeOf(engine)).toBe(sizeAfterWarmup);
    // Budget at 30 fps is 33 ms; the engine should use a tiny fraction even in Jest.
    expect(msPerFrame).toBeLessThan(1);
  });
});
