import type { Session, SupabaseClient } from '@supabase/supabase-js';
import * as Crypto from 'expo-crypto';

import { AppError, err, kv, logger, ok, tryAsync, type Result } from '@/core';
import {
  exportLocalData,
  getDataRuntime,
  getSupabase,
  reassignLocalUser,
  requestSync,
  setSyncUser,
  syncNow,
  wipeLocalData,
} from '@/data';
import { newId } from '@/data/ids';

import { currentUserId, useAuthStore, type AuthProvider, type AuthUser } from './authStore';

const LOCAL_GUEST_KEY = 'auth.localGuestId';

function userFromSession(session: Session | null): AuthUser | null {
  const u = session?.user;
  if (!u) return null;
  const provider = (u.app_metadata?.provider as string | undefined) ?? 'email';
  return {
    id: u.id,
    email: u.email ?? null,
    isGuest: u.is_anonymous === true,
    provider: u.is_anonymous
      ? 'anonymous'
      : ((['email', 'google', 'apple'].includes(provider) ? provider : 'email') as AuthProvider),
  };
}

/**
 * When the owning user id changes (guest → account), move local data across
 * and upload it. Data recorded offline as a guest is never lost.
 */
async function adoptLocalData(previous: string | null, next: AuthUser | null): Promise<void> {
  if (!previous || !next || previous === next.id) return;
  try {
    const moved = await reassignLocalUser(getDataRuntime().repos.ctx, previous, next.id);
    if (moved > 0) logger.info('Migrated local data to account', { moved });
  } catch (e) {
    logger.error('Local data migration failed', { error: String(e) });
  }
}

async function applySession(session: Session | null): Promise<void> {
  const previous = currentUserId();
  const user = userFromSession(session);
  if (user) {
    await adoptLocalData(previous, user);
    useAuthStore.getState().set({ status: 'signedIn', user });
    requestSync(0);
  } else if (useAuthStore.getState().user?.provider !== 'local') {
    useAuthStore.getState().set({ status: 'signedOut', user: null });
  }
}

const supabaseOrError = (): Result<SupabaseClient> => {
  const s = getSupabase();
  return s
    ? ok(s)
    : err(
        new AppError(
          'network',
          'Accounts are not available in this build (backend not configured).',
        ),
      );
};

