import { createAudioPlayer, AudioPlayer } from 'expo-audio';

/**
 * Background audio manager.
 * Plays a silent audio loop to keep the JS thread alive when the app is backgrounded.
 * iOS suspends JavaScript execution unless an audio session is active.
 * Since WalkPace uses UIBackgroundModes: ['audio'], this keeps the timer ticking.
 */

const silenceSource = require('../../assets/silence.wav');

let player: AudioPlayer | null = null;

export function startBackgroundAudio(): void {
  try {
    // Don't recreate if already playing — avoids audio session interruption
    if (player) return;
    player = createAudioPlayer(silenceSource);
    player.loop = true;
    player.volume = 0.01; // Near-silent
    player.play();
  } catch {
    // Audio not available
  }
}

export function stopBackgroundAudio(): void {
  try {
    if (player) {
      player.pause();
      player.release();
      player = null;
    }
  } catch {
    // Ignore cleanup errors
  }
}
