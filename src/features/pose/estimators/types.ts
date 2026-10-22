import type { Result } from '@/core';

import type { FrameDesc } from '../domain/frame';
import type { Pose } from '../domain/types';

export type PoseModelId =
  'blazepose-lite' | 'blazepose-full' | 'movenet-lightning' | 'movenet-thunder';

export type Delegate = 'gpu' | 'cpu';

export interface FrameInput {
  /** CPU pixel buffer (RGB/RGBA/BGRA). */
  pixels: Uint8Array;
  desc: FrameDesc;
  /** Milliseconds. */
  timestamp: number;
}

/** Synchronous estimate function. Runs on the camera's worklet thread. */
export type EstimateWorklet = (input: FrameInput) => Pose | null;

/**
 * Swappable pose model. `init()` loads models (JS thread, async); afterwards
 * `estimate` is a worklet that can be called from a VisionCamera frame processor.
 */
export interface PoseEstimator {
  readonly id: PoseModelId;
  /** Native keypoint count of the underlying model (17 or 33). */
  readonly modelKeypoints: number;
  init(): Promise<Result<{ delegate: Delegate }>>;
  /** Available after a successful `init()`. */
  readonly estimate: EstimateWorklet | null;
  dispose(): void;
}
