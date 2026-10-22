import { torsoLength } from '@/features/pose/domain/geometry';

import { createRuleClassifier } from '../domain/classifier';
import { createEngine, engineSnapshot, processPose, type EngineState } from '../domain/engine';
import { getExercise } from '../domain/registry';
import type { EngineEvent, ExerciseId } from '../domain/types';
import { decodeFrame, type PoseFixture } from './fixture';

export interface ReplayResult {
  reps: number;
  partialReps: number;
  formFlags: Set<string>;
  tempoEvents: number;
  visibilityLost: boolean;
  milestones: number[];
  heldSeconds: number;
  averageQuality: number | null;
  /** Top-1 classifier result over the last window (null if not confident). */
  classifiedAs: ExerciseId | null;
  events: EngineEvent[];
}

/** Runs a fixture through the real engine (and classifier) exactly as the app would. */
export function replayFixture(fx: PoseFixture): ReplayResult {
  const engine: EngineState = createEngine(getExercise(fx.exercise), fx.options);
  const classifier = createRuleClassifier();
  const events: EngineEvent[] = [];
  let lastClass: ExerciseId | null = null;
  let i = 0;
  for (const row of fx.frames) {
    const { t, pose } = decodeFrame(row, fx.frame);
    processPose(engine, pose, t, events);
    if (pose !== null && engine.visible) {
      classifier.push(engine.skeleton, engine.torsoRef || torsoLength(engine.skeleton));
      if (++i % 10 === 0) {
        const top = classifier.classify()[0];
        lastClass = top && top.confidence >= 0.6 ? top.exercise : null;
      }
    }
  }
  const snap = engineSnapshot(engine);
  return {
    reps: snap.reps,
    partialReps: events.filter((e) => e.type === 'partial_rep').length,
    formFlags: new Set(events.flatMap((e) => (e.type === 'form' ? [e.ruleId] : []))),
    tempoEvents: events.filter((e) => e.type === 'tempo').length,
    visibilityLost: events.some((e) => e.type === 'visibility' && !e.visible),
    milestones: events.flatMap((e) => (e.type === 'hold_milestone' ? [e.seconds] : [])),
    heldSeconds: snap.heldMs / 1000,
    averageQuality: snap.averageQuality,
    classifiedAs: lastClass,
    events,
  };
}

/** Returns human-readable expectation failures (empty = pass). */
export function checkExpectations(fx: PoseFixture, r: ReplayResult): string[] {
  const e = fx.expect;
  const fails: string[] = [];
  if (e.reps !== undefined && Math.abs(r.reps - e.reps) > (e.repTolerance ?? 0)) {
    fails.push(`reps: expected ${e.reps}, counted ${r.reps}`);
  }
  if (e.minPartialReps !== undefined && r.partialReps < e.minPartialReps) {
    fails.push(`partial reps: expected ≥ ${e.minPartialReps}, got ${r.partialReps}`);
  }
  for (const f of e.formFlags ?? []) if (!r.formFlags.has(f)) fails.push(`missing form flag ${f}`);
  for (const f of e.forbiddenFlags ?? [])
    if (r.formFlags.has(f)) fails.push(`unexpected form flag ${f}`);
  if (e.tempo === true && r.tempoEvents === 0) fails.push('expected a tempo cue');
  if (e.tempo === false && r.tempoEvents > 0) fails.push('unexpected tempo cue');
  if (e.visibilityLost !== undefined && e.visibilityLost !== r.visibilityLost) {
    fails.push(`visibility lost: expected ${e.visibilityLost}, got ${r.visibilityLost}`);
  }
  if (e.holdSeconds && (r.heldSeconds < e.holdSeconds.min || r.heldSeconds > e.holdSeconds.max)) {
    fails.push(
      `hold: expected ${e.holdSeconds.min}-${e.holdSeconds.max}s, got ${r.heldSeconds.toFixed(1)}s`,
    );
  }
  if (e.milestones && e.milestones.join(',') !== r.milestones.join(',')) {
    fails.push(`milestones: expected ${e.milestones.join(',')}, got ${r.milestones.join(',')}`);
  }
  if (e.classifiedAs !== undefined && e.classifiedAs !== r.classifiedAs) {
    fails.push(`classifier: expected ${e.classifiedAs}, got ${r.classifiedAs}`);
  }
  return fails;
}
