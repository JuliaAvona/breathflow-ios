import { create } from 'zustand';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { UnlockedBadge, UserStats, UserSettings, BreathingSession } from '../types';
import { BADGE_DEFINITIONS } from '../constants';

const STORAGE_KEY = '@breathflow_badges';

interface BadgesStore {
  unlockedBadges: UnlockedBadge[];
  _hydrated: boolean;
  onBadgeUnlocked: ((badgeId: string, titleKey: string, descKey: string) => void) | null;
  setOnBadgeUnlocked: (cb: BadgesStore['onBadgeUnlocked']) => void;
  hydrate: () => Promise<void>;
  checkAndUnlock: (stats: UserStats, settings: UserSettings, sessions: BreathingSession[]) => string[];
  unlockBadge: (badgeId: string) => void;
  isUnlocked: (badgeId: string) => boolean;
}

/**
 * Evaluate whether a badge should be unlocked based on its ID.
 */
function evaluateCondition(
  badgeId: string,
  stats: UserStats,
  settings: UserSettings,
  sessions: BreathingSession[],
): boolean {
  switch (badgeId) {
    case 'first_breath':
      return stats.totalSessions >= 1;
    case 'dedicated_breather':
      return stats.totalSessions >= 10;
    case 'explorer':
      return Object.keys(stats.sessionsPerTechnique).length >= 5;
    case 'technique_master':
      return Object.keys(stats.sessionsPerTechnique).length >= 10;
    case 'breathe_easy':
      return stats.bestRetention >= 60;
    case 'hour_power':
      return stats.totalMinutes >= 60;
    case 'iron_lungs':
      return stats.bestRetention >= 120;
    case 'deep_diver':
      return stats.bestRetention >= 90;
    case 'superhuman':
      return stats.bestRetention >= 180;
    case 'week_warrior':
      return stats.currentStreak >= 7;
    case 'month_master':
      return stats.currentStreak >= 30;
    case 'year_legend':
      return stats.currentStreak >= 365;
    case 'century':
      return stats.totalSessions >= 100;
    case 'zen_master':
      return stats.totalMinutes >= 1000;
    case 'early_bird':
      return sessions.some((s) => {
        const hour = new Date(s.startedAt).getHours();
        return hour < 7;
      });
    case 'night_owl':
      return sessions.some((s) => {
        const hour = new Date(s.startedAt).getHours();
        return hour >= 22;
      });
    case 'custom_creator':
      return false;
    case 'mood_tracker':
      return sessions.filter((s) => s.moodAfter != null).length >= 7;
    default:
      return false;
  }
}

export const useBadgesStore = create<BadgesStore>((set, get) => ({
  unlockedBadges: [],
  _hydrated: false,
  onBadgeUnlocked: null,
  setOnBadgeUnlocked: (cb) => set({ onBadgeUnlocked: cb }),

  hydrate: async () => {
    try {
      const json = await AsyncStorage.getItem(STORAGE_KEY);
      if (json) {
        const stored: UnlockedBadge[] = JSON.parse(json);
        set({ unlockedBadges: stored, _hydrated: true });
      } else {
        set({ unlockedBadges: [], _hydrated: true });
      }
    } catch {
      set({ _hydrated: true });
    }
  },

  checkAndUnlock: (stats: UserStats, settings: UserSettings, sessions: BreathingSession[]) => {
    const { unlockedBadges } = get();
    const unlockedIds = new Set(unlockedBadges.map((b) => b.badgeId));
    const newlyUnlocked: string[] = [];
    const now = new Date().toISOString();

    for (const def of BADGE_DEFINITIONS) {
      if (unlockedIds.has(def.id)) continue;

      const earned = evaluateCondition(def.id, stats, settings, sessions);
      if (earned) {
        newlyUnlocked.push(def.id);
      }
    }

    if (newlyUnlocked.length > 0) {
      const newEntries: UnlockedBadge[] = newlyUnlocked.map((id) => ({
        badgeId: id,
        unlockedAt: now,
      }));
      const updated = [...unlockedBadges, ...newEntries];
      set({ unlockedBadges: updated });
      AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(updated));
      try { require('../services/syncService').pushBadges().catch(() => {}); } catch {}

      const { onBadgeUnlocked } = get();
      if (onBadgeUnlocked) {
        for (const id of newlyUnlocked) {
          const def = BADGE_DEFINITIONS.find((d) => d.id === id);
          if (def) {
            onBadgeUnlocked(id, def.nameKey, def.descriptionKey);
          }
        }
      }
    }

    return newlyUnlocked;
  },

  unlockBadge: (badgeId: string) => {
    const { unlockedBadges } = get();
    if (unlockedBadges.some((b) => b.badgeId === badgeId)) return;

    const updated: UnlockedBadge[] = [
      ...unlockedBadges,
      { badgeId, unlockedAt: new Date().toISOString() },
    ];
    set({ unlockedBadges: updated });
    AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(updated));
  },

  isUnlocked: (badgeId: string) => {
    return get().unlockedBadges.some((b) => b.badgeId === badgeId);
  },
}));
