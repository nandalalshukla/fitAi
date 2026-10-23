import type { PlanSource } from '../schema';

/**
 * Mobility & Flexibility: dynamic mobility followed by static holds (ACSM: ≥2–3 days/week,
 * 10–30 s per hold for most adults, ~60 s total per muscle group). Holds lengthen weekly.
 */
export const mobilityFlexibility: PlanSource = {
  id: 'mobility_flexibility',
  title: 'Mobility & Flexibility',
  goal: 'mobility',
  level: 'beginner',
  weeks: 4,
  equipment: ['mat', 'wall'],
  minutesPerSession: 20,
  summary: 'Gentle daily sessions to loosen hips, hamstrings, shoulders and back.',
  whatToExpect: [
    'Flexibility improves gradually with regular practice; most people notice changes after 3–4 weeks.',
    'Stretches should feel like mild tension, never pain.',
    'Static stretching is best after exercise or on its own, not right before hard training.',
  ],
  safetyNotes: [
    'Do not bounce into stretches.',
    'If you have hypermobility or a recent injury, check with a physiotherapist first.',
  ],
  sessions: {
    A: {
      title: 'Hips & legs',
      focus: 'Hip flexors, hamstrings, glutes and quads',
      blocks: [
        {
          kind: 'warmup',
          title: 'Warm-up',
          items: [
            { exerciseId: 'march_in_place', sets: 1, seconds: 90, restS: 0, fixed: true },
            { exerciseId: 'hip_circles', sets: 1, seconds: 60, restS: 0, fixed: true },
          ],
        },
        {
          kind: 'main',
          title: 'Mobility',
          items: [
            { exerciseId: 'good_morning', sets: 2, reps: 10, restS: 15 },
            { exerciseId: 'hip_flexor_stretch', sets: 2, seconds: 30, restS: 10 },
            { exerciseId: 'hamstring_stretch', sets: 2, seconds: 30, restS: 10 },
            { exerciseId: 'figure_four_stretch', sets: 2, seconds: 30, restS: 10 },
            { exerciseId: 'cat_cow', sets: 2, seconds: 45, restS: 10 },
          ],
        },
        {
          kind: 'cooldown',
          title: 'Relax',
          items: [
            { exerciseId: 'quad_stretch', sets: 1, seconds: 30, restS: 0, fixed: true },
            { exerciseId: 'childs_pose', sets: 1, seconds: 60, restS: 0, fixed: true },
          ],
        },
      ],
    },
    B: {
      title: 'Spine & shoulders',
      focus: 'Back, chest and shoulders',
      blocks: [
        {
          kind: 'warmup',
          title: 'Warm-up',
          items: [
            { exerciseId: 'march_in_place', sets: 1, seconds: 90, restS: 0, fixed: true },
            { exerciseId: 'arm_circles', sets: 1, seconds: 60, restS: 0, fixed: true },
          ],
        },
        {
          kind: 'main',
          title: 'Mobility',
          items: [
            { exerciseId: 'cat_cow', sets: 2, seconds: 45, restS: 10 },
            { exerciseId: 'wall_angel', sets: 2, reps: 8, restS: 15 },
            { exerciseId: 'cobra_stretch', sets: 2, seconds: 30, restS: 10 },
            { exerciseId: 'pelvic_tilt', sets: 2, reps: 10, restS: 10 },
            { exerciseId: 'hip_flexor_stretch', sets: 2, seconds: 30, restS: 10 },
            { exerciseId: 'bird_dog', sets: 2, reps: 6, restS: 15 },
          ],
        },
        {
          kind: 'cooldown',
          title: 'Relax',
          items: [
            { exerciseId: 'hamstring_stretch', sets: 1, seconds: 30, restS: 0, fixed: true },
            { exerciseId: 'childs_pose', sets: 1, seconds: 60, restS: 0, fixed: true },
          ],
        },
      ],
    },
  },
  weekPattern: ['A', 'B', 'A', 'B', 'A', 'rest', 'rest'],
  weekPatternOverrides: {
    '2': ['B', 'A', 'B', 'A', 'B', 'rest', 'rest'],
    '4': ['B', 'A', 'B', 'A', 'B', 'rest', 'rest'],
  },
  progression: {
    volumePerWeek: 0.1,
    addSetEveryWeeks: 0,
    maxSets: 3,
    restPerWeekS: 0,
    minRestS: 10,
    deloadWeeks: [],
    deloadFactor: 0.7,
  },
};
