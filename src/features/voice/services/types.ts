import type { VoiceInfo } from '../domain/voices';

export interface SpeakOptions {
  language: string;
  rate: number;
  volume: number;
  voiceId: string | null;
}

/** Text-to-speech backend. `speak` resolves when the utterance finished, was stopped or failed. */
export interface SpeechService {
  speak(text: string, options: SpeakOptions): Promise<void>;
  stop(): Promise<void>;
  getVoices(): Promise<VoiceInfo[]>;
}

/** Lowers other audio (music) while speaking. */
export interface AudioDucker {
  requestDuck(): boolean;
  abandon(): void;
}
