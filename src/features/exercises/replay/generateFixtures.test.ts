import fs from 'node:fs';
import path from 'node:path';

import { generateSequence } from '../testing/synthetic';
import { encodePose, FIXTURE_VERSION, type PoseFixture } from './fixture';
import { SCENARIOS } from './scenarios';

/**
 * Fixture generator, run with `npm run fixtures:generate` (GENERATE_FIXTURES=1).
 * Skipped in normal test runs. Synthetic fixtures are deterministic (seeded).
 */
const enabled = process.env.GENERATE_FIXTURES === '1';
const dir = path.join(__dirname, '__fixtures__');

(enabled ? describe : describe.skip)('generate replay fixtures', () => {
  it.each(SCENARIOS.map((s) => [s.name, s] as const))('%s', (_name, spec) => {
    const poses = generateSequence(spec.scenario);
    const fixture: PoseFixture = {
      version: FIXTURE_VERSION,
      name: spec.name,
      description: spec.description,
      source: 'synthetic',
      exercise: spec.scenario.exercise,
      options: spec.options,
      frame: spec.scenario.frame,
      fps: spec.scenario.fps,
      expect: spec.expect,
      frames: poses.map((p) => encodePose(p, p.timestamp)),
    };
    // One frame per line keeps diffs readable and files compact.
    const { frames, ...meta } = fixture;
    const body = JSON.stringify(meta, null, 2).replace(/\n}$/, ',\n  "frames": [\n');
    const lines = frames.map((f) => `    ${JSON.stringify(f)}`).join(',\n');
    fs.writeFileSync(path.join(dir, `${spec.name}.json`), `${body}${lines}\n  ]\n}\n`);
  });
});
