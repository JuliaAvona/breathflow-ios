import React, { useEffect, useMemo, useRef } from 'react';
import { Animated, StyleSheet, View } from 'react-native';
import type { TimerPhase, PowerBreathingPhase, KapalabhatiPhase } from '../types';

const SIZE = 200;

interface Props {
  phase: TimerPhase | PowerBreathingPhase | KapalabhatiPhase;
  mode: string;
  color: string;
  phaseDuration?: number;
}

/**
 * Animated wave shape for Physiological Sigh & Cyclic Sighing.
 * Three overlapping ovals that shift vertically to simulate a wave motion.
 */
export function BreathingWave({ phase, mode, color, phaseDuration }: Props) {
  const scaleAnim = useRef(new Animated.Value(1)).current;
  const waveAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    scaleAnim.stopAnimation();
    waveAnim.stopAnimation();

    if (phase === 'PAUSED' || phase === 'DONE' || phase === 'READY') {
      Animated.timing(scaleAnim, { toValue: 1, duration: 300, useNativeDriver: true }).start();
      return;
    }

    if (mode === 'standard') {
      const dur = (phaseDuration ?? 4) * 1000;
      if (phase === 'INHALE') {
        Animated.parallel([
          Animated.timing(scaleAnim, { toValue: 1.35, duration: dur, useNativeDriver: true }),
          Animated.timing(waveAnim, { toValue: 1, duration: dur, useNativeDriver: true }),
        ]).start();
      } else if (phase === 'HOLD_IN') {
        scaleAnim.setValue(1.35);
        waveAnim.setValue(1);
      } else if (phase === 'EXHALE') {
        Animated.parallel([
          Animated.timing(scaleAnim, { toValue: 1.0, duration: dur, useNativeDriver: true }),
          Animated.timing(waveAnim, { toValue: 0, duration: dur, useNativeDriver: true }),
        ]).start();
      } else if (phase === 'HOLD_OUT') {
        scaleAnim.setValue(1.0);
        waveAnim.setValue(0);
      }
    } else {
      if (phase === 'BREATHING' || phase === 'RAPID_SET') {
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
      } else if (phase === 'RECOVERY' || phase === 'REST') {
        Animated.timing(scaleAnim, { toValue: 1.0, duration: 500, useNativeDriver: true }).start();
      }
    }
  }, [phase, mode, phaseDuration, scaleAnim, waveAnim]);

  const { wave1Y, wave2Y, wave3Y } = useMemo(
    () => ({
      wave1Y: waveAnim.interpolate({ inputRange: [0, 1], outputRange: [0, -12] }),
      wave2Y: waveAnim.interpolate({ inputRange: [0, 1], outputRange: [0, 8] }),
      wave3Y: waveAnim.interpolate({ inputRange: [0, 1], outputRange: [0, -6] }),
    }),
    [waveAnim],
  );

  return (
    <Animated.View style={[styles.container, { transform: [{ scale: scaleAnim }] }]}>
      <Animated.View
        style={[styles.blob, styles.blob1, { backgroundColor: color, transform: [{ translateY: wave1Y }] }]}
      />
      <Animated.View
        style={[styles.blob, styles.blob2, { backgroundColor: color, transform: [{ translateY: wave2Y }] }]}
      />
      <Animated.View
        style={[styles.blob, styles.blob3, { backgroundColor: color, transform: [{ translateY: wave3Y }] }]}
      />
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  container: {
    width: SIZE,
    height: SIZE,
    alignItems: 'center',
    justifyContent: 'center',
  },
  blob: {
    position: 'absolute',
    borderRadius: 999,
  },
  blob1: {
    width: SIZE * 0.85,
    height: SIZE * 0.65,
    opacity: 0.45,
  },
  blob2: {
    width: SIZE * 0.7,
    height: SIZE * 0.7,
    opacity: 0.6,
  },
  blob3: {
    width: SIZE * 0.55,
    height: SIZE * 0.55,
    opacity: 0.85,
  },
});
