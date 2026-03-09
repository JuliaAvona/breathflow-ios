import { supabase } from '../utils/supabase';
import { useAuthStore } from '../store/authStore';
import { useSessionsStore } from '../store/sessionsStore';
import { useSettingsStore } from '../store/settingsStore';
import { useProfileStore } from '../store/profileStore';
import { useBadgesStore } from '../store/badgesStore';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Session, UserStats, Settings, UserProfile } from '../types';

const LAST_SYNC_KEY = '@walkpace_last_sync';

// ==================== PUSH (local → cloud) ====================

export async function pushSessions(): Promise<void> {
  const userId = useAuthStore.getState().user?.id;
  if (!userId) return;

  const { sessions, stats } = useSessionsStore.getState();

  if (sessions.length > 0) {
    const rows = sessions.map((s) => ({
      id: s.id,
      user_id: userId,
      date: s.date,
      started_at: s.startedAt,
      completed_at: s.completedAt,
      rounds: s.rounds,
      total_rounds: s.totalRounds,
      fast_duration: s.fastDuration,
      slow_duration: s.slowDuration,
      total_duration: s.totalDuration,
      estimated_calories: s.estimatedCalories,
      completed: s.completed,
      warm_up: s.warmUp,
      cool_down: s.coolDown,
      steps: s.steps ?? null,
      distance: s.distance ?? null,
      updated_at: new Date().toISOString(),
    }));

    for (let i = 0; i < rows.length; i += 100) {
      const chunk = rows.slice(i, i + 100);
      await supabase.from('user_sessions').upsert(chunk, {
        onConflict: 'user_id,id',
      });
    }
  }

  await supabase.from('user_stats').upsert({
    user_id: userId,
    current_streak: stats.currentStreak,
    longest_streak: stats.longestStreak,
    total_sessions: stats.totalSessions,
    total_minutes: stats.totalMinutes,
    total_calories: stats.totalCalories,
    last_session_date: stats.lastSessionDate,
    updated_at: new Date().toISOString(),
  });
}

export async function pushSettings(): Promise<void> {
  const userId = useAuthStore.getState().user?.id;
  if (!userId) return;

  const state = useSettingsStore.getState();
  await supabase.from('user_settings').upsert({
    user_id: userId,
    sound_enabled: state.soundEnabled,
    vibration_enabled: state.vibrationEnabled,
    sound_type: state.soundType,
    health_integration: state.healthIntegration,
    is_pro: state.isPro,
    onboarding_completed: state.onboardingCompleted,
    warm_up_enabled: state.warmUpEnabled,
    cool_down_enabled: state.coolDownEnabled,
    warm_up_duration: state.warmUpDuration,
    cool_down_duration: state.coolDownDuration,
    high_contrast_mode: state.highContrastMode,
    fast_interval: state.fastInterval,
    slow_interval: state.slowInterval,
    round_count: state.roundCount,
    reminder_enabled: state.reminderEnabled,
    reminder_time: state.reminderTime,
    daily_step_goal: state.dailyStepGoal,
    color_theme_id: state.colorThemeId,
    starting_phase: state.startingPhase,
    updated_at: new Date().toISOString(),
  });
}

export async function pushProfile(): Promise<void> {
  const userId = useAuthStore.getState().user?.id;
  if (!userId) return;

  const state = useProfileStore.getState();
  await supabase.from('user_profile').upsert({
    user_id: userId,
    weight: state.weight ?? null,
    age: state.age ?? null,
    height: state.height ?? null,
    walking_frequency: state.walkingFrequency,
    updated_at: new Date().toISOString(),
  });
}

export async function pushBadges(): Promise<void> {
  const userId = useAuthStore.getState().user?.id;
  if (!userId) return;

  const { badges } = useBadgesStore.getState();
  const rows = badges.map((b) => ({
    user_id: userId,
    badge_id: b.id,
    unlocked_at: b.unlockedAt,
    updated_at: new Date().toISOString(),
  }));

  await supabase.from('user_badges').upsert(rows, {
    onConflict: 'user_id,badge_id',
  });
}

export async function pushAll(): Promise<void> {
  await Promise.allSettled([
    pushSessions(),
    pushSettings(),
    pushProfile(),
    pushBadges(),
  ]);
  await AsyncStorage.setItem(LAST_SYNC_KEY, new Date().toISOString());
}

// ==================== PULL (cloud → local) ====================

export async function pullAndMerge(): Promise<void> {
  const userId = useAuthStore.getState().user?.id;
  if (!userId) return;

  await Promise.allSettled([
    pullSessions(userId),
    pullSettings(userId),
    pullProfile(userId),
    pullBadges(userId),
  ]);
  await AsyncStorage.setItem(LAST_SYNC_KEY, new Date().toISOString());
}

