import { useCallback, useEffect, useRef, useState } from 'react';
import { useAnimatedReaction, type SharedValue } from 'react-native-reanimated';
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
  createEngine,
  engineSnapshot,
  processPose,
  type EngineSnapshot,
  type EngineState,
} from '../domain/engine';
import { getExercise } from '../domain/registry';
import type { Difficulty, EngineEvent, ExerciseId } from '../domain/types';

export interface EngineHudState {
  /** Exercise being counted (in auto mode: once the classifier picked one). */
  active: ExerciseId | null;
  snapshot: EngineSnapshot | null;
  /** Most recent cue/message (i18n key) for display. */
  lastCue: { key: string; severity: string; at: number } | null;
  classification: Classification[];
}

const EMPTY: EngineHudState = { active: null, snapshot: null, lastCue: null, classification: [] };

/**
 * DEV ONLY: runs the exercise engine + classifier on the JS thread from the pose
 * shared value so the Pose lab can show live reps and form cues. `mode = 'auto'`
 * is free mode: the classifier picks the exercise, then counting starts. The
 * workout player (Phase 6) runs the same pure engine inside the camera worklet.
 */
export function useExerciseEngine(
  pose: SharedValue<Pose | null>,
  mode: ExerciseId | 'auto',
  difficulty: Difficulty = 'intermediate',
): EngineHudState {
  const engine = useRef<EngineState | null>(null);
  const classifier = useRef(createRuleClassifier());
  const controller = useRef(createModeController('free'));
  const torsoRef = useRef(0);
  const lastClassify = useRef(0);
  // Parents remount this hook (React `key`) when the mode changes, so state starts fresh.
  const [hud, setHud] = useState<EngineHudState>(() => ({
    ...EMPTY,
    active: mode === 'auto' ? null : mode,
  }));

  useEffect(() => {
    engine.current = mode === 'auto' ? null : createEngine(getExercise(mode), { difficulty });
    classifier.current.reset();
    controller.current.reset();
  }, [mode, difficulty]);

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
      if (t - lastClassify.current > 1000) {
        lastClassify.current = t;
        classification = classifier.current.classify().slice(0, 3);
        if (mode === 'auto' && eng === null) {
          const decision = controller.current.update(classification, null);
          if (decision.kind === 'select' && decision.exercise) {
            selected = decision.exercise;
            eng = createEngine(getExercise(selected), { difficulty });
            engine.current = eng;
          }
        }
      }
      if (events.length === 0 && classification === null) return;
      setHud((prev) => {
        let lastCue = prev.lastCue;
        for (const e of events) {
          if (e.type === 'form') lastCue = { key: e.message, severity: e.severity, at: t };
          if ((e.type === 'partial_rep' || e.type === 'tempo') && e.cue)
            lastCue = { key: e.cue, severity: 'info', at: t };
          if (e.type === 'visibility' && !e.visible)
            lastCue = { key: 'cues.stepBack', severity: 'warning', at: t };
        }
        return {
          active: selected ?? prev.active,
          snapshot: eng ? engineSnapshot(eng) : null,
          lastCue,
          classification: classification ?? prev.classification,
        };
      });
    },
    [mode, difficulty],
  );

  useAnimatedReaction(
    () => pose.get(),
    (p, prev) => {
      if (p !== prev) scheduleOnRN(onPose, p);
    },
    [onPose],
  );

  return hud;
}
