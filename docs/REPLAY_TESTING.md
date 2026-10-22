# Replay testing (rep counting & form rules)

The rep engine is a pure, deterministic state machine, so recorded keypoint streams can be replayed in
Jest and must always produce the same reps and form flags.

## Fixture format (`src/features/exercises/replay/fixture.ts`)

JSON, version 1: metadata (`exercise`, `options` {difficulty, view?}, `frame` size, `fps`,
`source` synthetic | device), an `expect` block, and `frames`: one row per frame,
`[t_ms, x0, y0, s0, …]` with x,y in 1/10 000 of the frame and score in 1/100 (`[t]` alone = nobody
detected). One frame per line keeps diffs readable.

`expect` supports: `reps` (+ `repTolerance`), `minPartialReps`, `formFlags`, `forbiddenFlags`, `tempo`,
`visibilityLost`, `holdSeconds`, `milestones`, `classifiedAs`.

## Synthetic fixtures

`replay/scenarios.ts` defines 30 scenarios rendered from the exercise keyframes
(`testing/synthetic.ts`, seeded PRNG): good reps, shallow reps, 8 px jitter + confidence dropouts,
occlusion (long → counting pauses; brief → tolerated), each implemented form fault, rushed tempo,
25° camera yaw, front vs side views, alternating exercises, a 32 s plank and an idle-standing
false-positive check.

```bash
npm run fixtures:generate   # re-render __fixtures__/*.json (deterministic)
npm test                    # replay.test.ts runs every fixture through engine + classifier
```

Current result: **30/30 fixtures pass, rep-counting accuracy 100 %** (gate: ≥ 95 % aggregate,
exact per fixture unless `repTolerance` is set).

## Device recordings (please add some!)

Pose lab → choose the exercise → **Record** → do a set → **Stop & share**. Edit the JSON's `expect`
(at least `reps`, plus any `formFlags` you deliberately performed), drop it into
`src/features/exercises/replay/__fixtures__/` (name it `device_…`), and run `npm test`. Real
recordings capture model noise the synthetic data can't, so they are the best way to tune thresholds.
