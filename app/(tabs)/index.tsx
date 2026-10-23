import { useQueryClient } from '@tanstack/react-query';
import { router } from 'expo-router';
import { useMemo } from 'react';
import { View } from 'react-native';

import { getExerciseInfo, type CompiledSession } from '@/content';
import {
  currentStreak,
  getDataRuntime,
  queryKeys,
  useInProgressSessionQuery,
  useSessionsQuery,
} from '@/data';
import { useUserId } from '@/features/auth';
import { sessionsThisWeek } from '@/features/history';
import { planProgress, useActivePlan, useAdvancePlan, weekOverview } from '@/features/plans';
import { formatPrescription } from '@/features/workout-session/format';
import { useLooseT, useTranslation } from '@/i18n';
import {
  Button,
  Card,
  EmptyState,
  ExerciseTile,
  Icon,
  ProgressRing,
  Screen,
  SectionHeader,
  Skeleton,
  Stagger,
  StatTile,
  Text,
  useTheme,
} from '@/ui';

/** Home / Today: today's session (one tap to start), resume, week strip, streak. */
export default function TodayScreen() {
  const { t } = useTranslation();
  const lt = useLooseT();
  const { spacing } = useTheme();
  const qc = useQueryClient();
  const userId = useUserId();
  const active = useActivePlan();
  const sessions = useSessionsQuery(userId);
  const inProgress = useInProgressSessionQuery(userId);
  const advance = useAdvancePlan();

  const now = new Date();
  const streak = useMemo(() => currentStreak(sessions.data ?? [], new Date()), [sessions.data]);
  const doneThisWeek = useMemo(
    () => sessionsThisWeek(sessions.data ?? [], new Date()),
    [sessions.data],
  );

  if (active.isLoading) {
    return (
      <Screen testID="today-screen">
        <Skeleton height={36} width="50%" />
        <Skeleton height={200} radius="lg" />
      </Screen>
    );
  }

  const a = active.data;
  const today = a?.today;
  const isRest = today?.type === 'rest';
  const goal = a?.plan.daysPerWeek ?? 3;

  const discard = async () => {
    if (!inProgress.data) return;
    const { workouts } = getDataRuntime().repos;
    const sets = await workouts.getSets(inProgress.data.id);
    const done = sets.some((s) => !s.formFlags.includes('skipped'));
    await workouts.finishSession(inProgress.data.id, done ? 'completed' : 'abandoned');
    await qc.invalidateQueries({ queryKey: queryKeys.all(userId) });
  };

  return (
    <Screen testID="today-screen">
      <Stagger index={0}>
        <Text variant="overline" color="textMuted">
          {now.toLocaleDateString(undefined, { weekday: 'long', day: 'numeric', month: 'long' })}
        </Text>
        <Text variant="displayL" accessibilityRole="header">
          {isRest ? t('today.restGreeting') : t('today.greeting')}
        </Text>
      </Stagger>

      {inProgress.data ? (
        <Stagger index={1}>
          <Card elevated testID="resume-card">
            <View style={{ flexDirection: 'row', gap: spacing[3], alignItems: 'center' }}>
              <Icon name="play-circle" color="accentText" size="xl" />
              <View style={{ flex: 1 }}>
                <Text variant="h3">{t('today.resumeTitle')}</Text>
                <Text variant="caption" color="textMuted">
                  {t('today.resumeBody')}
                </Text>
              </View>
            </View>
            <View style={{ flexDirection: 'row', gap: spacing[2], marginTop: spacing[3] }}>
              <View style={{ flex: 1 }}>
                <Button
                  testID="resume-workout"
                  label={t('today.resume')}
                  fullWidth
                  onPress={() =>
                    router.push({ pathname: '/workout', params: { resume: inProgress.data!.id } })
                  }
                />
              </View>
              <Button
                testID="discard-workout"
                label={t('today.discard')}
                variant="secondary"
                onPress={() => void discard()}
              />
            </View>
          </Card>
        </Stagger>
      ) : null}

      {!a ? (
        <EmptyState
          testID="no-plan"
          icon="list-outline"
          title={t('today.noPlanTitle')}
          message={t('today.noPlanMessage')}
          actionLabel={t('today.browsePlans')}
          onAction={() => router.push('/plans')}
        />
      ) : (
        <Stagger index={2}>
          <Card elevated padding={5} testID="today-card">
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: spacing[4] }}>
              <ProgressRing
                progress={planProgress(a.plan, a.enrollment.currentDay)}
                size={84}
                strokeWidth={8}
                gradient
                accessibilityLabel={t('today.dayOf', { day: today!.day, total: a.plan.totalDays })}
              >
                <Text variant="h3">D{today!.day}</Text>
              </ProgressRing>
              <View style={{ flex: 1, gap: spacing[1] }}>
                <Text variant="overline" color="accentText">
                  {a.plan.title} · {t('today.week', { week: today!.week })}
                </Text>
                <Text variant="h2">
                  {isRest
                    ? t('today.restDayTitle')
                    : today!.type === 'active_recovery'
                      ? t('today.activeRecovery')
                      : today!.session!.title}
                </Text>
                <Text variant="caption" color="textMuted">
                  {isRest
                    ? t('today.restDayBody')
                    : `${t('common.minutes', { count: today!.session!.estimatedMinutes })} · ${t('today.exercisesCount', { count: countExercises(today!.session!) })}`}
                </Text>
                {today!.deload ? (
                  <Text variant="caption" color="accentText">
                    {t('today.deload')}
                  </Text>
                ) : null}
              </View>
            </View>
            {isRest ? (
              <Button
                testID="rest-done"
                label={t('today.restDone')}
                variant="secondary"
                fullWidth
                loading={advance.isPending}
                style={{ marginTop: spacing[5] }}
                onPress={() => advance.mutate({ enrollment: a.enrollment, plan: a.plan })}
              />
            ) : (
              <Button
                testID="start-workout"
                label={t('today.startWorkout')}
                icon="play"
                size="lg"
                fullWidth
                style={{ marginTop: spacing[5] }}
                onPress={() => router.push({ pathname: '/workout', params: { mode: 'plan' } })}
              />
            )}
          </Card>
        </Stagger>
      )}

      {a ? (
        <Stagger index={3}>
          <WeekStrip currentDay={a.enrollment.currentDay} plan={a.plan} />
        </Stagger>
      ) : null}

      <Stagger index={4} style={{ flexDirection: 'row', gap: spacing[3] }}>
        <StatTile
          testID="streak-tile"
          label={t('today.streak')}
          value={streak}
          icon="flame"
          iconColor="ember"
          animateIcon={streak > 0}
        />
        <StatTile
          label={t('today.weekly')}
          value={`${doneThisWeek}/${goal}`}
          icon="calendar-outline"
        />
      </Stagger>

      {today?.session ? (
        <View style={{ gap: spacing[3] }}>
          <SectionHeader title={t('today.todayWorkout')} />
          {today.session.blocks
            .filter((b) => b.kind === 'main' || b.kind === 'finisher')
            .flatMap((b) => b.items)
            .map((item, i) => {
              const info = getExerciseInfo(item.exerciseId);
              return (
                <Stagger key={`${item.exerciseId}-${i}`} index={i + 5}>
                  <ExerciseTile
                    name={info?.name ?? item.exerciseId}
                    prescription={formatPrescription(item, info?.perSide ?? false, lt)}
                    cameraTracked={Boolean(info?.tracked)}
                    onPress={() =>
                      router.push({ pathname: '/exercise/[id]', params: { id: item.exerciseId } })
                    }
                  />
                </Stagger>
              );
            })}
        </View>
      ) : null}

      <Button
        testID="quick-start"
        label={t('today.quickStart')}
        variant="secondary"
        icon="scan-outline"
        onPress={() => router.push({ pathname: '/workout', params: { mode: 'free' } })}
      />
    </Screen>
  );
}

