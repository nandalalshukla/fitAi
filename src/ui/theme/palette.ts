/**
 * Raw palette. Never import this from feature code: use semantic colors from
 * `useTheme().colors`. This file is the ONLY place raw hex values live.
 */
export const palette = {
  ink950: '#07080A',
  ink900: '#0B0D10',
  ink850: '#111419',
  ink800: '#161A20',
  ink750: '#1C2129',
  ink700: '#252B35',
  ink600: '#363E4A',
  ink500: '#5A6472',
  ink400: '#8A94A3',
  ink300: '#AEB6C2',
  ink200: '#D4D9E0',
  ink100: '#E9ECF0',
  ink50: '#F5F6F8',
  white: '#FFFFFF',

  // Signature accent: electric volt. High contrast on dark, used as a fill on light.
  volt400: '#D4FF5C',
  volt500: '#C6FF3D',
  volt600: '#A6E021',
  volt800: '#3F5A00',
  volt900: '#2E4200',

  // Secondary accent for gradients / streak flame.
  ember400: '#FF8A4C',
  ember500: '#FF6A2B',
  ember700: '#B23C0A',

  green400: '#4BE38E',
  green500: '#22C76E',
  green700: '#0E7A3F',
  amber400: '#FFC247',
  amber500: '#FFB020',
  amber700: '#8F5A00',
  red400: '#FF6B6E',
  red500: '#FF4D52',
  red700: '#B3151C',
  blue400: '#5CC8FF',
  blue700: '#0B6699',
} as const;
