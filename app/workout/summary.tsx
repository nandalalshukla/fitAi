import { router, useLocalSearchParams } from 'expo-router';
import { useMemo } from 'react';
import { Share, View } from 'react-native';

import { getExerciseInfo } from '@/content';
import { currentStreak, useSessionQuery, useSessionsQuery, useSetsQuery } from '@/data';
import { useUserId } from '@/features/auth';
import { shareText, summarizeSession } from '@/features/workout-session';
import { useLooseT, useTranslation } from '@/i18n';
import {
  Button,
  Card,
  Confetti,
  ErrorState,
  Icon,
  ListItem,
  PulseIcon,
  Screen,
  SectionHeader,
  Skeleton,
  Stagger,
  StatTile,
  Text,
  useTheme,
} from '@/ui';

/** Session summary: totals, form score, calorie estimate, streak, personal bests, share. */
export default function WorkoutSummaryScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const { t } = useTranslation();
  const lt = useLooseT();
  const { spacing } = useTheme();
  const userId = useUserId();
  const q = useSessionQuery(id);
  const sessions = useSessionsQuery(userId);
  const allSets = useSetsQuery(userId);

  const summary = useMemo(() => {
    if (!q.data) return null;
    const earlier = (allSets.data ?? []).filter((s) => s.sessionId !== q.data!.session.id);
    return summarizeSession(q.data.sets, earlier);
  }, [q.data, allSets.data]);
  const streak = useMemo(() => currentStreak(sessions.data ?? [], new Date()), [sessions.data]);

  if (q.isLoading || !summary) {
    if (!q.isLoading && !q.data) {
      return (
        <Screen>
          <ErrorState
            title={t('summary.notFound')}
            retryLabel={t('summary.done')}
            onRetry={() => router.back()}
          />
        </Screen>
      );
    }
    return (
      <Screen>
        <Skeleton height={36} width="60%" />
        <Skeleton height={160} radius="lg" />
      </Screen>
    );
  }

  const session = q.data!.session;
  const minutes = Math.max(1, Math.round((session.durationS ?? 0) / 60));
  const name = (exerciseId: string) => getExerciseInfo(exerciseId)?.name ?? exerciseId;

  return (
    <View style={{ flex: 1 }}>
      <Screen testID="summary-screen" edges={['top', 'bottom']}>
        <Stagger index={0}>
          <Text variant="overline" color="accentText">
            {t('summary.subtitle')}
          </Text>
          <Text variant="displayL" accessibilityRole="header">
            {t('summary.title')}
          </Text>
        </Stagger>
        <Stagger index={1} style={{ flexDirection: 'row', gap: spacing[2] }}>
          <StatTile
            testID="summary-reps"
            label={t('summary.reps')}
            value={summary.totalReps}
            icon="repeat"
          />
          <StatTile label={t('summary.sets')} value={summary.setsDone} icon="layers-outline" />
          <StatTile label={t('summary.minutes')} value={minutes} icon="time-outline" />
        </Stagger>
        <Stagger index={2} style={{ flexDirection: 'row', gap: spacing[2] }}>
          <StatTile
            label={t('summary.form')}
            value={summary.avgQuality ?? '–'}
            unit={summary.avgQuality !== null ? '/100' : undefined}
            icon="body-outline"
          />
          <StatTile
            label={t('summary.calories')}
            value={session.caloriesEst ?? '–'}
            icon="flash-outline"
          />
        </Stagger>
        <Text variant="caption" color="textSubtle">
          {t('summary.caloriesNote')}
        </Text>
        {streak > 0 ? (
          <Stagger index={3}>
            <Card>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: spacing[3] }}>
                <Icon name="flame" color="ember" />
                <Text variant="h3">{t('summary.streak', { count: streak })}</Text>
              </View>
            </Card>
          </Stagger>
        ) : null}
        {summary.newBests.length > 0 ? (
          <Stagger index={4}>
            <Card elevated testID="personal-bests">
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: spacing[2] }}>
                <PulseIcon name="trophy" color="accentText" />
                <Text variant="h3">{t('summary.personalBest')}</Text>
              </View>
              {summary.newBests.map((b) => (
                <Text
                  key={`${b.exerciseId}-${b.kind}`}
                  variant="body"
                  style={{ marginTop: spacing[1] }}
                >
                  {t(b.kind === 'reps' ? 'summary.pbReps' : 'summary.pbHold', {
                    name: name(b.exerciseId),
                    value: b.value,
                    previous: b.previous,
                  })}
                </Text>
              ))}
            </Card>
          </Stagger>
        ) : null}
        <View style={{ gap: spacing[2] }}>
          <SectionHeader title={t('summary.exercises')} />
          <Card padding={2}>
            {summary.exercises.map((e) => (
              <ListItem
                key={e.exerciseId}
                title={name(e.exerciseId)}
                subtitle={[
                  t('workout.reps', { count: e.reps }),
                  e.heldSeconds > 0 ? t('workout.seconds', { count: e.heldSeconds }) : null,
                  e.avgQuality !== null ? `${t('summary.form')} ${e.avgQuality}` : null,
                ]
                  .filter(Boolean)
                  .join(' · ')}
              />
            ))}
          </Card>
        </View>
        <View style={{ flexDirection: 'row', gap: spacing[3] }}>
          <View style={{ flex: 1 }}>
            <Button
              testID="share-summary"
              label={t('summary.share')}
              icon="share-outline"
              variant="secondary"
              fullWidth
              onPress={() => void Share.share({ message: shareText(summary, minutes, streak, lt) })}
            />
          </View>
          <View style={{ flex: 1 }}>
            <Button
              testID="summary-done"
              label={t('summary.done')}
              fullWidth
              onPress={() => router.dismissTo('/')}
            />
          </View>
        </View>
      </Screen>
      <Confetti />
    </View>
  );
}
