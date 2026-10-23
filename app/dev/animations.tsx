import { Redirect, router } from 'expo-router';
import { useState } from 'react';
import { FlatList, View, useWindowDimensions } from 'react-native';

import { getExerciseInfo } from '@/content';
import { isEnabled } from '@/core';
import { ExerciseDemo } from '@/features/exercises';
import { allAnimationIds } from '@/features/exercises/animation';
import { useTranslation } from '@/i18n';
import { Chip, Icon, PressableScale, Screen, Text, useTheme } from '@/ui';

/**
 * Dev-only "storybook" of every exercise animation, playing side by side, to review
 * new keyframes visually (see docs/ADDING_AN_EXERCISE.md). Tap a tile to open the guide.
 */
export default function AnimationGalleryScreen() {
  const { t } = useTranslation();
  const { spacing, colors, radii, hitTarget } = useTheme();
  const { width } = useWindowDimensions();
  const [speed, setSpeed] = useState<0.5 | 1>(1);
  const [highlight, setHighlight] = useState(true);
  if (!isEnabled('devTools')) return <Redirect href="/" />;

  const cols = width > 600 ? 4 : 2;
  const tile = (Math.min(width, 900) - spacing[5] * 2 - spacing[2] * (cols - 1)) / cols;
  const ids = allAnimationIds();

  return (
    <Screen testID="animation-gallery" scroll={false}>
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: spacing[3] }}>
        <PressableScale
          accessibilityLabel={t('common.close')}
          onPress={() => router.back()}
          style={{
            width: hitTarget,
            height: hitTarget,
            borderRadius: radii.pill,
            backgroundColor: colors.surface,
            alignItems: 'center',
            justifyContent: 'center',
          }}
        >
          <Icon name="chevron-back" />
        </PressableScale>
        <Text variant="h2" style={{ flex: 1 }}>
          {t('settings.animations')} ({ids.length})
        </Text>
      </View>
      <View style={{ flexDirection: 'row', gap: spacing[2] }}>
        <Chip
          label={t('exercises.speed', { speed: speed === 1 ? 0.5 : 1 })}
          onPress={() => setSpeed((s) => (s === 1 ? 0.5 : 1))}
        />
        <Chip
          label={t('exercises.muscles')}
          selected={highlight}
          onPress={() => setHighlight((h) => !h)}
        />
      </View>
      <FlatList
        data={ids}
        key={cols}
        numColumns={cols}
        keyExtractor={(id) => id}
        columnWrapperStyle={{ gap: spacing[2] }}
        contentContainerStyle={{ gap: spacing[2], paddingBottom: spacing[8] }}
        initialNumToRender={8}
        renderItem={({ item }) => {
          const info = getExerciseInfo(item);
          return (
            <PressableScale
              testID={`gallery-${item}`}
              accessibilityLabel={info?.name ?? item}
              onPress={() => router.push({ pathname: '/exercise/[id]', params: { id: item } })}
              style={{
                width: tile,
                borderRadius: radii.lg,
                backgroundColor: colors.surface,
                borderWidth: 1,
                borderColor: colors.border,
                overflow: 'hidden',
              }}
            >
              <ExerciseDemo
                exercise={item}
                width={tile}
                height={tile * 0.8}
                speed={speed}
                highlight={highlight ? (info?.primaryMuscles ?? []) : []}
              />
              <Text variant="caption" numberOfLines={1} style={{ padding: spacing[2] }}>
                {info?.name ?? item}
              </Text>
            </PressableScale>
          );
        }}
      />
    </Screen>
  );
}
