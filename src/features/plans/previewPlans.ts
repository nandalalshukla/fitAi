/**
 * TEMPORARY navigation-shell data so the plan list -> detail flow can be built
 * and animated in Phase 1. Replaced by researched, zod-validated plans in
 * `src/content/plans` during Phase 7 (Content).
 */
export interface PlanPreview {
  id: string;
  title: string;
  goal: string;
  level: 'beginner' | 'intermediate' | 'advanced';
  weeks: number;
  daysPerWeek: number;
  minutesPerSession: number;
  summary: string;
  sample: { name: string; prescription: string; cameraTracked: boolean }[];
}

export const previewPlans: PlanPreview[] = [
  {
    id: 'six-pack-abs',
    title: '6-Pack Abs Builder',
    goal: 'Core',
    level: 'intermediate',
    weeks: 8,
    daysPerWeek: 5,
    minutesPerSession: 60,
    summary: 'Placeholder preview. Full researched plan arrives in the content phase.',
    sample: [
      { name: 'Push-up', prescription: '3 × 20', cameraTracked: true },
      { name: 'Squat', prescription: '2 × 20', cameraTracked: true },
      { name: 'Jumping jack', prescription: '2 × 20', cameraTracked: true },
    ],
  },
  {
    id: 'beginner-foundations',
    title: 'Beginner Foundations',
    goal: 'Strength',
    level: 'beginner',
    weeks: 4,
    daysPerWeek: 3,
    minutesPerSession: 30,
    summary: 'Placeholder preview. Full researched plan arrives in the content phase.',
    sample: [
      { name: 'Squat', prescription: '2 × 10', cameraTracked: true },
      { name: 'Glute bridge', prescription: '2 × 12', cameraTracked: true },
      { name: 'Plank', prescription: '2 × 20 s', cameraTracked: true },
    ],
  },
  {
    id: 'full-body-fat-burn',
    title: 'Full-Body Fat Burn',
    goal: 'HIIT',
    level: 'intermediate',
    weeks: 6,
    daysPerWeek: 4,
    minutesPerSession: 35,
    summary: 'Placeholder preview. Full researched plan arrives in the content phase.',
    sample: [
      { name: 'High knees', prescription: '3 × 30 s', cameraTracked: true },
      { name: 'Mountain climbers', prescription: '3 × 30 s', cameraTracked: true },
      { name: 'Lunge', prescription: '3 × 12', cameraTracked: true },
    ],
  },
];

export const findPreviewPlan = (id: string) => previewPlans.find((p) => p.id === id);
