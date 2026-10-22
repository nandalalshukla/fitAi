import { createHoldState, stepHold } from '../holdTimer';
import { rangeOfMotion, repQuality } from '../quality';
import { createRepCounterState, stepRepCounter } from '../repCounter';
import type { RepCounterConfig, RepThresholds } from '../types';

const th: RepThresholds = { start: 160, peak: 100, partial: 135, target: 85 };
const cfg: RepCounterConfig = {
  signals: ['knee'],
  peakWhen: 'below',
  minPhaseMs: 80,
  minRepMs: 600,
};

/** Feeds a signal sampled every `dt` ms; returns rep/partial counts. */
function run(values: number[], dt = 33, config = cfg, thresholds = th) {
  const s = createRepCounterState();
  let reps = 0;
  let partials = 0;
  values.forEach((v, i) => {
    const r = stepRepCounter(s, 'knee', v, { knee: v }, i * dt, thresholds, config);
    if (r?.kind === 'rep') reps++;
    if (r?.kind === 'partial') partials++;
  });
  return { reps, partials, state: s };
}

const rep = (bottom: number, n = 30): number[] => {
  const out: number[] = [];
  for (let i = 0; i <= n; i++) out.push(175 - (175 - bottom) * Math.sin((Math.PI * i) / n));
  return out;
};
const hold = (v: number, n: number) => Array<number>(n).fill(v);

describe('rep counter state machine', () => {
  it('counts full reps', () => {
    expect(
      run([...hold(175, 10), ...rep(80), ...hold(175, 10), ...rep(90), ...hold(175, 10)]).reps,
    ).toBe(2);
  });

  it('flags shallow reps as partial, not counted', () => {
    const r = run([...hold(175, 10), ...rep(125), ...hold(175, 10)]);
    expect(r).toMatchObject({ reps: 0, partials: 1 });
  });

  it('ignores tiny movements (never reaches partial)', () => {
    expect(run([...hold(175, 10), ...rep(150), ...hold(175, 10)])).toMatchObject({
      reps: 0,
      partials: 0,
    });
  });

  it('does not count a rep already in progress at session start', () => {
    expect(run([...hold(90, 10), ...hold(175, 10)]).reps).toBe(0);
  });

  it('hysteresis: oscillating around the peak threshold is one rep', () => {
    const wobble = [175, 150, 120, 99, 101, 99, 102, 98, 101, 120, 150, 175, 175, 175, 175];
    expect(run([...hold(175, 5), ...wobble]).reps).toBe(1);
  });

  it('a one-frame dip into the start zone does not end the rep (minPhaseMs at 30 FPS)', () => {
    const v = [
      ...hold(175, 5),
      150,
      120,
      95,
      120,
      150,
      162,
      150,
      120,
      95,
      120,
      150,
      ...hold(175, 6),
    ];
    expect(run(v, 20).reps).toBe(1);
  });

  it('min rep time prevents double counting', () => {
    const fast = [...hold(175, 3), 120, 90, 120, ...hold(175, 3), 120, 90, 120, ...hold(175, 3)];
    expect(run(fast, 33, { ...cfg, minRepMs: 1000 }).reps).toBe(1);
  });

  it('supports "above" exercises (signal rises to peak)', () => {
    const up: RepThresholds = { start: 0.3, peak: 0.7, partial: 0.5, target: 0.9 };
    const v = [0.1, 0.1, 0.1, 0.4, 0.8, 0.9, 0.8, 0.4, 0.1, 0.1, 0.1, 0.1];
    expect(run(v, 50, { ...cfg, peakWhen: 'above', minRepMs: 100 }, up).reps).toBe(1);
  });

  it('tracks extremes for the rep summary', () => {
    const s = createRepCounterState();
    let summary = null;
    [...hold(175, 5), ...rep(82), ...hold(175, 8)].forEach((v, i) => {
      const r = stepRepCounter(
        s,
        'knee',
        v,
        { knee: v, lean: 10 + (175 - v) / 5 },
        i * 33,
        th,
        cfg,
      );
      if (r?.kind === 'rep') summary = r.summary;
    });
    expect(summary).toMatchObject({ index: 1, signal: 'knee' });
    expect((summary as unknown as { extreme: number }).extreme).toBeCloseTo(82, 0);
    expect((summary as unknown as { max: { lean: number } }).max.lean).toBeCloseTo(28.6, 0);
  });
});

describe('hold timer', () => {
  it('accumulates time in position, tolerates brief breaks and reports milestones', () => {
    const s = createHoldState();
    const milestones: number[] = [];
    for (let t = 0; t <= 25000; t += 100) {
      const inPos = !(t > 12000 && t < 12300); // 300 ms glitch < grace
      const r = stepHold(s, inPos, t, 800, 10);
      if (r.milestone) milestones.push(r.milestone);
    }
    expect(s.heldMs).toBeGreaterThan(24500);
    expect(milestones).toEqual([10, 20]);
  });

  it('pauses after the grace period', () => {
    const s = createHoldState();
    for (let t = 0; t <= 10000; t += 100) stepHold(s, t < 5000, t, 500, 0);
    expect(s.inPosition).toBe(false);
    expect(s.heldMs).toBeGreaterThan(5000);
    expect(s.heldMs).toBeLessThan(5700);
  });
});

describe('rep quality', () => {
  it('scores range of motion, violations and tempo', () => {
    expect(rangeOfMotion(85, th)).toBe(1);
    expect(rangeOfMotion(122.5, th)).toBeCloseTo(0.5);
    expect(repQuality(80, th, [], false)).toBe(100);
    expect(repQuality(122.5, th, [], false)).toBe(80);
    expect(repQuality(85, th, ['warning', 'info'], true)).toBe(77);
    expect(
      repQuality(160, th, ['critical', 'critical', 'critical', 'critical', 'critical'], true),
    ).toBe(0);
  });
});
