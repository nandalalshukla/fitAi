import { useCallback, useEffect, useRef, useState } from 'react';
import { useAnimatedReaction, useSharedValue, type SharedValue } from 'react-native-reanimated';
import { scheduleOnRN } from 'react-native-worklets';

import { torsoLength } from '@/features/pose/domain/geometry';
import { toSkeleton } from '@/features/pose/domain/skeleton';
import type { Pose } from '@/features/pose/domain/types';

import {
  createModeController,
  createRuleClassifier,
  type Classification,
} from '../domain/classifier';
import {
  adjustReps,
  createEngine,
  engineSnapshot,
  processPose,
  type EngineSnapshot,
  type EngineState,
} from '../domain/engine';
import { getExercise } from '../domain/registry';
import type { Difficulty, EngineEvent, ExerciseId } from '../domain/types';

/** 0 good, 1 warning, 2 bad (drives the skeleton colour). */
export type LiveFormLevel = 0 | 1 | 2;

export interface LiveExerciseState {
  /** Exercise being counted (in free mode: once the classifier picked one). */
  active: ExerciseId | null;
  snapshot: EngineSnapshot | null;
  /** Most recent cue/message (i18n key) for display. */
  lastCue: { key: string; severity: string; at: number } | null;
  classification: Classification[];
  /** Guided mode: another exercise is confidently detected. */
  suggestion: ExerciseId | null;
}

const EMPTY: LiveExerciseState = {
  active: null,
  snapshot: null,
  lastCue: null,
  classification: [],
  suggestion: null,
};

const FORM_LEVEL_HOLD_MS = 2500;

/**
 * Runs the pure exercise engine + classifier on poses from the camera worklet.
 * Poses arrive through a shared value (no per-frame React renders); React state
 * only changes when the engine emits an event or the classifier is re-run (1 Hz).
 * `mode`: an exercise id (guided) or 'auto' (free mode: the classifier picks it).
 * Parents remount the hook (React `key`) to change exercise or set.
 */
export function useLiveExercise(
  pose: SharedValue<Pose | null>,
  mode: ExerciseId | 'auto',
  difficulty: Difficulty = 'intermediate',
  /** Receives engine events (e.g. to speak them) with the running average rep duration. */
  onEvents?: (events: EngineEvent[], avgRepMs: number | null) => void,
  /** Optional shared value to drive (e.g. the camera skeleton colour). */
  externalFormLevel?: SharedValue<LiveFormLevel>,
) {
  const engine = useRef<EngineState | null>(null);
  const classifier = useRef(createRuleClassifier());
  const controller = useRef(createModeController(mode === 'auto' ? 'free' : 'guided'));
  const torsoRef = useRef(0);
  const lastClassify = useRef(0);
  const avgRepMs = useRef<number | null>(null);
  const flags = useRef(new Set<string>());
  const formTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const ownFormLevel = useSharedValue<LiveFormLevel>(0);
  const formLevel = externalFormLevel ?? ownFormLevel;
  const onEventsRef = useRef(onEvents);
  useEffect(() => {
    onEventsRef.current = onEvents;
  }, [onEvents]);
  const [state, setState] = useState<LiveExerciseState>(() => ({
    ...EMPTY,
    active: mode === 'auto' ? null : mode,
  }));

  useEffect(() => {
    engine.current = mode === 'auto' ? null : createEngine(getExercise(mode), { difficulty });
    classifier.current.reset();
    controller.current.reset();
    return () => {
      if (formTimer.current) clearTimeout(formTimer.current);
    };
  }, [mode, difficulty]);

  const flagForm = useCallback(
    (level: LiveFormLevel) => {
      if (level > formLevel.get()) formLevel.set(level);
      if (formTimer.current) clearTimeout(formTimer.current);
      formTimer.current = setTimeout(() => formLevel.set(0), FORM_LEVEL_HOLD_MS);
    },
    [formLevel],
  );

  const onPose = useCallback(
    (p: Pose | null) => {
      const t = p?.timestamp ?? Date.now();
      const events: EngineEvent[] = [];
      let eng = engine.current;
      if (eng) processPose(eng, p, t, events);
      if (p) {
        // Use the engine's smoothed skeleton when counting; raw pose in free mode.
        const skel = eng?.visible ? eng.skeleton : toSkeleton(p);
        torsoRef.current = eng?.torsoRef || Math.max(torsoLength(skel), torsoRef.current * 0.997);
        classifier.current.push(skel, torsoRef.current);
      }
      let classification: Classification[] | null = null;
      let selected: ExerciseId | null = null;
      let suggestion: ExerciseId | null = null;
      if (t - lastClassify.current > 1000) {
        lastClassify.current = t;
        classification = classifier.current.classify().slice(0, 3);
        const decision = controller.current.update(classification, mode === 'auto' ? null : mode);
        if (mode === 'auto' && eng === null && decision.kind === 'select' && decision.exercise) {
          selected = decision.exercise;
          eng = createEngine(getExercise(selected), { difficulty });
          engine.current = eng;
        } else if (mode !== 'auto' && decision.kind !== 'none' && decision.exercise) {
          suggestion = decision.exercise;
        }
      }
      for (const e of events) {
        if (e.type === 'rep') {
          avgRepMs.current =
            avgRepMs.current === null ? e.durationMs : avgRepMs.current * 0.7 + e.durationMs * 0.3;
          for (const v of e.violations) flags.current.add(v);
        }
        if (e.type === 'form') {
          flags.current.add(e.ruleId);
          flagForm(e.severity === 'critical' ? 2 : 1);
        }
      }
      if (events.length > 0) onEventsRef.current?.(events, avgRepMs.current);
      if (events.length === 0 && classification === null) return;
      setState((prev) => {
        let lastCue = prev.lastCue;
        for (const e of events) {
          if (e.type === 'form') lastCue = { key: e.message, severity: e.severity, at: t };
          if ((e.type === 'partial_rep' || e.type === 'tempo') && e.cue)
            lastCue = { key: e.cue, severity: 'info', at: t };
          if (e.type === 'visibility' && !e.visible)
            lastCue = { key: 'cues.stepBack', severity: 'warning', at: t };
          if (e.type === 'visibility' && e.visible && lastCue?.key === 'cues.stepBack')
            lastCue = null;
        }
        return {
          active: selected ?? prev.active,
          snapshot: eng ? engineSnapshot(eng) : null,
          lastCue,
          classification: classification ?? prev.classification,
          suggestion: suggestion ?? prev.suggestion,
        };
      });
    },
    [mode, difficulty, flagForm],
  );

  useAnimatedReaction(
    () => pose.get(),
    (p, prev) => {
      if (p !== prev) scheduleOnRN(onPose, p);
    },
    [onPose],
  );

  /** Manual rep correction (+/-) when the camera missed or double-counted a rep. */
  const adjust = useCallback((delta: number) => {
    const eng = engine.current;
    if (!eng) return;
    adjustReps(eng, delta);
    setState((prev) => ({ ...prev, snapshot: engineSnapshot(eng) }));
  }, []);

  /** Latest engine snapshot without waiting for a render (hold timers). */
  const read = useCallback(() => (engine.current ? engineSnapshot(engine.current) : null), []);

  const dismissSuggestion = useCallback(() => {
    controller.current.reset();
    setState((prev) => ({ ...prev, suggestion: null }));
  }, []);

  return {
    ...state,
    formLevel,
    adjust,
    read,
    dismissSuggestion,
    /** Form rule ids violated during this set. */
    formFlags: () => [...flags.current],
  };
}
