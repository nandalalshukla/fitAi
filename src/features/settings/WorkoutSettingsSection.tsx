import { useQueryClient } from '@tanstack/react-query';
import { View } from 'react-native';

import { getDataRuntime, queryKeys, requestSync, useProfileQuery } from '@/data';
import { useUserId } from '@/features/auth';
import { HIGH_ACCURACY_POSE_MODEL, isModelAvailable } from '@/features/pose';
import { useTranslation } from '@/i18n';
import { Card, ListItem, SectionHeader, Switch, Tabs, Text, useTheme } from '@/ui';

import { useWorkoutPrefs } from './workoutPrefsStore';

/** Camera coach, overlays, camera, model accuracy and units. */
export function WorkoutSettingsSection() {
  const { t } = useTranslation();
  const { spacing } = useTheme();
  const p = useWorkoutPrefs();
  const userId = useUserId();
  const profile = useProfileQuery(userId);
  const qc = useQueryClient();
  const units = profile.data?.units ?? 'metric';

  const setUnits = async (u: 'metric' | 'imperial') => {
    if (!userId) return;
    await getDataRuntime().repos.profiles.save(userId, { units: u });
    await qc.invalidateQueries({ queryKey: queryKeys.profile(userId) });
    requestSync();
  };

  const toggle = (
    title: string,
    value: boolean,
    onChange: (v: boolean) => void,
    subtitle?: string,
    testID?: string,
  ) => (
    <ListItem
      title={title}
      subtitle={subtitle}
      trailing={
        <Switch testID={testID} value={value} onValueChange={onChange} accessibilityLabel={title} />
      }
    />
  );
  const row = (label: string, child: React.ReactNode, hint?: string) => (
    <View style={{ gap: spacing[2] }}>
      <Text variant="label" color="textMuted">
        {label}
      </Text>
      {child}
      {hint ? (
        <Text variant="caption" color="textSubtle">
          {hint}
        </Text>
      ) : null}
    </View>
  );

  return (
    <View style={{ gap: spacing[3] }}>
      <SectionHeader title={t('settings.workout')} />
      <Card padding={2}>
        {toggle(
          t('settings.useCamera'),
          p.useCamera,
          (useCamera) => p.update({ useCamera }),
          t('settings.useCameraHint'),
          'pref-camera',
        )}
        {toggle(
          t('settings.skeleton'),
          p.showSkeleton,
          (showSkeleton) => p.update({ showSkeleton }),
          undefined,
          'pref-skeleton',
        )}
        {toggle(
          t('settings.ghost'),
          p.showGhost,
          (showGhost) => p.update({ showGhost }),
          t('settings.ghostHint'),
          'pref-ghost',
        )}
      </Card>
      {row(
        t('settings.camera'),
        <Tabs
          testID="pref-camera-position"
          value={p.cameraPosition}
          onChange={(cameraPosition) => p.update({ cameraPosition })}
          options={[
            { value: 'front', label: t('settings.cameraFront') },
            { value: 'back', label: t('settings.cameraBack') },
          ]}
        />,
      )}
      {isModelAvailable(HIGH_ACCURACY_POSE_MODEL)
        ? row(
            t('settings.accuracy'),
            <Tabs
              testID="pref-accuracy"
              value={p.modelAccuracy}
              onChange={(modelAccuracy) => p.update({ modelAccuracy })}
              options={[
                { value: 'standard', label: t('settings.accuracyStandard') },
                { value: 'high', label: t('settings.accuracyHigh') },
              ]}
            />,
            t('settings.accuracyHint'),
          )
        : null}
      {row(
        t('settings.units'),
        <Tabs
          testID="pref-units"
          value={units}
          onChange={(u) => void setUnits(u)}
          options={[
            { value: 'metric', label: t('settings.unitsMetric') },
            { value: 'imperial', label: t('settings.unitsImperial') },
          ]}
        />,
      )}
    </View>
  );
}
