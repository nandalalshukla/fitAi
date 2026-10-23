import { getExercise } from '@/features/exercises';
import { getAnimation } from '@/features/exercises/animation';
import { en } from '@/i18n/locales/en';

import { exerciseCatalog, getExerciseInfo, plans } from '..';
import { compilePlan, estimateSessionSeconds, progressItem } from '../compile';
import { planSources } from '../plans';
import { ExerciseInfoSchema, PlanSourceSchema, type PlanItem, type Progression } from '../schema';

describe('exercise catalog', () => {
  it.each(exerciseCatalog.map((e) => [e.id, e] as const))('%s matches the schema', (_id, e) => {
    expect(() => ExerciseInfoSchema.parse(e)).not.toThrow();
  });

  it('has unique ids', () => {
    expect(new Set(exerciseCatalog.map((e) => e.id)).size).toBe(exerciseCatalog.length);
  });

  it('covers every camera-tracked engine exercise, with matching ids', () => {
    for (const e of exerciseCatalog.filter((x) => x.tracked)) {
      expect(e.tracked).toBe(e.id);
      expect(getExercise(e.tracked!).id).toBe(e.id);
    }
    expect(exerciseCatalog.filter((e) => e.tracked).length).toBe(11);
  });

  it('uses voice-cue keys that exist and belong to the exercise rules', () => {
    const cues = en.cues as Record<string, string>;
    for (const e of exerciseCatalog) {
      for (const key of e.formCues) {
        expect(cues[key.replace('cues.', '')]).toBeDefined();
        if (e.tracked) {
          const def = getExercise(e.tracked);
          const known = new Set<string>([
            ...def.rules.map((r) => r.cue),
            ...(def.partialRepCue ? [def.partialRepCue] : []),
          ]);
          expect(known).toContain(key);
        }
      }
    }
  });

  it('has at least 40 exercises, each with an animated demo synced to its steps', () => {
    expect(exerciseCatalog.length).toBeGreaterThanOrEqual(40);
    for (const e of exerciseCatalog) {
      const anim = getAnimation(e.id);
      expect([e.id, anim !== undefined]).toEqual([e.id, true]);
      const maxStep = Math.max(...anim!.keyframes.map((k) => k.step ?? 1));
      expect([e.id, maxStep <= e.steps.length]).toEqual([e.id, true]);
    }
  });

  it('offers an easier and a harder option for every exercise', () => {
    for (const e of exerciseCatalog) {
      expect([e.id, e.easier.length > 0, e.harder.length > 0]).toEqual([e.id, true, true]);
    }
  });

  it('links variations only to catalog exercises', () => {
    for (const e of exerciseCatalog)
      for (const v of [...e.easier, ...e.harder])
        if (v.exerciseId) expect(getExerciseInfo(v.exerciseId)).toBeDefined();
  });
});

