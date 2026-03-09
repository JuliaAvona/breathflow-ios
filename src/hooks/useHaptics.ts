import { useCallback } from 'react';
import * as Haptics from 'expo-haptics';
import { useSettingsStore } from '../store';

/**
 * Lightweight haptic feedback hook that respects the vibrationEnabled setting.
 * Use this for UI interactions (taps, toggles, navigation) — NOT for timer feedback
 * (useIntervalFeedback handles that with sound+haptic combos).
 */
export function useHaptics() {
  const vibrationEnabled = useSettingsStore((s) => s.vibrationEnabled);

  const light = useCallback(() => {
    if (vibrationEnabled) {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    }
  }, [vibrationEnabled]);

  const medium = useCallback(() => {
    if (vibrationEnabled) {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    }
  }, [vibrationEnabled]);

  const heavy = useCallback(() => {
    if (vibrationEnabled) {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Heavy);
    }
  }, [vibrationEnabled]);

  const selection = useCallback(() => {
    if (vibrationEnabled) {
      Haptics.selectionAsync();
    }
  }, [vibrationEnabled]);

  const success = useCallback(() => {
    if (vibrationEnabled) {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    }
  }, [vibrationEnabled]);

  const warning = useCallback(() => {
    if (vibrationEnabled) {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning);
    }
  }, [vibrationEnabled]);

  const error = useCallback(() => {
    if (vibrationEnabled) {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
    }
  }, [vibrationEnabled]);

  return { light, medium, heavy, selection, success, warning, error };
}
