import AsyncStorage from '@react-native-async-storage/async-storage';
import * as SecureStore from 'expo-secure-store';
import { Sentry } from '../sentry';

jest.mock('expo-secure-store', () => ({
  AFTER_FIRST_UNLOCK: 'AFTER_FIRST_UNLOCK',
  WHEN_UNLOCKED: 'WHEN_UNLOCKED',
  getItemAsync: jest.fn(),
  setItemAsync: jest.fn(),
  deleteItemAsync: jest.fn(),
}));

import { storageAdapter, __resetStorageMigrationForTests } from '../supabase';

const KEY = 'sb-test-auth-token';
const FLAG = `@breathflow_keychain_migrated_v1:${KEY}`;
const OPTS = { keychainAccessible: 'AFTER_FIRST_UNLOCK' };

const getMock = SecureStore.getItemAsync as jest.Mock;
const setMock = SecureStore.setItemAsync as jest.Mock;
const delMock = SecureStore.deleteItemAsync as jest.Mock;

const session = (expiresAt: number) => JSON.stringify({ expires_at: expiresAt });

let keychain: Map<string, string>;

beforeEach(async () => {
  jest.clearAllMocks();
  await AsyncStorage.clear();
  (AsyncStorage.getItem as jest.Mock).mockClear();
  keychain = new Map();
  getMock.mockImplementation(async (k: string) => keychain.get(k) ?? null);
  setMock.mockImplementation(async (k: string, v: string) => {
    keychain.set(k, v);
  });
  delMock.mockImplementation(async (k: string) => {
    keychain.delete(k);
  });
  __resetStorageMigrationForTests();
});

