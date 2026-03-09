import { create } from 'zustand';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { UserProfile } from '../types';

const STORAGE_KEY = '@walkpace_profile';

const defaultProfile: UserProfile = {
  walkingFrequency: 'never',
};

interface ProfileStore extends UserProfile {
  _hydrated: boolean;
  hydrate: () => Promise<void>;
  update: (partial: Partial<UserProfile>) => void;
  reset: () => void;
}

export const useProfileStore = create<ProfileStore>((set, get) => ({
  ...defaultProfile,
  _hydrated: false,

  hydrate: async () => {
    try {
      const json = await AsyncStorage.getItem(STORAGE_KEY);
      if (json) {
        set({ ...defaultProfile, ...JSON.parse(json), _hydrated: true });
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
    const profileOnly: UserProfile = {
      weight: state.weight,
      age: state.age,
      height: state.height,
      walkingFrequency: state.walkingFrequency,
    };
    AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(profileOnly));
    import('../services/syncService').then(m => m.pushProfile().catch(() => {}));
  },

  reset: () => {
    set(defaultProfile);
    AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(defaultProfile));
  },
}));