describe('plans', () => {
  it.each(planSources.map((p) => [p.id, p] as const))('%s matches the schema', (_id, p) => {
    expect(() => PlanSourceSchema.parse(p)).not.toThrow();
  });

  it('has unique ids', () => {
    expect(new Set(plans.map((p) => p.id)).size).toBe(plans.length);
  });

  it.each(plans.map((p) => [p.id, p] as const))('%s is structurally sound', (_id, plan) => {
    expect(plan.schedule).toHaveLength(plan.weeks * 7);
    expect(plan.daysPerWeek).toBeGreaterThan(0);
    for (const day of plan.schedule) {
      if (day.type === 'rest') {
        expect(day.session).toBeNull();
        continue;
      }
      const s = day.session!;
      // No empty days; every exercise exists in the catalog.
      expect(s.blocks.flatMap((b) => b.items).length).toBeGreaterThan(0);
      for (const item of s.blocks.flatMap((b) => b.items))
        expect(getExerciseInfo(item.exerciseId)).toBeDefined();
    }
    // At least one rest or active-recovery day per week.
    for (let w = 1; w <= plan.weeks; w++) {
      const week = plan.schedule.filter((d) => d.week === w);
      expect(week.some((d) => d.type !== 'workout')).toBe(true);
    }
  });

  it.each(plans.map((p) => [p.id, p] as const))(
    '%s sessions realistically add up to the advertised length',
    (_id, plan) => {
      for (const day of plan.schedule) {
        if (day.type !== 'workout') continue;
        const minutes = day.session!.estimatedMinutes;
        const lo = plan.minutesPerSession * (day.deload ? 0.55 : 0.85);
        const hi = plan.minutesPerSession * 1.15;
        expect(minutes).toBeGreaterThanOrEqual(Math.floor(lo));
        expect(minutes).toBeLessThanOrEqual(Math.ceil(hi));
      }
    },
  );

  it.each(plans.map((p) => [p.id, p] as const))('%s progresses week to week', (_id, plan) => {
    const volume = (week: number) =>
      plan.schedule
        .filter((d) => d.week === week && d.type === 'workout')
        .flatMap((d) =>
          d.session!.blocks.filter((b) => b.kind !== 'warmup' && b.kind !== 'cooldown'),
        )
        .flatMap((b) => b.items)
        .reduce((sum, i) => sum + i.sets * (i.reps ?? i.seconds ?? 0), 0);
    const nonDeload = Array.from({ length: plan.weeks }, (_, i) => i + 1).filter(
      (w) => !plan.schedule.find((d) => d.week === w)?.deload,
    );
    expect(volume(nonDeload.at(-1)!)).toBeGreaterThan(volume(1));
    for (const w of plan.schedule.filter((d) => d.deload).map((d) => d.week))
      expect(volume(w)).toBeLessThan(volume(w - 1));
  });

  it.each(plans.map((p) => [p.id, p] as const))(
    '%s does not load the same big muscles hard on consecutive days',
    (_id, plan) => {
      // Hard sets per primary muscle (main + finisher). Core and calves recover quickly and
      // are commonly trained daily at moderate volume, so they are excluded.
      const BIG = new Set([
        'quads',
        'glutes',
        'hamstrings',
        'chest',
        'triceps',
        'shoulders',
        'upper_back',
      ]);
      const load = (day: (typeof plan.schedule)[number]) => {
        const m = new Map<string, number>();
        if (day.type !== 'workout') return m;
        for (const b of day.session!.blocks) {
          if (b.kind !== 'main' && b.kind !== 'finisher') continue;
          for (const i of b.items)
            for (const muscle of getExerciseInfo(i.exerciseId)!.primaryMuscles)
              if (BIG.has(muscle)) m.set(muscle, (m.get(muscle) ?? 0) + i.sets);
        }
        return m;
      };
      for (let d = 1; d < plan.schedule.length; d++) {
        const a = load(plan.schedule[d - 1]!);
        const b = load(plan.schedule[d]!);
        for (const [muscle, sets] of a) {
          const both = Math.min(sets, b.get(muscle) ?? 0);
          expect([plan.schedule[d]!.day, muscle, both < 6]).toEqual([
            plan.schedule[d]!.day,
            muscle,
            true,
          ]);
        }
      }
    },
  );

  it('the 6-pack plan is a ~60 minute session with the required blocks', () => {
    const plan = plans.find((p) => p.id === 'six_pack_abs')!;
    expect(plan.minutesPerSession).toBe(60);
    const first = plan.schedule[0]!.session!;
    const ids = first.blocks.flatMap((b) => b.items.map((i) => i.exerciseId));
    expect(ids).toEqual(expect.arrayContaining(['push_up', 'squat', 'jumping_jack', 'plank']));
    expect(first.blocks[0]!.kind).toBe('warmup');
    expect(first.blocks.at(-1)!.kind).toBe('cooldown');
  });
});

describe('compiler', () => {
  const p: Progression = {
    volumePerWeek: 0.1,
    addSetEveryWeeks: 2,
    maxSets: 4,
    restPerWeekS: -5,
    minRestS: 30,
    deloadWeeks: [4],
    deloadFactor: 0.6,
  };
  const item: PlanItem = { exerciseId: 'squat', sets: 3, reps: 10, restS: 60 };

  it('leaves warm-up, cool-down and fixed items untouched', () => {
    expect(progressItem(item, 'warmup', 5, p)).toBe(item);
    expect(progressItem({ ...item, fixed: true }, 'main', 5, p).reps).toBe(10);
  });

  it('adds volume and sets, shortens rest, and skips deload weeks when counting', () => {
    expect(progressItem(item, 'main', 1, p)).toMatchObject({ sets: 3, reps: 10, restS: 60 });
    expect(progressItem(item, 'main', 3, p)).toMatchObject({ sets: 4, reps: 12, restS: 50 });
    expect(progressItem(item, 'main', 4, p)).toMatchObject({ sets: 3, reps: 8, restS: 60 });
    // Week 5 continues from week 4's effective week (4 → effective 4).
    expect(progressItem(item, 'main', 5, p)).toMatchObject({ sets: 4, reps: 13, restS: 45 });
  });

  it('estimates session time from work, rests and transitions', () => {
    const secs = estimateSessionSeconds(
      [{ kind: 'main', title: 'Main', items: [item] }],
      getExerciseInfo,
    );
    // 15 s transition + 3 × (10 reps × 3 s + 60 s rest)
    expect(secs).toBe(15 + 3 * (30 + 60));
  });

  it('uses the prescribed tempo for rep duration', () => {
    const secs = estimateSessionSeconds(
      [{ kind: 'main', title: 'Main', items: [{ ...item, tempo: '3-1-1' }] }],
      getExerciseInfo,
    );
    expect(secs).toBe(15 + 3 * (10 * 5 + 60));
  });

  it('swaps in harder variations from their week', () => {
    const it2: PlanItem = { ...item, progressTo: [{ fromWeek: 3, exerciseId: 'jump_squat' }] };
    expect(progressItem(it2, 'main', 2, p).exerciseId).toBe('squat');
    expect(progressItem(it2, 'main', 3, p).exerciseId).toBe('jump_squat');
  });

  it('rejects unknown session keys', () => {
    const src = {
      ...planSources[0]!,
      weekPattern: ['Z', 'rest', 'rest', 'rest', 'rest', 'rest', 'rest'],
    };
    expect(() => compilePlan(src, getExerciseInfo)).toThrow(/unknown session/);
  });
});
