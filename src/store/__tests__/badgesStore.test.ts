import { renderHook, act } from '@testing-library/react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useBadgesStore } from '../badgesStore';
import { UserStats } from '../../types';

jest.mock('../../services/syncService', () => ({
  pushBadges: jest.fn().mockResolvedValue(undefined),
}));

const mockStats: UserStats = {
  currentStreak: 10,
  longestStreak: 15,
  totalSessions: 50,
  totalMinutes: 1500,
  totalCalories: 7500,
  lastSessionDate: '2026-02-14',
};

describe('badgesStore', () => {
  beforeEach(async () => {
    // Clear persisted state and reset store
    await AsyncStorage.removeItem('@walkpace_badges');
    const { result } = renderHook(() => useBadgesStore());
    await act(async () => {
      await result.current.hydrate();
    });
  });

  it('initializes with default badges', () => {
    const { result } = renderHook(() => useBadgesStore());

    expect(result.current.badges.length).toBeGreaterThan(0);
    expect(result.current.badges.every(b => b.unlockedAt === null)).toBe(true);
  });

  it('unlocks first_walk badge with 1 session', () => {
    const { result } = renderHook(() => useBadgesStore());

    const stats: UserStats = {
      ...mockStats,
      totalSessions: 1,
    };

    let unlocked: string[] = [];
    act(() => {
      unlocked = result.current.checkAndUnlock(stats);
    });

    expect(unlocked).toContain('first_walk');
  });

  it('unlocks walks_10 badge with 10 sessions', () => {
    const { result } = renderHook(() => useBadgesStore());

    const stats: UserStats = {
      ...mockStats,
      totalSessions: 10,
    };

    let unlocked: string[] = [];
    act(() => {
      unlocked = result.current.checkAndUnlock(stats);
    });

    expect(unlocked).toContain('walks_10');
  });

  it('unlocks streak_7 badge with 7-day streak', () => {
    const { result } = renderHook(() => useBadgesStore());

    const stats: UserStats = {
      ...mockStats,
      currentStreak: 7,
    };

    let unlocked: string[] = [];
    act(() => {
      unlocked = result.current.checkAndUnlock(stats);
    });

    expect(unlocked).toContain('streak_7');
  });

  it('unlocks minutes_60 badge with 60 minutes', () => {
    const { result } = renderHook(() => useBadgesStore());

    const stats: UserStats = {
      ...mockStats,
      totalMinutes: 60,
    };

    let unlocked: string[] = [];
    act(() => {
      unlocked = result.current.checkAndUnlock(stats);
    });

    expect(unlocked).toContain('minutes_60');
  });

  it('unlocks cal_1000 badge with 1000 calories', () => {
    const { result } = renderHook(() => useBadgesStore());

    const stats: UserStats = {
      ...mockStats,
      totalCalories: 1000,
    };

    let unlocked: string[] = [];
    act(() => {
      unlocked = result.current.checkAndUnlock(stats);
    });

    expect(unlocked).toContain('cal_1000');
  });

  it('unlocks multiple badges at once', () => {
    const { result } = renderHook(() => useBadgesStore());

    const stats: UserStats = {
      currentStreak: 30,
      longestStreak: 30,
      totalSessions: 100,
      totalMinutes: 3000,
      totalCalories: 10000,
      lastSessionDate: '2026-02-14',
    };

    let unlocked: string[] = [];
    act(() => {
      unlocked = result.current.checkAndUnlock(stats);
    });

    // Should unlock many badges
    expect(unlocked.length).toBeGreaterThan(5);
    expect(unlocked).toContain('first_walk');
    expect(unlocked).toContain('walks_100');
    expect(unlocked).toContain('streak_30');
    expect(unlocked).toContain('minutes_3000');
    expect(unlocked).toContain('cal_10000');
  });

  it('does not re-unlock already unlocked badges', () => {
    const { result } = renderHook(() => useBadgesStore());

    const stats: UserStats = {
      ...mockStats,
      totalSessions: 10,
    };

    // First unlock
    let unlocked: string[] = [];
    act(() => {
      unlocked = result.current.checkAndUnlock(stats);
    });

    expect(unlocked).toContain('walks_10');

    // Second check with same stats
    act(() => {
      unlocked = result.current.checkAndUnlock(stats);
    });

    expect(unlocked).not.toContain('walks_10');
  });

  it('getBadge returns badge with correct structure', () => {
    const { result } = renderHook(() => useBadgesStore());

    const badge = result.current.getBadge('first_walk');

    expect(badge).toBeDefined();
    expect(badge?.id).toBe('first_walk');
    expect(badge?.titleKey).toBe('badges.badge_first_walk_title');
    expect(badge?.descriptionKey).toBe('badges.badge_first_walk_desc');
    expect(badge?.condition.type).toBe('sessions');
    expect(badge?.condition.value).toBe(1);
  });

  it('getAllBadges returns all badge definitions', () => {
    const { result } = renderHook(() => useBadgesStore());

    const allBadges = result.current.getAllBadges();

    expect(allBadges.length).toBeGreaterThan(20); // We have 24+ badges
    expect(allBadges.every(b => b.titleKey && b.descriptionKey)).toBe(true);
  });
});
