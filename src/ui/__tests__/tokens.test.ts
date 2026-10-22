import { darkColors, lightColors, type ColorTokens } from '../theme/colors';
import { contrastRatio } from '../theme/contrast';
import { durations, springs } from '../theme/motion';
import { resolveScheme } from '../theme/ThemeProvider';
import { hitTarget, spacing } from '../theme/tokens';

const AA_TEXT = 4.5;
const AA_LARGE = 3;

type Pair = [fg: keyof ColorTokens, bg: keyof ColorTokens, min: number];

const pairs: Pair[] = [
  ['text', 'background', AA_TEXT],
  ['text', 'surface', AA_TEXT],
  ['text', 'surfaceElevated', AA_TEXT],
  ['textMuted', 'background', AA_TEXT],
  ['textMuted', 'surface', AA_TEXT],
  ['textSubtle', 'background', AA_LARGE],
  ['onAccent', 'accent', AA_TEXT],
  ['accentText', 'background', AA_TEXT],
  ['accentText', 'surface', AA_TEXT],
  ['onStatus', 'danger', AA_TEXT],
  ['onStatus', 'success', AA_TEXT],
  ['onStatus', 'warning', AA_TEXT],
  ['successText', 'surface', AA_TEXT],
  ['warningText', 'surface', AA_TEXT],
  ['dangerText', 'surface', AA_TEXT],
];

describe.each([
  ['dark', darkColors],
  ['light', lightColors],
] as const)('%s color tokens meet WCAG AA', (_name, colors) => {
  it.each(pairs)('%s on %s', (fg, bg, min) => {
    expect(contrastRatio(colors[fg], colors[bg])).toBeGreaterThanOrEqual(min);
  });
});

describe('layout + motion tokens', () => {
  it('spacing is on the 4pt grid', () => {
    Object.values(spacing).forEach((v) => expect(v % 4).toBe(0));
  });

  it('touch targets are at least 48dp', () => {
    expect(hitTarget).toBeGreaterThanOrEqual(48);
  });

  it('UI feedback durations stay within 150-350 ms (instant/ambient excluded)', () => {
    const { instant: _i, ambient: _a, ...ui } = durations;
    Object.values(ui).forEach((d) => {
      expect(d).toBeGreaterThanOrEqual(150);
      expect(d).toBeLessThanOrEqual(350);
    });
  });

  it('springs are positive and damped', () => {
    Object.values(springs).forEach((s) => {
      expect(s.damping).toBeGreaterThan(0);
      expect(s.stiffness).toBeGreaterThan(0);
    });
  });
});

describe('resolveScheme', () => {
  it('defaults to dark when following system with no preference', () => {
    expect(resolveScheme('system', null)).toBe('dark');
    expect(resolveScheme('system', 'light')).toBe('light');
    expect(resolveScheme('dark', 'light')).toBe('dark');
    expect(resolveScheme('light', 'dark')).toBe('light');
  });
});