export const authService = {
  /** Restores the session (or local guest) at app start. */
  async init(): Promise<void> {
    setSyncUser(() => {
      const u = useAuthStore.getState().user;
      return u && u.provider !== 'local' ? u.id : null; // local guests have nothing to sync to
    });
    const localGuest = kv.getString(LOCAL_GUEST_KEY);
    const supabase = getSupabase();
    if (supabase) {
      const { data } = await supabase.auth.getSession();
      if (data.session) {
        await applySession(data.session);
      } else if (localGuest) {
        useAuthStore.getState().set({
          status: 'signedIn',
          user: { id: localGuest, email: null, isGuest: true, provider: 'local' },
        });
      } else {
        useAuthStore.getState().set({ status: 'signedOut', user: null });
      }
      supabase.auth.onAuthStateChange((event, session) => {
        if (event === 'SIGNED_IN' || event === 'USER_UPDATED' || event === 'SIGNED_OUT')
          void applySession(session);
      });
    } else {
      useAuthStore.getState().set(
        localGuest
          ? {
              status: 'signedIn',
              user: { id: localGuest, email: null, isGuest: true, provider: 'local' },
            }
          : { status: 'signedOut', user: null },
      );
    }
  },

  /** Guest mode: Supabase anonymous user when possible, otherwise a local-only guest. */
  async continueAsGuest(): Promise<Result<AuthUser>> {
    const supabase = getSupabase();
    if (supabase) {
      const { data, error } = await supabase.auth.signInAnonymously();
      if (!error && data.session) {
        await applySession(data.session);
        return ok(useAuthStore.getState().user!);
      }
      logger.warn('Anonymous sign-in unavailable, using a local guest', { error: error?.message });
    }
    const id = kv.getString(LOCAL_GUEST_KEY) ?? newId();
    kv.set(LOCAL_GUEST_KEY, id);
    const user: AuthUser = { id, email: null, isGuest: true, provider: 'local' };
    useAuthStore.getState().set({ status: 'signedIn', user });
    return ok(user);
  },

  /**
   * Sends a 6-digit email code. A Supabase guest is UPGRADED (same user id: no
   * data migration needed); otherwise this signs in / signs up.
   */
  async sendEmailCode(email: string): Promise<Result<{ upgrade: boolean }>> {
    const s = supabaseOrError();
    if (!s.ok) return s;
    const user = useAuthStore.getState().user;
    if (user?.provider === 'anonymous') {
      const { error } = await s.value.auth.updateUser({ email });
      return error
        ? err(new AppError('unauthorized', error.message, error))
        : ok({ upgrade: true });
    }
    const { error } = await s.value.auth.signInWithOtp({
      email,
      options: { shouldCreateUser: true },
    });
    return error ? err(new AppError('unauthorized', error.message, error)) : ok({ upgrade: false });
  },

  async verifyEmailCode(email: string, code: string, upgrade: boolean): Promise<Result<AuthUser>> {
    const s = supabaseOrError();
    if (!s.ok) return s;
    const { data, error } = await s.value.auth.verifyOtp({
      email,
      token: code.trim(),
      type: upgrade ? 'email_change' : 'email',
    });
    if (error) return err(new AppError('unauthorized', error.message, error));
    const session = data.session ?? (await s.value.auth.getSession()).data.session;
    await applySession(session);
    const u = useAuthStore.getState().user;
    return u ? ok(u) : err(new AppError('unauthorized', 'Sign-in did not complete'));
  },

  async signInWithGoogle(webClientId: string, iosClientId?: string): Promise<Result<AuthUser>> {
    const s = supabaseOrError();
    if (!s.ok) return s;
    return tryAsync(async () => {
      const { GoogleSignin, isSuccessResponse } =
        await import('@react-native-google-signin/google-signin');
      GoogleSignin.configure({ webClientId, iosClientId });
      await GoogleSignin.hasPlayServices();
      const res = await GoogleSignin.signIn();
      if (!isSuccessResponse(res) || !res.data.idToken)
        throw new AppError('unauthorized', 'Google sign-in was cancelled');
      const { data, error } = await s.value.auth.signInWithIdToken({
        provider: 'google',
        token: res.data.idToken,
      });
      if (error) throw error;
      await applySession(data.session);
      return useAuthStore.getState().user!;
    }, 'unauthorized');
  },

  async signInWithApple(): Promise<Result<AuthUser>> {
    const s = supabaseOrError();
    if (!s.ok) return s;
    return tryAsync(async () => {
      const Apple = await import('expo-apple-authentication');
      const rawNonce = newId();
      const hashed = await Crypto.digestStringAsync(Crypto.CryptoDigestAlgorithm.SHA256, rawNonce);
      const cred = await Apple.signInAsync({
        requestedScopes: [
          Apple.AppleAuthenticationScope.FULL_NAME,
          Apple.AppleAuthenticationScope.EMAIL,
        ],
        nonce: hashed,
      });
      if (!cred.identityToken)
        throw new AppError('unauthorized', 'Apple sign-in returned no identity token');
      const { data, error } = await s.value.auth.signInWithIdToken({
        provider: 'apple',
        token: cred.identityToken,
        nonce: rawNonce,
      });
      if (error) throw error;
      await applySession(data.session);
      return useAuthStore.getState().user!;
    }, 'unauthorized');
  },

  /** Syncs what it can, then signs out and clears this device. */
  async signOut(): Promise<Result<void>> {
    await syncNow();
    const supabase = getSupabase();
    if (supabase) await supabase.auth.signOut().catch(() => undefined);
    kv.remove(LOCAL_GUEST_KEY);
    await wipeLocalData(getDataRuntime().repos.ctx);
    useAuthStore.getState().set({ status: 'signedOut', user: null });
    return ok(undefined);
  },

  /** Permanently deletes the account and all data (server + device). */
  async deleteAccount(): Promise<Result<void>> {
    const user = useAuthStore.getState().user;
    const supabase = getSupabase();
    if (supabase && user && user.provider !== 'local') {
      const { error } = await supabase.rpc('delete_my_account');
      if (error)
        return err(
          new AppError('network', `Could not delete the account: ${error.message}`, error),
        );
      await supabase.auth.signOut().catch(() => undefined);
    }
    kv.remove(LOCAL_GUEST_KEY);
    await wipeLocalData(getDataRuntime().repos.ctx);
    useAuthStore.getState().set({ status: 'signedOut', user: null });
    return ok(undefined);
  },

  /** All data stored for the current user (from this device; includes unsynced changes). */
  async exportData(): Promise<Result<Record<string, unknown>>> {
    const id = currentUserId();
    if (!id) return err(new AppError('unauthorized', 'Not signed in'));
    return ok(await exportLocalData(getDataRuntime().repos.ctx, id));
  },
};
