import type { PlanSource } from '../schema';
import { activeRecovery, standardCooldown, standardWarmup } from './common';

/**
 * Lower Body & Glutes: 3 days a week of squat, lunge and bridge patterns with single-leg
 * progressions. Beginner-friendly; week 4 deloads, weeks 5–6 add harder variations.
 */
export const lowerBodyGlutes: PlanSource = {
  id: 'lower_body_glutes',
  title: 'Lower Body & Glutes',
  goal: 'strength',
  level: 'beginner',
  weeks: 6,
  equipment: ['none', 'mat', 'chair'],
  minutesPerSession: 35,
  summary: 'Stronger legs and glutes with squats, lunges, bridges and hip-stability work.',
  whatToExpect: [
    'Easier stairs and standing up, and better balance on one leg.',
    'Glute shape changes depend on muscle growth and body fat; strength improves first.',
    'Bridges progress to single-leg bridges and squats to slower tempos.',
  ],
  safetyNotes: [
    'Keep knee bends pain-free; reduce depth if a knee complains.',
    'Hold a wall or chair for balance on single-leg moves.',
  ],
  sessions: {
    A: {
      title: 'Squat & bridge',
      focus: 'Quads, glutes and hip stability',
      blocks: [
        standardWarmup([{ exerciseId: 'good_morning', sets: 1, reps: 10, restS: 0, fixed: true }]),
        {
          kind: 'main',
          title: 'Strength',
          items: [
            { exerciseId: 'squat', sets: 3, reps: 15, restS: 75 },
            {
              exerciseId: 'glute_bridge',
              sets: 3,
              reps: 15,
              restS: 60,
              progressTo: [{ fromWeek: 5, exerciseId: 'single_leg_glute_bridge' }],
            },
            { exerciseId: 'reverse_lunge', sets: 3, reps: 10, restS: 60 },
            { exerciseId: 'clamshell', sets: 2, reps: 15, restS: 30 },
          ],
        },
        standardCooldown([
          { exerciseId: 'figure_four_stretch', sets: 1, seconds: 30, restS: 0, fixed: true },
        ]),
      ],
    },
    B: {
      title: 'Single leg & hinge',
      focus: 'Glutes, hamstrings and balance',
      blocks: [
        standardWarmup([{ exerciseId: 'good_morning', sets: 1, reps: 10, restS: 0, fixed: true }]),
        {
          kind: 'main',
          title: 'Strength',
          items: [
            { exerciseId: 'sumo_squat', sets: 3, reps: 15, restS: 60 },
            { exerciseId: 'step_up', sets: 3, reps: 10, restS: 60 },
            { exerciseId: 'good_morning', sets: 3, reps: 12, restS: 45 },
            { exerciseId: 'standing_hip_abduction', sets: 2, reps: 12, restS: 30 },
            { exerciseId: 'calf_raise', sets: 2, reps: 15, restS: 30 },
          ],
        },
        standardCooldown([
          { exerciseId: 'figure_four_stretch', sets: 1, seconds: 30, restS: 0, fixed: true },
        ]),
      ],
    },
    R: activeRecovery,
  },
  weekPattern: ['A', 'rest', 'B', 'rest', 'A', 'active_recovery', 'rest'],
  weekPatternOverrides: {
    '2': ['B', 'rest', 'A', 'rest', 'B', 'active_recovery', 'rest'],
    '4': ['B', 'rest', 'A', 'rest', 'B', 'active_recovery', 'rest'],
    '6': ['B', 'rest', 'A', 'rest', 'B', 'active_recovery', 'rest'],
  },
  activeRecoverySession: 'R',
  progression: {
    volumePerWeek: 0.07,
    addSetEveryWeeks: 0,
    maxSets: 4,
    restPerWeekS: 0,
    minRestS: 30,
    deloadWeeks: [4],
    deloadFactor: 0.65,
  },
};
