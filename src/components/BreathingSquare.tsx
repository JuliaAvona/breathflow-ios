import React, { useEffect, useRef } from 'react';
import { Animated, StyleSheet } from 'react-native';
import type { TimerPhase, PowerBreathingPhase, KapalabhatiPhase } from '../types';

const SIZE = 180;

interface Props {
  phase: TimerPhase | PowerBreathingPhase | KapalabhatiPhase;
  mode: string;
  color: string;
  phaseDuration?: number;
}

/**
 * Animated square for Box Breathing.
 * Corners round slightly as it expands; rotates on each phase.
 */
export function BreathingSquare({ phase, mode, color, phaseDuration }: Props) {
  const scaleAnim = useRef(new Animated.Value(1)).current;
  const rotateAnim = useRef(new Animated.Value(0)).current;
  const radiusAnim = useRef(new Animated.Value(24)).current;

  useEffect(() => {
    scaleAnim.stopAnimation();
    rotateAnim.stopAnimation();

    if (phase === 'PAUSED' || phase === 'DONE' || phase === 'READY') {
      Animated.timing(scaleAnim, { toValue: 1, duration: 300, useNativeDriver: false }).start();
      return;
    }

    if (mode === 'standard') {
      const dur = (phaseDuration ?? 4) * 1000;
      if (phase === 'INHALE') {
        Animated.parallel([
          Animated.timing(scaleAnim, { toValue: 1.3, duration: dur, useNativeDriver: false }),
          Animated.timing(rotateAnim, { toValue: 0.25, duration: dur, useNativeDriver: false }),
          Animated.timing(radiusAnim, { toValue: 32, duration: dur, useNativeDriver: false }),
        ]).start();
      } else if (phase === 'HOLD_IN') {
        scaleAnim.setValue(1.3);
        Animated.timing(rotateAnim, { toValue: 0.5, duration: dur, useNativeDriver: false }).start();
      } else if (phase === 'EXHALE') {
        Animated.parallel([
          Animated.timing(scaleAnim, { toValue: 1.0, duration: dur, useNativeDriver: false }),
          Animated.timing(rotateAnim, { toValue: 0.75, duration: dur, useNativeDriver: false }),
          Animated.timing(radiusAnim, { toValue: 24, duration: dur, useNativeDriver: false }),
        ]).start();
      } else if (phase === 'HOLD_OUT') {
        scaleAnim.setValue(1.0);
        Animated.timing(rotateAnim, { toValue: 1.0, duration: dur, useNativeDriver: false }).start();
      }
    } else {
      // power/kapalabhati fallback — same pulsing
      if (phase === 'BREATHING' || phase === 'RAPID_SET') {
        const pulse = Animated.loop(
          Animated.sequence([
            Animated.timing(scaleAnim, { toValue: 1.2, duration: 350, useNativeDriver: false }),
            Animated.timing(scaleAnim, { toValue: 1.0, duration: 350, useNativeDriver: false }),
          ]),
        );
        pulse.start();
        return () => pulse.stop();
      } else if (phase === 'RETENTION') {
        Animated.timing(scaleAnim, { toValue: 0.85, duration: 800, useNativeDriver: false }).start();
      } else if (phase === 'RECOVERY' || phase === 'REST') {
        Animated.timing(scaleAnim, { toValue: 1.0, duration: 500, useNativeDriver: false }).start();
      }
    }
  }, [phase, mode, phaseDuration, scaleAnim, rotateAnim, radiusAnim]);

  const rotate = rotateAnim.interpolate({
    inputRange: [0, 1],
    outputRange: ['0deg', '90deg'],
  });

  return (
    <Animated.View
      style={[
        styles.shape,
        {
          backgroundColor: color,
          borderRadius: radiusAnim,
          transform: [{ scale: scaleAnim }, { rotate }],
        },
      ]}
    />
  );
}

const styles = StyleSheet.create({
  shape: {
    width: SIZE,
    height: SIZE,
  },
});
