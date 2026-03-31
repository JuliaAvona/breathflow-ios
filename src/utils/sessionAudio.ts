/**
 * Session audio service using expo-audio.
 *
 * NOTE: expo-audio's `createAudioPlayer` is only available inside React components.
 * We use a dynamic import approach: lazily resolve the module at call-time so the
 * native module is already initialised by the time we need it.
 */

// ─── Sound asset sources ────────────────────────────────────────────────────

const SOUNDS = {
  // tone style
  beep:       require('../../assets/beep.mp3'),
  woodDry:    require('../../assets/percussion-hit-dry-wood.wav'),
  // bell style
  chime:      require('../../assets/chime.mp3'),
  woodRim:    require('../../assets/percussion-hit-wood-rim.wav'),
  // nature style
  chant:      require('../../assets/breath-chant-vocal-smooth.wav'),
  // bowl style
  cowbell:    require('../../assets/japan-cowbell_120bpm_A_minor.wav'),
  // voice
  voiceStart:    require('../../assets/ready-british-girl-voice.wav'),
  voiceSwitch:   require('../../assets/percussion-hit-wood-rim.wav'),
  voiceComplete: require('../../assets/chime.mp3'),
  countdown3:    require('../../assets/three-british-girl-voice.wav'),
  countdown2:    require('../../assets/two-british-girl-voice.wav'),
  countdown1:    require('../../assets/one-british-girl-voice.wav'),
};

const STYLE_MAP: Record<string, { transition: keyof typeof SOUNDS; complete: keyof typeof SOUNDS }> = {
  tone:   { transition: 'beep',    complete: 'chime'   },
  nature: { transition: 'chant',   complete: 'chime'   },
  voice:  { transition: 'woodRim', complete: 'chime' },
  off:    { transition: 'beep',    complete: 'chime'   }, // soundEnabled=false handles mute
};

// ─── Lazy module access ─────────────────────────────────────────────────────

// We cannot call `createAudioPlayer` at module level because the native module
// may not be ready. Instead we resolve it lazily on first use.
let _createAudioPlayer: typeof import('expo-audio').createAudioPlayer | null = null;

function getCreateAudioPlayer() {
  if (!_createAudioPlayer) {
    // eslint-disable-next-line @typescript-eslint/no-var-requires
    const mod = require('expo-audio');
    _createAudioPlayer = mod.createAudioPlayer;
  }
  return _createAudioPlayer!;
}

// ─── Player pool ────────────────────────────────────────────────────────────

type AudioPlayer = ReturnType<typeof import('expo-audio').createAudioPlayer>;
let activePlayers: AudioPlayer[] = [];

function cleanupPlayers() {
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

function playSound(source: keyof typeof SOUNDS, volume = 0.7): void {
  try {
    cleanupPlayers();
    const create = getCreateAudioPlayer();
    const player = create(SOUNDS[source]);
    player.volume = volume;
    player.play();
    activePlayers.push(player);
  } catch (e) {
    console.warn('[SessionAudio] failed to play:', source, e);
  }
}

// ─── Public API ─────────────────────────────────────────────────────────────

export function playPhaseTransition(soundStyle: string = 'tone'): void {
  const style = STYLE_MAP[soundStyle] ?? STYLE_MAP.tone;
  playSound(style.transition, 0.5);
}

export function playSessionComplete(soundStyle: string = 'tone'): void {
  const style = STYLE_MAP[soundStyle] ?? STYLE_MAP.tone;
  playSound(style.complete, 0.8);
}

export function playCountdownTick(count?: number, lang?: string): void {
  const isEn = !lang || lang.startsWith('en');
  if (isEn && count != null && count >= 1 && count <= 3) {
    if (count === 3) playSound('countdown3', 0.8);
    else if (count === 2) playSound('countdown2', 0.8);
    else if (count === 1) playSound('countdown1', 0.8);
  } else {
    playSound('woodDry', 0.7);
  }
}

export function playVoicePhase(): void {
  playSound('voiceSwitch', 0.8);
}

export function playVoiceStart(): void {
  playSound('voiceStart', 0.8);
}

export function playVoiceComplete(): void {
  playSound('voiceComplete', 0.8);
}

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
