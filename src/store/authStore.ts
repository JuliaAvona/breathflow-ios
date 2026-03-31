import { create } from 'zustand';
import { Session as SupabaseSession, User } from '@supabase/supabase-js';
import AsyncStorage from '@react-native-async-storage/async-storage';
import * as SecureStore from 'expo-secure-store';
import { supabase, isSupabaseConfigured } from '../utils/supabase';
import { logOutRevenueCat } from '../utils/revenueCat';
import { useSessionsStore } from './sessionsStore';
import { useSettingsStore } from './settingsStore';
import { useBadgesStore } from './badgesStore';

const APPLE_REFRESH_TOKEN_KEY = 'breathflow_apple_refresh_token';

async function storeAppleRefreshToken(token: string): Promise<void> {
  try {
    await SecureStore.setItemAsync(APPLE_REFRESH_TOKEN_KEY, token);
  } catch {
    await AsyncStorage.setItem(APPLE_REFRESH_TOKEN_KEY, token);
  }
}

async function getAppleRefreshToken(): Promise<string | null> {
  try {
    return await SecureStore.getItemAsync(APPLE_REFRESH_TOKEN_KEY);
  } catch {
    return AsyncStorage.getItem(APPLE_REFRESH_TOKEN_KEY);
  }
}

async function clearAppleRefreshToken(): Promise<void> {
  try {
    await SecureStore.deleteItemAsync(APPLE_REFRESH_TOKEN_KEY);
  } catch {}
  try {
    await AsyncStorage.removeItem(APPLE_REFRESH_TOKEN_KEY);
  } catch {}
}

interface AuthStore {
  user: User | null;
  session: SupabaseSession | null;
  isAnonymous: boolean;
  displayName: string | null;
  _hydrated: boolean;

  hydrate: () => Promise<void>;
  signInAnonymously: () => Promise<void>;
  signInWithApple: (idToken: string, nonce: string, authorizationCode: string, givenName?: string | null) => Promise<void>;
  linkAppleAccount: (idToken: string, nonce: string, authorizationCode: string, givenName?: string | null) => Promise<void>;
  signOut: () => Promise<void>;
  deleteAccount: () => Promise<void>;
}

/**
 * Exchange Apple authorization code for a refresh token via Supabase Edge Function,
 * then store it in SecureStore for later revocation on account deletion.
 */
async function exchangeAppleCode(authorizationCode: string): Promise<void> {
  if (!isSupabaseConfigured) return;
  try {
    const { data, error } = await supabase.functions.invoke('apple-token', {
      body: { action: 'exchange', code: authorizationCode },
    });
    if (error) throw error;
    if (data?.refresh_token) {
      await storeAppleRefreshToken(data.refresh_token);
    }
  } catch {
    // Edge function not deployed yet — non-blocking
  }
}

/**
 * Revoke Apple refresh token via Supabase Edge Function.
 * Required by Apple Guideline 5.1.1(v) for account deletion.
 */
async function revokeAppleToken(): Promise<void> {
  const refreshToken = await getAppleRefreshToken();
  if (!refreshToken || !isSupabaseConfigured) return;

  try {
    await supabase.functions.invoke('apple-token', {
      body: { action: 'revoke', refresh_token: refreshToken },
    });
  } catch {
    // Best-effort revocation
  }
  await clearAppleRefreshToken();
}

const DISPLAY_NAME_KEY = '@breathflow_display_name';

