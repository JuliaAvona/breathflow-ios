/**
 * Background audio manager using expo-audio.
 * Plays a silent audio loop to keep the JS thread alive when backgrounded.
 */

const silenceSource = require('../../assets/silence.wav');

type AudioPlayer = ReturnType<typeof import('expo-audio').createAudioPlayer>;
let player: AudioPlayer | null = null;

function getCreateAudioPlayer() {
  // eslint-disable-next-line @typescript-eslint/no-var-requires
  return require('expo-audio').createAudioPlayer as typeof import('expo-audio').createAudioPlayer;
}

export function startBackgroundAudio(): void {
  try {
    if (player) return;
    const create = getCreateAudioPlayer();
    player = create(silenceSource);
    player.loop = true;
    player.volume = 0.01;
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
