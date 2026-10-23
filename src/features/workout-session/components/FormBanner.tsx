import { View } from 'react-native';
import Animated, { FadeIn, FadeOut, SlideInUp, SlideOutUp } from 'react-native-reanimated';

import { useTranslation } from '@/i18n';
import { Icon, Text, useMotion, useTheme } from '@/ui';

export interface FormBannerProps {
  /** i18n key of the message (form.* or cues.*), or null to hide. */
  messageKey: string | null;
  severity: string;
}

/**
 * Form feedback banner that slides in from the top. Severity is conveyed by icon
 * and text as well as colour; announced to screen readers as a live region.
 */
export function FormBanner({ messageKey, severity }: FormBannerProps) {
  const { t } = useTranslation();
  const { colors, spacing, radii } = useTheme();
  const { reduceMotion } = useMotion();
  if (!messageKey) return null;
  const critical = severity === 'critical';
  const info = severity === 'info';
  const bg = critical ? colors.danger : info ? colors.surfaceElevated : colors.warning;
  const fg = critical || !info ? 'onStatus' : 'text';
  return (
    <Animated.View
      key={messageKey}
      entering={reduceMotion ? FadeIn : SlideInUp.springify().damping(18)}
      exiting={reduceMotion ? FadeOut : SlideOutUp}
      testID="form-banner"
      accessibilityLiveRegion="polite"
      accessibilityRole="alert"
      style={{
        flexDirection: 'row',
        alignItems: 'center',
        gap: spacing[3],
        padding: spacing[4],
        borderRadius: radii.lg,
        backgroundColor: bg,
      }}
    >
      <Icon name={critical ? 'alert-circle' : info ? 'information-circle' : 'warning'} color={fg} />
      <View style={{ flex: 1 }}>
        <Text variant="bodyStrong" color={fg}>
          {t(messageKey as never)}
        </Text>
      </View>
    </Animated.View>
  );
}
