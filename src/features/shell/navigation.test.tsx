import { fireEvent, renderRouter, screen } from 'expo-router/testing-library';

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

describe('navigation shell', () => {
  it('opens on Today and reaches the workout player in one tap', async () => {
    const router = await renderRouter('./app', { initialUrl: '/' });
    expect(await screen.findByTestId('today-screen')).toBeTruthy();
    await fireEvent.press(screen.getByTestId('start-workout'));
    expect(await screen.findByTestId('workout-screen')).toBeTruthy();
    expect(router.getPathname()).toBe('/workout');
  });

  it('navigates plan list -> plan detail', async () => {
    const router = await renderRouter('./app', { initialUrl: '/plans' });
    await fireEvent.press(await screen.findByTestId('plan-card-six-pack-abs'));
    expect(await screen.findByTestId('plan-detail-screen')).toBeTruthy();
    expect(router.getPathname()).toBe('/plan/six-pack-abs');
  });

  it('opens sign-in from the settings account section and returns as guest', async () => {
    const router = await renderRouter('./app', { initialUrl: '/settings' });
    await fireEvent.press(await screen.findByTestId('create-account'));
    expect(await screen.findByTestId('sign-in-screen')).toBeTruthy();
    expect(router.getPathname()).toBe('/auth/sign-in');
    await fireEvent.press(screen.getByTestId('continue-guest'));
    expect(await screen.findByTestId('create-account')).toBeTruthy();
  });

  it('shows not-found for unknown routes', async () => {
    await renderRouter('./app', { initialUrl: '/nope' });
    expect(await screen.findByText("This screen doesn't exist.")).toBeTruthy();
  });
});
