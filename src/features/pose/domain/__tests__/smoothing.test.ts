import { createOneEuroState, oneEuroFilter, resetOneEuro } from '../smoothing';
import { rng } from '@/features/exercises/testing/synthetic';

const stddev = (v: number[]) => {
  const m = v.reduce((a, b) => a + b, 0) / v.length;
  return Math.sqrt(v.reduce((a, b) => a + (b - m) ** 2, 0) / v.length);
};

describe('One-Euro filter', () => {
  it('suppresses jitter on a still point', () => {
    const rand = rng(1);
    const st = createOneEuroState(1);
    const raw: number[] = [];
    const out: number[] = [];
    for (let i = 0; i < 200; i++) {
      const v = 100 + (rand() - 0.5) * 10;
      raw.push(v);
      out.push(oneEuroFilter(st, [v], i * 33, [0])[0]!);
    }
    expect(stddev(out.slice(20))).toBeLessThan(stddev(raw.slice(20)) * 0.5);
  });

  it('follows fast motion with little lag', () => {
    const st = createOneEuroState(1);
    let last = 0;
    for (let i = 0; i <= 30; i++) last = oneEuroFilter(st, [i * 20], i * 33, [0])[0]!; // 600 px/s
    expect(600 - last).toBeLessThan(60);
  });

  it('holds the previous estimate for low-confidence values', () => {
    const st = createOneEuroState(1);
    oneEuroFilter(st, [10], 0, [0]);
    oneEuroFilter(st, [10], 33, [0]);
    expect(oneEuroFilter(st, [500], 66, [0], [false])[0]).toBeCloseTo(10);
    resetOneEuro(st);
    expect(oneEuroFilter(st, [500], 99, [0])[0]).toBe(500);
  });
});
