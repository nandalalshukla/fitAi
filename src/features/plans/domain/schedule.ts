import type { Equipment, Goal, Level, Plan, PlanDay } from '@/content';

/**
 * Plan progress is completion-based: the enrollment's `currentDay` only moves
 * forward when the day's session is finished (or a rest day is marked done), so
 * a missed day never silently skips training. See ADR-027.
 */

export const clampDay = (plan: Plan, day: number) => Math.min(Math.max(1, day), plan.totalDays);

export function dayOf(plan: Plan, day: number): PlanDay {
  return plan.schedule[clampDay(plan, day) - 1]!;
}

/** Fraction of the plan completed, 0..1. */
export function planProgress(plan: Plan, currentDay: number, completed = false): number {
  if (completed) return 1;
  return Math.min(1, Math.max(0, (clampDay(plan, currentDay) - 1) / plan.totalDays));
}

/** Day after finishing `day`, or null when the plan is complete. */
export function nextDay(plan: Plan, day: number): number | null {
  return day >= plan.totalDays ? null : day + 1;
}

export type DayStatus = 'done' | 'today' | 'upcoming';

/** The current plan week with each day's status (for the Today week strip). */
export function weekOverview(
  plan: Plan,
  currentDay: number,
): { week: number; days: (PlanDay & { status: DayStatus })[] } {
  const today = dayOf(plan, currentDay);
  return {
    week: today.week,
    days: plan.schedule
      .filter((d) => d.week === today.week)
      .map((d) => ({
        ...d,
        status: d.day < today.day ? 'done' : d.day === today.day ? 'today' : 'upcoming',
      })),
  };
}

/** Upcoming sessions after the current day (plan detail / Today preview). */
export function upcoming(plan: Plan, currentDay: number, count: number): PlanDay[] {
  return plan.schedule.slice(clampDay(plan, currentDay), clampDay(plan, currentDay) + count);
}

export interface PlanPreferences {
  goal: Goal | null;
  level: Level | null;
  equipment: readonly Equipment[];
  daysPerWeek: number | null;
}

const LEVEL_INDEX: Record<Level, number> = { beginner: 0, intermediate: 1, advanced: 2 };

/** Scores how well a plan fits the onboarding answers (higher = better). */
export function scorePlan(plan: Plan, prefs: PlanPreferences): number {
  let score = 0;
  if (prefs.goal && plan.goal === prefs.goal) score += 10;
  if (prefs.level) {
    const gap = LEVEL_INDEX[plan.level] - LEVEL_INDEX[prefs.level];
    // Never push someone above their level; one level easier is fine.
    score += gap === 0 ? 6 : gap < 0 ? 6 + gap * 3 : -20 * gap;
  }
  const owned = new Set<Equipment>(['none', 'mat', ...prefs.equipment]);
  if (plan.equipment.some((e) => !owned.has(e))) score -= 50;
  if (prefs.daysPerWeek) score -= Math.abs(plan.daysPerWeek - prefs.daysPerWeek) * 2;
  return score;
}

export function recommendPlans(plans: readonly Plan[], prefs: PlanPreferences): Plan[] {
  return [...plans]
    .map((p, i) => ({ p, s: scorePlan(p, prefs), i }))
    .sort((a, b) => b.s - a.s || a.i - b.i)
    .map((x) => x.p);
}
