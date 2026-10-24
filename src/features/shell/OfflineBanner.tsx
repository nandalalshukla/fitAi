import NetInfo from '@react-native-community/netinfo';
import { useEffect, useState } from 'react';
import Animated, { FadeInUp, FadeOutUp } from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { useTranslation } from '@/i18n';
import { Icon, Text, useTheme } from '@/ui';

/**
 * Small "Offline — saved on this phone" pill. Everything keeps working offline
 * (local-first); the banner only explains why nothing syncs.
 */
export function OfflineBanner() {
  const { t } = useTranslation();
  const { colors, spacing, radii } = useTheme();
  const insets = useSafeAreaInsets();
  const [offline, setOffline] = useState(false);
  useEffect(
    () =>
      NetInfo.addEventListener((s) =>
        setOffline(s.isConnected === false || s.isInternetReachable === false),
      ),
    [],
  );
  if (!offline) return null;
  return (
    <Animated.View
      entering={FadeInUp}
      exiting={FadeOutUp}
      pointerEvents="none"
      testID="offline-banner"
      accessibilityLiveRegion="polite"
      style={{
        position: 'absolute',
        top: insets.top + spacing[1],
        alignSelf: 'center',
        flexDirection: 'row',
        alignItems: 'center',
        gap: spacing[1],
        paddingHorizontal: spacing[3],
        paddingVertical: spacing[1],
        borderRadius: radii.pill,
        backgroundColor: colors.surfaceElevated,
        borderWidth: 1,
        borderColor: colors.borderStrong,
      }}
    >
      <Icon name="cloud-offline-outline" size="sm" color="textMuted" />
      <Text variant="caption" color="textMuted">
        {t('errors.offline')}
      </Text>
    </Animated.View>
  );
}
