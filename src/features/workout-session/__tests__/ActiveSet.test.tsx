import { act, fireEvent, render, screen } from '@testing-library/react-native';
import { makeMutable } from 'react-native-reanimated';

import { getExerciseInfo } from '@/content';
import type { LiveFormLevel } from '@/features/exercises';
import type { VoiceCoach } from '@/features/voice';
import { ThemeProvider } from '@/ui';

import { ActiveSet } from '../components/ActiveSet';
import type { SessionStep } from '../domain/steps';

const coach = { handleEngineEvents: jest.fn(), say: jest.fn() } as unknown as VoiceCoach;

const step = (over: Partial<SessionStep> = {}): SessionStep => ({
  index: 3,
  exerciseId: 'squat',
  tracked: 'squat',
  mode: 'reps',
  blockKind: 'main',
  blockTitle: 'Main',
  setNumber: 1,
  setCount: 2,
  targetReps: 3,
  targetSeconds: null,
  perSide: false,
  restAfterS: 60,
  ...over,
});

async function renderSet(s: SessionStep, onComplete = jest.fn(), elapsed = () => 0) {
  await render(
    <ThemeProvider scheme="dark">
      <ActiveSet
        step={s}
        info={getExerciseInfo(s.exerciseId ?? '')}
        pose={null}
        formLevel={makeMutable<LiveFormLevel>(0)}
        level="beginner"
        free={false}
        paused={false}
        elapsedMs={elapsed}
        coach={coach}
        onComplete={onComplete}
      />
    </ThemeProvider>,
  );
  return onComplete;
}

describe('ActiveSet (manual counting)', () => {
  beforeEach(() => jest.useFakeTimers());
  afterEach(() => jest.useRealTimers());

  it('counts taps, supports +/- and completes the set at the target', async () => {
    const done = await renderSet(step());
    await fireEvent.press(screen.getByTestId('rep-tap'));
    await fireEvent.press(screen.getByTestId('rep-plus'));
    await fireEvent.press(screen.getByTestId('rep-minus'));
    expect(done).not.toHaveBeenCalled();
    await fireEvent.press(screen.getByTestId('rep-tap'));
    await fireEvent.press(screen.getByTestId('rep-tap'));
    expect(coach.handleEngineEvents).toHaveBeenCalled();
    await act(async () => {
      jest.advanceTimersByTime(800);
    });
    expect(done).toHaveBeenCalledWith(
      expect.objectContaining({ reps: 3, cameraTracked: false, avgQuality: null }),
    );
  });

  it('finishes a timed set when the timer runs out', async () => {
    let elapsed = 0;
    const done = await renderSet(
      step({
        exerciseId: 'march_in_place',
        tracked: null,
        mode: 'time',
        targetReps: null,
        targetSeconds: 30,
      }),
      jest.fn(),
      () => elapsed,
    );
    expect(screen.getByTestId('set-timer')).toHaveTextContent('0:30');
    elapsed = 30_000;
    // One tick to notice the timer ran out, then the auto-complete delay.
    await act(async () => {
      jest.advanceTimersByTime(300);
    });
    await act(async () => {
      jest.advanceTimersByTime(800);
    });
    expect(done).toHaveBeenCalledWith(expect.objectContaining({ heldSeconds: 30, reps: 0 }));
  });

  it('lets the user end a set early', async () => {
    const done = await renderSet(step());
    await fireEvent.press(screen.getByTestId('rep-tap'));
    await fireEvent.press(screen.getByTestId('finish-set'));
    expect(done).toHaveBeenCalledWith(expect.objectContaining({ reps: 1 }));
  });
});
