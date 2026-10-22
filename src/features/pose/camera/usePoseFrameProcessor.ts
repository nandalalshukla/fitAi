import { useCallback, useEffect, useId, useState } from 'react';
import { useSharedValue, type SharedValue } from 'react-native-reanimated';
import { CommonResolutions, useFrameOutput, type Frame } from 'react-native-vision-camera';

import { logger } from '@/core';

import { channelOrderFor, type FrameDesc } from '../domain/frame';
import {
  createPerfState,
  onFrame,
  onInference,
  snapshot,
  type PerfState,
  type PerfStats,
} from '../domain/perf';
import type { Pose } from '../domain/types';
import {
  createPoseEstimator,
  type Delegate,
  type PoseEstimator,
  type PoseModelId,
} from '../estimators';

export interface PoseFrameProcessorOptions {
  modelId: PoseModelId;
  /** Target inference rate; the throttle skips frames when inference exceeds 1000/targetFps ms. */
  targetFps?: number;
  /** Pause inference (e.g. rest screen) without tearing down the camera. */
  enabled?: boolean;
}

export type EstimatorStatus =
  | { state: 'loading' }
  | { state: 'ready'; delegate: Delegate }
  | { state: 'error'; message: string };

export interface PoseFrameProcessor {
  frameOutput: ReturnType<typeof useFrameOutput>;
  pose: SharedValue<Pose | null>;
  stats: SharedValue<PerfStats | null>;
  status: EstimatorStatus;
}

const STATS_INTERVAL_MS = 500;

const nowMs = (): number => {
  'worklet';
  return typeof performance !== 'undefined' ? performance.now() : Date.now();
};

/**
 * Camera frame output + pose inference running entirely on the camera thread
 * (react-native-worklets runtime). Results are written to Reanimated shared
 * values, so consumers (Skia overlay, rep engine) never cause React re-renders.
 */
export function usePoseFrameProcessor({
  modelId,
  targetFps = 30,
  enabled = true,
}: PoseFrameProcessorOptions): PoseFrameProcessor {
  const pose = useSharedValue<Pose | null>(null);
  const stats = useSharedValue<PerfStats | null>(null);
  // Load state is keyed by model id so switching models derives 'loading' without an extra render.
  const [loaded, setLoaded] = useState<{
    modelId: PoseModelId;
    estimator: PoseEstimator | null;
    status: EstimatorStatus;
  } | null>(null);
  const perfKey = `__formfit_perf_${useId()}`;

  useEffect(() => {
    let cancelled = false;
    const next = createPoseEstimator(modelId);
    void next.init().then((res) => {
      if (cancelled) {
        next.dispose();
        return;
      }
      if (res.ok) {
        setLoaded({
          modelId,
          estimator: next,
          status: { state: 'ready', delegate: res.value.delegate },
        });
        logger.info('Pose model ready', { modelId, delegate: res.value.delegate });
      } else {
        setLoaded({
          modelId,
          estimator: null,
          status: { state: 'error', message: res.error.message },
        });
        logger.error('Pose model failed to load', { modelId, error: res.error.message });
      }
    });
    return () => {
      cancelled = true;
      next.dispose();
    };
  }, [modelId]);

  const current = loaded?.modelId === modelId ? loaded : null;
  const estimator = current?.estimator ?? null;
  const status: EstimatorStatus = current?.status ?? { state: 'loading' };
  const estimate = estimator?.estimate ?? null;
  const budgetMs = 1000 / targetFps;

  const onFrameCallback = useCallback(
    (frame: Frame) => {
      'worklet';
      try {
        if (!enabled || estimate === null) return;
        const g = globalThis as unknown as Record<string, PerfState | undefined>;
        let perf = g[perfKey];
        if (perf === undefined) {
          perf = createPerfState();
          g[perfKey] = perf;
        }
        const now = nowMs();
        if (!onFrame(perf, now)) return;

        const fmt = channelOrderFor(frame.pixelFormat, frame.bytesPerRow, frame.width);
        if (fmt === null) return;
        const desc: FrameDesc = {
          width: frame.width,
          height: frame.height,
          bytesPerRow: frame.bytesPerRow,
          bytesPerPixel: fmt.bytesPerPixel,
          channelOrder: fmt.order,
          orientation: frame.orientation,
          mirrored: frame.isMirrored,
        };
        const result = estimate({
          pixels: new Uint8Array(frame.getPixelBuffer()),
          desc,
          timestamp: frame.timestamp,
        });
        const end = nowMs();
        onInference(perf, end, end - now, budgetMs);
        pose.set(result);
        if (end - perf.lastStatsTs >= STATS_INTERVAL_MS) {
          perf.lastStatsTs = end;
          stats.set(snapshot(perf));
        }
      } catch {
        // A model can be disposed while a frame is in flight (model switch, unmount);
        // drop that frame rather than crashing the camera thread.
        pose.set(null);
      } finally {
        frame.dispose();
      }
    },
    [enabled, estimate, perfKey, budgetMs, pose, stats],
  );

  const frameOutput = useFrameOutput({
    // RGB costs one conversion in the camera pipeline but lets us sample pixels directly.
    pixelFormat: 'rgb',
    targetResolution: CommonResolutions.VGA_4_3,
    enablePreviewSizedOutputBuffers: true,
    // Upright, preview-matching buffers: simplest correct mapping for the spike.
    enablePhysicalBufferRotation: true,
    dropFramesWhileBusy: true,
    onFrame: onFrameCallback,
  });

  return { frameOutput, pose, stats, status };
}
