import { router } from 'expo-router';
import { View } from 'react-native';

import { isEnabled } from '@/core';
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
      {isEnabled('devTools') ? (
        <Card padding={2}>
          <ListItem
            icon="color-palette-outline"
            title={t('settings.designSystem')}
            onPress={() => router.push('/dev/design-system')}
          />
        </Card>
      ) : null}
    </Screen>
  );
}
