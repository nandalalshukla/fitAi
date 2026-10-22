import { router } from 'expo-router';
import { useMemo, useState } from 'react';
import { View } from 'react-native';

import { previewPlans, type PlanPreview } from '@/features/plans/previewPlans';
import { useTranslation } from '@/i18n';
import { Chip, PlanCard, Screen, Stagger, Text, useTheme } from '@/ui';

type LevelFilter = 'all' | PlanPreview['level'];

export default function PlansScreen() {
  const { t } = useTranslation();
  const { spacing } = useTheme();
  const [level, setLevel] = useState<LevelFilter>('all');

  const filters: { value: LevelFilter; label: string }[] = [
    { value: 'all', label: t('plans.all') },
    { value: 'beginner', label: t('plans.beginner') },
    { value: 'intermediate', label: t('plans.intermediate') },
    { value: 'advanced', label: t('plans.advanced') },
  ];

  const plans = useMemo(
    () => (level === 'all' ? previewPlans : previewPlans.filter((p) => p.level === level)),
    [level],
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
      <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: spacing[2] }}>
        {filters.map((f) => (
          <Chip
            key={f.value}
            label={f.label}
            selected={level === f.value}
            onPress={() => setLevel(f.value)}
          />
        ))}
      </View>
      {plans.map((plan, i) => (
        <Stagger key={plan.id} index={i}>
          <PlanCard
            testID={`plan-card-${plan.id}`}
            title={plan.title}
            goal={plan.goal}
            level={t(`plans.${plan.level}`)}
            weeks={plan.weeks}
            daysPerWeek={plan.daysPerWeek}
            minutesPerSession={plan.minutesPerSession}
            active={i === 0}
            progress={i === 0 ? 0.35 : undefined}
            onPress={() => router.push({ pathname: '/plan/[id]', params: { id: plan.id } })}
          />
        </Stagger>
      ))}
    </Screen>
  );
}
