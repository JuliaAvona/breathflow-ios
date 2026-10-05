import { create } from 'zustand';
import AsyncStorage from '@react-native-async-storage/async-storage';
import * as Crypto from 'expo-crypto';
import { BreathingSession, Mood, UserStats } from '../types';
import { getToday, isConsecutiveDay } from '../utils/time';
import { isUuid } from '../utils/uuid';
import { Sentry } from '../utils/sentry';

const SESSIONS_KEY = '@breathflow_sessions';
const STATS_KEY = '@breathflow_stats';
const DELETED_KEY = '@breathflow_deleted_sessions';
const CORRUPT_KEY = '@breathflow_sessions_corrupt';

const defaultStats: UserStats = {
  totalSessions: 0,
  totalMinutes: 0,
  totalBreaths: 0,
  currentStreak: 0,
  longestStreak: 0,
  bestRetention: 0,
  avgRetention: 0,
  lastSessionDate: '',
  favoriteTechniqueId: '',
  sessionsPerTechnique: {},
};

interface SessionsStore {
  sessions: BreathingSession[];
  stats: UserStats;
  /** Tombstones: ids deleted locally whose server rows still need deleting. */
  deletedIds: string[];
  _hydrated: boolean;

  // Actions
  addSession: (session: BreathingSession) => void;
  deleteSession: (id: string) => void;
  updateSessionMood: (id: string, mood: Mood) => void;
  clearDeletedIds: (ids: string[]) => void;
  clearAllSessions: () => void;
  getSessions: () => BreathingSession[];
  getSessionsByDate: (date: string) => BreathingSession[];
  getSessionsByTechnique: (techniqueId: string) => BreathingSession[];
  recalculateStats: () => void;

  // Hydration
  hydrate: () => Promise<void>;
}

function computeStats(allSessions: BreathingSession[]): UserStats {
  // Sessions saved from a Stop-before-finishing (completed: false) are kept so
  // the user gets an honest summary of what they actually did, but they don't
  // count toward totals/streaks/badges — only genuinely finished sessions do.
  const sessions = allSessions.filter((s) => s.completed);

  if (sessions.length === 0) {
    return { ...defaultStats };
  }

  // Sort descending by startedAt for streak calculation
  const sorted = [...sessions].sort(
    (a, b) => new Date(b.startedAt).getTime() - new Date(a.startedAt).getTime()
  );

  // Total sessions
  const totalSessions = sessions.length;

  // Total minutes
  const totalMinutes = sessions.reduce(
    (sum, s) => sum + Math.round(s.totalDuration / 60),
    0
  );

  // Total breaths estimate: each cycle has at least 1 inhale + 1 exhale = 2 breaths
  const totalBreaths = sessions.reduce((sum, s) => {
    if (s.breathsPerRound != null && s.roundsCompleted != null) {
      // Power Breathing: breathsPerRound × roundsCompleted
      return sum + s.breathsPerRound * s.roundsCompleted;
    }
    // Standard techniques: 2 breaths per cycle (inhale + exhale)
    return sum + s.cyclesCompleted * 2;
  }, 0);

  // Retention stats from Power Breathing sessions
  const allRetentions = sessions.flatMap((s) => s.retentionTimes ?? []);
  const bestRetention =
    allRetentions.length > 0 ? Math.max(...allRetentions) : 0;
  const avgRetention =
    allRetentions.length > 0
      ? Math.round(
          allRetentions.reduce((a, b) => a + b, 0) / allRetentions.length
        )
      : 0;

  // Last session date
  const lastSessionDate = sorted[0].date;

  // Sessions per technique
  const sessionsPerTechnique: Record<string, number> = {};
  for (const s of sessions) {
    sessionsPerTechnique[s.techniqueId] =
      (sessionsPerTechnique[s.techniqueId] ?? 0) + 1;
  }

  // Favorite technique (most used)
  let favoriteTechniqueId = '';
  let maxCount = 0;
  for (const [techId, count] of Object.entries(sessionsPerTechnique)) {
    if (count > maxCount) {
      maxCount = count;
      favoriteTechniqueId = techId;
    }
  }

  // Streak calculation: collect unique session dates, sorted descending
  const uniqueDates = [...new Set(sessions.map((s) => s.date))].sort(
    (a, b) => b.localeCompare(a)
  );

  let currentStreak = 0;
  let longestStreak = 0;

  if (uniqueDates.length > 0) {
    const today = getToday();
    // Current streak: count consecutive days from today backwards
    if (uniqueDates[0] === today || isConsecutiveDay(uniqueDates[0], today)) {
      currentStreak = 1;
      for (let i = 1; i < uniqueDates.length; i++) {
        if (isConsecutiveDay(uniqueDates[i], uniqueDates[i - 1])) {
          currentStreak++;
        } else {
          break;
        }
      }
    }

    // Longest streak: scan all unique dates
    let streak = 1;
    longestStreak = 1;
    for (let i = 1; i < uniqueDates.length; i++) {
      if (isConsecutiveDay(uniqueDates[i], uniqueDates[i - 1])) {
        streak++;
      } else {
        streak = 1;
      }
      longestStreak = Math.max(longestStreak, streak);
    }
  }

  longestStreak = Math.max(longestStreak, currentStreak);

  return {
    totalSessions,
    totalMinutes,
    totalBreaths,
    currentStreak,
    longestStreak,
    bestRetention,
    avgRetention,
    lastSessionDate,
    favoriteTechniqueId,
    sessionsPerTechnique,
  };
}

