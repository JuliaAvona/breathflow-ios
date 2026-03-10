import React, { useEffect, useRef, useState, useCallback, useMemo } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  Animated,
  Alert,
  PanResponder,
  Dimensions,
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
import type { BreathingSession, TimerPhase, PowerBreathingPhase, KapalabhatiPhase } from '../src/types';

const { width: SCREEN_WIDTH } = Dimensions.get('window');

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

// ─── Breathing Circle ────────────────────────────────────────────────────────

const CIRCLE_SIZE = scale(220);

function BreathingCircle({
  phase,
  mode,
  color,
  phaseDuration,
}: {
  phase: TimerPhase | PowerBreathingPhase | KapalabhatiPhase;
  mode: string;
  color: string;
  phaseDuration?: number;
}) {
  const scaleAnim = useRef(new Animated.Value(1)).current;

  useEffect(() => {
    scaleAnim.stopAnimation();

    if (phase === 'PAUSED' || phase === 'DONE' || phase === 'READY') {
      Animated.timing(scaleAnim, { toValue: 1, duration: 300, useNativeDriver: true }).start();
      return;
    }

    if (mode === 'standard') {
      const dur = (phaseDuration ?? 3) * 1000;
      if (phase === 'INHALE') {
        Animated.timing(scaleAnim, { toValue: 1.35, duration: dur, useNativeDriver: true }).start();
      } else if (phase === 'HOLD_IN') {
        scaleAnim.setValue(1.35);
      } else if (phase === 'EXHALE') {
        Animated.timing(scaleAnim, { toValue: 1.0, duration: dur, useNativeDriver: true }).start();
      } else if (phase === 'HOLD_OUT') {
        scaleAnim.setValue(1.0);
      }
    } else if (mode === 'power') {
      if (phase === 'BREATHING') {
        const pulse = Animated.loop(
          Animated.sequence([
            Animated.timing(scaleAnim, { toValue: 1.25, duration: 400, useNativeDriver: true }),
            Animated.timing(scaleAnim, { toValue: 1.0, duration: 400, useNativeDriver: true }),
          ]),
        );
        pulse.start();
        return () => pulse.stop();
      } else if (phase === 'RETENTION') {
        Animated.timing(scaleAnim, { toValue: 0.85, duration: 800, useNativeDriver: true }).start();
      } else if (phase === 'RECOVERY') {
        Animated.timing(scaleAnim, { toValue: 1.3, duration: 1500, useNativeDriver: true }).start();
      }
    } else if (mode === 'kapalabhati') {
      if (phase === 'RAPID_SET') {
        const pulse = Animated.loop(
          Animated.sequence([
            Animated.timing(scaleAnim, { toValue: 1.15, duration: 250, useNativeDriver: true }),
            Animated.timing(scaleAnim, { toValue: 1.0, duration: 250, useNativeDriver: true }),
          ]),
        );
        pulse.start();
        return () => pulse.stop();
      } else if (phase === 'REST') {
        Animated.timing(scaleAnim, { toValue: 1.0, duration: 500, useNativeDriver: true }).start();
      }
    }
  }, [phase, mode, phaseDuration, scaleAnim]);

  return (
    <Animated.View
      style={[
        styles.circle,
        {
          backgroundColor: color,
          transform: [{ scale: scaleAnim }],
        },
      ]}
    />
  );
}

// ─── Session Screen ─────────────────────────────────────────────────────────

