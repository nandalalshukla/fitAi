import { allExercises } from '@/features/exercises/domain/registry';
import type { EngineEvent } from '@/features/exercises/domain/types';
import { en } from '@/i18n/locales/en';

import { CUE_POLICIES, ENCOURAGEMENT_KEYS } from '../cueCatalog';
import { buildUtterance, cuesForEngineEvent, repAnnouncement } from '../cues';
import { DEFAULT_VOICE_SETTINGS, type Translate } from '../types';
import { pickVoice, resolveLanguage, type VoiceInfo } from '../voices';

const lookup = (key: string): unknown =>
  key.split('.').reduce<unknown>((o, k) => (o as Record<string, unknown> | undefined)?.[k], en);
const t: Translate = (key, params) => {
  const v = lookup(key);
  if (typeof v !== 'string') return key;
  return v.replace(/\{\{(\w+)\}\}/g, (_m, p: string) => String(params?.[p] ?? ''));
};
const S = DEFAULT_VOICE_SETTINGS;

describe('cue policies', () => {
  it('rank form warnings above rep counts above encouragement (spec)', () => {
    expect(CUE_POLICIES.form_critical.priority).toBeGreaterThan(CUE_POLICIES.rep_count.priority);
    expect(CUE_POLICIES.form_warning.priority).toBeGreaterThan(CUE_POLICIES.rep_count.priority);
    expect(CUE_POLICIES.rep_count.priority).toBeGreaterThan(CUE_POLICIES.encouragement.priority);
  });

  it('repeat-limits form cues to one per ~4-5 s', () => {
    for (const id of ['form_critical', 'form_warning', 'partial_rep'] as const) {
      expect(CUE_POLICIES[id].cooldownMs).toBeGreaterThanOrEqual(4000);
      expect(CUE_POLICIES[id].cooldownMs).toBeLessThanOrEqual(5000);
    }
  });

  it('every spoken key used by exercises and the coach is translated', () => {
    const keys = new Set<string>(['cues.stepBack', 'cues.slowDown', ...ENCOURAGEMENT_KEYS]);
    for (const d of allExercises()) {
      if (d.partialRepCue) keys.add(d.partialRepCue);
      d.rules.forEach((r) => keys.add(r.cue));
    }
    for (const k of Object.keys(en.voice)) if (k !== 'encourage') keys.add(`voice.${k}`);
    for (const k of keys) expect(typeof lookup(k)).toBe('string');
  });
});

describe('rep announcements', () => {
  const ctx = { targetReps: 20, avgRepMs: 2000 };
  it('counts every rep and says "set complete" on the last one', () => {
    expect(repAnnouncement(7, ctx, S)).toMatchObject({ id: 'rep_count', params: { count: 7 } });
    expect(repAnnouncement(20, ctx, S)).toMatchObject({ id: 'set_complete' });
    expect(repAnnouncement(21, ctx, S)).toBeNull();
  });

  it('every-5 mode counts 5, 10, 15 and says "3 more"', () => {
    const s = { ...S, repEvery: 5 as const };
    expect(repAnnouncement(7, ctx, s)).toBeNull();
    expect(repAnnouncement(10, ctx, s)).toMatchObject({ id: 'rep_count' });
    expect(repAnnouncement(17, ctx, s)).toMatchObject({ id: 'reps_left', params: { count: 3 } });
  });

  it('fast cadence (high knees) automatically counts every 5', () => {
    expect(repAnnouncement(7, { targetReps: null, avgRepMs: 500 }, S)).toBeNull();
    expect(repAnnouncement(10, { targetReps: null, avgRepMs: 500 }, S)).toMatchObject({
      id: 'rep_count',
    });
  });
});

