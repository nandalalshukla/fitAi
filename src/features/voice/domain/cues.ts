import type { EngineEvent } from '@/features/exercises/domain/types';

import { CUE_POLICIES, ENCOURAGEMENT_KEYS, type CueId } from './cueCatalog';
import { VERBOSITY_LEVEL, type Translate, type Utterance, type VoiceSettings } from './types';

export interface CueRequest {
  id: CueId;
  /** i18n key spoken (also part of the cooldown key). */
  textKey: string;
  params?: Record<string, string | number>;
}

/** Builds an utterance for a cue, or null when the verbosity setting filters it out. */
export function buildUtterance(
  req: CueRequest,
  t: Translate,
  settings: VoiceSettings,
  now: number,
): Utterance | null {
  const p = CUE_POLICIES[req.id];
  if (VERBOSITY_LEVEL[settings.verbosity] < VERBOSITY_LEVEL[p.minVerbosity]) return null;
  const text = t(req.textKey, req.params);
  if (!text || text === req.textKey) return null; // missing translation: stay silent rather than read a key
  return {
    key: `${req.id}:${req.textKey}`,
    text,
    priority: p.priority,
    createdAt: now,
    expiresAt: now + p.ttlMs,
    cooldownMs: p.cooldownMs,
    coalesceKey: p.coalesceKey,
    interrupt: p.interrupt,
  };
}

export interface RepContext {
  /** Target reps for the current set (null = open-ended). */
  targetReps: number | null;
  /** Average rep duration so far, ms (fast cadence ⇒ announce less often). */
  avgRepMs: number | null;
}

/** Fast exercises (jumping jacks, high knees) are counted every 5 regardless of the setting. */
export const FAST_CADENCE_MS = 900;

/**
 * Which cue (if any) to speak for rep `n`: the number itself, "N more" near the
 * end, or "set complete" on the last rep.
 */
export function repAnnouncement(
  n: number,
  ctx: RepContext,
  settings: VoiceSettings,
): CueRequest | null {
  if (ctx.targetReps !== null && n >= ctx.targetReps) {
    return n === ctx.targetReps ? { id: 'set_complete', textKey: 'voice.setComplete' } : null;
  }
  const fast = ctx.avgRepMs !== null && ctx.avgRepMs < FAST_CADENCE_MS;
  const every = fast ? Math.max(5, settings.repEvery) : settings.repEvery;
  const left = ctx.targetReps !== null ? ctx.targetReps - n : null;
  if (left === 3 && every > 1)
    return { id: 'reps_left', textKey: 'voice.repsLeft', params: { count: 3 } };
  if (n % every === 0) return { id: 'rep_count', textKey: 'voice.count', params: { count: n } };
  return null;
}

/** Maps exercise-engine events to cue requests (pure; the voice coach speaks them). */
export function cuesForEngineEvent(
  e: EngineEvent,
  ctx: RepContext,
  settings: VoiceSettings,
): CueRequest[] {
  switch (e.type) {
    case 'rep': {
      const out: CueRequest[] = [];
      const a = repAnnouncement(e.reps, ctx, settings);
      if (a) out.push(a);
      // Coach mode: occasional praise for clean reps (every 5th rep with quality ≥ 90).
      if (e.quality >= 90 && e.reps % 5 === 0 && a?.id !== 'set_complete') {
        out.push({
          id: 'encouragement',
          textKey: ENCOURAGEMENT_KEYS[(e.reps / 5) % ENCOURAGEMENT_KEYS.length]!,
        });
      }
      return out;
    }
    case 'partial_rep':
      return e.cue ? [{ id: 'partial_rep', textKey: e.cue }] : [];
    case 'form':
      return [
        {
          id:
            e.severity === 'critical'
              ? 'form_critical'
              : e.severity === 'warning'
                ? 'form_warning'
                : 'form_info',
          textKey: e.cue,
        },
      ];
    case 'tempo':
      return [{ id: 'tempo', textKey: e.cue }];
    case 'visibility':
      return e.visible ? [] : [{ id: 'step_back', textKey: 'cues.stepBack' }];
    case 'hold':
      return e.inPosition && e.heldMs === 0
        ? [{ id: 'hold_start', textKey: 'voice.holdStart' }]
        : [];
    case 'hold_milestone':
      return [{ id: 'hold_milestone', textKey: 'voice.seconds', params: { count: e.seconds } }];
  }
}
