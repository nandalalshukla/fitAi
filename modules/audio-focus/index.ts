import { requireOptionalNativeModule } from 'expo';

interface AudioFocusNative {
  requestDuck(): boolean;
  abandon(): void;
}

/**
 * Android: transient "may duck" audio focus around each utterance so music is
 * lowered while the coach talks. iOS ducking is handled by expo-speech's own
 * audio session (`useApplicationAudioSession: false`), so this is a no-op there,
 * in Jest and in builds without the native module.
 */
const native = requireOptionalNativeModule<AudioFocusNative>('FormFitAudioFocus');

export const AudioFocus = {
  isAvailable: native !== null,
  requestDuck(): boolean {
    try {
      return native?.requestDuck() ?? false;
    } catch {
      return false;
    }
  },
  abandon(): void {
    try {
      native?.abandon();
    } catch {
      // Ignore: releasing focus is best-effort.
    }
  },
};
