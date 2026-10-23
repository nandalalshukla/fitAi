import { router } from 'expo-router';
import { useMemo, useState } from 'react';
import { ScrollView, View } from 'react-native';

import { getExerciseInfo } from '@/content';
import { personalBests, useSessionsQuery, useSetsQuery } from '@/data';
import { useUserId } from '@/features/auth';
import {
  dailySeries,
  exerciseTrend,
  heatmap,
  metricValue,
  totals,
  trainedExercises,
  weeklySeries,
  type Metric,
} from '@/features/history';
import { useTranslation } from '@/i18n';
import {
  BarChart,
  Card,
  Chip,
  EmptyState,
  Heatmap,
  ListItem,
  Screen,
  SectionHeader,
  Skeleton,
  Stagger,
  StatTile,
  Tabs,
  Text,
  useTheme,
} from '@/ui';

type Range = '7d' | '30d' | '12w';
const HEATMAP_WEEKS = 12;

/** Progress: totals, animated charts per range/metric, calendar heatmap, bests, per-exercise trend. */
export default function ProgressScreen() {
  const { t, i18n } = useTranslation();
  const { spacing } = useTheme();
  const userId = useUserId();
  const sessionsQ = useSessionsQuery(userId);
  const setsQ = useSetsQuery(userId);
  const [range, setRange] = useState<Range>('7d');
  const [metric, setMetric] = useState<Metric>('sessions');
  const [exercise, setExercise] = useState<string | null>(null);

  const sessions = useMemo(() => sessionsQ.data ?? [], [sessionsQ.data]);
  const sets = useMemo(() => setsQ.data ?? [], [setsQ.data]);
  const completed = sessions.filter((s) => s.status === 'completed');

  const series = useMemo(() => {
    const n = new Date();
    return range === '7d'
      ? dailySeries(sessions, 7, n)
      : range === '30d'
        ? dailySeries(sessions, 30, n)
        : weeklySeries(sessions, 12, n);
  }, [sessions, range]);
  const sum = totals(series);
  const grid = useMemo(() => heatmap(sessions, HEATMAP_WEEKS, new Date()), [sessions]);
  const bests = useMemo(
    () => personalBests(sets.filter((s) => !s.formFlags.includes('skipped'))),
    [sets],
  );
  const trained = useMemo(() => trainedExercises(sets), [sets]);
  const trendId = exercise ?? trained[0] ?? null;
  const trend = useMemo(
    () => (trendId ? exerciseTrend(trendId, sets, sessions) : []),
    [trendId, sets, sessions],
  );

  if (sessionsQ.isLoading) {
    return (
      <Screen testID="progress-screen">
        <Skeleton height={36} width="50%" />
        <Skeleton height={200} radius="lg" />
      </Screen>
    );
  }

  if (completed.length === 0) {
    return (
      <Screen testID="progress-screen">
        <Text variant="displayL" accessibilityRole="header">
          {t('progress.title')}
        </Text>
        <EmptyState
          icon="stats-chart-outline"
          title={t('progress.emptyTitle')}
          message={t('progress.emptyMessage')}
          actionLabel={t('today.startWorkout')}
          onAction={() => router.push('/')}
        />
      </Screen>
    );
  }

  const locale = i18n.language;
  const fmtDate = (d: Date) => d.toLocaleDateString(locale, { day: 'numeric', month: 'short' });
  const metricLabel: Record<Metric, string> = {
    sessions: t('progress.sessions'),
    minutes: t('progress.minutes'),
    reps: t('progress.reps'),
    quality: t('progress.form'),
  };
  const weekly = range === '12w';
  const chartData = series.map((p) => ({
    key: p.key,
    label: weekly
      ? fmtDate(p.date)
      : p.date.toLocaleDateString(
          locale,
          range === '7d' ? { weekday: 'narrow' } : { day: 'numeric' },
        ),
    value: metricValue(p, metric),
    description: t(weekly ? 'progress.pointWeek' : 'progress.pointDay', {
      date: fmtDate(p.date),
      value: `${metric === 'quality' && p.quality === null ? '–' : metricValue(p, metric)} ${metricLabel[metric].toLowerCase()}`,
    }),
  }));
  const rangeLabel = {
    '7d': t('progress.range7'),
    '30d': t('progress.range30'),
    '12w': t('progress.range12w'),
  }[range];
  const trainedDays = grid.flat().filter((c) => c.level > 0).length;
  const name = (id: string) => getExerciseInfo(id)?.name ?? id;

  return (
    <Screen testID="progress-screen">
      <Text variant="displayL" accessibilityRole="header">
        {t('progress.title')}
      </Text>

      <Tabs<Range>
        testID="range-tabs"
        value={range}
        onChange={setRange}
        options={[
          { value: '7d', label: t('progress.range7') },
          { value: '30d', label: t('progress.range30') },
          { value: '12w', label: t('progress.range12w') },
        ]}
      />

      <Stagger index={0} style={{ flexDirection: 'row', gap: spacing[2] }}>
        <StatTile testID="total-sessions" label={t('progress.sessions')} value={sum.sessions} />
        <StatTile label={t('progress.minutes')} value={sum.minutes} />
      </Stagger>
      <Stagger index={1} style={{ flexDirection: 'row', gap: spacing[2] }}>
        <StatTile label={t('progress.reps')} value={sum.reps} />
        <StatTile label={t('progress.form')} value={sum.quality ?? '–'} />
      </Stagger>

      <Card>
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={{ gap: spacing[2], paddingBottom: spacing[3] }}
        >
          {(Object.keys(metricLabel) as Metric[]).map((m) => (
            <Chip
              key={m}
              testID={`metric-${m}`}
              label={metricLabel[m]}
              selected={metric === m}
              onPress={() => setMetric(m)}
            />
          ))}
        </ScrollView>
        <BarChart
          key={`${range}-${metric}`}
          testID="progress-chart"
          data={chartData}
          accessibilityLabel={t('progress.chartLabel', {
            metric: metricLabel[metric],
            bucket: weekly ? t('progress.week') : t('progress.day'),
            range: rangeLabel,
          })}
        />
      </Card>

      <View style={{ gap: spacing[3] }}>
        <SectionHeader title={t('progress.calendar')} />
        <Card>
          <Heatmap
            weeks={grid.map((w) =>
              w.map((c) => ({
                key: c.key,
                level: c.level,
                future: c.future,
                description: `${c.key}: ${c.minutes}`,
              })),
            )}
            dayLabels={t('progress.days', { returnObjects: true }) as readonly string[]}
            accessibilityLabel={t('progress.calendarLabel', {
              count: trainedDays,
              days: HEATMAP_WEEKS * 7,
            })}
            lessLabel={t('progress.less')}
            moreLabel={t('progress.more')}
          />
        </Card>
      </View>

      {bests.length > 0 ? (
        <View style={{ gap: spacing[3] }}>
          <SectionHeader title={t('progress.bests')} />
          <Card padding={2} testID="personal-bests-list">
            {bests.map((b) => (
              <ListItem
                key={b.exerciseId}
                icon="trophy-outline"
                title={name(b.exerciseId)}
                subtitle={[
                  b.maxReps > 0 ? t('progress.bestReps', { count: b.maxReps }) : null,
                  b.maxHoldSeconds > 0 ? t('progress.bestHold', { count: b.maxHoldSeconds }) : null,
                  b.bestQuality !== null
                    ? t('progress.bestQuality', { score: b.bestQuality })
                    : null,
                ]
                  .filter(Boolean)
                  .join(' · ')}
                onPress={() => setExercise(b.exerciseId)}
              />
            ))}
          </Card>
        </View>
      ) : null}

      {trendId ? (
        <View style={{ gap: spacing[3] }}>
          <SectionHeader title={t('progress.trend')} />
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={{ gap: spacing[2] }}
          >
            {trained.map((id) => (
              <Chip
                key={id}
                label={name(id)}
                selected={trendId === id}
                onPress={() => setExercise(id)}
              />
            ))}
          </ScrollView>
          <Card>
            <BarChart
              key={trendId}
              testID="trend-chart"
              height={120}
              data={trend.slice(-20).map((p) => ({
                key: p.date,
                label: new Date(`${p.date}T12:00:00`).toLocaleDateString(locale, {
                  day: 'numeric',
                  month: 'numeric',
                }),
                value: p.value,
                description: `${p.date}: ${p.value}`,
              }))}
              accessibilityLabel={t('progress.trendLabel', { name: name(trendId) })}
            />
          </Card>
        </View>
      ) : null}
    </Screen>
  );
}
