import AsyncStorage from '@react-native-async-storage/async-storage';
import * as Crypto from 'expo-crypto';
import { useSessionsStore } from '../sessionsStore';
import { Sentry } from '../../utils/sentry';
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

    it(
      'excludes incomplete sessions (Stop before finishing) from totals/streaks, ' +
        'so an abandoned session never inflates stats or gates achievements',
      () => {
        useSessionsStore.setState({
          sessions: [
            createMockSession({ id: 'done-1', completed: true, totalDuration: 300 }),
            createMockSession({ id: 'abandoned', completed: false, totalDuration: 12, cyclesCompleted: 1 }),
          ],
        });

        useSessionsStore.getState().recalculateStats();

        const { stats } = useSessionsStore.getState();
        expect(stats.totalSessions).toBe(1);
        expect(stats.totalMinutes).toBe(5); // only the completed 300s session
      },
    );
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

describe('hydrate legacy id migration', () => {
  const SESSIONS_KEY = '@breathflow_sessions';
  const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
  const LEGACY_ID = '1785502739202-rpohxb6';
  const VALID_ID = '3f2b8c1e-5d4a-4e7b-9a10-6c2d8e9f0a1b';

  const legacy = createMockSession({
    id: LEGACY_ID,
    techniqueId: 'box_breathing',
    startedAt: new Date('2026-02-18T10:00:00').toISOString(),
    date: '2026-02-18',
    cyclesCompleted: 7,
    moodAfter: 'calm',
  });
  const valid = createMockSession({
    id: VALID_ID,
    techniqueId: 'coherence',
    startedAt: new Date('2026-02-19T10:00:00').toISOString(),
    date: '2026-02-19',
    cyclesCompleted: 3,
  });

  beforeEach(async () => {
    jest.clearAllMocks();
    await AsyncStorage.clear();
    useSessionsStore.setState({ sessions: [], stats: { ...defaultStats }, _hydrated: false });
  });

  it('replaces legacy ids with UUIDs and keeps valid UUIDs unchanged', async () => {
    await AsyncStorage.setItem(SESSIONS_KEY, JSON.stringify([valid, legacy]));

    await useSessionsStore.getState().hydrate();

    const { sessions } = useSessionsStore.getState();
    expect(sessions).toHaveLength(2);
    sessions.forEach((s) => expect(s.id).toMatch(UUID_RE));
    expect(sessions.find((s) => s.id === VALID_ID)).toEqual(valid);
    expect(sessions.some((s) => s.id === LEGACY_ID)).toBe(false);
  });

  it('preserves the other fields of a migrated session', async () => {
    await AsyncStorage.setItem(SESSIONS_KEY, JSON.stringify([valid, legacy]));

    await useSessionsStore.getState().hydrate();

    const migrated = useSessionsStore
      .getState()
      .sessions.find((s) => s.techniqueId === 'box_breathing')!;
    expect(migrated.id).toMatch(UUID_RE);
    expect(migrated).toEqual({ ...legacy, id: migrated.id });
    expect(migrated.startedAt).toBe(legacy.startedAt);
    expect(migrated.cyclesCompleted).toBe(7);
    expect(migrated.moodAfter).toBe('calm');
  });

  it('persists migrated ids to storage with no legacy id left', async () => {
    await AsyncStorage.setItem(SESSIONS_KEY, JSON.stringify([valid, legacy]));

    await useSessionsStore.getState().hydrate();

    const raw = (await AsyncStorage.getItem(SESSIONS_KEY))!;
    expect(raw).not.toContain(LEGACY_ID);
    const stored = JSON.parse(raw) as BreathingSession[];
    expect(stored.map((s) => s.id).sort()).toEqual(
      useSessionsStore.getState().sessions.map((s) => s.id).sort()
    );
    stored.forEach((s) => expect(s.id).toMatch(UUID_RE));
  });

  it('is idempotent across repeated hydrates', async () => {
    await AsyncStorage.setItem(SESSIONS_KEY, JSON.stringify([valid, legacy]));

    await useSessionsStore.getState().hydrate();
    const firstIds = useSessionsStore.getState().sessions.map((s) => s.id);
    await useSessionsStore.getState().hydrate();
    const secondIds = useSessionsStore.getState().sessions.map((s) => s.id);

    expect(secondIds).toEqual(firstIds);
  });

  it('leaves all-UUID storage unchanged', async () => {
    const other = createMockSession({
      id: '0a1b2c3d-1111-4222-8333-444455556666',
      startedAt: new Date('2026-02-17T10:00:00').toISOString(),
      date: '2026-02-17',
    });
    await AsyncStorage.setItem(SESSIONS_KEY, JSON.stringify([valid, other]));

    await useSessionsStore.getState().hydrate();

    expect(useSessionsStore.getState().sessions.map((s) => s.id)).toEqual([VALID_ID, other.id]);
  });
  it('keeps legacy ids when persisting the migration fails, so a retry cannot mint different UUIDs', async () => {
    await AsyncStorage.setItem(SESSIONS_KEY, JSON.stringify([valid, legacy]));
    // AsyncStorage's jest mock is already a jest.fn; a spy's mockRestore would
    // wipe its implementation, so only queue a one-shot rejection.
    (AsyncStorage.setItem as jest.Mock).mockRejectedValueOnce(new Error('disk full'));

    await useSessionsStore.getState().hydrate();

    const { sessions, _hydrated } = useSessionsStore.getState();
    expect(_hydrated).toBe(true);
    expect(sessions.map((s) => s.id).sort()).toEqual([LEGACY_ID, VALID_ID].sort());
    expect(Sentry.captureException).toHaveBeenCalled();
  });

  it('still loads history with legacy ids when UUID generation throws', async () => {
    await AsyncStorage.setItem(SESSIONS_KEY, JSON.stringify([valid, legacy]));
    const randomUUID = jest.spyOn(Crypto, 'randomUUID').mockImplementation(() => {
      throw new Error('native module missing');
    });

    await useSessionsStore.getState().hydrate();
    randomUUID.mockRestore();

    const { sessions } = useSessionsStore.getState();
    expect(sessions.map((s) => s.id).sort()).toEqual([LEGACY_ID, VALID_ID].sort());
    expect(Sentry.captureException).toHaveBeenCalled();
  });
});


