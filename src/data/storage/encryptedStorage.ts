import aesjs from 'aes-js';

/**
 * Supabase session storage. Session JSON exceeds SecureStore's ~2 KB limit, so
 * (Supabase's recommended pattern) a random 256-bit AES key per item lives in the
 * Keychain/Keystore (SecureStore) and the AES-CTR ciphertext lives in MMKV.
 */
export interface SecretStore {
  getItemAsync(key: string): Promise<string | null>;
  setItemAsync(key: string, value: string): Promise<void>;
  deleteItemAsync(key: string): Promise<void>;
}

export interface PlainStore {
  getString(key: string): string | undefined;
  set(key: string, value: string): void;
  remove(key: string): boolean | void;
}

export interface AsyncStorageLike {
  getItem(key: string): Promise<string | null>;
  setItem(key: string, value: string): Promise<void>;
  removeItem(key: string): Promise<void>;
}

const keyName = (k: string) => `ek_${k.replace(/[^A-Za-z0-9._-]/g, '_')}`;
const dataName = (k: string) => `enc_${k}`;

export function createEncryptedStorage(
  secrets: SecretStore,
  plain: PlainStore,
  randomBytes: (n: number) => Uint8Array,
): AsyncStorageLike {
  return {
    async getItem(key) {
      const cipherHex = plain.getString(dataName(key));
      const keyHex = await secrets.getItemAsync(keyName(key));
      if (!cipherHex || !keyHex) return null;
      try {
        const ctr = new aesjs.ModeOfOperation.ctr(
          aesjs.utils.hex.toBytes(keyHex),
          new aesjs.Counter(1),
        );
        return aesjs.utils.utf8.fromBytes(ctr.decrypt(aesjs.utils.hex.toBytes(cipherHex)));
      } catch {
        return null;
      }
    },
    async setItem(key, value) {
      const keyBytes = randomBytes(32);
      const ctr = new aesjs.ModeOfOperation.ctr(keyBytes, new aesjs.Counter(1));
      const cipher = ctr.encrypt(aesjs.utils.utf8.toBytes(value));
      await secrets.setItemAsync(keyName(key), aesjs.utils.hex.fromBytes(keyBytes));
      plain.set(dataName(key), aesjs.utils.hex.fromBytes(cipher));
    },
    async removeItem(key) {
      plain.remove(dataName(key));
      await secrets.deleteItemAsync(keyName(key));
    },
  };
}
