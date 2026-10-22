# Exercise recognition

Interface: `ExerciseClassifier` (`src/features/exercises/domain/classifier/types.ts`):
`push(skeleton, torsoRef)` per frame, `classify()` → ranked `{ exercise, confidence }[]`, `reset()`.

## Current implementation: rule/feature-based

`createRuleClassifier()` keeps a 3.5 s sliding window of **generic, exercise-agnostic features**
(`classifier/windowFeatures.ts`): min knee / hip / elbow angles, per-side shoulder-to-knee distance,
arm raise, ankle spread, horizontal stance, trunk lift, shoulder-hip-ankle angle, knee height relative
to the hips, hip height, torso tilt and an estimated camera view.

Each `ExerciseDefinition.signature` scores the window:

| Signature part                | Meaning                                                                         |
| ----------------------------- | ------------------------------------------------------------------------------- |
| `orientation`                 | `upright` / `horizontal` / `any` (from mean torso tilt)                         |
| `moving`                      | features whose 5th–95th percentile range must exceed `minRange`                 |
| `still`                       | features whose range must stay below `maxRange`                                 |
| `mean`                        | bounds on a feature's mean, optionally only for one camera view                 |
| `alternating` / `synchronous` | co-activation of two features: ≈0 alternating (high knees), ≈1 together (squat) |

Scores multiply; candidates below 0.35 are dropped. Accuracy on synthetic sequences with noise,
dropouts and 10° camera yaw: **≥ 95 % top-1 per window** (enforced in `classifier.test.ts`; currently
100 % in the replay fixtures). Standing still is not classified.

`createModeController('guided' | 'free')` turns per-second classifications into decisions:

- **Guided** (plan says what to do): if another exercise is detected with ≥ 0.7 confidence for 3
  evaluations while the planned one scores < 0.5 → `suggest_switch` ("Looks like you're doing X,
  switch?"); with `autoSwitch` and ≥ 0.9 → `auto_switch`.
- **Free** ("Just start"): `select` once the same exercise wins 3 evaluations, then the engine starts
  counting it. Try it in the Pose lab with **Auto**.

## Replacing it with a learned model (seam)

1. **Data:** record sessions in the Pose lab (Record → share) and label them; synthetic sequences
   from `testing/synthetic.ts` can augment them (vary yaw, tempo, depth, noise).
2. **Input:** windows of canonical keypoints (21 × (x, y, score)), normalized by the reference
   torso length and centred on the hip midpoint, e.g. 45 frames @ 15 fps.
3. **Model:** a small 1D-CNN or GRU over time (≈ 50–200 k parameters), int8-quantized TFLite
   (< 1 MB), output = softmax over `ExerciseId` + "other".
4. **Integration:** implement `ExerciseClassifier` with a ring buffer that writes the window into a
   Float32Array and calls `model.runSync` (react-native-fast-tflite) once per second; register it
   behind the `freeModeClassifier` feature flag. No other code changes are needed — the mode
   controller and engine consume `Classification[]`.
5. **Evaluate** with the same replay fixtures (`replay/replay.test.ts` asserts `classifiedAs`).
