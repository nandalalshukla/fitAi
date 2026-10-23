import type { PlanSource } from '../schema';
import { activeRecovery, standardCooldown, standardWarmup } from './common';

/**
 * Upper-Body Strength: 3 non-consecutive days, push-up and pike progressions with
 * harder variations every few weeks (progressive overload without weights). Week 4 deloads.
 */
export const upperBodyStrength: PlanSource = {
  id: 'upper_body_strength',
  title: 'Upper-Body Strength',
  goal: 'strength',
  level: 'intermediate',
  weeks: 6,
  equipment: ['none', 'mat', 'chair'],
  minutesPerSession: 40,
  summary:
    'Build pressing strength and stable shoulders with push-up progressions, dips and back work.',
  whatToExpect: [
    'More push-ups in a row within a few weeks, and stronger, more stable shoulders.',
    'Harder variations replace easier ones as the weeks go on.',
    'Pair it with some leg and cardio work (or the Lower-Body plan) for all-round fitness.',
  ],
  safetyNotes: [
    'Skip dips and pike push-ups if you have shoulder pain; replace them with incline push-ups.',
    'Check with a doctor first if you have high blood pressure (inverted presses raise head pressure).',
  ],
  sessions: {
    A: {
      title: 'Press & stabilise',
      focus: 'Chest, triceps and shoulder stability',
      blocks: [
        standardWarmup([{ exerciseId: 'wall_angel', sets: 1, reps: 8, restS: 0, fixed: true }]),
        {
          kind: 'main',
          title: 'Strength',
          items: [
            {
              exerciseId: 'push_up',
              sets: 4,
              reps: 10,
              restS: 90,
              progressTo: [{ fromWeek: 5, exerciseId: 'decline_push_up' }],
            },
            { exerciseId: 'chair_dip', sets: 3, reps: 10, restS: 90 },
            { exerciseId: 'prone_y_raise', sets: 3, reps: 12, restS: 60 },
            { exerciseId: 'plank_shoulder_tap', sets: 3, reps: 10, restS: 60 },
            { exerciseId: 'superman', sets: 3, reps: 12, restS: 45 },
          ],
        },
        standardCooldown(),
      ],
    },
    B: {
      title: 'Overhead & back',
      focus: 'Shoulders, upper back and core',
      blocks: [
        standardWarmup([{ exerciseId: 'wall_angel', sets: 1, reps: 8, restS: 0, fixed: true }]),
        {
          kind: 'main',
          title: 'Strength',
          items: [
            { exerciseId: 'pike_push_up', sets: 4, reps: 8, restS: 90 },
            { exerciseId: 'incline_push_up', sets: 3, reps: 15, restS: 60, tempo: '3-1-1' },
            { exerciseId: 'superman', sets: 3, reps: 12, restS: 60 },
            { exerciseId: 'plank', sets: 3, seconds: 40, restS: 60 },
            { exerciseId: 'plank_shoulder_tap', sets: 2, reps: 10, restS: 45 },
          ],
        },
        standardCooldown(),
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
    volumePerWeek: 0.08,
    addSetEveryWeeks: 0,
    maxSets: 5,
    restPerWeekS: 0,
    minRestS: 60,
    deloadWeeks: [4],
    deloadFactor: 0.6,
  },
};
