import { Redirect, router } from 'expo-router';
import { useState } from 'react';
import { View } from 'react-native';

import { isEnabled } from '@/core';
import {
  AnimatedCounter,
  BottomSheet,
  Button,
  Card,
  Chip,
  EmptyState,
  ErrorState,
  ExerciseTile,
  ListItem,
  Modal,
  PlanCard,
  ProgressRing,
  Screen,
  SectionHeader,
  Skeleton,
  StatTile,
  Stepper,
  Tabs,
  Text,
  useTheme,
  useToast,
  type ColorTokens,
} from '@/ui';

/** Dev-only gallery of every design-system component and token. */
export default function DesignSystemScreen() {
  const theme = useTheme();
  const toast = useToast();
  const [count, setCount] = useState(7);
  const [tab, setTab] = useState<'a' | 'b' | 'c'>('a');
  const [sheet, setSheet] = useState(false);
  const [modal, setModal] = useState(false);
  const [chip, setChip] = useState(true);

  if (!isEnabled('devTools')) return <Redirect href="/" />;

  const swatches = Object.keys(theme.colors) as (keyof ColorTokens)[];

  return (
    <Screen>
      <Button label="Back" variant="ghost" icon="chevron-back" onPress={() => router.back()} />
      <Text variant="displayL">Design system</Text>

      <SectionHeader title="Colors" />
      <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: theme.spacing[2] }}>
        {swatches.map((k) => (
          <View key={k} style={{ width: 96, gap: 4 }}>
            <View
              style={{
                height: 40,
                borderRadius: theme.radii.sm,
                backgroundColor: theme.colors[k],
                borderWidth: 1,
                borderColor: theme.colors.border,
              }}
            />
            <Text variant="caption" color="textMuted" numberOfLines={1}>
              {k}
            </Text>
          </View>
        ))}
      </View>

      <SectionHeader title="Typography" />
      {(
        [
          'displayL',
          'displayM',
          'h1',
          'h2',
          'h3',
          'bodyL',
          'body',
          'label',
          'caption',
          'overline',
        ] as const
      ).map((v) => (
        <Text key={v} variant={v}>
          {v} · Keep your back straight
        </Text>
      ))}

      <SectionHeader title="Buttons" />
      <Button label="Primary" icon="play" />
      <Button label="Secondary" variant="secondary" />
      <Button label="Ghost" variant="ghost" />
      <Button label="Danger" variant="danger" />
      <Button label="Loading" loading />

      <SectionHeader title="Counters & rings" />
      <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-around' }}>
        <ProgressRing progress={count / 20} size={140} gradient>
          <AnimatedCounter value={count} variant="displayL" />
        </ProgressRing>
        <Stepper label="Reps" value={count} onChange={setCount} max={20} />
      </View>

      <SectionHeader title="Chips & tabs" />
      <View style={{ flexDirection: 'row', gap: theme.spacing[2] }}>
        <Chip label="Selected" selected={chip} onPress={() => setChip((c) => !c)} />
        <Chip label="With icon" icon="flame-outline" />
      </View>
      <Tabs
        value={tab}
        onChange={setTab}
        options={[
          { value: 'a', label: 'Week' },
          { value: 'b', label: 'Month' },
          { value: 'c', label: 'Year' },
        ]}
      />

      <SectionHeader title="Cards" />
      <PlanCard
        title="6-Pack Abs"
        goal="Core"
        level="Intermediate"
        weeks={8}
        daysPerWeek={5}
        minutesPerSession={60}
        progress={0.4}
        active
        onPress={() => undefined}
      />
      <ExerciseTile
        name="Squat"
        prescription="3 × 15"
        muscles="Quads · Glutes"
        cameraTracked
        onPress={() => undefined}
      />
      <View style={{ flexDirection: 'row', gap: theme.spacing[2] }}>
        <StatTile label="Day streak" value={12} icon="flame" iconColor="ember" />
        <StatTile label="Form score" value={92} unit="%" icon="checkmark-circle-outline" />
      </View>
      <Card padding={2}>
        <ListItem
          title="List item"
          subtitle="With subtitle"
          icon="notifications-outline"
          onPress={() => undefined}
        />
        <ListItem
          title="Delete account"
          icon="trash-outline"
          destructive
          onPress={() => setModal(true)}
        />
      </Card>

      <SectionHeader title="Feedback" />
      <Button
        label="Show toast"
        variant="secondary"
        onPress={() =>
          toast.show({ message: 'Set complete!', kind: 'success', actionLabel: 'Undo' })
        }
      />
      <Button label="Open bottom sheet" variant="secondary" onPress={() => setSheet(true)} />
      <Button label="Open confirm modal" variant="secondary" onPress={() => setModal(true)} />
      <Skeleton height={64} radius="md" />
      <EmptyState title="No workouts yet" message="Your history will appear here." />
      <ErrorState
        title="Something went wrong"
        message="Check your connection."
        retryLabel="Try again"
        onRetry={() => undefined}
      />

      <BottomSheet visible={sheet} onClose={() => setSheet(false)} title="Bottom sheet">
        <Text color="textMuted">Drag down or tap outside to dismiss.</Text>
        <Button label="Done" onPress={() => setSheet(false)} fullWidth />
      </BottomSheet>
      <Modal
        visible={modal}
        onClose={() => setModal(false)}
        title="Delete account?"
        message="This permanently deletes your workouts and data."
        confirmLabel="Delete"
        cancelLabel="Cancel"
        destructive
        onConfirm={() => setModal(false)}
      />
    </Screen>
  );
}
