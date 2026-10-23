import type { PlanSource } from '../schema';
import { advancedCalisthenics } from './advancedCalisthenics';
import { beginnerFoundations } from './beginnerFoundations';
import { corePosture } from './corePosture';
import { express15 } from './express15';
import { fullBodyFatBurn } from './fullBodyFatBurn';
import { lowerBodyGlutes } from './lowerBodyGlutes';
import { lowImpactBasics } from './lowImpactBasics';
import { mobilityFlexibility } from './mobilityFlexibility';
import { muscleBuilder } from './muscleBuilder';
import { sixPackAbs } from './sixPackAbs';
import { upperBodyStrength } from './upperBodyStrength';

/** All plan sources, in library order. Design rationale: docs/CONTENT_RESEARCH.md. */
export const planSources: readonly PlanSource[] = [
  sixPackAbs,
  beginnerFoundations,
  fullBodyFatBurn,
  muscleBuilder,
  upperBodyStrength,
  lowerBodyGlutes,
  corePosture,
  mobilityFlexibility,
  express15,
  lowImpactBasics,
  advancedCalisthenics,
];
