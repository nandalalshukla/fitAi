import type { PlanSource } from '../schema';
import { standardCooldown } from './common';

/**
 * Core & Posture: spine-sparing core endurance (McGill "big 3": curl-up, side bridge,
 * bird dog) plus upper-back work for posture. Short, frequent sessions; holds lengthen weekly.
 */
export const corePosture: PlanSource = {
  id: 'core_posture',
  title: 'Core & Posture',
  goal: 'core',
  level: 'beginner',
  weeks: 6,
  equipment: ['mat', 'wall'],
  minutesPerSession: 25,
  summary: 'Back-friendly core endurance and upper-back strength for better posture.',
  whatToExpect: [
    'A steadier trunk for lifting, carrying and other workouts.',
    'Many people find their back feels better with this kind of training, but it is not a treatment for back pain.',
    'Holds and reps grow a little each week.',
  ],
  safetyNotes: [
    'If you have ongoing back pain, numbness or pain going down a leg, see a clinician before starting.',
    'All moves should be pain-free. Reduce the range or skip a move that hurts.',
  ],
  sessions: {
    A: {
      title: 'Core endurance',
      focus: 'The McGill big three and deep core',
      blocks: [
        {
          kind: 'warmup',
          title: 'Warm-up',
          items: [
            { exerciseId: 'march_in_place', sets: 1, seconds: 120, restS: 0, fixed: true },
            { exerciseId: 'cat_cow', sets: 1, seconds: 60, restS: 0, fixed: true },
          ],
        },
        {
          kind: 'main',
          title: 'Big three',
          items: [
            { exerciseId: 'curl_up', sets: 3, reps: 5, restS: 30 },
            { exerciseId: 'side_plank', sets: 3, seconds: 15, restS: 30 },
            { exerciseId: 'bird_dog', sets: 3, reps: 6, restS: 30 },
            { exerciseId: 'dead_bug', sets: 2, reps: 8, restS: 30 },
          ],
        },
        standardCooldown(),
      ],
    },
    B: {
      title: 'Posture & glutes',
      focus: 'Upper back, glutes and anti-extension',
      blocks: [
        {
          kind: 'warmup',
          title: 'Warm-up',
          items: [
            { exerciseId: 'march_in_place', sets: 1, seconds: 120, restS: 0, fixed: true },
            { exerciseId: 'arm_circles', sets: 1, seconds: 60, restS: 0, fixed: true },
          ],
        },
        {
          kind: 'main',
          title: 'Posture',
          items: [
            { exerciseId: 'wall_angel', sets: 3, reps: 8, restS: 30 },
            { exerciseId: 'prone_y_raise', sets: 3, reps: 10, restS: 30 },
            { exerciseId: 'glute_bridge', sets: 3, reps: 12, restS: 30 },
            { exerciseId: 'plank', sets: 3, seconds: 20, restS: 30 },
          ],
        },
        standardCooldown([
          { exerciseId: 'cobra_stretch', sets: 1, seconds: 30, restS: 0, fixed: true },
        ]),
      ],
    },
  },
  weekPattern: ['A', 'B', 'rest', 'A', 'B', 'rest', 'rest'],
  progression: {
    volumePerWeek: 0.1,
    addSetEveryWeeks: 0,
    maxSets: 4,
    restPerWeekS: 0,
    minRestS: 30,
    deloadWeeks: [],
    deloadFactor: 0.7,
  },
};
