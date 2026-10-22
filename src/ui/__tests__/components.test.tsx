import { fireEvent, render, screen } from '@testing-library/react-native';
import type { ReactElement } from 'react';

import { Button } from '../components/Button';
import { Chip } from '../components/Chip';
import { ProgressRing, clampProgress } from '../components/ProgressRing';
import { Stepper, clampStep } from '../components/Stepper';
import { ThemeProvider } from '../theme/ThemeProvider';

const renderThemed = (ui: ReactElement) =>
  render(<ThemeProvider scheme="dark">{ui}</ThemeProvider>);

describe('Button', () => {
  it('calls onPress and exposes an accessible label', async () => {
    const onPress = jest.fn();
    await renderThemed(<Button label="Start" onPress={onPress} />);
    await fireEvent.press(screen.getByRole('button', { name: 'Start' }));
    expect(onPress).toHaveBeenCalledTimes(1);
  });

  it('does not fire when disabled or loading', async () => {
    const onPress = jest.fn();
    await renderThemed(<Button label="Save" onPress={onPress} loading />);
    await fireEvent.press(screen.getByRole('button', { name: 'Save' }));
    expect(onPress).not.toHaveBeenCalled();
  });
});

describe('Chip', () => {
  it('reports selected state to accessibility', async () => {
    await renderThemed(<Chip label="Beginner" selected />);
    expect(screen.getByRole('button', { name: 'Beginner' })).toBeSelected();
  });
});

describe('Stepper', () => {
  it('clamps values to range', () => {
    expect(clampStep(11, 0, 10)).toBe(10);
    expect(clampStep(-1, 0, 10)).toBe(0);
  });

  it('increments and decrements via buttons', async () => {
    const onChange = jest.fn();
    await renderThemed(<Stepper label="Reps" value={5} onChange={onChange} testID="reps" />);
    await fireEvent.press(screen.getByTestId('reps-inc'));
    await fireEvent.press(screen.getByTestId('reps-dec'));
    expect(onChange).toHaveBeenNthCalledWith(1, 6);
    expect(onChange).toHaveBeenNthCalledWith(2, 4);
  });
});

describe('ProgressRing', () => {
  it('clamps progress and exposes a percentage', async () => {
    expect(clampProgress(1.5)).toBe(1);
    expect(clampProgress(Number.NaN)).toBe(0);
    await renderThemed(<ProgressRing progress={0.42} accessibilityLabel="Sets" />);
    expect(screen.getByRole('progressbar', { name: 'Sets' })).toHaveAccessibilityValue({ now: 42 });
  });
});
