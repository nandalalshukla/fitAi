import { AppError, err, ok, type Result } from '@/core';

import { uprightSize } from '../domain/frame';
import { decodeMoveNet, meanScore } from '../domain/movenet';
import { fullFrameRoi } from '../domain/roi';
import { sampleRoiToTensor } from '../domain/sampler';
import { emptyPoints, type Pose } from '../domain/types';
import type { RunnableModel } from './blazePoseEstimator';
import { bundledModels } from './bundledModels';
import { loadModelWithFallback, type LoadedModel } from './loadModel';
import type { Delegate, EstimateWorklet, FrameInput, PoseEstimator } from './types';

interface WorkletState {
  input: Uint8Array;
  points: number[];
}

let generation = 0;

/** MoveNet SinglePose (int8): uint8 RGB input of `size`² (192 Lightning, 256 Thunder). */
export function createMoveNetWorklet(
  model: RunnableModel,
  size: number,
  minScore = 0.25,
): EstimateWorklet {
  const stateKey = `__formfit_movenet_${++generation}`;
  return (input: FrameInput): Pose | null => {
    'worklet';
    const g = globalThis as unknown as Record<string, WorkletState | undefined>;
    let st = g[stateKey];
    if (st === undefined) {
      st = { input: new Uint8Array(size * size * 3), points: emptyPoints() };
      g[stateKey] = st;
    }
    const { width, height } = uprightSize(input.desc);
    const letterbox = fullFrameRoi(width, height);
    sampleRoiToTensor(input.pixels, input.desc, letterbox, size, st.input);
    const out = model.runSync([st.input.buffer as ArrayBuffer]);
    const raw = out[0];
    if (raw === undefined) return null;
    const points = decodeMoveNet(new Float32Array(raw), letterbox, width, height, st.points);
    const score = meanScore(points);
    if (score < minScore) return null;
    return {
      points: points.slice(),
      score,
      timestamp: input.timestamp,
      frameWidth: width,
      frameHeight: height,
    };
  };
}

export function createMoveNetEstimator(variant: 'lightning' | 'thunder'): PoseEstimator {
  let loaded: LoadedModel | null = null;
  const estimator: { estimate: EstimateWorklet | null } = { estimate: null };
  return {
    id: variant === 'lightning' ? 'movenet-lightning' : 'movenet-thunder',
    modelKeypoints: 17,
    get estimate() {
      return estimator.estimate;
    },
    async init(): Promise<Result<{ delegate: Delegate }>> {
      const src =
        variant === 'lightning' ? bundledModels.movenetLightning : bundledModels.movenetThunder;
      if (src === undefined) {
        return err(
          new AppError(
            'model_load',
            `MoveNet ${variant} is not bundled. Run \`npm run models:fetch\`.`,
          ),
        );
      }
      const res = await loadModelWithFallback(src);
      if (!res.ok) return res;
      loaded = res.value;
      const size = res.value.model.inputs[0]?.shape[1] ?? (variant === 'lightning' ? 192 : 256);
      estimator.estimate = createMoveNetWorklet(res.value.model, size);
      return ok({ delegate: res.value.delegate });
    },
    dispose() {
      estimator.estimate = null;
      loaded?.model.dispose();
      loaded = null;
    },
  };
}
