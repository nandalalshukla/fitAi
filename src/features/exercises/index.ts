/** Exercise feature public API. Pure engine/classifier logic lives in ./domain. */
export { ExerciseHud } from './dev/ExerciseHud';
export { usePoseRecorder } from './dev/usePoseRecorder';
export { allExercises, getExercise, hasExercise } from './domain/registry';
export { createEngine, processPose, engineSnapshot, adjustReps } from './domain/engine';
export type { EngineSnapshot, EngineState, EngineOptions } from './domain/engine';
export { createRuleClassifier, createModeController } from './domain/classifier';
export type * from './domain/types';
export { ANIMATIONS } from './animation/keyframes/library';
export { useLiveExercise } from './hooks/useLiveExercise';
export type { LiveExerciseState, LiveFormLevel } from './hooks/useLiveExercise';
export { ExerciseDemo, hasDemo, stepTime } from './components/ExerciseDemo';
export type { DemoAnnotation } from './components/ExerciseDemo';
export { CUE_ANCHORS } from './components/demoAnnotations';
