import type { Verbosity } from './types';

/**
 * Every spoken cue type with its policy. Priority order follows the spec:
 * safety/form warnings > rep counts > encouragement. Countdowns are timing-
 * critical and may interrupt.
 */
export type CueId =
  | 'countdown'
  | 'go'
  | 'form_critical'
  | 'form_warning'
  | 'form_info'
  | 'step_back'
  | 'partial_rep'
  | 'tempo'
  | 'set_complete'
  | 'workout_complete'
  | 'rep_count'
  | 'reps_left'
  | 'hold_milestone'
  | 'hold_start'
  | 'rest_start'
  | 'rest_ending'
  | 'next_exercise'
  | 'switch_suggest'
  | 'encouragement';

export interface CuePolicy {
  priority: number;
  /** Min time between two utterances with the same key, ms. */
  cooldownMs: number;
  /** Time-to-live in the queue, ms. */
  ttlMs: number;
  minVerbosity: Verbosity;
  coalesceKey?: string;
  interrupt?: boolean;
}

export const CUE_POLICIES: Record<CueId, CuePolicy> = {
  countdown: {
    priority: 100,
    cooldownMs: 0,
    ttlMs: 900,
    minVerbosity: 'minimal',
    interrupt: true,
    coalesceKey: 'countdown',
  },
  go: {
    priority: 99,
    cooldownMs: 0,
    ttlMs: 1200,
    minVerbosity: 'minimal',
    interrupt: true,
    coalesceKey: 'countdown',
  },
  form_critical: { priority: 90, cooldownMs: 4500, ttlMs: 3000, minVerbosity: 'minimal' },
  step_back: { priority: 88, cooldownMs: 6000, ttlMs: 4000, minVerbosity: 'minimal' },
  form_warning: { priority: 80, cooldownMs: 4500, ttlMs: 3000, minVerbosity: 'standard' },
  partial_rep: { priority: 78, cooldownMs: 4500, ttlMs: 2500, minVerbosity: 'standard' },
  tempo: { priority: 76, cooldownMs: 6000, ttlMs: 2500, minVerbosity: 'standard' },
  form_info: { priority: 72, cooldownMs: 8000, ttlMs: 2500, minVerbosity: 'coach' },
  set_complete: {
    priority: 70,
    cooldownMs: 0,
    ttlMs: 6000,
    minVerbosity: 'minimal',
    coalesceKey: 'count',
  },
  workout_complete: { priority: 70, cooldownMs: 0, ttlMs: 8000, minVerbosity: 'minimal' },
  rep_count: {
    priority: 60,
    cooldownMs: 0,
    ttlMs: 1500,
    minVerbosity: 'minimal',
    coalesceKey: 'count',
  },
  reps_left: {
    priority: 58,
    cooldownMs: 0,
    ttlMs: 1500,
    minVerbosity: 'standard',
    coalesceKey: 'count',
  },
  hold_milestone: {
    priority: 60,
    cooldownMs: 0,
    ttlMs: 2500,
    minVerbosity: 'minimal',
    coalesceKey: 'count',
  },
  hold_start: { priority: 55, cooldownMs: 5000, ttlMs: 2000, minVerbosity: 'coach' },
  rest_start: { priority: 50, cooldownMs: 0, ttlMs: 4000, minVerbosity: 'minimal' },
  rest_ending: { priority: 52, cooldownMs: 0, ttlMs: 3000, minVerbosity: 'standard' },
  next_exercise: { priority: 50, cooldownMs: 0, ttlMs: 6000, minVerbosity: 'minimal' },
  switch_suggest: { priority: 65, cooldownMs: 20000, ttlMs: 4000, minVerbosity: 'minimal' },
  encouragement: { priority: 20, cooldownMs: 12000, ttlMs: 2000, minVerbosity: 'coach' },
};

/** Spoken encouragement lines (i18n keys), rotated deterministically. */
export const ENCOURAGEMENT_KEYS = [
  'voice.encourage.greatForm',
  'voice.encourage.strong',
  'voice.encourage.keepItUp',
  'voice.encourage.controlled',
  'voice.encourage.gotThis',
] as const;
