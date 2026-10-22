/**
 * Frame-loop performance tracking + adaptive throttling. Pure and worklet-safe.
 * FPS/latency are exponential moving averages; the throttle skips inference on
 * some frames when the average inference time exceeds the frame budget, and
 * steps back down when there is headroom.
 */
export interface PerfStats {
  /** Frames delivered by the camera per second. */
  cameraFps: number;
  /** Pose estimations completed per second. */
  inferenceFps: number;
  /** Average total estimate() time (ms): preprocessing + model + decoding. */
  inferenceMs: number;
  /** Worst inference time in the current window (ms). */
  maxInferenceMs: number;
  /** Process every Nth frame (1 = every frame). */
  frameStride: number;
  frames: number;
  inferences: number;
  droppedByThrottle: number;
}

export interface PerfState extends PerfStats {
  lastFrameTs: number;
  lastInferenceTs: number;
  counter: number;
  windowStart: number;
  /** Last time stats were published to the UI (ms). */
  lastStatsTs: number;
}

const ALPHA = 0.1;

export function createPerfState(): PerfState {
  'worklet';
  return {
    cameraFps: 0,
    inferenceFps: 0,
    inferenceMs: 0,
    maxInferenceMs: 0,
    frameStride: 1,
    frames: 0,
    inferences: 0,
    droppedByThrottle: 0,
    lastFrameTs: 0,
    lastInferenceTs: 0,
    counter: 0,
    windowStart: 0,
    lastStatsTs: 0,
  };
}

const ema = (prev: number, next: number) => {
  'worklet';
  return prev === 0 ? next : prev + ALPHA * (next - prev);
};

/** Call once per camera frame. Returns whether inference should run on this frame. */
export function onFrame(state: PerfState, nowMs: number): boolean {
  'worklet';
  if (state.lastFrameTs > 0) {
    const dt = nowMs - state.lastFrameTs;
    if (dt > 0) state.cameraFps = ema(state.cameraFps, 1000 / dt);
  }
  state.lastFrameTs = nowMs;
  state.frames++;
  state.counter++;
  if (state.counter >= state.frameStride) {
    state.counter = 0;
    return true;
  }
  state.droppedByThrottle++;
  return false;
}

/**
 * Call after each inference. `budgetMs` is the time we allow per inference
 * (e.g. 1000 / targetFps). Adjusts `frameStride` (1..maxStride).
 */
export function onInference(
  state: PerfState,
  nowMs: number,
  durationMs: number,
  budgetMs: number,
  maxStride = 4,
): void {
  'worklet';
  if (state.lastInferenceTs > 0) {
    const dt = nowMs - state.lastInferenceTs;
    if (dt > 0) state.inferenceFps = ema(state.inferenceFps, 1000 / dt);
  }
  state.lastInferenceTs = nowMs;
  state.inferences++;
  state.inferenceMs = ema(state.inferenceMs, durationMs);
  if (state.windowStart === 0 || nowMs - state.windowStart > 2000) {
    state.windowStart = nowMs;
    state.maxInferenceMs = durationMs;
  } else if (durationMs > state.maxInferenceMs) {
    state.maxInferenceMs = durationMs;
  }
  // Hysteresis: slow down at 110% of budget, speed up below 60%.
  if (state.inferenceMs > budgetMs * 1.1 && state.frameStride < maxStride) {
    state.frameStride++;
    state.inferenceMs = budgetMs; // give the new stride time to settle
  } else if (state.inferenceMs < budgetMs * 0.6 && state.frameStride > 1) {
    state.frameStride--;
  }
}

export function snapshot(state: PerfState): PerfStats {
  'worklet';
  return {
    cameraFps: state.cameraFps,
    inferenceFps: state.inferenceFps,
    inferenceMs: state.inferenceMs,
    maxInferenceMs: state.maxInferenceMs,
    frameStride: state.frameStride,
    frames: state.frames,
    inferences: state.inferences,
    droppedByThrottle: state.droppedByThrottle,
  };
}