export const useAuthStore = create<AuthStore>((set, get) => ({
  user: null,
  session: null,
  isAnonymous: true,
  displayName: null,
  _hydrated: false,

  hydrate: async () => {
    if (!isSupabaseConfigured) {
      set({ _hydrated: true });
      return;
    }

    try {
      const {
        data: { session },
      } = await supabase.auth.getSession();

      const savedName = await AsyncStorage.getItem(DISPLAY_NAME_KEY).catch(() => null);

      if (session) {
        set({
          user: session.user,
          session,
          isAnonymous: session.user.is_anonymous ?? true,
          displayName: savedName,
          _hydrated: true,
        });
      } else {
        await get().signInAnonymously();
        set({ _hydrated: true });
      }

      supabase.auth.onAuthStateChange((_event, newSession) => {
        set({
          user: newSession?.user ?? null,
          session: newSession,
          isAnonymous: newSession?.user?.is_anonymous ?? true,
        });
      });
    } catch (error) {
      // Hydration failed, trying anonymous sign-in
      try {
        await get().signInAnonymously();
      } catch {}
      set({ _hydrated: true });
    }
  },

  signInAnonymously: async () => {
    try {
      const { data, error } = await supabase.auth.signInAnonymously();
      if (error) {
        // Anonymous sign-in failed
        return;
      }
      set({
        user: data.session?.user ?? null,
        session: data.session,
        isAnonymous: true,
      });
    } catch (error) {
      // Anonymous sign-in error
    }
  },

  signInWithApple: async (idToken: string, nonce: string, authorizationCode: string, givenName?: string | null) => {
    const { data, error } = await supabase.auth.signInWithIdToken({
      provider: 'apple',
      token: idToken,
      nonce,
    });
    if (error) throw error;
    if (givenName) {
      await AsyncStorage.setItem(DISPLAY_NAME_KEY, givenName).catch(() => {});
    }
    const savedName = givenName ?? await AsyncStorage.getItem(DISPLAY_NAME_KEY).catch(() => null);
    set({
      user: data.session?.user ?? null,
      session: data.session,
      isAnonymous: false,
      displayName: savedName,
    });

    // Exchange auth code for refresh token (non-blocking)
    exchangeAppleCode(authorizationCode);
  },

  linkAppleAccount: async (idToken: string, nonce: string, authorizationCode: string, givenName?: string | null) => {
    try {
      const { error } = await supabase.auth.linkIdentity({
        provider: 'apple',
      });

      if (error) {
        // Link failed, trying direct sign-in
        await get().signInWithApple(idToken, nonce, authorizationCode, givenName);
        return;
      }
      if (givenName) {
        await AsyncStorage.setItem(DISPLAY_NAME_KEY, givenName).catch(() => {});
        set({ displayName: givenName });
      }

      const {
        data: { session },
      } = await supabase.auth.getSession();
      if (session) {
        set({
          user: session.user,
          session,
          isAnonymous: false,
        });
      }

      // Exchange auth code for refresh token (non-blocking)
      exchangeAppleCode(authorizationCode);
    } catch (error) {
      // Link error, falling back to sign-in
      await get().signInWithApple(idToken, nonce, authorizationCode);
    }
  },

  signOut: async () => {
    await supabase.auth.signOut();
    set({ user: null, session: null, isAnonymous: true });
  },

  deleteAccount: async () => {
    const userId = get().user?.id;
    const wasAppleUser = !get().isAnonymous;

    // Revoke Apple Sign-In token (Apple Guideline 5.1.1(v))
    if (wasAppleUser) {
      await revokeAppleToken();
    }

    // Delete all user data from Supabase tables
    if (userId && isSupabaseConfigured) {
      const tables = [
        'user_sessions',
        'user_stats',
        'user_settings',
        'user_profile',
        'user_badges',
      ];
      await Promise.all(
        tables.map((table) =>
          supabase.from(table).delete().eq('user_id', userId)
        )
      );
    }

    // Reset RevenueCat user
    try {
      await logOutRevenueCat();
    } catch {}

    // Clear all local storage
    try {
      await AsyncStorage.clear();
    } catch {}

    // Reset all in-memory Zustand stores
    useSessionsStore.setState({ sessions: [], stats: { totalSessions: 0, totalMinutes: 0, totalBreaths: 0, currentStreak: 0, longestStreak: 0, bestRetention: 0, avgRetention: 0, lastSessionDate: '', favoriteTechniqueId: '', sessionsPerTechnique: {} } });
    useBadgesStore.setState({ unlockedBadges: [] });

    // Sign out from Supabase (deletes session from SecureStore)
    try {
      await supabase.auth.signOut();
    } catch {}

    set({ user: null, session: null, isAnonymous: true });
  },
}));
