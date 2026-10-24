import { shoulderWidthRatio, torsoLength, type CameraView } from '@/features/pose/domain/geometry';
import { KEYPOINT_COUNT } from '@/features/pose/domain/keypoints';
import {
  LEFT,
  RIGHT,
  meanScoreOf,
  toSkeleton,
  type Side,
  type Skeleton,
} from '@/features/pose/domain/skeleton';
import {
  createOneEuroState,
  oneEuroFilter,
  type OneEuroState,
} from '@/features/pose/domain/smoothing';
import type { Pose } from '@/features/pose/domain/types';

import { createHoldState, stepHold, type HoldState } from './holdTimer';
import { repQuality } from './quality';
import { createRepCounterState, stepRepCounter, type RepCounterState } from './repCounter';
import { resolveThresholds } from './thresholds';
import type {
  Difficulty,
  EngineEvent,
  ExerciseDefinition,
  Features,
  RepPhase,
  RepThresholds,
  Severity,
  ThresholdSet,
} from './types';

export interface EngineOptions {
  difficulty: Difficulty;
  /** Force a camera view; omit to auto-detect (sticky). */
  view?: CameraView;
  /** Keypoint confidence needed for required joints. */
  minKeypointScore: number;
  /** Required joints must be missing this long before counting pauses, ms. */
  lostAfterMs: number;
  /** ...and visible this long before it resumes, ms. */
  foundAfterMs: number;
  /** Min time between two "go lower"/partial cues, ms. */
  partialCueCooldownMs: number;
  tempoCueCooldownMs: number;
}

export const DEFAULT_ENGINE_OPTIONS: EngineOptions = {
  difficulty: 'intermediate',
  minKeypointScore: 0.5,
  lostAfterMs: 350,
  foundAfterMs: 200,
  partialCueCooldownMs: 4500,
  tempoCueCooldownMs: 6000,
};

const TORSO_REF_DECAY = 0.997;

export interface EngineState {
  def: ExerciseDefinition<ThresholdSet>;
  opts: EngineOptions;
  th: ThresholdSet;
  view: CameraView;
  viewRatio: number;
  torsoRef: number;
  side: Side;
  filter: OneEuroState;
  raw: number[];
  smooth: number[];
  confident: boolean[];
  skeleton: Skeleton;
  visible: boolean;
  visibilityChangeSince: number;
  missing: number[];
  counters: RepCounterState[];
  hold: HoldState;
  features: Features;
  violationSince: Record<string, number>;
  lastFired: Record<string, number>;
  repViolations: Record<string, Severity>;
  lastPartialCue: number;
  lastTempoCue: number;
  reps: number;
  lastQuality: number | null;
  /** Running sum / count of rep quality (constant memory over long sessions). */
  qualitySum: number;
  qualityCount: number;
}

export interface EngineSnapshot {
  reps: number;
  phase: RepPhase;
  heldMs: number;
  inPosition: boolean;
  visible: boolean;
  view: CameraView;
  side: Side;
  lastQuality: number | null;
  averageQuality: number | null;
  features: Features;
}

export function createEngine(
  def: ExerciseDefinition<ThresholdSet>,
  options: Partial<EngineOptions> = {},
): EngineState {
  'worklet';
  const opts = { ...DEFAULT_ENGINE_OPTIONS, ...options };
  const view: CameraView = opts.view ?? (def.cameraPlacement.view === 'front' ? 'front' : 'side');
  return {
    def,
    opts,
    th: resolveThresholds(def.thresholds, opts.difficulty, view),
    view,
    viewRatio: NaN,
    torsoRef: 0,
    side: 'left',
    filter: createOneEuroState(KEYPOINT_COUNT * 2),
    raw: new Array<number>(KEYPOINT_COUNT * 2).fill(0),
    smooth: new Array<number>(KEYPOINT_COUNT * 2).fill(0),
    confident: new Array<boolean>(KEYPOINT_COUNT * 2).fill(false),
    skeleton: { x: [], y: [], score: [], t: 0 },
    visible: false,
    visibilityChangeSince: -1,
    missing: [],
    counters: (def.counter?.signals ?? []).map(() => createRepCounterState()),
    hold: createHoldState(),
    features: {},
    violationSince: {},
    lastFired: {},
    repViolations: {},
    lastPartialCue: -Infinity,
    lastTempoCue: -Infinity,
    reps: 0,
    lastQuality: null,
    qualitySum: 0,
    qualityCount: 0,
  };
}

