import type { PlanSource } from '../schema';
import { beginnerFoundations } from './beginnerFoundations';
import { fullBodyFatBurn } from './fullBodyFatBurn';
import { sixPackAbs } from './sixPackAbs';

/** All plan sources, in library order. */
export const planSources: readonly PlanSource[] = [
  sixPackAbs,
  beginnerFoundations,
  fullBodyFatBurn,
];
