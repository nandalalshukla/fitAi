import type { ExerciseId } from '../types';
import type { Classification } from './types';

/**
 * Turns periodic classifications into decisions.
 * - Guided mode: the plan says what the user should do; if another exercise is
 *   confidently detected for several evaluations, suggest switching (or
 *   auto-advance when very confident and enabled).
 * - Free mode: start counting once one exercise is confidently and consistently detected.
 */
export interface ModeDecision {
  kind: 'none' | 'suggest_switch' | 'auto_switch' | 'select';
  exercise?: ExerciseId;
  confidence?: number;
}

export interface ModeControllerOptions {
  suggestConfidence: number;
  autoSwitchConfidence: number;
  /** Consecutive evaluations required. */
  consecutive: number;
  autoSwitch: boolean;
}

export const DEFAULT_MODE_OPTIONS: ModeControllerOptions = {
  suggestConfidence: 0.7,
  autoSwitchConfidence: 0.9,
  consecutive: 3,
  autoSwitch: false,
};

export function createModeController(
  mode: 'guided' | 'free',
  options: Partial<ModeControllerOptions> = {},
) {
  const opts = { ...DEFAULT_MODE_OPTIONS, ...options };
  let candidate: ExerciseId | null = null;
  let streak = 0;
  let decided = false;

  return {
    /** Feed one classification (e.g. once per second). `current` = exercise the plan expects. */
    update(results: readonly Classification[], current: ExerciseId | null): ModeDecision {
      const top = results[0];
      if (!top) {
        candidate = null;
        streak = 0;
        return { kind: 'none' };
      }
      const currentScore = results.find((r) => r.exercise === current)?.confidence ?? 0;
      const isOther = mode === 'free' || top.exercise !== current;
      if (
        !isOther ||
        top.confidence < opts.suggestConfidence ||
        (mode === 'guided' && currentScore >= 0.5)
      ) {
        candidate = null;
        streak = 0;
        return { kind: 'none' };
      }
      streak = candidate === top.exercise ? streak + 1 : 1;
      candidate = top.exercise;
      if (streak < opts.consecutive || decided) return { kind: 'none' };
      decided = true;
      if (mode === 'free')
        return { kind: 'select', exercise: top.exercise, confidence: top.confidence };
      const auto = opts.autoSwitch && top.confidence >= opts.autoSwitchConfidence;
      return {
        kind: auto ? 'auto_switch' : 'suggest_switch',
        exercise: top.exercise,
        confidence: top.confidence,
      };
    },
    /** Call after the user answered / the exercise changed, to allow new decisions. */
    reset() {
      candidate = null;
      streak = 0;
      decided = false;
    },
  };
}
