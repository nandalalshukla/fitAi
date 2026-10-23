import { router } from 'expo-router';
import { useMemo, useState } from 'react';
import { ScrollView, View } from 'react-native';

import { CATEGORIES, exerciseCatalog, type ExerciseCategory } from '@/content';
import { useTranslation } from '@/i18n';
import { Chip, EmptyState, ExerciseTile, Screen, Stagger, Text, TextField, useTheme } from '@/ui';

type Filter = 'all' | 'tracked' | ExerciseCategory;

/** Exercise library: search + category filter; each exercise opens its animated guide. */
export default function ExercisesScreen() {
  const { t } = useTranslation();
  const { spacing } = useTheme();
  const [query, setQuery] = useState('');
  const [filter, setFilter] = useState<Filter>('all');

  const categories = CATEGORIES.filter((c) => exerciseCatalog.some((e) => e.category === c));
  const shown = useMemo(() => {
    const q = query.trim().toLowerCase();
    return exerciseCatalog.filter(
      (e) =>
        (filter === 'all' || (filter === 'tracked' ? e.tracked !== null : e.category === filter)) &&
        (!q ||
          e.name.toLowerCase().includes(q) ||
          e.category.includes(q) ||
          e.primaryMuscles.some((m) => m.replace('_', ' ').includes(q))),
    );
  }, [query, filter]);

  const muscles = (ids: readonly string[]) =>
    ids.map((m) => t(`exercises.muscleNames.${m}` as 'exercises.muscleNames.abs')).join(', ');

  return (
    <Screen testID="exercises-screen">
      <View>
        <Text variant="displayL" accessibilityRole="header">
          {t('exercises.title')}
        </Text>
        <Text variant="body" color="textMuted">
          {t('exercises.subtitle')}
        </Text>
      </View>
      <TextField
        testID="exercise-search"
        label={t('exercises.search')}
        placeholder={t('exercises.searchPlaceholder')}
        value={query}
        onChangeText={setQuery}
        autoCorrect={false}
        returnKeyType="search"
      />
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={{ gap: spacing[2] }}
      >
        <Chip
          label={t('exercises.all')}
          selected={filter === 'all'}
          onPress={() => setFilter('all')}
        />
        <Chip
          testID="filter-tracked"
          icon="scan-outline"
          label={t('exercises.tracked')}
          selected={filter === 'tracked'}
          onPress={() => setFilter('tracked')}
        />
        {categories.map((c) => (
          <Chip
            key={c}
            testID={`filter-${c}`}
            label={t(`exercises.categories.${c}`)}
            selected={filter === c}
            onPress={() => setFilter(c)}
          />
        ))}
      </ScrollView>
      {shown.length === 0 ? (
        <EmptyState icon="search-outline" title={t('exercises.noResults')} />
      ) : (
        shown.map((e, i) => (
          <Stagger key={e.id} index={i}>
            <ExerciseTile
              testID={`exercise-${e.id}`}
              name={e.name}
              muscles={muscles(e.primaryMuscles)}
              cameraTracked={e.tracked !== null}
              onPress={() => router.push({ pathname: '/exercise/[id]', params: { id: e.id } })}
            />
          </Stagger>
        ))
      )}
    </Screen>
  );
}
