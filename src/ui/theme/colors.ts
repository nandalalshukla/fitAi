import { palette as p } from './palette';

/** Semantic color roles. Screens/components only ever use these names. */
export interface ColorTokens {
  background: string;
  surface: string;
  surfaceElevated: string;
  surfacePressed: string;
  border: string;
  borderStrong: string;
  text: string;
  textMuted: string;
  textSubtle: string;
  textInverse: string;
  /** Accent used as a FILL (buttons, active chips, progress). */
  accent: string;
  /** Text/icon color placed ON an accent fill. */
  onAccent: string;
  /** Accent used as TEXT/ICON on `background`/`surface` (meets AA). */
  accentText: string;
  accentMuted: string;
  ember: string;
  success: string;
  warning: string;
  danger: string;
  info: string;
  /** Text on success/warning/danger fills. */
  onStatus: string;
  successText: string;
  warningText: string;
  dangerText: string;
  overlay: string;
  scrim: string;
  skeletonBase: string;
  skeletonHighlight: string;
  /** Skeleton overlay colors for the pose view. */
  poseGood: string;
  poseWarn: string;
  poseBad: string;
  gradientStart: string;
  gradientEnd: string;
}

export const darkColors: ColorTokens = {
  background: p.ink900,
  surface: p.ink800,
  surfaceElevated: p.ink750,
  surfacePressed: p.ink700,
  border: p.ink700,
  borderStrong: p.ink600,
  text: p.ink50,
  textMuted: p.ink300,
  textSubtle: p.ink400,
  textInverse: p.ink900,
  accent: p.volt500,
  onAccent: p.ink900,
  accentText: p.volt500,
  accentMuted: p.volt900,
  ember: p.ember500,
  success: p.green500,
  warning: p.amber500,
  danger: p.red500,
  info: p.blue400,
  onStatus: p.ink900,
  successText: p.green400,
  warningText: p.amber400,
  dangerText: p.red400,
  overlay: 'rgba(7, 8, 10, 0.72)',
  scrim: 'rgba(7, 8, 10, 0.5)',
  skeletonBase: p.ink800,
  skeletonHighlight: p.ink700,
  poseGood: p.green400,
  poseWarn: p.amber400,
  poseBad: p.red400,
  gradientStart: p.volt500,
  gradientEnd: p.volt600,
};

export const lightColors: ColorTokens = {
  background: p.ink50,
  surface: p.white,
  surfaceElevated: p.white,
  surfacePressed: p.ink100,
  border: p.ink200,
  borderStrong: p.ink300,
  text: p.ink900,
  textMuted: p.ink500,
  textSubtle: p.ink500,
  textInverse: p.ink50,
  accent: p.volt500,
  onAccent: p.ink900,
  accentText: p.volt800,
  accentMuted: p.ink100,
  ember: p.ember700,
  success: p.green500,
  warning: p.amber500,
  danger: p.red500,
  info: p.blue700,
  onStatus: p.ink900,
  successText: p.green700,
  warningText: p.amber700,
  dangerText: p.red700,
  overlay: 'rgba(11, 13, 16, 0.55)',
  scrim: 'rgba(11, 13, 16, 0.35)',
  skeletonBase: p.ink100,
  skeletonHighlight: p.ink50,
  poseGood: p.green500,
  poseWarn: p.amber500,
  poseBad: p.red500,
  gradientStart: p.volt400,
  gradientEnd: p.volt500,
};
