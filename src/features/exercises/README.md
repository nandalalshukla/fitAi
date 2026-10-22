# exercises

- `domain/` — pure, worklet-safe engine: `types`, `features` (measurement helpers), `definitions/`
  (one file per exercise), `registry`, `thresholds`, `repCounter`, `holdTimer`, `quality`, `engine`,
  `classifier/` (rule-based recognizer + guided/free mode controller).
- `animation/` — 3D stick-figure FK (`body3d`), keyframes per exercise, interpolation.
- `testing/synthetic.ts` — seeded synthetic pose sequences (noise, occlusion, faults).
- `replay/` — fixture format, replay runner, scenarios, generated fixtures.
- `dev/` — Pose lab HUD (live reps/cues, free mode) and pose recorder.

Docs: `docs/ADDING_AN_EXERCISE.md`, `docs/EXERCISE_CLASSIFIER.md`, `docs/REPLAY_TESTING.md`.
