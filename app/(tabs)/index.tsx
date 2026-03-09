import React, { useEffect, useRef, useCallback, useMemo } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  Alert,
  Animated,
  Easing,
  AppState,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { router } from 'expo-router';
import { useTranslation } from 'react-i18next';
import { useTimerStore, useSettingsStore, useSessionsStore } from '../../src/store';
import { useProfileStore } from '../../src/store/profileStore';
import { useThemeColors, useFontSize } from '../../src/hooks/useColorScheme';
import { useIntervalFeedback } from '../../src/hooks/useIntervalFeedback';
import { ProgressRing } from '../../src/components/ProgressRing';
import { formatTime, formatTotalTime, generateId, getToday } from '../../src/utils/time';
import { estimateCaloriesMET } from '../../src/utils/calories';
import {
  isHealthKitAvailable,
  getStepCountBetween,
  getDistanceBetween,
} from '../../src/utils/healthKit';
import {
  computePhaseTransitions,
  schedulePhaseNotifications,
  cancelPhaseNotifications,
} from '../../src/utils/notifications';
import { Ionicons } from '@expo/vector-icons';
import { COLORS, SPACING, FONT_SIZE, SCREEN, scale } from '../../src/constants';
import { startBackgroundAudio, stopBackgroundAudio } from '../../src/utils/backgroundAudio';

const RING_SIZE = SCREEN.width * 0.75;

// Module-level flag shared across all component instances to prevent duplicate session saves
let sessionCompleteInProgress = false;

