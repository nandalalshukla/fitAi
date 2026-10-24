import { useEffect, useState } from 'react';
import { StyleSheet, View } from 'react-native';
import Animated, { FadeIn, FadeOut, ZoomIn, ZoomOut } from 'react-native-reanimated';

import { useTranslation } from '@/i18n';
import { Icon, Text, useMotion, useTheme } from '@/ui';

const VISIBLE_MS = 1100;

/**
 * Brief "Set complete" celebration (spring-in check) whenever `count` increases.
 * Decorative for sighted users; the voice coach announces it too. Fade-only under Reduce Motion.
 */
export function SetCompleteBurst({ count }: { count: number }) {
  // Sets already done when the player opened (e.g. resuming) are not celebrated.
  const [initial] = useState(count);
  if (count <= initial) return null;
  return <Burst key={count} />;
}

function Burst() {
  const { t } = useTranslation();
  const { colors, spacing, radii } = useTheme();
  const { reduceMotion } = useMotion();
  const [visible, setVisible] = useState(true);
  useEffect(() => {
    const id = setTimeout(() => setVisible(false), VISIBLE_MS);
    return () => clearTimeout(id);
  }, []);
  if (!visible) return null;
  return (
    <View pointerEvents="none" style={[StyleSheet.absoluteFill, styles.center]}>
      <Animated.View
        testID="set-complete-burst"
        entering={reduceMotion ? FadeIn : ZoomIn.springify().damping(12)}
        exiting={reduceMotion ? FadeOut : ZoomOut}
        style={[
          styles.center,
          {
            gap: spacing[2],
            padding: spacing[6],
            borderRadius: radii.xl,
            backgroundColor: colors.surfaceElevated,
            borderWidth: 2,
            borderColor: colors.success,
          },
        ]}
      >
        <Icon name="checkmark-circle" size="xxl" color="successText" />
        <Text variant="h2">{t('voice.setComplete')}</Text>
      </Animated.View>
    </View>
  );
}

const styles = StyleSheet.create({ center: { alignItems: 'center', justifyContent: 'center' } });
