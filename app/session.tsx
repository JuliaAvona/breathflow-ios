import React, { useEffect, useRef, useCallback, useMemo } from 'react';
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
// expo-keep-awake is not installed; screen wake is handled by background audio
import { useTimerStore, useSettingsStore, useSessionsStore } from '../src/store';
import { useThemeColors, useFontSize } from '../src/hooks/useColorScheme';
import { getTechniqueById } from '../src/constants/techniques';
import { COLORS, SPACING, FONT_SIZE, BORDER_RADIUS, SCREEN, scale } from '../src/constants';
import type { BreathingSession, TimerPhase, PowerBreathingPhase, KapalabhatiPhase } from '../src/types';

// ─── Phase Color Mapping ────────────────────────────────────────────────────

const PHASE_COLORS: Record<string, string> = {
  INHALE: COLORS.inhale,
  HOLD_IN: COLORS.holdIn,
  EXHALE: COLORS.exhale,
  HOLD_OUT: COLORS.holdOut,
  BREATHING: COLORS.inhale,
  RETENTION: COLORS.retention,
  RECOVERY: COLORS.recovery,
  RAPID_SET: COLORS.warning,
  REST: COLORS.accent,
  READY: COLORS.primary,
  PAUSED: COLORS.textSecondary,
  DONE: COLORS.success,
};

// ─── Helpers ────────────────────────────────────────────────────────────────

function formatTime(seconds: number): string {
  const m = Math.floor(seconds / 60);
  const s = seconds % 60;
  return `${m}:${s.toString().padStart(2, '0')}`;
}

function getPhaseInstructionKey(phase: TimerPhase | PowerBreathingPhase | KapalabhatiPhase): string {
  switch (phase) {
    case 'INHALE':
      return 'session.breatheIn';
    case 'HOLD_IN':
      return 'session.hold';
    case 'EXHALE':
      return 'session.breatheOut';
    case 'HOLD_OUT':
      return 'session.holdOut';
    case 'BREATHING':
      return 'session.breatheRapidly';
    case 'RETENTION':
      return 'session.holdYourBreath';
    case 'RECOVERY':
      return 'session.recoveryBreath';
    case 'RAPID_SET':
      return 'session.rapidBreathing';
    case 'REST':
      return 'session.rest';
    case 'PAUSED':
      return 'session.paused';
    case 'DONE':
      return 'session.done';
    default:
      return 'session.getReady';
  }
}

// ─── Breathing Circle Component ─────────────────────────────────────────────

