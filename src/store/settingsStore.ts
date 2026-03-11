import { create } from 'zustand';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { UserSettings, BreathingTechnique } from '../types';

const STORAGE_KEY = '@breathflow_settings';

const DEFAULT_SETTINGS: UserSettings = {
  techniqueOverrides: {},
  customTechniques: [],

  soundEnabled: true,
  soundStyle: 'tone',
  hapticsEnabled: true,
  voiceGuidance: 'off',

  colorThemeId: 'ocean',
  darkMode: 'system',
  textSize: 'default',

  healthSyncEnabled: false,

  reminderEnabled: false,
  reminderTime: '08:00',
  reminderDays: [0, 1, 2, 3, 4, 5, 6],

  onboardingCompleted: false,
  safetyAccepted: false,
  selectedGoal: undefined,

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

  // Custom techniques (Pro)
  addCustomTechnique: (technique: BreathingTechnique) => void;
  updateCustomTechnique: (id: string, technique: BreathingTechnique) => void;
  deleteCustomTechnique: (id: string) => void;

  // Hydration
  hydrate: () => Promise<void>;
}

/** Extract only UserSettings fields from the store state for persistence. */
function extractSettings(state: SettingsStore): UserSettings {
  return {
    techniqueOverrides: state.techniqueOverrides,
    customTechniques: state.customTechniques,
    soundEnabled: state.soundEnabled,
    soundStyle: state.soundStyle,
    hapticsEnabled: state.hapticsEnabled,
    voiceGuidance: state.voiceGuidance,
    colorThemeId: state.colorThemeId,
    darkMode: state.darkMode,
    textSize: state.textSize,
    healthSyncEnabled: state.healthSyncEnabled,
    reminderEnabled: state.reminderEnabled,
    reminderTime: state.reminderTime,
    reminderDays: state.reminderDays,
    onboardingCompleted: state.onboardingCompleted,
    safetyAccepted: state.safetyAccepted,
    selectedGoal: state.selectedGoal,
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

  addCustomTechnique: (technique) => {
    set({ customTechniques: [...get().customTechniques, technique] });
    persist(get());
    import('../services/syncService').then(m => m.pushSettings().catch(() => {}));
  },

  updateCustomTechnique: (id, technique) => {
    set({
      customTechniques: get().customTechniques.map(t => (t.id === id ? technique : t)),
    });
    persist(get());
    import('../services/syncService').then(m => m.pushSettings().catch(() => {}));
  },

  deleteCustomTechnique: (id) => {
    set({
      customTechniques: get().customTechniques.filter(t => t.id !== id),
    });
    persist(get());
    import('../services/syncService').then(m => m.pushSettings().catch(() => {}));
  },
}));
