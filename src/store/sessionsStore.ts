import { create } from 'zustand';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Session, UserStats } from '../types';
import { getToday, isConsecutiveDay } from '../utils/time';

const SESSIONS_KEY = '@walkpace_sessions';
const STATS_KEY = '@walkpace_stats';

const defaultStats: UserStats = {
  currentStreak: 0,
  longestStreak: 0,
  totalSessions: 0,
  totalMinutes: 0,
  totalCalories: 0,
  lastSessionDate: null,
};

interface SessionsStore {
  sessions: Session[];
  stats: UserStats;
  _hydrated: boolean;
  hydrate: () => Promise<void>;
  addSession: (session: Session) => void;
  deleteSession: (sessionId: string) => void;
  getSessionsByMonth: (year: number, month: number) => Session[];
  getActiveDays: () => Set<string>;
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
      const parsed: Session[] = sessionsJson ? JSON.parse(sessionsJson) : [];
      const seenIds = new Set<string>();
      const seenStarts = new Set<number>();
      const deduped = parsed.filter((s) => {
        if (seenIds.has(s.id) || seenStarts.has(s.startedAt)) return false;
        seenIds.add(s.id);
        seenStarts.add(s.startedAt);
        return true;
      });
      // If dedup removed entries, persist clean data and recalculate stats
      if (deduped.length < parsed.length) {
        AsyncStorage.setItem(SESSIONS_KEY, JSON.stringify(deduped));
        // Recalculate stats from clean sessions
        const recalculated: UserStats = deduped.reduce((acc, s) => ({
          currentStreak: acc.currentStreak,
          longestStreak: acc.longestStreak,
          totalSessions: acc.totalSessions + 1,
          totalMinutes: acc.totalMinutes + Math.round(s.totalDuration / 60),
          totalCalories: acc.totalCalories + s.estimatedCalories,
          lastSessionDate: acc.lastSessionDate && acc.lastSessionDate > s.date ? acc.lastSessionDate : s.date,
        }), { ...defaultStats });
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
    const { sessions, stats } = get();
    if (sessions.some((s) => s.id === session.id || s.startedAt === session.startedAt)) return;
    const newSessions = [session, ...sessions];
    const today = getToday();

    let newStreak = stats.currentStreak;
    if (stats.lastSessionDate === null) {
      newStreak = 1;
    } else if (stats.lastSessionDate === today) {
      // Already walked today, streak stays same
    } else if (isConsecutiveDay(stats.lastSessionDate, today)) {
      newStreak = stats.currentStreak + 1;
    } else {
      newStreak = 1;
    }

    const newStats: UserStats = {
      currentStreak: newStreak,
      longestStreak: Math.max(stats.longestStreak, newStreak),
      totalSessions: stats.totalSessions + 1,
      totalMinutes: stats.totalMinutes + Math.round(session.totalDuration / 60),
      totalCalories: stats.totalCalories + session.estimatedCalories,
      lastSessionDate: today,
    };

    AsyncStorage.setItem(SESSIONS_KEY, JSON.stringify(newSessions));
    AsyncStorage.setItem(STATS_KEY, JSON.stringify(newStats));

    set({ sessions: newSessions, stats: newStats });
    import('../services/syncService').then(m => m.pushSessions().catch(() => {}));
  },

  deleteSession: (sessionId) => {
    const { sessions, stats } = get();
    const session = sessions.find((s) => s.id === sessionId);
    if (!session) return;

    const newSessions = sessions.filter((s) => s.id !== sessionId);
    const newStats: UserStats = {
      ...stats,
      totalSessions: Math.max(0, stats.totalSessions - 1),
      totalMinutes: Math.max(0, stats.totalMinutes - Math.round(session.totalDuration / 60)),
      totalCalories: Math.max(0, stats.totalCalories - session.estimatedCalories),
    };

    AsyncStorage.setItem(SESSIONS_KEY, JSON.stringify(newSessions));
    AsyncStorage.setItem(STATS_KEY, JSON.stringify(newStats));

    set({ sessions: newSessions, stats: newStats });
    import('../services/syncService').then(m => m.pushSessions().catch(() => {}));
  },

  getSessionsByMonth: (year, month) => {
    return get().sessions.filter((s) => {
      const d = new Date(s.date);
      return d.getFullYear() === year && d.getMonth() === month;
    });
  },

  getActiveDays: () => {
    const days = new Set<string>();
    get().sessions.forEach((s) => days.add(s.date));
    return days;
  },
}));