/** Smooths keypoints (One-Euro, low-confidence points held) into `state.skeleton`. */
function smoothPose(state: EngineState, pose: Pose) {
  'worklet';
  const s = toSkeleton(pose, state.skeleton);
  for (let k = 0; k < KEYPOINT_COUNT; k++) {
    state.raw[k * 2] = s.x[k] ?? 0;
    state.raw[k * 2 + 1] = s.y[k] ?? 0;
    const c = (s.score[k] ?? 0) >= 0.3;
    state.confident[k * 2] = c;
    state.confident[k * 2 + 1] = c;
  }
  oneEuroFilter(state.filter, state.raw, pose.timestamp, state.smooth, state.confident);
  for (let k = 0; k < KEYPOINT_COUNT; k++) {
    s.x[k] = state.smooth[k * 2] ?? 0;
    s.y[k] = state.smooth[k * 2 + 1] ?? 0;
  }
}

function requiredIndices(state: EngineState): number[] {
  'worklet';
  const { joints, sides } = state.def.required;
  const out: number[] = [];
  for (const j of joints) {
    if (sides === 'both') out.push(LEFT[j], RIGHT[j]);
    else out.push(state.side === 'left' ? LEFT[j] : RIGHT[j]);
  }
  return out;
}

/** Sticky best side: switch only when the other side is clearly more visible. */
function updateSide(state: EngineState) {
  'worklet';
  const joints = state.def.required.joints;
  const l = meanScoreOf(
    state.skeleton,
    joints.map((j) => LEFT[j]),
  );
  const r = meanScoreOf(
    state.skeleton,
    joints.map((j) => RIGHT[j]),
  );
  if (state.side === 'left' && r > l + 0.15) state.side = 'right';
  else if (state.side === 'right' && l > r + 0.15) state.side = 'left';
}

/** Sticky auto view detection with hysteresis on the shoulder-width ratio. */
function updateView(state: EngineState) {
  'worklet';
  if (state.opts.view) return;
  const ratio = shoulderWidthRatio(state.skeleton);
  if (Number.isNaN(ratio)) return;
  state.viewRatio = Number.isNaN(state.viewRatio)
    ? ratio
    : state.viewRatio + 0.1 * (ratio - state.viewRatio);
  const next: CameraView =
    state.view === 'side'
      ? state.viewRatio > 0.55
        ? 'front'
        : 'side'
      : state.viewRatio < 0.4
        ? 'side'
        : 'front';
  if (next !== state.view) {
    state.view = next;
    state.th = resolveThresholds(state.def.thresholds, state.opts.difficulty, next);
  }
}

function currentPhase(state: EngineState): RepPhase {
  'worklet';
  let best: RepPhase = 'idle';
  const order: RepPhase[] = ['idle', 'start', 'ascending', 'descending', 'peak'];
  for (const c of state.counters) if (order.indexOf(c.phase) > order.indexOf(best)) best = c.phase;
  return best;
}

function fire(state: EngineState, ruleId: string, t: number, cooldownMs: number): boolean {
  'worklet';
  const last = state.lastFired[ruleId] ?? -Infinity;
  if (t - last < cooldownMs) return false;
  state.lastFired[ruleId] = t;
  return true;
}

/**
 * Processes one pose (or null when no person was detected) and appends events.
 * Pure state machine: same input sequence ⇒ same events (replay-testable).
 */
