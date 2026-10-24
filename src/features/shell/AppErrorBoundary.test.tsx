import { fireEvent, render, screen } from '@testing-library/react-native';
import { Text } from 'react-native';

import { ThemeProvider } from '@/ui';

import { AppErrorBoundary } from './AppErrorBoundary';

describe('AppErrorBoundary', () => {
  beforeEach(() => jest.spyOn(console, 'error').mockImplementation(() => undefined));
  afterEach(() => jest.restoreAllMocks());

  it('shows a friendly error and recovers on retry', async () => {
    let defused = false;
    function Toggle() {
      if (!defused) throw new Error('kaboom');
      return <Text>fine</Text>;
    }
    await render(
      <ThemeProvider scheme="dark">
        <AppErrorBoundary>
          <Toggle />
        </AppErrorBoundary>
      </ThemeProvider>,
    );
    expect(screen.getByTestId('app-error')).toBeTruthy();
    expect(screen.getByText('Something went wrong')).toBeTruthy();
    defused = true;
    await fireEvent.press(screen.getByText('Try again'));
    expect(screen.getByText('fine')).toBeTruthy();
  });
});
