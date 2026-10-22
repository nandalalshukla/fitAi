# Pose models

FormFit estimates body pose on-device through a `PoseEstimator` interface
(`src/features/pose/estimators/types.ts`): `init()` loads models on the JS thread and returns
the delegate in use; `estimate(frame)` is a **worklet** that runs synchronously on the camera
thread and returns a `Pose` (21 canonical keypoints, normalized upright frame coordinates);
`dispose()` frees native memory. Models are swappable by `PoseModelId`.

| Id                  | Keypoints         | Bundled                                 | Size                     | Role                                |
| ------------------- | ----------------- | --------------------------------------- | ------------------------ | ----------------------------------- |
| `blazepose-lite`    | 33 → 21 canonical | ✅                                      | 5.8 MB                   | **Default**                         |
| `blazepose-full`    | 33 → 21 canonical | ✅                                      | 9.4 MB (shares detector) | "High accuracy" setting             |
| `movenet-lightning` | 17                | via `npm run models:fetch`              | 2.9 MB                   | Optional alternative                |
| `movenet-thunder`   | 17                | via `npm run models:fetch -- --thunder` | 7 MB                     | Optional (exceeds budget with Full) |

## Why BlazePose is the default (spec asked for MoveNet first)

1. **Availability.** MoveNet's `.tflite` files are distributed via Kaggle Models / TF Hub, which
   now require an interactive download (the old public TF Hub bucket returns 403). MediaPipe's
   BlazePose bundles are on Google's public model storage with stable URLs, so they could be
   bundled and verified in this build. MoveNet is fully implemented and one command away.
2. **Form-rule coverage.** BlazePose gives 33 landmarks incl. **heels and foot index** (needed for
   the squat heel-lift rule and foot placement), plus per-landmark visibility/presence, which maps
   directly onto confidence gating.
3. **Tracking = less work per frame.** The detector runs only when nobody is tracked; afterwards
   the landmark model runs on a rotated ROI predicted from the previous frame (MediaPipe's
   strategy). This handles lying positions (push-ups, planks, bridges) by rotating the crop so the
   body is upright for the network.
4. **Tradeoff.** BlazePose lite is two networks (detector 224² + landmarks 256², both float16)
   vs. MoveNet Lightning's single int8 192² network, so on CPU it is heavier on re-detection
   frames. Measure both with the Pose lab benchmark on target devices; the interface lets us flip
   the default without touching the rest of the app.

## Pipeline (per camera frame)

```
Frame (RGB, preview-sized, physically rotated upright)
  → staging.set(frameBytes)                              native memcpy
  → [only if not tracking] roi_preprocess_224 → detector → best anchor → ROI
  → roi_preprocess_256(ROI) → landmark model → 33 landmarks + presence
  → map to 21 canonical keypoints (normalized frame coords) + next-frame ROI
  → pose shared value → Skia overlay / rep engine (UI thread, no React renders)
```

### Native ROI preprocessing graphs

Resampling a rotated 256×256 crop in JavaScript costs ~22 ms per frame in **Hermes** (measured
with the Hermes VM on a 2.8 GHz Xeon; phones are slower) because worklet runtimes have no JIT.
So the crop runs as a tiny TFLite graph (`roi_preprocess_{224,256}.tflite`, 8 KB each, builtin ops
only: FLOOR, CAST, GATHER, SELECT_V2…). JS computes 15 affine parameters
(`writePreprocessParams`, orientation + mirroring folded into one affine) and the graph does the
gather + channel reorder + normalization in C++: **~2.4 ms** on the same CPU. The graph output is
verified **bit-identical** to the reference sampler (`tools/pose/verify_preprocess.py`) and the
parameter maths is tested for all 4 orientations × mirroring in Jest. The JS sampler remains as
the fallback for 3-byte RGB frames or oversized buffers.

## Verification done without a device

- `tools/pose/blazepose_ref.py`: numpy reference of MediaPipe's pose graph (anchors, decoding,
  alignment ROI, landmark projection), run with the bundled models on a real photo
  (scikit-image "astronaut"). Landmarks land on the face/shoulders (visually checked).
- `tools/pose/export_fixture.py` → `src/features/pose/domain/__fixtures__/blazepose-astronaut.json`;
  Jest asserts the TS decoder reproduces the reference (≤1e-3) and that the estimate worklet
  detects → tracks without re-detecting → re-detects after losing the person.

Reproduce:

```bash
python3 -m venv .venv && .venv/bin/pip install -r tools/pose/requirements.txt
.venv/bin/python tools/pose/verify_preprocess.py
.venv/bin/python tools/pose/export_fixture.py assets/models/blazepose_detector.tflite \
  assets/models/blazepose_landmarks_lite.tflite src/features/pose/domain/__fixtures__/blazepose-astronaut.json
.venv/bin/python tools/pose/build_preprocess.py assets/models   # rebuild the graphs
```

## Delegates

`loadModelWithFallback` tries the accelerated delegate, then CPU:

- **iOS: CoreML** (`enableCoreMLDelegate` in the fast-tflite config plugin). fast-tflite 3.0.1's
  Metal delegate is a stub that throws, so CoreML is the only accelerated option.
- **Android: GPU (OpenCL)** (`enableAndroidGpuLibraries`). NNAPI is deprecated on Android 15.
- **CPU (XNNPACK)** fallback. fast-tflite does not set a thread count; if CPU numbers are poor on
  devices, patch it to use 2–4 threads (tracked follow-up).
- Preprocessing graphs always run on CPU (GATHER isn't GPU-delegated) — ~2–5 ms.

## Adding / replacing a model

1. Put the `.tflite` file in `assets/models/` (Metro bundles `.tflite` assets, see `metro.config.js`)
   and register it in `estimators/bundledModels.ts`.
2. Add a `PoseModelInfo` entry in `estimators/modelRegistry.ts`.
3. Implement an estimator returning canonical keypoints (see `moveNetEstimator.ts` for the minimal
   case) and add it to `createPoseEstimator`.
4. Add decode tests with a fixture produced by a Python reference run.
5. Check the 15 MB budget test still passes.

## Exercise classifier seam

The learned exercise classifier (Phase 3) consumes windows of canonical keypoints, so it is
independent of which pose model produced them.
