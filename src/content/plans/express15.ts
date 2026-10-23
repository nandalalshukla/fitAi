import type { PlanSource } from '../schema';

/**
 * 15-Minute Express Daily: short full-body circuits 6 days a week for busy schedules. Rotates
 * focus so the same muscles are not hammered on consecutive days; one full rest day.
 */
export const express15: PlanSource = {
  id: 'express_15',
  title: '15-Minute Express Daily',
  goal: 'general',
  level: 'beginner',
  weeks: 4,
  equipment: ['none', 'mat'],
  minutesPerSession: 15,
  summary: 'A quick daily habit: short warm-up, a focused circuit and a stretch, in 15 minutes.',
  whatToExpect: [
    'Short sessions make it easy to train every day and build a habit.',
    'Fifteen minutes of muscle work plus daily walking already covers a good part of the WHO weekly targets.',
    'Reps grow a little each week.',
  ],
  safetyNotes: [
    'Check with a doctor first if you have a medical condition or have been inactive for a long time.',
  ],
  sessions: {
    A: {
      title: 'Legs & core',
      focus: 'Squats, bridges and planks',
      blocks: [
        {
          kind: 'warmup',
          title: 'Warm-up',
          items: [{ exerciseId: 'march_in_place', sets: 1, seconds: 90, restS: 0, fixed: true }],
        },
        {
          kind: 'main',
          title: 'Circuit',
          items: [
            { exerciseId: 'squat', sets: 2, reps: 15, restS: 30 },
            { exerciseId: 'glute_bridge', sets: 2, reps: 15, restS: 30 },
            { exerciseId: 'plank', sets: 2, seconds: 30, restS: 30 },
            { exerciseId: 'calf_raise', sets: 2, reps: 15, restS: 30 },
          ],
        },
        {
          kind: 'cooldown',
          title: 'Stretch',
          items: [{ exerciseId: 'hamstring_stretch', sets: 1, seconds: 30, restS: 0, fixed: true }],
        },
      ],
    },
    B: {
      title: 'Push & cardio',
      focus: 'Push-ups and heart rate',
      blocks: [
        {
          kind: 'warmup',
          title: 'Warm-up',
          items: [{ exerciseId: 'arm_circles', sets: 1, seconds: 60, restS: 0, fixed: true }],
        },
        {
          kind: 'main',
          title: 'Circuit',
          items: [
            {
              exerciseId: 'knee_push_up',
              sets: 2,
              reps: 10,
              restS: 30,
              progressTo: [{ fromWeek: 3, exerciseId: 'push_up' }],
            },
            { exerciseId: 'jumping_jack', sets: 2, reps: 30, restS: 30 },
            { exerciseId: 'high_knees', sets: 2, seconds: 30, restS: 30 },
            { exerciseId: 'mountain_climber', sets: 2, seconds: 30, restS: 30 },
            { exerciseId: 'superman', sets: 2, reps: 10, restS: 30 },
          ],
        },
        {
          kind: 'cooldown',
          title: 'Stretch',
          items: [{ exerciseId: 'childs_pose', sets: 1, seconds: 45, restS: 0, fixed: true }],
        },
      ],
    },
    C: {
      title: 'Lunges & abs',
      focus: 'Single-leg strength and core',
      blocks: [
        {
          kind: 'warmup',
          title: 'Warm-up',
          items: [{ exerciseId: 'hip_circles', sets: 1, seconds: 60, restS: 0, fixed: true }],
        },
        {
          kind: 'main',
          title: 'Circuit',
          items: [
            { exerciseId: 'reverse_lunge', sets: 2, reps: 8, restS: 30 },
            { exerciseId: 'crunch', sets: 2, reps: 15, restS: 30 },
            { exerciseId: 'bird_dog', sets: 2, reps: 6, restS: 30 },
            { exerciseId: 'side_plank', sets: 2, seconds: 20, restS: 30 },
          ],
        },
        {
          kind: 'cooldown',
          title: 'Stretch',
          items: [{ exerciseId: 'quad_stretch', sets: 1, seconds: 30, restS: 0, fixed: true }],
        },
      ],
    },
  },
  weekPattern: ['A', 'B', 'C', 'A', 'B', 'C', 'rest'],
  progression: {
    volumePerWeek: 0.08,
    addSetEveryWeeks: 0,
    maxSets: 3,
    restPerWeekS: 0,
    minRestS: 30,
    deloadWeeks: [],
    deloadFactor: 0.7,
  },
};