export function processPose(
  state: EngineState,
  pose: Pose | null,
  t: number,
  events: EngineEvent[] = [],
): EngineEvent[] {
  'worklet';
  const { def, opts } = state;

  // 1) Visibility gating (with hysteresis).
  let visibleNow = false;
  let missing: number[] = [];
  if (pose !== null) {
    smoothPose(state, pose);
    updateSide(state);
    const req = requiredIndices(state);
    for (const i of req)
      if ((state.skeleton.score[i] ?? 0) < opts.minKeypointScore) missing.push(i);
    visibleNow = missing.length === 0;
  } else {
    missing = requiredIndices(state);
  }
  if (visibleNow !== state.visible) {
    if (state.visibilityChangeSince < 0) state.visibilityChangeSince = t;
    const needed = visibleNow ? opts.foundAfterMs : opts.lostAfterMs;
    if (t - state.visibilityChangeSince >= needed) {
      state.visible = visibleNow;
      state.visibilityChangeSince = -1;
      state.missing = missing;
      state.violationSince = {};
      events.push({ type: 'visibility', t, visible: visibleNow, missing });
    }
  } else {
    state.visibilityChangeSince = -1;
  }
  // Within the visibility grace period keep processing: features that depend on a
  // momentarily low-confidence joint come out NaN and are ignored individually.
  if (!state.visible || pose === null) return events;

  // 2) Features.
  updateView(state);
  // Reference scale: running max of torso length, decaying ~0.3 %/frame to follow distance changes.
  state.torsoRef = Math.max(torsoLength(state.skeleton), state.torsoRef * TORSO_REF_DECAY);
  const torso = state.torsoRef;
  const f = def.features(
    { skeleton: state.skeleton, side: state.side, view: state.view, torso },
    state.th,
  );
  state.features = f;
  const th = state.th;

  // 3) Counting / holding.
  let phase: RepPhase = 'peak';
  if (def.mode === 'hold' && def.hold) {
    const inPos = def.hold.inPosition(f, th);
    const r = stepHold(state.hold, inPos, t, def.hold.graceMs, def.hold.milestoneEveryS);
    if (r.changed)
      events.push({
        type: 'hold',
        t,
        inPosition: state.hold.inPosition,
        heldMs: state.hold.heldMs,
      });
    if (r.milestone !== null) events.push({ type: 'hold_milestone', t, seconds: r.milestone });
    if (!state.hold.inPosition) return events;
  } else if (def.counter) {
    const cfg = def.counter;
    for (let i = 0; i < cfg.signals.length; i++) {
      const signal = cfg.signals[i] ?? '';
      const counter = state.counters[i];
      if (counter === undefined) continue;
      const res = stepRepCounter(
        counter,
        signal,
        f[signal] ?? NaN,
        f,
        t,
        th as unknown as RepThresholds,
        cfg,
      );
      if (res === null) continue;
      if (res.kind === 'partial') {
        if (t - state.lastPartialCue >= opts.partialCueCooldownMs) {
          state.lastPartialCue = t;
          events.push({ type: 'partial_rep', t, cue: def.partialRepCue ?? null });
        }
        continue;
      }
      // Completed rep: rep-level rules, tempo, quality.
      const summary = res.summary;
      for (const rule of def.rules) {
        if (rule.when !== 'rep' || (rule.views && !rule.views.includes(state.view))) continue;
        if (rule.check(f, th, summary)) {
          state.repViolations[rule.id] = rule.severity;
          if (fire(state, rule.id, t, rule.cooldownMs)) {
            events.push({
              type: 'form',
              t,
              ruleId: rule.id,
              severity: rule.severity,
              cue: rule.cue,
              message: rule.message,
            });
          }
        }
      }
      const tooFast = def.tempo !== undefined && summary.durationMs < def.tempo.minRepMs;
      if (tooFast && t - state.lastTempoCue >= opts.tempoCueCooldownMs) {
        state.lastTempoCue = t;
        events.push({ type: 'tempo', t, cue: 'cues.slowDown' });
      }
      const severities: Severity[] = [];
      const violations: string[] = [];
      for (const id in state.repViolations) {
        violations.push(id);
        const sev = state.repViolations[id];
        if (sev) severities.push(sev);
      }
      const quality = repQuality(
        summary.extreme,
        th as unknown as RepThresholds,
        severities,
        tooFast,
      );
      state.reps++;
      state.lastQuality = quality;
      state.qualitySum += quality;
      state.qualityCount += 1;
      state.repViolations = {};
      events.push({
        type: 'rep',
        t,
        reps: state.reps,
        quality,
        durationMs: summary.durationMs,
        tooFast,
        violations,
      });
    }
    phase = currentPhase(state);
  }

  // 4) Frame-level form rules (debounced + cooldown).
  for (const rule of def.rules) {
    if (rule.when !== 'frame') continue;
    if (rule.views && !rule.views.includes(state.view)) continue;
    if (def.mode === 'reps' && rule.phases && !rule.phases.includes(phase)) {
      delete state.violationSince[rule.id];
      continue;
    }
    if (!rule.check(f, th, null)) {
      delete state.violationSince[rule.id];
      continue;
    }
    const since = state.violationSince[rule.id] ?? t;
    state.violationSince[rule.id] = since;
    if (t - since < (rule.persistMs ?? 250)) continue;
    state.repViolations[rule.id] = rule.severity;
    if (fire(state, rule.id, t, rule.cooldownMs)) {
      events.push({
        type: 'form',
        t,
        ruleId: rule.id,
        severity: rule.severity,
        cue: rule.cue,
        message: rule.message,
      });
    }
  }
  return events;
}

export function engineSnapshot(state: EngineState): EngineSnapshot {
  'worklet';
  const n = state.qualityCount;
  return {
    reps: state.reps,
    phase: currentPhase(state),
    heldMs: state.hold.heldMs,
    inPosition: state.hold.inPosition,
    visible: state.visible,
    view: state.view,
    side: state.side,
    lastQuality: state.lastQuality,
    averageQuality: n > 0 ? Math.round(state.qualitySum / n) : null,
    features: state.features,
  };
}

/** Manual rep correction (+/-) from the workout UI. */
export function adjustReps(state: EngineState, delta: number): void {
  'worklet';
  state.reps = Math.max(0, state.reps + delta);
}
