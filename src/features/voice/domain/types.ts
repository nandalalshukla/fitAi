/** How chatty the coach is. Each cue declares the minimum verbosity it needs. */
export type Verbosity = 'minimal' | 'standard' | 'coach';

export const VERBOSITY_LEVEL: Record<Verbosity, number> = { minimal: 0, standard: 1, coach: 2 };

export interface Utterance {
  /** Cooldown / dedupe identity (e.g. 'form:cues.chestUp'). */
  key: string;
  text: string;
  /** Higher speaks first. */
  priority: number;
  createdAt: number;
  /** Not spoken after this time (stale counts are useless). */
  expiresAt: number;
  /** Same key not repeated within this window, ms. */
  cooldownMs: number;
  /** Pending utterances with the same coalesce key are replaced (only the latest count matters). */
  coalesceKey?: string;
  /** May cut off a lower-priority utterance that is currently playing (countdown). */
  interrupt?: boolean;
}

export interface VoiceSettings {
  enabled: boolean;
  /** 0..1 */
  volume: number;
  /** Speech rate, 1 = normal. */
  rate: number;
  /** 'auto' follows the app language. Otherwise a BCP-47 tag, e.g. 'en-GB'. */
  language: string;
  /** Specific system voice identifier, if chosen. */
  voiceId: string | null;
  verbosity: Verbosity;
  /** Announce every rep (1) or every N reps. */
  repEvery: 1 | 5;
}

export const DEFAULT_VOICE_SETTINGS: VoiceSettings = {
  enabled: true,
  volume: 1,
  rate: 1.05,
  language: 'auto',
  voiceId: null,
  verbosity: 'standard',
  repEvery: 1,
};

/** Translation function injected into pure code (i18next `t` in the app). */
export type Translate = (key: string, params?: Record<string, string | number>) => string;