describe('engine event → cues', () => {
  const ctx = { targetReps: 10, avgRepMs: 2000 };
  const ev = (e: EngineEvent) => cuesForEngineEvent(e, ctx, S);

  it('maps form severities, partial reps, tempo, visibility and holds', () => {
    expect(
      ev({
        type: 'form',
        t: 0,
        ruleId: 'squat.knees_cave',
        severity: 'critical',
        cue: 'cues.kneesOut',
        message: 'form.kneesOut',
      })[0]?.id,
    ).toBe('form_critical');
    expect(ev({ type: 'partial_rep', t: 0, cue: 'cues.goLower' })[0]).toMatchObject({
      id: 'partial_rep',
      textKey: 'cues.goLower',
    });
    expect(ev({ type: 'tempo', t: 0, cue: 'cues.slowDown' })[0]?.id).toBe('tempo');
    expect(ev({ type: 'visibility', t: 0, visible: false, missing: [] })[0]?.id).toBe('step_back');
    expect(ev({ type: 'visibility', t: 0, visible: true, missing: [] })).toEqual([]);
    expect(ev({ type: 'hold_milestone', t: 0, seconds: 30 })[0]).toMatchObject({
      params: { count: 30 },
    });
  });

  it('adds praise on every 5th clean rep', () => {
    const cues = ev({
      type: 'rep',
      t: 0,
      reps: 5,
      quality: 95,
      durationMs: 2000,
      tooFast: false,
      violations: [],
    });
    expect(cues.map((c) => c.id)).toEqual(['rep_count', 'encouragement']);
  });
});

describe('buildUtterance', () => {
  it('translates and applies the verbosity filter', () => {
    const u = buildUtterance(
      { id: 'rep_count', textKey: 'voice.count', params: { count: 12 } },
      t,
      S,
      100,
    );
    expect(u).toMatchObject({
      text: '12',
      priority: CUE_POLICIES.rep_count.priority,
      expiresAt: 100 + CUE_POLICIES.rep_count.ttlMs,
    });
    expect(
      buildUtterance({ id: 'encouragement', textKey: 'voice.encourage.strong' }, t, S, 0),
    ).toBeNull(); // coach only
    expect(
      buildUtterance(
        { id: 'encouragement', textKey: 'voice.encourage.strong' },
        t,
        { ...S, verbosity: 'coach' },
        0,
      )?.text,
    ).toBe('Strong!');
    expect(
      buildUtterance(
        { id: 'form_warning', textKey: 'cues.chestUp' },
        t,
        { ...S, verbosity: 'minimal' },
        0,
      ),
    ).toBeNull();
    expect(
      buildUtterance(
        { id: 'form_critical', textKey: 'cues.kneesOut' },
        t,
        { ...S, verbosity: 'minimal' },
        0,
      ),
    ).not.toBeNull();
  });

  it('stays silent instead of reading an untranslated key', () => {
    expect(
      buildUtterance({ id: 'form_warning', textKey: 'cues.doesNotExist' }, t, S, 0),
    ).toBeNull();
  });
});

describe('voice selection', () => {
  const voices: VoiceInfo[] = [
    { identifier: 'a', name: 'Alex', language: 'en-US', quality: 'Default' },
    { identifier: 'b', name: 'Ava', language: 'en-US', quality: 'Enhanced' },
    { identifier: 'c', name: 'Daniel', language: 'en-GB', quality: 'Enhanced' },
    { identifier: 'd', name: 'Anna', language: 'de-DE', quality: 'Enhanced' },
  ];
  it('prefers exact locale, then enhanced quality', () => {
    expect(pickVoice(voices, 'en-US')?.identifier).toBe('b');
    expect(pickVoice(voices, 'en_GB')?.identifier).toBe('c');
    expect(pickVoice(voices, 'en-AU')?.identifier).toBe('b'); // same language fallback
    expect(pickVoice(voices, 'ja-JP')).toBeNull();
  });
  it('resolves the speech language', () => {
    expect(resolveLanguage('auto', 'en', 'en-GB')).toBe('en-GB');
    expect(resolveLanguage('auto', 'en', 'de-DE')).toBe('en');
    expect(resolveLanguage('en-IN', 'en', 'en-GB')).toBe('en-IN');
  });
});
