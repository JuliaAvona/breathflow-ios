import { create } from 'zustand';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { UserSettings } from '../types';

const STORAGE_KEY = '@breathflow_settings';

const DEFAULT_SETTINGS: UserSettings = {
  techniqueOverrides: {},

  soundEnabled: true,
  soundStyle: 'tone',
  hapticsEnabled: true,

  darkMode: 'dark',
  textSize: 'default',

  healthSyncEnabled: false,

  reminderEnabled: false,
  reminderTime: '08:00',
  reminderDays: [0, 1, 2, 3, 4, 5, 6],

  onboardingCompleted: false,
  safetyAccepted: false,
  selectedGoal: undefined,
  recommendedTechniqueId: undefined,
  dailyGoalMinutes: 5,

  isPro: false,
};

interface SettingsStore extends UserSettings {
  _hydrated: boolean;

  // Epoch ms of the last local settings change — used by syncService to decide
  // whether a synced row is stale (last-write-wins), local-only, not pushed.
  settingsUpdatedAt: number;

  // Generic setter for any setting
  setSetting: <K extends keyof UserSettings>(key: K, value: UserSettings[K]) => void;

  // Pro access — must be set via these dedicated methods (not setSetting)
  grantPro: () => void;
  revokePro: () => void;

  // Technique overrides
  setTechniqueOverride: (techniqueId: string, overrides: UserSettings['techniqueOverrides'][string]) => void;
  clearTechniqueOverride: (techniqueId: string) => void;

  // Hydration
  hydrate: () => Promise<void>;
}

/** Extract only UserSettings fields from the store state for persistence. */
function extractSettings(state: SettingsStore): UserSettings {
  return {
    techniqueOverrides: state.techniqueOverrides,
    soundEnabled: state.soundEnabled,
    soundStyle: state.soundStyle,
    hapticsEnabled: state.hapticsEnabled,
    darkMode: state.darkMode,
    textSize: state.textSize,
    healthSyncEnabled: state.healthSyncEnabled,
    reminderEnabled: state.reminderEnabled,
    reminderTime: state.reminderTime,
    reminderDays: state.reminderDays,
    onboardingCompleted: state.onboardingCompleted,
    safetyAccepted: state.safetyAccepted,
    selectedGoal: state.selectedGoal,
    recommendedTechniqueId: state.recommendedTechniqueId,
    dailyGoalMinutes: state.dailyGoalMinutes,
    isPro: state.isPro,
  };
}

/**
 * Persist current settings (+ local change timestamp) to AsyncStorage.
 * Exported so syncService can persist a remote-merged snapshot too — without
 * this, a merge applied via setState() only lives in memory and reverts to
 * the last locally-persisted copy (including a stale settingsUpdatedAt) on
 * the next app restart, before it's ever pushed back out.
 */
export function persist(state: SettingsStore): void {
  const data = { ...extractSettings(state), settingsUpdatedAt: state.settingsUpdatedAt };
  AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(data));
}

export const useSettingsStore = create<SettingsStore>()((set, get) => {
  /** Apply a partial settings change, stamp it, persist, and push to the cloud. */
  const applyAndSync = (partial: Partial<UserSettings>) => {
    set({ ...partial, settingsUpdatedAt: Date.now() } as Partial<SettingsStore>);
    persist(get());
    try {
      require('../services/syncService').pushSettings().catch(() => {});
    } catch {}
  };

  return {
    ...DEFAULT_SETTINGS,
    settingsUpdatedAt: 0,
    _hydrated: false,

    hydrate: async () => {
      try {
        const json = await AsyncStorage.getItem(STORAGE_KEY);
        if (json) {
          const stored = JSON.parse(json) as Partial<UserSettings> & { settingsUpdatedAt?: number };
          set({ ...DEFAULT_SETTINGS, ...stored, _hydrated: true });
        } else {
          set({ _hydrated: true });
        }
      } catch {
        set({ _hydrated: true });
      }
    },

    setSetting: (key, value) => applyAndSync({ [key]: value } as Partial<UserSettings>),

    // No-op when already in the target state: callers like app/_layout.tsx's
    // cold-launch entitlement check call one of these unconditionally on every
    // launch, and bumping settingsUpdatedAt every time would make local settings
    // look "newer" than the synced row on almost every sync, starving the
    // last-write-wins merge in syncService.pullSettings() of ever applying.
    grantPro: () => {
      if (get().isPro) return;
      applyAndSync({ isPro: true });
    },

    revokePro: () => {
      if (!get().isPro) return;
      applyAndSync({ isPro: false });
    },

    setTechniqueOverride: (techniqueId, overrides) => {
      const current = get().techniqueOverrides;
      applyAndSync({ techniqueOverrides: { ...current, [techniqueId]: overrides } });
    },

    clearTechniqueOverride: (techniqueId) => {
      const { [techniqueId]: _, ...rest } = get().techniqueOverrides;
      applyAndSync({ techniqueOverrides: rest });
    },
  };
});
