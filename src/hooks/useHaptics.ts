import { useCallback } from 'react';
import * as Haptics from 'expo-haptics';
import { useSettingsStore } from '../store';

/**
 * Lightweight haptic feedback hook that respects the hapticsEnabled setting.
 * Use this for UI interactions (taps, toggles, navigation) — NOT for timer feedback
 * (useIntervalFeedback handles that with sound+haptic combos).
 */
export function useHaptics() {
  const hapticsEnabled = useSettingsStore((s) => s.hapticsEnabled);

  const light = useCallback(() => {
    if (hapticsEnabled) {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    }
  }, [hapticsEnabled]);

  const medium = useCallback(() => {
    if (hapticsEnabled) {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    }
  }, [hapticsEnabled]);

  const heavy = useCallback(() => {
    if (hapticsEnabled) {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Heavy);
    }
  }, [hapticsEnabled]);

  const selection = useCallback(() => {
    if (hapticsEnabled) {
      Haptics.selectionAsync();
    }
  }, [hapticsEnabled]);

  const success = useCallback(() => {
    if (hapticsEnabled) {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    }
  }, [hapticsEnabled]);

  const warning = useCallback(() => {
    if (hapticsEnabled) {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning);
    }
  }, [hapticsEnabled]);

  const error = useCallback(() => {
    if (hapticsEnabled) {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
    }
  }, [hapticsEnabled]);

  return { light, medium, heavy, selection, success, warning, error };
}