describe('hydrate corrupt storage', () => {
  const SESSIONS_KEY = '@breathflow_sessions';
  const CORRUPT_KEY = '@breathflow_sessions_corrupt';
  const VALID_ID = '3f2b8c1e-5d4a-4e7b-9a10-6c2d8e9f0a1b';

  beforeEach(async () => {
    jest.clearAllMocks();
    await AsyncStorage.clear();
    useSessionsStore.setState({ sessions: [], stats: { ...defaultStats }, _hydrated: false });
  });

  it('backs up unparseable JSON to the corrupt key and reports it, instead of silently losing history', async () => {
    await AsyncStorage.setItem(SESSIONS_KEY, '{not json');

    await useSessionsStore.getState().hydrate();

    expect(await AsyncStorage.getItem(CORRUPT_KEY)).toBe('{not json');
    expect(Sentry.captureException).toHaveBeenCalled();
    const { sessions, _hydrated } = useSessionsStore.getState();
    expect(sessions).toEqual([]);
    expect(_hydrated).toBe(true);
  });

  it('backs up a non-array value to the corrupt key', async () => {
    await AsyncStorage.setItem(SESSIONS_KEY, '{"a":1}');

    await useSessionsStore.getState().hydrate();

    expect(await AsyncStorage.getItem(CORRUPT_KEY)).toBe('{"a":1}');
    expect(useSessionsStore.getState().sessions).toEqual([]);
  });

  it('drops null and id-less rows, keeps valid ones, and warns once', async () => {
    const valid = createMockSession({ id: VALID_ID });
    await AsyncStorage.setItem(
      SESSIONS_KEY,
      JSON.stringify([null, valid, { id: 42 }, 'junk'])
    );

    await useSessionsStore.getState().hydrate();

    expect(useSessionsStore.getState().sessions).toEqual([valid]);
    expect(Sentry.captureMessage).toHaveBeenCalledTimes(1);
    expect(Sentry.captureMessage).toHaveBeenCalledWith(
      expect.any(String),
      expect.objectContaining({ level: 'warning', extra: { dropped: 3 } })
    );
  });

  it('reports unexpected hydrate failures to Sentry', async () => {
    (AsyncStorage.getItem as jest.Mock).mockRejectedValueOnce(new Error('read failed'));

    await useSessionsStore.getState().hydrate();

    expect(Sentry.captureException).toHaveBeenCalled();
    expect(useSessionsStore.getState()._hydrated).toBe(true);
  });
});

