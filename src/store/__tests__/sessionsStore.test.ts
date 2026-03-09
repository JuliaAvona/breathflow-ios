import { useSessionsStore } from '../sessionsStore';
import { Session } from '../../types';

const createMockSession = (overrides: Partial<Session> = {}): Session => ({
  id: `session-${Date.now()}-${Math.random()}`,
  date: '2026-02-19',
  startedAt: Date.now(),
  completedAt: Date.now() + 1800000,
  rounds: 5,
  totalRounds: 5,
  fastDuration: 180,
  slowDuration: 180,
  totalDuration: 1800,
  estimatedCalories: 120,
  completed: true,
  warmUp: false,
  coolDown: false,
  ...overrides,
});

const defaultStats = {
  currentStreak: 0,
  longestStreak: 0,
  totalSessions: 0,
  totalMinutes: 0,
  totalCalories: 0,
  lastSessionDate: null,
};

describe('sessionsStore', () => {
  beforeEach(() => {
    useSessionsStore.setState({
      sessions: [],
      stats: { ...defaultStats },
      _hydrated: true,
    });
  });

  describe('sessions state', () => {
    it('stores sessions in given order', () => {
      const s1 = createMockSession({ id: 'first', date: '2026-02-18' });
      const s2 = createMockSession({ id: 'second', date: '2026-02-19' });

      useSessionsStore.setState({ sessions: [s2, s1] });

      const { sessions } = useSessionsStore.getState();
      expect(sessions).toHaveLength(2);
      expect(sessions[0].id).toBe('second');
      expect(sessions[1].id).toBe('first');
    });

    it('tracks stats correctly', () => {
      useSessionsStore.setState({
        stats: {
          ...defaultStats,
          totalSessions: 3,
          totalMinutes: 90,
          totalCalories: 360,
          currentStreak: 2,
          longestStreak: 5,
        },
      });

      const { stats } = useSessionsStore.getState();
      expect(stats.totalSessions).toBe(3);
      expect(stats.totalMinutes).toBe(90);
      expect(stats.totalCalories).toBe(360);
      expect(stats.currentStreak).toBe(2);
      expect(stats.longestStreak).toBe(5);
    });

    it('defaults to empty state', () => {
      const { sessions, stats } = useSessionsStore.getState();
      expect(sessions).toHaveLength(0);
      expect(stats.totalSessions).toBe(0);
      expect(stats.totalCalories).toBe(0);
      expect(stats.lastSessionDate).toBeNull();
    });
  });

  describe('getSessionsByMonth', () => {
    it('returns sessions for the given month', () => {
      useSessionsStore.setState({
        sessions: [
          createMockSession({ id: 'feb', date: '2026-02-15' }),
          createMockSession({ id: 'jan', date: '2026-01-10' }),
          createMockSession({ id: 'feb2', date: '2026-02-20' }),
        ],
      });

      const febSessions = useSessionsStore.getState().getSessionsByMonth(2026, 1);
      expect(febSessions).toHaveLength(2);
      expect(febSessions.map(s => s.id).sort()).toEqual(['feb', 'feb2']);

      const janSessions = useSessionsStore.getState().getSessionsByMonth(2026, 0);
      expect(janSessions).toHaveLength(1);
      expect(janSessions[0].id).toBe('jan');
    });

    it('returns empty array for month with no sessions', () => {
      useSessionsStore.setState({
        sessions: [createMockSession({ date: '2026-02-15' })],
      });

      const marSessions = useSessionsStore.getState().getSessionsByMonth(2026, 2);
      expect(marSessions).toHaveLength(0);
    });

    it('filters by year correctly', () => {
      useSessionsStore.setState({
        sessions: [
          createMockSession({ id: 's2026', date: '2026-02-15' }),
          createMockSession({ id: 's2025', date: '2025-02-15' }),
        ],
      });

      const results2026 = useSessionsStore.getState().getSessionsByMonth(2026, 1);
      expect(results2026).toHaveLength(1);
      expect(results2026[0].id).toBe('s2026');

      const results2025 = useSessionsStore.getState().getSessionsByMonth(2025, 1);
      expect(results2025).toHaveLength(1);
      expect(results2025[0].id).toBe('s2025');
    });
  });

  describe('getActiveDays', () => {
    it('returns set of unique dates with sessions', () => {
      useSessionsStore.setState({
        sessions: [
          createMockSession({ date: '2026-02-19' }),
          createMockSession({ date: '2026-02-19' }),
          createMockSession({ date: '2026-02-18' }),
        ],
      });

      const days = useSessionsStore.getState().getActiveDays();
      expect(days.size).toBe(2);
      expect(days.has('2026-02-19')).toBe(true);
      expect(days.has('2026-02-18')).toBe(true);
    });

    it('returns empty set when no sessions', () => {
      const days = useSessionsStore.getState().getActiveDays();
      expect(days.size).toBe(0);
    });

    it('handles multiple months', () => {
      useSessionsStore.setState({
        sessions: [
          createMockSession({ date: '2026-01-05' }),
          createMockSession({ date: '2026-02-10' }),
          createMockSession({ date: '2026-02-15' }),
        ],
      });

      const days = useSessionsStore.getState().getActiveDays();
      expect(days.size).toBe(3);
    });
  });
});
