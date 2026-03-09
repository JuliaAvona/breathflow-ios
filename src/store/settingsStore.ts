import { create } from 'zustand';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Settings } from '../types';
import { TIMER_DEFAULTS } from '../constants';

const STORAGE_KEY = '@walkpace_settings';

const defaultSettings: Settings = {
  soundEnabled: true,
  vibrationEnabled: true,
  soundType: 'beep',
  healthIntegration: false,
  isPro: false,
  onboardingCompleted: false,
  warmUpEnabled: false,
  coolDownEnabled: false,
  warmUpDuration: TIMER_DEFAULTS.warmUpDuration,
  coolDownDuration: TIMER_DEFAULTS.coolDownDuration,
  highContrastMode: false,
  fastInterval: TIMER_DEFAULTS.fastDuration,
  slowInterval: TIMER_DEFAULTS.slowDuration,
  roundCount: TIMER_DEFAULTS.totalRounds,
  reminderEnabled: false,
  reminderTime: '08:00',
  dailyStepGoal: 10000,
  colorThemeId: 'default',
  startingPhase: 'fast',
};

interface SettingsStore extends Settings {
  _hydrated: boolean;
  hydrate: () => Promise<void>;
  update: (partial: Partial<Settings>) => void;
  reset: () => void;
}

export const useSettingsStore = create<SettingsStore>((set, get) => ({
  ...defaultSettings,
  _hydrated: false,

  hydrate: async () => {
    try {
      const json = await AsyncStorage.getItem(STORAGE_KEY);
      if (json) {
        set({ ...defaultSettings, ...JSON.parse(json), _hydrated: true });
      } else {
        set({ _hydrated: true });
      }
    } catch {
      set({ _hydrated: true });
    }
  },

  update: (partial) => {
    set(partial);
    const state = get();
    const settingsOnly: Settings = {
      soundEnabled: state.soundEnabled,
      vibrationEnabled: state.vibrationEnabled,
      soundType: state.soundType,
      healthIntegration: state.healthIntegration,
      isPro: state.isPro,
      onboardingCompleted: state.onboardingCompleted,
      warmUpEnabled: state.warmUpEnabled,
      coolDownEnabled: state.coolDownEnabled,
      warmUpDuration: state.warmUpDuration,
      coolDownDuration: state.coolDownDuration,
      highContrastMode: state.highContrastMode,
      fastInterval: state.fastInterval,
      slowInterval: state.slowInterval,
      roundCount: state.roundCount,
      reminderEnabled: state.reminderEnabled,
      reminderTime: state.reminderTime,
      dailyStepGoal: state.dailyStepGoal,
      colorThemeId: state.colorThemeId,
      startingPhase: state.startingPhase,
    };
    AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(settingsOnly));
    import('../services/syncService').then(m => m.pushSettings().catch(() => {}));
  },

  reset: () => {
    set(defaultSettings);
    AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(defaultSettings));
  },
}));
