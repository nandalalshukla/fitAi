# pose

On-device pose estimation.

- `domain/` — pure, worklet-safe TS (no React): keypoints, frame/orientation maths, ROI maths,
  JS sampler, preprocessing params, BlazePose/MoveNet decoders, view transform, perf/throttle,
  benchmark summary. Fully unit-tested (fixtures from `tools/pose`).
- `estimators/` — `PoseEstimator` interface, model registry, TFLite loading with delegate
  fallback, BlazePose + MoveNet estimate worklets.
- `camera/` — `usePoseFrameProcessor` (VisionCamera frame output → estimate → shared values),
  `PoseCameraView` (permissions, lifecycle, overlay).
- `overlay/` — Skia skeleton drawn from shared values (no React renders per frame).
- `debug/` — dev HUD (FPS, latency, stride, confidences).

See `docs/POSE_MODELS.md` and `docs/POSE_SPIKE.md`.
