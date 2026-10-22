import { NoopAnalytics, type Analytics } from '../analytics';
import { getService, registerServices, resetServices } from '../services';

describe('service locator', () => {
  afterEach(resetServices);

  it('provides a default analytics implementation', () => {
    expect(getService('analytics')).toBeInstanceOf(NoopAnalytics);
  });

  it('allows overriding implementations (e.g. fakes in tests)', () => {
    const fake: Analytics = {
      track: jest.fn(),
      screen: jest.fn(),
      identify: jest.fn(),
      reset: jest.fn(),
      setEnabled: jest.fn(),
    };
    registerServices({ analytics: fake });
    getService('analytics').track('workout_started');
    expect(fake.track).toHaveBeenCalledWith('workout_started');
  });
});
