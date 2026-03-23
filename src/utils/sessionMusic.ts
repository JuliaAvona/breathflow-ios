/**
 * Session music player using expo-audio.
 */

// ─── Music tracks ────────────────────────────────────────────────────────────

export interface MusicTrack {
  id: string;
  name: string;
  source: ReturnType<typeof require>;
}

export const MUSIC_TRACKS: MusicTrack[] = [
  { id: 'track_1',  name: 'Morning Mist',     source: require('../../assets/1.aac') },
  { id: 'track_3',  name: 'Still Water',      source: require('../../assets/3.aac') },
  { id: 'track_4',  name: 'Deep Calm',        source: require('../../assets/4.aac') },
  { id: 'track_5',  name: 'Soft Horizon',     source: require('../../assets/5.aac') },
  { id: 'track_7',  name: 'Inner Space',      source: require('../../assets/7.aac') },
  { id: 'track_9',  name: 'Gentle Flow',      source: require('../../assets/9.aac') },
  { id: 'track_10', name: 'Twilight',         source: require('../../assets/10.aac') },
  { id: 'track_11', name: 'Open Sky',         source: require('../../assets/11.aac') },
  { id: 'track_12', name: 'Serenity',         source: require('../../assets/12.aac') },
];

// ─── Player ──────────────────────────────────────────────────────────────────

type AudioPlayer = ReturnType<typeof import('expo-audio').createAudioPlayer>;

let musicPlayer: AudioPlayer | null = null;
let currentTrackId: string | null = null;

function getCreateAudioPlayer() {
  // eslint-disable-next-line @typescript-eslint/no-var-requires
  return require('expo-audio').createAudioPlayer as typeof import('expo-audio').createAudioPlayer;
}

export function startMusic(trackId: string, volume = 0.4, startFromSec = 0): void {
  try {
    const track = MUSIC_TRACKS.find((t) => t.id === trackId);
    if (!track) return;

    if (musicPlayer && currentTrackId === trackId) return;

    stopMusic();
    const create = getCreateAudioPlayer();
    musicPlayer = create(track.source);
    musicPlayer.loop = true;
    musicPlayer.volume = volume;
    if (startFromSec > 0) {
      musicPlayer.seekTo(startFromSec);
    }
    musicPlayer.play();
    currentTrackId = trackId;
  } catch (e) {
    console.warn('[SessionMusic] failed to start:', trackId, e);
  }
}

export function stopMusic(): void {
  try {
    if (musicPlayer) {
      musicPlayer.pause();
      musicPlayer.release();
      musicPlayer = null;
      currentTrackId = null;
    }
  } catch {
    // Ignore
  }
}

export function isMusicPlaying(): boolean {
  return musicPlayer !== null && currentTrackId !== null;
}

export function getCurrentTrackId(): string | null {
  return currentTrackId;
}

export function setMusicVolume(volume: number): void {
  if (musicPlayer) {
    musicPlayer.volume = Math.max(0, Math.min(1, volume));
  }
}
