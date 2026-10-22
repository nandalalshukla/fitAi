/**
 * One-Euro filter (Casiez et al. 2012) per keypoint coordinate: low jitter when
 * still, low lag when moving fast. Low-confidence keypoints are held (not fed)
 * so a dropped detection doesn't drag the filtered value towards garbage.
 */
export interface OneEuroParams {
  /** Hz. Lower = smoother when still. */
  minCutoff: number;
  /** Speed coefficient. Higher = less lag on fast motion. */
  beta: number;
  /** Hz, cutoff for the derivative. */
  dCutoff: number;
}

/** Tuned for pixel coordinates at ~20-30 FPS. */
export const DEFAULT_ONE_EURO: OneEuroParams = { minCutoff: 1.2, beta: 0.02, dCutoff: 1.0 };

export interface OneEuroState {
  x: number[];
  dx: number[];
  initialized: boolean[];
  lastT: number;
}

export function createOneEuroState(size: number): OneEuroState {
  'worklet';
  return {
    x: new Array<number>(size).fill(0),
    dx: new Array<number>(size).fill(0),
    initialized: new Array<boolean>(size).fill(false),
    lastT: -1,
  };
}

const alpha = (cutoff: number, dt: number) => {
  'worklet';
  const tau = 1 / (2 * Math.PI * cutoff);
  return 1 / (1 + tau / dt);
};

/**
 * Filters `values` in place-friendly fashion: writes into `out` and returns it.
 * `confident[i] === false` holds the previous estimate for that value.
 */
export function oneEuroFilter(
  state: OneEuroState,
  values: readonly number[],
  tMs: number,
  out: number[],
  confident?: readonly boolean[],
  params: OneEuroParams = DEFAULT_ONE_EURO,
): number[] {
  'worklet';
  const dt = state.lastT < 0 ? 1 / 30 : Math.max(1e-3, (tMs - state.lastT) / 1000);
  state.lastT = tMs;
  const ad = alpha(params.dCutoff, dt);
  for (let i = 0; i < values.length; i++) {
    const v = values[i] ?? 0;
    const ok = confident === undefined || confident[i] !== false;
    if (!state.initialized[i]) {
      if (ok) {
        state.x[i] = v;
        state.dx[i] = 0;
        state.initialized[i] = true;
      }
      out[i] = state.x[i] ?? v;
      continue;
    }
    if (!ok) {
      out[i] = state.x[i] ?? v;
      continue;
    }
    const prev = state.x[i] ?? v;
    const rawDx = (v - prev) / dt;
    const edx = (state.dx[i] ?? 0) + ad * (rawDx - (state.dx[i] ?? 0));
    state.dx[i] = edx;
    const cutoff = params.minCutoff + params.beta * Math.abs(edx);
    const a = alpha(cutoff, dt);
    const nx = prev + a * (v - prev);
    state.x[i] = nx;
    out[i] = nx;
  }
  return out;
}

export function resetOneEuro(state: OneEuroState): void {
  'worklet';
  state.lastT = -1;
  for (let i = 0; i < state.initialized.length; i++) state.initialized[i] = false;
}