async function pullSessions(userId: string): Promise<void> {
  const { data: remoteSessions } = await supabase
    .from('user_sessions')
    .select('*')
    .eq('user_id', userId)
    .order('started_at', { ascending: false });

  if (!remoteSessions || remoteSessions.length === 0) return;

  const localSessions = useSessionsStore.getState().sessions;
  const localMap = new Map(localSessions.map((s) => [s.id, s]));

  // Sessions are append-only: merge is union by id
  for (const remote of remoteSessions) {
    if (!localMap.has(remote.id)) {
      localMap.set(remote.id, {
        id: remote.id,
        date: remote.date,
        startedAt: remote.started_at,
        completedAt: remote.completed_at,
        rounds: remote.rounds,
        totalRounds: remote.total_rounds,
        fastDuration: remote.fast_duration,
        slowDuration: remote.slow_duration,
        totalDuration: remote.total_duration,
        estimatedCalories: remote.estimated_calories,
        completed: remote.completed,
        warmUp: remote.warm_up,
        coolDown: remote.cool_down,
        steps: remote.steps ?? undefined,
        distance: remote.distance ?? undefined,
      });
    }
  }

  const merged = Array.from(localMap.values()).sort(
    (a, b) => b.startedAt - a.startedAt,
  );

  // Pull stats: take max of each field
  const { data: remoteStats } = await supabase
    .from('user_stats')
    .select('*')
    .eq('user_id', userId)
    .single();

  const localStats = useSessionsStore.getState().stats;
  const mergedStats: UserStats = remoteStats
    ? {
        currentStreak: Math.max(
          localStats.currentStreak,
          remoteStats.current_streak,
        ),
        longestStreak: Math.max(
          localStats.longestStreak,
          remoteStats.longest_streak,
        ),
        totalSessions: Math.max(
          localStats.totalSessions,
          remoteStats.total_sessions,
        ),
        totalMinutes: Math.max(
          localStats.totalMinutes,
          remoteStats.total_minutes,
        ),
        totalCalories: Math.max(
          localStats.totalCalories,
          remoteStats.total_calories,
        ),
        lastSessionDate:
          localStats.lastSessionDate && remoteStats.last_session_date
            ? localStats.lastSessionDate > remoteStats.last_session_date
              ? localStats.lastSessionDate
              : remoteStats.last_session_date
            : localStats.lastSessionDate ?? remoteStats.last_session_date,
      }
    : localStats;

  useSessionsStore.setState({ sessions: merged, stats: mergedStats });
  await AsyncStorage.setItem('@walkpace_sessions', JSON.stringify(merged));
  await AsyncStorage.setItem('@walkpace_stats', JSON.stringify(mergedStats));
}

async function pullSettings(userId: string): Promise<void> {
  const { data: remote } = await supabase
    .from('user_settings')
    .select('*')
    .eq('user_id', userId)
    .single();

  if (!remote) return;

  const local = useSettingsStore.getState();
  const mergedSettings: Partial<Settings> = {
    soundEnabled: remote.sound_enabled,
    vibrationEnabled: remote.vibration_enabled,
    soundType: remote.sound_type as Settings['soundType'],
    healthIntegration: remote.health_integration,
    isPro: remote.is_pro,
    onboardingCompleted: local.onboardingCompleted || remote.onboarding_completed,
    warmUpEnabled: remote.warm_up_enabled,
    coolDownEnabled: remote.cool_down_enabled,
    warmUpDuration: remote.warm_up_duration,
    coolDownDuration: remote.cool_down_duration,
    highContrastMode: remote.high_contrast_mode,
    fastInterval: remote.fast_interval,
    slowInterval: remote.slow_interval,
    roundCount: remote.round_count,
    reminderEnabled: remote.reminder_enabled,
    reminderTime: remote.reminder_time,
    dailyStepGoal: remote.daily_step_goal ?? 10000,
    colorThemeId: remote.color_theme_id ?? 'default',
    startingPhase: remote.starting_phase ?? 'fast',
  };

  useSettingsStore.getState().update(mergedSettings);
}

async function pullProfile(userId: string): Promise<void> {
  const { data: remote } = await supabase
    .from('user_profile')
    .select('*')
    .eq('user_id', userId)
    .single();

  if (!remote) return;

  useProfileStore.getState().update({
    weight: remote.weight ?? undefined,
    age: remote.age ?? undefined,
    height: remote.height ?? undefined,
    walkingFrequency: remote.walking_frequency as UserProfile['walkingFrequency'],
  });
}

async function pullBadges(userId: string): Promise<void> {
  const { data: remoteBadges } = await supabase
    .from('user_badges')
    .select('*')
    .eq('user_id', userId);

  if (!remoteBadges || remoteBadges.length === 0) return;

  const localBadges = useBadgesStore.getState().badges;
  const remoteMap = new Map(
    remoteBadges.map((b) => [b.badge_id, b.unlocked_at as number | null]),
  );

  // Union: if either side has it unlocked, keep it. Use earliest unlockedAt.
  const merged = localBadges.map((local) => {
    const remoteUnlock = remoteMap.get(local.id);
    if (local.unlockedAt && remoteUnlock) {
      return { ...local, unlockedAt: Math.min(local.unlockedAt, remoteUnlock) };
    }
    if (remoteUnlock) {
      return { ...local, unlockedAt: remoteUnlock };
    }
    return local;
  });

  useBadgesStore.setState({ badges: merged });
  await AsyncStorage.setItem('@walkpace_badges', JSON.stringify(merged));
}
