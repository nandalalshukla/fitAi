import fs from 'node:fs';
import path from 'node:path';

import { validateFixture, type PoseFixture } from './fixture';
import { checkExpectations, replayFixture } from './replay';

/**
 * Replay harness: every fixture in __fixtures__ (synthetic or recorded on a
 * device) is run through the real engine + classifier and must meet its
 * expectations. Aggregate rep-counting accuracy must be ≥ 95 %.
 */
const dir = path.join(__dirname, '__fixtures__');
const fixtures: PoseFixture[] = fs
  .readdirSync(dir)
  .filter((f) => f.endsWith('.json'))
  .sort()
  .map((f) => JSON.parse(fs.readFileSync(path.join(dir, f), 'utf8')) as PoseFixture);

const results = new Map<string, ReturnType<typeof replayFixture>>();

describe('replay fixtures', () => {
  it('has fixtures for every camera-tracked exercise', () => {
    const exercises = new Set(fixtures.map((f) => f.exercise));
    for (const id of [
      'squat',
      'push_up',
      'jumping_jack',
      'plank',
      'sit_up',
      'crunch',
      'lunge',
      'high_knees',
      'mountain_climber',
      'glute_bridge',
      'leg_raise',
    ]) {
      expect(exercises).toContain(id);
    }
  });

  it.each(fixtures.map((f) => [f.name, f] as const))('%s', (_name, fx) => {
    expect(validateFixture(fx)).toBe(true);
    const result = replayFixture(fx);
    results.set(fx.name, result);
    expect(checkExpectations(fx, result)).toEqual([]);
  });

  it('achieves ≥ 95 % rep-counting accuracy across all fixtures', () => {
    let expected = 0;
    let error = 0;
    for (const fx of fixtures) {
      if (fx.expect.reps === undefined) continue;
      const r = results.get(fx.name) ?? replayFixture(fx);
      expected += fx.expect.reps;
      error += Math.abs(r.reps - fx.expect.reps);
    }
    const accuracy = expected === 0 ? 1 : 1 - error / expected;
    expect(accuracy).toBeGreaterThanOrEqual(0.95);
  });
});
