import { create } from 'zustand';

export type AuthProvider = 'local' | 'anonymous' | 'email' | 'google' | 'apple';

export interface AuthUser {
  id: string;
  email: string | null;
  /** Guest (Supabase anonymous user or local-only guest). */
  isGuest: boolean;
  provider: AuthProvider;
}

export type AuthStatus = 'initializing' | 'signedOut' | 'signedIn';

interface AuthState {
  status: AuthStatus;
  user: AuthUser | null;
  set: (s: Partial<Pick<AuthState, 'status' | 'user'>>) => void;
}

export const useAuthStore = create<AuthState>((set) => ({
  status: 'initializing',
  user: null,
  set: (s) => set(s),
}));

/** The id that owns local data right now (account, anonymous or local guest). */
export const currentUserId = (): string | null => useAuthStore.getState().user?.id ?? null;

/** Reactive id of the user owning local data (null when signed out). */
export const useUserId = (): string | null => useAuthStore((s) => s.user?.id ?? null);
