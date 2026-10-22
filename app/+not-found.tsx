import { router } from 'expo-router';

import { useTranslation } from '@/i18n';
import { EmptyState, Screen } from '@/ui';

export default function NotFoundScreen() {
  const { t } = useTranslation();
  return (
    <Screen scroll={false} contentStyle={{ justifyContent: 'center' }}>
      <EmptyState
        icon="compass-outline"
        title={t('errors.notFoundTitle')}
        message={t('errors.notFoundMessage')}
        actionLabel={t('errors.goHome')}
        onAction={() => router.replace('/')}
      />
    </Screen>
  );
}
