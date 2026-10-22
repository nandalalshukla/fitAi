import { createContext, useContext, useMemo, type ReactNode } from 'react';
import { useColorScheme } from 'react-native';
import { create } from 'zustand';

import { themes, type ColorScheme, type Theme } from './theme';

export type AppearancePreference = 'system' | 'dark' | 'light';

interface AppearanceState {
  preference: AppearancePreference;
  setPreference: (preference: AppearancePreference) => void;
}

/**
 * Appearance preference. Dark is the brand default; users can opt into
 * following the system setting or forcing light. Persisted via the settings
 * store once MMKV is wired in (Phase 5).
 */
export const useAppearanceStore = create<AppearanceState>((set) => ({
  preference: 'dark',
  setPreference: (preference) => set({ preference }),
}));

export function resolveScheme(
  preference: AppearancePreference,
  system: ColorScheme | null | undefined,
): ColorScheme {
  if (preference === 'system') return system === 'light' ? 'light' : 'dark';
  return preference;
}

const ThemeContext = createContext<Theme>(themes.dark);

export function ThemeProvider({
  children,
  scheme: forcedScheme,
}: {
  children: ReactNode;
  /** Force a scheme (tests, previews). */
  scheme?: ColorScheme;
}) {
  const system = useColorScheme();
  const preference = useAppearanceStore((s) => s.preference);
  const scheme = forcedScheme ?? resolveScheme(preference, system);
  const theme = useMemo(() => themes[scheme], [scheme]);
  return <ThemeContext.Provider value={theme}>{children}</ThemeContext.Provider>;
}

export const useTheme = (): Theme => useContext(ThemeContext);
