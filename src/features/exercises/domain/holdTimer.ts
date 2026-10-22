/**
 * Accumulates time "in position" for timed holds (plank). Brief excursions
 * shorter than `graceMs` don't pause the timer (pose jitter / a quick adjustment).
 */
export interface HoldState {
  heldMs: number;
  inPosition: boolean;
  lastT: number;
  outSince: number;
  lastMilestone: number;
}

export function createHoldState(): HoldState {
  'worklet';
  return { heldMs: 0, inPosition: false, lastT: -1, outSince: -1, lastMilestone: 0 };
}

export interface HoldStepResult {
  changed: boolean;
  milestone: number | null;
}

export function stepHold(
  state: HoldState,
  inPositionNow: boolean,
  t: number,
  graceMs: number,
  milestoneEveryS: number,
): HoldStepResult {
  'worklet';
  const dt = state.lastT < 0 ? 0 : Math.max(0, t - state.lastT);
  state.lastT = t;
  let changed = false;

  if (inPositionNow) {
    state.outSince = -1;
    if (!state.inPosition) {
      state.inPosition = true;
      changed = true;
    } else {
      state.heldMs += dt;
    }
  } else if (state.inPosition) {
    if (state.outSince < 0) state.outSince = t;
    if (t - state.outSince >= graceMs) {
      state.inPosition = false;
      changed = true;
    } else {
      state.heldMs += dt; // within grace: keep counting
    }
  }

  let milestone: number | null = null;
  if (milestoneEveryS > 0) {
    const m = Math.floor(state.heldMs / 1000 / milestoneEveryS) * milestoneEveryS;
    if (m > state.lastMilestone) {
      state.lastMilestone = m;
      milestone = m;
    }
  }
  return { changed, milestone };
}
