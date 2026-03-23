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

/** Persist current settings to AsyncStorage. */
function persist(state: SettingsStore): void {
  const data = extractSettings(state);
  AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(data));
}

export const useSettingsStore = create<SettingsStore>()((set, get) => ({
  ...DEFAULT_SETTINGS,
  _hydrated: false,

  hydrate: async () => {
    try {
      const json = await AsyncStorage.getItem(STORAGE_KEY);
      if (json) {
        const stored = JSON.parse(json) as Partial<UserSettings>;
        set({ ...DEFAULT_SETTINGS, ...stored, _hydrated: true });
      } else {
        set({ _hydrated: true });
      }
    } catch {
      set({ _hydrated: true });
    }
  },

  setSetting: (key, value) => {
    set({ [key]: value } as Partial<SettingsStore>);
    persist(get());
    import('../services/syncService').then(m => m.pushSettings().catch(() => {}));
  },

  grantPro: () => {
    set({ isPro: true });
    persist(get());
    import('../services/syncService').then(m => m.pushSettings().catch(() => {}));
  },

  revokePro: () => {
    set({ isPro: false });
    persist(get());
    import('../services/syncService').then(m => m.pushSettings().catch(() => {}));
  },

  setTechniqueOverride: (techniqueId, overrides) => {
    const current = get().techniqueOverrides;
    set({
      techniqueOverrides: { ...current, [techniqueId]: overrides },
    });
    persist(get());
    import('../services/syncService').then(m => m.pushSettings().catch(() => {}));
  },

  clearTechniqueOverride: (techniqueId) => {
    const { [techniqueId]: _, ...rest } = get().techniqueOverrides;
    set({ techniqueOverrides: rest });
    persist(get());
    import('../services/syncService').then(m => m.pushSettings().catch(() => {}));
  },
}));
