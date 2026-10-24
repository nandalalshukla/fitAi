# Performance & memory

## Design

- **Off the JS thread:** frames → TFLite pose model run in the VisionCamera worklet; the Skia
  skeleton and all animations run on the UI thread. React re-renders only on engine _events_
  (reps, form cues, visibility) and a 1 Hz classifier tick — never per frame (ADR-029).
- **Adaptive performance mode:** `src/features/pose/domain/perf.ts` measures inference time against
  the frame budget and raises the frame stride when it is exceeded (and lowers it when there is
  headroom). Thermal throttling shows up as slower inference, so a hot phone automatically runs
  inference less often instead of dropping camera frames. Users can also pick the fast model.
- **Constant memory:** engine state is fixed-size (rep quality is a running sum, not a list);
  the player state machine stores one small result per set.

## Automated checks

| Test                                   | What it proves                                                                                                                                                 |
| -------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `domain/__tests__/longSession.test.ts` | 60 minutes (108 000 frames at 30 fps) of squats through the engine: state size identical after 1 min and 60 min, >1 200 reps counted, < 1 ms per frame in Jest |
| Replay fixtures (`replay.test.ts`)     | Rep accuracy and form flags on 30 recorded/synthetic sequences                                                                                                 |
| `perf.test.ts` / `misc.test.ts`        | Stride adaptation and benchmark summaries                                                                                                                      |

## On-device profiling (needs a real phone)

1. Dev build → **Settings → Pose lab (dev)**: live FPS, inference ms and stride; run the 30 s
   benchmark and record the numbers in `docs/POSE_SPIKE.md`.
2. Workout player with the perf HUD: check that the rep-counter pop, form banner and rest ring stay
   smooth while the camera runs (target: camera ≥ 24 fps, UI 60 fps).
3. 60-minute session: Xcode Instruments (Allocations) / Android Studio Memory Profiler — memory
   should plateau after the first minutes; note device temperature and stride changes.
4. Release builds only for final numbers (`npx expo run:ios --configuration Release`,
   `npx expo run:android --variant release`).
