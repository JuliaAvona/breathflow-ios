import { supabase } from '../utils/supabase';
import { useAuthStore } from '../store/authStore';
import { useSessionsStore } from '../store/sessionsStore';
import { useSettingsStore } from '../store/settingsStore';
import { useBadgesStore } from '../store/badgesStore';
import { Sentry } from '../utils/sentry';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { BreathingSession, UserStats, UserSettings } from '../types';

const LAST_SYNC_KEY = '@breathflow_last_sync';

/** Surface a Supabase error instead of letting it disappear silently. */
function logSyncError(context: string, error: unknown): void {
  if (!error) return;
  // PGRST116 = "no rows" from .single() — expected for a user with no row yet, not a failure.
  if ((error as { code?: string }).code === 'PGRST116') return;
  if (__DEV__) console.warn(`[sync] ${context}:`, error);
  Sentry.captureException(error instanceof Error ? error : new Error(`${context}: ${JSON.stringify(error)}`));
}

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
      completed: s.completed,
      technique_id: s.techniqueId,
      cycles_completed: s.cyclesCompleted,
      total_duration: s.totalDuration,
      rounds_completed: s.roundsCompleted ?? null,
      retention_times: s.retentionTimes ?? null,
      best_retention: s.bestRetention ?? null,
      avg_retention: s.avgRetention ?? null,
      breaths_per_round: s.breathsPerRound ?? null,
      mood_after: s.moodAfter ?? null,
      updated_at: new Date().toISOString(),
    }));

    for (let i = 0; i < rows.length; i += 100) {
      const chunk = rows.slice(i, i + 100);
      const { error } = await supabase.from('user_sessions').upsert(chunk, {
        onConflict: 'user_id,id',
      });
      logSyncError('pushSessions', error);
    }
  }

  await pushStats(userId, stats);
}

async function pushStats(userId: string, stats: UserStats): Promise<void> {
  const { error } = await supabase.from('user_stats').upsert({
    user_id: userId,
    total_sessions: stats.totalSessions,
    total_minutes: stats.totalMinutes,
    total_breaths: stats.totalBreaths,
    current_streak: stats.currentStreak,
    longest_streak: stats.longestStreak,
    best_retention: stats.bestRetention,
    avg_retention: stats.avgRetention,
    last_session_date: stats.lastSessionDate,
    favorite_technique_id: stats.favoriteTechniqueId,
    sessions_per_technique: stats.sessionsPerTechnique,
    updated_at: new Date().toISOString(),
  });
  logSyncError('pushStats', error);
}

export async function pushSettings(): Promise<void> {
  const userId = useAuthStore.getState().user?.id;
  if (!userId) return;

  const state = useSettingsStore.getState();
  const { error } = await supabase.from('user_settings').upsert({
    user_id: userId,
    technique_overrides: state.techniqueOverrides,
    sound_enabled: state.soundEnabled,
    sound_style: state.soundStyle,
    haptics_enabled: state.hapticsEnabled,
    dark_mode: state.darkMode,
    health_sync_enabled: state.healthSyncEnabled,
    reminder_enabled: state.reminderEnabled,
    reminder_time: state.reminderTime,
    reminder_days: state.reminderDays,
    onboarding_completed: state.onboardingCompleted,
    safety_accepted: state.safetyAccepted,
    selected_goal: state.selectedGoal ?? null,
    is_pro: state.isPro,
    text_size: state.textSize,
    daily_goal_minutes: state.dailyGoalMinutes,
    recommended_technique_id: state.recommendedTechniqueId ?? null,
    updated_at: new Date().toISOString(),
  });
  logSyncError('pushSettings', error);
}

