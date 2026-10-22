import { en } from '@/i18n/locales/en';

import { allExercises, getExercise, hasExercise, registerExercise } from '../registry';
import { resolveThresholds } from '../thresholds';
import type { Difficulty, RepThresholds } from '../types';

const lookup = (key: string): unknown =>
  key.split('.').reduce<unknown>((o, k) => (o as Record<string, unknown> | undefined)?.[k], en);

const DIFFICULTIES: Difficulty[] = ['beginner', 'intermediate', 'advanced'];
const VIEWS = ['side', 'front'] as const;

describe('exercise registry', () => {
  it('registers all 11 camera-tracked exercises', () => {
    expect(
      allExercises()
        .map((d) => d.id)
        .sort(),
    ).toEqual([
      'crunch',
      'glute_bridge',
      'high_knees',
      'jumping_jack',
      'leg_raise',
      'lunge',
      'mountain_climber',
      'plank',
      'push_up',
      'sit_up',
      'squat',
    ]);
    expect(hasExercise('squat')).toBe(true);
    expect(hasExercise('burpee')).toBe(false);
    expect(() => getExercise('nope' as never)).toThrow();
    expect(() => registerExercise(getExercise('squat'))).toThrow(/already registered/);
  });

  describe.each(allExercises().map((d) => [d.id, d] as const))('%s', (_id, def) => {
    it('references existing i18n keys', () => {
      expect(typeof lookup(def.nameKey)).toBe('string');
      expect(typeof lookup(def.cameraPlacement.tipKey)).toBe('string');
      if (def.partialRepCue) expect(typeof lookup(def.partialRepCue)).toBe('string');
      for (const r of def.rules) {
        expect(typeof lookup(r.cue)).toBe('string');
        expect(typeof lookup(r.message)).toBe('string');
      }
    });

    it('has unique, namespaced rule ids', () => {
      const ids = def.rules.map((r) => r.id);
      expect(new Set(ids).size).toBe(ids.length);
      ids.forEach((id) => expect(id.startsWith(`${def.id}.`)).toBe(true));
    });

    it('has a counter or a hold config matching its mode', () => {
      if (def.mode === 'reps') expect(def.counter?.signals.length).toBeGreaterThan(0);
      else expect(def.hold).toBeDefined();
    });

    if (def.mode === 'reps') {
      it.each(DIFFICULTIES.flatMap((d) => VIEWS.map((v) => [d, v] as const)))(
        'thresholds are ordered start → partial → peak (%s, %s)',
        (difficulty, view) => {
          const th = resolveThresholds(
            def.thresholds,
            difficulty,
            view,
          ) as unknown as RepThresholds;
          const dir = def.counter!.peakWhen === 'below' ? -1 : 1;
          expect((th.partial - th.start) * dir).toBeGreaterThan(0);
          expect((th.peak - th.partial) * dir).toBeGreaterThan(0);
          expect((th.target - th.peak) * dir).toBeGreaterThanOrEqual(0);
        },
      );
    }
  });

  it('difficulty and view overrides merge in order (view wins)', () => {
    const th = resolveThresholds(getExercise('squat').thresholds, 'beginner', 'front');
    expect(th.peak).toBe(0.3); // front view override (thigh drop)
    expect(resolveThresholds(getExercise('squat').thresholds, 'beginner', 'side').peak).toBe(110);
    expect(resolveThresholds(getExercise('squat').thresholds, 'advanced', 'side').peak).toBe(95);
  });
});
