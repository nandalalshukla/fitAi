import { act, fireEvent, renderRouter, screen, waitFor } from 'expo-router/testing-library';

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

// Jest has no native SQLite: back the data layer with the sql.js test database.
jest.mock('@/data/db/expoDatabase', () => ({
  getDatabase: async () => {
    const { createTestDatabase } = jest.requireActual('@/data/testing/sqljs');
    const { migrateLocal } = jest.requireActual('@/data/db/migrations');
    const db = await createTestDatabase();
    await migrateLocal(db);
    return db;
  },
}));

// First render transforms the whole router tree; give it room on cold CI caches.
jest.setTimeout(60_000);

beforeEach(resetApp);

describe('first launch', () => {
  it('runs onboarding and lands on Today with the recommended plan', async () => {
    const router = await renderRouter('./app', { initialUrl: '/' });
    expect(await screen.findByTestId('onboarding-welcome')).toBeTruthy();
    expect(router.getPathname()).toBe('/onboarding');

    await fireEvent.press(screen.getByTestId('onboarding-start'));
    await fireEvent.press(await screen.findByTestId('goal-core'));
    await fireEvent.press(screen.getByTestId('onboarding-next'));
    await fireEvent.press(await screen.findByTestId('level-intermediate'));
    await fireEvent.press(screen.getByTestId('onboarding-next'));
    await fireEvent.press(screen.getByTestId('onboarding-next')); // equipment: none extra
    await fireEvent.press(await screen.findByTestId('onboarding-next')); // days
    await fireEvent.press(await screen.findByTestId('reminder-switch')); // reminders off
    await fireEvent.press(screen.getByTestId('onboarding-next'));
    // Safety: cannot continue until accepted.
    expect(await screen.findByTestId('accept-safety')).toBeTruthy();
    await fireEvent.press(screen.getByTestId('accept-safety'));
    await fireEvent.press(screen.getByTestId('onboarding-next'));
    expect(await screen.findByTestId('recommended-six_pack_abs')).toBeTruthy();
    await fireEvent.press(screen.getByTestId('onboarding-finish'));

    expect(await screen.findByTestId('today-card', {}, { timeout: 10_000 })).toBeTruthy();
    expect(screen.getByText(/6-Pack Abs Builder/)).toBeTruthy();
    expect(screen.getByTestId('start-workout')).toBeTruthy();
  });
});

