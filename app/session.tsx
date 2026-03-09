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
import { useTimerStore, useSettingsStore, useSessionsStore } from '../src/store';
import { useThemeColors } from '../src/hooks/useColorScheme';
import { getTechniqueById } from '../src/constants/techniques';
import { COLORS, SPACING, FONT_SIZE, BORDER_RADIUS, SCREEN, scale } from '../src/constants';
import type { BreathingSession, TimerPhase, PowerBreathingPhase, KapalabhatiPhase } from '../src/types';

// ─── Phase Color Mapping ────────────────────────────────────────────────────

const PHASE_BG: Record<string, string> = {
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
  return `${m} : ${s.toString().padStart(2, '0')}`;
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

// ─── Breathing Circle ───────────────────────────────────────────────────────

const CIRCLE_SIZE = scale(160);

function BreathingCircle({
  phase,
  mode,
  color,
  label,
}: {
  phase: TimerPhase | PowerBreathingPhase | KapalabhatiPhase;
  mode: string;
  color: string;
  label: string;
}) {
  const scaleAnim = useRef(new Animated.Value(1)).current;
  const ringScale = useRef(new Animated.Value(1)).current;
  const ringOpacity = useRef(new Animated.Value(0.1)).current;

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
          Animated.timing(ringOpacity, { toValue: 0.02, duration: 2000, useNativeDriver: true }),
        ]),
        Animated.parallel([
          Animated.timing(ringScale, { toValue: 1.0, duration: 2000, useNativeDriver: true }),
          Animated.timing(ringOpacity, { toValue: 0.1, duration: 2000, useNativeDriver: true }),
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
            backgroundColor: color,
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
            backgroundColor: color,
            transform: [{ scale: scaleAnim }],
          },
        ]}
      >
        <Text style={styles.circleLabel}>{label}</Text>
      </Animated.View>
    </View>
  );
}

// ─── Round Dots ─────────────────────────────────────────────────────────────