/**
 * Sessions created before build 1.3 (23) have ids like "1785502739202-rpohxb6",
 * which Supabase rejects (user_sessions.id is uuid, error 22P02). They were
 * never synced, so re-keying them can't create remote duplicates.
 * Returns null when there is nothing to migrate or no UUID can be generated.
 */
function migrateLegacyIds(sessions: BreathingSession[]): BreathingSession[] | null {
  if (sessions.every((s) => isUuid(s.id))) return null;
  try {
    return sessions.map((s) => (isUuid(s.id) ? s : { ...s, id: Crypto.randomUUID() }));
  } catch (error) {
    Sentry.captureException(error);
    return null;
  }
}

export const useSessionsStore = create<SessionsStore>((set, get) => ({
  sessions: [],
  stats: defaultStats,
  deletedIds: [],
  _hydrated: false,

  hydrate: async () => {
    try {
      const [sessionsJson, statsJson, deletedJson] = await Promise.all([
        AsyncStorage.getItem(SESSIONS_KEY),
        AsyncStorage.getItem(STATS_KEY),
        AsyncStorage.getItem(DELETED_KEY),
      ]);

      let deletedIds: string[] = [];
      try {
        const parsedDeleted: unknown = deletedJson ? JSON.parse(deletedJson) : [];
        if (Array.isArray(parsedDeleted)) {
          deletedIds = parsedDeleted.filter((id): id is string => typeof id === 'string');
        }
      } catch {
        // Corrupt tombstones: worst case a deleted session reappears after a pull.
      }

      let raw: unknown = [];
      if (sessionsJson) {
        try {
          raw = JSON.parse(sessionsJson);
        } catch {
          // Report without the parser message, which can quote payload bytes.
          Sentry.captureException(new Error('sessions storage JSON parse failed'), {
            extra: { length: sessionsJson.length },
          });
          raw = null;
        }
        if (!Array.isArray(raw)) {
          // Keep the unreadable payload: the next addSession would otherwise
          // overwrite it with a fresh list and lose the history for good.
          if (raw !== null) Sentry.captureException(new Error('sessions storage is not an array'));
          try {
            await AsyncStorage.setItem(CORRUPT_KEY, sessionsJson);
          } catch (error) {
            Sentry.captureException(error);
          }
          raw = [];
        }
      }

      const parsed = (raw as unknown[]).filter(
        (r): r is BreathingSession =>
          typeof r === 'object' && r !== null && typeof (r as { id?: unknown }).id === 'string'
      );
      const dropped = (raw as unknown[]).length - parsed.length;
      if (dropped > 0) {
        Sentry.captureMessage('sessions hydrate dropped malformed rows', {
          level: 'warning',
          extra: { dropped },
        });
      }

      // Deduplicate by ID
      const seenIds = new Set<string>();
      const deduped = parsed.filter((s) => {
        if (seenIds.has(s.id)) return false;
        seenIds.add(s.id);
        return true;
      });

      // Sort descending by startedAt
      deduped.sort(
        (a, b) =>
          new Date(b.startedAt).getTime() - new Date(a.startedAt).getTime()
      );

      let sessions = deduped;
      let needsPersist = deduped.length < parsed.length;

      const migrated = migrateLegacyIds(deduped);
      if (migrated) {
        try {
          // Persist before exposing the new ids: if this write were lost, the
          // next launch would mint different UUIDs for rows that may already
          // have been pushed, creating remote duplicates. On failure keep the
          // legacy ids — pushSessions skips them, so they stay local-only.
          await AsyncStorage.setItem(SESSIONS_KEY, JSON.stringify(migrated));
          sessions = migrated;
          needsPersist = false;
        } catch (error) {
          Sentry.captureException(error);
        }
      }

      // If dedup removed entries, persist clean data
      if (needsPersist) {
        AsyncStorage.setItem(SESSIONS_KEY, JSON.stringify(sessions));
      }
      // Always recompute stats on hydrate so streak is accurate for today
      const freshStats = computeStats(sessions);
      AsyncStorage.setItem(STATS_KEY, JSON.stringify(freshStats));
      set({ sessions, stats: freshStats, deletedIds, _hydrated: true });
    } catch (error) {
      Sentry.captureException(error);
      set({ _hydrated: true });
    }
  },

  addSession: (session) => {
    const { sessions } = get();

    // Deduplicate by ID
    if (sessions.some((s) => s.id === session.id)) return;

    // Insert and sort descending
    const newSessions = [session, ...sessions].sort(
      (a, b) =>
        new Date(b.startedAt).getTime() - new Date(a.startedAt).getTime()
    );

    const newStats = computeStats(newSessions);

    AsyncStorage.setItem(SESSIONS_KEY, JSON.stringify(newSessions));
    AsyncStorage.setItem(STATS_KEY, JSON.stringify(newStats));

    set({ sessions: newSessions, stats: newStats });
    import('../services/syncService').then((m) =>
      m.pushSessions().catch(() => {})
    );
    // Re-schedule streak protection with the updated streak count
    import('../utils/notifications').then(async ({ checkNotificationPermissions, scheduleStreakProtection }) => {
      try {
        const granted = await checkNotificationPermissions();
        if (granted && newStats.currentStreak > 0) {
          await scheduleStreakProtection(newStats.currentStreak);
        }
      } catch {
        // Notification scheduling is best-effort
      }
    });
  },

  deleteSession: (id) => {
    const { sessions } = get();
    const session = sessions.find((s) => s.id === id);
    if (!session) return;

    const newSessions = sessions.filter((s) => s.id !== id);
    const newStats = computeStats(newSessions);

    AsyncStorage.setItem(SESSIONS_KEY, JSON.stringify(newSessions));
    AsyncStorage.setItem(STATS_KEY, JSON.stringify(newStats));

    // Tombstone so pushSessions deletes the server row and pullSessions
    // doesn't resurrect it (sessions otherwise merge as an append-only union).
    const deletedIds = get().deletedIds.includes(id)
      ? get().deletedIds
      : [...get().deletedIds, id];
    AsyncStorage.setItem(DELETED_KEY, JSON.stringify(deletedIds));

    set({ sessions: newSessions, stats: newStats, deletedIds });
    import('../services/syncService').then((m) =>
      m.pushSessions().catch(() => {})
    );
  },

  updateSessionMood: (id, mood) => {
    const { sessions } = get();
    if (!sessions.some((s) => s.id === id)) return;

    const newSessions = sessions.map((s) => (s.id === id ? { ...s, moodAfter: mood } : s));
    AsyncStorage.setItem(SESSIONS_KEY, JSON.stringify(newSessions));

    set({ sessions: newSessions });
    import('../services/syncService').then((m) =>
      m.pushSessions().catch(() => {})
    );
  },

  clearDeletedIds: (ids) => {
    const deletedIds = get().deletedIds.filter((id) => !ids.includes(id));
    AsyncStorage.setItem(DELETED_KEY, JSON.stringify(deletedIds));
    set({ deletedIds });
  },

  clearAllSessions: () => {
    AsyncStorage.setItem(SESSIONS_KEY, JSON.stringify([]));
    AsyncStorage.setItem(STATS_KEY, JSON.stringify(defaultStats));
    // deleteAllSessions wipes the server, so pending tombstones are moot.
    AsyncStorage.setItem(DELETED_KEY, JSON.stringify([]));

    set({ sessions: [], stats: { ...defaultStats }, deletedIds: [] });
    // Sessions pull as an append-only union by id (see pullSessions), so
    // just clearing locally isn't enough — the rows have to be deleted on
    // the server too, or the next pull would silently bring them all back.
    import('../services/syncService').then((m) =>
      m.deleteAllSessions().catch(() => {})
    );
  },

  getSessions: () => {
    return get().sessions;
  },

  getSessionsByDate: (date: string) => {
    return get().sessions.filter((s) => s.date === date);
  },

  getSessionsByTechnique: (techniqueId: string) => {
    return get().sessions.filter((s) => s.techniqueId === techniqueId);
  },

  recalculateStats: () => {
    const { sessions } = get();
    const newStats = computeStats(sessions);

    AsyncStorage.setItem(STATS_KEY, JSON.stringify(newStats));
    set({ stats: newStats });
  },
}));
