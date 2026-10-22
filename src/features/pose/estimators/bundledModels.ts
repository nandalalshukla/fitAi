/* eslint-disable @typescript-eslint/no-require-imports */
/**
 * Model files bundled with the app (offline-first). Metro needs static
 * `require()` calls, so optional models (MoveNet) are added to this file by
 * `npm run models:fetch` once their .tflite files exist in assets/models/.
 * See docs/POSE_MODELS.md.
 */
export type ModelFile =
  | 'roiPreprocess224'
  | 'roiPreprocess256'
  | 'blazeposeDetector'
  | 'blazeposeLandmarksLite'
  | 'blazeposeLandmarksFull'
  | 'movenetLightning'
  | 'movenetThunder';

export const bundledModels: Partial<Record<ModelFile, number>> = {
  roiPreprocess224: require('../../../../assets/models/roi_preprocess_224.tflite'),
  roiPreprocess256: require('../../../../assets/models/roi_preprocess_256.tflite'),
  blazeposeDetector: require('../../../../assets/models/blazepose_detector.tflite'),
  blazeposeLandmarksLite: require('../../../../assets/models/blazepose_landmarks_lite.tflite'),
  blazeposeLandmarksFull: require('../../../../assets/models/blazepose_landmarks_full.tflite'),
  // @models:optional (managed by scripts/fetch-models.mjs)
};
