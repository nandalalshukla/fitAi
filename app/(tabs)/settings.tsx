import { router } from 'expo-router';
import { View } from 'react-native';

import { isEnabled } from '@/core';
import { AboutSection } from '@/features/settings/AboutSection';
import { AccountSection } from '@/features/settings/AccountSection';
import { RemindersSection } from '@/features/settings/RemindersSection';
import { VoiceSettingsSection } from '@/features/settings/VoiceSettingsSection';
import { WorkoutSettingsSection } from '@/features/settings/WorkoutSettingsSection';
import { useTranslation } from '@/i18n';
import {
  Card,
  ListItem,
  Screen,
  SectionHeader,
  Tabs,
  Text,
  useAppearanceStore,
  useTheme,
  type AppearancePreference,
} from '@/ui';

export default function SettingsScreen() {
  const { t } = useTranslation();
  const { spacing } = useTheme();
  const preference = useAppearanceStore((s) => s.preference);
  const setPreference = useAppearanceStore((s) => s.setPreference);

  return (
    <Screen testID="settings-screen">
      <Text variant="displayL" accessibilityRole="header">
        {t('settings.title')}
      </Text>
      <View style={{ gap: spacing[3] }}>
        <SectionHeader title={t('settings.appearance')} />
        <Tabs<AppearancePreference>
          testID="appearance-tabs"
          value={preference}
          onChange={setPreference}
          options={[
            { value: 'dark', label: t('settings.appearanceDark') },
            { value: 'light', label: t('settings.appearanceLight') },
            { value: 'system', label: t('settings.appearanceSystem') },
          ]}
        />
      </View>
      <WorkoutSettingsSection />
      <VoiceSettingsSection />
      <RemindersSection />
      <AccountSection />
      <AboutSection />
      {isEnabled('devTools') ? (
        <Card padding={2}>
          <ListItem
            icon="color-palette-outline"
            title={t('settings.designSystem')}
            onPress={() => router.push('/dev/design-system')}
          />
          <ListItem
            icon="body-outline"
            title={t('settings.poseLab')}
            onPress={() => router.push('/dev/pose-lab')}
          />
        </Card>
      ) : null}
    </Screen>
  );
}
