import { bundledModels, type ModelFile } from './bundledModels';
import type { PoseModelId } from './types';

export interface PoseModelInfo {
  id: PoseModelId;
  label: string;
  family: 'blazepose' | 'movenet';
  /** Native keypoints produced by the model. */
  keypoints: number;
  files: ModelFile[];
  /** Approximate on-disk size (MB). */
  sizeMb: number;
  accuracy: 'standard' | 'high';
  license: string;
}

export const POSE_MODELS: Record<PoseModelId, PoseModelInfo> = {
  'blazepose-lite': {
    id: 'blazepose-lite',
    label: 'BlazePose Lite',
    family: 'blazepose',
    keypoints: 33,
    files: ['blazeposeDetector', 'blazeposeLandmarksLite'],
    sizeMb: 5.8,
    accuracy: 'standard',
    license: 'Apache-2.0 (Google MediaPipe)',
  },
  'blazepose-full': {
    id: 'blazepose-full',
    label: 'BlazePose Full',
    family: 'blazepose',
    keypoints: 33,
    files: ['blazeposeDetector', 'blazeposeLandmarksFull'],
    sizeMb: 9.4,
    accuracy: 'high',
    license: 'Apache-2.0 (Google MediaPipe)',
  },
  'movenet-lightning': {
    id: 'movenet-lightning',
    label: 'MoveNet Lightning',
    family: 'movenet',
    keypoints: 17,
    files: ['movenetLightning'],
    sizeMb: 2.9,
    accuracy: 'standard',
    license: 'Apache-2.0 (Google)',
  },
  'movenet-thunder': {
    id: 'movenet-thunder',
    label: 'MoveNet Thunder',
    family: 'movenet',
    keypoints: 17,
    files: ['movenetThunder'],
    sizeMb: 7.0,
    accuracy: 'high',
    license: 'Apache-2.0 (Google)',
  },
};

/** Default ("standard") and "High accuracy" model choices. */
export const DEFAULT_POSE_MODEL: PoseModelId = 'blazepose-lite';
export const HIGH_ACCURACY_POSE_MODEL: PoseModelId = 'blazepose-full';

export function isModelAvailable(
  id: PoseModelId,
  available: Partial<Record<ModelFile, number>> = bundledModels,
): boolean {
  return POSE_MODELS[id].files.every((f) => available[f] !== undefined);
}

export function availableModels(
  available: Partial<Record<ModelFile, number>> = bundledModels,
): PoseModelId[] {
  return (Object.keys(POSE_MODELS) as PoseModelId[]).filter((id) =>
    isModelAvailable(id, available),
  );
}
