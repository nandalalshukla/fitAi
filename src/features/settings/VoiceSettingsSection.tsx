import { View } from 'react-native';

import { useVoiceCoach } from '@/features/voice';
import { useTranslation } from '@/i18n';
import { Button, Card, ListItem, SectionHeader, Switch, Tabs, Text, useTheme } from '@/ui';

import { useVoiceSettings } from './voiceSettingsStore';

/** Voice coach settings: on/off, verbosity, count cadence, speed, volume, test. */
export function VoiceSettingsSection() {
  const { t } = useTranslation();
  const { spacing } = useTheme();
  const s = useVoiceSettings();
  const coach = useVoiceCoach();

  const row = (label: string, child: React.ReactNode) => (
    <View style={{ gap: spacing[2] }}>
      <Text variant="label" color="textMuted">
        {label}
      </Text>
      {child}
    </View>
  );

  return (
    <View style={{ gap: spacing[3] }}>
      <SectionHeader title={t('settings.voice')} />
      <Card padding={2}>
        <ListItem
          icon="mic-outline"
          title={t('settings.voiceEnabled')}
          subtitle={t('settings.voiceEnabledHint')}
          trailing={
            <Switch
              testID="voice-enabled"
              value={s.enabled}
              onValueChange={(enabled) => s.update({ enabled })}
              accessibilityLabel={t('settings.voiceEnabled')}
            />
          }
        />
      </Card>
      {s.enabled ? (
        <View style={{ gap: spacing[4] }}>
          {row(
            t('settings.verbosity'),
            <Tabs
              testID="voice-verbosity"
              value={s.verbosity}
              onChange={(verbosity) => s.update({ verbosity })}
              options={[
                { value: 'minimal', label: t('settings.verbosityMinimal') },
                { value: 'standard', label: t('settings.verbosityStandard') },
                { value: 'coach', label: t('settings.verbosityCoach') },
              ]}
            />,
          )}
          {row(
            t('settings.repEvery'),
            <Tabs
              value={String(s.repEvery) as '1' | '5'}
              onChange={(v) => s.update({ repEvery: v === '5' ? 5 : 1 })}
              options={[
                { value: '1', label: t('settings.repEvery1') },
                { value: '5', label: t('settings.repEvery5') },
              ]}
            />,
          )}
          {row(
            t('settings.speed'),
            <Tabs
              value={s.rate < 0.95 ? 'slow' : s.rate > 1.1 ? 'fast' : 'normal'}
              onChange={(v) => s.update({ rate: v === 'slow' ? 0.85 : v === 'fast' ? 1.2 : 1.05 })}
              options={[
                { value: 'slow', label: t('settings.speedSlow') },
                { value: 'normal', label: t('settings.speedNormal') },
                { value: 'fast', label: t('settings.speedFast') },
              ]}
            />,
          )}
          {row(
            t('settings.volume'),
            <Tabs
              value={s.volume < 0.65 ? 'low' : s.volume < 0.9 ? 'medium' : 'high'}
              onChange={(v) => s.update({ volume: v === 'low' ? 0.5 : v === 'medium' ? 0.8 : 1 })}
              options={[
                { value: 'low', label: t('settings.volumeLow') },
                { value: 'medium', label: t('settings.volumeMedium') },
                { value: 'high', label: t('settings.volumeHigh') },
              ]}
            />,
          )}
          <Button
            testID="voice-test"
            label={t('settings.testVoice')}
            icon="volume-high-outline"
            variant="secondary"
            onPress={() => {
              coach.reset();
              coach.say({ id: 'next_exercise', textKey: 'voice.test' });
            }}
          />
        </View>
      ) : null}
    </View>
  );
}