const CIRCLE_BASE_SIZE = scale(180);

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
  const opacityAnim = useRef(new Animated.Value(0.8)).current;

  useEffect(() => {
    scaleAnim.stopAnimation();
    opacityAnim.stopAnimation();

    if (phase === 'PAUSED' || phase === 'DONE' || phase === 'READY') {
      Animated.timing(scaleAnim, {
        toValue: 1,
        duration: 300,
        useNativeDriver: true,
      }).start();
      return;
    }

    if (mode === 'standard') {
      if (phase === 'INHALE') {
        Animated.timing(scaleAnim, {
          toValue: 1.5,
          duration: 3000,
          useNativeDriver: true,
        }).start();
      } else if (phase === 'HOLD_IN') {
        // Hold at expanded size
        scaleAnim.setValue(1.5);
      } else if (phase === 'EXHALE') {
        Animated.timing(scaleAnim, {
          toValue: 1.0,
          duration: 3000,
          useNativeDriver: true,
        }).start();
      } else if (phase === 'HOLD_OUT') {
        // Hold at contracted size
        scaleAnim.setValue(1.0);
      }
    } else if (mode === 'power') {
      if (phase === 'BREATHING') {
        // Rapid pulsing for power breathing
        const pulse = Animated.loop(
          Animated.sequence([
            Animated.timing(scaleAnim, {
              toValue: 1.3,
              duration: 400,
              useNativeDriver: true,
            }),
            Animated.timing(scaleAnim, {
              toValue: 1.0,
              duration: 400,
              useNativeDriver: true,
            }),
          ]),
        );
        pulse.start();
        return () => pulse.stop();
      } else if (phase === 'RETENTION') {
        Animated.timing(scaleAnim, {
          toValue: 0.8,
          duration: 1000,
          useNativeDriver: true,
        }).start();
        // Gentle pulse opacity
        const breathe = Animated.loop(
          Animated.sequence([
            Animated.timing(opacityAnim, {
              toValue: 0.4,
              duration: 2000,
              useNativeDriver: true,
            }),
            Animated.timing(opacityAnim, {
              toValue: 0.8,
              duration: 2000,
              useNativeDriver: true,
            }),
          ]),
        );
        breathe.start();
        return () => breathe.stop();
      } else if (phase === 'RECOVERY') {
        Animated.timing(scaleAnim, {
          toValue: 1.4,
          duration: 2000,
          useNativeDriver: true,
        }).start();
      }
    } else if (mode === 'kapalabhati') {
      if (phase === 'RAPID_SET') {
        const pulse = Animated.loop(
          Animated.sequence([
            Animated.timing(scaleAnim, {
              toValue: 1.2,
              duration: 250,
              useNativeDriver: true,
            }),
            Animated.timing(scaleAnim, {
              toValue: 1.0,
              duration: 250,
              useNativeDriver: true,
            }),
          ]),
        );
        pulse.start();
        return () => pulse.stop();
      } else if (phase === 'REST') {
        Animated.timing(scaleAnim, {
          toValue: 1.0,
          duration: 500,
          useNativeDriver: true,
        }).start();
      }
    }
  }, [phase, mode, scaleAnim, opacityAnim]);

  return (
    <Animated.View
      style={[
        styles.breathingCircle,
        {
          backgroundColor: color,
          transform: [{ scale: scaleAnim }],
          opacity: opacityAnim,
        },
      ]}
    />
  );
}

// ─── Session Screen ─────────────────────────────────────────────────────────

