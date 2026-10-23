import { router } from 'expo-router';
import { useMemo, useState } from 'react';
import { ScrollView, View } from 'react-native';

import { GOALS, plans, type Goal, type Level } from '@/content';
import { planProgress, useActivePlan } from '@/features/plans';
import { useTranslation } from '@/i18n';
import { Chip, EmptyState, PlanCard, Screen, Stagger, Text, useTheme } from '@/ui';

type LevelFilter = 'all' | Level;
type GoalFilter = 'all' | Goal;

/** Plan library: browse by goal and level; the active plan is marked with its progress. */
export default function PlansScreen() {
  const { t } = useTranslation();
  const { spacing } = useTheme();
  const [level, setLevel] = useState<LevelFilter>('all');
  const [goal, setGoal] = useState<GoalFilter>('all');
  const active = useActivePlan().data;

  const levels: { value: LevelFilter; label: string }[] = [
    { value: 'all', label: t('plans.all') },
    { value: 'beginner', label: t('plans.beginner') },
    { value: 'intermediate', label: t('plans.intermediate') },
    { value: 'advanced', label: t('plans.advanced') },
  ];
  const goals = GOALS.filter((g) => plans.some((p) => p.goal === g));

  const shown = useMemo(
    () =>
      plans.filter(
        (p) => (level === 'all' || p.level === level) && (goal === 'all' || p.goal === goal),
      ),
    [level, goal],
  );

  return (
    <Screen testID="plans-screen">
      <View>
        <Text variant="displayL" accessibilityRole="header">
          {t('plans.title')}
        </Text>
        <Text variant="body" color="textMuted">
          {t('plans.subtitle')}
        </Text>
      </View>
      <View style={{ gap: spacing[2] }}>
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={{ gap: spacing[2] }}
        >
          <Chip
            label={t('plans.allGoals')}
            selected={goal === 'all'}
            onPress={() => setGoal('all')}
          />
          {goals.map((g) => (
            <Chip
              key={g}
              testID={`goal-filter-${g}`}
              label={t(`onboarding.goals.${g}`)}
              selected={goal === g}
              onPress={() => setGoal(g)}
            />
          ))}
        </ScrollView>
        <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: spacing[2] }}>
          {levels.map((f) => (
            <Chip
              key={f.value}
              testID={`level-filter-${f.value}`}
              label={f.label}
              selected={level === f.value}
              onPress={() => setLevel(f.value)}
            />
          ))}
        </View>
      </View>
      {shown.length === 0 ? (
        <EmptyState icon="search-outline" title={t('plans.empty')} />
      ) : (
        shown.map((plan, i) => {
          const isActive = active?.plan.id === plan.id;
          return (
            <Stagger key={plan.id} index={i}>
              <PlanCard
                testID={`plan-card-${plan.id}`}
                title={plan.title}
                goal={t(`onboarding.goals.${plan.goal}`)}
                level={t(`plans.${plan.level}`)}
                weeks={plan.weeks}
                daysPerWeek={plan.daysPerWeek}
                minutesPerSession={plan.minutesPerSession}
                active={isActive}
                progress={isActive ? planProgress(plan, active.enrollment.currentDay) : undefined}
                onPress={() => router.push({ pathname: '/plan/[id]', params: { id: plan.id } })}
              />
            </Stagger>
          );
        })
      )}
    </Screen>
  );
}
