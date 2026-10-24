import { useWindowDimensions } from 'react-native';

import { useTheme } from '@/ui';

/**
 * Player layout metrics: landscape (phone on the floor, sideways) puts the counter
 * beside the controls; the ring shrinks to fit small phones (iPhone SE) and short
 * landscape heights.
 */
export function usePlayerLayout() {
  const { width, height } = useWindowDimensions();
  const { hitTarget, spacing } = useTheme();
  const landscape = width > height;
  const sideButtons = 2 * (hitTarget + 8) + 2 * spacing[4] + 2 * spacing[5];
  const ring = Math.round(
    Math.max(140, Math.min(260, landscape ? height * 0.55 : width - sideButtons)),
  );
  return { landscape, ring };
}
