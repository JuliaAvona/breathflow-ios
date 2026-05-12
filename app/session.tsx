import React, { useEffect, useRef, useState, useCallback, useMemo } from 'react';
import { useKeepAwake } from 'expo-keep-awake';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  Animated,
  Alert,
  PanResponder,
  ImageBackground,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import { router, useLocalSearchParams } from 'expo-router';
import { useTranslation } from 'react-i18next';
import { Ionicons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import { useTimerStore, useSettingsStore, useSessionsStore } from '../src/store';
import { useThemeColors } from '../src/hooks/useColorScheme';
import { getTechniqueById } from '../src/constants/techniques';
import { COLORS, SPACING, BORDER_RADIUS, FONTS, scale } from '../src/constants';
import { getToday } from '../src/utils/time';
import { playPhaseTransition, playSessionComplete, playCountdownTick, releaseAllSessionAudio } from '../src/utils/sessionAudio';
import { startBackgroundAudio, stopBackgroundAudio } from '../src/utils/backgroundAudio';
import { startMusic, stopMusic, pauseMusic, resumeMusic, isMusicPlaying } from '../src/utils/sessionMusic';
import { logSessionCompleted } from '../src/utils/facebookEvents';
import { BreathingMandala } from '../src/components/BreathingMandala';
import { PulseRings } from '../src/components/PulseRings';
import type { BreathingSession, TimerPhase, PowerBreathingPhase, KapalabhatiPhase, BreathingShape as ShapeType } from '../src/types';

import type { TechniqueCategory } from '../src/types';

const CIRCLE_SIZE = scale(300);

const TECHNIQUE_BG_IMAGES: Record<string, ReturnType<typeof require>> = {
  box:            require('../assets/bg_box.webp'),
  fourSevenEight: require('../assets/bg_478.webp'),
  physioSigh:     require('../assets/bg_physio_sigh.webp'),
  coherence:      require('../assets/bg_coherence.webp'),
  triangle:       require('../assets/bg_triangle.webp'),
  power:          require('../assets/bg_power.webp'),
  fourFourSixTwo: require('../assets/bg_four_four_six_two.webp'),
  kapalabhati:    require('../assets/bg_kapalabhati.webp'),
  twoToOne:       require('../assets/bg_two_to_one.webp'),
  cyclicSigh:     require('../assets/bg_cyclic_sigh.webp'),
};

const BG_IMAGES: Record<TechniqueCategory, ReturnType<typeof require>> = {
  calm:   require('../assets/bg_calm.webp'),
  sleep:  require('../assets/bg_sleep.webp'),
  focus:  require('../assets/bg_focus.webp'),
  energy: require('../assets/bg_energy.webp'),
};

// ─── Helpers ────────────────────────────────────────────────────────────────

function formatTime(seconds: number): string {
  const m = Math.floor(seconds / 60);
  const s = seconds % 60;
  return `${m}:${s.toString().padStart(2, '0')}`;
}

function getPhaseLabel(phase: TimerPhase | PowerBreathingPhase | KapalabhatiPhase): string {
  switch (phase) {
    case 'INHALE': return 'session.breatheIn';
    case 'HOLD_IN': return 'session.hold';
    case 'EXHALE': return 'session.breatheOut';
    case 'HOLD_OUT': return 'session.holdOut';
    case 'BREATHING': return 'session.breatheRapidly';
    case 'RETENTION': return 'session.holdYourBreath';
    case 'RECOVERY': return 'session.recoveryBreath';
    case 'RAPID_SET': return 'session.rapidBreathing';
    case 'REST': return 'session.rest';
    case 'PAUSED': return 'session.paused';
    case 'DONE': return 'session.done';
    default: return 'session.getReady';
  }
}

// ─── Shape Switcher ─────────────────────────────────────────────────────────

function BreathingShape({
  phase,
  mode,
  color,
  phaseDuration,
}: {
  shape?: ShapeType;
  phase: TimerPhase | PowerBreathingPhase | KapalabhatiPhase;
  mode: string;
  color: string;
  phaseDuration?: number;
}) {
  if (mode === 'power' || mode === 'kapalabhati') {
    return <PulseRings phase={phase} color={color} size={CIRCLE_SIZE} />;
  }
  return <BreathingMandala phase={phase} mode={mode} color={color} size={CIRCLE_SIZE} phaseDuration={phaseDuration} />;
}

// ─── Session Screen ─────────────────────────────────────────────────────────

export default function SessionScreen() {
  useKeepAwake();
  const { t, i18n } = useTranslation();
  const theme = useThemeColors();
  const insets = useSafeAreaInsets();
  const { techniqueId, duration: durationParam, rounds: roundsParam, sets: setsParam, musicId, fromOnboarding } = useLocalSearchParams<{ techniqueId: string; duration?: string; rounds?: string; sets?: string; musicId?: string; fromOnboarding?: string }>();
  const [musicOn, setMusicOn] = useState(!!musicId);
  const [soundOn, setSoundOn] = useState(true);

  // Parse the optional duration param passed by the quick-start hero (in seconds).
  // Falls back to undefined when not provided, preserving the technique's default behaviour.
  const requestedDuration = durationParam ? parseInt(durationParam, 10) : undefined;

  const timerStore = useTimerStore();
  const settingsStore = useSettingsStore();
  const addSession = useSessionsStore((s) => s.addSession);

  const technique = useMemo(() => {
    if (!techniqueId) return undefined;
    return getTechniqueById(techniqueId);
  }, [techniqueId]);

  const overrides = useMemo(() => {
    if (!techniqueId) return undefined;
    return settingsStore.techniqueOverrides?.[techniqueId];
  }, [techniqueId, settingsStore.techniqueOverrides]);

  // Compute the technique to actually pass to startSession, incorporating the
  // optional `duration` navigation param from the quick-start hero.
  // For duration-based techniques (defaultCycles === 0) we override defaultDuration.
  // For cycle-based techniques we compute a cycle count from the requested duration.
  // When no duration param is present nothing changes — both paths are no-ops.
  const effectiveTechnique = useMemo(() => {
    if (!technique || !requestedDuration || requestedDuration <= 0) return technique;
    if (technique.mode !== 'standard') return technique;

    if (technique.defaultCycles === 0) {
      // Duration-based (e.g. coherence): replace defaultDuration with the user selection
      return { ...technique, defaultDuration: requestedDuration };
    }

    // Cycle-based: technique object is unchanged; cycle count is derived below
    return technique;
  }, [technique, requestedDuration]);

  // For cycle-based standard techniques, derive a cycle override from the requested duration.
  const durationDerivedCycles = useMemo(() => {
    if (!technique || !requestedDuration || requestedDuration <= 0) return undefined;
    if (technique.mode !== 'standard' || technique.defaultCycles === 0) return undefined;
    const cycleDur = technique.phases.reduce((sum, p) => sum + p.duration, 0);
    if (cycleDur <= 0) return undefined;
    return Math.max(1, Math.round(requestedDuration / cycleDur));
  }, [technique, requestedDuration]);

  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const hapticIntervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const [countdown, setCountdown] = useState<number | null>(3);
  const countdownScale = useRef(new Animated.Value(1)).current;
  const countdownOpacity = useRef(new Animated.Value(1)).current;
  const hapticsEnabled = settingsStore.hapticsEnabled;

  const techniqueColor = technique?.color ?? '#4A90D9';

  // 3-2-1 countdown
  useEffect(() => {
    if (!technique || countdown === null) return;
    if (countdown <= 0) {
      setCountdown(null);
      timerStore.startSession(
        effectiveTechnique ?? technique,
        {
          ...overrides,
          // For cycle-based techniques pass the cycles derived from the requested duration.
          cycles: durationDerivedCycles ?? overrides?.cycles,
          // Force exact duration stop so timer always matches selected time
          maxDuration: requestedDuration,
          // Power Breathing: override rounds from picker
          ...(roundsParam ? { rounds: parseInt(roundsParam, 10) } : {}),
          // Kapalabhati: override sets (passed as rounds to startSession)
          ...(setsParam ? { rounds: parseInt(setsParam, 10) } : {}),
        },
      );
      startBackgroundAudio();
      if (musicId) {
        startMusic(musicId);
      }
      if (soundOn && settingsStore.soundStyle !== 'off') {
        // no voice start for bamboo/tone/nature styles
      }
      return;
    }

    countdownScale.setValue(1);
    countdownOpacity.setValue(1);
    Animated.parallel([
      Animated.timing(countdownScale, { toValue: 1.5, duration: 800, useNativeDriver: true }),
      Animated.sequence([
        Animated.delay(600),
        Animated.timing(countdownOpacity, { toValue: 0, duration: 200, useNativeDriver: true }),
      ]),
    ]).start();

    if (hapticsEnabled) {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    }
    if (soundOn) {
      playCountdownTick(countdown, i18n.language);
    }

    const timer = setTimeout(() => setCountdown(countdown - 1), 1000);
    return () => clearTimeout(timer);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [technique, countdown]);

  // Haptic on inhale/exhale
  const prevPhaseRef = useRef<string | null>(null);
  useEffect(() => {
    const currentPhaseVal = timerStore.mode === 'standard'
      ? timerStore.phase
      : timerStore.mode === 'power'
        ? timerStore.powerPhase
        : timerStore.kapalabhatiPhase;

    if (prevPhaseRef.current === currentPhaseVal) return;
    prevPhaseRef.current = currentPhaseVal;

    // Sound on phase transitions (skip Hold phases)
    const isHold = currentPhaseVal === 'HOLD_IN' || currentPhaseVal === 'HOLD_OUT';
    if (soundOn && settingsStore.soundStyle !== 'off' && !isHold && currentPhaseVal !== 'READY' && currentPhaseVal !== 'DONE' && currentPhaseVal !== 'PAUSED') {
      playPhaseTransition(settingsStore.soundStyle);
    }

    if (hapticIntervalRef.current) {
      clearInterval(hapticIntervalRef.current);
      hapticIntervalRef.current = null;
    }
    if (!hapticsEnabled) return;
    if (currentPhaseVal === 'INHALE' || currentPhaseVal === 'EXHALE') {
      // Standard: rhythmic vibration during breathe in/out
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Heavy);
      if (hapticIntervalRef.current) { clearInterval(hapticIntervalRef.current); hapticIntervalRef.current = null; }
      hapticIntervalRef.current = setInterval(() => {
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
      }, 300);
    } else if (currentPhaseVal === 'BREATHING' || currentPhaseVal === 'RAPID_SET') {
      // Power/Kapalabhati: light pulse during rapid breathing
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
      if (hapticIntervalRef.current) { clearInterval(hapticIntervalRef.current); hapticIntervalRef.current = null; }
      hapticIntervalRef.current = setInterval(() => {
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
      }, 500);
    } else if (currentPhaseVal === 'RETENTION') {
      // Retention: single heavy vibration at start, then nothing (silence = focus)
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Heavy);
    } else if (currentPhaseVal === 'RECOVERY' || currentPhaseVal === 'REST') {
      // Recovery/Rest: gentle slow pulse
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
      if (hapticIntervalRef.current) { clearInterval(hapticIntervalRef.current); hapticIntervalRef.current = null; }
      hapticIntervalRef.current = setInterval(() => {
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
      }, 1000);
    }
  }, [timerStore.phase, timerStore.powerPhase, timerStore.kapalabhatiPhase, timerStore.mode, hapticsEnabled, soundOn, settingsStore.soundStyle]);

  // Stop background audio + music on unmount
  useEffect(() => {
    return () => {
      stopBackgroundAudio();
      stopMusic();
      if (hapticIntervalRef.current) {
        clearInterval(hapticIntervalRef.current);
        hapticIntervalRef.current = null;
      }
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
        intervalRef.current = null;
      }
    };
  }, []);

  // Tick — stable interval, checks isRunning inside
  useEffect(() => {
    if (intervalRef.current) {
      clearInterval(intervalRef.current);
      intervalRef.current = null;
    }
    intervalRef.current = setInterval(() => {
      const state = useTimerStore.getState();
      if (state.isRunning) {
        state.tick();
      }
    }, 1000);
    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
        intervalRef.current = null;
      }
    };
  }, []);

  // Handle DONE
  useEffect(() => {
    const isDone =
      (timerStore.mode === 'standard' && timerStore.phase === 'DONE') ||
      (timerStore.mode === 'power' && timerStore.powerPhase === 'DONE') ||
      (timerStore.mode === 'kapalabhati' && timerStore.kapalabhatiPhase === 'DONE');

    if (!isDone || !technique) return;

    // Play completion sound + voice
    if (soundOn && settingsStore.soundStyle !== 'off') {
      playSessionComplete(settingsStore.soundStyle);
    }

    const session: BreathingSession = {
      id: `${Date.now()}-${Math.random().toString(36).slice(2, 9)}`,
      userId: '',
      date: getToday(),
      startedAt: timerStore.startedAt ?? new Date().toISOString(),
      completedAt: new Date().toISOString(),
      completed: true,
      techniqueId: technique.id,
      cyclesCompleted: timerStore.mode === 'standard' ? timerStore.currentCycle
        : timerStore.mode === 'kapalabhati' ? timerStore.currentSet : 0,
      totalDuration: timerStore.maxDuration > 0 ? timerStore.maxDuration : timerStore.totalElapsed,
      roundsCompleted: timerStore.mode === 'power' ? timerStore.currentRound
        : timerStore.mode === 'kapalabhati' ? timerStore.currentSet : undefined,
      retentionTimes: timerStore.mode === 'power' ? timerStore.retentionTimes : undefined,
      bestRetention:
        timerStore.mode === 'power' && timerStore.retentionTimes.length > 0
          ? Math.max(...timerStore.retentionTimes)
          : undefined,
      avgRetention:
        timerStore.mode === 'power' && timerStore.retentionTimes.length > 0
          ? Math.round(timerStore.retentionTimes.reduce((a, b) => a + b, 0) / timerStore.retentionTimes.length)
          : undefined,
      breathsPerRound: timerStore.mode === 'power' ? timerStore.targetBreaths : undefined,
    };

    stopBackgroundAudio();
    stopMusic();
    addSession(session);
    logSessionCompleted(session.techniqueId, session.totalDuration);
    timerStore.reset();
    router.replace({ pathname: '/summary', params: { sessionId: session.id, fromOnboarding: fromOnboarding ?? '', _dur: durationParam ?? '', _music: musicId ?? '' } });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [timerStore.phase, timerStore.powerPhase, timerStore.kapalabhatiPhase]);

  // Swipe-up for retention
  const panResponder = useMemo(
    () =>
      PanResponder.create({
        onMoveShouldSetPanResponder: (_, gesture) =>
          gesture.dy < -30 && Math.abs(gesture.dx) < Math.abs(gesture.dy),
        onPanResponderRelease: (_, gesture) => {
          if (gesture.dy < -80) useTimerStore.getState().endRetention();
        },
      }),
    [],
  );

  const toggleMusic = useCallback(() => {
    if (musicOn) {
      stopMusic();
      setMusicOn(false);
      setSoundOn(false);
    } else if (musicId) {
      startMusic(musicId);
      setMusicOn(true);
      setSoundOn(true);
    }
  }, [musicOn, musicId]);

  const handleStop = useCallback(() => {
    Alert.alert(t('session.stopTitle'), t('session.stopMessage'), [
      { text: t('session.cancel'), style: 'cancel' },
      {
        text: t('session.stop'),
        style: 'destructive',
        onPress: () => {
          releaseAllSessionAudio();
          stopBackgroundAudio();
          stopMusic();
          useTimerStore.getState().stop();
          if (router.canGoBack()) {
            router.back();
          } else {
            router.replace('/(tabs)');
          }
        },
      },
    ]);
  }, [t]);

  // Derived
  const currentPhase = useMemo(() => {
    if (timerStore.mode === 'standard') return timerStore.phase;
    if (timerStore.mode === 'power') return timerStore.powerPhase;
    return timerStore.kapalabhatiPhase;
  }, [timerStore.mode, timerStore.phase, timerStore.powerPhase, timerStore.kapalabhatiPhase]);

  const isRetention = timerStore.mode === 'power' &&
    (timerStore.powerPhase === 'RETENTION' || (timerStore.powerPhase === 'PAUSED' && timerStore.retentionTime > 0 && timerStore.breathCount >= timerStore.targetBreaths));

  // Guard
  if (!technique) {
    return (
      <View style={[styles.container, { backgroundColor: theme.background, paddingTop: insets.top }]}>
        <View style={styles.centerFull}>
          <Text style={[styles.notFoundText, { color: theme.text }]}>
            {t('session.techniqueNotFound')}
          </Text>
          <TouchableOpacity style={[styles.ghostBtn, { borderColor: theme.border }]} onPress={() => router.back()}>
            <Text style={[styles.ghostBtnText, { color: theme.textSecondary }]}>{t('session.goBack')}</Text>
          </TouchableOpacity>
        </View>
      </View>
    );
  }

  const phaseLabel = t(getPhaseLabel(currentPhase));
  const phaseColor = '#FFFFFF';

  // Fade animation for phase label transitions
  const phaseLabelOpacity = useRef(new Animated.Value(1)).current;
  const prevPhaseLabelRef = useRef(phaseLabel);
  useEffect(() => {
    if (prevPhaseLabelRef.current !== phaseLabel) {
      prevPhaseLabelRef.current = phaseLabel;
      phaseLabelOpacity.setValue(0);
      Animated.timing(phaseLabelOpacity, {
        toValue: 1,
        duration: 300,
        useNativeDriver: true,
      }).start();
    }
  }, [phaseLabel, phaseLabelOpacity]);

  // Sub-info
  const getSubInfo = (): string | null => {
    if (timerStore.mode === 'standard' && timerStore.totalCycles > 0) {
      return t('session.cycleOf', { current: timerStore.currentCycle, total: timerStore.totalCycles });
    }
    if (timerStore.mode === 'power') {
      const { powerPhase } = timerStore;
      if (powerPhase === 'BREATHING' || (powerPhase === 'PAUSED' && timerStore.breathCount < timerStore.targetBreaths)) {
        return `${Math.floor(timerStore.breathCount)} / ${timerStore.targetBreaths}`;
      }
      if (timerStore.totalRounds > 0) {
        return t('session.roundOf', { current: timerStore.currentRound, total: timerStore.totalRounds });
      }
    }
    if (timerStore.mode === 'kapalabhati') {
      const { kapalabhatiPhase } = timerStore;
      if (kapalabhatiPhase === 'RAPID_SET' || (kapalabhatiPhase === 'PAUSED' && timerStore.restTimeRemaining <= 0)) {
        return t('session.setOf', { current: timerStore.currentSet, total: timerStore.totalSets });
      }
    }
    return null;
  };

  // Phase countdown (counts DOWN: 4→3→2→1)
  const getPhaseCountdown = (): number | null => {
    if (timerStore.mode === 'standard') {
      return timerStore.phaseTimeRemaining;
    }
    if (timerStore.mode === 'power') {
      if (isRetention) return timerStore.retentionTime; // retention counts UP
      if (timerStore.powerPhase === 'RECOVERY') {
        return timerStore.recoveryTimeRemaining;
      }
    }
    if (timerStore.mode === 'kapalabhati') {
      if (timerStore.kapalabhatiPhase === 'RAPID_SET') {
        return timerStore.setTimeRemaining;
      }
      if (timerStore.kapalabhatiPhase === 'REST') {
        return timerStore.restTimeRemaining;
      }
    }
    return null;
  };


  // Total remaining (countdown for session duration)
  const getTotalRemaining = (): number => {
    if (!effectiveTechnique) return 0;

    // If maxDuration is set (user selected exact time), always use it
    if (timerStore.maxDuration > 0) {
      return Math.max(0, timerStore.maxDuration - timerStore.totalElapsed);
    }

    if (timerStore.mode === 'standard') {
      const cycleDur = effectiveTechnique.phases.reduce((sum, p) => sum + p.duration, 0);
      const totalCycles =
        timerStore.totalCycles ||
        durationDerivedCycles ||
        (effectiveTechnique.defaultDuration
          ? Math.ceil(effectiveTechnique.defaultDuration / cycleDur)
          : effectiveTechnique.defaultCycles || 6);
      const totalSec = effectiveTechnique.defaultDuration ?? cycleDur * totalCycles;
      return Math.max(0, totalSec - timerStore.totalElapsed);
    }
    if (timerStore.mode === 'power') {
      const rounds = timerStore.totalRounds;
      const breaths = timerStore.targetBreaths;
      const estTotal = (breaths * 2 * rounds + rounds * 90);
      return Math.max(0, estTotal - timerStore.totalElapsed);
    }
    if (timerStore.mode === 'kapalabhati') {
      const sets = timerStore.totalSets;
      const setDur = effectiveTechnique.setDuration ?? 30;
      const restDur = effectiveTechnique.restDuration ?? 30;
      const estTotal = sets * setDur + (sets - 1) * restDur;
      return Math.max(0, estTotal - timerStore.totalElapsed);
    }
    return 0;
  };

  const subInfo = getSubInfo();
  const phaseCountdown = getPhaseCountdown();

  const currentPhaseDuration = (() => {
    if (timerStore.mode !== 'standard' || !technique) return undefined;
    return technique.phases[timerStore.currentPhaseIndex]?.duration;
  })();


  const bgImage = TECHNIQUE_BG_IMAGES[technique.id] ?? BG_IMAGES[technique.category];
  const overlayColor = isRetention ? COLORS.retention : techniqueColor;

  // Show countdown overlay
  if (countdown !== null && countdown > 0) {
    return (
      <ImageBackground source={bgImage} style={[styles.container, { paddingTop: insets.top }]} resizeMode="cover">
        <LinearGradient
          colors={[overlayColor + 'DD', overlayColor + '99', '#00000088']}
          start={{ x: 0.5, y: 0 }}
          end={{ x: 0.5, y: 1 }}
          style={StyleSheet.absoluteFill}
        />
        <View style={styles.countdownContainer}>
          <Text style={[styles.countdownTechnique, { color: 'rgba(255,255,255,0.8)' }]}>
            {t(technique.nameKey)}
          </Text>
          <Animated.Text
            style={[
              styles.countdownText,
              {
                color: '#FFFFFF',
                opacity: countdownOpacity,
                transform: [{ scale: countdownScale }],
              },
            ]}
          >
            {countdown}
          </Animated.Text>
        </View>
      </ImageBackground>
    );
  }

  return (
    <ImageBackground
      source={bgImage}
      style={[styles.container, { paddingTop: insets.top + 8, paddingBottom: insets.bottom + 16 }]}
      resizeMode="cover"
    >
      <LinearGradient
        colors={[overlayColor + 'CC', '#00000099', '#000000BB']}
        start={{ x: 0.5, y: 0 }}
        end={{ x: 0.5, y: 1 }}
        style={StyleSheet.absoluteFill}
      />
      {/* ── Top bar ── */}
      <View style={styles.topBar}>
        <TouchableOpacity
          style={styles.stopBtn}
          onPress={handleStop}
          activeOpacity={0.7}
        >
          <Ionicons name="close" size={22} color="#FFFFFF" />
        </TouchableOpacity>

        <View style={styles.topBarCenter}>
          <Text style={styles.topBarTitle} numberOfLines={1}>
            {t(technique.nameKey)}
          </Text>
        </View>

        {timerStore.mode === 'standard' && (
          <View style={styles.timerPill}>
            <Text style={styles.timerPillText}>
              {formatTime(getTotalRemaining())}
            </Text>
          </View>
        )}
      </View>

      {/* ── Center content: circle + phase label ── */}
      <View
        style={styles.centerContent}
        {...(isRetention ? panResponder.panHandlers : {})}
      >
        {/* Breathing shape */}
        <View style={styles.circleArea}>
          <BreathingShape
            shape={technique?.shape ?? 'circle'}
            phase={currentPhase as TimerPhase}
            mode={timerStore.mode}
            color="rgba(255,255,255,0.2)"
            phaseDuration={currentPhaseDuration}
          />
        </View>

        {/* Countdown + phase label below circle */}
        {phaseCountdown !== null && (
          <Text style={[styles.countdownNumber, { color: phaseColor }]}>
            {Math.ceil(phaseCountdown)}
          </Text>
        )}
        <Animated.Text style={[styles.phaseText, { opacity: phaseLabelOpacity, color: phaseColor }]}>
          {phaseLabel}
        </Animated.Text>

        {/* Sub info */}
        {subInfo && (
          <Text style={styles.subInfo}>
            {subInfo}
          </Text>
        )}


        {/* Exhale button for active retention only */}
        {isRetention && timerStore.isRunning && (
          <TouchableOpacity
            style={styles.exhaleButton}
            onPress={() => useTimerStore.getState().endRetention()}
            activeOpacity={0.8}
          >
            <Text style={styles.exhaleButtonText}>{t('session.exhale')}</Text>
          </TouchableOpacity>
        )}
      </View>

      {/* ── Bottom controls (hidden during active retention only) ── */}
      {!(isRetention && timerStore.isRunning) && <View style={styles.controlsRow}>
        {/* Music toggle (only if music was selected) */}
        {musicId ? (
          <TouchableOpacity
            style={styles.controlBtnSmall}
            onPress={toggleMusic}
            activeOpacity={0.8}
          >
            <Ionicons name={musicOn ? 'musical-notes' : 'musical-notes-outline'} size={22} color={musicOn ? '#FFFFFF' : 'rgba(255,255,255,0.5)'} />
          </TouchableOpacity>
        ) : <View style={styles.controlBtnSmall} />}

        {/* Pause / Resume (hidden during retention — Exhale button replaces it) */}
        {timerStore.isRunning && !isRetention ? (
          <TouchableOpacity
            style={styles.controlBtn}
            onPress={() => { useTimerStore.getState().pause(); if (musicOn) pauseMusic(); }}
            activeOpacity={0.8}
          >
            <Ionicons name="pause" size={28} color="#FFFFFF" />
          </TouchableOpacity>
        ) : currentPhase === 'PAUSED' ? (
          <TouchableOpacity
            style={[styles.controlBtn, styles.controlBtnActive]}
            onPress={() => { useTimerStore.getState().resume(); if (musicOn) resumeMusic(); }}
            activeOpacity={0.8}
          >
            <Ionicons name="play" size={28} color="#FFFFFF" />
          </TouchableOpacity>
        ) : <View style={styles.controlBtn} />}

        {/* Spacer to balance layout */}
        <View style={styles.controlBtnSmall} />
      </View>}
    </ImageBackground>
  );
}

