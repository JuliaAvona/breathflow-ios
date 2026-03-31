import { renderHook, act } from '@testing-library/react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useBadgesStore } from '../badgesStore';
import { UserStats, UserSettings, BreathingSession } from '../../types';

jest.mock('../../services/syncService', () => ({
  pushBadges: jest.fn().mockResolvedValue(undefined),
}));

const mockStats: UserStats = {
  currentStreak: 10,
  longestStreak: 15,
  totalSessions: 50,
  totalMinutes: 1500,
  totalBreaths: 3000,
  bestRetention: 90,
  avgRetention: 60,
  lastSessionDate: '2026-02-14',
  favoriteTechniqueId: 'box_breathing',
  sessionsPerTechnique: { box_breathing: 30, wim_hof: 20 },
};

const mockSettings: UserSettings = {
  techniqueOverrides: {},
  soundEnabled: true,
  soundStyle: 'tone',
  hapticsEnabled: true,
  darkMode: 'system',
  textSize: 'default',
  healthSyncEnabled: false,
  reminderEnabled: false,
  reminderTime: '08:00',
  reminderDays: [0, 1, 2, 3, 4, 5, 6],
  onboardingCompleted: true,
  safetyAccepted: true,
  dailyGoalMinutes: 5,
  isPro: false,
};

const mockSessions: BreathingSession[] = [];

describe('badgesStore', () => {
  beforeEach(async () => {
    // Clear persisted state and reset store
    await AsyncStorage.removeItem('@breathflow_badges');
    const { result } = renderHook(() => useBadgesStore());
    await act(async () => {
      await result.current.hydrate();
    });
  });

  it('initializes with empty unlocked badges', () => {
    const { result } = renderHook(() => useBadgesStore());

    expect(result.current.unlockedBadges).toHaveLength(0);
  });

  it('unlocks first_breath badge with 1 session', () => {
    const { result } = renderHook(() => useBadgesStore());

    const stats: UserStats = {
      ...mockStats,
      totalSessions: 1,
    };

    let unlocked: string[] = [];
    act(() => {
      unlocked = result.current.checkAndUnlock(stats, mockSettings, mockSessions);
    });

    expect(unlocked).toContain('first_breath');
  });

  it('unlocks explorer badge with 5 techniques used', () => {
    const { result } = renderHook(() => useBadgesStore());

    const stats: UserStats = {
      ...mockStats,
      sessionsPerTechnique: {
        box: 1,
        '478': 1,
        wim: 1,
        coherent: 1,
        alternate: 1,
      },
    };

    let unlocked: string[] = [];
    act(() => {
      unlocked = result.current.checkAndUnlock(stats, mockSettings, mockSessions);
    });

    expect(unlocked).toContain('explorer');
  });

  it('unlocks week_warrior badge with 7-day streak', () => {
    const { result } = renderHook(() => useBadgesStore());

    const stats: UserStats = {
      ...mockStats,
      currentStreak: 7,
    };

    let unlocked: string[] = [];
    act(() => {
      unlocked = result.current.checkAndUnlock(stats, mockSettings, mockSessions);
    });

    expect(unlocked).toContain('week_warrior');
  });

  it('unlocks zen_master badge with 1000 minutes', () => {
    const { result } = renderHook(() => useBadgesStore());

    const stats: UserStats = {
      ...mockStats,
      totalMinutes: 1000,
    };

    let unlocked: string[] = [];
    act(() => {
      unlocked = result.current.checkAndUnlock(stats, mockSettings, mockSessions);
    });

    expect(unlocked).toContain('zen_master');
  });

  it('unlocks breathe_easy badge with 60s best retention', () => {
    const { result } = renderHook(() => useBadgesStore());

    const stats: UserStats = {
      ...mockStats,
      bestRetention: 60,
    };

    let unlocked: string[] = [];
    act(() => {
      unlocked = result.current.checkAndUnlock(stats, mockSettings, mockSessions);
    });

    expect(unlocked).toContain('breathe_easy');
  });

  it('unlocks multiple badges at once', () => {
    const { result } = renderHook(() => useBadgesStore());

    const stats: UserStats = {
      currentStreak: 30,
      longestStreak: 30,
      totalSessions: 100,
      totalMinutes: 1000,
      totalBreaths: 10000,
      bestRetention: 180,
      avgRetention: 120,
      lastSessionDate: '2026-02-14',
      favoriteTechniqueId: 'box',
      sessionsPerTechnique: {
        box: 10, '478': 10, wim: 10, coherent: 10, alternate: 10,
        kapalabhati: 10, ujjayi: 10, bhastrika: 10, nadi: 10, lion: 10,
      },
    };

    let unlocked: string[] = [];
    act(() => {
      unlocked = result.current.checkAndUnlock(stats, mockSettings, mockSessions);
    });

    // Should unlock many badges
    expect(unlocked.length).toBeGreaterThan(5);
    expect(unlocked).toContain('first_breath');
    expect(unlocked).toContain('century');
    expect(unlocked).toContain('month_master');
    expect(unlocked).toContain('zen_master');
    expect(unlocked).toContain('superhuman');
  });

  it('does not re-unlock already unlocked badges', () => {
    const { result } = renderHook(() => useBadgesStore());

    const stats: UserStats = {
      ...mockStats,
      totalSessions: 1,
    };

    // First unlock
    let unlocked: string[] = [];
    act(() => {
      unlocked = result.current.checkAndUnlock(stats, mockSettings, mockSessions);
    });

    expect(unlocked).toContain('first_breath');

    // Second check with same stats
    act(() => {
      unlocked = result.current.checkAndUnlock(stats, mockSettings, mockSessions);
    });

    expect(unlocked).not.toContain('first_breath');
  });

  it('isUnlocked returns correct value', () => {
    const { result } = renderHook(() => useBadgesStore());

    expect(result.current.isUnlocked('first_breath')).toBe(false);

    act(() => {
      result.current.unlockBadge('first_breath');
    });

    expect(result.current.isUnlocked('first_breath')).toBe(true);
  });

  it('unlockBadge adds badge to unlockedBadges', () => {
    const { result } = renderHook(() => useBadgesStore());

    act(() => {
      result.current.unlockBadge('first_breath');
    });

    expect(result.current.unlockedBadges).toHaveLength(1);
    expect(result.current.unlockedBadges[0].badgeId).toBe('first_breath');
    expect(result.current.unlockedBadges[0].unlockedAt).toBeTruthy();
  });
});
