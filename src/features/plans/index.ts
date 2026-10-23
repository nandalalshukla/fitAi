/** Plans feature public API. Pure schedule logic lives in ./domain. */
export * from './domain/schedule';
export { useActivePlan, useEnrollPlan, useAdvancePlan, advancePlan } from './hooks';
export type { ActivePlan } from './hooks';
