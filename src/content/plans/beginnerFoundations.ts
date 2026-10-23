import type { PlanSource } from '../schema';
import { activeRecovery, standardCooldown, standardWarmup } from './common';

/**
 * Beginner Foundations: first 4 weeks, 3 short full-body days (WHO: muscle strengthening on 2+
 * days/week; ACSM novice frequency 2–3 days). Push-ups progress incline → knee → full.
 */
export const beginnerFoundations: PlanSource = {
  id: 'beginner_foundations',
  title: 'Beginner Foundations',
  goal: 'general',
  level: 'beginner',
  weeks: 4,
  equipment: ['none', 'mat'],
  minutesPerSession: 30,
  summary: 'Learn the basic movement patterns with short full-body sessions three days a week.',
  whatToExpect: [
    'You will learn to squat, push, bridge and brace with good form while the camera coaches you.',
    'Expect some muscle soreness in the first week; it fades as your body adapts.',
    'Reps grow a little every week. Rest days matter as much as workout days.',
  ],
  safetyNotes: [
    'If you are new to exercise, have a medical condition, are pregnant or are over 65 and inactive, check with a doctor first.',
    'Stop if you feel pain, dizziness or shortness of breath beyond normal effort.',
  ],
  sessions: {
    A: {
      title: 'Full body A',
      focus: 'Squat, push and core basics',
      blocks: [
        standardWarmup(),
        {
          kind: 'main',
          title: 'Main',
          items: [
            { exerciseId: 'squat', sets: 2, reps: 10, restS: 60 },
            {
              exerciseId: 'incline_push_up',
              sets: 2,
              reps: 8,
              restS: 60,
              progressTo: [{ fromWeek: 3, exerciseId: 'knee_push_up' }],
            },
            { exerciseId: 'glute_bridge', sets: 2, reps: 12, restS: 60 },
            { exerciseId: 'jumping_jack', sets: 2, reps: 20, restS: 45 },
            { exerciseId: 'plank', sets: 2, seconds: 20, restS: 45 },
            { exerciseId: 'curl_up', sets: 2, reps: 5, restS: 45 },
          ],
        },
        standardCooldown(),
      ],
    },
    B: {
      title: 'Full body B',
      focus: 'Lunge, bridge and side core',
      blocks: [
        standardWarmup(),
        {
          kind: 'main',
          title: 'Main',
          items: [
            { exerciseId: 'reverse_lunge', sets: 2, reps: 8, restS: 60 },
            { exerciseId: 'squat', sets: 2, reps: 10, restS: 60 },
            { exerciseId: 'glute_bridge', sets: 2, reps: 12, restS: 60 },
            { exerciseId: 'bird_dog', sets: 2, reps: 6, restS: 45 },
            { exerciseId: 'side_plank', sets: 2, seconds: 15, restS: 45 },
            { exerciseId: 'dead_bug', sets: 2, reps: 6, restS: 45 },
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
  },
  activeRecoverySession: 'R',
  progression: {
    volumePerWeek: 0.1,
    addSetEveryWeeks: 0,
    maxSets: 3,
    restPerWeekS: 0,
    minRestS: 45,
    deloadWeeks: [],
    deloadFactor: 0.7,
  },
};
