import { View } from 'react-native';

import { getExerciseInfo } from '@/content';
import { ExerciseDemo, hasDemo } from '@/features/exercises';
import { useLooseT, useTranslation } from '@/i18n';
import { Button, Card, ProgressRing, Text, useTheme } from '@/ui';

import type { SessionStep } from '../domain/steps';
import { formatClock, stepTarget } from '../format';
import { usePlayerLayout } from './usePlayerLayout';

export interface RestViewProps {
  remainingMs: number;
  totalMs: number;
  next: SessionStep | null;
  onSkip: () => void;
  onExtend: () => void;
}

/** Rest timer ring with skip / +15 s and a looping preview of the next exercise. */
export function RestView({
  remainingMs: rawRemaining,
  totalMs,
  next,
  onSkip,
  onExtend,
}: RestViewProps) {
  const remainingMs = Math.min(rawRemaining, totalMs);
  const { landscape, ring } = usePlayerLayout();
  const { t } = useTranslation();
  const lt = useLooseT();
  const { spacing } = useTheme();
  const info = next?.exerciseId ? getExerciseInfo(next.exerciseId) : undefined;
  return (
    <View
      testID="rest-view"
      style={{
        flex: 1,
        flexDirection: landscape ? 'row' : 'column',
        alignItems: landscape ? 'center' : undefined,
        justifyContent: 'space-between',
        gap: spacing[4],
      }}
    >
      <View style={{ alignItems: 'center', gap: spacing[3], flex: 1, justifyContent: 'center' }}>
        <Text variant="overline" color="textMuted">
          {t('workout.rest')}
        </Text>
        <ProgressRing
          progress={totalMs > 0 ? remainingMs / totalMs : 0}
          size={Math.min(220, ring)}
          strokeWidth={12}
          color="info"
          accessibilityLabel={`${t('workout.rest')} ${formatClock(remainingMs)}`}
        >
          <Text variant="timer" testID="rest-timer" style={{ fontVariant: ['tabular-nums'] }}>
            {formatClock(remainingMs)}
          </Text>
        </ProgressRing>
        <View style={{ flexDirection: 'row', gap: spacing[2] }}>
          <Button
            testID="extend-rest"
            label={t('workout.addTime')}
            variant="secondary"
            onPress={onExtend}
          />
          <Button
            testID="skip-rest"
            label={t('workout.skipRest')}
            icon="play-skip-forward"
            onPress={onSkip}
          />
        </View>
      </View>
      {next ? (
        <Card elevated>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: spacing[4] }}>
            {next.exerciseId && hasDemo(next.exerciseId) ? (
              <ExerciseDemo exercise={next.exerciseId} width={96} height={96} />
            ) : null}
            <View style={{ flex: 1, gap: spacing[1] }}>
              <Text variant="caption" color="textMuted">
                {t('workout.restHint')}
              </Text>
              <Text variant="h3">{info?.name ?? t('workout.freeTitle')}</Text>
              <Text variant="caption" color="textMuted">
                {next.setCount > 0
                  ? `${t('workout.setOf', { set: next.setNumber, total: next.setCount })} · `
                  : ''}
                {stepTarget(next, lt)}
              </Text>
            </View>
          </View>
        </Card>
      ) : null}
    </View>
  );
}
