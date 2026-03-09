import React, { useEffect, useRef, useState, useCallback, useMemo } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  Animated,
  Alert,
  PanResponder,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { router, useLocalSearchParams } from 'expo-router';
import { useTranslation } from 'react-i18next';
import { Ionicons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import { useTimerStore, useSettingsStore, useSessionsStore } from '../src/store';
import { useThemeColors } from '../src/hooks/useColorScheme';
import { getTechniqueById } from '../src/constants/techniques';
import { COLORS, SPACING, BORDER_RADIUS, FONTS, scale } from '../src/constants';
import type { BreathingSession, TimerPhase, PowerBreathingPhase, KapalabhatiPhase } from '../src/types';

// ─── Default circle color (fallback) ─────────────────────────────────────────

const DEFAULT_CIRCLE_COLOR = '#4A90D9';

// ─── Helpers ────────────────────────────────────────────────────────────────

function formatTime(seconds: number): string {
  const m = Math.floor(seconds / 60);
  const s = seconds % 60;
  return `${m}:${s.toString().padStart(2, '0')}`;
}

function formatTimeMin(seconds: number): string {
  const m = Math.floor(seconds / 60);
  const s = seconds % 60;
  return `${m}:${s.toString().padStart(2, '0')} min`;
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

// ─── Breathing Circle (bottom visual) ───────────────────────────────────────

const CIRCLE_SIZE = scale(240);

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
  const circleFade = useRef(new Animated.Value(1)).current;

  // Smooth color transition via fade
  const [displayColor, setDisplayColor] = useState(color);
  const prevColorRef = useRef(color);

  useEffect(() => {
    if (color === prevColorRef.current) return;
    prevColorRef.current = color;

    Animated.timing(circleFade, {
      toValue: 0.3,
      duration: 150,
      useNativeDriver: true,
    }).start(() => {
      setDisplayColor(color);
      Animated.timing(circleFade, {
        toValue: 1,
        duration: 300,
        useNativeDriver: true,
      }).start();
    });
  }, [color, circleFade]);

  useEffect(() => {
    scaleAnim.stopAnimation();

    if (phase === 'PAUSED' || phase === 'DONE' || phase === 'READY') {
      Animated.timing(scaleAnim, {
        toValue: 1,
        duration: 300,
        useNativeDriver: true,
      }).start();
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
    <View style={styles.circleContainer}>
      <Animated.View
        style={[
          styles.circle,
          {
            backgroundColor: displayColor,
            opacity: circleFade,
            transform: [{ scale: scaleAnim }],
          },
        ]}
      />
    </View>
  );
}

// ─── Animated Phase Label ────────────────────────────────────────────────────

function AnimatedPhaseLabel({ text, color }: { text: string; color: string }) {
  const fadeAnim = useRef(new Animated.Value(1)).current;
  const [displayText, setDisplayText] = useState(text);
  const prevText = useRef(text);

  useEffect(() => {
    if (text === prevText.current) return;
    prevText.current = text;

    Animated.timing(fadeAnim, {
      toValue: 0,
      duration: 150,
      useNativeDriver: true,
    }).start(() => {
      setDisplayText(text);
      Animated.timing(fadeAnim, {
        toValue: 1,
        duration: 250,
        useNativeDriver: true,
      }).start();
    });
  }, [text, fadeAnim]);

  return (
    <Animated.Text style={[styles.phaseText, { color, opacity: fadeAnim }]}>
      {displayText}
    </Animated.Text>
  );
}

// ─── Session Screen ─────────────────────────────────────────────────────────

export default function SessionScreen() {
  const { t } = useTranslation();
  const theme = useThemeColors();
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

  // 3-2-1 countdown before session starts
  useEffect(() => {
    if (!technique || countdown === null) return;

    if (countdown <= 0) {
      setCountdown(null);
      timerStore.startSession(technique, overrides);
      return;
    }

    // Animate: scale up + fade out each number
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

  // Haptic feedback on phase transitions (inhale & exhale only)
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

  const phaseColor = technique?.color ?? DEFAULT_CIRCLE_COLOR;
  const isRetention = timerStore.mode === 'power' &&
    (timerStore.powerPhase === 'RETENTION' || (timerStore.powerPhase === 'PAUSED' && timerStore.retentionTime > 0 && timerStore.breathCount >= timerStore.targetBreaths));

  // Guard
  if (!technique) {
    return (
      <SafeAreaView style={[styles.container, { backgroundColor: theme.background }]}>
        <View style={styles.centerFull}>
          <Text style={[styles.notFoundText, { color: theme.text }]}>
            {t('session.techniqueNotFound')}
          </Text>
          <TouchableOpacity style={[styles.ghostBtn, { borderColor: theme.border }]} onPress={() => router.back()}>
            <Text style={[styles.ghostBtnText, { color: theme.textSecondary }]}>{t('session.goBack')}</Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    );
  }

  // ── Phase label (big text) ──
  const phaseLabel = t(getPhaseLabel(currentPhase));

  // ── Sub-info line ──
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

  // ── Phase time (countdown for current phase) ──
  const getPhaseCountdown = (): number | null => {
    if (timerStore.mode === 'standard') {
      return timerStore.phaseTimeRemaining;
    }
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

  // ── Total session remaining ──
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
  const bgColor = isRetention ? COLORS.retention : theme.background;

  // Get current phase duration for circle animation
  const currentPhaseDuration = useMemo(() => {
    if (timerStore.mode !== 'standard' || !technique) return undefined;
    const phaseIndex = timerStore.currentPhaseIndex;
    return technique.phases[phaseIndex]?.duration;
  }, [timerStore.mode, timerStore.currentPhaseIndex, technique]);

  // ── Retention extra: last round result ──
  const showRetentionResult = timerStore.mode === 'power' &&
    (timerStore.powerPhase === 'RECOVERY' || (timerStore.powerPhase === 'PAUSED' && timerStore.recoveryTimeRemaining > 0)) &&
    timerStore.retentionTimes.length > 0;

  // Show countdown overlay
  if (countdown !== null && countdown > 0) {
    return (
      <SafeAreaView style={[styles.container, { backgroundColor: theme.background }]}>
        <View style={styles.countdownContainer}>
          <Animated.Text
            style={[
              styles.countdownText,
              {
                color: theme.primary,
                opacity: countdownOpacity,
                transform: [{ scale: countdownScale }],
              },
            ]}
          >
            {countdown}
          </Animated.Text>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: bgColor }]}>
      {/* ── Top bar: technique name, timer, stop ── */}
      <View style={styles.topBar}>
        <View style={styles.topBarLeft}>
          <Text style={[styles.techniqueName, { color: theme.text }]} numberOfLines={1}>
            {t(technique.nameKey)}
          </Text>
          <Text style={[styles.timerSmall, { color: theme.textSecondary }]}>
            {formatTimeMin(totalRemaining)}
          </Text>
        </View>
        <TouchableOpacity
          style={[styles.stopBtn, { backgroundColor: theme.primary + '18' }]}
          onPress={handleStop}
          activeOpacity={0.7}
        >
          <Ionicons name="stop" size={18} color={theme.primary} />
        </TouchableOpacity>
      </View>

      {/* ── Top half: big phase text ── */}
      <View style={styles.topContent}>
        <AnimatedPhaseLabel text={phaseLabel} color={theme.text} />

        {/* Phase countdown */}
        {phaseCountdown !== null && (
          <Text style={[styles.phaseCountdown, { color: theme.primary }]}>
            {Math.ceil(phaseCountdown)}
          </Text>
        )}

        {/* Sub info */}
        {subInfo && (
          <Text style={[styles.subInfo, { color: theme.textSecondary }]}>
            {subInfo}
          </Text>
        )}

        {/* Retention result card */}
        {showRetentionResult && (
          <View style={[styles.resultCard, { backgroundColor: theme.card, borderColor: theme.border }]}>
            <Text style={[styles.resultLabel, { color: theme.textSecondary }]}>
              {t('summary.round', { number: timerStore.retentionTimes.length })}
            </Text>
            <Text style={[styles.resultValue, { color: theme.text }]}>
              {formatTime(timerStore.retentionTimes[timerStore.retentionTimes.length - 1])}
            </Text>
          </View>
        )}

        {/* Swipe hint for retention */}
        {isRetention && (
          <View style={[styles.swipeHint, { backgroundColor: theme.text + '08' }]}>
            <Ionicons name="arrow-up" size={14} color={theme.textSecondary} />
            <Text style={[styles.swipeHintText, { color: theme.textSecondary }]}>
              {t('session.swipeToExhale')}
            </Text>
          </View>
        )}
      </View>

      {/* ── Bottom half: animated circle ── */}
      <View
        style={styles.bottomContent}
        {...(isRetention ? panResponder.panHandlers : {})}
      >
        <BreathingCircle
          phase={currentPhase as TimerPhase}
          mode={timerStore.mode}
          color={phaseColor}
          phaseDuration={currentPhaseDuration}
        />
      </View>
    </SafeAreaView>
  );
}

// ─── Styles ─────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },

  // Top bar — timer + stop
  topBar: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: SPACING.lg,
    paddingTop: SPACING.sm,
    paddingBottom: SPACING.xs,
  },
  topBarLeft: {
    flexDirection: 'column' as const,
    gap: 2,
  },
  techniqueName: {
    fontSize: 16,
    fontFamily: FONTS.semibold,
  },
  timerSmall: {
    fontSize: 14,
    fontFamily: FONTS.medium,
    fontVariant: ['tabular-nums'],
  },
  stopBtn: {
    width: 44,
    height: 44,
    borderRadius: 22,
    justifyContent: 'center',
    alignItems: 'center',
  },

  // Top half — big phase label
  topContent: {
    flex: 1,
    justifyContent: 'center',
    paddingHorizontal: SPACING.lg,
  },
  phaseText: {
    fontSize: scale(52),
    fontFamily: FONTS.heavy,
    letterSpacing: -1.5,
    lineHeight: scale(58),
  },
  phaseCountdown: {
    fontSize: scale(64),
    fontFamily: FONTS.regular,
    fontVariant: ['tabular-nums'],
    letterSpacing: -2,
    marginTop: SPACING.sm,
  },
  subInfo: {
    fontSize: 16,
    fontFamily: FONTS.medium,
    marginTop: SPACING.sm,
    letterSpacing: 0.2,
  },

  // Retention result
  resultCard: {
    alignSelf: 'flex-start',
    borderRadius: BORDER_RADIUS.md,
    borderWidth: 1,
    paddingHorizontal: SPACING.lg,
    paddingVertical: SPACING.md,
    marginTop: SPACING.md,
  },
  resultLabel: {
    fontSize: 12,
    fontFamily: FONTS.medium,
    letterSpacing: 0.3,
    marginBottom: 2,
  },
  resultValue: {
    fontSize: 28,
    fontFamily: FONTS.regular,
    fontVariant: ['tabular-nums'],
    letterSpacing: -0.5,
  },

  // Swipe hint
  swipeHint: {
    flexDirection: 'row',
    alignItems: 'center',
    alignSelf: 'flex-start',
    gap: 6,
    marginTop: SPACING.lg,
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 50,
  },
  swipeHintText: {
    fontSize: 13,
    fontFamily: FONTS.regular,
  },

  // Bottom half — breathing circle
  bottomContent: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    overflow: 'hidden',
  },

  // Breathing circle
  circleContainer: {
    width: CIRCLE_SIZE * 1.6,
    height: CIRCLE_SIZE * 1.6,
    justifyContent: 'center',
    alignItems: 'center',
  },
  circle: {
    width: CIRCLE_SIZE,
    height: CIRCLE_SIZE,
    borderRadius: CIRCLE_SIZE / 2,
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
    borderRadius: 50,
    paddingHorizontal: 24,
    paddingVertical: 10,
  },
  ghostBtnText: {
    fontSize: 14,
    fontFamily: FONTS.medium,
  },

  // Countdown
  countdownContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  countdownText: {
    fontSize: scale(120),
    fontFamily: FONTS.heavy,
    letterSpacing: -2,
  },
});
