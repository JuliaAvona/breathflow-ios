import { useCallback, useRef } from 'react';
import { createAudioPlayer, AudioPlayer } from 'expo-audio';
import * as Haptics from 'expo-haptics';
import { useSettingsStore } from '../store';
import { TIMER_DEFAULTS } from '../constants';

const SOUNDS = {
  beep: {
    switch: require('../../assets/beep.mp3'),
    complete: require('../../assets/complete.mp3'),
    countdown: require('../../assets/beep.mp3'),
    start: require('../../assets/beep.mp3'),
  },
  chime: {
    switch: require('../../assets/chime.mp3'),
    complete: require('../../assets/complete.mp3'),
    countdown: require('../../assets/chime.mp3'),
    start: require('../../assets/chime.mp3'),
  },
  voice: {
    switch: require('../../assets/voice_switch.mp3'),
    complete: require('../../assets/voice_complete.mp3'),
    countdown: require('../../assets/voice_beep.mp3'),
    start: require('../../assets/voice_start.mp3'),
  },
};

export function useIntervalFeedback() {
  const soundEnabled = useSettingsStore((s) => s.soundEnabled);
  const vibrationEnabled = useSettingsStore((s) => s.vibrationEnabled);
  const soundType = useSettingsStore((s) => s.soundType);
  const playerRef = useRef<AudioPlayer | null>(null);

  const playSound = useCallback(
    async (source: any) => {
      if (!soundEnabled) return;
      try {
        // Release previous feedback player (not the background audio player)
        if (playerRef.current) {
          try { playerRef.current.release(); } catch {}
        }
        const player = createAudioPlayer(source);
        player.volume = 1.0;
        playerRef.current = player;
        player.play();
      } catch {
        // Audio may not be available
      }
    },
    [soundEnabled],
  );

  const getSounds = useCallback(() => SOUNDS[soundType] ?? SOUNDS.beep, [soundType]);

  const playIntervalSwitch = useCallback(async () => {
    if (vibrationEnabled) {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning);
    }
    await playSound(getSounds().switch);
  }, [vibrationEnabled, playSound, getSounds]);

  const playSessionComplete = useCallback(async () => {
    if (vibrationEnabled) {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    }
    await playSound(getSounds().complete);
  }, [vibrationEnabled, playSound, getSounds]);

  const playCountdownBeep = useCallback(async (timeRemaining: number) => {
    // Voice is a spoken word — only announce once at the start of countdown,
    // not every second. Beep/chime play every tick for the rhythmic effect.
    if (soundType === 'voice' && timeRemaining !== TIMER_DEFAULTS.countdownBeepSeconds) return;
    if (vibrationEnabled) {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    }
    await playSound(getSounds().countdown);
  }, [soundType, vibrationEnabled, playSound, getSounds]);

  const playSessionStart = useCallback(async () => {
    if (vibrationEnabled) {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    }
    await playSound(getSounds().start);
  }, [vibrationEnabled, playSound, getSounds]);

  return { playIntervalSwitch, playSessionComplete, playCountdownBeep, playSessionStart };
}