export default function SessionScreen() {
  const { t } = useTranslation();
  const theme = useThemeColors();
  const insets = useSafeAreaInsets();
  const { techniqueId } = useLocalSearchParams<{ techniqueId: string }>();

  const timerStore = useTimerStore();
  const settingsStore = useSettingsStore();
  const addSession = useSessionsStore((s) => s.addSession);

  const technique = useMemo(() => {
    if (!techniqueId) return undefined;
    const custom = settingsStore.customTechniques?.find((ct) => ct.id === techniqueId);
    return custom ?? getTechniqueById(techniqueId);
  }, [techniqueId, settingsStore.customTechniques]);

  const overrides = useMemo(() => {
    if (!techniqueId) return undefined;
    return settingsStore.techniqueOverrides?.[techniqueId];
  }, [techniqueId, settingsStore.techniqueOverrides]);

  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
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
      timerStore.startSession(technique, overrides);
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
    if (!hapticsEnabled) return;
    if (currentPhaseVal === 'INHALE' || currentPhaseVal === 'EXHALE') {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    }
  }, [timerStore.phase, timerStore.powerPhase, timerStore.kapalabhatiPhase, timerStore.mode, hapticsEnabled]);

  // Tick
  useEffect(() => {
    const tickInterval = timerStore.mode === 'standard' ? 1000 : 500;
    if (timerStore.isRunning) {
      intervalRef.current = setInterval(() => {
        useTimerStore.getState().tick();
      }, tickInterval);
    } else {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
        intervalRef.current = null;
      }
    }
    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
        intervalRef.current = null;
      }
    };
  }, [timerStore.isRunning, timerStore.mode]);

  // Handle DONE
  useEffect(() => {
    const isDone =
      (timerStore.mode === 'standard' && timerStore.phase === 'DONE') ||
      (timerStore.mode === 'power' && timerStore.powerPhase === 'DONE') ||
      (timerStore.mode === 'kapalabhati' && timerStore.kapalabhatiPhase === 'DONE');

    if (!isDone || !technique) return;

    const session: BreathingSession = {
      id: `${Date.now()}-${Math.random().toString(36).slice(2, 9)}`,
      userId: '',
      date: new Date().toISOString().split('T')[0],
      startedAt: timerStore.startedAt ?? new Date().toISOString(),
      completedAt: new Date().toISOString(),
      completed: true,
      techniqueId: technique.id,
      cyclesCompleted: timerStore.mode === 'standard' ? timerStore.currentCycle : 0,
      totalDuration: timerStore.totalElapsed,
      roundsCompleted: timerStore.mode === 'power' ? timerStore.currentRound : undefined,
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

    addSession(session);
    timerStore.reset();
    router.replace({ pathname: '/summary', params: { sessionId: session.id } });
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

  const handleStop = useCallback(() => {
    Alert.alert(t('session.stopTitle'), t('session.stopMessage'), [
      { text: t('session.cancel'), style: 'cancel' },
      {
        text: t('session.stop'),
        style: 'destructive',
        onPress: () => {
          useTimerStore.getState().stop();
          router.back();
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

  // Phase countdown
  const getPhaseCountdown = (): number | null => {
    if (timerStore.mode === 'standard') return timerStore.phaseTimeRemaining;
    if (timerStore.mode === 'power') {
      if (isRetention) return timerStore.retentionTime;
      if (timerStore.powerPhase === 'RECOVERY') return timerStore.recoveryTimeRemaining;
    }
    if (timerStore.mode === 'kapalabhati') {
      if (timerStore.kapalabhatiPhase === 'RAPID_SET') return timerStore.setTimeRemaining;
      if (timerStore.kapalabhatiPhase === 'REST') return timerStore.restTimeRemaining;
    }
    return null;
  };

  // Total remaining
  const getTotalRemaining = (): number => {
    if (!technique) return 0;
    if (timerStore.mode === 'standard') {
      const cycleDur = technique.phases.reduce((sum, p) => sum + p.duration, 0);
      const totalCycles = timerStore.totalCycles || (technique.defaultDuration ? Math.ceil(technique.defaultDuration / cycleDur) : technique.defaultCycles || 6);
      const totalSec = technique.defaultDuration ?? cycleDur * totalCycles;
      return Math.max(0, totalSec - timerStore.totalElapsed);
    }
    if (timerStore.mode === 'power') {
      const estTotal = (technique.breathCount! * 2 * technique.roundCount! + technique.roundCount! * 90);
      return Math.max(0, estTotal - timerStore.totalElapsed);
    }
    if (timerStore.mode === 'kapalabhati') {
      const estTotal = technique.setCount! * technique.setDuration! + (technique.setCount! - 1) * technique.restDuration!;
      return Math.max(0, estTotal - timerStore.totalElapsed);
    }
    return 0;
  };

  const subInfo = getSubInfo();
  const phaseCountdown = getPhaseCountdown();
  const totalRemaining = getTotalRemaining();

  const currentPhaseDuration = (() => {
    if (timerStore.mode !== 'standard' || !technique) return undefined;
    return technique.phases[timerStore.currentPhaseIndex]?.duration;
  })();

  const showRetentionResult = timerStore.mode === 'power' &&
    (timerStore.powerPhase === 'RECOVERY' || (timerStore.powerPhase === 'PAUSED' && timerStore.recoveryTimeRemaining > 0)) &&
    timerStore.retentionTimes.length > 0;

  // Gradient colors derived from technique
  const gradientColors: [string, string, string] = isRetention
    ? [COLORS.retention, COLORS.retention, COLORS.retention]
    : [techniqueColor, techniqueColor + 'AA', theme.background];

  // Show countdown overlay
  if (countdown !== null && countdown > 0) {
    return (
      <LinearGradient
        colors={[techniqueColor, techniqueColor + 'AA', theme.background]}
        start={{ x: 0.5, y: 0 }}
        end={{ x: 0.5, y: 1 }}
        style={[styles.container, { paddingTop: insets.top }]}
      >
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
      </LinearGradient>
    );
  }

  return (
    <LinearGradient
      colors={gradientColors}
      start={{ x: 0.5, y: 0 }}
      end={{ x: 0.5, y: 1 }}
      style={[styles.container, { paddingTop: insets.top + 8, paddingBottom: insets.bottom + 16 }]}
    >
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

        <View style={styles.timerPill}>
          <Text style={styles.timerPillText}>
            {formatTime(totalRemaining)}
          </Text>
        </View>
      </View>

      {/* ── Center content: circle + phase label ── */}
      <View
        style={styles.centerContent}
        {...(isRetention ? panResponder.panHandlers : {})}
      >
        {/* Circle with countdown inside */}
        <View style={styles.circleArea}>
          <BreathingCircle
            phase={currentPhase as TimerPhase}
            mode={timerStore.mode}
            color="rgba(255,255,255,0.2)"
            phaseDuration={currentPhaseDuration}
          />

          {phaseCountdown !== null && (
            <View style={styles.circleOverlay}>
              <Text style={styles.circleCountdown}>
                {Math.ceil(phaseCountdown)}
              </Text>
            </View>
          )}
        </View>

        {/* Phase label below circle */}
        <Text style={styles.phaseText}>
          {phaseLabel}
        </Text>

        {/* Sub info */}
        {subInfo && (
          <Text style={styles.subInfo}>
            {subInfo}
          </Text>
        )}

        {/* Retention result */}
        {showRetentionResult && (
          <View style={styles.resultCard}>
            <Text style={styles.resultLabel}>
              {t('summary.round', { number: timerStore.retentionTimes.length })}
            </Text>
            <Text style={styles.resultValue}>
              {formatTime(timerStore.retentionTimes[timerStore.retentionTimes.length - 1])}
            </Text>
          </View>
        )}

        {/* Swipe hint for retention */}
        {isRetention && (
          <View style={styles.swipeHint}>
            <Ionicons name="arrow-up" size={14} color="rgba(255,255,255,0.7)" />
            <Text style={styles.swipeHintText}>
              {t('session.swipeToExhale')}
            </Text>
          </View>
        )}
      </View>

      {/* ── Bottom controls ── */}
      <View style={styles.controlsRow}>
        {timerStore.isRunning ? (
          <TouchableOpacity
            style={styles.controlBtn}
            onPress={() => useTimerStore.getState().pause()}
            activeOpacity={0.8}
          >
            <Ionicons name="pause" size={28} color="#FFFFFF" />
          </TouchableOpacity>
        ) : currentPhase === 'PAUSED' ? (
          <TouchableOpacity
            style={[styles.controlBtn, styles.controlBtnActive]}
            onPress={() => useTimerStore.getState().resume()}
            activeOpacity={0.8}
          >
            <Ionicons name="play" size={28} color="#FFFFFF" />
          </TouchableOpacity>
        ) : null}
      </View>
    </LinearGradient>
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
  circleCountdown: {
    fontSize: scale(64),
    fontFamily: FONTS.heavy,
    color: '#FFFFFF',
    fontVariant: ['tabular-nums'],
    letterSpacing: -2,
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
    marginTop: 16,
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

  // Swipe hint
  swipeHint: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginTop: 16,
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: BORDER_RADIUS.full,
    backgroundColor: 'rgba(255,255,255,0.12)',
  },
  swipeHintText: {
    fontSize: 13,
    fontFamily: FONTS.medium,
    color: 'rgba(255,255,255,0.7)',
  },

  // Controls
  controlsRow: {
    alignItems: 'center',
    paddingBottom: 8,
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