export async function pushBadges(): Promise<void> {
  const userId = useAuthStore.getState().user?.id;
  if (!userId) return;

  const { unlockedBadges } = useBadgesStore.getState();
  const rows = unlockedBadges.map((b) => ({
    user_id: userId,
    badge_id: b.badgeId,
    unlocked_at: b.unlockedAt,
  }));

  if (rows.length > 0) {
    const { error } = await supabase.from('user_badges').upsert(rows, {
      onConflict: 'user_id,badge_id',
    });
    logSyncError('pushBadges', error);
  }
}

export async function pushAll(): Promise<void> {
  await Promise.allSettled([
    pushSessions(),
    pushSettings(),
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
    pullBadges(userId),
  ]);
  await AsyncStorage.setItem(LAST_SYNC_KEY, new Date().toISOString());
}

async function pullSessions(userId: string): Promise<void> {
  const { data: remoteSessions, error: sessionsError } = await supabase
    .from('user_sessions')
    .select('*')
    .eq('user_id', userId)
    .order('started_at', { ascending: false });
  logSyncError('pullSessions', sessionsError);

  if (!remoteSessions || remoteSessions.length === 0) return;

  const localSessions = useSessionsStore.getState().sessions;
  const localMap = new Map(localSessions.map((s) => [s.id, s]));

  // Sessions are append-only: merge is union by id
  for (const remote of remoteSessions) {
    if (!localMap.has(remote.id)) {
      localMap.set(remote.id, {
        id: remote.id,
        userId: remote.user_id,
        date: remote.date,
        startedAt: remote.started_at,
        completedAt: remote.completed_at,
        completed: remote.completed,
        techniqueId: remote.technique_id,
        cyclesCompleted: remote.cycles_completed,
        totalDuration: remote.total_duration,
        roundsCompleted: remote.rounds_completed ?? undefined,
        retentionTimes: remote.retention_times ?? undefined,
        bestRetention: remote.best_retention ?? undefined,
        avgRetention: remote.avg_retention ?? undefined,
        breathsPerRound: remote.breaths_per_round ?? undefined,
        moodAfter: remote.mood_after ?? undefined,
      });
    }
  }

  const merged = Array.from(localMap.values()).sort(
    (a, b) => new Date(b.startedAt).getTime() - new Date(a.startedAt).getTime(),
  );

  // Pull stats: take max of each numeric field
  const { data: remoteStats, error: statsError } = await supabase
    .from('user_stats')
    .select('*')
    .eq('user_id', userId)
    .single();
  logSyncError('pullStats', statsError);

  const localStats = useSessionsStore.getState().stats;
  const mergedStats: UserStats = remoteStats
    ? {
        totalSessions: Math.max(
          localStats.totalSessions,
          remoteStats.total_sessions,
        ),
        totalMinutes: Math.max(
          localStats.totalMinutes,
          remoteStats.total_minutes,
        ),
        totalBreaths: Math.max(
          localStats.totalBreaths,
          remoteStats.total_breaths ?? 0,
        ),
        currentStreak: Math.max(
          localStats.currentStreak,
          remoteStats.current_streak,
        ),
        longestStreak: Math.max(
          localStats.longestStreak,
          remoteStats.longest_streak,
        ),
        bestRetention: Math.max(
          localStats.bestRetention,
          remoteStats.best_retention ?? 0,
        ),
        avgRetention: Math.max(
          localStats.avgRetention,
          remoteStats.avg_retention ?? 0,
        ),
        lastSessionDate:
          localStats.lastSessionDate && remoteStats.last_session_date
            ? localStats.lastSessionDate > remoteStats.last_session_date
              ? localStats.lastSessionDate
              : remoteStats.last_session_date
            : localStats.lastSessionDate ?? remoteStats.last_session_date ?? '',
        favoriteTechniqueId:
          remoteStats.favorite_technique_id ?? localStats.favoriteTechniqueId,
        sessionsPerTechnique: {
          ...localStats.sessionsPerTechnique,
          ...(remoteStats.sessions_per_technique ?? {}),
        },
      }
    : localStats;

  useSessionsStore.setState({ sessions: merged, stats: mergedStats });
  await AsyncStorage.setItem('@breathflow_sessions', JSON.stringify(merged));
  await AsyncStorage.setItem('@breathflow_stats', JSON.stringify(mergedStats));
}