export default function TimerScreen() {
  const { t } = useTranslation();
  const theme = useThemeColors();
  const fontSize = useFontSize();
  const timer = useTimerStore();
  const settings = useSettingsStore();
  const addSession = useSessionsStore((s) => s.addSession);
  const healthEnabled = settings.healthIntegration && isHealthKitAvailable();

  const { playIntervalSwitch, playSessionComplete, playCountdownBeep, playSessionStart } =
    useIntervalFeedback();
  const prevPhaseRef = useRef(timer.phase);

  // Set up notification callbacks for phase transitions
  useEffect(() => {
    const getContent = (transition: { phase: string; round: number; totalRounds: number }) => {
      switch (transition.phase) {
        case 'FAST':
          return {
            title: t('notifications.phaseChangeToFast'),
            body: t('notifications.phaseChangeToFastBody', {
              round: transition.round,
              total: transition.totalRounds,
            }),
          };
        case 'SLOW':
          return {
            title: t('notifications.phaseChangeToSlow'),
            body: t('notifications.phaseChangeToSlowBody', {
              round: transition.round,
              total: transition.totalRounds,
            }),
          };
        case 'COOL_DOWN':
          return {
            title: t('notifications.phaseCoolDown'),
            body: t('notifications.phaseCoolDownBody'),
          };
        case 'DONE':
          return {
            title: t('notifications.phaseComplete'),
            body: t('notifications.phaseCompleteBody'),
          };
        default:
          return { title: '', body: '' };
      }
    };

    useTimerStore.getState().setNotificationCallbacks(
      async (config) => {
        await cancelPhaseNotifications();
        const transitions = computePhaseTransitions(config);
        await schedulePhaseNotifications(transitions, getContent);
      },
      () => {
        cancelPhaseNotifications();
      },
    );
  }, [t]);

  // Pulse / breathing animation — varies by phase
  const breathAnim = useRef(new Animated.Value(1)).current;

  // Start button pulse ring
  const pulseAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    breathAnim.stopAnimation();

    if (timer.phase === 'FAST') {
      // Quick energetic pulse: 0.8s cycle
      Animated.loop(
        Animated.sequence([
          Animated.timing(breathAnim, {
            toValue: 1.04,
            duration: 400,
            easing: Easing.inOut(Easing.ease),
            useNativeDriver: true,
          }),
          Animated.timing(breathAnim, {
            toValue: 1,
            duration: 400,
            easing: Easing.inOut(Easing.ease),
            useNativeDriver: true,
          }),
        ]),
      ).start();
    } else if (timer.phase === 'SLOW') {
      // Gentle breath: 4s cycle
      Animated.loop(
        Animated.sequence([
          Animated.timing(breathAnim, {
            toValue: 1.05,
            duration: 2000,
            easing: Easing.inOut(Easing.ease),
            useNativeDriver: true,
          }),
          Animated.timing(breathAnim, {
            toValue: 1,
            duration: 2000,
            easing: Easing.inOut(Easing.ease),
            useNativeDriver: true,
          }),
        ]),
      ).start();
    } else if (timer.phase === 'WARM_UP' || timer.phase === 'COOL_DOWN') {
      // Medium pulse: 2s cycle
      Animated.loop(
        Animated.sequence([
          Animated.timing(breathAnim, {
            toValue: 1.03,
            duration: 1000,
            easing: Easing.inOut(Easing.ease),
            useNativeDriver: true,
          }),
          Animated.timing(breathAnim, {
            toValue: 1,
            duration: 1000,
            easing: Easing.inOut(Easing.ease),
            useNativeDriver: true,
          }),
        ]),
      ).start();
    } else {
      Animated.timing(breathAnim, {
        toValue: 1,
        duration: 200,
        useNativeDriver: true,
      }).start();
    }
  }, [timer.phase]);

  // Start button ripple pulse
  useEffect(() => {
    if (timer.phase === 'READY') {
      Animated.loop(
        Animated.timing(pulseAnim, {
          toValue: 1,
          duration: 2000,
          easing: Easing.out(Easing.ease),
          useNativeDriver: true,
        }),
      ).start();
    } else {
      pulseAnim.stopAnimation();
      pulseAnim.setValue(0);
    }
  }, [timer.phase]);

  // Handle phase changes for feedback + Live Activity updates
  useEffect(() => {
    if (prevPhaseRef.current !== timer.phase) {
      if (
        (timer.phase === 'FAST' || timer.phase === 'SLOW') &&
        prevPhaseRef.current !== 'READY' &&
        prevPhaseRef.current !== 'PAUSED'
      ) {
        playIntervalSwitch();
      }
      if (
        (timer.phase === 'WARM_UP' || timer.phase === 'FAST') &&
        prevPhaseRef.current === 'READY'
      ) {
        playSessionStart();
      }
      if (timer.phase === 'DONE') {
        playSessionComplete();
        handleSessionComplete();
      }

      prevPhaseRef.current = timer.phase;
    }
  }, [timer.phase]);

  // Timer tick — use setTimeout chain instead of setInterval to prevent double-tick
  const timeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    const activePhases = ['FAST', 'SLOW', 'WARM_UP', 'COOL_DOWN'];
    if (!activePhases.includes(timer.phase)) return;

    timeoutRef.current = setTimeout(() => {
      const result = useTimerStore.getState().tick();
      if (result.countdown) {
        playCountdownBeep(result.timeRemaining);
      }
    }, 1000);

    return () => {
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
        timeoutRef.current = null;
      }
    };
  }, [timer.phase, timer.timeRemaining]);

  // Background audio — keeps JS thread alive when phone is locked
  useEffect(() => {
    const activePhases = ['FAST', 'SLOW', 'WARM_UP', 'COOL_DOWN'];
    if (activePhases.includes(timer.phase)) {
      startBackgroundAudio();
    } else {
      stopBackgroundAudio();
    }
    return () => {
      if (!activePhases.includes(useTimerStore.getState().phase)) {
        stopBackgroundAudio();
      }
    };
  }, [timer.phase]);

  // Resync timer when returning from background (safety net)
  useEffect(() => {
    const activePhases = ['FAST', 'SLOW', 'WARM_UP', 'COOL_DOWN'];
    const subscription = AppState.addEventListener('change', (nextState) => {
      if (nextState === 'active') {
        const state = useTimerStore.getState();
        if (!activePhases.includes(state.phase) || !state.startedAt) return;

        const realElapsed = Math.floor((Date.now() - state.startedAt) / 1000);
        const drift = realElapsed - state.totalElapsed;

        if (drift > 2) {
          for (let i = 0; i < drift; i++) {
            const current = useTimerStore.getState();
            if (!activePhases.includes(current.phase)) break;
            useTimerStore.getState().tick();
          }

          const synced = useTimerStore.getState();
          if (activePhases.includes(synced.phase)) {
            prevPhaseRef.current = synced.phase;
          } else if (synced.phase === 'DONE') {
            prevPhaseRef.current = 'DONE';
            playSessionComplete();
            handleSessionComplete();
          }
        }
      }
    });
    return () => subscription.remove();
  }, []);

  const handleSessionComplete = useCallback(async () => {
    if (sessionCompleteInProgress) return;
    sessionCompleteInProgress = true;

    const state = useTimerStore.getState();
    const startedAt = state.startedAt || Date.now();
    const completedAt = Date.now();

    let steps: number | undefined;
    let distance: number | undefined;
    if (healthEnabled) {
      const start = new Date(startedAt);
      const end = new Date(completedAt);
      steps = await getStepCountBetween(start, end) || undefined;
      distance = await getDistanceBetween(start, end) || undefined;
    }

    const session = {
      id: generateId(),
      date: getToday(),
      startedAt,
      completedAt,
      rounds: state.currentRound,
      totalRounds: state.totalRounds,
      fastDuration: state.fastElapsed,
      slowDuration: state.slowElapsed,
      totalDuration: state.totalElapsed,
      estimatedCalories: estimateCaloriesMET(state.fastElapsed, state.slowElapsed, state.warmUpElapsed, state.coolDownElapsed, useProfileStore.getState().weight),
      completed: true,
      warmUp: state.warmUpEnabled,
      coolDown: state.coolDownEnabled,
      steps,
      distance,
    };
    if (session.totalDuration > 0) {
      addSession(session);
      const saved = useSessionsStore.getState().sessions.some((s) => s.id === session.id);
      if (!saved) {
        sessionCompleteInProgress = false;
        return;
      }
    } else {
      sessionCompleteInProgress = false;
      return;
    }
    stopBackgroundAudio();
    router.replace({ pathname: '/summary', params: { sessionId: session.id } });
    setTimeout(() => {
      timer.reset();
      sessionCompleteInProgress = false;
    }, 300);
  }, [healthEnabled]);

  const handleStart = async () => {
    // Request notification permission so phase change alerts work on Lock Screen
    const { requestNotificationPermissions } = await import('../../src/utils/notifications');
    await requestNotificationPermissions();

    timer.start({
      fastDuration: settings.fastInterval,
      slowDuration: settings.slowInterval,
      rounds: settings.roundCount,
      warmUp: settings.warmUpEnabled,
      coolDown: settings.coolDownEnabled,
      warmUpDuration: settings.warmUpDuration,
      coolDownDuration: settings.coolDownDuration,
      startingPhase: settings.startingPhase,
    });
  };

  const handleStop = () => {
    Alert.alert(t('timer.endWalkTitle'), t('timer.endWalkMessage'), [
      { text: t('timer.cancel'), style: 'cancel' },
      {
        text: t('timer.stop'),
        style: 'destructive',
        onPress: async () => {
          if (timer.totalElapsed > 60) {
            const state = useTimerStore.getState();
            const startedAt = state.startedAt || Date.now();
            const completedAt = Date.now();

            let steps: number | undefined;
            let distance: number | undefined;
            if (healthEnabled) {
              const start = new Date(startedAt);
              const end = new Date(completedAt);
              steps = await getStepCountBetween(start, end) || undefined;
              distance = await getDistanceBetween(start, end) || undefined;
            }

            const session = {
              id: generateId(),
              date: getToday(),
              startedAt,
              completedAt,
              rounds: state.currentRound,
              totalRounds: state.totalRounds,
              fastDuration: state.fastElapsed,
              slowDuration: state.slowElapsed,
              totalDuration: state.totalElapsed,
              estimatedCalories: estimateCaloriesMET(state.fastElapsed, state.slowElapsed, state.warmUpElapsed, state.coolDownElapsed, useProfileStore.getState().weight),
              completed: false,
              warmUp: state.warmUpEnabled,
              coolDown: state.coolDownEnabled,
              steps,
              distance,
            };
            addSession(session);
            stopBackgroundAudio();
            router.replace({ pathname: '/summary', params: { sessionId: session.id } });
            setTimeout(() => timer.stop(), 300);
          } else {
            timer.stop();
          }
        },
      },
    ]);
  };

  const isActive =
    timer.phase === 'FAST' ||
    timer.phase === 'SLOW' ||
    timer.phase === 'WARM_UP' ||
    timer.phase === 'COOL_DOWN';
  const isPaused = timer.phase === 'PAUSED';
  const isFast = timer.phase === 'FAST';
  const isWarmUp = timer.phase === 'WARM_UP';
  const isCoolDown = timer.phase === 'COOL_DOWN';

  const getCurrentDuration = () => {
    if (isFast) return timer.fastDuration;
    if (isWarmUp) return timer.warmUpDuration;
    if (isCoolDown) return timer.coolDownDuration;
    if (isPaused) {
      if (timer.phaseBeforePause === 'FAST') return timer.fastDuration;
      if (timer.phaseBeforePause === 'WARM_UP') return timer.warmUpDuration;
      if (timer.phaseBeforePause === 'COOL_DOWN') return timer.coolDownDuration;
      return timer.slowDuration;
    }
    return timer.slowDuration;
  };

  const currentDuration = getCurrentDuration();
  const progress = isActive || isPaused ? timer.timeRemaining / currentDuration : 0;

  const getPhaseColor = () => {
    const phase = isPaused ? timer.phaseBeforePause : timer.phase;
    if (phase === 'FAST') return theme.fast;
    if (phase === 'WARM_UP') return theme.accentLight;
    if (phase === 'COOL_DOWN') return theme.accentLight;
    return theme.slow;
  };

  const ringColor = getPhaseColor();

  const totalSessionTime =
    (timer.fastDuration + timer.slowDuration) * timer.totalRounds +
    (timer.warmUpEnabled ? timer.warmUpDuration : 0) +
    (timer.coolDownEnabled ? timer.coolDownDuration : 0);

  const getPhaseLabel = () => {
    if (isPaused) return t('timer.paused');
    if (isFast) return t('timer.fast');
    if (timer.phase === 'SLOW') return t('timer.slow');
    if (isWarmUp) return t('timer.warmUp');
    if (isCoolDown) return t('timer.coolDown');
    return '';
  };

  const getPhaseOverlay = () => {
    if (isFast) return theme.fast + '14';
    if (timer.phase === 'SLOW') return theme.slow + '14';
    if (isWarmUp) return theme.accentLight + '14';
    if (isCoolDown) return theme.accentLight + '14';
    return 'transparent';
  };

  const showRound = isActive || isPaused;

  // Build segmented progress bar data
  const segments = useMemo(() => {
    const segs: { type: 'warmup' | 'fast' | 'slow' | 'cooldown'; duration: number; round?: number }[] = [];
    if (timer.warmUpEnabled) segs.push({ type: 'warmup', duration: timer.warmUpDuration });
    const isSlowStart = timer.startingPhaseConfig === 'slow';
    for (let r = 1; r <= timer.totalRounds; r++) {
      if (isSlowStart) {
        segs.push({ type: 'slow', duration: timer.slowDuration, round: r });
        segs.push({ type: 'fast', duration: timer.fastDuration, round: r });
      } else {
        segs.push({ type: 'fast', duration: timer.fastDuration, round: r });
        segs.push({ type: 'slow', duration: timer.slowDuration, round: r });
      }
    }
    if (timer.coolDownEnabled) segs.push({ type: 'cooldown', duration: timer.coolDownDuration });
    return segs;
  }, [timer.warmUpEnabled, timer.coolDownEnabled, timer.warmUpDuration, timer.coolDownDuration,
      timer.fastDuration, timer.slowDuration, timer.totalRounds, timer.startingPhaseConfig]);

  // Calculate fill for each segment
  const segmentFills = useMemo(() => {
    if (!isActive && !isPaused) return segments.map(() => 0);
    let elapsed = timer.totalElapsed;
    return segments.map((seg) => {
      if (elapsed >= seg.duration) {
        elapsed -= seg.duration;
        return 1;
      }
      const fill = elapsed / seg.duration;
      elapsed = 0;
      return fill;
    });
  }, [segments, timer.totalElapsed, isActive, isPaused]);

  const getSegmentColor = (type: string) => {
    switch (type) {
      case 'fast': return theme.fast;
      case 'slow': return theme.slow;
      case 'warmup': return theme.accentLight;
      case 'cooldown': return theme.accentLight;
      default: return theme.fast;
    }
  };

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: theme.background }]}>
      {(isActive || isPaused) && (
        <View style={[StyleSheet.absoluteFill, { backgroundColor: getPhaseOverlay() }]} pointerEvents="none" />
      )}

      {timer.phase === 'READY' ? (
        <>
          <View style={styles.header}>
            <TouchableOpacity
              style={[styles.soundToggle, { backgroundColor: settings.soundEnabled ? theme.primary + '18' : theme.surface }]}
              onPress={() => settings.update({ soundEnabled: !settings.soundEnabled })}
              activeOpacity={0.7}
            >
              <Ionicons
                name={settings.soundEnabled ? 'volume-high' : 'volume-mute'}
                size={22}
                color={settings.soundEnabled ? theme.primary : theme.textSecondary}
              />
            </TouchableOpacity>
          </View>
          <View style={styles.timerContainer}>
            <View style={styles.readyContainer}>
              <Text style={[styles.readyTitle, { color: theme.text, fontSize: fontSize.xxl }]} numberOfLines={2} adjustsFontSizeToFit>
                {t('timer.readyTitle')}
              </Text>
              <Text style={[styles.readySubtitle, { color: theme.textSecondary, fontSize: fontSize.md }]}>
                {settings.startingPhase === 'slow'
                  ? t('timer.readySubtitleSlowFirst', {
                      rounds: settings.roundCount,
                      fast: formatTime(settings.fastInterval),
                      slow: formatTime(settings.slowInterval),
                    })
                  : t('timer.readySubtitle', {
                      rounds: settings.roundCount,
                      fast: formatTime(settings.fastInterval),
                      slow: formatTime(settings.slowInterval),
                    })}
              </Text>
              {(settings.warmUpEnabled || settings.coolDownEnabled) && (
                <Text style={[styles.readyInfo, { color: theme.textSecondary }]}>
                  {settings.warmUpEnabled ? t('timer.warmUpInfo') : ''}
                  {settings.warmUpEnabled && settings.coolDownEnabled ? ' & ' : ''}
                  {settings.coolDownEnabled ? t('timer.coolDownInfo') : ''}
                </Text>
              )}
              <View style={styles.startButtonWrapper}>
                <Animated.View
                  style={[
                    styles.startPulseRing,
                    {
                      borderColor: theme.primary,
                      opacity: pulseAnim.interpolate({ inputRange: [0, 1], outputRange: [0.4, 0] }),
                      transform: [{ scale: pulseAnim.interpolate({ inputRange: [0, 1], outputRange: [1, 1.5] }) }],
                    },
                  ]}
                />
                <TouchableOpacity
                  style={[styles.startButton, { backgroundColor: theme.primary, shadowColor: theme.primary }]}
                  onPress={handleStart}
                  activeOpacity={0.8}
                  accessibilityLabel={t('timer.start')}
                  accessibilityRole="button"
                >
                  <Ionicons name="play" size={RING_SIZE * 0.18} color={COLORS.white} style={{ marginLeft: RING_SIZE * 0.02 }} />
                </TouchableOpacity>
              </View>
            </View>
          </View>
        </>
      ) : (
        <>
          <View style={styles.header}>
            <TouchableOpacity
              style={[styles.soundToggle, { backgroundColor: settings.soundEnabled ? 'rgba(255,255,255,0.2)' : 'rgba(0,0,0,0.08)' }]}
              onPress={() => settings.update({ soundEnabled: !settings.soundEnabled })}
              activeOpacity={0.7}
            >
              <Ionicons
                name={settings.soundEnabled ? 'volume-high' : 'volume-mute'}
                size={22}
                color={settings.soundEnabled ? ringColor : theme.textSecondary}
              />
            </TouchableOpacity>
          </View>
          {/* Active timer — single centered column */}
          <View style={styles.activeContainer}>
            <Text
              style={[styles.bigPhaseLabel, { color: ringColor }]}
              accessibilityLabel={getPhaseLabel()}
              numberOfLines={1}
              adjustsFontSizeToFit
            >
              {getPhaseLabel()}
            </Text>

            {showRound && (
              <View style={styles.roundInfoBlock}>
                <Text style={[styles.roundLabel, { color: theme.textSecondary, fontSize: fontSize.sm }]}>
                  {t('timer.roundOf', {
                    current: timer.currentRound,
                    total: timer.totalRounds,
                  })}
                </Text>
                <Text style={[styles.totalOfLabel, { color: theme.textSecondary, fontSize: fontSize.xs }]}>
                  {t('timer.totalOf', {
                    elapsed: formatTotalTime(timer.totalElapsed),
                    total: formatTotalTime(totalSessionTime),
                  })}
                </Text>
              </View>
            )}

            <Animated.View style={{ transform: [{ scale: breathAnim }] }}>
              <ProgressRing
                progress={progress}
                size={RING_SIZE}
                strokeWidth={12}
                color={ringColor}
              >
                <Text
                  style={[styles.timeText, { color: theme.text, fontSize: fontSize.timer }]}
                  accessibilityLabel={t('timer.timeRemaining', { minutes: Math.floor(timer.timeRemaining / 60), seconds: timer.timeRemaining % 60 })}
                >
                  {formatTime(timer.timeRemaining)}
                </Text>
                {timer.countdownActive && (
                  <Text style={[styles.countdownHint, { color: ringColor, fontSize: fontSize.sm }]}>
                    {t('timer.getReady')}
                  </Text>
                )}
              </ProgressRing>
            </Animated.View>

            <View style={styles.controls}>
              <TouchableOpacity
                style={[styles.controlButton, { backgroundColor: ringColor }]}
                onPress={isPaused ? timer.resume : timer.pause}
                activeOpacity={0.8}
                accessibilityLabel={isPaused ? t('timer.resume') : t('timer.pause')}
                accessibilityRole="button"
              >
                <Ionicons name={isPaused ? 'play' : 'pause'} size={18} color={COLORS.white} />
                <Text style={[styles.controlButtonText, { fontSize: fontSize.lg }]} numberOfLines={1} adjustsFontSizeToFit>
                  {isPaused ? t('timer.resume') : t('timer.pause')}
                </Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={[styles.controlButton, styles.endButton, { borderColor: theme.border }]}
                onPress={handleStop}
                activeOpacity={0.8}
                accessibilityLabel={t('timer.stop')}
                accessibilityRole="button"
              >
                <Ionicons name="stop" size={18} color={theme.textSecondary} />
                <Text style={[styles.endButtonText, { color: theme.textSecondary, fontSize: fontSize.lg }]} numberOfLines={1} adjustsFontSizeToFit>{t('timer.stop')}</Text>
              </TouchableOpacity>
            </View>
          </View>
        </>
      )}



      {(isActive || isPaused) && (
        <View style={styles.segmentedBarContainer}>
          {segments.map((seg, i) => {
            const fill = segmentFills[i];
            const color = getSegmentColor(seg.type);
            const weight = seg.duration / totalSessionTime;
            return (
              <View
                key={i}
                style={[
                  styles.segmentTrack,
                  {
                    flex: weight,
                    backgroundColor: `${color}20`,
                    marginLeft: i === 0 ? 0 : 2,
                  },
                ]}
              >
                <View
                  style={[
                    styles.segmentFill,
                    {
                      width: `${fill * 100}%`,
                      backgroundColor: color,
                    },
                  ]}
                />
              </View>
            );
          })}
        </View>
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    paddingTop: SPACING.sm,
    paddingHorizontal: SPACING.lg,
    minHeight: 50,
  },
  soundToggle: {
    width: scale(46),
    height: scale(46),
    borderRadius: scale(23),
    alignItems: 'center',
    justifyContent: 'center',
  },
  bigPhaseLabel: {
    fontSize: 28,
    fontWeight: '800',
    letterSpacing: 3,
    textTransform: 'uppercase',
    marginBottom: SPACING.sm,
  },
  activeContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingBottom: SPACING.md,
  },
  timerContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  readyContainer: {
    alignItems: 'center',
  },
  readyTitle: {
    fontSize: FONT_SIZE.xxl,
    fontWeight: '700',
    marginBottom: SPACING.sm,
    textAlign: 'center',
  },
  readySubtitle: {
    fontSize: FONT_SIZE.md,
    textAlign: 'center',
    lineHeight: 24,
    marginBottom: SPACING.sm,
  },
  readyInfo: {
    fontSize: FONT_SIZE.sm,
    marginBottom: SPACING.xl,
  },
  startButtonWrapper: {
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: SPACING.md,
    width: scale(220),
    height: scale(220),
  },
  startPulseRing: {
    position: 'absolute',
    width: scale(160),
    height: scale(160),
    borderRadius: scale(80),
    borderWidth: 3,
  },
  startButton: {
    width: scale(160),
    height: scale(160),
    borderRadius: scale(80),
    justifyContent: 'center',
    alignItems: 'center',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.3,
    shadowRadius: 16,
    elevation: 8,
  },
  startButtonText: {
    color: COLORS.white,
    fontSize: FONT_SIZE.xxl,
    fontWeight: '800',
    letterSpacing: 2,
  },
  timeText: {
    fontSize: FONT_SIZE.timer,
    fontWeight: '800',
    fontVariant: ['tabular-nums'],
  },
  roundInfoBlock: {
    alignItems: 'center',
    marginTop: SPACING.md,
    marginBottom: SPACING.lg,
  },
  roundLabel: {
    fontSize: FONT_SIZE.md,
    fontWeight: '700',
    textAlign: 'center',
    textTransform: 'uppercase',
    letterSpacing: 1,
  },
  totalOfLabel: {
    fontSize: FONT_SIZE.sm,
    fontWeight: '600',
    marginTop: SPACING.sm,
    textAlign: 'center',
    fontVariant: ['tabular-nums'],
  },
  countdownHint: {
    fontSize: FONT_SIZE.sm,
    fontWeight: '600',
    marginTop: SPACING.sm,
  },
  controls: {
    flexDirection: 'row',
    justifyContent: 'center',
    gap: SPACING.md,
    marginTop: SPACING.xl,
    paddingHorizontal: SPACING.lg,
  },
  controlButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: SPACING.xs,
    paddingHorizontal: SPACING.md,
    paddingVertical: SPACING.md,
    borderRadius: 30,
  },
  endButton: {
    backgroundColor: 'transparent',
    borderWidth: 1.5,
  },
  controlButtonText: {
    color: COLORS.white,
    fontSize: FONT_SIZE.lg,
    fontWeight: '700',
    letterSpacing: 1,
  },
  endButtonText: {
    fontSize: FONT_SIZE.lg,
    fontWeight: '700',
    letterSpacing: 1,
  },
  segmentedBarContainer: {
    flexDirection: 'row',
    height: 6,
    paddingHorizontal: SPACING.md,
    paddingBottom: SPACING.xs,
  },
  segmentTrack: {
    height: 6,
    borderRadius: 3,
    overflow: 'hidden',
  },
  segmentFill: {
    height: 6,
    borderRadius: 3,
  },
});
