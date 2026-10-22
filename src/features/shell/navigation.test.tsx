import { fireEvent, renderRouter, screen } from 'expo-router/testing-library';

jest.mock('expo-font', () => ({
  ...jest.requireActual('expo-font'),
  useFonts: () => [true, null],
}));

jest.mock('expo-splash-screen', () => ({
  preventAutoHideAsync: jest.fn(() => Promise.resolve()),
  hideAsync: jest.fn(() => Promise.resolve()),
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

  it('shows not-found for unknown routes', async () => {
    await renderRouter('./app', { initialUrl: '/nope' });
    expect(await screen.findByText("This screen doesn't exist.")).toBeTruthy();
  });
});