// ─── Styles ─────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },

  // Top bar
  topBar: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 20,
  },
  stopBtn: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: 'rgba(255,255,255,0.2)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  topBarCenter: {
    flex: 1,
    alignItems: 'center',
    paddingHorizontal: 12,
  },
  topBarTitle: {
    fontSize: 17,
    fontFamily: FONTS.bold,
    color: '#FFFFFF',
    letterSpacing: -0.3,
  },
  timerPill: {
    backgroundColor: 'rgba(255,255,255,0.2)',
    borderRadius: BORDER_RADIUS.full,
    paddingHorizontal: 14,
    paddingVertical: 8,
  },
  timerPillText: {
    fontSize: 15,
    fontFamily: FONTS.bold,
    color: '#FFFFFF',
    fontVariant: ['tabular-nums'],
  },

  // Center content — vertically centered
  centerContent: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },

  // Circle area
  circleArea: {
    width: CIRCLE_SIZE * 1.5,
    height: CIRCLE_SIZE * 1.5,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 24,
  },
  circle: {
    width: CIRCLE_SIZE,
    height: CIRCLE_SIZE,
    borderRadius: CIRCLE_SIZE / 2,
  },
  circleOverlay: {
    ...StyleSheet.absoluteFillObject,
    justifyContent: 'center',
    alignItems: 'center',
  },
  countdownNumber: {
    fontSize: scale(56),
    fontFamily: FONTS.heavy,
    fontVariant: ['tabular-nums'],
    letterSpacing: -2,
    marginBottom: 4,
  },

  // Phase text
  phaseText: {
    fontSize: scale(32),
    fontFamily: FONTS.heavy,
    color: '#FFFFFF',
    letterSpacing: -0.8,
    textAlign: 'center',
    marginBottom: 4,
  },
  subInfo: {
    fontSize: 16,
    fontFamily: FONTS.medium,
    color: 'rgba(255,255,255,0.7)',
    letterSpacing: 0.2,
  },

  // Retention result
  resultCard: {
    borderRadius: BORDER_RADIUS.lg,
    backgroundColor: 'rgba(255,255,255,0.15)',
    paddingHorizontal: 24,
    paddingVertical: 14,
    marginTop: 20,
    marginBottom: 20,
    alignItems: 'center',
  },
  resultLabel: {
    fontSize: 12,
    fontFamily: FONTS.medium,
    color: 'rgba(255,255,255,0.6)',
    letterSpacing: 0.3,
    marginBottom: 2,
  },
  resultValue: {
    fontSize: 28,
    fontFamily: FONTS.heavy,
    color: '#FFFFFF',
    fontVariant: ['tabular-nums'],
    letterSpacing: -0.5,
  },

  // Exhale button (retention phase)
  exhaleButton: {
    marginTop: 20,
    marginBottom: 24,
    paddingHorizontal: 40,
    paddingVertical: 16,
    borderRadius: BORDER_RADIUS.full,
    backgroundColor: 'rgba(255,255,255,0.2)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.3)',
  },
  exhaleButtonText: {
    fontSize: 16,
    fontFamily: FONTS.bold,
    color: '#FFFFFF',
    letterSpacing: 0.5,
  },

  // Controls
  controlsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 40,
    paddingBottom: 16,
  },
  controlBtnSmall: {
    width: 44,
    height: 44,
    borderRadius: 22,
    justifyContent: 'center',
    alignItems: 'center',
  },
  controlBtn: {
    width: 64,
    height: 64,
    borderRadius: 32,
    backgroundColor: 'rgba(255,255,255,0.2)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  controlBtnActive: {
    backgroundColor: 'rgba(255,255,255,0.35)',
  },

  // Countdown
  countdownContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  countdownTechnique: {
    fontSize: 18,
    fontFamily: FONTS.bold,
    marginBottom: 16,
  },
  countdownText: {
    fontSize: scale(100),
    fontFamily: FONTS.heavy,
    letterSpacing: -2,
  },

  // Not found
  centerFull: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: SPACING.lg,
  },
  notFoundText: {
    fontSize: 16,
    fontFamily: FONTS.regular,
    textAlign: 'center',
    marginBottom: SPACING.lg,
  },
  ghostBtn: {
    borderWidth: 1,
    borderRadius: BORDER_RADIUS.full,
    paddingHorizontal: 24,
    paddingVertical: 10,
  },
  ghostBtnText: {
    fontSize: 14,
    fontFamily: FONTS.medium,
  },
});
