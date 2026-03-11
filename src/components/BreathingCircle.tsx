import React, { useEffect, useRef } from 'react';
import { Animated, StyleSheet } from 'react-native';
import { scale } from '../constants';
import type { TimerPhase, PowerBreathingPhase, KapalabhatiPhase } from '../types';

const CIRCLE_SIZE = scale(220);

interface Props {
  phase: TimerPhase | PowerBreathingPhase | KapalabhatiPhase;
  mode: string;
  color: string;
  phaseDuration?: number;
}

export function BreathingCircle({ phase, mode, color, phaseDuration }: Props) {
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

const styles = StyleSheet.create({
  circle: {
    width: CIRCLE_SIZE,
    height: CIRCLE_SIZE,
    borderRadius: CIRCLE_SIZE / 2,
  },
});
