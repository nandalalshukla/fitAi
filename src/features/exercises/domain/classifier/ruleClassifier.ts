import { allExercises } from '../registry';
import type { ExerciseId, MotionSignature } from '../types';
import type { Classification, ExerciseClassifier } from './types';
import {
  CLASSIFIER_FEATURES,
  coActivation,
  frameVector,
  stats,
  type FeatureStats,
  type FrameVector,
} from './windowFeatures';

export interface RuleClassifierOptions {
  /** Sliding window length, ms. */
  windowMs: number;
  /** Minimum frames in the window before classifying. */
  minFrames: number;
  /** Candidates below this confidence are dropped. */
  minConfidence: number;
}

export const DEFAULT_CLASSIFIER_OPTIONS: RuleClassifierOptions = {
  windowMs: 3500,
  minFrames: 20,
  minConfidence: 0.35,
};

type Orientation = 'upright' | 'horizontal' | 'inclined';

function orientationOf(meanTilt: number): Orientation {
  if (meanTilt <= 35) return 'upright';
  if (meanTilt >= 55) return 'horizontal';
  return 'inclined';
}

/** Scores how well window statistics match a motion signature (0..1). */
export function scoreSignature(
  sig: MotionSignature,
  feat: Record<string, FeatureStats>,
  orientation: Orientation,
  view: 'front' | 'side',
  coact: (a: string, b: string) => number,
): number {
  let score = 1;
  if (sig.orientation !== 'any') {
    if (orientation !== sig.orientation) score *= orientation === 'inclined' ? 0.6 : 0.1;
  }
  for (const m of sig.moving) {
    const r = feat[m.feature]?.range ?? NaN;
    score *= Number.isNaN(r) ? 0.3 : r >= m.minRange ? 1 : 0.5 * (r / m.minRange);
  }
  for (const st of sig.still ?? []) {
    const r = feat[st.feature]?.range ?? NaN;
    if (Number.isNaN(r)) continue;
    score *= r <= st.maxRange ? 1 : Math.max(0.05, 1 - (r - st.maxRange) / st.maxRange);
  }
  for (const mc of sig.mean ?? []) {
    if (mc.view && mc.view !== view) continue;
    const m = feat[mc.feature]?.mean ?? NaN;
    if (Number.isNaN(m)) continue;
    if (mc.min !== undefined && m < mc.min)
      score *= Math.max(0.05, 1 - (mc.min - m) / Math.max(Math.abs(mc.min), 1e-3));
    if (mc.max !== undefined && m > mc.max)
      score *= Math.max(0.05, 1 - (m - mc.max) / Math.max(Math.abs(mc.max), 1e-3));
  }
  if (sig.alternating) {
    const [a, b] = sig.alternating;
    const c = coact(a, b);
    const ra = feat[a]?.range ?? 0;
    const rb = feat[b]?.range ?? 0;
    const moving = Math.min(1, Math.min(ra, rb) / 0.35);
    score *= Number.isNaN(c) ? 0.1 : (c < 0.35 ? 1 : 0.15) * moving;
  }
  if (sig.synchronous) {
    const c = coact(sig.synchronous[0], sig.synchronous[1]);
    if (!Number.isNaN(c) && c < 0.4) score *= 0.2;
  }
  return Math.max(0, Math.min(1, score));
}

/** Rule/feature-based classifier: body orientation + joint-motion signatures over a sliding window. */
export function createRuleClassifier(
  options: Partial<RuleClassifierOptions> = {},
): ExerciseClassifier {
  const opts = { ...DEFAULT_CLASSIFIER_OPTIONS, ...options };
  let window: { t: number; v: FrameVector }[] = [];

  return {
    push(skeleton, torsoRef) {
      window.push({ t: skeleton.t, v: frameVector(skeleton, torsoRef) });
      const cutoff = skeleton.t - opts.windowMs;
      while (window.length > 0 && window[0]!.t < cutoff) window.shift();
    },
    classify(): Classification[] {
      if (window.length < opts.minFrames) return [];
      const feat: Record<string, FeatureStats> = {};
      for (const f of CLASSIFIER_FEATURES) feat[f] = stats(window.map((w) => w.v[f]));
      const tilt = stats(window.map((w) => w.v.tilt)).mean;
      const sideVotes = window.filter((w) => w.v.view === 'side').length;
      const view = sideVotes >= window.length / 2 ? 'side' : 'front';
      const series = (k: string) => window.map((w) => w.v[k as keyof FrameVector] as number);
      const coact = (a: string, b: string) => coActivation(series(a), series(b));
      const orientation = orientationOf(tilt);
      return allExercises()
        .map((d) => ({
          exercise: d.id as ExerciseId,
          confidence: scoreSignature(d.signature, feat, orientation, view, coact),
        }))
        .filter((c) => c.confidence >= opts.minConfidence)
        .sort((a, b) => b.confidence - a.confidence);
    },
    reset() {
      window = [];
    },
  };
}