function countExercises(s: CompiledSession): number {
  return new Set(s.blocks.flatMap((b) => b.items.map((i) => i.exerciseId))).size;
}

function WeekStrip({
  currentDay,
  plan,
}: {
  currentDay: number;
  plan: Parameters<typeof weekOverview>[0];
}) {
  const { t } = useTranslation();
  const { colors, spacing, radii } = useTheme();
  const week = weekOverview(plan, currentDay);
  return (
    <View
      accessibilityRole="summary"
      accessibilityLabel={t('today.weekStrip')}
      style={{ flexDirection: 'row', gap: spacing[1] }}
    >
      {week.days.map((d) => {
        const rest = d.type === 'rest';
        const label =
          d.status === 'done'
            ? t('today.dayDone', { day: d.day })
            : d.status === 'today'
              ? t('today.dayToday', { day: d.day })
              : t('today.dayUpcoming', { day: d.day });
        return (
          <View
            key={d.day}
            accessible
            accessibilityLabel={rest ? `${label}, ${t('today.dayRest')}` : label}
            style={{
              flex: 1,
              maxWidth: 52,
              height: 52,
              borderRadius: radii.md,
              alignItems: 'center',
              justifyContent: 'center',
              gap: spacing[1],
              backgroundColor: d.status === 'today' ? colors.accentMuted : colors.surface,
              borderWidth: d.status === 'today' ? 2 : 1,
              borderColor: d.status === 'today' ? colors.accent : colors.border,
            }}
          >
            <Text variant="caption" color={d.status === 'today' ? 'accentText' : 'textMuted'}>
              {d.day}
            </Text>
            <Icon
              size="sm"
              name={
                d.status === 'done' ? 'checkmark-circle' : rest ? 'moon-outline' : 'ellipse-outline'
              }
              color={d.status === 'done' ? 'successText' : 'textSubtle'}
            />
          </View>
        );
      })}
    </View>
  );
}
