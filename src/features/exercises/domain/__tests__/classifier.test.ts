import { generateSequence } from '../../testing/synthetic';
import { createModeController, createRuleClassifier } from '../classifier';
import { createEngine, processPose } from '../engine';
import { allExercises, getExercise } from '../registry';
import type { ExerciseId } from '../types';

/** Classifies sliding windows of a generated sequence; returns top-1 labels. */
function classifyWindows(
  exercise: ExerciseId,
  view: 'side' | 'front',
  seed: number,
): (ExerciseId | null)[] {
  const def = getExercise(exercise);
  const floor = def.cameraPlacement.orientation === 'landscape';
  const frames = generateSequence({
    exercise,
    view,
    loops: exercise === 'plank' ? 0 : 6,
    leadInMs: exercise === 'plank' ? 15000 : 500,
    fps: 15,
    noisePx: 4,
    dropoutRate: 0.02,
    yawOffsetDeg: view === 'side' ? 10 : 0,
    frame: floor ? { width: 1280, height: 720 } : { width: 720, height: 1280 },
    seed,
  });
  // The classifier sees the same smoothed skeleton the engine produces.
  const eng = createEngine(def, { view });
  const c = createRuleClassifier();
  const labels: (ExerciseId | null)[] = [];
  frames.forEach((p, i) => {
    processPose(eng, p, p.timestamp);
    if (!eng.visible) return;
    c.push(eng.skeleton, eng.torsoRef);
    if (i > 60 && i % 15 === 0) labels.push(c.classify()[0]?.exercise ?? null);
  });
  return labels;
}

const CASES: [ExerciseId, 'side' | 'front'][] = allExercises().flatMap((d) =>
  d.cameraPlacement.view === 'either'
    ? ([
        [d.id, 'side'],
        [d.id, 'front'],
      ] as [ExerciseId, 'side' | 'front'][])
    : [[d.id, d.cameraPlacement.view === 'front' ? 'front' : 'side']],
);
CASES.push(['squat', 'front']);

describe('rule-based exercise classifier', () => {
  const all: boolean[] = [];

  it.each(CASES)('recognises %s (%s view)', (exercise, view) => {
    const labels = [...classifyWindows(exercise, view, 11), ...classifyWindows(exercise, view, 12)];
    const correct = labels.filter((l) => l === exercise).length;
    all.push(...labels.map((l) => l === exercise));
    expect(labels.length).toBeGreaterThan(3);
    expect(correct / labels.length).toBeGreaterThanOrEqual(0.9);
  });

  it('reaches ≥ 95 % top-1 accuracy over all windows', () => {
    expect(all.filter(Boolean).length / all.length).toBeGreaterThanOrEqual(0.95);
  });

  it('does not confidently classify someone standing still', () => {
    const frames = generateSequence({
      exercise: 'squat',
      view: 'side',
      loops: 0,
      leadInMs: 8000,
      fps: 15,
      noisePx: 4,
      frame: { width: 720, height: 1280 },
      seed: 13,
    });
    const eng = createEngine(getExercise('squat'));
    const c = createRuleClassifier();
    frames.forEach((p) => {
      processPose(eng, p, p.timestamp);
      if (eng.visible) c.push(eng.skeleton, eng.torsoRef);
    });
    expect(c.classify()[0]?.confidence ?? 0).toBeLessThan(0.6);
  });
});

describe('mode controller', () => {
  const said = (exercise: ExerciseId, confidence: number) => [{ exercise, confidence }];

  it('guided mode suggests switching after consistent detections', () => {
    const m = createModeController('guided', { consecutive: 3 });
    expect(m.update(said('push_up', 0.9), 'squat').kind).toBe('none');
    expect(m.update(said('push_up', 0.9), 'squat').kind).toBe('none');
    expect(m.update(said('push_up', 0.9), 'squat')).toMatchObject({
      kind: 'suggest_switch',
      exercise: 'push_up',
    });
    expect(m.update(said('push_up', 0.9), 'squat').kind).toBe('none'); // only once until reset
  });

  it('guided mode stays quiet while the planned exercise is plausible', () => {
    const m = createModeController('guided', { consecutive: 1 });
    expect(
      m.update(
        [
          { exercise: 'lunge', confidence: 0.9 },
          { exercise: 'squat', confidence: 0.6 },
        ],
        'squat',
      ).kind,
    ).toBe('none');
  });

  it('guided mode can auto-advance when very confident', () => {
    const m = createModeController('guided', { consecutive: 2, autoSwitch: true });
    m.update(said('plank', 0.95), 'push_up');
    expect(m.update(said('plank', 0.95), 'push_up').kind).toBe('auto_switch');
  });

  it('free mode selects an exercise once detections agree', () => {
    const m = createModeController('free', { consecutive: 2 });
    expect(m.update(said('jumping_jack', 0.8), null).kind).toBe('none');
    expect(m.update(said('squat', 0.8), null).kind).toBe('none'); // different exercise: streak restarts
    expect(m.update(said('squat', 0.8), null)).toMatchObject({ kind: 'select', exercise: 'squat' });
  });
});
