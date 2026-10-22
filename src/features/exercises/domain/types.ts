import type { CameraView } from '@/features/pose/domain/geometry';
import type { JointName, Side, Skeleton } from '@/features/pose/domain/skeleton';

export type ExerciseId =
  | 'squat'
  | 'push_up'
  | 'jumping_jack'
  | 'plank'
  | 'sit_up'
  | 'crunch'
  | 'lunge'
  | 'high_knees'
  | 'mountain_climber'
  | 'glute_bridge'
  | 'leg_raise';

export type Difficulty = 'beginner' | 'intermediate' | 'advanced';
export type Severity = 'info' | 'warning' | 'critical';
export type ExerciseCategory = 'lower_body' | 'upper_body' | 'core' | 'cardio' | 'full_body';
export type Muscle =
  | 'quads'
  | 'glutes'
  | 'hamstrings'
  | 'calves'
  | 'chest'
  | 'triceps'
  | 'shoulders'
  | 'abs'
  | 'obliques'
  | 'hip_flexors'
  | 'lower_back'
  | 'adductors';

/** Named per-frame measurements (angles in degrees, distances in torso lengths). NaN = unavailable. */
export type Features = Record<string, number>;

export interface FeatureContext {
  skeleton: Skeleton;
  /** Side chosen for side-view measurements (most visible). */
  side: Side;
  view: CameraView;
  /**
   * Reference torso length in px (scale reference): the running maximum of the 2D
   * torso length, slowly decaying, so forward lean/foreshortening doesn't shrink it.
   */
  torso: number;
}

/** Every rep-based exercise defines these four thresholds (units of its signal). */
export interface RepThresholds {
  /** Signal value of the start/rest position (e.g. knee 160° standing). */
  start: number;
  /** Value that must be reached for a counted rep (e.g. knee 100°). */
  peak: number;
  /** Reaching this but not `peak` = partial ("go lower") rep. */
  partial: number;
  /** Ideal value: full range-of-motion score when reached. */
  target: number;
}

export type ThresholdSet = Record<string, number>;

/** Typed thresholds with per-difficulty and per-camera-view overrides (no magic numbers in logic). */
export interface ThresholdConfig<T extends ThresholdSet> {
  base: T;
  difficulty?: Partial<Record<Difficulty, Partial<T>>>;
  view?: Partial<Record<CameraView, Partial<T>>>;
}

export type RepPhase = 'idle' | 'start' | 'descending' | 'peak' | 'ascending';

export interface RepCounterConfig {
  /** Feature key(s) driving the counter. Several = independent counters summed (alternating sides). */
  signals: readonly string[];
  /** Whether the peak is reached by the signal going below or above the thresholds. */
  peakWhen: 'below' | 'above';
  /** Minimum time a phase must last to count (noise rejection), ms. */
  minPhaseMs: number;
  /** Minimum time between counted reps on one signal (double-count guard), ms. */
  minRepMs: number;
}

export interface RepSummary {
  index: number;
  signal: string;
  startT: number;
  endT: number;
  durationMs: number;
  /** Most extreme signal value reached (deepest point). */
  extreme: number;
  /** Min / max of every feature during the rep. */
  min: Features;
  max: Features;
}

/** i18n keys (see src/i18n/locales/en.ts → cues.* and form.*). */
export type CueKey = `cues.${string}`;
export type MessageKey = `form.${string}`;

export interface FormRule<T extends ThresholdSet> {
  id: string;
  severity: Severity;
  /** Short spoken cue. */
  cue: CueKey;
  /** On-screen message. */
  message: MessageKey;
  /** Minimum time between two announcements of this rule, ms. */
  cooldownMs: number;
  /** 'frame' rules run every frame; 'rep' rules once per completed rep. */
  when: 'frame' | 'rep';
  /** Frame rules: only in these rep phases (default: any). */
  phases?: readonly RepPhase[];
  /** Only evaluated for these camera views (default: any). */
  views?: readonly CameraView[];
  /** Frame rules: violation must persist this long before firing (debounce), ms. */
  persistMs?: number;
  /** Returns true when the rule is VIOLATED. NaN features should return false. */
  check: (f: Features, th: T, rep: RepSummary | null) => boolean;
}

