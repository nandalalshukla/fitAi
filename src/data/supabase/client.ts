import { createClient, type SupabaseClient } from '@supabase/supabase-js';
import { getRandomBytes } from 'expo-crypto';
import * as SecureStore from 'expo-secure-store';
import { AppState } from 'react-native';

import { env, isBackendConfigured } from '@/core';

import { createEncryptedStorage } from '../storage/encryptedStorage';
import { kv } from '@/core/storage';

let client: SupabaseClient | null = null;
let listening = false;

/** Supabase client, or null when the backend isn't configured (app runs fully local). */
export function getSupabase(): SupabaseClient | null {
  if (!isBackendConfigured()) return null;
  if (!client) {
    client = createClient(env.EXPO_PUBLIC_SUPABASE_URL!, env.EXPO_PUBLIC_SUPABASE_ANON_KEY!, {
      auth: {
        storage: createEncryptedStorage(SecureStore, kv, getRandomBytes),
        autoRefreshToken: true,
        persistSession: true,
        detectSessionInUrl: false,
      },
    });
    if (!listening) {
      listening = true;
      // Refresh tokens only while the app is in the foreground (Supabase RN guidance).
      AppState.addEventListener('change', (state) => {
        if (state === 'active') void client?.auth.startAutoRefresh();
        else void client?.auth.stopAutoRefresh();
      });
    }
  }
  return client;
}