describe('supabase storageAdapter', () => {
  it('setItem uses AFTER_FIRST_UNLOCK', async () => {
    await storageAdapter.setItem(KEY, 'v');
    expect(setMock).toHaveBeenCalledWith(KEY, 'v', OPTS);
  });

  it('getItem passes AFTER_FIRST_UNLOCK on reads', async () => {
    keychain.set(KEY, 'v');
    await expect(storageAdapter.getItem(KEY)).resolves.toBe('v');
    expect(getMock).toHaveBeenLastCalledWith(KEY, OPTS);
  });

  it('migrates an existing keychain item (delete then set) exactly once across calls and relaunch', async () => {
    keychain.set(KEY, session(100));
    await storageAdapter.getItem(KEY);
    await storageAdapter.getItem(KEY);
    expect(delMock).toHaveBeenCalledTimes(1);
    expect(delMock).toHaveBeenCalledWith(KEY, OPTS);
    expect(setMock).toHaveBeenCalledTimes(1);
    expect(setMock).toHaveBeenCalledWith(KEY, session(100), OPTS);
    expect(delMock.mock.invocationCallOrder[0]).toBeLessThan(setMock.mock.invocationCallOrder[0]);
    expect(await AsyncStorage.getItem(FLAG)).toBe('1');

    // Relaunch: in-memory memo gone, persisted flag remains
    __resetStorageMigrationForTests();
    await storageAdapter.getItem(KEY);
    expect(delMock).toHaveBeenCalledTimes(1);
    expect(setMock).toHaveBeenCalledTimes(1);
  });

  it('concurrent calls share a single migration', async () => {
    keychain.set(KEY, session(100));
    await Promise.all([storageAdapter.getItem(KEY), storageAdapter.getItem(KEY)]);
    expect(setMock).toHaveBeenCalledTimes(1);
  });

  it('prefers the AsyncStorage backup when its expires_at is newer, and removes it', async () => {
    keychain.set(KEY, session(100));
    await AsyncStorage.setItem(KEY, session(200));
    const result = await storageAdapter.getItem(KEY);
    expect(setMock).toHaveBeenCalledWith(KEY, session(200), OPTS);
    expect(result).toBe(session(200));
    expect(await AsyncStorage.getItem(KEY)).toBeNull();
    expect(await AsyncStorage.getItem(FLAG)).toBe('1');
  });

  it('keeps the keychain value when it is newer', async () => {
    keychain.set(KEY, session(300));
    await AsyncStorage.setItem(KEY, session(200));
    await storageAdapter.getItem(KEY);
    expect(setMock).toHaveBeenCalledWith(KEY, session(300), OPTS);
    expect(await AsyncStorage.getItem(KEY)).toBeNull();
  });

  it('prefers keychain when values are unparsable', async () => {
    keychain.set(KEY, 'not-json');
    await AsyncStorage.setItem(KEY, 'also-not-json');
    await storageAdapter.getItem(KEY);
    expect(setMock).toHaveBeenCalledWith(KEY, 'not-json', OPTS);
  });

  it('takes the backup when keychain is empty', async () => {
    await AsyncStorage.setItem(KEY, session(50));
    await storageAdapter.getItem(KEY);
    expect(setMock).toHaveBeenCalledWith(KEY, session(50), OPTS);
  });

  it('sets the flag without touching the keychain when nothing exists', async () => {
    await expect(storageAdapter.getItem(KEY)).resolves.toBeNull();
    expect(delMock).not.toHaveBeenCalled();
    expect(setMock).not.toHaveBeenCalled();
    expect(await AsyncStorage.getItem(FLAG)).toBe('1');
  });

  it('backs up to AsyncStorage and leaves flag unset when re-add fails after delete', async () => {
    keychain.set(KEY, session(100));
    setMock.mockRejectedValueOnce(new Error('locked'));
    await storageAdapter.getItem(KEY);
    expect(await AsyncStorage.getItem(KEY)).toBe(session(100));
    expect(await AsyncStorage.getItem(FLAG)).toBeNull();
    expect(Sentry.captureException).toHaveBeenCalled();
  });

  it('aborts migration without setting the flag when the keychain read throws', async () => {
    keychain.set(KEY, session(100));
    getMock.mockRejectedValueOnce(new Error('locked'));
    await storageAdapter.getItem(KEY);
    expect(await AsyncStorage.getItem(FLAG)).toBeNull();
    expect(delMock).not.toHaveBeenCalled();
    expect(setMock).not.toHaveBeenCalled();
    expect(Sentry.captureException).toHaveBeenCalled();
  });

  it('getItem returns null on keychain error when there is no backup', async () => {
    await AsyncStorage.setItem(FLAG, '1');
    getMock.mockRejectedValue(new Error('locked'));
    await expect(storageAdapter.getItem(KEY)).resolves.toBeNull();
    expect(Sentry.captureException).toHaveBeenCalled();
  });

  it('writes a backup before deleting during migration, so a kill mid-way cannot lose the session', async () => {
    keychain.set(KEY, session(100));
    let backupAtDelete: string | null = null;
    delMock.mockImplementationOnce(async (k: string) => {
      backupAtDelete = await AsyncStorage.getItem(KEY);
      keychain.delete(k);
    });
    await storageAdapter.getItem(KEY);
    expect(backupAtDelete).toBe(session(100));
    // Backup is cleaned up only once the re-add succeeded
    expect(await AsyncStorage.getItem(KEY)).toBeNull();
    expect(await AsyncStorage.getItem(FLAG)).toBe('1');
  });

  it('returns the newer backup in the same process after a failed keychain write (no stale refresh token)', async () => {
    await AsyncStorage.setItem(FLAG, '1');
    keychain.set(KEY, session(100));
    setMock.mockRejectedValueOnce(new Error('locked'));
    await storageAdapter.setItem(KEY, session(200));
    await expect(storageAdapter.getItem(KEY)).resolves.toBe(session(200));
  });

  it('a later successful setItem clears the backup', async () => {
    await AsyncStorage.setItem(FLAG, '1');
    setMock.mockRejectedValueOnce(new Error('locked'));
    await storageAdapter.setItem(KEY, session(200));
    await storageAdapter.setItem(KEY, session(300));
    expect(await AsyncStorage.getItem(KEY)).toBeNull();
    await expect(storageAdapter.getItem(KEY)).resolves.toBe(session(300));
  });

  it('reports a repeating keychain error to Sentry only once per launch', async () => {
    await AsyncStorage.setItem(FLAG, '1');
    getMock.mockRejectedValue(new Error('locked'));
    await storageAdapter.getItem(KEY);
    await storageAdapter.getItem(KEY);
    await storageAdapter.getItem(KEY);
    expect(Sentry.captureException).toHaveBeenCalledTimes(1);
  });

  it('setItem keychain error writes backup and clears the migration flag', async () => {
    await AsyncStorage.setItem(FLAG, '1');
    __resetStorageMigrationForTests();
    setMock.mockRejectedValueOnce(new Error('locked'));
    await storageAdapter.setItem(KEY, 'new');
    expect(await AsyncStorage.getItem(KEY)).toBe('new');
    expect(await AsyncStorage.getItem(FLAG)).toBeNull();
    expect(Sentry.captureException).toHaveBeenCalled();
  });

  it('removeItem deletes from keychain and AsyncStorage, and never throws', async () => {
    await AsyncStorage.setItem(KEY, 'x');
    await storageAdapter.removeItem(KEY);
    expect(delMock).toHaveBeenCalledWith(KEY, OPTS);
    expect(await AsyncStorage.getItem(KEY)).toBeNull();

    delMock.mockRejectedValue(new Error('locked'));
    await expect(storageAdapter.removeItem(KEY)).resolves.toBeUndefined();
    expect(Sentry.captureException).toHaveBeenCalled();
  });
});
