import type {
  Block,
  DayType,
  ExerciseInfo,
  PlanItem,
  PlanSource,
  Progression,
  SessionTemplate,
} from './schema';

/** Seconds allowed per exercise for getting into position / reading the next move. */
export const TRANSITION_S = 15;

export interface CompiledSession {
  key: string;
  title: string;
  focus: string;
  blocks: Block[];
  /** Estimated length including rests and transitions, minutes. */
  estimatedMinutes: number;
}

export interface PlanDay {
  /** 1-based day in the plan. */
  day: number;
  week: number;
  /** 1..7 within the week. */
  weekday: number;
  type: DayType;
  deload: boolean;
  session: CompiledSession | null;
}

export interface Plan extends Omit<
  PlanSource,
  'sessions' | 'weekPattern' | 'weekPatternOverrides'
> {
  /** Workout days per week in the base pattern. */
  daysPerWeek: number;
  totalDays: number;
  schedule: PlanDay[];
}

export type ExerciseLookup = (id: string) => ExerciseInfo | undefined;

/** Working seconds of one set (both sides for per-side exercises). */
export function setWorkSeconds(item: PlanItem, info: ExerciseInfo | undefined): number {
  const base = item.seconds ?? (item.reps ?? 0) * (info?.repSeconds ?? 3);
  return info?.perSide ? base * 2 : base;
}

/** Session length estimate: work + rest after every set + a transition per exercise. */
export function estimateSessionSeconds(blocks: readonly Block[], lookup: ExerciseLookup): number {
  let total = 0;
  for (const b of blocks)
    for (const item of b.items)
      total +=
        TRANSITION_S + item.sets * (setWorkSeconds(item, lookup(item.exerciseId)) + item.restS);
  return total;
}

const round5 = (n: number) => Math.max(5, Math.round(n / 5) * 5);

/** Applies the plan's progression rules to one item for a given week. */
export function progressItem(
  item: PlanItem,
  kind: Block['kind'],
  week: number,
  p: Progression,
): PlanItem {
  if (item.fixed || kind === 'warmup' || kind === 'cooldown') return item;
  const deload = p.deloadWeeks.includes(week);
  // Deload weeks don't count towards progression; the week after resumes where it left off.
  const effective = week - p.deloadWeeks.filter((w) => w < week).length;
  let k = 1 + p.volumePerWeek * (effective - 1);
  let sets =
    p.addSetEveryWeeks > 0
      ? Math.min(
          Math.max(p.maxSets, item.sets),
          item.sets + Math.floor((effective - 1) / p.addSetEveryWeeks),
        )
      : item.sets;
  let restS =
    item.restS > p.minRestS
      ? Math.max(p.minRestS, item.restS + p.restPerWeekS * (effective - 1))
      : item.restS;
  if (deload) {
    k *= p.deloadFactor;
    sets = Math.max(1, sets - 1);
    restS = item.restS;
  }
  return {
    ...item,
    sets,
    restS,
    ...(item.reps !== undefined ? { reps: Math.max(1, Math.round(item.reps * k)) } : {}),
    ...(item.seconds !== undefined ? { seconds: round5(item.seconds * k) } : {}),
  };
}

function compileSession(
  key: string,
  t: SessionTemplate,
  week: number,
  p: Progression,
  lookup: ExerciseLookup,
): CompiledSession {
  const blocks = t.blocks.map((b) => ({
    ...b,
    items: b.items.map((i) => progressItem(i, b.kind, week, p)),
  }));
  return {
    key,
    title: t.title,
    focus: t.focus,
    blocks,
    estimatedMinutes: Math.round(estimateSessionSeconds(blocks, lookup) / 60),
  };
}

/** Expands the compact plan source into a full day-by-day schedule. */
export function compilePlan(src: PlanSource, lookup: ExerciseLookup): Plan {
  const schedule: PlanDay[] = [];
  for (let week = 1; week <= src.weeks; week++) {
    const pattern = src.weekPatternOverrides?.[String(week)] ?? src.weekPattern;
    pattern.forEach((entry, i) => {
      const day = (week - 1) * 7 + i + 1;
      const deload = src.progression.deloadWeeks.includes(week);
      if (entry === 'rest') {
        schedule.push({ day, week, weekday: i + 1, type: 'rest', deload, session: null });
        return;
      }
      const isRecovery = entry === 'active_recovery';
      const key = isRecovery ? src.activeRecoverySession : entry;
      const template = key ? src.sessions[key] : undefined;
      if (!key || !template) throw new Error(`Plan ${src.id}: unknown session "${entry}"`);
      schedule.push({
        day,
        week,
        weekday: i + 1,
        type: isRecovery ? 'active_recovery' : 'workout',
        deload,
        session: compileSession(key, template, week, src.progression, lookup),
      });
    });
  }
  const {
    sessions: _s,
    weekPattern,
    weekPatternOverrides: _o,
    activeRecoverySession: _a,
    ...meta
  } = src;
  return {
    ...meta,
    daysPerWeek: weekPattern.filter((e) => e !== 'rest' && e !== 'active_recovery').length,
    totalDays: schedule.length,
    schedule,
  };
}