describe('deleted-session tombstones', () => {
  const SESSIONS_KEY = '@breathflow_sessions';
  const DELETED_KEY = '@breathflow_deleted_sessions';
  const ID = '3f2b8c1e-5d4a-4e7b-9a10-6c2d8e9f0a1b';

  beforeEach(async () => {
    jest.clearAllMocks();
    await AsyncStorage.clear();
    useSessionsStore.setState({
      sessions: [createMockSession({ id: ID })],
      stats: { ...defaultStats },
      deletedIds: [],
      _hydrated: true,
    });
  });

  it('deleteSession records and persists a tombstone', async () => {
    useSessionsStore.getState().deleteSession(ID);

    expect(useSessionsStore.getState().deletedIds).toEqual([ID]);
    expect(JSON.parse((await AsyncStorage.getItem(DELETED_KEY)) as string)).toEqual([ID]);
  });

  it('clearDeletedIds removes only the given ids and persists', async () => {
    useSessionsStore.setState({ deletedIds: ['a', 'b', 'c'] });

    useSessionsStore.getState().clearDeletedIds(['a', 'c']);

    expect(useSessionsStore.getState().deletedIds).toEqual(['b']);
    expect(JSON.parse((await AsyncStorage.getItem(DELETED_KEY)) as string)).toEqual(['b']);
  });

  it('clearAllSessions clears tombstones', async () => {
    useSessionsStore.setState({ deletedIds: ['a'] });

    useSessionsStore.getState().clearAllSessions();

    expect(useSessionsStore.getState().deletedIds).toEqual([]);
    expect(JSON.parse((await AsyncStorage.getItem(DELETED_KEY)) as string)).toEqual([]);
  });

  it('hydrate loads tombstones', async () => {
    await AsyncStorage.setItem(DELETED_KEY, JSON.stringify([ID]));
    await AsyncStorage.setItem(SESSIONS_KEY, JSON.stringify([]));

    await useSessionsStore.getState().hydrate();

    expect(useSessionsStore.getState().deletedIds).toEqual([ID]);
  });

  it('hydrate tolerates corrupt tombstones', async () => {
    await AsyncStorage.setItem(DELETED_KEY, '{oops');

    await useSessionsStore.getState().hydrate();

    expect(useSessionsStore.getState().deletedIds).toEqual([]);
    expect(useSessionsStore.getState()._hydrated).toBe(true);
  });
});

describe('updateSessionMood', () => {
  const SESSIONS_KEY = '@breathflow_sessions';
  const ID = '3f2b8c1e-5d4a-4e7b-9a10-6c2d8e9f0a1b';

  beforeEach(async () => {
    jest.clearAllMocks();
    await AsyncStorage.clear();
    useSessionsStore.setState({
      sessions: [createMockSession({ id: ID })],
      stats: { ...defaultStats },
      _hydrated: true,
    });
  });

  it('updates the session in state and persists moodAfter', async () => {
    useSessionsStore.getState().updateSessionMood(ID, 'calm');

    expect(useSessionsStore.getState().sessions[0].moodAfter).toBe('calm');
    const stored = JSON.parse((await AsyncStorage.getItem(SESSIONS_KEY)) as string);
    expect(stored[0].moodAfter).toBe('calm');
  });

  it('is a no-op for an unknown id', async () => {
    useSessionsStore.getState().updateSessionMood('missing', 'calm');

    expect(useSessionsStore.getState().sessions[0].moodAfter).toBeUndefined();
    expect(await AsyncStorage.getItem(SESSIONS_KEY)).toBeNull();
  });
});
