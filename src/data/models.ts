/** App-facing models (camelCase). Stored as snake_case rows; see schema/tables.ts. */
export type FitnessLevel = 'beginner' | 'intermediate' | 'advanced';

export interface Profile {
  id: string;
  userId: string;
  displayName: string | null;
  goal: string | null;
  fitnessLevel: FitnessLevel | null;
  equipment: string[];
  daysPerWeek: number | null;
  units: 'metric' | 'imperial';
  onboardingCompletedAt: string | null;
  createdAt: string;
  updatedAt: string;
  deletedAt: string | null;
}

export interface PlanEnrollment {
  id: string;
  userId: string;
  planId: string;
  status: 'active' | 'completed' | 'abandoned';
  startedAt: string;
  currentDay: number;
  completedAt: string | null;
  createdAt: string;
  updatedAt: string;
  deletedAt: string | null;
}

export type SessionMode = 'guided' | 'free' | 'manual';
export type SessionStatus = 'in_progress' | 'completed' | 'abandoned';

export interface WorkoutSession {
  id: string;
  userId: string;
  planId: string | null;
  planDay: number | null;
  mode: SessionMode;
  status: SessionStatus;
  startedAt: string;
  endedAt: string | null;
  durationS: number | null;
  totalReps: number;
  avgQuality: number | null;
  caloriesEst: number | null;
  notes: string | null;
  createdAt: string;
  updatedAt: string;
  deletedAt: string | null;
}

export interface WorkoutSet {
  id: string;
  userId: string;
  sessionId: string;
  exerciseId: string;
  setIndex: number;
  targetReps: number | null;
  reps: number;
  targetSeconds: number | null;
  heldSeconds: number | null;
  avgQuality: number | null;
  formFlags: string[];
  manualAdjustment: number;
  cameraTracked: boolean;
  startedAt: string | null;
  endedAt: string | null;
  createdAt: string;
  updatedAt: string;
  deletedAt: string | null;
}

const toCamel = (s: string) => s.replace(/_([a-z])/g, (_m, c: string) => c.toUpperCase());
const toSnake = (s: string) => s.replace(/[A-Z]/g, (c) => `_${c.toLowerCase()}`);

export function camelize<T>(row: Record<string, unknown>): T {
  const out: Record<string, unknown> = {};
  for (const [k, v] of Object.entries(row)) if (k !== 'synced_at') out[toCamel(k)] = v;
  return out as T;
}

export function snakeize(model: object): Record<string, unknown> {
  const out: Record<string, unknown> = {};
  for (const [k, v] of Object.entries(model)) out[toSnake(k)] = v;
  return out;
}