export interface HoldConfig<T extends ThresholdSet> {
  inPosition: (f: Features, th: T) => boolean;
  /** Announce every N seconds held. */
  milestoneEveryS: number;
  /** Out-of-position time tolerated before the hold pauses, ms. */
  graceMs: number;
}

export interface CameraPlacement {
  view: CameraView | 'either';
  /** Recommended distance from the camera, metres. */
  distanceM: readonly [number, number];
  orientation: 'portrait' | 'landscape';
  /** i18n key with placement tips. */
  tipKey: `placement.${string}`;
}

/**
 * Generic features computed by the exercise classifier for every frame
 * (see classifier/windowFeatures.ts). Signatures may only reference these.
 */
export type ClassifierFeature =
  | 'knee' // min knee angle (L/R)
  | 'hip' // min shoulder-hip-knee angle (L/R)
  | 'leftHip' // shoulder-knee distance / torso (left): shrinks as the knee drives up
  | 'rightHip'
  | 'elbow' // min elbow angle (L/R)
  | 'armRaise' // mean hip-shoulder-wrist angle
  | 'spread' // ankle distance / torso
  | 'stance' // horizontal ankle distance / torso
  | 'trunk' // trunk lift above horizontal
  | 'legs' // shoulder-hip-ankle angle (best side)
  | 'kneeHeight' // knees above hips (+) / below (−), torso lengths — supine knees-up vs prone
  | 'hipY'; // hip-centre height in torso lengths (its range = how much the hips travel)

/** Signature used by the rule-based exercise classifier. */
export interface MotionSignature {
  orientation: 'upright' | 'horizontal' | 'inclined' | 'any';
  /** Features that should oscillate, with the minimum range (max-min) over the window. */
  moving: readonly { feature: ClassifierFeature; minRange: number }[];
  /** Features that should stay still (maximum range). */
  still?: readonly { feature: ClassifierFeature; maxRange: number }[];
  /** Constraints on a feature's window mean (optionally only for one camera view). */
  mean?: readonly { feature: ClassifierFeature; min?: number; max?: number; view?: CameraView }[];
  /** Two features that alternate (anti-phase), e.g. left/right hip flexion. */
  alternating?: readonly [ClassifierFeature, ClassifierFeature];
  /** Two features that move together (in phase), e.g. both legs in a squat. */
  synchronous?: readonly [ClassifierFeature, ClassifierFeature];
}

export interface ExerciseDefinition<T extends ThresholdSet = ThresholdSet> {
  id: ExerciseId;
  /** i18n key, e.g. 'exercises.names.squat'. */
  nameKey: `exercises.names.${string}`;
  category: ExerciseCategory;
  primaryMuscles: readonly Muscle[];
  secondaryMuscles: readonly Muscle[];
  cameraPlacement: CameraPlacement;
  /** Logical joints that must be visible; `sides: 'best'` uses the more visible side. */
  required: { joints: readonly JointName[]; sides: 'best' | 'both' };
  mode: 'reps' | 'hold';
  thresholds: ThresholdConfig<T>;
  /** Per-frame measurements. */
  features: (ctx: FeatureContext, th: T) => Features;
  counter?: RepCounterConfig;
  hold?: HoldConfig<T>;
  rules: readonly FormRule<T>[];
  /** Cue spoken for partial reps (didn't reach `peak`). */
  partialRepCue?: CueKey;
  /** Reps faster than this are flagged ("slow down"). */
  tempo?: { minRepMs: number };
  signature: MotionSignature;
}

export type EngineEvent =
  | {
      type: 'rep';
      t: number;
      reps: number;
      quality: number;
      durationMs: number;
      tooFast: boolean;
      violations: string[];
    }
  | { type: 'partial_rep'; t: number; cue: CueKey | null }
  | {
      type: 'form';
      t: number;
      ruleId: string;
      severity: Severity;
      cue: CueKey;
      message: MessageKey;
    }
  | { type: 'visibility'; t: number; visible: boolean; missing: number[] }
  | { type: 'hold'; t: number; inPosition: boolean; heldMs: number }
  | { type: 'hold_milestone'; t: number; seconds: number }
  | { type: 'tempo'; t: number; cue: CueKey };
