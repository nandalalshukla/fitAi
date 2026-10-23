import { randomBytes } from 'node:crypto';

import { createEncryptedStorage } from '../encryptedStorage';

function stores() {
  const secrets = new Map<string, string>();
  const plain = new Map<string, string>();
  return {
    secrets,
    plain,
    storage: createEncryptedStorage(
      {
        getItemAsync: async (k) => secrets.get(k) ?? null,
        setItemAsync: async (k, v) => void secrets.set(k, v),
        deleteItemAsync: async (k) => void secrets.delete(k),
      },
      {
        getString: (k) => plain.get(k),
        set: (k, v) => void plain.set(k, v),
        remove: (k) => plain.delete(k),
      },
      (n) => new Uint8Array(randomBytes(n)),
    ),
  };
}

describe('encrypted session storage', () => {
  const session = JSON.stringify({
    access_token: 'x'.repeat(3000),
    refresh_token: 'secret-refresh',
    user: { id: 'u' },
  });

  it('round-trips large values; plaintext never stored in MMKV, key only in SecureStore', async () => {
    const { storage, plain, secrets } = stores();
    await storage.setItem('sb-auth-token', session);
    expect(await storage.getItem('sb-auth-token')).toBe(session);
    const stored = [...plain.values()].join('');
    expect(stored).not.toContain('secret-refresh');
    expect([...secrets.values()][0]).toHaveLength(64); // 256-bit key, hex
  });

  it('uses a fresh key per write and supports removal', async () => {
    const { storage, secrets } = stores();
    await storage.setItem('k', 'a');
    const k1 = [...secrets.values()][0];
    await storage.setItem('k', 'a');
    expect([...secrets.values()][0]).not.toBe(k1);
    await storage.removeItem('k');
    expect(await storage.getItem('k')).toBeNull();
  });

  it('returns null when the key was lost (e.g. reinstall wiped the Keychain)', async () => {
    const { storage, secrets } = stores();
    await storage.setItem('k', 'value');
    secrets.clear();
    expect(await storage.getItem('k')).toBeNull();
  });
});
