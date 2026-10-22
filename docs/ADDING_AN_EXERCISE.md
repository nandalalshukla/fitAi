# Adding an exercise (camera-tracked)

Target: a new developer can add one in under 30 minutes. Everything lives in
`src/features/exercises/`.

## 1. Definition — `domain/definitions/<name>.ts`

Copy the closest existing file (e.g. `squat.ts` for a standing rep exercise, `plank.ts` for a hold,
`highKnees.ts` for alternating sides) and adapt:

| Field                                            | What to set                                                                                                                                                                  |
| ------------------------------------------------ | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `id`, `nameKey`                                  | Add the id to `ExerciseId` in `domain/types.ts`; add `exercises.names.<id>` to `src/i18n/locales/en.ts`                                                                      |
| `category`, `primaryMuscles`, `secondaryMuscles` | Content metadata                                                                                                                                                             |
| `cameraPlacement`                                | `view` (`side`/`front`/`either`), distance, orientation, `tipKey` (`placement.*`)                                                                                            |
| `required`                                       | Logical joints that must be visible; `sides: 'best'` (side view) or `'both'`                                                                                                 |
| `mode`                                           | `'reps'` (with `counter`) or `'hold'` (with `hold`)                                                                                                                          |
| `thresholds`                                     | Typed `base` + optional `difficulty` and `view` overrides. Rep exercises need `start`, `partial`, `peak`, `target` in the units of the counting signal                       |
| `features(ctx, th)`                              | Return named measurements using helpers from `domain/features.ts` (angles in degrees, distances in torso lengths; NaN when a keypoint is not confident). Mark it `'worklet'` |
| `counter`                                        | `signals` (feature keys; several = alternating sides, summed), `peakWhen` (`below` if the signal decreases toward the hard part), `minPhaseMs`, `minRepMs`                   |
| `rules`                                          | `FormRule`s: `id` = `<exercise>.<rule>`, severity, spoken `cue` (`cues.*`), on-screen `message` (`form.*`), `cooldownMs`, `when: 'frame'                                     | 'rep'`, optional `phases`/`views`/`persistMs`, `check` returns **true when violated** |
| `partialRepCue`, `tempo`                         | Optional "go lower" cue and minimum rep duration                                                                                                                             |
| `signature`                                      | Classifier signature over generic features (see `docs/EXERCISE_CLASSIFIER.md`)                                                                                               |

Rules of thumb: thresholds go in `thresholds`, never inline in `check`; every function used per frame
starts with `'worklet'` and uses only its arguments (it will run on the camera thread).

## 2. Register it — `domain/registry.ts`

Import the definition and add it to the list at the bottom (and to `definitions/index.ts`).

## 3. Keyframes — `animation/keyframes/library.ts`

Add an `ExerciseAnimation`: camera `yawDeg` (90 side, 0 front), `durationMs`, `anchor` (what stays
planted: `leftAnkle`, `floor`, `wrists`, `shoulders`, `hips`), `peakT`, and keyframes built with
`pose(base, overrides)` from `animation/keyframes/poses.ts`. Angles are absolute sagittal angles from
straight down (+ forward), see `animation/body3d.ts`. First and last keyframe must be identical.
These keyframes drive the animated demo (Phase 7), the ghost overlay and synthetic test data.

## 4. Strings

Add `cues.*` (≤ 4 spoken words) and `form.*` (on-screen sentence) to `src/i18n/locales/en.ts`.

## 5. Tests (automatic + one scenario)

- `domain/__tests__/registry.test.ts` checks i18n keys, rule ids and threshold ordering for every
  difficulty × view automatically.
- `animation/__tests__/keyframes.test.ts` checks loop-perfect keyframes, rigid limb lengths, joint
  ranges and that the start/peak keyframes land in the counter thresholds.
- `domain/__tests__/classifier.test.ts` checks the classifier recognises it (≥ 90 % of windows).
- Add replay scenarios in `replay/scenarios.ts` (good form + each fault you detect — add the fault to
  `testing/synthetic.ts` `FormFault`), then `npm run fixtures:generate` and `npm test`.

## 6. Verify on a device

Pose lab → pick the exercise → do 10 reps → check the HUD count and cues. Record a set
(Record → Stop & share), set `expect.reps` in the JSON, and commit it to `replay/__fixtures__/`.
