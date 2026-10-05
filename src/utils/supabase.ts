import { createClient } from '@supabase/supabase-js';
import * as SecureStore from 'expo-secure-store';
import AsyncStorage from '@react-native-async-storage/async-storage';
import Constants from 'expo-constants';
import { Sentry } from './sentry';

const SUPABASE_URL = Constants.expoConfig?.extra?.supabaseUrl || '';
const SUPABASE_ANON_KEY = Constants.expoConfig?.extra?.supabaseAnonKey || '';

/** False when env vars are missing — used to skip network calls in dev without credentials */
export const isSupabaseConfigured =
  !!Constants.expoConfig?.extra?.supabaseUrl &&
  !!Constants.expoConfig?.extra?.supabaseAnonKey;

// Breathing sessions run with background audio while the device is locked, and
// the session push / token refresh at the end of a session happens then. The
// default WHEN_UNLOCKED keychain class makes those reads/writes throw, so we
// use AFTER_FIRST_UNLOCK instead.
const SECURE_OPTS = { keychainAccessible: SecureStore.AFTER_FIRST_UNLOCK };

const migrationFlagKey = (key: string) => `@breathflow_keychain_migrated_v1:${key}`;

// getItem runs on every auto-refresh tick, so a keychain that stays
// unavailable would flood Sentry; report each failure kind once per launch.
const reported = new Set<string>();
const reportError = (context: string, error: unknown) => {
  if (reported.has(context)) return;
  reported.add(context);
  Sentry.captureException(error);
};

/** Picks the value with the newer numeric `expires_at`; keychain wins when unparsable. */
function pickNewer(keychainValue: string | null, backupValue: string | null): string | null {
  if (keychainValue === null) return backupValue;
  if (backupValue === null) return keychainValue;
  try {
    const k = JSON.parse(keychainValue)?.expires_at;
    const b = JSON.parse(backupValue)?.expires_at;
    if (typeof k === 'number' && typeof b === 'number') {
      return b > k ? backupValue : keychainValue;
    }
  } catch {
    // fall through to keychain
  }
  return keychainValue;
}

/**
 * One-time per-key migration of existing items to AFTER_FIRST_UNLOCK. The
 * SecureStore update path (errSecDuplicateItem) only changes the value data and
 * keeps the old accessibility, so the item must be deleted and re-added. Also
 * reconciles values the old code wrote to AsyncStorage as a fallback.
 */
async function migrateKey(key: string): Promise<void> {
  try {
    const flagKey = migrationFlagKey(key);
    if (await AsyncStorage.getItem(flagKey)) return;

    let keychainValue: string | null;
    try {
      keychainValue = await SecureStore.getItemAsync(key, SECURE_OPTS);
    } catch (error) {
      // Likely locked device: retry on next launch, flag stays unset
      reportError(`migrate-read:${key}`, error);
      return;
    }
    const backupValue = await AsyncStorage.getItem(key);
    const chosen = pickNewer(keychainValue, backupValue);

    if (chosen !== null) {
      // Back up first: if the app is killed between delete and re-add, the
      // next launch (flag still unset) restores the session from here.
      if (backupValue !== chosen) await AsyncStorage.setItem(key, chosen);
      await SecureStore.deleteItemAsync(key, SECURE_OPTS);
      try {
        await SecureStore.setItemAsync(key, chosen, SECURE_OPTS);
      } catch (error) {
        // Keep the value recoverable; the next launch retries the migration
        await AsyncStorage.setItem(key, chosen);
        reportError(`migrate-write:${key}`, error);
        return;
      }
      await AsyncStorage.removeItem(key);
    }
    await AsyncStorage.setItem(flagKey, '1');
  } catch (error) {
    reportError(`migrate:${key}`, error);
  }
}

const migrations = new Map<string, Promise<void>>();

function ensureMigrated(key: string): Promise<void> {
  let promise = migrations.get(key);
  if (!promise) {
    promise = migrateKey(key);
    migrations.set(key, promise);
  }
  return promise;
}

/** Test-only: forget memoized migrations (simulates an app relaunch). */
export function __resetStorageMigrationForTests(): void {
  migrations.clear();
  reported.clear();
}

export const storageAdapter = {
  getItem: async (key: string): Promise<string | null> => {
    await ensureMigrated(key);
    let keychainValue: string | null = null;
    try {
      keychainValue = await SecureStore.getItemAsync(key, SECURE_OPTS);
    } catch (error) {
      reportError(`get:${key}`, error);
    }
    // A backup only exists after a failed keychain write, so it may hold a
    // newer session than the keychain; returning the stale one would make
    // auth-js reuse a rotated refresh token and drop the session.
    let backupValue: string | null = null;
    try {
      backupValue = await AsyncStorage.getItem(key);
    } catch (error) {
      reportError(`get-backup:${key}`, error);
    }
    return pickNewer(keychainValue, backupValue);
  },
  setItem: async (key: string, value: string): Promise<void> => {
    await ensureMigrated(key);
    try {
      await SecureStore.setItemAsync(key, value, SECURE_OPTS);
    } catch (error) {
      reportError(`set:${key}`, error);
      // Back up and clear the flag so the next launch's migration reconciles
      // the newer backup into the keychain.
      try {
        await AsyncStorage.setItem(key, value);
        await AsyncStorage.removeItem(migrationFlagKey(key));
      } catch (backupError) {
        reportError(`set-backup:${key}`, backupError);
      }
      return;
    }
    // The keychain now holds the latest session; drop any older backup.
    try {
      await AsyncStorage.removeItem(key);
    } catch (error) {
      reportError(`set-cleanup:${key}`, error);
    }
  },
  removeItem: async (key: string): Promise<void> => {
    await ensureMigrated(key);
    try {
      await SecureStore.deleteItemAsync(key, SECURE_OPTS);
    } catch (error) {
      reportError(`remove:${key}`, error);
    }
    try {
      await AsyncStorage.removeItem(key);
    } catch (error) {
      reportError(`remove-backup:${key}`, error);
    }
  },
};

export const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
  auth: {
    storage: storageAdapter,
    autoRefreshToken: true,
    persistSession: true,
    detectSessionInUrl: false,
  },
});
