import { AppError, err, logger, ok, type Result } from '@/core';

import { BLAZEPOSE_DETECTOR_INPUT, generateBlazePoseAnchors } from '../domain/anchors';
import {
  BLAZEPOSE_LANDMARK_INPUT,
  decodeBestDetection,
  decodeLandmarks,
  roiFromDetection,
} from '../domain/blazepose';
import { uprightSize } from '../domain/frame';
import {
  canUseNativePreprocess,
  PREPROCESS_MAX_PIXELS,
  PREPROCESS_PARAM_COUNT,
  writePreprocessParams,
} from '../domain/preprocess';
import { fullFrameRoi, type Roi } from '../domain/roi';
import { sampleRoiToTensor } from '../domain/sampler';
import { emptyPoints, type Pose } from '../domain/types';
import { bundledModels } from './bundledModels';
import { loadModelWithFallback, outputIndex, type LoadedModel } from './loadModel';
import type { Delegate, EstimateWorklet, FrameInput, PoseEstimator } from './types';

/** Minimal model surface used by the worklet (also implemented by test fakes). */
export interface RunnableModel {
  runSync(input: ArrayBuffer[]): ArrayBuffer[];
}

export interface BlazePoseModels {
  detector: RunnableModel;
  landmarks: RunnableModel;
  /** Native ROI preprocessing graphs (224² for the detector, 256² for landmarks). Optional: JS fallback. */
  preprocess224?: RunnableModel;
  preprocess256?: RunnableModel;
  /** Output tensor indices (resolved by name at load time). */
  boxesOut: number;
  scoresOut: number;
  landmarksOut: number;
  presenceOut: number;
}

export interface BlazePoseOptions {
  minDetectionScore?: number;
  minPresence?: number;
}

interface WorkletState {
  detIn: Float32Array;
  lmIn: Float32Array;
  /** Fixed-size staging copy of the frame for the native preprocessing graph (allocated lazily). */
  staging: Uint8Array | null;
  params: Float32Array;
  points: number[];
  roi: Roi | null;
}

let generation = 0;

/**
 * Builds the BlazePose estimate worklet: detector on the full (letterboxed)
 * frame only when nothing is tracked, then the landmark model on a rotated ROI
 * that follows the body frame to frame (MediaPipe's tracking strategy).
 */
export function createBlazePoseWorklet(
  models: BlazePoseModels,
  { minDetectionScore = 0.5, minPresence = 0.5 }: BlazePoseOptions = {},
): EstimateWorklet {
  const anchors = generateBlazePoseAnchors();
  const {
    detector,
    landmarks,
    preprocess224,
    preprocess256,
    boxesOut,
    scoresOut,
    landmarksOut,
    presenceOut,
  } = models;
  const hasNativePreprocess = preprocess224 !== undefined && preprocess256 !== undefined;
  // Worklet closures are copied/frozen; mutable per-runtime state lives on globalThis.
  const stateKey = `__formfit_blazepose_${++generation}`;
  const detSize = BLAZEPOSE_DETECTOR_INPUT;
  const lmSize = BLAZEPOSE_LANDMARK_INPUT;

  return (input: FrameInput): Pose | null => {
    'worklet';
    const g = globalThis as unknown as Record<string, WorkletState | undefined>;
    let st = g[stateKey];
    if (st === undefined) {
      st = {
        detIn: new Float32Array(detSize * detSize * 3),
        lmIn: new Float32Array(lmSize * lmSize * 3),
        staging: null,
        params: new Float32Array(PREPROCESS_PARAM_COUNT),
        points: emptyPoints(),
        roi: null,
      };
      g[stateKey] = st;
    }
    const state = st;
    const { width, height } = uprightSize(input.desc);

    // Native path: copy the frame once (memcpy via TypedArray.set) and let the
    // preprocessing graph crop/normalize. Fallback: JS sampler (slow in Hermes).
    const native =
      hasNativePreprocess &&
      canUseNativePreprocess(input.desc) &&
      input.pixels.length <= (PREPROCESS_MAX_PIXELS - 1) * 4;
    if (native) {
      if (state.staging === null) state.staging = new Uint8Array(PREPROCESS_MAX_PIXELS * 4);
      state.staging.set(input.pixels);
    }
    const tensorFor = (
      r: Roi,
      n: number,
      lo: number,
      hi: number,
      fallbackOut: Float32Array,
    ): ArrayBuffer | undefined => {
      if (native && state.staging !== null) {
        const pre = n === detSize ? preprocess224 : preprocess256;
        writePreprocessParams(input.desc, r, n, lo, hi, state.params);
        return pre?.runSync([
          state.staging.buffer as ArrayBuffer,
          state.params.buffer as ArrayBuffer,
        ])[0];
      }
      sampleRoiToTensor(input.pixels, input.desc, r, n, fallbackOut, lo, hi);
      return fallbackOut.buffer as ArrayBuffer;
    };

    let roi = state.roi;
    if (roi === null) {
      const letterbox = fullFrameRoi(width, height);
      const detTensor = tensorFor(letterbox, detSize, -1, 1, state.detIn);
      if (detTensor === undefined) return null;
      const out = detector.runSync([detTensor]);
      const boxes = out[boxesOut];
      const scores = out[scoresOut];
      if (boxes === undefined || scores === undefined) return null;
      const detection = decodeBestDetection(
        new Float32Array(boxes),
        new Float32Array(scores),
        anchors,
        letterbox,
        minDetectionScore,
      );
      if (detection === null) return null;
      roi = roiFromDetection(detection);
    }

    const lmTensor = tensorFor(roi, lmSize, 0, 1, state.lmIn);
    if (lmTensor === undefined) return null;
    const out = landmarks.runSync([lmTensor]);
    const raw = out[landmarksOut];
    const flag = out[presenceOut];
    if (raw === undefined || flag === undefined) return null;
    const presence = new Float32Array(flag)[0] ?? 0;
    if (presence < minPresence) {
      state.roi = null; // lost track: re-detect next frame
      return null;
    }
    const decoded = decodeLandmarks(new Float32Array(raw), roi, width, height, state.points);
    state.roi = decoded.nextRoi;
    return {
      points: decoded.points.slice(),
      score: presence,
      timestamp: input.timestamp,
      frameWidth: width,
      frameHeight: height,
    };
  };
}

