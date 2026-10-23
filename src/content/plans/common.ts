import type { Block, SessionTemplate } from '../schema';

/** Shared warm-up / cool-down blocks (fixed: never progressed). */
export const standardWarmup = (extra: Block['items'] = []): Block => ({
  kind: 'warmup',
  title: 'Warm-up',
  items: [
    { exerciseId: 'march_in_place', sets: 1, seconds: 120, restS: 0, fixed: true },
    { exerciseId: 'arm_circles', sets: 1, seconds: 60, restS: 0, fixed: true },
    { exerciseId: 'hip_circles', sets: 1, seconds: 60, restS: 0, fixed: true },
    ...extra,
  ],
});

export const standardCooldown = (extra: Block['items'] = []): Block => ({
  kind: 'cooldown',
  title: 'Cool-down & stretch',
  items: [
    { exerciseId: 'hamstring_stretch', sets: 1, seconds: 30, restS: 0, fixed: true },
    { exerciseId: 'quad_stretch', sets: 1, seconds: 30, restS: 0, fixed: true },
    ...extra,
    { exerciseId: 'childs_pose', sets: 1, seconds: 60, restS: 0, fixed: true },
  ],
});

/** Light active-recovery session (mobility + easy movement), ~20 minutes. */
export const activeRecovery: SessionTemplate = {
  title: 'Active recovery',
  focus: 'Easy movement and mobility to help you recover',
  blocks: [
    standardWarmup(),
    {
      kind: 'main',
      title: 'Mobility flow',
      items: [
        { exerciseId: 'cat_cow', sets: 2, seconds: 60, restS: 15, fixed: true },
        { exerciseId: 'dead_bug', sets: 2, reps: 6, restS: 30, fixed: true },
        { exerciseId: 'glute_bridge', sets: 2, reps: 10, restS: 30, fixed: true },
        { exerciseId: 'march_in_place', sets: 2, seconds: 120, restS: 30, fixed: true },
      ],
    },
    standardCooldown([{ exerciseId: 'cat_cow', sets: 1, seconds: 60, restS: 0, fixed: true }]),
  ],
};
