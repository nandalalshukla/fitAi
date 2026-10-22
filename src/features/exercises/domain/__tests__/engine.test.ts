import { generateSequence } from '../../testing/synthetic';
import { adjustReps, createEngine, engineSnapshot, processPose } from '../engine';
import { getExercise } from '../registry';
import type { EngineEvent } from '../types';

const PORTRAIT = { width: 720, height: 1280 };

describe('exercise engine', () => {
  it('pauses when the person leaves the frame and resumes when they return', () => {
    const frames = generateSequence({
      exercise: 'squat',
      view: 'side',
      loops: 4,
      fps: 20,
      noisePx: 2,
      frame: PORTRAIT,
      seed: 3,
    });
    const eng = createEngine(getExercise('squat'));
    const events: EngineEvent[] = [];
    const half = Math.floor(frames.length / 2);
    frames.slice(0, half).forEach((p) => processPose(eng, p, p.timestamp, events));
    const t0 = frames[half]!.timestamp;
    for (let t = t0; t < t0 + 2000; t += 50) processPose(eng, null, t, events);
    frames
      .slice(half)
      .forEach((p) =>
        processPose(eng, { ...p, timestamp: p.timestamp + 2000 }, p.timestamp + 2000, events),
      );
    const vis = events
      .filter((e) => e.type === 'visibility')
      .map((e) => (e as { visible: boolean }).visible);
    expect(vis).toEqual([true, false, true]);
  });

  it('auto-detects the camera view and switches threshold sets', () => {
    const frames = generateSequence({
      exercise: 'squat',
      view: 'front',
      loops: 4,
      fps: 20,
      noisePx: 2,
      frame: PORTRAIT,
      seed: 4,
    });
    const eng = createEngine(getExercise('squat')); // squat defaults to side view
    frames.forEach((p) => processPose(eng, p, p.timestamp));
    expect(engineSnapshot(eng).view).toBe('front');
    expect(engineSnapshot(eng).reps).toBe(4);
  });

  it('respects difficulty: a 3/4-depth squat counts for beginners only', () => {
    const scenario = {
      exercise: 'squat' as const,
      view: 'side' as const,
      loops: 4,
      depth: 0.72,
      fps: 20,
      noisePx: 1,
      frame: PORTRAIT,
      seed: 5,
    };
    const count = (difficulty: 'beginner' | 'intermediate') => {
      const eng = createEngine(getExercise('squat'), { difficulty, view: 'side' });
      generateSequence(scenario).forEach((p) => processPose(eng, p, p.timestamp));
      return engineSnapshot(eng).reps;
    };
    expect(count('beginner')).toBe(4);
    expect(count('intermediate')).toBe(0);
  });

  it('applies per-rule cooldowns to spoken cues', () => {
    const frames = generateSequence({
      exercise: 'squat',
      view: 'side',
      loops: 8,
      loopMs: 2000,
      restMs: 0,
      fault: { kind: 'squat_lean' },
      fps: 20,
      noisePx: 2,
      frame: PORTRAIT,
      seed: 6,
    });
    const eng = createEngine(getExercise('squat'), { view: 'side' });
    const events: EngineEvent[] = [];
    frames.forEach((p) => processPose(eng, p, p.timestamp, events));
    const lean = events.filter((e) => e.type === 'form' && e.ruleId === 'squat.torso_lean');
    const duration = frames[frames.length - 1]!.timestamp;
    expect(lean.length).toBeGreaterThan(0);
    expect(lean.length).toBeLessThanOrEqual(Math.ceil(duration / 5000));
    // Every rep still records the violation in its quality score.
    const reps = events.filter((e) => e.type === 'rep');
    expect(
      reps.every((e) => (e as { violations: string[] }).violations.includes('squat.torso_lean')),
    ).toBe(true);
  });

  it('supports manual rep correction', () => {
    const eng = createEngine(getExercise('push_up'));
    adjustReps(eng, 2);
    adjustReps(eng, -5);
    expect(engineSnapshot(eng).reps).toBe(0);
    adjustReps(eng, 1);
    expect(engineSnapshot(eng).reps).toBe(1);
  });

  it('is deterministic (same input → same events)', () => {
    const frames = generateSequence({
      exercise: 'lunge',
      view: 'side',
      loops: 3,
      fps: 15,
      noisePx: 4,
      frame: PORTRAIT,
      seed: 9,
    });
    const run = () => {
      const eng = createEngine(getExercise('lunge'));
      const ev: EngineEvent[] = [];
      frames.forEach((p) => processPose(eng, p, p.timestamp, ev));
      return ev;
    };
    expect(run()).toEqual(run());
  });
});
