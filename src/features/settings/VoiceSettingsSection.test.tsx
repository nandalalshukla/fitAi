import { fireEvent, render, screen } from '@testing-library/react-native';

import { ThemeProvider } from '@/ui';

import { VoiceSettingsSection } from './VoiceSettingsSection';
import { useVoiceSettings } from './voiceSettingsStore';

jest.mock('expo-speech', () => ({
  speak: jest.fn(),
  stop: jest.fn(async () => undefined),
  getAvailableVoicesAsync: jest.fn(async () => []),
  VoiceQuality: { Default: 'Default', Enhanced: 'Enhanced' },
}));

describe('VoiceSettingsSection', () => {
  beforeEach(() => useVoiceSettings.getState().reset());

  it('toggles voice coaching and hides the detailed options when off', async () => {
    await render(
      <ThemeProvider scheme="dark">
        <VoiceSettingsSection />
      </ThemeProvider>,
    );
    expect(screen.getByTestId('voice-verbosity')).toBeTruthy();
    await fireEvent(screen.getByTestId('voice-enabled'), 'valueChange', false);
    expect(useVoiceSettings.getState().enabled).toBe(false);
    expect(screen.queryByTestId('voice-verbosity')).toBeNull();
  });

  it('changes verbosity and speaks a test line', async () => {
    const Speech = jest.requireMock('expo-speech') as { speak: jest.Mock };
    await render(
      <ThemeProvider scheme="dark">
        <VoiceSettingsSection />
      </ThemeProvider>,
    );
    await fireEvent.press(screen.getByRole('tab', { name: 'Coach' }));
    expect(useVoiceSettings.getState().verbosity).toBe('coach');
    await fireEvent.press(screen.getByTestId('voice-test'));
    expect(Speech.speak).toHaveBeenCalledWith(
      expect.stringContaining('Ready'),
      expect.objectContaining({ useApplicationAudioSession: false }),
    );
  });
});
