/**
 * English strings (source of truth). Other locales must match this shape;
 * spoken voice cues will live under `cues.*` so they are translatable too.
 */
export const en = {
  common: {
    appName: 'FormFit',
    continue: 'Continue',
    cancel: 'Cancel',
    close: 'Close',
    retry: 'Try again',
    seeAll: 'See all',
    minutes_one: '{{count}} min',
    minutes_other: '{{count}} min',
    comingSoon: 'Coming soon',
  },
  tabs: {
    today: 'Today',
    plans: 'Plans',
    exercises: 'Exercises',
    progress: 'Progress',
    settings: 'Settings',
  },
  today: {
    greeting: "Let's move",
    startWorkout: "Start today's workout",
    todayWorkout: "Today's workout",
    streak: 'Day streak',
    weekly: 'This week',
    quickStart: 'Just start (free mode)',
    noPlanTitle: 'Pick your first plan',
    noPlanMessage: 'Choose a goal and FormFit builds your daily sessions.',
    browsePlans: 'Browse plans',
  },
  plans: {
    title: 'Plans',
    subtitle: 'Programs built for home training',
    all: 'All',
    beginner: 'Beginner',
    intermediate: 'Intermediate',
    advanced: 'Advanced',
    selectPlan: 'Start this plan',
    switchPlan: 'Switch to this plan',
    whatToExpect: 'What to expect',
    sampleSession: 'Sample session',
    notFound: "We couldn't find that plan.",
  },
  exercises: {
    title: 'Exercises',
    subtitle: 'Learn the movement, then let the camera coach you',
  },
  progress: {
    title: 'Progress',
    emptyTitle: 'Your progress lives here',
    emptyMessage: 'Finish a workout to see reps, streaks and weekly charts.',
  },
  settings: {
    title: 'Settings',
    appearance: 'Appearance',
    appearanceSystem: 'System',
    appearanceDark: 'Dark',
    appearanceLight: 'Light',
    designSystem: 'Design system (dev)',
    poseLab: 'Pose lab (dev)',
  },
  camera: {
    permissionTitle: 'Let FormFit see your moves',
    permissionMessage:
      'The camera counts your reps and checks your form. Video is processed on your phone and never stored or uploaded.',
    allow: 'Allow camera',
    deniedTitle: 'Camera access is off',
    deniedMessage:
      'Turn on camera access in Settings to use the AI coach. You can still log workouts manually.',
    openSettings: 'Open Settings',
    modelErrorTitle: "The AI coach couldn't start",
    flip: 'Flip camera',
    skeleton: 'Skeleton',
  },
  poseLab: {
    title: 'Pose lab (dev)',
    model: 'Model',
    benchmark: 'Run 30 s benchmark',
    benchmarking: 'Benchmarking… {{seconds}} s',
    results: 'Benchmark results',
  },
  workout: {
    title: 'Workout',
    placeholder: 'The camera coach arrives in the next build phase.',
    exit: 'End workout',
  },
  errors: {
    notFoundTitle: 'Nothing here',
    notFoundMessage: "This screen doesn't exist.",
    goHome: 'Go to Today',
  },
} as const;

type Widen<T> = { [K in keyof T]: T[K] extends string ? string : Widen<T[K]> };
export type TranslationShape = Widen<typeof en>;
