// jest.setup.js globally auto-mocks this module (other stores import it as a
// side effect); undo that here since this suite tests the real implementation.
jest.unmock('../syncService');

// syncService pulls in @sentry/react-native transitively, which is ESM and
// not covered by the jest transformIgnorePatterns allowlist.
jest.mock('../../utils/sentry', () => ({ Sentry: { captureException: jest.fn() } }));

import { pushSessions } from '../syncService';
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
});
