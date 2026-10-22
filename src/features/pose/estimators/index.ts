import { createBlazePoseEstimator } from './blazePoseEstimator';
import { createMoveNetEstimator } from './moveNetEstimator';
import type { PoseEstimator, PoseModelId } from './types';

export function createPoseEstimator(id: PoseModelId): PoseEstimator {
  switch (id) {
    case 'blazepose-lite':
      return createBlazePoseEstimator('lite');
    case 'blazepose-full':
      return createBlazePoseEstimator('full');
    case 'movenet-lightning':
      return createMoveNetEstimator('lightning');
    case 'movenet-thunder':
      return createMoveNetEstimator('thunder');
  }
}

export * from './modelRegistry';
export type * from './types';
