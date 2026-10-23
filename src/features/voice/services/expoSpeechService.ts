import * as Speech from 'expo-speech';

import { logger } from '@/core';

import type { VoiceInfo } from '../domain/voices';
import type { SpeakOptions, SpeechService } from './types';

/** Upper bound for one utterance so a missing native callback can never stall the queue. */
export const estimateMaxDurationMs = (text: string, rate: number) =>
  2000 + (text.length * 120) / Math.max(rate, 0.3);

/**
 * expo-speech backend. On iOS `useApplicationAudioSession: false` lets the system
 * speech session mix with and duck other audio (music keeps playing, quieter).
 * Android ducking is done by the AudioFocus module around each utterance.
 */
export const expoSpeechService: SpeechService = {
  speak(text: string, o: SpeakOptions): Promise<void> {
    return new Promise((resolve) => {
      let settled = false;
      const done = () => {
        if (settled) return;
        settled = true;
        clearTimeout(timer);
        resolve();
      };
      const timer = setTimeout(done, estimateMaxDurationMs(text, o.rate));
      try {
        Speech.speak(text, {
          language: o.language,
          rate: o.rate,
          volume: o.volume,
          voice: o.voiceId ?? undefined,
          useApplicationAudioSession: false,
          onDone: done,
          onStopped: done,
          onError: (e) => {
            logger.warn('Speech error', { error: String(e) });
            done();
          },
        });
      } catch (e) {
        logger.warn('Speech unavailable', { error: String(e) });
        done();
      }
    });
  },
  stop: () => Speech.stop(),
  async getVoices(): Promise<VoiceInfo[]> {
    try {
      const voices = await Speech.getAvailableVoicesAsync();
      return voices.map((v) => ({
        identifier: v.identifier,
        name: v.name,
        language: v.language,
        quality: v.quality === Speech.VoiceQuality.Enhanced ? 'Enhanced' : 'Default',
      }));
    } catch {
      return [];
    }
  },
};
