import { View } from 'react-native';
import type { SharedValue } from 'react-native-reanimated';

import type { ExerciseInfo } from '@/content';
import { ExerciseDemo, hasDemo } from '@/features/exercises';
import type { Pose } from '@/features/pose';
import { useLooseT, useTranslation } from '@/i18n';
import { Button, Card, Icon, Text, useTheme } from '@/ui';

import type { SessionStep } from '../domain/steps';
import { stepTarget } from '../format';
import { useBodyVisible } from './useBodyVisible';

export interface GetReadyProps {
  step: SessionStep;
  info: ExerciseInfo | undefined;
  /** Live pose for the framing check (null = manual mode). */
  pose: SharedValue<Pose | null> | null;
  onStart: () => void;
}

/**
 * Camera setup / positioning check before the first set (and after resuming):
 * how to place the phone, a demo of the movement, and a live "full body visible" check.
 */
export function GetReady({ step, info, pose, onStart }: GetReadyProps) {
  const { t } = useTranslation();
  const lt = useLooseT();
  const { spacing } = useTheme();
  const visible = useBodyVisible(pose);
  const demo = step.exerciseId && hasDemo(step.exerciseId) ? step.exerciseId : null;
  const needsCamera = pose !== null && (step.tracked !== null || step.exerciseId === null);
  return (
    <View testID="get-ready" style={{ flex: 1, justifyContent: 'space-between', gap: spacing[4] }}>
      <Card elevated>
        <View style={{ flexDirection: 'row', gap: spacing[4], alignItems: 'center' }}>
          {demo ? (
            <ExerciseDemo
              exercise={demo}
              width={110}
              height={110}
              accessibilityLabel={info?.name}
            />
          ) : null}
          <View style={{ flex: 1, gap: spacing[1] }}>
            <Text variant="overline" color="accentText">
              {t('workout.getReady')}
            </Text>
            <Text variant="h2">{info?.name ?? t('workout.freeTitle')}</Text>
            <Text variant="caption" color="textMuted">
              {stepTarget(step, lt)}
            </Text>
          </View>
        </View>
        {info ? (
          <View style={{ flexDirection: 'row', gap: spacing[2], marginTop: spacing[3] }}>
            <Icon name="phone-portrait-outline" size="md" color="textMuted" />
            <Text variant="caption" color="textMuted" style={{ flex: 1 }}>
              {info.camera}
            </Text>
          </View>
        ) : null}
      </Card>
      {needsCamera ? (
        <View
          testID="framing-status"
          accessibilityLiveRegion="polite"
          style={{
            flexDirection: 'row',
            alignItems: 'center',
            gap: spacing[2],
            justifyContent: 'center',
          }}
        >
          <Icon
            name={visible ? 'checkmark-circle' : 'scan-outline'}
            color={visible ? 'successText' : 'warningText'}
          />
          <Text variant="bodyStrong" color={visible ? 'successText' : 'warningText'}>
            {visible ? t('workout.bodyVisible') : t('workout.stepBack')}
          </Text>
        </View>
      ) : null}
      {needsCamera && visible === null ? (
        <Text variant="caption" color="textSubtle" align="center">
          {t('workout.lowLight')}
        </Text>
      ) : null}
      <Button
        testID="start-set"
        label={t('workout.startFirst')}
        icon="play"
        size="lg"
        fullWidth
        onPress={onStart}
      />
    </View>
  );
}
