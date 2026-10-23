import { getLocales } from 'expo-localization';

import { AudioFocus } from '@modules/audio-focus';

import { getVoiceSettings, useVoiceSettings } from '@/features/settings/voiceSettingsStore';
import { i18n } from '@/i18n';

import { VoiceCoach } from './domain/voiceCoach';
import { pickVoice, resolveLanguage, type VoiceInfo } from './domain/voices';
import { expoSpeechService } from './services/expoSpeechService';

let voices: VoiceInfo[] = [];
let voicesLoaded = false;

function currentVoice(): { language: string; voiceId: string | null } {
  const s = getVoiceSettings();
  const language = resolveLanguage(s.language, i18n.language, getLocales()[0]?.languageTag ?? null);
  const voiceId = s.voiceId ?? pickVoice(voices, language)?.identifier ?? null;
  return { language, voiceId };
}

let instance: VoiceCoach | null = null;

/** App-wide voice coach (speech + ducking + i18n + settings). */
export function getVoiceCoach(): VoiceCoach {
  if (!instance) {
    instance = new VoiceCoach({
      speech: expoSpeechService,
      ducker: AudioFocus,
      // Cue keys are data-driven, so the typed-key overload of t() doesn't apply here.
      translate: (key, params) =>
        String((i18n.t as (k: string, p?: object) => unknown)(key, params)),
      getSettings: getVoiceSettings,
      getVoice: currentVoice,
    });
    if (!voicesLoaded) {
      voicesLoaded = true;
      void expoSpeechService.getVoices().then((v) => {
        voices = v;
      });
    }
    // Muting mid-sentence stops immediately.
    useVoiceSettings.subscribe((s, prev) => {
      if (prev.enabled && !s.enabled) instance?.pause();
      if (!prev.enabled && s.enabled) instance?.resume();
    });
  }
  return instance;
}
