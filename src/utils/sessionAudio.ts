import { createAudioPlayer, AudioPlayer } from 'expo-audio';

/**
 * Session audio service.
 * Plays cue sounds on phase transitions during breathing sessions.
 *
 * Sound styles map to different audio files:
 * - tone: percussion wood hit (default)
 * - bell: japan cowbell
 * - nature: smooth vocal chant
 * - bowl: complete bowl sound
 *
 * Voice guidance uses british girl voice assets.
 * Countdown uses three/two/one voice files.
 */

// ─── Sound asset sources ────────────────────────────────────────────────────

const SOUNDS = {
  beep: require('../../assets/percussion-hit-dry-wood.wav'),
  chime: require('../../assets/japan-cowbell_120bpm_A_minor.wav'),
  chant: require('../../assets/breath-chant-vocal-smooth.wav'),
  complete: require('../../assets/complete.wav'),
  voiceStart: require('../../assets/ready-british-girl-voice.wav'),
  voiceSwitch: require('../../assets/percussion-hit-wood-rim.wav'),
  voiceBeep: require('../../assets/percussion-hit-rim-3_E_minor.wav'),
  voiceComplete: require('../../assets/complete.wav'),
  countdown3: require('../../assets/three-british-girl-voice.wav'),
  countdown2: require('../../assets/two-british-girl-voice.wav'),
  countdown1: require('../../assets/one-british-girl-voice.wav'),
};

// Map sound styles to phase transition sounds
const STYLE_MAP: Record<string, { transition: keyof typeof SOUNDS; complete: keyof typeof SOUNDS }> = {
  tone: { transition: 'beep', complete: 'complete' },
  bell: { transition: 'chime', complete: 'complete' },
  nature: { transition: 'chant', complete: 'complete' },
  bowl: { transition: 'complete', complete: 'complete' },
};

// ─── Player pool ────────────────────────────────────────────────────────────

let activePlayers: AudioPlayer[] = [];

function cleanupPlayers() {
  // Release finished players
  const keep: AudioPlayer[] = [];
  for (const p of activePlayers) {
    try {
      if (!p.playing) {
        p.release();
      } else {
        keep.push(p);
      }
    } catch {
      // Already released
    }
  }
  activePlayers = keep;
}

async function playSound(source: keyof typeof SOUNDS, volume = 0.7): Promise<void> {
  try {
    cleanupPlayers();
    const player = createAudioPlayer(SOUNDS[source]);
    player.volume = volume;
    player.play();
    activePlayers.push(player);
  } catch {
    // Audio not available (simulator, permissions)
  }
}

// ─── Public API ─────────────────────────────────────────────────────────────

/**
 * Play phase transition sound based on the user's sound style setting.
 */
export function playPhaseTransition(soundStyle: string = 'tone'): void {
  const style = STYLE_MAP[soundStyle] ?? STYLE_MAP.tone;
  playSound(style.transition, 0.5);
}

/**
 * Play session complete sound.
 */
export function playSessionComplete(soundStyle: string = 'tone'): void {
  const style = STYLE_MAP[soundStyle] ?? STYLE_MAP.tone;
  playSound(style.complete, 0.8);
}

/**
 * Play countdown voice (3, 2, or 1 before session).
 */
export function playCountdownTick(count?: number): void {
  if (count === 3) playSound('countdown3', 0.8);
  else if (count === 2) playSound('countdown2', 0.8);
  else if (count === 1) playSound('countdown1', 0.8);
  else playSound('beep', 0.3);
}

/**
 * Play voice cue for phase change.
 */
export function playVoicePhase(): void {
  playSound('voiceSwitch', 0.8);
}

/**
 * Play voice cue for session start.
 */
export function playVoiceStart(): void {
  playSound('voiceStart', 0.8);
}

/**
 * Play voice cue for session complete.
 */
export function playVoiceComplete(): void {
  playSound('voiceComplete', 0.8);
}

/**
 * Release all active players. Call on session end.
 */
export function releaseAllSessionAudio(): void {
  for (const p of activePlayers) {
    try {
      p.pause();
      p.release();
    } catch {
      // Already released
    }
  }
  activePlayers = [];
}
