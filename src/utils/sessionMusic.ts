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
  { id: 'ambient_day',       name: 'Ambient Day',       source: require('../../assets/music_ambient_day.mp3') },
  { id: 'deep_meditation',   name: 'Deep Meditation',   source: require('../../assets/music_deep_meditation.mp3') },
  { id: 'soft_lullaby',      name: 'Soft Lullaby',      source: require('../../assets/music_soft_lullaby.mp3') },
  { id: 'in_the_moment',     name: 'In The Moment',     source: require('../../assets/music_in_the_moment.mp3') },
  { id: 'cathedral',         name: 'Cathedral',         source: require('../../assets/music_cathedral.mp3') },
  { id: 'serenity',          name: 'Serenity',          source: require('../../assets/music_serenity.mp3') },
  { id: 'mellow_thoughts',   name: 'Mellow Thoughts',   source: require('../../assets/music_mellow_thoughts.mp3') },
  { id: 'abstract_aprils',   name: 'Abstract Aprils',   source: require('../../assets/music_abstract_aprils.mp3') },
  { id: 'delicate_texture',  name: 'Delicate Texture',  source: require('../../assets/music_delicate_texture.mp3') },
  { id: 'horizon',           name: 'Horizon',           source: require('../../assets/music_horizon.mp3') },
  { id: 'relaxing',          name: 'Relaxing',          source: require('../../assets/music_relaxing.mp3') },
  { id: 'birds',             name: 'Birds',             source: require('../../assets/birds.mp3') },
  { id: 'ocean',             name: 'Ocean',             source: require('../../assets/ocean.mp3') },
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
