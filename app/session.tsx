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
import { useTimerStore, useSettingsStore, useSessionsStore } from '../src/store';
import { useThemeColors } from '../src/hooks/useColorScheme';
import { getTechniqueById } from '../src/constants/techniques';
import { COLORS, SPACING, BORDER_RADIUS, FONTS, scale } from '../src/constants';
import type { BreathingSession, TimerPhase, PowerBreathingPhase, KapalabhatiPhase } from '../src/types';

// ─── Phase Color Mapping ────────────────────────────────────────────────────

const PHASE_COLOR: Record<string, string> = {
  INHALE: '#4A90D9',
  HOLD_IN: '#7B68AE',
  EXHALE: '#7BC4A8',
  HOLD_OUT: '#F5A623',
  BREATHING: '#4A90D9',
  RETENTION: '#1A2332',
  RECOVERY: '#5BAD7A',
  RAPID_SET: '#F5A623',
  REST: '#5BA4C8',
  READY: '#4A90D9',
  PAUSED: '#64748B',
  DONE: '#7BC4A8',
};

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

const CIRCLE_SIZE = scale(180);

function BreathingCircle({
  phase,
  mode,
  color,
}: {
  phase: TimerPhase | PowerBreathingPhase | KapalabhatiPhase;
  mode: string;
  color: string;
}) {
  const scaleAnim = useRef(new Animated.Value(1)).current;
  const ringScale = useRef(new Animated.Value(1)).current;
  const ringOpacity = useRef(new Animated.Value(0.15)).current;
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
    ringScale.stopAnimation();
    ringOpacity.stopAnimation();

    if (phase === 'PAUSED' || phase === 'DONE' || phase === 'READY') {
      Animated.timing(scaleAnim, {
        toValue: 1,
        duration: 300,
        useNativeDriver: true,
      }).start();
      return;
    }

    // Outer ring pulse
    const ringPulse = Animated.loop(
      Animated.sequence([
        Animated.parallel([
          Animated.timing(ringScale, { toValue: 1.3, duration: 2000, useNativeDriver: true }),
          Animated.timing(ringOpacity, { toValue: 0.04, duration: 2000, useNativeDriver: true }),
        ]),
        Animated.parallel([
          Animated.timing(ringScale, { toValue: 1.0, duration: 2000, useNativeDriver: true }),
          Animated.timing(ringOpacity, { toValue: 0.15, duration: 2000, useNativeDriver: true }),
        ]),
      ]),
    );
    ringPulse.start();

    if (mode === 'standard') {
      if (phase === 'INHALE') {
        Animated.timing(scaleAnim, { toValue: 1.35, duration: 3000, useNativeDriver: true }).start();
      } else if (phase === 'HOLD_IN') {
        scaleAnim.setValue(1.35);
      } else if (phase === 'EXHALE') {
        Animated.timing(scaleAnim, { toValue: 1.0, duration: 3000, useNativeDriver: true }).start();
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
        return () => { pulse.stop(); ringPulse.stop(); };
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
        return () => { pulse.stop(); ringPulse.stop(); };
      } else if (phase === 'REST') {
        Animated.timing(scaleAnim, { toValue: 1.0, duration: 500, useNativeDriver: true }).start();
      }
    }

    return () => ringPulse.stop();
  }, [phase, mode, scaleAnim, ringScale, ringOpacity]);

  return (
    <View style={styles.circleContainer}>
      {/* Outer ring */}
      <Animated.View
        style={[
          styles.outerRing,
          {
            backgroundColor: displayColor,
            opacity: ringOpacity,
            transform: [{ scale: ringScale }],
          },
        ]}
      />
      {/* Main circle */}
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

  // Start session
  useEffect(() => {
    if (!technique) return;
    timerStore.startSession(technique, overrides);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [technique]);

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

  const phaseColor = PHASE_COLOR[currentPhase] ?? '#4A90D9';
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

  // ── Retention extra: last round result ──
  const showRetentionResult = timerStore.mode === 'power' &&
    (timerStore.powerPhase === 'RECOVERY' || (timerStore.powerPhase === 'PAUSED' && timerStore.recoveryTimeRemaining > 0)) &&
    timerStore.retentionTimes.length > 0;

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: bgColor }]}>
      {/* ── Top bar: timer left, stop right ── */}
      <View style={styles.topBar}>
        <Text style={[styles.timerSmall, { color: theme.primary }]}>
          {formatTimeMin(totalRemaining)}
        </Text>
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
  timerSmall: {
    fontSize: 18,
    fontFamily: FONTS.semibold,
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
  outerRing: {
    position: 'absolute',
    width: CIRCLE_SIZE * 1.4,
    height: CIRCLE_SIZE * 1.4,
    borderRadius: CIRCLE_SIZE * 0.7,
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
});