export function createBlazePoseEstimator(variant: 'lite' | 'full'): PoseEstimator {
  let loaded: LoadedModel[] = [];
  const estimator: { estimate: EstimateWorklet | null } = { estimate: null };

  return {
    id: variant === 'lite' ? 'blazepose-lite' : 'blazepose-full',
    modelKeypoints: 33,
    get estimate() {
      return estimator.estimate;
    },
    async init(): Promise<Result<{ delegate: Delegate }>> {
      const detSrc = bundledModels.blazeposeDetector;
      const lmSrc =
        variant === 'lite'
          ? bundledModels.blazeposeLandmarksLite
          : bundledModels.blazeposeLandmarksFull;
      if (detSrc === undefined || lmSrc === undefined) {
        return err(new AppError('model_load', `BlazePose ${variant} model files are not bundled`));
      }
      const det = await loadModelWithFallback(detSrc);
      if (!det.ok) return det;
      const lm = await loadModelWithFallback(lmSrc);
      if (!lm.ok) return lm;
      loaded = [det.value, lm.value];
      // Preprocessing graphs: CPU only (GATHER isn't GPU-delegated). Optional: JS fallback if missing.
      let preprocess224: RunnableModel | undefined;
      let preprocess256: RunnableModel | undefined;
      const pre224Src = bundledModels.roiPreprocess224;
      const pre256Src = bundledModels.roiPreprocess256;
      if (pre224Src !== undefined && pre256Src !== undefined) {
        const p224 = await loadModelWithFallback(pre224Src, false);
        const p256 = await loadModelWithFallback(pre256Src, false);
        if (p224.ok && p256.ok) {
          preprocess224 = p224.value.model;
          preprocess256 = p256.value.model;
          loaded.push(p224.value, p256.value);
        } else {
          logger.warn('Native ROI preprocessing unavailable; using the JS sampler');
        }
      }
      estimator.estimate = createBlazePoseWorklet({
        detector: det.value.model,
        landmarks: lm.value.model,
        preprocess224,
        preprocess256,
        boxesOut: outputIndex(det.value.model, 'Identity', 0),
        scoresOut: outputIndex(det.value.model, 'Identity_1', 1),
        landmarksOut: outputIndex(lm.value.model, 'Identity', 0),
        presenceOut: outputIndex(lm.value.model, 'Identity_1', 1),
      });
      // Report the delegate the pose networks run on (preprocessing is always CPU).
      const delegate: Delegate =
        det.value.delegate === 'gpu' && lm.value.delegate === 'gpu' ? 'gpu' : 'cpu';
      return ok({ delegate });
    },
    dispose() {
      estimator.estimate = null;
      loaded.forEach((m) => m.model.dispose());
      loaded = [];
    },
  };
}
