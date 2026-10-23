export interface VoiceInfo {
  identifier: string;
  name: string;
  quality: 'Default' | 'Enhanced';
  language: string;
}

const norm = (tag: string) => tag.replace('_', '-').toLowerCase();

/**
 * Picks the best installed voice for a BCP-47 tag: exact locale match first,
 * then same language; Enhanced quality preferred; stable by name.
 */
export function pickVoice(voices: readonly VoiceInfo[], languageTag: string): VoiceInfo | null {
  const want = norm(languageTag);
  const lang = want.split('-')[0];
  const score = (v: VoiceInfo) => {
    const l = norm(v.language);
    const match = l === want ? 2 : l.split('-')[0] === lang ? 1 : 0;
    return match === 0 ? -1 : match * 10 + (v.quality === 'Enhanced' ? 1 : 0);
  };
  const ranked = voices
    .filter((v) => score(v) >= 0)
    .sort((a, b) => score(b) - score(a) || a.name.localeCompare(b.name));
  return ranked[0] ?? null;
}

/** Resolves the speech language: explicit setting, else the device locale if it matches the app language. */
export function resolveLanguage(
  setting: string,
  appLanguage: string,
  deviceTag: string | null,
): string {
  if (setting !== 'auto') return setting;
  if (deviceTag && norm(deviceTag).split('-')[0] === appLanguage.toLowerCase()) return deviceTag;
  return appLanguage;
}
