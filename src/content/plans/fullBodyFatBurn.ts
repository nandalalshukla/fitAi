import type { PlanSource } from '../schema';
import { activeRecovery, standardCooldown, standardWarmup } from './common';

/**
 * Full-Body Fat Burn: interval-style conditioning 4 days a week (WHO aerobic + strengthening
 * targets in one). Work:rest moves from ~1:1 towards 2:1 as rests shorten; week 4 deloads.
 */
export const fullBodyFatBurn: PlanSource = {
  id: 'full_body_fat_burn',
  title: 'Full-Body Fat Burn',
  goal: 'fat_loss',
  level: 'intermediate',
  weeks: 6,
  equipment: ['none'],
  minutesPerSession: 35,
  summary: 'Short work bouts with brief rests to keep your heart rate up and burn energy.',
  whatToExpect: [
    'Better conditioning: the same sessions will feel easier within a few weeks.',
    'Exercise helps fat loss, but losing fat mostly depends on eating in a modest calorie deficit.',
    'Rests get a little shorter each week; week 4 is lighter so you can recover.',
  ],
  safetyNotes: [
    'High-intensity intervals are demanding: check with a doctor first if you have heart or blood-pressure conditions.',
    'Swap jumping moves for their low-impact versions if your joints complain.',
  ],
  sessions: {
    A: {
      title: 'Conditioning A',
      focus: 'Cardio and legs',
      blocks: [
        standardWarmup([{ exerciseId: 'jumping_jack', sets: 1, reps: 30, restS: 0, fixed: true }]),
        {
          kind: 'main',
          title: 'Intervals',
          items: [
            { exerciseId: 'jumping_jack', sets: 3, reps: 40, restS: 20 },
            { exerciseId: 'high_knees', sets: 3, seconds: 30, restS: 30 },
            { exerciseId: 'squat', sets: 3, reps: 20, restS: 30 },
            {
              exerciseId: 'mountain_climber',
              sets: 3,
              seconds: 30,
              restS: 30,
              progressTo: [{ fromWeek: 5, exerciseId: 'burpee' }],
            },
            { exerciseId: 'push_up', sets: 3, reps: 12, restS: 30 },
            { exerciseId: 'lunge', sets: 3, reps: 10, restS: 30 },
          ],
        },
        {
          kind: 'finisher',
          title: 'Finisher',
          items: [{ exerciseId: 'plank', sets: 2, seconds: 45, restS: 30 }],
        },
        standardCooldown(),
      ],
    },
    B: {
      title: 'Conditioning B',
      focus: 'Cardio, glutes and core',
      blocks: [
        standardWarmup([{ exerciseId: 'jumping_jack', sets: 1, reps: 30, restS: 0, fixed: true }]),
        {
          kind: 'main',
          title: 'Intervals',
          items: [
            { exerciseId: 'high_knees', sets: 3, seconds: 30, restS: 30 },
            { exerciseId: 'glute_bridge', sets: 3, reps: 20, restS: 30 },
            { exerciseId: 'jumping_jack', sets: 3, reps: 40, restS: 20 },
            { exerciseId: 'sit_up', sets: 3, reps: 15, restS: 30 },
            { exerciseId: 'mountain_climber', sets: 3, seconds: 30, restS: 30 },
            { exerciseId: 'plank_shoulder_tap', sets: 3, reps: 10, restS: 30 },
          ],
        },
        {
          kind: 'finisher',
          title: 'Finisher',
          items: [{ exerciseId: 'bicycle_crunch', sets: 2, reps: 12, restS: 30 }],
        },
        standardCooldown(),
      ],
    },
    R: activeRecovery,
  },
  weekPattern: ['A', 'B', 'rest', 'A', 'B', 'active_recovery', 'rest'],
  activeRecoverySession: 'R',
  progression: {
    volumePerWeek: 0.06,
    addSetEveryWeeks: 0,
    maxSets: 4,
    restPerWeekS: -3,
    minRestS: 15,
    deloadWeeks: [4],
    deloadFactor: 0.65,
  },
};
