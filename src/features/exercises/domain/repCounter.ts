import type { Features, RepCounterConfig, RepPhase, RepSummary, RepThresholds } from './types';

/**
 * Hysteresis rep state machine for one signal.
 *
 *   idle ──(signal in start zone)──▶ start      (a rep in progress at session start is ignored)
 *   start ──(leaves start zone for ≥ minPhaseMs)──▶ excursion: descending → peak → ascending
 *   excursion ──(back in start zone for ≥ minPhaseMs)──▶ start, then:
 *       extreme passed `peak`    ⇒ REP   (if ≥ minRepMs since the previous rep)
 *       extreme passed `partial` ⇒ PARTIAL ("go lower")
 *
 * Persistence (`minPhaseMs`) applies to entering/leaving the start zone, where
 * jitter would otherwise start/end reps; the peak is judged from the extreme of
 * the (smoothed) excursion, so brief peaks in fast moves (high knees) still count.
 * The gap between `start` and `peak`/`partial` is the hysteresis band.
 * "Below" exercises (squat knee angle) peak when the signal goes DOWN; "above"
 * exercises (jumping-jack openness) when it goes UP.
 */
export interface RepCounterState {
  phase: RepPhase;
  phaseSince: number;
  /** Candidate phase waiting to satisfy minPhaseMs. */
  pending: RepPhase | null;
  pendingSince: number;
  reps: number;
  /** Timestamp of the previous sample (a sample represents the interval since then). */
  lastT: number;
  repStartT: number;
  lastRepT: number;
  extreme: number;
  reachedPartial: boolean;
  min: Features;
  max: Features;
}

export type RepCounterResult =
  { kind: 'rep'; summary: RepSummary } | { kind: 'partial'; extreme: number } | null;

export function createRepCounterState(): RepCounterState {
  'worklet';
  return {
    phase: 'idle',
    phaseSince: 0,
    pending: null,
    pendingSince: 0,
    reps: 0,
    lastT: NaN,
    repStartT: 0,
    lastRepT: -Infinity,
    extreme: NaN,
    reachedPartial: false,
    min: {},
    max: {},
  };
}

/** Is `v` at least as far toward the peak as `threshold`? */
const beyond = (v: number, threshold: number, peakWhen: 'below' | 'above') => {
  'worklet';
  return peakWhen === 'below' ? v <= threshold : v >= threshold;
};

function trackExtremes(state: RepCounterState, f: Features) {
  'worklet';
  for (const k in f) {
    const v = f[k];
    if (v === undefined || Number.isNaN(v)) continue;
    const mn = state.min[k];
    const mx = state.max[k];
    if (mn === undefined || v < mn) state.min[k] = v;
    if (mx === undefined || v > mx) state.max[k] = v;
  }
}

function resetRep(state: RepCounterState, t: number, signalValue: number) {
  'worklet';
  state.repStartT = t;
  state.extreme = signalValue;
  state.reachedPartial = false;
  state.min = {};
  state.max = {};
}

/** Advances the state machine with one frame. Returns a completed (or partial) rep, if any. */
export function stepRepCounter(
  state: RepCounterState,
  signal: string,
  value: number,
  features: Features,
  t: number,
  th: RepThresholds,
  cfg: RepCounterConfig,
): RepCounterResult {
  'worklet';
  if (Number.isNaN(value)) return null;
  const pw = cfg.peakWhen;
  const inStart = !beyond(value, th.start, pw);
  // A sample stands for the interval since the previous one, so persistence also
  // works at low frame rates (one 66 ms frame at 15 FPS satisfies a 60 ms minimum).
  const sampleStart = Number.isNaN(state.lastT) ? t : state.lastT;
  state.lastT = t;

  if (state.phase === 'idle') {
    if (inStart) {
      state.phase = 'start';
      state.phaseSince = t;
    }
    return null;
  }

  if (state.phase === 'start') {
    if (inStart) {
      state.pending = null;
      return null;
    }
    if (state.pending === null) {
      state.pending = 'descending';
      state.pendingSince = sampleStart;
      resetRep(state, t, value); // rep timing starts when the signal first leaves the start zone
    }
    trackExtremes(state, features);
    if (beyond(value, state.extreme, pw)) state.extreme = value;
    if (t - state.pendingSince < cfg.minPhaseMs) return null;
    state.phase = 'descending';
    state.phaseSince = state.pendingSince;
    state.pending = null;
  } else {
    trackExtremes(state, features);
    if (Number.isNaN(state.extreme) || beyond(value, state.extreme, pw)) state.extreme = value;
  }

  // Excursion (descending / peak / ascending).
  if (beyond(value, th.partial, pw)) state.reachedPartial = true;
  const reachedPeak = beyond(state.extreme, th.peak, pw);
  if (!inStart) {
    state.pending = null;
    state.phase = beyond(value, th.peak, pw) ? 'peak' : reachedPeak ? 'ascending' : 'descending';
    return null;
  }

  // Back in the start zone: must persist before the rep is closed.
  if (state.pending !== 'start') {
    state.pending = 'start';
    state.pendingSince = sampleStart;
  }
  if (t - state.pendingSince < cfg.minPhaseMs) return null;
  state.phase = 'start';
  state.phaseSince = state.pendingSince;
  state.pending = null;

  if (reachedPeak) {
    if (t - state.lastRepT < cfg.minRepMs) return null; // double-count guard
    state.reps++;
    state.lastRepT = t;
    return {
      kind: 'rep',
      summary: {
        index: state.reps,
        signal,
        startT: state.repStartT,
        endT: state.pendingSince,
        durationMs: state.pendingSince - state.repStartT,
        extreme: state.extreme,
        min: state.min,
        max: state.max,
      },
    };
  }
  if (state.reachedPartial) return { kind: 'partial', extreme: state.extreme };
  return null;
}