function RoundDots({
  total,
  current,
  theme,
}: {
  total: number;
  current: number;
  theme: ReturnType<typeof useThemeColors>;
}) {
  if (total <= 1) return null;
  return (
    <View style={styles.dotsRow}>
      {Array.from({ length: total }, (_, i) => (
        <View
          key={i}
          style={[
            styles.dot,
            i < current - 1
              ? { backgroundColor: theme.primary }
              : i === current - 1
                ? { backgroundColor: theme.primary, opacity: 0.5 }
                : { backgroundColor: 'rgba(255,255,255,0.2)' },
          ]}
        />
      ))}
    </View>
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

  const handlePauseResume = useCallback(() => {
    const state = useTimerStore.getState();
    state.isRunning ? state.pause() : state.resume();
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

  // Derived
  const currentPhase = useMemo(() => {
    if (timerStore.mode === 'standard') return timerStore.phase;
    if (timerStore.mode === 'power') return timerStore.powerPhase;
    return timerStore.kapalabhatiPhase;
  }, [timerStore.mode, timerStore.phase, timerStore.powerPhase, timerStore.kapalabhatiPhase]);

  const phaseColor = PHASE_BG[currentPhase] ?? '#4A90D9';
  const isPaused = currentPhase === 'PAUSED';
  const isRetention = timerStore.mode === 'power' &&
    (timerStore.powerPhase === 'RETENTION' || (timerStore.powerPhase === 'PAUSED' && timerStore.retentionTime > 0 && timerStore.breathCount >= timerStore.targetBreaths));

  // Guard
  if (!technique) {
    return (
      <SafeAreaView style={[styles.container, { backgroundColor: theme.background }]}>
        <View style={styles.center}>
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

  // ── Standard mode content ──
  const renderStandard = () => (
    <>
      <BreathingCircle
        phase={timerStore.phase}
        mode="standard"
        color={phaseColor}
        label={t(getPhaseLabel(timerStore.phase)).toUpperCase()}
      />

      <Text style={styles.bigTimer}>
        {timerStore.phaseTimeRemaining}
      </Text>

      {timerStore.totalCycles > 0 && (
        <Text style={styles.counter}>
          {t('session.cycleOf', { current: timerStore.currentCycle, total: timerStore.totalCycles })}
        </Text>
      )}
    </>
  );

  // ── Power breathing content ──
  const renderPower = () => {
    const { powerPhase } = timerStore;

    // Breathing phase
    if (powerPhase === 'BREATHING' || (powerPhase === 'PAUSED' && timerStore.breathCount < timerStore.targetBreaths && timerStore.recoveryTimeRemaining <= 0)) {
      return (
        <>
          <BreathingCircle phase="BREATHING" mode="power" color={phaseColor} label="INHALE" />
          <Text style={styles.counter}>
            {Math.floor(timerStore.breathCount)} / {timerStore.targetBreaths}
          </Text>
          <Text style={styles.elapsed}>
            {formatTime(timerStore.totalElapsed)}
          </Text>
        </>
      );
    }

    // Retention phase (big timer like HTML kit)
    if (isRetention) {
      return (
        <View {...panResponder.panHandlers} style={styles.retentionWrap}>
          <Text style={styles.timerLabel}>{t('session.holdYourBreath').toUpperCase()}</Text>
          <Text style={styles.retentionBigTimer}>{formatTime(timerStore.retentionTime)}</Text>
          <View style={styles.swipeHint}>
            <Ionicons name="arrow-up" size={14} color="rgba(255,255,255,0.5)" />
            <Text style={styles.swipeHintText}>{t('session.swipeToExhale')}</Text>
          </View>
        </View>
      );
    }

    // Recovery phase
    if (powerPhase === 'RECOVERY' || (powerPhase === 'PAUSED' && timerStore.recoveryTimeRemaining > 0)) {
      return (
        <>
          {/* Show last retention result */}
          {timerStore.retentionTimes.length > 0 && (
            <View style={styles.resultCard}>
              <Text style={styles.resultLabel}>
                {t('summary.round', { number: timerStore.retentionTimes.length })}
              </Text>
              <Text style={styles.resultValue}>
                {formatTime(timerStore.retentionTimes[timerStore.retentionTimes.length - 1])}
              </Text>
            </View>
          )}

          <Text style={styles.recoveryLabel}>{t('session.recoveryBreath')}</Text>
          <Text style={styles.recoveryTimer}>{timerStore.recoveryTimeRemaining}</Text>
        </>
      );
    }

    return null;
  };

  // ── Kapalabhati content ──
  const renderKapalabhati = () => {
    const { kapalabhatiPhase } = timerStore;

    if (kapalabhatiPhase === 'RAPID_SET' || (kapalabhatiPhase === 'PAUSED' && timerStore.restTimeRemaining <= 0)) {
      return (
        <>
          <BreathingCircle phase="RAPID_SET" mode="kapalabhati" color={phaseColor} label="EXHALE" />
          <Text style={styles.bigTimer}>{timerStore.setTimeRemaining}</Text>
          <Text style={styles.counter}>
            {t('session.setOf', { current: timerStore.currentSet, total: timerStore.totalSets })}
          </Text>
          <Text style={styles.breathCountText}>
            {t('session.breaths', { count: timerStore.breathsInSet })}
          </Text>
        </>
      );
    }

    if (kapalabhatiPhase === 'REST' || (kapalabhatiPhase === 'PAUSED' && timerStore.restTimeRemaining > 0)) {
      return (
        <>
          <Text style={styles.recoveryLabel}>{t('session.rest')}</Text>
          <Text style={styles.recoveryTimer}>{timerStore.restTimeRemaining}</Text>
        </>
      );
    }

    return null;
  };

  // ── Background ──
  const bgColor = isRetention ? COLORS.retention : phaseColor + '20';

  // ── Round dots ──
  const totalRounds =
    timerStore.mode === 'power' ? timerStore.totalRounds :
    timerStore.mode === 'kapalabhati' ? timerStore.totalSets :
    timerStore.totalCycles;
  const currentRound =
    timerStore.mode === 'power' ? timerStore.currentRound :
    timerStore.mode === 'kapalabhati' ? timerStore.currentSet :
    timerStore.currentCycle;

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: bgColor }]}>
      {/* Top bar */}
      <View style={styles.topBar}>
        <Text style={styles.screenNum}>
          {t(technique.nameKey)}
        </Text>
        <Text style={styles.elapsedSmall}>
          {formatTime(timerStore.totalElapsed)}
        </Text>
      </View>

      {/* Round dots */}
      <RoundDots total={totalRounds} current={currentRound} theme={theme} />

      {/* Center content */}
      <View style={styles.center}>
        {timerStore.mode === 'standard' && renderStandard()}
        {timerStore.mode === 'power' && renderPower()}
        {timerStore.mode === 'kapalabhati' && renderKapalabhati()}
      </View>

      {/* Bottom controls */}
      <View style={styles.controls}>
        <TouchableOpacity
          style={styles.controlBtn}
          onPress={handlePauseResume}
          activeOpacity={0.7}
        >
          <Ionicons
            name={isPaused ? 'play' : 'pause'}
            size={24}
            color="rgba(255,255,255,0.9)"
          />
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.controlBtn, styles.stopBtn]}
          onPress={handleStop}
          activeOpacity={0.7}
        >
          <Ionicons name="stop" size={20} color="rgba(255,255,255,0.9)" />
          <Text style={styles.stopLabel}>{t('session.stop')}</Text>
        </TouchableOpacity>
      </View>
    </SafeAreaView>
  );
}

