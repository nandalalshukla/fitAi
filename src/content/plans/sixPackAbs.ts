import type { PlanSource } from '../schema';
import { activeRecovery, standardCooldown, standardWarmup } from './common';

/**
 * 6-Pack Abs Builder (provisional seed; refined after the content research pass).
 * ~60 min daily home sessions: full-body strength + a dedicated core circuit.
 */
export const sixPackAbs: PlanSource = {
  id: 'six_pack_abs',
  title: '6-Pack Abs Builder',
  goal: 'core',
  level: 'intermediate',
  weeks: 8,
  equipment: ['none', 'mat'],
  minutesPerSession: 60,
  summary:
    'An hour a day of full-body bodyweight strength plus a focused core circuit, building week by week.',
  whatToExpect: [
    'A stronger, more stable core and better endurance for push-ups, squats and planks.',
    'Visible abs depend mostly on body-fat level, which is driven by nutrition and sleep. This plan builds the muscle; your diet decides whether it shows.',
    'Week 4 is a lighter deload week so your body can recover and keep progressing.',
  ],
  safetyNotes: [
    'Check with a doctor before starting if you have heart, blood-pressure, back or joint problems, are pregnant or recently gave birth.',
    'Stop any exercise that causes sharp pain, dizziness or chest discomfort.',
  ],
  sessions: {
    A: {
      title: 'Push, squat & core',
      focus: 'Chest, legs and the front of the core',
      blocks: [
        standardWarmup([{ exerciseId: 'jumping_jack', sets: 1, reps: 30, restS: 30, fixed: true }]),
        {
          kind: 'main',
          title: 'Strength',
          items: [
            { exerciseId: 'push_up', sets: 3, reps: 15, restS: 60 },
            { exerciseId: 'squat', sets: 2, reps: 20, restS: 60 },
            { exerciseId: 'jumping_jack', sets: 2, reps: 30, restS: 30 },
            { exerciseId: 'lunge', sets: 3, reps: 10, restS: 60 },
            { exerciseId: 'glute_bridge', sets: 3, reps: 15, restS: 45 },
          ],
        },
        {
          kind: 'main',
          title: 'Core circuit',
          items: [
            { exerciseId: 'crunch', sets: 3, reps: 20, restS: 30 },
            { exerciseId: 'plank', sets: 3, seconds: 45, restS: 45 },
            { exerciseId: 'leg_raise', sets: 3, reps: 12, restS: 45 },
            { exerciseId: 'bicycle_crunch', sets: 3, reps: 12, restS: 30 },
            { exerciseId: 'side_plank', sets: 2, seconds: 30, restS: 30 },
          ],
        },
        {
          kind: 'finisher',
          title: 'Finisher',
          items: [
            { exerciseId: 'mountain_climber', sets: 3, seconds: 30, restS: 30 },
            { exerciseId: 'high_knees', sets: 3, seconds: 30, restS: 30 },
          ],
        },
        standardCooldown([{ exerciseId: 'cat_cow', sets: 1, seconds: 60, restS: 0, fixed: true }]),
      ],
    },
    B: {
      title: 'Legs, cardio & core',
      focus: 'Legs, glutes, conditioning and the deep core',
      blocks: [
        standardWarmup([{ exerciseId: 'jumping_jack', sets: 1, reps: 30, restS: 30, fixed: true }]),
        {
          kind: 'main',
          title: 'Strength',
          items: [
            { exerciseId: 'squat', sets: 3, reps: 20, restS: 60 },
            { exerciseId: 'lunge', sets: 3, reps: 12, restS: 60 },
            { exerciseId: 'glute_bridge', sets: 3, reps: 20, restS: 45 },
            { exerciseId: 'push_up', sets: 2, reps: 12, restS: 60 },
            { exerciseId: 'high_knees', sets: 3, seconds: 30, restS: 30 },
          ],
        },
        {
          kind: 'main',
          title: 'Core circuit',
          items: [
            { exerciseId: 'sit_up', sets: 3, reps: 15, restS: 45 },
            { exerciseId: 'dead_bug', sets: 3, reps: 10, restS: 30 },
            { exerciseId: 'side_plank', sets: 3, seconds: 30, restS: 30 },
            { exerciseId: 'leg_raise', sets: 3, reps: 12, restS: 45 },
            { exerciseId: 'plank', sets: 2, seconds: 60, restS: 45 },
          ],
        },
        {
          kind: 'finisher',
          title: 'Finisher',
          items: [{ exerciseId: 'mountain_climber', sets: 4, seconds: 30, restS: 30 }],
        },
        standardCooldown([{ exerciseId: 'cat_cow', sets: 1, seconds: 60, restS: 0, fixed: true }]),
      ],
    },
    R: activeRecovery,
  },
  weekPattern: ['A', 'B', 'A', 'B', 'A', 'active_recovery', 'rest'],
  weekPatternOverrides: {
    '2': ['B', 'A', 'B', 'A', 'B', 'active_recovery', 'rest'],
    '4': ['B', 'A', 'B', 'A', 'B', 'active_recovery', 'rest'],
    '6': ['B', 'A', 'B', 'A', 'B', 'active_recovery', 'rest'],
    '8': ['B', 'A', 'B', 'A', 'B', 'active_recovery', 'rest'],
  },
  activeRecoverySession: 'R',
  progression: {
    volumePerWeek: 0.05,
    addSetEveryWeeks: 0,
    maxSets: 4,
    restPerWeekS: -5,
    minRestS: 30,
    deloadWeeks: [4],
    deloadFactor: 0.6,
  },
};