describe('navigation shell', () => {
  it('starts today’s workout in one tap and finishes it to a summary', async () => {
    const userId = await seedUser();
    const router = await renderRouter('./app', { initialUrl: '/' });
    await fireEvent.press(await screen.findByTestId('start-workout'));
    expect(await screen.findByTestId('get-ready')).toBeTruthy();
    expect(router.getPathname()).toBe('/workout');
    expect(screen.getByTestId('exercise-name')).toHaveTextContent('March in place');

    await fireEvent.press(screen.getByTestId('start-set'));
    // 3-2-1 countdown, then the (manual, timed) set.
    expect(await screen.findByTestId('finish-set', {}, { timeout: 6000 })).toBeTruthy();
    await fireEvent.press(screen.getByTestId('finish-set'));

    // Warm-up has no rest: straight into the next countdown/set.
    await waitFor(
      () => expect(screen.getByTestId('exercise-name')).toHaveTextContent('Arm circles'),
      {
        timeout: 6000,
      },
    );

    // End early: the finished set is saved and the summary opens.
    await fireEvent.press(screen.getByTestId('pause-workout'));
    await fireEvent.press(await screen.findByTestId('pause-modal-confirm'));
    expect(await screen.findByTestId('summary-screen', {}, { timeout: 10_000 })).toBeTruthy();
    expect(router.getPathname()).toBe('/workout/summary');

    const { workouts, plans } = getDataRuntime().repos;
    const done = await workouts.listSessions(userId, '1970-01-01', '9999-12-31');
    expect(done).toHaveLength(1);
    expect(done[0]).toMatchObject({
      status: 'completed',
      planId: 'beginner_foundations',
      planDay: 1,
    });
    expect(await workouts.getSets(done[0]!.id)).toHaveLength(1);
    // Completing the day advances the plan.
    expect((await plans.getActive(userId))!.currentDay).toBe(2);
  });

  it('shows a rest day and advances when marked done', async () => {
    await seedUser('beginner_foundations', 2);
    await renderRouter('./app', { initialUrl: '/' });
    await fireEvent.press(await screen.findByTestId('rest-done'));
    expect(await screen.findByTestId('start-workout')).toBeTruthy();
  });

  it('navigates plan list -> plan detail and switches plan after confirming', async () => {
    const userId = await seedUser();
    const router = await renderRouter('./app', { initialUrl: '/plans' });
    await fireEvent.press(await screen.findByTestId('plan-card-six_pack_abs'));
    expect(await screen.findByTestId('plan-detail-screen')).toBeTruthy();
    expect(router.getPathname()).toBe('/plan/six_pack_abs');
    await fireEvent.press(screen.getByTestId('select-plan'));
    await fireEvent.press(await screen.findByTestId('switch-plan-modal-confirm'));
    // Back on Today with the new plan.
    expect(await screen.findByTestId('today-card')).toBeTruthy();
    expect(router.getPathname()).toBe('/');
    expect((await getDataRuntime().repos.plans.getActive(userId))?.planId).toBe('six_pack_abs');
  });

  it('opens an exercise guide from the library', async () => {
    await seedUser();
    const router = await renderRouter('./app', { initialUrl: '/exercises' });
    await fireEvent.changeText(await screen.findByTestId('exercise-search'), 'plank');
    await fireEvent.press(await screen.findByTestId('exercise-plank'));
    expect(await screen.findByTestId('exercise-detail-screen')).toBeTruthy();
    expect(router.getPathname()).toBe('/exercise/plank');
    expect(screen.getByText(/How to do it/i)).toBeTruthy();
    // Step-synced guide: tapping a step holds the demo on it and highlights it.
    await fireEvent.press(screen.getByTestId('step-3'));
    expect(screen.getByTestId('step-3')).toBeSelected();
    expect(screen.getByTestId('step-1')).not.toBeSelected();
  });

  it('offers to resume an interrupted workout at the next set', async () => {
    const userId = await seedUser();
    const { workouts } = getDataRuntime().repos;
    const s = await workouts.startSession({
      userId,
      mode: 'guided',
      planId: 'beginner_foundations',
      planDay: 1,
    });
    await workouts.recordSet(s, {
      exerciseId: 'march_in_place',
      setIndex: 0,
      heldSeconds: 120,
      cameraTracked: false,
    });
    await renderRouter('./app', { initialUrl: '/' });
    await fireEvent.press(await screen.findByTestId('resume-workout'));
    expect(await screen.findByTestId('get-ready')).toBeTruthy();
    expect(screen.getByTestId('exercise-name')).toHaveTextContent('Arm circles');
  });

  it('refuses to resume a session that is not the current user’s (deep-link guard)', async () => {
    await seedUser();
    const other = await getDataRuntime().repos.workouts.startSession({
      userId: 'someone-else',
      mode: 'guided',
    });
    await renderRouter('./app', { initialUrl: `/workout?resume=${other.id}` });
    expect(await screen.findByText("We couldn't start this workout.")).toBeTruthy();
  });

  it('shows charts and personal bests once workouts exist', async () => {
    const userId = await seedUser();
    const { workouts } = getDataRuntime().repos;
    for (const reps of [10, 14]) {
      const s = await workouts.startSession({ userId, mode: 'guided' });
      await workouts.recordSet(s, { exerciseId: 'squat', setIndex: 0, reps, avgQuality: 80 });
      await workouts.finishSession(s.id);
    }
    await renderRouter('./app', { initialUrl: '/progress' });
    expect(await screen.findByTestId('progress-chart')).toBeTruthy();
    expect(screen.getByTestId('total-sessions')).toHaveProp('accessibilityLabel', 'Workouts: 2');
    expect(await screen.findByTestId('personal-bests-list')).toBeTruthy();
    expect(screen.getByText(/14 reps/)).toBeTruthy();
    await fireEvent.press(screen.getByTestId('metric-reps'));
    expect(screen.getByTestId('trend-chart')).toBeTruthy();
  });

  it('shows the progress empty state before any workout', async () => {
    await seedUser();
    await renderRouter('./app', { initialUrl: '/progress' });
    expect(await screen.findByText('Your progress lives here')).toBeTruthy();
  });

  it('opens sign-in from the settings account section and returns as guest', async () => {
    await seedUser();
    const router = await renderRouter('./app', { initialUrl: '/settings' });
    await fireEvent.press(await screen.findByTestId('create-account'));
    expect(await screen.findByTestId('sign-in-screen')).toBeTruthy();
    expect(router.getPathname()).toBe('/auth/sign-in');
    await act(async () => {
      await fireEvent.press(screen.getByTestId('continue-guest'));
    });
    expect(await screen.findByTestId('create-account')).toBeTruthy();
  });

  it('shows not-found for unknown routes', async () => {
    await renderRouter('./app', { initialUrl: '/nope' });
    expect(await screen.findByText("This screen doesn't exist.")).toBeTruthy();
  });
});
