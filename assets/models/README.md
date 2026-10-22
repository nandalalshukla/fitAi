# Bundled pose models

All models run 100 % on-device. No camera frames ever leave the phone.

| File                              | Size   | Source                                                                       | License         | SHA-256                                                            |
| --------------------------------- | ------ | ---------------------------------------------------------------------------- | --------------- | ------------------------------------------------------------------ |
| `blazepose_detector.tflite`       | 3.0 MB | MediaPipe Pose Landmarker **lite** bundle (`pose_detector.tflite`)           | Apache-2.0      | `46837eb883e6ec75b52c5f5ff6a9b78bd35e66c13f95e8c3566c582d146cb1d9` |
| `blazepose_landmarks_lite.tflite` | 2.8 MB | MediaPipe Pose Landmarker **lite** bundle (`pose_landmarks_detector.tflite`) | Apache-2.0      | `ad6cfd3c903eb31a4ee788b809e45ecf9fa69923b69b9f3f2d9ae616ff433e58` |
| `blazepose_landmarks_full.tflite` | 6.4 MB | MediaPipe Pose Landmarker **full** bundle (`pose_landmarks_detector.tflite`) | Apache-2.0      | `82be6d591b9dad7d29fe21dc9fd892bf8b9602c458fb05209283de8282a0c488` |
| `roi_preprocess_224.tflite`       | 8 KB   | Built from `tools/pose/build_preprocess.py` (FormFit)                        | Project license | —                                                                  |
| `roi_preprocess_256.tflite`       | 8 KB   | Built from `tools/pose/build_preprocess.py` (FormFit)                        | Project license | —                                                                  |

Bundle sources (official Google MediaPipe model storage, float16 weights):

- `https://storage.googleapis.com/mediapipe-models/pose_landmarker/pose_landmarker_lite/float16/latest/pose_landmarker_lite.task`
  (SHA-256 `59929e1d1ee95287735ddd833b19cf4ac46d29bc7afddbbf6753c459690d574a`)
- `https://storage.googleapis.com/mediapipe-models/pose_landmarker/pose_landmarker_full/float16/latest/pose_landmarker_full.task`
  (SHA-256 `4eaa5eb7a98365221087693fcc286334cf0858e2eb6e15b506aa4a7ecdcec4ad`)

A `.task` file is a zip archive; the `.tflite` files above were extracted unchanged.
Model card: MediaPipe BlazePose GHUM 3D (Google). License: Apache License 2.0.

Total bundled weight: **≈12.2 MB** (budget 15 MB; enforced by
`src/features/pose/estimators/__tests__/modelRegistry.test.ts`).

## Optional: MoveNet

`npm run models:fetch` downloads MoveNet SinglePose Lightning (int8, ~2.9 MB, Apache-2.0)
and registers it. See `docs/POSE_MODELS.md`. Adding Thunder as well would exceed the 15 MB
budget together with BlazePose Full, so the script fetches Lightning only by default.
