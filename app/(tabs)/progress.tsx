import { router } from 'expo-router';
import { View } from 'react-native';

import { useTranslation } from '@/i18n';
import { EmptyState, Screen, Skeleton, Text, useTheme } from '@/ui';

export default function ProgressScreen() {
  const { t } = useTranslation();
  const { spacing } = useTheme();
  return (
    <Screen testID="progress-screen">
      <Text variant="displayL" accessibilityRole="header">
        {t('progress.title')}
      </Text>
      <View style={{ gap: spacing[2] }}>
        <Skeleton height={140} radius="lg" />
        <View style={{ flexDirection: 'row', gap: spacing[2] }}>
          <View style={{ flex: 1 }}>
            <Skeleton height={72} radius="md" />
          </View>
          <View style={{ flex: 1 }}>
            <Skeleton height={72} radius="md" />
          </View>
        </View>
      </View>
      <EmptyState
        icon="stats-chart-outline"
        title={t('progress.emptyTitle')}
        message={t('progress.emptyMessage')}
        actionLabel={t('today.startWorkout')}
        onAction={() => router.push('/workout')}
      />
    </Screen>
  );
}
