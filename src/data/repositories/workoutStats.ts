import type { WorkoutSession, WorkoutSet } from '../models';

/** Pure statistics over workout history (unit-tested; no DB). */

/** Local calendar day key (YYYY-MM-DD) in the device time zone. */
export function localDateKey(d: Date): string {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
}

export interface DayStats {
  date: string;
  sessions: number;
  reps: number;
  minutes: number;
  avgQuality: number | null;
}

export function dailyStats(sessions: readonly WorkoutSession[]): DayStats[] {
  const byDay = new Map<
    string,
    { sessions: number; reps: number; seconds: number; qSum: number; qN: number }
  >();
  for (const s of sessions) {
    if (s.status !== 'completed' || s.deletedAt) continue;
    const key = localDateKey(new Date(s.startedAt));
    const d = byDay.get(key) ?? { sessions: 0, reps: 0, seconds: 0, qSum: 0, qN: 0 };
    d.sessions++;
    d.reps += s.totalReps;
    d.seconds += s.durationS ?? 0;
    if (s.avgQuality !== null) {
      d.qSum += s.avgQuality;
      d.qN++;
    }
    byDay.set(key, d);
  }
  return [...byDay.entries()]
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([date, d]) => ({
      date,
      sessions: d.sessions,
      reps: d.reps,
      minutes: Math.round(d.seconds / 60),
      avgQuality: d.qN > 0 ? Math.round(d.qSum / d.qN) : null,
    }));
}

/**
 * Current streak: consecutive local days with ≥ 1 completed session, ending today
 * (or yesterday — the streak isn't lost until a full day is missed).
 */
export function currentStreak(sessions: readonly WorkoutSession[], today: Date): number {
  const days = new Set(dailyStats(sessions).map((d) => d.date));
  const cursor = new Date(today.getFullYear(), today.getMonth(), today.getDate());
  if (!days.has(localDateKey(cursor))) cursor.setDate(cursor.getDate() - 1);
  let streak = 0;
  while (days.has(localDateKey(cursor))) {
    streak++;
    cursor.setDate(cursor.getDate() - 1);
  }
  return streak;
}

export interface PersonalBest {
  exerciseId: string;
  maxReps: number;
  maxHoldSeconds: number;
  bestQuality: number | null;
}

export function personalBests(sets: readonly WorkoutSet[]): PersonalBest[] {
  const map = new Map<string, PersonalBest>();
  for (const s of sets) {
    if (s.deletedAt) continue;
    const pb = map.get(s.exerciseId) ?? {
      exerciseId: s.exerciseId,
      maxReps: 0,
      maxHoldSeconds: 0,
      bestQuality: null,
    };
    pb.maxReps = Math.max(pb.maxReps, s.reps);
    pb.maxHoldSeconds = Math.max(pb.maxHoldSeconds, s.heldSeconds ?? 0);
    if (s.avgQuality !== null) pb.bestQuality = Math.max(pb.bestQuality ?? 0, s.avgQuality);
    map.set(s.exerciseId, pb);
  }
  return [...map.values()].sort((a, b) => a.exerciseId.localeCompare(b.exerciseId));
}

/**
 * Calorie ESTIMATE (labelled as such in the UI): MET × body mass × hours.
 * Bodyweight circuits ≈ 5 MET (ACSM compendium range 3.8–8); default mass 70 kg.
 */
export function estimateCalories(durationS: number, weightKg = 70, met = 5): number {
  return Math.round(met * weightKg * (Math.max(0, durationS) / 3600));
}