export default function SessionScreen() {
  const { t } = useTranslation();
  const theme = useThemeColors();
  const fontSize = useFontSize();
  const { techniqueId } = useLocalSearchParams<{ techniqueId: string }>();

  // ── Stores ──
  const timerStore = useTimerStore();
  const settingsStore = useSettingsStore();
  const addSession = useSessionsStore((s) => s.addSession);

  // ── Technique ──
  const technique = useMemo(() => {
    if (!techniqueId) return undefined;
    // Check custom techniques first, then built-in
    const custom = settingsStore.customTechniques?.find((ct) => ct.id === techniqueId);
    return custom ?? getTechniqueById(techniqueId);
  }, [techniqueId, settingsStore.customTechniques]);

  // ── Overrides from settings ──
  const overrides = useMemo(() => {
    if (!techniqueId) return undefined;
    return settingsStore.techniqueOverrides?.[techniqueId];
  }, [techniqueId, settingsStore.techniqueOverrides]);

  // ── Interval ref ──
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  // ── Start session on mount ──
  useEffect(() => {
    if (!technique) return;
    timerStore.startSession(technique, overrides);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [technique]);

  // ── Tick interval ──
  useEffect(() => {
    const mode = timerStore.mode;
    const tickInterval = mode === 'standard' ? 1000 : 500;

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

  // ── Handle DONE → navigate to summary ──
  useEffect(() => {
    const isDone =
      (timerStore.mode === 'standard' && timerStore.phase === 'DONE') ||
      (timerStore.mode === 'power' && timerStore.powerPhase === 'DONE') ||
      (timerStore.mode === 'kapalabhati' && timerStore.kapalabhatiPhase === 'DONE');

    if (!isDone || !technique) return;

    const session: BreathingSession = {
      id: `${Date.now()}-${Math.random().toString(36).slice(2, 9)}`,
      userId: '', // will be filled by sessionsStore
      date: new Date().toISOString().split('T')[0],
      startedAt: timerStore.startedAt ?? new Date().toISOString(),
      completedAt: new Date().toISOString(),
      completed: true,
      techniqueId: technique.id,
      cyclesCompleted:
        timerStore.mode === 'standard' ? timerStore.currentCycle : 0,
      totalDuration: timerStore.totalElapsed,
      roundsCompleted:
        timerStore.mode === 'power' ? timerStore.currentRound : undefined,
      retentionTimes:
        timerStore.mode === 'power' ? timerStore.retentionTimes : undefined,
      bestRetention:
        timerStore.mode === 'power' && timerStore.retentionTimes.length > 0
          ? Math.max(...timerStore.retentionTimes)
          : undefined,
      avgRetention:
        timerStore.mode === 'power' && timerStore.retentionTimes.length > 0
          ? Math.round(
              timerStore.retentionTimes.reduce((a, b) => a + b, 0) /
                timerStore.retentionTimes.length,
            )
          : undefined,
      breathsPerRound:
        timerStore.mode === 'power' ? timerStore.targetBreaths : undefined,
    };

    addSession(session);
    timerStore.reset();

    router.replace({
      pathname: '/summary',
      params: { sessionId: session.id },
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [timerStore.phase, timerStore.powerPhase, timerStore.kapalabhatiPhase]);

  // ── Swipe-up PanResponder for retention ──
  const panResponder = useMemo(
    () =>
      PanResponder.create({
        onMoveShouldSetPanResponder: (_, gesture) => {
          return gesture.dy < -30 && Math.abs(gesture.dx) < Math.abs(gesture.dy);
        },
        onPanResponderRelease: (_, gesture) => {
          if (gesture.dy < -80) {
            useTimerStore.getState().endRetention();
          }
        },
      }),
    [],
  );

  // ── Handlers ──
  const handlePauseResume = useCallback(() => {
    const state = useTimerStore.getState();
    if (state.isRunning) {
      state.pause();
    } else {
      state.resume();
    }
  }, []);

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

  // ── Derived state ──
  const currentPhase = useMemo(() => {
    if (timerStore.mode === 'standard') return timerStore.phase;
    if (timerStore.mode === 'power') return timerStore.powerPhase;
    return timerStore.kapalabhatiPhase;
  }, [timerStore.mode, timerStore.phase, timerStore.powerPhase, timerStore.kapalabhatiPhase]);

  const phaseColor = PHASE_COLORS[currentPhase] ?? COLORS.primary;
  const isPaused = currentPhase === 'PAUSED';

  // ── Guard: no technique ──
  if (!technique) {
    return (
      <SafeAreaView style={[styles.container, { backgroundColor: theme.background }]}>
        <View style={styles.center}>
          <Text style={[styles.phaseLabel, { color: theme.text }]}>
            {t('session.techniqueNotFound')}
          </Text>
          <TouchableOpacity style={styles.stopButton} onPress={() => router.back()}>
            <Text style={styles.stopButtonText}>{t('session.goBack')}</Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    );
  }

  // ── Render: Standard Mode ──
  const renderStandard = () => (
    <>
      {/* Phase label */}
      <Text style={[styles.phaseLabel, { color: '#FFFFFF' }]}>
        {t(getPhaseInstructionKey(timerStore.phase))}
      </Text>

      {/* Phase countdown */}
      <Text style={[styles.phaseTimer, { color: 'rgba(255,255,255,0.9)' }]}>
        {timerStore.phaseTimeRemaining}
      </Text>

      {/* Cycle counter */}
      {timerStore.totalCycles > 0 && (
        <Text style={[styles.cycleCounter, { color: 'rgba(255,255,255,0.7)' }]}>
          {t('session.cycleOf', {
            current: timerStore.currentCycle,
            total: timerStore.totalCycles,
          })}
        </Text>
      )}
    </>
  );

  // ── Render: Power Breathing Mode ──
  const renderPower = () => {
    const { powerPhase } = timerStore;

    if (powerPhase === 'BREATHING' || (powerPhase === 'PAUSED' && timerStore.breathCount < timerStore.targetBreaths && timerStore.recoveryTimeRemaining <= 0)) {
      return (
        <>
          <Text style={[styles.phaseLabel, { color: '#FFFFFF' }]}>
            {t('session.breatheRapidly')}
          </Text>
          <Text style={[styles.phaseTimer, { color: 'rgba(255,255,255,0.9)' }]}>
            {`${Math.floor(timerStore.breathCount)} / ${timerStore.targetBreaths}`}
          </Text>
          <Text style={[styles.cycleCounter, { color: 'rgba(255,255,255,0.7)' }]}>
            {t('session.roundOf', {
              current: timerStore.currentRound,
              total: timerStore.totalRounds,
            })}
          </Text>
        </>
      );
    }

    if (powerPhase === 'RETENTION' || (powerPhase === 'PAUSED' && timerStore.retentionTime > 0 && timerStore.breathCount >= timerStore.targetBreaths)) {
      return (
        <View {...panResponder.panHandlers} style={styles.retentionContainer}>
          <Text style={[styles.phaseLabel, { color: '#FFFFFF' }]}>
            {t('session.holdYourBreath')}
          </Text>
          <Text style={[styles.retentionTimer, { color: '#FFFFFF' }]}>
            {formatTime(timerStore.retentionTime)}
          </Text>
          <Text style={[styles.swipeHint, { color: 'rgba(255,255,255,0.6)' }]}>
            {t('session.swipeToExhale')}
          </Text>
        </View>
      );
    }

    if (powerPhase === 'RECOVERY' || (powerPhase === 'PAUSED' && timerStore.recoveryTimeRemaining > 0)) {
      return (
        <>
          <Text style={[styles.phaseLabel, { color: '#FFFFFF' }]}>
            {t('session.recoveryBreath')}
          </Text>
          <Text style={[styles.phaseTimer, { color: 'rgba(255,255,255,0.9)' }]}>
            {timerStore.recoveryTimeRemaining}
          </Text>
          <Text style={[styles.cycleCounter, { color: 'rgba(255,255,255,0.7)' }]}>
            {t('session.roundOf', {
              current: timerStore.currentRound,
              total: timerStore.totalRounds,
            })}
          </Text>
        </>
      );
    }

    return null;
  };

  // ── Render: Kapalabhati Mode ──
  const renderKapalabhati = () => {
    const { kapalabhatiPhase } = timerStore;

    if (kapalabhatiPhase === 'RAPID_SET' || (kapalabhatiPhase === 'PAUSED' && timerStore.restTimeRemaining <= 0)) {
      return (
        <>
          <Text style={[styles.phaseLabel, { color: '#FFFFFF' }]}>
            {t('session.rapidBreathing')}
          </Text>
          <Text style={[styles.phaseTimer, { color: 'rgba(255,255,255,0.9)' }]}>
            {timerStore.setTimeRemaining}
          </Text>
          <Text style={[styles.cycleCounter, { color: 'rgba(255,255,255,0.7)' }]}>
            {t('session.setOf', {
              current: timerStore.currentSet,
              total: timerStore.totalSets,
            })}
          </Text>
          <Text style={[styles.breathCounter, { color: 'rgba(255,255,255,0.5)' }]}>
            {t('session.breaths', { count: timerStore.breathsInSet })}
          </Text>
        </>
      );
    }

    if (kapalabhatiPhase === 'REST' || (kapalabhatiPhase === 'PAUSED' && timerStore.restTimeRemaining > 0)) {
      return (
        <>
          <Text style={[styles.phaseLabel, { color: '#FFFFFF' }]}>
            {t('session.rest')}
          </Text>
          <Text style={[styles.phaseTimer, { color: 'rgba(255,255,255,0.9)' }]}>
            {timerStore.restTimeRemaining}
          </Text>
        </>
      );
    }

    return null;
  };

  // ── Background color based on phase ──
  const backgroundColor =
    timerStore.mode === 'power' && (timerStore.powerPhase === 'RETENTION' || (timerStore.powerPhase === 'PAUSED' && timerStore.retentionTime > 0))
      ? COLORS.retention
      : phaseColor + '30';

  return (
    <SafeAreaView style={[styles.container, { backgroundColor }]}>
      {/* Top bar */}
      <View style={styles.topBar}>
        <Text
          style={[styles.techniqueName, { color: theme.text }]}
          numberOfLines={1}
        >
          {t(technique.nameKey)}
        </Text>
        <Text style={[styles.elapsedTime, { color: theme.textSecondary }]}>
          {formatTime(timerStore.totalElapsed)}
        </Text>
      </View>

      {/* Center: Breathing circle + phase info */}
      <View style={styles.center}>
        <BreathingCircle
          phase={currentPhase}
          mode={timerStore.mode}
          color={phaseColor}
        />

        <View style={styles.phaseInfo}>
          {timerStore.mode === 'standard' && renderStandard()}
          {timerStore.mode === 'power' && renderPower()}
          {timerStore.mode === 'kapalabhati' && renderKapalabhati()}
        </View>
      </View>

      {/* Bottom: Controls */}
      <View style={styles.controls}>
        {/* Pause / Resume */}
        <TouchableOpacity
          style={[styles.controlButton, { backgroundColor: 'rgba(255,255,255,0.2)' }]}
          onPress={handlePauseResume}
          activeOpacity={0.7}
        >
          <Ionicons
            name={isPaused ? 'play' : 'pause'}
            size={scale(32)}
            color="#FFFFFF"
          />
          <Text style={styles.controlLabel}>
            {isPaused ? t('session.resume') : t('session.pause')}
          </Text>
        </TouchableOpacity>

        {/* Stop */}
        <TouchableOpacity
          style={[styles.controlButton, { backgroundColor: 'rgba(255,255,255,0.2)' }]}
          onPress={handleStop}
          activeOpacity={0.7}
        >
          <Ionicons name="stop" size={scale(32)} color="#FFFFFF" />
          <Text style={styles.controlLabel}>{t('session.stop')}</Text>
        </TouchableOpacity>
      </View>
    </SafeAreaView>
  );
}

// ─── Styles ─────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  topBar: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: SPACING.lg,
    paddingTop: SPACING.md,
    paddingBottom: SPACING.sm,
  },
  techniqueName: {
    fontSize: FONT_SIZE.lg,
    fontWeight: '600',
    flex: 1,
    marginRight: SPACING.md,
  },
  elapsedTime: {
    fontSize: FONT_SIZE.md,
    fontWeight: '500',
    fontVariant: ['tabular-nums'],
  },
  center: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  breathingCircle: {
    width: CIRCLE_BASE_SIZE,
    height: CIRCLE_BASE_SIZE,
    borderRadius: CIRCLE_BASE_SIZE / 2,
    position: 'absolute',
  },
  phaseInfo: {
    alignItems: 'center',
    zIndex: 1,
  },
  phaseLabel: {
    fontSize: FONT_SIZE.xl,
    fontWeight: '700',
    textAlign: 'center',
    marginBottom: SPACING.sm,
  },
  phaseTimer: {
    fontSize: FONT_SIZE.timer,
    fontWeight: '800',
    textAlign: 'center',
    fontVariant: ['tabular-nums'],
    marginBottom: SPACING.sm,
  },
  cycleCounter: {
    fontSize: FONT_SIZE.md,
    fontWeight: '500',
    textAlign: 'center',
  },
  breathCounter: {
    fontSize: FONT_SIZE.sm,
    fontWeight: '400',
    textAlign: 'center',
    marginTop: SPACING.xs,
  },
  retentionContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    flex: 1,
  },
  retentionTimer: {
    fontSize: scale(64),
    fontWeight: '800',
    fontVariant: ['tabular-nums'],
    textAlign: 'center',
    marginVertical: SPACING.lg,
  },
  swipeHint: {
    fontSize: FONT_SIZE.md,
    fontWeight: '500',
    textAlign: 'center',
    marginTop: SPACING.xl,
  },
  controls: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    gap: SPACING.xl,
    paddingBottom: SPACING.xxl,
    paddingHorizontal: SPACING.lg,
  },
  controlButton: {
    width: scale(80),
    height: scale(80),
    borderRadius: scale(40),
    justifyContent: 'center',
    alignItems: 'center',
  },
  controlLabel: {
    color: '#FFFFFF',
    fontSize: FONT_SIZE.xs,
    fontWeight: '600',
    marginTop: SPACING.xs,
  },
  stopButton: {
    marginTop: SPACING.lg,
    paddingVertical: SPACING.md,
    paddingHorizontal: SPACING.xl,
    backgroundColor: COLORS.error,
    borderRadius: BORDER_RADIUS.md,
  },
  stopButtonText: {
    color: '#FFFFFF',
    fontSize: FONT_SIZE.md,
    fontWeight: '600',
  },
});
