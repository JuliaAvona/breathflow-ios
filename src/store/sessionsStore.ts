import { create } from 'zustand';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { BreathingSession, UserStats } from '../types';
import { getToday, isConsecutiveDay } from '../utils/time';

const SESSIONS_KEY = '@breathflow_sessions';
const STATS_KEY = '@breathflow_stats';

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
  _hydrated: boolean;

  // Actions
  addSession: (session: BreathingSession) => void;
  deleteSession: (id: string) => void;
  getSessions: () => BreathingSession[];
  getSessionsByDate: (date: string) => BreathingSession[];
  getSessionsByTechnique: (techniqueId: string) => BreathingSession[];
  recalculateStats: () => void;

  // Hydration
  hydrate: () => Promise<void>;
}

function computeStats(sessions: BreathingSession[]): UserStats {
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

export const useSessionsStore = create<SessionsStore>((set, get) => ({
  sessions: [],
  stats: defaultStats,
  _hydrated: false,

  hydrate: async () => {
    try {
      const [sessionsJson, statsJson] = await Promise.all([
        AsyncStorage.getItem(SESSIONS_KEY),
        AsyncStorage.getItem(STATS_KEY),
      ]);

      const parsed: BreathingSession[] = sessionsJson
        ? JSON.parse(sessionsJson)
        : [];

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

      // If dedup removed entries, recalculate and persist clean data
      if (deduped.length < parsed.length) {
        const recalculated = computeStats(deduped);
        AsyncStorage.setItem(SESSIONS_KEY, JSON.stringify(deduped));
        AsyncStorage.setItem(STATS_KEY, JSON.stringify(recalculated));
        set({ sessions: deduped, stats: recalculated, _hydrated: true });
      } else {
        set({
          sessions: deduped,
          stats: statsJson ? JSON.parse(statsJson) : defaultStats,
          _hydrated: true,
        });
      }
    } catch {
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

    set({ sessions: newSessions, stats: newStats });
    import('../services/syncService').then((m) =>
      m.pushSessions().catch(() => {})
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
