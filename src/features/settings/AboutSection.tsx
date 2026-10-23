import Constants from 'expo-constants';
import { router } from 'expo-router';
import { Linking, View } from 'react-native';

import { env } from '@/core';
import { useTranslation } from '@/i18n';
import { Card, ListItem, SectionHeader, Switch, Text, useTheme } from '@/ui';

import { useWorkoutPrefs } from './workoutPrefsStore';

/** Privacy (analytics opt-out), legal documents, support, version. */
export function AboutSection() {
  const { t } = useTranslation();
  const { spacing } = useTheme();
  const analytics = useWorkoutPrefs((s) => s.analyticsEnabled);
  const update = useWorkoutPrefs((s) => s.update);
  const support = env.EXPO_PUBLIC_SUPPORT_EMAIL;

  return (
    <View style={{ gap: spacing[3] }}>
      <SectionHeader title={t('settings.privacy')} />
      <Card padding={2}>
        <ListItem
          icon="analytics-outline"
          title={t('settings.analytics')}
          subtitle={t('settings.analyticsHint')}
          trailing={
            <Switch
              testID="pref-analytics"
              value={analytics}
              onValueChange={(analyticsEnabled) => update({ analyticsEnabled })}
              accessibilityLabel={t('settings.analytics')}
            />
          }
        />
      </Card>
      <SectionHeader title={t('settings.about')} />
      <Card padding={2}>
        <ListItem
          icon="shield-checkmark-outline"
          title={t('settings.privacyPolicy')}
          onPress={() => router.push({ pathname: '/legal/[doc]', params: { doc: 'privacy' } })}
        />
        <ListItem
          icon="document-text-outline"
          title={t('settings.terms')}
          onPress={() => router.push({ pathname: '/legal/[doc]', params: { doc: 'terms' } })}
        />
        <ListItem
          icon="medkit-outline"
          title={t('settings.disclaimer')}
          onPress={() => router.push({ pathname: '/legal/[doc]', params: { doc: 'disclaimer' } })}
        />
        {support ? (
          <ListItem
            icon="chatbubble-ellipses-outline"
            title={t('settings.support')}
            onPress={() =>
              void Linking.openURL(
                `mailto:${support}?subject=${encodeURIComponent('FormFit feedback')}`,
              )
            }
          />
        ) : null}
      </Card>
      <Text variant="caption" color="textSubtle" align="center">
        {t('settings.version', { version: Constants.expoConfig?.version ?? '–' })}
      </Text>
    </View>
  );
}