// ─── Styles (minimal kit) ───────────────────────────────────────────────────

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },

  // Top bar
  topBar: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: SPACING.lg,
    paddingTop: SPACING.sm,
    paddingBottom: SPACING.xs,
  },
  screenNum: {
    fontSize: 13,
    fontWeight: '500',
    color: 'rgba(255,255,255,0.8)',
    letterSpacing: -0.2,
  },
  elapsedSmall: {
    fontSize: 12,
    fontWeight: '300',
    color: 'rgba(255,255,255,0.5)',
    fontVariant: ['tabular-nums'],
    letterSpacing: 0.5,
  },

  // Round dots
  dotsRow: {
    flexDirection: 'row',
    justifyContent: 'center',
    gap: 5,
    paddingVertical: SPACING.sm,
  },
  dot: {
    width: 22,
    height: 3,
    borderRadius: 2,
  },

  // Center
  center: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: SPACING.lg,
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
    justifyContent: 'center',
    alignItems: 'center',
  },
  circleLabel: {
    fontSize: 10,
    fontWeight: '400',
    color: 'rgba(255,255,255,0.9)',
    letterSpacing: 1.5,
  },

  // Standard mode
  bigTimer: {
    fontSize: 28,
    fontWeight: '200',
    color: 'rgba(255,255,255,0.9)',
    letterSpacing: -0.5,
    marginTop: SPACING.md,
    fontVariant: ['tabular-nums'],
  },
  counter: {
    fontSize: 11,
    fontWeight: '300',
    color: 'rgba(255,255,255,0.5)',
    marginTop: SPACING.xs,
    letterSpacing: 0.3,
  },
  elapsed: {
    fontSize: 20,
    fontWeight: '200',
    color: 'rgba(255,255,255,0.7)',
    marginTop: SPACING.md,
    fontVariant: ['tabular-nums'],
  },
  breathCountText: {
    fontSize: 10,
    fontWeight: '300',
    color: 'rgba(255,255,255,0.4)',
    marginTop: SPACING.xs,
  },

  // Retention (big timer mode)
  retentionWrap: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  timerLabel: {
    fontSize: 9,
    fontWeight: '400',
    color: 'rgba(255,255,255,0.5)',
    letterSpacing: 2,
    marginBottom: SPACING.sm,
  },
  retentionBigTimer: {
    fontSize: scale(56),
    fontWeight: '200',
    color: '#FFFFFF',
    fontVariant: ['tabular-nums'],
    letterSpacing: -1,
  },
  swipeHint: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginTop: SPACING.xl,
    backgroundColor: 'rgba(255,255,255,0.08)',
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 50,
  },
  swipeHintText: {
    fontSize: 11,
    fontWeight: '300',
    color: 'rgba(255,255,255,0.5)',
  },

  // Recovery
  resultCard: {
    backgroundColor: 'rgba(255,255,255,0.1)',
    borderRadius: BORDER_RADIUS.md,
    paddingHorizontal: SPACING.lg,
    paddingVertical: SPACING.md,
    alignItems: 'center',
    marginBottom: SPACING.lg,
  },
  resultLabel: {
    fontSize: 9,
    fontWeight: '400',
    color: 'rgba(255,255,255,0.5)',
    letterSpacing: 0.5,
    marginBottom: 2,
  },
  resultValue: {
    fontSize: 28,
    fontWeight: '200',
    color: 'rgba(255,255,255,0.9)',
    letterSpacing: -0.5,
  },
  recoveryLabel: {
    fontSize: 11,
    fontWeight: '400',
    color: 'rgba(255,255,255,0.5)',
    letterSpacing: 0.5,
    marginTop: SPACING.md,
  },
  recoveryTimer: {
    fontSize: 24,
    fontWeight: '200',
    color: 'rgba(255,255,255,0.8)',
    fontVariant: ['tabular-nums'],
    marginTop: SPACING.xs,
  },

  // Controls (minimal)
  controls: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    gap: SPACING.lg,
    paddingBottom: SPACING.xxl,
    paddingHorizontal: SPACING.lg,
  },
  controlBtn: {
    width: scale(56),
    height: scale(56),
    borderRadius: scale(28),
    backgroundColor: 'rgba(255,255,255,0.12)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  stopBtn: {
    backgroundColor: 'rgba(255,255,255,0.08)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.1)',
  },
  stopLabel: {
    color: 'rgba(255,255,255,0.6)',
    fontSize: 8,
    fontWeight: '400',
    marginTop: 2,
    letterSpacing: 0.3,
  },

  // Not found
  notFoundText: {
    fontSize: 14,
    fontWeight: '300',
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
    fontSize: 12,
    fontWeight: '400',
  },
});
