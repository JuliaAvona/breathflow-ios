import { create } from 'zustand';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Badge, UserStats } from '../types';
import { BADGE_DEFINITIONS } from '../constants';

const STORAGE_KEY = '@walkpace_badges';

interface BadgeState {
  id: string;
  unlockedAt: number | null;
}

interface BadgesStore {
  badges: BadgeState[];
  _hydrated: boolean;
  onBadgeUnlocked: ((badgeId: string, titleKey: string, descKey: string) => void) | null;
  setOnBadgeUnlocked: (cb: BadgesStore['onBadgeUnlocked']) => void;
  hydrate: () => Promise<void>;
  checkAndUnlock: (stats: UserStats) => string[];
  getBadge: (id: string) => Badge | undefined;
  getAllBadges: () => Badge[];
}

const createDefaultBadges = (): BadgeState[] =>
  BADGE_DEFINITIONS.map((def) => ({ id: def.id, unlockedAt: null }));

export const useBadgesStore = create<BadgesStore>((set, get) => ({
  badges: createDefaultBadges(),
  _hydrated: false,
  onBadgeUnlocked: null,
  setOnBadgeUnlocked: (cb) => set({ onBadgeUnlocked: cb }),

  hydrate: async () => {
    try {
      const json = await AsyncStorage.getItem(STORAGE_KEY);
      if (json) {
        const stored: BadgeState[] = JSON.parse(json);
        // Merge with definitions to handle newly added badges
        const merged = BADGE_DEFINITIONS.map((def) => {
          const existing = stored.find((b) => b.id === def.id);
          return existing ?? { id: def.id, unlockedAt: null };
        });
        set({ badges: merged, _hydrated: true });
      } else {
        set({ badges: createDefaultBadges(), _hydrated: true });
      }
    } catch {
      set({ _hydrated: true });
    }
  },

  checkAndUnlock: (stats: UserStats) => {
    const { badges } = get();
    const newlyUnlocked: string[] = [];
    const now = Date.now();

    const updated = badges.map((badge) => {
      if (badge.unlockedAt !== null) return badge;

      const def = BADGE_DEFINITIONS.find((d) => d.id === badge.id);
      if (!def) return badge;

      let earned = false;
      switch (def.condition.type) {
        case 'sessions':
          earned = stats.totalSessions >= def.condition.value;
          break;
        case 'streak':
          earned = stats.currentStreak >= def.condition.value;
          break;
        case 'minutes':
          earned = stats.totalMinutes >= def.condition.value;
          break;
        case 'calories':
          earned = stats.totalCalories >= def.condition.value;
          break;
      }

      if (earned) {
        newlyUnlocked.push(badge.id);
        return { ...badge, unlockedAt: now };
      }
      return badge;
    });

    if (newlyUnlocked.length > 0) {
      set({ badges: updated });
      AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(updated));
      try { require('../services/syncService').pushBadges().catch(() => {}); } catch {}

      const { onBadgeUnlocked } = get();
      if (onBadgeUnlocked) {
        for (const id of newlyUnlocked) {
          const def = BADGE_DEFINITIONS.find((d) => d.id === id);
          if (def) {
            onBadgeUnlocked(id, `badges.badge_${id}_title`, `badges.badge_${id}_desc`);
          }
        }
      }
    }

    return newlyUnlocked;
  },

  getBadge: (id: string) => {
    const { badges } = get();
    const def = BADGE_DEFINITIONS.find((d) => d.id === id);
    const state = badges.find((b) => b.id === id);
    if (!def || !state) return undefined;

    return {
      id: def.id,
      titleKey: `badges.badge_${def.id}_title`,
      descriptionKey: `badges.badge_${def.id}_desc`,
      icon: def.icon,
      condition: { ...def.condition },
      unlockedAt: state.unlockedAt,
    };
  },

  getAllBadges: () => {
    const { badges } = get();
    return BADGE_DEFINITIONS.map((def) => {
      const state = badges.find((b) => b.id === def.id);
      return {
        id: def.id,
        titleKey: `badges.badge_${def.id}_title`,
        descriptionKey: `badges.badge_${def.id}_desc`,
        icon: def.icon,
        condition: { ...def.condition },
        unlockedAt: state?.unlockedAt ?? null,
      };
    });
  },
}));
