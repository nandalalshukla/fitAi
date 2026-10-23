import { dailyStats, localDateKey, type DayStats } from '@/data/repositories/workoutStats';
import type { WorkoutSession, WorkoutSet } from '@/data/models';

/** Pure history statistics for the Progress screen and Today (unit-tested). */

const DAY_MS = 86_400_000;

export const startOfDay = (d: Date) => new Date(d.getFullYear(), d.getMonth(), d.getDate());

/** Monday 00:00 of the week containing `d` (local time). */
export function startOfWeek(d: Date): Date {
  const day = startOfDay(d);
  const offset = (day.getDay() + 6) % 7;
  day.setDate(day.getDate() - offset);
  return day;
}

const addDays = (d: Date, n: number) => {
  const x = new Date(d);
  x.setDate(x.getDate() + n);
  return x;
};

export type Metric = 'sessions' | 'minutes' | 'reps' | 'quality';

export interface SeriesPoint {
  key: string;
  /** Start of the bucket (day or week). */
  date: Date;
  sessions: number;
  minutes: number;
  reps: number;
  quality: number | null;
}

function bucket(days: readonly DayStats[], from: Date, to: Date, key: string): SeriesPoint {
  const lo = localDateKey(from);
  const hi = localDateKey(to);
  const inRange = days.filter((d) => d.date >= lo && d.date < hi);
  const q = inRange.filter((d) => d.avgQuality !== null);
  const weight = q.reduce((a, d) => a + d.sessions, 0);
  return {
    key,
    date: from,
    sessions: inRange.reduce((a, d) => a + d.sessions, 0),
    minutes: inRange.reduce((a, d) => a + d.minutes, 0),
    reps: inRange.reduce((a, d) => a + d.reps, 0),
    quality:
      weight > 0
        ? Math.round(q.reduce((a, d) => a + d.avgQuality! * d.sessions, 0) / weight)
        : null,
  };
}

/** Daily buckets for the last `days` days, oldest first, ending today. */
export function dailySeries(
  sessions: readonly WorkoutSession[],
  days: number,
  now: Date,
): SeriesPoint[] {
  const stats = dailyStats(sessions);
  const today = startOfDay(now);
  return Array.from({ length: days }, (_, i) => {
    const d = addDays(today, i - days + 1);
    return bucket(stats, d, addDays(d, 1), localDateKey(d));
  });
}

/** Weekly (Mon–Sun) buckets for the last `weeks` weeks, oldest first, ending this week. */
export function weeklySeries(
  sessions: readonly WorkoutSession[],
  weeks: number,
  now: Date,
): SeriesPoint[] {
  const stats = dailyStats(sessions);
  const thisWeek = startOfWeek(now);
  return Array.from({ length: weeks }, (_, i) => {
    const d = addDays(thisWeek, (i - weeks + 1) * 7);
    return bucket(stats, d, addDays(d, 7), localDateKey(d));
  });
}

export function metricValue(p: SeriesPoint, m: Metric): number {
  return m === 'quality' ? (p.quality ?? 0) : p[m];
}

export interface Totals {
  sessions: number;
  minutes: number;
  reps: number;
  quality: number | null;
}

export function totals(points: readonly SeriesPoint[]): Totals {
  const q = points.filter((p) => p.quality !== null && p.sessions > 0);
  const w = q.reduce((a, p) => a + p.sessions, 0);
  return {
    sessions: points.reduce((a, p) => a + p.sessions, 0),
    minutes: points.reduce((a, p) => a + p.minutes, 0),
    reps: points.reduce((a, p) => a + p.reps, 0),
    quality: w > 0 ? Math.round(q.reduce((a, p) => a + p.quality! * p.sessions, 0) / w) : null,
  };
}

export interface HeatCell {
  key: string;
  date: Date;
  minutes: number;
  /** 0 = none, 1..4 intensity. */
  level: 0 | 1 | 2 | 3 | 4;
  future: boolean;
}

/** Calendar heatmap: `weeks` columns of Mon..Sun cells, ending with the current week. */
export function heatmap(
  sessions: readonly WorkoutSession[],
  weeks: number,
  now: Date,
): HeatCell[][] {
  const byDay = new Map(dailyStats(sessions).map((d) => [d.date, d]));
  const start = addDays(startOfWeek(now), -(weeks - 1) * 7);
  const today = startOfDay(now).getTime();
  return Array.from({ length: weeks }, (_, w) =>
    Array.from({ length: 7 }, (_, d) => {
      const date = addDays(start, w * 7 + d);
      const key = localDateKey(date);
      const minutes = byDay.get(key)?.minutes ?? 0;
      const sessionsN = byDay.get(key)?.sessions ?? 0;
      const level: HeatCell['level'] =
        sessionsN === 0 ? 0 : minutes < 15 ? 1 : minutes < 30 ? 2 : minutes < 50 ? 3 : 4;
      return { key, date, minutes, level, future: date.getTime() > today };
    }),
  );
}

/** Completed sessions in the current Mon–Sun week. */
export function sessionsThisWeek(sessions: readonly WorkoutSession[], now: Date): number {
  const from = startOfWeek(now).getTime();
  const to = from + 7 * DAY_MS;
  return sessions.filter((s) => {
    const t = new Date(s.startedAt).getTime();
    return s.status === 'completed' && !s.deletedAt && t >= from && t < to;
  }).length;
}

export interface TrendPoint {
  date: string;
  /** Best reps in a set that day, or best hold seconds for timed exercises. */
  value: number;
  quality: number | null;
}

/** Per-exercise progress: best set per day, oldest first. */
export function exerciseTrend(
  exerciseId: string,
  sets: readonly WorkoutSet[],
  sessions: readonly WorkoutSession[],
): TrendPoint[] {
  const sessionDay = new Map(
    sessions
      .filter((s) => s.status === 'completed')
      .map((s) => [s.id, localDateKey(new Date(s.startedAt))]),
  );
  const byDay = new Map<string, TrendPoint>();
  for (const s of sets) {
    if (s.exerciseId !== exerciseId || s.deletedAt || s.formFlags.includes('skipped')) continue;
    const day = sessionDay.get(s.sessionId);
    if (!day) continue;
    const value = Math.max(s.reps, s.heldSeconds ?? 0);
    const cur = byDay.get(day);
    if (!cur || value > cur.value) byDay.set(day, { date: day, value, quality: s.avgQuality });
  }
  return [...byDay.values()].sort((a, b) => a.date.localeCompare(b.date));
}

/** Exercises with history, most-trained first. */
export function trainedExercises(sets: readonly WorkoutSet[]): string[] {
  const n = new Map<string, number>();
  for (const s of sets)
    if (!s.deletedAt && !s.formFlags.includes('skipped'))
      n.set(s.exerciseId, (n.get(s.exerciseId) ?? 0) + 1);
  return [...n.entries()].sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0])).map(([id]) => id);
}
