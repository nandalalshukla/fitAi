import type { PlanSource } from '../schema';
import { activeRecovery, standardCooldown, standardWarmup } from './common';

/**
 * Bodyweight Muscle Builder: upper/lower split, 4 days a week, each muscle trained twice
 * weekly with ≥10 hard sets (Schoenfeld dose–response; ACSM 2026 ≥10 sets/muscle/week).
 * Rests of 60–90 s (Grgic/Singer: little benefit beyond ~90 s for growth). Week 4 deloads.
 */
export const muscleBuilder: PlanSource = {
  id: 'muscle_builder',
  title: 'Bodyweight Muscle Builder',
  goal: 'muscle',
  level: 'intermediate',
  weeks: 8,
  equipment: ['none', 'mat', 'chair'],
  minutesPerSession: 45,
  summary:
    'An upper/lower split that trains every major muscle twice a week with enough sets to grow.',
  whatToExpect: [
    'Noticeable gains in strength and muscle endurance within 4–6 weeks; visible size changes take longer and need enough protein and calories.',
    'Sets are meant to finish 1–3 reps short of failure: hard, but with clean form.',
    'Bodyweight “pulling” work at home is limited; this plan uses back extensions and Y raises. A pull-up bar or band would add more back work.',
    'Week 4 is a lighter deload week.',
  ],
  safetyNotes: [
    'Check with a doctor first if you have heart, blood-pressure, shoulder or back problems.',
    'Use a chair that cannot slide for dips and step-ups.',
  ],
  sessions: {
    U1: {
      title: 'Upper A: push focus',
      focus: 'Chest, shoulders, triceps and upper back',
      blocks: [
        standardWarmup([{ exerciseId: 'jumping_jack', sets: 1, reps: 30, restS: 0, fixed: true }]),
        {
          kind: 'main',
          title: 'Strength',
          items: [
            {
              exerciseId: 'push_up',
              sets: 4,
              reps: 12,
              restS: 90,
              progressTo: [{ fromWeek: 5, exerciseId: 'decline_push_up' }],
            },
            { exerciseId: 'pike_push_up', sets: 3, reps: 8, restS: 90 },
            { exerciseId: 'incline_push_up', sets: 3, reps: 15, restS: 60, tempo: '3-1-1' },
            { exerciseId: 'chair_dip', sets: 3, reps: 10, restS: 75 },
            { exerciseId: 'prone_y_raise', sets: 3, reps: 12, restS: 45 },
            { exerciseId: 'superman', sets: 3, reps: 12, restS: 45 },
          ],
        },
        {
          kind: 'finisher',
          title: 'Core',
          items: [{ exerciseId: 'plank_shoulder_tap', sets: 2, reps: 10, restS: 45 }],
        },
        standardCooldown(),
      ],
    },
    L1: {
      title: 'Lower A: squat focus',
      focus: 'Quads, glutes and calves',
      blocks: [
        standardWarmup([{ exerciseId: 'good_morning', sets: 1, reps: 10, restS: 0, fixed: true }]),
        {
          kind: 'main',
          title: 'Strength',
          items: [
            { exerciseId: 'squat', sets: 4, reps: 20, restS: 75, tempo: '3-1-1' },
            { exerciseId: 'split_squat', sets: 3, reps: 10, restS: 75 },
            { exerciseId: 'single_leg_glute_bridge', sets: 3, reps: 12, restS: 60 },
            { exerciseId: 'calf_raise', sets: 3, reps: 20, restS: 45 },
          ],
        },
        {
          kind: 'finisher',
          title: 'Core',
          items: [{ exerciseId: 'side_plank', sets: 2, seconds: 30, restS: 30 }],
        },
        standardCooldown(),
      ],
    },
    U2: {
      title: 'Upper B: shoulders & arms',
      focus: 'Shoulders, triceps, chest and upper back',
      blocks: [
        standardWarmup([{ exerciseId: 'jumping_jack', sets: 1, reps: 30, restS: 0, fixed: true }]),
        {
          kind: 'main',
          title: 'Strength',
          items: [
            { exerciseId: 'pike_push_up', sets: 4, reps: 8, restS: 90 },
            { exerciseId: 'push_up', sets: 4, reps: 10, restS: 90, tempo: '3-1-1' },
            { exerciseId: 'chair_dip', sets: 3, reps: 12, restS: 75 },
            { exerciseId: 'prone_y_raise', sets: 3, reps: 12, restS: 45 },
            { exerciseId: 'superman', sets: 3, reps: 12, restS: 45 },
          ],
        },
        {
          kind: 'finisher',
          title: 'Core',
          items: [{ exerciseId: 'hollow_hold', sets: 2, seconds: 20, restS: 45 }],
        },
        standardCooldown(),
      ],
    },
    L2: {
      title: 'Lower B: hinge & glutes',
      focus: 'Glutes, hamstrings and single-leg strength',
      blocks: [
        standardWarmup([{ exerciseId: 'good_morning', sets: 1, reps: 10, restS: 0, fixed: true }]),
        {
          kind: 'main',
          title: 'Strength',
          items: [
            { exerciseId: 'reverse_lunge', sets: 4, reps: 12, restS: 75 },
            { exerciseId: 'step_up', sets: 3, reps: 12, restS: 60 },
            { exerciseId: 'glute_bridge', sets: 4, reps: 20, restS: 60 },
            { exerciseId: 'good_morning', sets: 3, reps: 15, restS: 45 },
          ],
        },
        {
          kind: 'finisher',
          title: 'Core',
          items: [{ exerciseId: 'wall_sit', sets: 2, seconds: 45, restS: 45 }],
        },
        standardCooldown(),
      ],
    },
    R: activeRecovery,
  },
  weekPattern: ['U1', 'L1', 'rest', 'U2', 'L2', 'active_recovery', 'rest'],
  activeRecoverySession: 'R',
  progression: {
    volumePerWeek: 0.05,
    addSetEveryWeeks: 0,
    maxSets: 5,
    restPerWeekS: 0,
    minRestS: 45,
    deloadWeeks: [4],
    deloadFactor: 0.6,
  },
};