async function pullSettings(userId: string): Promise<void> {
  const { data: remote, error } = await supabase
    .from('user_settings')
    .select('*')
    .eq('user_id', userId)
    .single();
  logSyncError('pullSettings', error);

  if (!remote) return;

  const local = useSettingsStore.getState();
  const remoteUpdatedAt = remote.updated_at ? new Date(remote.updated_at as string).getTime() : 0;

  // onboardingCompleted/safetyAccepted only ever ratchet forward, so OR-merging
  // them is always safe regardless of which side is more recent.
  const ratchetFields: Partial<UserSettings> = {
    onboardingCompleted: local.onboardingCompleted || remote.onboarding_completed,
    safetyAccepted: local.safetyAccepted || remote.safety_accepted,
  };

  // Last-write-wins: if this device changed settings more recently than the
  // synced row, keep local values (they'll overwrite the row on next push)
  // instead of letting a stale remote row clobber them.
  if (local.settingsUpdatedAt > remoteUpdatedAt) {
    useSettingsStore.setState(ratchetFields);
    return;
  }

  // isPro is intentionally excluded here — RevenueCat is the sole source of truth
  // for entitlement (see grantPro/revokePro); never set it from a synced row.
  const mergedSettings: Partial<UserSettings> & { settingsUpdatedAt: number } = {
    ...ratchetFields,
    techniqueOverrides: remote.technique_overrides ?? local.techniqueOverrides,
    soundEnabled: remote.sound_enabled,
    soundStyle: remote.sound_style as UserSettings['soundStyle'],
    hapticsEnabled: remote.haptics_enabled,
    darkMode: remote.dark_mode as UserSettings['darkMode'],
    healthSyncEnabled: remote.health_sync_enabled,
    reminderEnabled: remote.reminder_enabled,
    reminderTime: remote.reminder_time,
    reminderDays: remote.reminder_days ?? [0, 1, 2, 3, 4, 5, 6],
    selectedGoal: remote.selected_goal ?? local.selectedGoal,
    textSize: remote.text_size ?? local.textSize,
    dailyGoalMinutes: remote.daily_goal_minutes ?? local.dailyGoalMinutes,
    recommendedTechniqueId: remote.recommended_technique_id ?? local.recommendedTechniqueId,
    settingsUpdatedAt: remoteUpdatedAt,
  };

  useSettingsStore.setState(mergedSettings);
}

async function pullBadges(userId: string): Promise<void> {
  const { data: remoteBadges, error } = await supabase
    .from('user_badges')
    .select('*')
    .eq('user_id', userId);
  logSyncError('pullBadges', error);

  if (!remoteBadges || remoteBadges.length === 0) return;

  const localBadges = useBadgesStore.getState().unlockedBadges;
  const localMap = new Map(
    localBadges.map((b) => [b.badgeId, b.unlockedAt]),
  );

  // Union: merge remote into local, keep earliest unlockedAt
  for (const remote of remoteBadges) {
    const localUnlock = localMap.get(remote.badge_id);
    const remoteUnlock = remote.unlocked_at as string | null;
    if (!remoteUnlock) continue;

    if (localUnlock) {
      // Keep earliest
      if (remoteUnlock < localUnlock) {
        localMap.set(remote.badge_id, remoteUnlock);
      }
    } else {
      localMap.set(remote.badge_id, remoteUnlock);
    }
  }

  const merged = Array.from(localMap.entries()).map(([badgeId, unlockedAt]) => ({
    badgeId,
    unlockedAt,
  }));

  useBadgesStore.setState({ unlockedBadges: merged });
  await AsyncStorage.setItem('@breathflow_badges', JSON.stringify(merged));
}
