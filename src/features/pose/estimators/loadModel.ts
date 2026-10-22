import { Platform } from 'react-native';
import { loadTensorflowModel, type TfliteModel } from 'react-native-fast-tflite';

import { AppError, err, logger, ok, type Result } from '@/core';

import type { Delegate } from './types';

export interface LoadedModel {
  model: TfliteModel;
  delegate: Delegate;
}

// fast-tflite 3.0.1's Metal delegate is a stub that throws; CoreML (enabled via the
// config plugin) is the accelerated path on iOS, the OpenCL GPU delegate on Android.
const gpuDelegate = Platform.OS === 'ios' ? 'core-ml' : 'android-gpu';

/**
 * Loads a bundled .tflite model, preferring the accelerated delegate (CoreML / Android GPU)
 * and falling back to CPU (XNNPACK) if the delegate is unavailable or rejects ops.
 */
export async function loadModelWithFallback(
  source: number,
  preferGpu = true,
): Promise<Result<LoadedModel>> {
  if (preferGpu) {
    try {
      const model = await loadTensorflowModel(source, [gpuDelegate]);
      return ok({ model, delegate: 'gpu' });
    } catch (e) {
      logger.warn('GPU delegate unavailable, falling back to CPU', { error: String(e) });
    }
  }
  try {
    const model = await loadTensorflowModel(source, []);
    return ok({ model, delegate: 'cpu' });
  } catch (e) {
    return err(new AppError('model_load', `Failed to load pose model: ${String(e)}`, e));
  }
}

/** Finds an output tensor index by name, falling back to positional order. */
export function outputIndex(
  model: Pick<TfliteModel, 'outputs'>,
  name: string,
  fallback: number,
): number {
  const i = model.outputs.findIndex((t) => t.name === name);
  return i >= 0 ? i : fallback;
}
