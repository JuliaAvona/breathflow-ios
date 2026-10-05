// jest.setup.js globally auto-mocks this module (other stores import it as a
// side effect); undo that here since this suite tests the real implementation.
jest.unmock('../syncService');

// syncService pulls in @sentry/react-native transitively, which is ESM and
// not covered by the jest transformIgnorePatterns allowlist.
jest.mock('../../utils/sentry', () => ({
  Sentry: { captureException: jest.fn(), captureMessage: jest.fn() },
}));

import { pushSessions, pullAndMerge } from '../syncService';
import { Sentry } from '../../utils/sentry';
import { supabase } from '../../utils/supabase';
import { useAuthStore } from '../../store/authStore';
import { useSessionsStore } from '../../store/sessionsStore';
import { BreathingSession, UserStats } from '../../types';

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

const createMockSession = (overrides: Partial<BreathingSession> = {}): BreathingSession => ({
  id: 'aaaaaaaa-bbbb-cccc-dddd-eeeeeeeeeeee',
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

describe('pushSessions', () => {
  let upsertCalls: { table: string; rows: unknown }[];

  beforeEach(() => {
    jest.clearAllMocks();
    useAuthStore.setState({ user: { id: 'user-1' } as never });
    upsertCalls = [];
    (supabase.from as jest.Mock).mockImplementation((table: string) => ({
      upsert: jest.fn((rows: unknown) => {
        upsertCalls.push({ table, rows });
        return Promise.resolve({ error: null });
      }),
    }));
  });

  it('excludes legacy non-UUID session ids from the upsert payload, so one bad row cannot fail the whole batch (regression: 22P02 invalid uuid)', async () => {
    const goodSession = createMockSession();
    const legacySession = createMockSession({ id: '1785468573109-tvm1d3p' });

    useSessionsStore.setState({ sessions: [goodSession, legacySession], stats: defaultStats });

    await pushSessions();

    const sessionsCall = upsertCalls.find((c) => c.table === 'user_sessions');
    const rows = sessionsCall?.rows as { id: string }[];
    expect(rows).toHaveLength(1);
    expect(rows[0].id).toBe(goodSession.id);
  });

  it('skips the user_sessions upsert entirely when every local session has a legacy id', async () => {
    useSessionsStore.setState({
      sessions: [createMockSession({ id: '1785468573109-tvm1d3p' })],
      stats: defaultStats,
    });

    await pushSessions();

    expect(upsertCalls.find((c) => c.table === 'user_sessions')).toBeUndefined();
  });

  it('pushes all sessions when every id is a valid UUID', async () => {
    const sessions = [
      createMockSession({ id: 'aaaaaaaa-bbbb-cccc-dddd-eeeeeeeeeeee' }),
      createMockSession({ id: 'bbbbbbbb-cccc-dddd-eeee-ffffffffffff' }),
    ];
    useSessionsStore.setState({ sessions, stats: defaultStats });

    await pushSessions();

    const sessionsCall = upsertCalls.find((c) => c.table === 'user_sessions');
    const rows = sessionsCall?.rows as { id: string }[];
    expect(rows).toHaveLength(2);
  });
  it('reports skipped non-UUID ids to Sentry, since hydrate() should have migrated them', async () => {
    useSessionsStore.setState({
      sessions: [createMockSession(), createMockSession({ id: '1785468573109-tvm1d3p' })],
      stats: defaultStats,
    });

    await pushSessions();

    expect(Sentry.captureMessage).toHaveBeenCalledWith(
      'pushSessions skipped non-UUID session ids',
      expect.objectContaining({ level: 'warning', extra: { skipped: 1 } })
    );
  });

  it('does not warn when every id is a valid UUID', async () => {
    useSessionsStore.setState({ sessions: [createMockSession()], stats: defaultStats });

    await pushSessions();

    expect(Sentry.captureMessage).not.toHaveBeenCalled();
  });
});


describe('deleted-session tombstones', () => {
  const LIVE_ID = 'aaaaaaaa-bbbb-cccc-dddd-eeeeeeeeeeee';
  const DEAD_ID = 'bbbbbbbb-cccc-dddd-eeee-ffffffffffff';
  const LEGACY_DEAD = '1785468573109-tvm1d3p';
  let upserted: { id: string }[];
  let deleteIn: jest.Mock;
  let deleteError: unknown;

  beforeEach(() => {
    jest.clearAllMocks();
    useAuthStore.setState({ user: { id: 'user-1' } as never });
    upserted = [];
    deleteError = null;
    deleteIn = jest.fn(() => Promise.resolve({ error: deleteError }));
    (supabase.from as jest.Mock).mockImplementation((table: string) => ({
      upsert: jest.fn((rows: unknown) => {
        if (table === 'user_sessions') upserted.push(...(rows as { id: string }[]));
        return Promise.resolve({ error: null });
      }),
      delete: jest.fn(() => ({ eq: jest.fn(() => ({ in: deleteIn })) })),
    }));
    useSessionsStore.setState({
      sessions: [createMockSession({ id: LIVE_ID })],
      stats: defaultStats,
      deletedIds: [DEAD_ID, LEGACY_DEAD],
    });
  });

  it('deletes tombstoned uuids on the server and clears all tombstones on success', async () => {
    await pushSessions();

    expect(deleteIn).toHaveBeenCalledWith('id', [DEAD_ID]);
    expect(useSessionsStore.getState().deletedIds).toEqual([]);
  });

  it('never upserts a tombstoned row, even if it is still in local sessions', async () => {
    useSessionsStore.setState({
      sessions: [createMockSession({ id: LIVE_ID }), createMockSession({ id: DEAD_ID })],
    });

    await pushSessions();

    expect(upserted.map((r) => r.id)).toEqual([LIVE_ID]);
  });

  it('keeps uuid tombstones when the server delete fails, but still clears non-uuid ones', async () => {
    deleteError = { message: 'network' };

    await pushSessions();

    expect(useSessionsStore.getState().deletedIds).toEqual([DEAD_ID]);
    expect(Sentry.captureException).toHaveBeenCalled();
  });

  it('does not call delete when there are no tombstones', async () => {
    useSessionsStore.setState({ deletedIds: [] });

    await pushSessions();

    expect(deleteIn).not.toHaveBeenCalled();
  });

  it('pullSessions does not merge remote rows that are tombstoned', async () => {
    const remote = (id: string) => ({
      id,
      user_id: 'user-1',
      date: '2026-02-19',
      started_at: '2026-02-19T10:00:00.000Z',
      completed_at: '2026-02-19T10:30:00.000Z',
      completed: true,
      technique_id: 'box_breathing',
      cycles_completed: 6,
      total_duration: 1800,
    });
    const chain = (data: unknown) => {
      const c: Record<string, unknown> = {};
      c.select = jest.fn(() => c);
      c.eq = jest.fn(() => c);
      c.order = jest.fn(() => Promise.resolve({ data, error: null }));
      c.single = jest.fn(() => Promise.resolve({ data: null, error: null }));
      return c;
    };
    (supabase.from as jest.Mock).mockImplementation((table: string) =>
      table === 'user_sessions' ? chain([remote(DEAD_ID), remote(LIVE_ID)]) : chain(null)
    );
    useSessionsStore.setState({ sessions: [], deletedIds: [DEAD_ID] });

    await pullAndMerge();

    expect(useSessionsStore.getState().sessions.map((s) => s.id)).toEqual([LIVE_ID]);
  });
  it('runs concurrent pushes one at a time, so a stale push cannot re-upsert after a delete', async () => {
    let releaseFirst: () => void = () => {};
    let upsertCount = 0;
    (supabase.from as jest.Mock).mockImplementation(() => ({
      upsert: jest.fn(() => {
        upsertCount += 1;
        return upsertCount === 1
          ? new Promise((resolve) => {
              releaseFirst = () => resolve({ error: null });
            })
          : Promise.resolve({ error: null });
      }),
      delete: jest.fn(() => ({ eq: jest.fn(() => ({ in: deleteIn })) })),
    }));

    const first = pushSessions();
    const second = pushSessions();
    for (let i = 0; i < 10; i += 1) await Promise.resolve();

    // The second push must not start (upsert or delete) while the first is in flight.
    expect(upsertCount).toBe(1);
    expect(deleteIn).not.toHaveBeenCalled();

    releaseFirst();
    await Promise.all([first, second]);
    expect(upsertCount).toBeGreaterThan(1);
  });

  it('pullSessions merges against the store after the stats round-trip, keeping adds and deletes made meanwhile', async () => {
    const ADDED_ID = 'cccccccc-dddd-eeee-ffff-000000000000';
    const remoteRow = {
      id: LIVE_ID,
      user_id: 'user-1',
      date: '2026-02-19',
      started_at: '2026-02-19T10:00:00.000Z',
      completed_at: '2026-02-19T10:30:00.000Z',
      completed: true,
      technique_id: 'box_breathing',
      cycles_completed: 6,
      total_duration: 1800,
    };
    const chain = (data: unknown, onSingle?: () => void) => {
      const c: Record<string, unknown> = {};
      c.select = jest.fn(() => c);
      c.eq = jest.fn(() => c);
      c.order = jest.fn(() => Promise.resolve({ data, error: null }));
      c.single = jest.fn(() => {
        onSingle?.();
        return Promise.resolve({ data: null, error: null });
      });
      return c;
    };
    // While user_stats is in flight: the user deletes LIVE_ID and saves a new session.
    const midPull = () =>
      useSessionsStore.setState({
        sessions: [createMockSession({ id: ADDED_ID })],
        deletedIds: [LIVE_ID],
      });
    (supabase.from as jest.Mock).mockImplementation((table: string) =>
      table === 'user_sessions' ? chain([remoteRow]) : chain(null, table === 'user_stats' ? midPull : undefined)
    );
    useSessionsStore.setState({ sessions: [createMockSession({ id: LIVE_ID })], deletedIds: [] });

    await pullAndMerge();

    expect(useSessionsStore.getState().sessions.map((s) => s.id)).toEqual([ADDED_ID]);
  });
});

