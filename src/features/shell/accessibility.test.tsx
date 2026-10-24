import { render } from '@testing-library/react-native';
import { renderRouter, screen } from 'expo-router/testing-library';
import { Pressable, Text, View } from 'react-native';
import type { TestInstance } from 'test-renderer';

import { getDataRuntime } from '@/data';
import { resetApp, seedUser } from '@/features/shell/testing/appHarness';

jest.mock('expo-font', () => ({
  ...jest.requireActual('expo-font'),
  useFonts: () => [true, null],
}));

jest.mock('expo-splash-screen', () => ({
  preventAutoHideAsync: jest.fn(() => Promise.resolve()),
  hideAsync: jest.fn(() => Promise.resolve()),
}));

jest.mock('@/data/db/expoDatabase', () => ({
  getDatabase: async () => {
    const { createTestDatabase } = jest.requireActual('@/data/testing/sqljs');
    const { migrateLocal } = jest.requireActual('@/data/db/migrations');
    const db = await createTestDatabase();
    await migrateLocal(db);
    return db;
  },
}));

jest.setTimeout(60_000);

/** Visible text inside a host subtree (what a screen reader would read without a label). */
function textOf(node: TestInstance): string {
  let out = '';
  for (const child of node.children) {
    if (typeof child === 'string') out += child;
    else out += textOf(child);
  }
  return out.trim();
}

function hidden(node: TestInstance | null): boolean {
  for (let n = node; n; n = n.parent) {
    if (
      n.props?.accessibilityElementsHidden ||
      n.props?.importantForAccessibility === 'no-hide-descendants'
    )
      return true;
  }
  return false;
}

function allNodes(root: TestInstance): TestInstance[] {
  const out: TestInstance[] = [];
  const walk = (n: TestInstance) => {
    out.push(n);
    for (const c of n.children) if (typeof c !== 'string') walk(c);
  };
  walk(root);
  return out;
}

/** Host elements a user can tap that have no accessible name. */
function unlabeledTouchables(): string[] {
  const root =
    (screen as unknown as { container?: TestInstance; root?: TestInstance }).container ??
    (screen as unknown as { root: TestInstance }).root;
  return allNodes(root)
    .filter(
      (n) =>
        typeof n.type === 'string' &&
        (typeof n.props.onClick === 'function' || typeof n.props.onResponderRelease === 'function'),
    )
    .filter((n) => !hidden(n))
    .filter((n) => !(n.props.accessibilityLabel || n.props['aria-label'] || textOf(n)))
    .map((n) => `${String(n.type)}#${n.props.testID ?? '?'}`);
}

const ROUTES = [
  '/',
  '/plans',
  '/plan/six_pack_abs',
  '/exercises',
  '/exercise/squat',
  '/exercise/side_plank',
  '/progress',
  '/settings',
  '/auth/sign-in',
  '/legal/privacy',
  '/workout',
];

beforeEach(resetApp);

describe('accessibility audit', () => {
  it('flags unlabeled touchables (positive control)', async () => {
    await render(
      <View>
        <Pressable testID="bad" onPress={() => undefined}>
          <View />
        </Pressable>
        <Pressable testID="labelled" accessibilityLabel="Close" onPress={() => undefined} />
        <Pressable testID="texty" onPress={() => undefined}>
          <Text>Start</Text>
        </Pressable>
      </View>,
    );
    expect(unlabeledTouchables()).toEqual(['View#bad']);
  });

  it.each(ROUTES)('%s: every tappable element has an accessible name', async (route) => {
    const userId = await seedUser();
    if (route === '/progress') {
      const { workouts } = getDataRuntime().repos;
      const s = await workouts.startSession({ userId, mode: 'guided' });
      await workouts.recordSet(s, { exerciseId: 'squat', setIndex: 0, reps: 10, avgQuality: 80 });
      await workouts.finishSession(s.id);
    }
    await renderRouter('./app', { initialUrl: route });
    // Wait for data-driven content to render.
    await screen.findAllByText(/./, {}, { timeout: 5000 });
    expect(unlabeledTouchables()).toEqual([]);
  });

  it('onboarding: every tappable element has an accessible name', async () => {
    await renderRouter('./app', { initialUrl: '/onboarding' });
    await screen.findByTestId('onboarding-welcome');
    expect(unlabeledTouchables()).toEqual([]);
  });
});
