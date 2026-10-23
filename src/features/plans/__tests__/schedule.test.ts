import { getPlan, plans } from '@/content';

import {
  dayOf,
  nextDay,
  planProgress,
  recommendPlans,
  scorePlan,
  upcoming,
  weekOverview,
} from '../domain/schedule';

const plan = getPlan('beginner_foundations')!;

describe('plan schedule', () => {
  it('resolves days, clamping out-of-range values', () => {
    expect(dayOf(plan, 1).day).toBe(1);
    expect(dayOf(plan, 0).day).toBe(1);
    expect(dayOf(plan, 999).day).toBe(plan.totalDays);
    expect(dayOf(plan, 2).type).toBe('rest');
  });

  it('tracks progress and completion', () => {
    expect(planProgress(plan, 1)).toBe(0);
    expect(planProgress(plan, 15)).toBeCloseTo(0.5);
    expect(planProgress(plan, 3, true)).toBe(1);
    expect(nextDay(plan, 1)).toBe(2);
    expect(nextDay(plan, plan.totalDays)).toBeNull();
  });

  it('builds the current week strip', () => {
    const w = weekOverview(plan, 10);
    expect(w.week).toBe(2);
    expect(w.days).toHaveLength(7);
    expect(w.days.map((d) => d.status)).toEqual([
      'done',
      'done',
      'today',
      'upcoming',
      'upcoming',
      'upcoming',
      'upcoming',
    ]);
  });

  it('lists upcoming days', () => {
    expect(upcoming(plan, 1, 3).map((d) => d.day)).toEqual([2, 3, 4]);
  });
});

describe('plan recommendation', () => {
  it('matches goal and level, and never recommends above the level', () => {
    const [first] = recommendPlans(plans, {
      goal: 'core',
      level: 'intermediate',
      equipment: [],
      daysPerWeek: 5,
    });
    expect(first!.id).toBe('six_pack_abs');
    const beginner = recommendPlans(plans, {
      goal: 'core',
      level: 'beginner',
      equipment: [],
      daysPerWeek: 3,
    });
    expect(beginner[0]!.level).toBe('beginner');
  });

  it('penalises plans needing equipment the user lacks', () => {
    const p = { ...plan, equipment: ['dumbbells' as const] };
    const prefs = { goal: null, level: null, equipment: [], daysPerWeek: null };
    expect(scorePlan(p, prefs)).toBeLessThan(scorePlan(plan, prefs));
    expect(scorePlan(p, { ...prefs, equipment: ['dumbbells'] })).toBe(scorePlan(plan, prefs));
  });
});
