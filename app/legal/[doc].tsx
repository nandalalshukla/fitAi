import { router, useLocalSearchParams } from 'expo-router';
import { Linking, View } from 'react-native';

import { env } from '@/core';
import { useTranslation } from '@/i18n';
import { Button, Icon, PressableScale, Screen, Text, useTheme } from '@/ui';

const DOCS = ['privacy', 'terms', 'disclaimer'] as const;
type Doc = (typeof DOCS)[number];

/** In-app summaries of the privacy policy, terms and health disclaimer (work offline). */
export default function LegalScreen() {
  const { doc } = useLocalSearchParams<{ doc: string }>();
  const { t } = useTranslation();
  const { spacing, colors, hitTarget, radii } = useTheme();
  const d: Doc = (DOCS as readonly string[]).includes(doc ?? '') ? (doc as Doc) : 'privacy';
  const body = t(`legal.${d}Body`, { returnObjects: true }) as readonly string[];
  const fullUrl =
    d === 'privacy'
      ? env.EXPO_PUBLIC_PRIVACY_URL
      : d === 'terms'
        ? env.EXPO_PUBLIC_TERMS_URL
        : undefined;
  return (
    <Screen testID="legal-screen">
      <PressableScale
        accessibilityLabel={t('common.close')}
        onPress={() => router.back()}
        style={{
          width: hitTarget,
          height: hitTarget,
          borderRadius: radii.pill,
          backgroundColor: colors.surface,
          alignItems: 'center',
          justifyContent: 'center',
        }}
      >
        <Icon name="chevron-back" />
      </PressableScale>
      <Text variant="displayM" accessibilityRole="header">
        {t(`legal.${d}Title`)}
      </Text>
      <View style={{ gap: spacing[3] }}>
        {body.map((p) => (
          <Text key={p} variant="bodyL">
            {p}
          </Text>
        ))}
      </View>
      {fullUrl ? (
        <Button
          testID="legal-full"
          label={t('legal.readFull')}
          variant="secondary"
          icon="open-outline"
          onPress={() => void Linking.openURL(fullUrl)}
        />
      ) : (
        <Text variant="caption" color="textMuted">
          {t('legal.full')}
        </Text>
      )}
    </Screen>
  );
}
