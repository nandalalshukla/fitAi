import type { PlanSource } from '../schema';
import { activeRecovery, standardCooldown, standardWarmup } from './common';

/**
 * Advanced Calisthenics Conditioning: 5 days, push/legs/conditioning rotation with
 * advanced variations (decline and pike push-ups, jump squats, burpees, hollow holds).
 * Deloads in weeks 4 and 8 (Bell et al. 2023: periodic reduced-stress weeks).
 */
export const advancedCalisthenics: PlanSource = {
  id: 'advanced_calisthenics',
  title: 'Advanced Calisthenics',
  goal: 'strength',
  level: 'advanced',
  weeks: 8,
  equipment: ['none', 'mat', 'chair'],
  minutesPerSession: 50,
  summary: 'Demanding bodyweight strength and power for people who already train regularly.',
  whatToExpect: [
    'Harder pressing variations, explosive leg work and high-level core holds.',
    'Five demanding days a week: sleep and nutrition matter as much as the workouts.',
    'Weeks 4 and 8 are deloads so you can recover and keep progressing.',
  ],
  safetyNotes: [
    'Only for people without joint problems who can already do 20+ push-ups and squats with good form.',
    'Jumping moves are high impact: swap them for the non-jumping version if any joint complains.',
  ],
  sessions: {
    P: {
      title: 'Push power',
      focus: 'Chest, shoulders and triceps',
      blocks: [
        standardWarmup([{ exerciseId: 'jumping_jack', sets: 1, reps: 40, restS: 0, fixed: true }]),
        {
          kind: 'main',
          title: 'Strength',
          items: [
            { exerciseId: 'decline_push_up', sets: 4, reps: 12, restS: 90 },
            { exerciseId: 'pike_push_up', sets: 4, reps: 10, restS: 90 },
            { exerciseId: 'chair_dip', sets: 3, reps: 15, restS: 75 },
            { exerciseId: 'prone_y_raise', sets: 3, reps: 12, restS: 45 },
            { exerciseId: 'plank_shoulder_tap', sets: 3, reps: 12, restS: 45 },
            { exerciseId: 'superman', sets: 3, reps: 12, restS: 45 },
          ],
        },
        {
          kind: 'finisher',
          title: 'Core',
          items: [{ exerciseId: 'hollow_hold', sets: 3, seconds: 30, restS: 45 }],
        },
        standardCooldown(),
      ],
    },
    L: {
      title: 'Leg power',
      focus: 'Explosive legs and single-leg strength',
      blocks: [
        standardWarmup([{ exerciseId: 'good_morning', sets: 1, reps: 10, restS: 0, fixed: true }]),
        {
          kind: 'main',
          title: 'Strength',
          items: [
            { exerciseId: 'jump_squat', sets: 4, reps: 10, restS: 90 },
            { exerciseId: 'split_squat', sets: 4, reps: 12, restS: 75 },
            { exerciseId: 'single_leg_glute_bridge', sets: 3, reps: 15, restS: 60 },
            { exerciseId: 'skater_jump', sets: 3, seconds: 30, restS: 60 },
            { exerciseId: 'calf_raise', sets: 3, reps: 20, restS: 45 },
          ],
        },
        {
          kind: 'finisher',
          title: 'Core',
          items: [{ exerciseId: 'side_plank', sets: 2, seconds: 40, restS: 30 }],
        },
        standardCooldown(),
      ],
    },
    C: {
      title: 'Conditioning',
      focus: 'Full-body intervals and core',
      blocks: [
        standardWarmup([{ exerciseId: 'jumping_jack', sets: 1, reps: 40, restS: 0, fixed: true }]),
        {
          kind: 'main',
          title: 'Intervals',
          items: [
            { exerciseId: 'burpee', sets: 4, seconds: 30, restS: 30 },
            { exerciseId: 'mountain_climber', sets: 4, seconds: 30, restS: 30 },
            { exerciseId: 'push_up', sets: 3, reps: 20, restS: 45 },
            { exerciseId: 'high_knees', sets: 4, seconds: 30, restS: 30 },
            { exerciseId: 'leg_raise', sets: 3, reps: 15, restS: 45 },
            { exerciseId: 'russian_twist', sets: 3, reps: 15, restS: 30 },
            { exerciseId: 'plank', sets: 3, seconds: 45, restS: 45 },
            { exerciseId: 'bicycle_crunch', sets: 3, reps: 12, restS: 30 },
          ],
        },
        standardCooldown(),
      ],
    },
    R: activeRecovery,
  },
  weekPattern: ['P', 'L', 'C', 'rest', 'P', 'L', 'active_recovery'],
  weekPatternOverrides: {
    '2': ['L', 'P', 'C', 'rest', 'L', 'P', 'active_recovery'],
    '6': ['L', 'P', 'C', 'rest', 'L', 'P', 'active_recovery'],
  },
  activeRecoverySession: 'R',
  progression: {
    volumePerWeek: 0.05,
    addSetEveryWeeks: 0,
    maxSets: 5,
    restPerWeekS: -5,
    minRestS: 30,
    deloadWeeks: [4, 8],
    deloadFactor: 0.6,
  },
};
