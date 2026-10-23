import { kv } from '@/core/storage';
import { getSupabase } from '@/data/supabase/client';
import { migrateLocal } from '@/data/db/migrations';
import { pendingCount } from '@/data/db/outbox';
import { createRepositories } from '@/data/repositories';
import { getDataRuntime, setDataRuntimeForTests } from '@/data/runtime';
import { createTestDatabase } from '@/data/testing/sqljs';

import { authService } from './authService';
import { useAuthStore } from './authStore';

jest.mock('@/data/supabase/client', () => ({ getSupabase: jest.fn(() => null) }));
jest.mock('expo-crypto', () => ({
  digestStringAsync: jest.fn(async () => 'hash'),
  CryptoDigestAlgorithm: { SHA256: 'SHA-256' },
}));

const NEW_USER = 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa';
const ANON = 'bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb';

function fakeSupabase() {
  let session: unknown = null;
  const listeners: ((e: string, s: unknown) => void)[] = [];
  const sessionFor = (id: string, extra: object) => ({
    user: { id, app_metadata: { provider: 'email' }, ...extra },
  });
  const auth = {
    getSession: jest.fn(async () => ({ data: { session } })),
    onAuthStateChange: jest.fn((cb: (e: string, s: unknown) => void) => {
      listeners.push(cb);
      return { data: { subscription: { unsubscribe: jest.fn() } } };
    }),
    signInAnonymously: jest.fn(async () => {
      session = sessionFor(ANON, { is_anonymous: true });
      return { data: { session }, error: null };
    }),
    updateUser: jest.fn(async () => ({ data: {}, error: null })),
    signInWithOtp: jest.fn(async () => ({ data: {}, error: null })),
    verifyOtp: jest.fn(async ({ type }: { type: string }) => {
      session =
        type === 'email_change'
          ? sessionFor(ANON, { email: 'a@b.co' })
          : sessionFor(NEW_USER, { email: 'a@b.co' });
      return { data: { session }, error: null };
    }),
    signOut: jest.fn(async () => ({ error: null })),
  };
  return { auth, rpc: jest.fn(async () => ({ error: null })) };
}

beforeEach(async () => {
  const db = await createTestDatabase();
  await migrateLocal(db);
  setDataRuntimeForTests({ db, repos: createRepositories(db), sync: null });
  kv.remove('auth.localGuestId');
  useAuthStore.getState().set({ status: 'initializing', user: null });
  (getSupabase as jest.Mock).mockReturnValue(null);
});

describe('authService without a backend (fully local app)', () => {
  it('starts signed out, then creates and restores a local guest', async () => {
    await authService.init();
    expect(useAuthStore.getState().status).toBe('signedOut');
    const r = await authService.continueAsGuest();
    expect(r.ok && r.value.provider).toBe('local');
    const id = useAuthStore.getState().user!.id;
    useAuthStore.getState().set({ status: 'initializing', user: null });
    await authService.init();
    expect(useAuthStore.getState().user).toMatchObject({ id, isGuest: true });
  });

  it('email sign-in explains that accounts need the backend', async () => {
    const r = await authService.sendEmailCode('a@b.co');
    expect(r.ok).toBe(false);
  });
});

describe('authService with Supabase', () => {
  it('guest = anonymous user; adding an email upgrades the same account', async () => {
    const sb = fakeSupabase();
    (getSupabase as jest.Mock).mockReturnValue(sb);
    await authService.init();
    await authService.continueAsGuest();
    expect(useAuthStore.getState().user).toMatchObject({
      id: ANON,
      isGuest: true,
      provider: 'anonymous',
    });
    const send = await authService.sendEmailCode('a@b.co');
    expect(send.ok && send.value.upgrade).toBe(true);
    expect(sb.auth.updateUser).toHaveBeenCalledWith({ email: 'a@b.co' });
    await authService.verifyEmailCode('a@b.co', '123456', true);
    expect(useAuthStore.getState().user).toMatchObject({
      id: ANON,
      isGuest: false,
      email: 'a@b.co',
    });
  });

  it('data recorded as a local guest moves to the account on sign-in', async () => {
    await authService.continueAsGuest(); // backend unreachable → local guest
    const guestId = useAuthStore.getState().user!.id;
    const repos = getDataRuntime().repos;
    const s = await repos.workouts.startSession({ userId: guestId, mode: 'free' });
    await repos.workouts.recordSet(s, { exerciseId: 'squat', setIndex: 0, reps: 12 });

    const sb = fakeSupabase();
    (getSupabase as jest.Mock).mockReturnValue(sb);
    await authService.sendEmailCode('a@b.co');
    expect(sb.auth.signInWithOtp).toHaveBeenCalled();
    await authService.verifyEmailCode('a@b.co', '123456', false);
    expect(useAuthStore.getState().user?.id).toBe(NEW_USER);
    expect((await repos.workouts.allSets(NEW_USER)).map((x) => x.reps)).toEqual([12]);
    expect(await pendingCount(getDataRuntime().db)).toBeGreaterThanOrEqual(2);
  });

  it('deletes the account on the server and wipes the device', async () => {
    const sb = fakeSupabase();
    (getSupabase as jest.Mock).mockReturnValue(sb);
    await authService.init();
    await authService.continueAsGuest();
    await getDataRuntime().repos.profiles.save(ANON, { displayName: 'x' });
    const exported = await authService.exportData();
    expect(exported.ok && (exported.value.profiles as unknown[]).length).toBe(1);
    const r = await authService.deleteAccount();
    expect(r.ok).toBe(true);
    expect(sb.rpc).toHaveBeenCalledWith('delete_my_account');
    expect(useAuthStore.getState().status).toBe('signedOut');
    expect(await getDataRuntime().repos.profiles.get(ANON)).toBeNull();
  });
});
