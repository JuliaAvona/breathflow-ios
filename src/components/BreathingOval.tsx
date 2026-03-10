import React, { useEffect, useRef } from 'react';
import { Animated, StyleSheet } from 'react-native';
import type { TimerPhase, PowerBreathingPhase, KapalabhatiPhase } from '../types';

const WIDTH = 160;
const HEIGHT = 210;

interface Props {
  phase: TimerPhase | PowerBreathingPhase | KapalabhatiPhase;
  mode: string;
  color: string;
  phaseDuration?: number;
}

/**
 * Animated oval for 2-to-1 and 4-4-6-2 breathing.
 * Asymmetric shape — stretches vertically on inhale, squishes on exhale.
 */
export function BreathingOval({ phase, mode, color, phaseDuration }: Props) {
  const scaleX = useRef(new Animated.Value(1)).current;
  const scaleY = useRef(new Animated.Value(1)).current;

  useEffect(() => {
    scaleX.stopAnimation();
    scaleY.stopAnimation();

    if (phase === 'PAUSED' || phase === 'DONE' || phase === 'READY') {
      Animated.parallel([
        Animated.timing(scaleX, { toValue: 1, duration: 300, useNativeDriver: true }),
        Animated.timing(scaleY, { toValue: 1, duration: 300, useNativeDriver: true }),
      ]).start();
      return;
    }

    if (mode === 'standard') {
      const dur = (phaseDuration ?? 4) * 1000;
      if (phase === 'INHALE') {
        Animated.parallel([
          Animated.timing(scaleX, { toValue: 1.1, duration: dur, useNativeDriver: true }),
          Animated.timing(scaleY, { toValue: 1.3, duration: dur, useNativeDriver: true }),
        ]).start();
      } else if (phase === 'HOLD_IN') {
        scaleX.setValue(1.1);
        scaleY.setValue(1.3);
      } else if (phase === 'EXHALE') {
        Animated.parallel([
          Animated.timing(scaleX, { toValue: 1.15, duration: dur, useNativeDriver: true }),
          Animated.timing(scaleY, { toValue: 0.9, duration: dur, useNativeDriver: true }),
        ]).start();
      } else if (phase === 'HOLD_OUT') {
        scaleX.setValue(1.15);
        scaleY.setValue(0.9);
      }
    } else {
      const overall = scaleX; // use scaleX as proxy for uniform
      if (phase === 'BREATHING' || phase === 'RAPID_SET') {
        const pulse = Animated.loop(
          Animated.sequence([
            Animated.parallel([
              Animated.timing(scaleX, { toValue: 1.2, duration: 350, useNativeDriver: true }),
              Animated.timing(scaleY, { toValue: 1.2, duration: 350, useNativeDriver: true }),
            ]),
            Animated.parallel([
              Animated.timing(scaleX, { toValue: 1.0, duration: 350, useNativeDriver: true }),
              Animated.timing(scaleY, { toValue: 1.0, duration: 350, useNativeDriver: true }),
            ]),
          ]),
        );
        pulse.start();
        return () => pulse.stop();
      } else if (phase === 'RETENTION') {
        Animated.parallel([
          Animated.timing(scaleX, { toValue: 0.9, duration: 800, useNativeDriver: true }),
          Animated.timing(scaleY, { toValue: 0.85, duration: 800, useNativeDriver: true }),
        ]).start();
      } else if (phase === 'RECOVERY' || phase === 'REST') {
        Animated.parallel([
          Animated.timing(scaleX, { toValue: 1.0, duration: 500, useNativeDriver: true }),
          Animated.timing(scaleY, { toValue: 1.0, duration: 500, useNativeDriver: true }),
        ]).start();
      }
    }
  }, [phase, mode, phaseDuration, scaleX, scaleY]);

  return (
    <Animated.View
      style={[
        styles.shape,
        {
          backgroundColor: color,
          transform: [{ scaleX }, { scaleY }],
        },
      ]}
    />
  );
}

const styles = StyleSheet.create({
  shape: {
    width: WIDTH,
    height: HEIGHT,
    borderRadius: WIDTH / 2,
  },
});
