import { useSessionsStore } from '../sessionsStore';
import { BreathingSession, UserStats } from '../../types';

const createMockSession = (overrides: Partial<BreathingSession> = {}): BreathingSession => ({
  id: `session-${Date.now()}-${Math.random()}`,
  userId: 'user-1',
  date: '2026-02-19',
  startedAt: new Date('2026-02-19T10:00:00').toISOString(),
  completedAt: new Date('2026-02-19T10:30:00').toISOString(),
  completed: true,
  techniqueId: 'box_breathing',
  cyclesCompleted: 6,
  totalDuration: 1800,
  ...overrides,
});

const defaultStats: UserStats = {
  currentStreak: 0,
  longestStreak: 0,
  totalSessions: 0,
  totalMinutes: 0,
  totalBreaths: 0,
  bestRetention: 0,
  avgRetention: 0,
  lastSessionDate: '',
  favoriteTechniqueId: '',
  sessionsPerTechnique: {},
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
          totalBreaths: 36,
          currentStreak: 2,
          longestStreak: 5,
        },
      });

      const { stats } = useSessionsStore.getState();
      expect(stats.totalSessions).toBe(3);
      expect(stats.totalMinutes).toBe(90);
      expect(stats.totalBreaths).toBe(36);
      expect(stats.currentStreak).toBe(2);
      expect(stats.longestStreak).toBe(5);
    });

    it('defaults to empty state', () => {
      const { sessions, stats } = useSessionsStore.getState();
      expect(sessions).toHaveLength(0);
      expect(stats.totalSessions).toBe(0);
      expect(stats.totalBreaths).toBe(0);
      expect(stats.lastSessionDate).toBe('');
    });
  });

  describe('getSessionsByDate', () => {
    it('returns sessions for the given date', () => {
      useSessionsStore.setState({
        sessions: [
          createMockSession({ id: 'feb15', date: '2026-02-15' }),
          createMockSession({ id: 'jan10', date: '2026-01-10' }),
          createMockSession({ id: 'feb15b', date: '2026-02-15' }),
        ],
      });

      const feb15Sessions = useSessionsStore.getState().getSessionsByDate('2026-02-15');
      expect(feb15Sessions).toHaveLength(2);
      expect(feb15Sessions.map((s: BreathingSession) => s.id).sort()).toEqual(['feb15', 'feb15b']);

      const jan10Sessions = useSessionsStore.getState().getSessionsByDate('2026-01-10');
      expect(jan10Sessions).toHaveLength(1);
      expect(jan10Sessions[0].id).toBe('jan10');
    });

    it('returns empty array for date with no sessions', () => {
      useSessionsStore.setState({
        sessions: [createMockSession({ date: '2026-02-15' })],
      });

      const marSessions = useSessionsStore.getState().getSessionsByDate('2026-03-01');
      expect(marSessions).toHaveLength(0);
    });

    it('filters by exact date correctly', () => {
      useSessionsStore.setState({
        sessions: [
          createMockSession({ id: 's2026', date: '2026-02-15' }),
          createMockSession({ id: 's2025', date: '2025-02-15' }),
        ],
      });

      const results2026 = useSessionsStore.getState().getSessionsByDate('2026-02-15');
      expect(results2026).toHaveLength(1);
      expect(results2026[0].id).toBe('s2026');

      const results2025 = useSessionsStore.getState().getSessionsByDate('2025-02-15');
      expect(results2025).toHaveLength(1);
      expect(results2025[0].id).toBe('s2025');
    });
  });

  describe('getSessionsByTechnique', () => {
    it('returns sessions for the given technique', () => {
      useSessionsStore.setState({
        sessions: [
          createMockSession({ id: 'box1', techniqueId: 'box_breathing' }),
          createMockSession({ id: 'wim1', techniqueId: 'wim_hof' }),
          createMockSession({ id: 'box2', techniqueId: 'box_breathing' }),
        ],
      });

      const boxSessions = useSessionsStore.getState().getSessionsByTechnique('box_breathing');
      expect(boxSessions).toHaveLength(2);

      const wimSessions = useSessionsStore.getState().getSessionsByTechnique('wim_hof');
      expect(wimSessions).toHaveLength(1);
    });

    it('returns empty array for unknown technique', () => {
      useSessionsStore.setState({
        sessions: [createMockSession({ techniqueId: 'box_breathing' })],
      });

      const results = useSessionsStore.getState().getSessionsByTechnique('unknown');
      expect(results).toHaveLength(0);
    });
  });
});
