import { VoiceCoach } from '../voiceCoach';
import { DEFAULT_VOICE_SETTINGS, type Translate, type VoiceSettings } from '../types';
import type { SpeakOptions, SpeechService } from '../../services/types';

jest.useFakeTimers();

/** Fake TTS: each utterance lasts `durationMs` (fake timers); records what was said and overlaps. */
function fakeSpeech(durationMs = 800) {
  const said: string[] = [];
  let active = 0;
  let maxActive = 0;
  let finishCurrent: (() => void) | null = null;
  const speech: SpeechService & { said: string[]; maxActive: () => number } = {
    said,
    maxActive: () => maxActive,
    speak(text: string, _o: SpeakOptions) {
      said.push(text.replace(/^> /, ''));
      active++;
      maxActive = Math.max(maxActive, active);
      return new Promise<void>((resolve) => {
        const done = () => {
          if (finishCurrent !== done) return;
          finishCurrent = null;
          active--;
          resolve();
        };
        finishCurrent = done;
        setTimeout(done, durationMs);
      });
    },
    stop: jest.fn(async () => {
      finishCurrent?.();
    }),
    getVoices: async () => [],
  };
  return speech;
}

// Translations are marked with "> " (the coach refuses to read a raw, untranslated key).
const t: Translate = (key, params) =>
  `> ${key}${params?.count !== undefined ? `:${params.count}` : ''}`;

function setup(settings: Partial<VoiceSettings> = {}, durationMs = 800) {
  const speech = fakeSpeech(durationMs);
  const ducker = { requestDuck: jest.fn(() => true), abandon: jest.fn() };
  let now = 0;
  const s: VoiceSettings = { ...DEFAULT_VOICE_SETTINGS, ...settings };
  const coach = new VoiceCoach({
    speech,
    ducker,
    translate: t,
    getSettings: () => s,
    getVoice: () => ({ language: 'en-US', voiceId: null }),
    now: () => now,
    releaseDelayMs: 300,
  });
  // Move the injected clock and fake timers together, in small steps.
  const advance = async (ms: number) => {
    for (let left = ms; left > 0; left -= 50) {
      const step = Math.min(50, left);
      now += step;
      await jest.advanceTimersByTimeAsync(step);
    }
  };
  return { coach, speech, ducker, advance, settings: s };
}

describe('VoiceCoach', () => {
  it('never overlaps utterances and speaks by priority', async () => {
    const { coach, speech, advance } = setup({}, 500);
    coach.say({ id: 'rep_count', textKey: 'voice.count', params: { count: 1 } });
    coach.say({ id: 'encouragement', textKey: 'voice.encourage.strong' }); // filtered (standard verbosity)
    coach.say({ id: 'rep_count', textKey: 'voice.count', params: { count: 2 } });
    coach.say({ id: 'form_warning', textKey: 'cues.chestUp' });
    await advance(3000);
    expect(speech.maxActive()).toBe(1);
    // "1" was already playing; the queued "2" (coalesced count) waits behind the form warning.
    expect(speech.said).toEqual(['voice.count:1', 'cues.chestUp', 'voice.count:2']);
  });

  it('drops a rep count that became stale while waiting', async () => {
    const { coach, speech, advance } = setup({}, 2500);
    coach.say({ id: 'form_critical', textKey: 'cues.kneesOut' });
    coach.say({ id: 'rep_count', textKey: 'voice.count', params: { count: 3 } }); // TTL 1.5 s < 2.5 s wait
    await advance(6000);
    expect(speech.said).toEqual(['cues.kneesOut']);
  });

  it('countdown interrupts lower-priority speech', async () => {
    const { coach, speech, advance } = setup({}, 2000);
    coach.say({ id: 'rest_start', textKey: 'voice.restStart', params: { count: 30 } });
    await advance(100);
    coach.say({ id: 'countdown', textKey: 'voice.countdown', params: { count: 3 } });
    await advance(10);
    expect(speech.stop).toHaveBeenCalled();
    expect(speech.said).toEqual(['voice.restStart:30', 'voice.countdown:3']);
  });

  it('ducks other audio while speaking and releases after the queue drains', async () => {
    const { coach, ducker, advance } = setup({}, 500);
    coach.say({ id: 'rep_count', textKey: 'voice.count', params: { count: 1 } });
    expect(ducker.requestDuck).toHaveBeenCalledTimes(1);
    await advance(500);
    coach.say({ id: 'rep_count', textKey: 'voice.count', params: { count: 2 } }); // back-to-back: keep focus
    await advance(500);
    expect(ducker.requestDuck).toHaveBeenCalledTimes(1);
    expect(ducker.abandon).not.toHaveBeenCalled();
    await advance(400);
    expect(ducker.abandon).toHaveBeenCalledTimes(1);
  });

  it('is silent when muted and stops/clears when paused', async () => {
    const muted = setup({ enabled: false });
    muted.coach.say({ id: 'form_critical', textKey: 'cues.kneesOut' });
    await muted.advance(1000);
    expect(muted.speech.said).toEqual([]);

    const { coach, speech, ducker, advance } = setup();
    coach.say({ id: 'form_critical', textKey: 'cues.kneesOut' });
    coach.say({ id: 'rep_count', textKey: 'voice.count', params: { count: 4 } });
    coach.pause();
    await advance(2000);
    expect(speech.said).toEqual(['cues.kneesOut']);
    expect(ducker.abandon).toHaveBeenCalled();
    coach.say({ id: 'rep_count', textKey: 'voice.count', params: { count: 5 } });
    await advance(1000);
    expect(speech.said).toHaveLength(1); // still paused
    coach.resume();
    coach.say({ id: 'rep_count', textKey: 'voice.count', params: { count: 6 } });
    await advance(1000);
    expect(speech.said).toEqual(['cues.kneesOut', 'voice.count:6']);
  });

  it('repeats the same form cue at most once per cooldown', async () => {
    const { coach, speech, advance } = setup({}, 300);
    for (let i = 0; i < 8; i++) {
      coach.say({ id: 'form_warning', textKey: 'cues.chestUp' });
      await advance(1000);
    }
    expect(speech.said.filter((s) => s === 'cues.chestUp')).toHaveLength(2); // t=0 and t≈5 s
  });

  it('turns engine events into speech (rep → count, last rep → set complete)', async () => {
    const { coach, speech, advance } = setup({}, 200);
    const rep = (reps: number) => ({
      type: 'rep' as const,
      t: 0,
      reps,
      quality: 80,
      durationMs: 2000,
      tooFast: false,
      violations: [],
    });
    coach.handleEngineEvents([rep(9)], { targetReps: 10, avgRepMs: 2000 });
    await advance(500);
    coach.handleEngineEvents([rep(10)], { targetReps: 10, avgRepMs: 2000 });
    await advance(500);
    expect(speech.said).toEqual(['voice.count:9', 'voice.setComplete']);
  });
});
