import { z } from 'zod';

/**
 * Content schemas (plans + exercise catalog). Content is authored as typed TS data
 * and validated with these schemas at test time and on first access at runtime.
 * Plans are authored compactly (session templates + weekly pattern + progression
 * rules) and compiled into a full day-by-day schedule by `compilePlan`.
 */

export const TRACKED_EXERCISES = [
  'squat',
  'push_up',
  'jumping_jack',
  'plank',
  'sit_up',
  'crunch',
  'lunge',
  'high_knees',
  'mountain_climber',
  'glute_bridge',
  'leg_raise',
] as const;

export const LEVELS = ['beginner', 'intermediate', 'advanced'] as const;
export const GOALS = [
  'core',
  'fat_loss',
  'strength',
  'muscle',
  'mobility',
  'general',
  'low_impact',
] as const;
export const EQUIPMENT = ['none', 'mat', 'chair', 'wall', 'dumbbells', 'band'] as const;
export const CATEGORIES = [
  'lower_body',
  'upper_body',
  'core',
  'cardio',
  'full_body',
  'mobility',
] as const;
export const MUSCLES = [
  'quads',
  'glutes',
  'hamstrings',
  'calves',
  'chest',
  'triceps',
  'biceps',
  'shoulders',
  'upper_back',
  'lats',
  'abs',
  'obliques',
  'hip_flexors',
  'lower_back',
  'adductors',
  'full_body',
] as const;

const slug = z.string().regex(/^[a-z][a-z0-9_]*$/, 'snake_case id');
const sentence = z.string().trim().min(3);

export const VariationSchema = z.object({
  name: sentence,
  /** Catalog id when the variation is itself in the library. */
  exerciseId: slug.optional(),
});

export const ExerciseInfoSchema = z
  .object({
    id: slug,
    name: sentence,
    category: z.enum(CATEGORIES),
    difficulty: z.enum(LEVELS),
    primaryMuscles: z.array(z.enum(MUSCLES)).min(1),
    secondaryMuscles: z.array(z.enum(MUSCLES)),
    equipment: z.array(z.enum(EQUIPMENT)).min(1),
    /** Camera-tracked engine exercise, or null = manual / not camera-tracked. */
    tracked: z.enum(TRACKED_EXERCISES).nullable(),
    mode: z.enum(['reps', 'time']),
    /** Typical seconds per rep at a controlled tempo (session duration estimates). */
    repSeconds: z.number().min(0.5).max(10),
    /** Performed on each side (reps/seconds are per side). */
    perSide: z.boolean(),
    summary: sentence,
    /** Numbered how-to steps: setup, movement, end position, tempo/breathing, gaze/brace. */
    steps: z.array(sentence).min(3).max(8),
    /** Voice-cue i18n keys (`cues.*`) so on-screen tips and spoken cues use the same words. */
    formCues: z.array(z.string().regex(/^cues\.[a-zA-Z]+$/)),
    tips: z.array(sentence),
    mistakes: z.array(z.object({ mistake: sentence, fix: sentence })).min(1),
    easier: z.array(VariationSchema),
    harder: z.array(VariationSchema),
    safety: z.array(sentence),
    camera: sentence,
  })
  .strict();

export const PlanItemSchema = z
  .object({
    exerciseId: slug,
    sets: z.number().int().min(1).max(8),
    reps: z.number().int().min(1).max(100).optional(),
    seconds: z.number().int().min(5).max(600).optional(),
    /** Rest after each set, seconds. */
    restS: z.number().int().min(0).max(300),
    /** e.g. "3-1-1" (down-pause-up seconds). */
    tempo: z
      .string()
      .regex(/^\d-\d-\d$/)
      .optional(),
    /** Excluded from weekly progression (warm-up, mobility, technique work). */
    fixed: z.boolean().optional(),
  })
  .strict()
  .refine((i) => (i.reps === undefined) !== (i.seconds === undefined), {
    message: 'exactly one of reps / seconds',
  });

export const BLOCK_KINDS = ['warmup', 'main', 'finisher', 'cooldown'] as const;

export const BlockSchema = z
  .object({
    kind: z.enum(BLOCK_KINDS),
    title: sentence,
    items: z.array(PlanItemSchema).min(1),
  })
  .strict();

export const SessionTemplateSchema = z
  .object({ title: sentence, focus: sentence, blocks: z.array(BlockSchema).min(2) })
  .strict()
  .refine((s) => s.blocks[0]?.kind === 'warmup', { message: 'sessions start with a warm-up' })
  .refine((s) => s.blocks.at(-1)?.kind === 'cooldown', { message: 'sessions end with a cool-down' })
  .refine((s) => s.blocks.some((b) => b.kind === 'main'), { message: 'needs a main block' });

export const ProgressionSchema = z
  .object({
    /** Fractional rep/seconds increase per week (0.1 = +10 % per week, compounding linearly). */
    volumePerWeek: z.number().min(0).max(0.25),
    /** Add one set to main exercises every N weeks (0 = never). */
    addSetEveryWeeks: z.number().int().min(0),
    maxSets: z.number().int().min(1).max(8),
    /** Change of rest per week, seconds (negative = shorter rest). */
    restPerWeekS: z.number().int().min(-15).max(0),
    minRestS: z.number().int().min(0),
    /** Weeks (1-based) with reduced volume. */
    deloadWeeks: z.array(z.number().int().min(1)),
    /** Volume multiplier on deload weeks. */
    deloadFactor: z.number().min(0.4).max(0.9),
  })
  .strict();

export const DAY_TYPES = ['workout', 'rest', 'active_recovery'] as const;

export const PlanSourceSchema = z
  .object({
    id: slug,
    title: sentence,
    goal: z.enum(GOALS),
    level: z.enum(LEVELS),
    weeks: z.number().int().min(1).max(16),
    equipment: z.array(z.enum(EQUIPMENT)).min(1),
    /** Advertised session length, minutes (asserted against the computed estimate). */
    minutesPerSession: z.number().int().min(5).max(90),
    summary: sentence,
    /** Honest expectations (no exaggerated claims). */
    whatToExpect: z.array(sentence).min(1),
    safetyNotes: z.array(sentence).min(1),
    /** Session templates by key. */
    sessions: z.record(z.string(), SessionTemplateSchema),
    /** 7 entries (Mon..Sun-agnostic day 1..7): a session key, 'rest' or 'active_recovery'. */
    weekPattern: z.array(z.string()).length(7),
    /** Optional per-week pattern overrides (1-based week → pattern). */
    weekPatternOverrides: z.record(z.string(), z.array(z.string()).length(7)).optional(),
    /** Session key used on active-recovery days (light mobility). */
    activeRecoverySession: z.string().optional(),
    progression: ProgressionSchema,
  })
  .strict();

export type ExerciseInfo = z.infer<typeof ExerciseInfoSchema>;
export type PlanItem = z.infer<typeof PlanItemSchema>;
export type BlockKind = (typeof BLOCK_KINDS)[number];
export type Block = z.infer<typeof BlockSchema>;
export type SessionTemplate = z.infer<typeof SessionTemplateSchema>;
export type Progression = z.infer<typeof ProgressionSchema>;
export type PlanSource = z.infer<typeof PlanSourceSchema>;
export type Level = (typeof LEVELS)[number];
export type Goal = (typeof GOALS)[number];
export type Equipment = (typeof EQUIPMENT)[number];
export type ExerciseCategory = (typeof CATEGORIES)[number];
export type MuscleGroup = (typeof MUSCLES)[number];
export type DayType = (typeof DAY_TYPES)[number];
