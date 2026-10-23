import type { PlanSource } from '../schema';

/**
 * Low-Impact Basics: joint-friendly general fitness (no jumping, lots of support options).
 * Labelled as general fitness, NOT rehabilitation or medical treatment. Exercise is a first-line
 * approach for non-specific low-back pain (NICE NG59), but individual care belongs to clinicians.
 */
export const lowImpactBasics: PlanSource = {
  id: 'low_impact_basics',
  title: 'Low-Impact Basics',
  goal: 'low_impact',
  level: 'beginner',
  weeks: 6,
  equipment: ['none', 'mat', 'chair', 'wall'],
  minutesPerSession: 25,
  summary:
    'Gentle, no-jump strength and mobility for returning to exercise or for sensitive joints.',
  whatToExpect: [
    'A gentle, steady build-up in strength, balance and mobility without jumping.',
    'This is general fitness, not physiotherapy or treatment for an injury or condition.',
    'Progress is slow on purpose: reps grow about 5 % a week.',
  ],
  safetyNotes: [
    'If you are recovering from an injury, surgery or pregnancy, or live with a long-term condition, follow your clinician’s advice first.',
    'Stop any exercise that causes pain, and keep a chair or wall nearby for balance.',
  ],
  sessions: {
    A: {
      title: 'Gentle strength',
      focus: 'Legs, glutes and supported pushing',
      blocks: [
        {
          kind: 'warmup',
          title: 'Warm-up',
          items: [
            { exerciseId: 'march_in_place', sets: 1, seconds: 120, restS: 0, fixed: true },
            { exerciseId: 'arm_circles', sets: 1, seconds: 45, restS: 0, fixed: true },
          ],
        },
        {
          kind: 'main',
          title: 'Strength',
          items: [
            { exerciseId: 'squat', sets: 2, reps: 8, restS: 60 },
            { exerciseId: 'incline_push_up', sets: 2, reps: 8, restS: 60 },
            { exerciseId: 'glute_bridge', sets: 2, reps: 10, restS: 45 },
            { exerciseId: 'standing_hip_abduction', sets: 2, reps: 10, restS: 30 },
            { exerciseId: 'calf_raise', sets: 2, reps: 12, restS: 30 },
            { exerciseId: 'bird_dog', sets: 2, reps: 6, restS: 30 },
          ],
        },
        {
          kind: 'cooldown',
          title: 'Stretch',
          items: [
            { exerciseId: 'hamstring_stretch', sets: 1, seconds: 30, restS: 0, fixed: true },
            { exerciseId: 'figure_four_stretch', sets: 1, seconds: 30, restS: 0, fixed: true },
          ],
        },
      ],
    },
    B: {
      title: 'Core & mobility',
      focus: 'Gentle core control and back mobility',
      blocks: [
        {
          kind: 'warmup',
          title: 'Warm-up',
          items: [
            { exerciseId: 'step_jack', sets: 1, seconds: 90, restS: 0, fixed: true },
            { exerciseId: 'cat_cow', sets: 1, seconds: 60, restS: 0, fixed: true },
          ],
        },
        {
          kind: 'main',
          title: 'Core',
          items: [
            { exerciseId: 'pelvic_tilt', sets: 2, reps: 10, restS: 30 },
            { exerciseId: 'bird_dog', sets: 2, reps: 6, restS: 30 },
            { exerciseId: 'curl_up', sets: 2, reps: 5, restS: 30 },
            { exerciseId: 'wall_angel', sets: 2, reps: 8, restS: 30 },
            { exerciseId: 'wall_sit', sets: 2, seconds: 20, restS: 45 },
            { exerciseId: 'glute_bridge', sets: 2, reps: 10, restS: 45 },
            { exerciseId: 'standing_hip_abduction', sets: 2, reps: 10, restS: 30 },
          ],
        },
        {
          kind: 'cooldown',
          title: 'Stretch',
          items: [
            { exerciseId: 'hip_flexor_stretch', sets: 1, seconds: 30, restS: 0, fixed: true },
            { exerciseId: 'childs_pose', sets: 1, seconds: 45, restS: 0, fixed: true },
          ],
        },
      ],
    },
  },
  weekPattern: ['A', 'rest', 'B', 'rest', 'A', 'rest', 'rest'],
  weekPatternOverrides: {
    '2': ['B', 'rest', 'A', 'rest', 'B', 'rest', 'rest'],
    '4': ['B', 'rest', 'A', 'rest', 'B', 'rest', 'rest'],
    '6': ['B', 'rest', 'A', 'rest', 'B', 'rest', 'rest'],
  },
  progression: {
    volumePerWeek: 0.05,
    addSetEveryWeeks: 0,
    maxSets: 3,
    restPerWeekS: 0,
    minRestS: 30,
    deloadWeeks: [],
    deloadFactor: 0.7,
  },
};
