/** Voice coach public API. Pure queue/cue logic lives in ./domain. */
export { useVoiceCoach } from './useVoiceCoach';
export { getVoiceCoach } from './voiceCoachInstance';
export { VoiceCoach } from './domain/voiceCoach';
export type { CueRequest, RepContext } from './domain/cues';
export type { CueId } from './domain/cueCatalog';
export type { VoiceSettings, Verbosity } from './domain/types';
