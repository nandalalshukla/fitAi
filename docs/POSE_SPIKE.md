# Phase 2 — Pose spike results

## What was built

- Camera: VisionCamera **5.2.3** (Nitro) + `react-native-vision-camera-worklets` (frame processors
  on a react-native-worklets runtime, same as Reanimated 4). Frame output: RGB, preview-sized
  (VGA 4:3 target), physically rotated upright, `dropFramesWhileBusy`.
- Inference: `react-native-fast-tflite` **3.0.1** (Nitro HybridObjects are usable inside worklets
  directly), BlazePose lite/full + native ROI preprocessing graphs (see `POSE_MODELS.md`).
- Overlay: `@shopify/react-native-skia` **2.14** paths built on the UI thread from a Reanimated
  shared value written by the camera worklet → **no React re-renders per frame**.
- Adaptive performance: EMA of inference time; frame stride increases when inference exceeds
  110 % of the budget (1000 / targetFps) and recovers below 60 % (`domain/perf.ts`, tested).
- Dev **Pose lab** (`Settings → Pose lab (dev)` → `/dev/pose-lab`): live camera + skeleton,
  model switcher, front/back toggle, debug HUD (camera FPS, pose FPS, inference ms, stride,
  per-keypoint confidence), and a **30 s benchmark** that prints p50/p5 FPS and p50/p95 latency.

## Measured in this environment (no phone available)

| Measurement                                                      | Result         | Where                             |
| ---------------------------------------------------------------- | -------------- | --------------------------------- |
| JS crop 256² in **Hermes** VM (interpreter)                      | 22 ms          | x86 Xeon 2.8 GHz, Hermes 0.12 CLI |
| JS crop 224² in Hermes                                           | 15 ms          | same                              |
| Native preprocessing graph 256² / 224²                           | 2.4 / 1.7 ms   | LiteRT, same CPU                  |
| BlazePose detector (1 / 4 threads)                               | 18.9 / 7.5 ms  | LiteRT XNNPACK, same CPU          |
| BlazePose landmarks lite (1 / 4 threads)                         | 18.6 / 11.0 ms | same                              |
| BlazePose landmarks full (1 / 4 threads)                         | 33.2 / 9.9 ms  | same                              |
| Graph output vs reference sampler                                | bit-identical  | `tools/pose/verify_preprocess.py` |
| Android + iOS JS bundles (Metro, with models)                    | build OK       | `npx expo export`                 |
| Android prebuild (manifest: CAMERA, no RECORD_AUDIO, OpenCL lib) | OK             | `npx expo prebuild`               |

**Not measured yet — needs a real device:** on-device FPS, latency and GPU/CoreML speed-ups.
These are server-CPU numbers and only indicate relative cost. A native compile was also not
possible here (Android SDK/NDK downloads are blocked in this sandbox).

Expected tracking-frame cost on a mid-range phone ≈ preprocessing 3–5 ms + landmarks
(GPU ~5–8 ms / CPU ~20–30 ms) → GPU path comfortably within the 20–30 FPS target; CPU-only may
need the adaptive stride (≈15–20 FPS inference with 30 FPS preview).

## How to measure on your devices (please run and send me the numbers)

```bash
npm ci
npm run android            # or: npm run ios   (development build; Expo Go is not supported)
```

1. Open **Settings → Pose lab (dev)**, allow the camera.
2. Stand 1.5–2 m away, full body visible. Check the skeleton tracks you (front + back camera).
3. For each model (BlazePose Lite, BlazePose Full): tap **Run 30 s benchmark** while moving
   (e.g. squats). Note the results card (also logged as `Pose benchmark` in Metro).
4. Report: device model, OS, model, delegate shown in the HUD (GPU/CPU), camera fps p50, pose fps
   p50/p5, inference ms p50/p95/max, max stride.
5. (Phase 3) Under **Exercise engine** pick an exercise (or **Auto**) and do a set: the bottom-right
   HUD shows reps, phase, form score and the latest cue. Tell me where counts are off, and if you can,
   **Record** a set and share the JSON (see `docs/REPLAY_TESTING.md`).

Fill the table below with the results (I will update thresholds/defaults accordingly):

| Device | OS  | Model          | Delegate | Pose FPS p50 / p5 | Inference ms p50 / p95 |
| ------ | --- | -------------- | -------- | ----------------- | ---------------------- |
|        |     | BlazePose Lite |          |                   |                        |
|        |     | BlazePose Full |          |                   |                        |

## Risks / follow-ups

- **Orientation:** the pipeline uses physical buffer rotation (frames arrive upright). Rotated
  buffers are supported (tested maths) if we disable it for performance; verify on device.
- **Front-camera mirroring:** skeleton should match the mirrored preview; the overlay has a
  `flipX` debug prop if a device reports mirroring differently.
- **CPU threads:** fast-tflite doesn't set `num_threads`; consider a small patch if CPU fallback is slow.
- **Memory:** per-frame allocations are limited to small output views; staging (4.9 MB) and tensors
  are allocated once per estimator. A 60-minute soak test is part of the hardening phase.
