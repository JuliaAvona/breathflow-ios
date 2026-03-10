import { createAudioPlayer, AudioPlayer } from 'expo-audio';

/**
 * Session audio service.
 * Plays cue sounds on phase transitions during breathing sessions.
 *
 * Sound styles map to different audio files:
 * - tone: beep.mp3 (default)
 * - bell: chime.mp3
 * - nature: chime.mp3 (reuse until proper nature sounds added)
 * - bowl: complete.mp3 (tibetan bowl-like)
 *
 * Voice guidance uses voice_*.mp3 assets.
 */

// ─── Sound asset sources ────────────────────────────────────────────────────

const SOUNDS = {
  beep: require('../../assets/beep.mp3'),
  chime: require('../../assets/chime.mp3'),
  complete: require('../../assets/complete.mp3'),
  voiceStart: require('../../assets/voice_start.mp3'),
  voiceSwitch: require('../../assets/voice_switch.mp3'),
  voiceBeep: require('../../assets/voice_beep.mp3'),
  voiceComplete: require('../../assets/voice_complete.mp3'),
};

// Map sound styles to phase transition sounds
const STYLE_MAP: Record<string, { transition: keyof typeof SOUNDS; complete: keyof typeof SOUNDS }> = {
  tone: { transition: 'beep', complete: 'complete' },
  bell: { transition: 'chime', complete: 'complete' },
  nature: { transition: 'chime', complete: 'complete' },
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
 * Play countdown tick (3-2-1 before session).
 */
export function playCountdownTick(): void {
  playSound('beep', 0.3);
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
