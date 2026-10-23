import type { EngineEvent } from '@/features/exercises/domain/types';

import { buildUtterance, cuesForEngineEvent, type CueRequest, type RepContext } from './cues';
import { SpeechQueue } from './speechQueue';
import type { Translate, Utterance, VoiceSettings } from './types';
import type { AudioDucker, SpeechService } from '../services/types';

export interface VoiceCoachDeps {
  speech: SpeechService;
  ducker: AudioDucker;
  translate: Translate;
  getSettings: () => VoiceSettings;
  /** Resolved BCP-47 language + chosen voice for speaking. */
  getVoice: () => { language: string; voiceId: string | null };
  now?: () => number;
  /** Keep focus/ducking briefly between back-to-back utterances, ms. */
  releaseDelayMs?: number;
}

/**
 * Orchestrates spoken coaching: maps engine events to cues, queues them by
 * priority, speaks one at a time and ducks other audio while talking.
 */
export class VoiceCoach {
  private readonly queue = new SpeechQueue();
  private speaking: Utterance | null = null;
  private releaseTimer: ReturnType<typeof setTimeout> | null = null;
  private ducked = false;
  private paused = false;
  private readonly now: () => number;

  constructor(private readonly deps: VoiceCoachDeps) {
    this.now = deps.now ?? Date.now;
  }

  get isSpeaking(): boolean {
    return this.speaking !== null;
  }

  get pending(): number {
    return this.queue.size;
  }

  /** Speak a cue (if settings allow). */
  say(req: CueRequest): void {
    const settings = this.deps.getSettings();
    if (!settings.enabled || this.paused) return;
    const u = buildUtterance(req, this.deps.translate, settings, this.now());
    if (!u) return;
    if (!this.queue.enqueue(u, this.now())) return;
    if (this.speaking && u.interrupt && u.priority > this.speaking.priority) {
      void this.deps.speech.stop(); // the finished-callback pumps the next (interrupting) utterance
      return;
    }
    this.pump();
  }

  /** Feed exercise-engine events. */
  handleEngineEvents(events: readonly EngineEvent[], ctx: RepContext): void {
    const settings = this.deps.getSettings();
    for (const e of events) for (const c of cuesForEngineEvent(e, ctx, settings)) this.say(c);
  }

  /** App backgrounded / interruption: stop talking, drop the queue, release audio. */
  pause(): void {
    this.paused = true;
    this.queue.clear();
    void this.deps.speech.stop();
    // Release focus now, even mid-utterance: speech is being stopped and music must come back.
    if (this.releaseTimer) clearTimeout(this.releaseTimer);
    this.releaseTimer = null;
    if (this.ducked) {
      this.ducked = false;
      this.deps.ducker.abandon();
    }
  }

  resume(): void {
    this.paused = false;
  }

  /** New workout: forget cooldowns too. */
  reset(): void {
    this.queue.reset();
  }

  dispose(): void {
    this.pause();
    if (this.releaseTimer) clearTimeout(this.releaseTimer);
  }

  private pump(): void {
    if (this.speaking || this.paused) return;
    const now = this.now();
    const next = this.queue.next(now);
    if (!next) {
      this.release(false);
      return;
    }
    const settings = this.deps.getSettings();
    if (!settings.enabled) {
      this.queue.clear();
      this.release(true);
      return;
    }
    if (this.releaseTimer) {
      clearTimeout(this.releaseTimer);
      this.releaseTimer = null;
    }
    if (!this.ducked) {
      this.deps.ducker.requestDuck(); // best effort; abandon() later is harmless either way
      this.ducked = true;
    }
    this.speaking = next;
    this.queue.markSpoken(next.key, now);
    const voice = this.deps.getVoice();
    void this.deps.speech
      .speak(next.text, {
        language: voice.language,
        voiceId: voice.voiceId,
        rate: settings.rate,
        volume: settings.volume,
      })
      .finally(() => {
        this.speaking = null;
        this.pump();
      });
  }

  private release(immediate: boolean): void {
    if (!this.ducked) return;
    const doRelease = () => {
      this.releaseTimer = null;
      if (this.speaking) return; // a new utterance started meanwhile
      this.ducked = false;
      this.deps.ducker.abandon();
    };
    if (immediate) {
      if (this.releaseTimer) clearTimeout(this.releaseTimer);
      doRelease();
    } else if (!this.releaseTimer) {
      // Short grace period so back-to-back cues don't make the music pump up and down.
      this.releaseTimer = setTimeout(doRelease, this.deps.releaseDelayMs ?? 350);
    }
  }
}
