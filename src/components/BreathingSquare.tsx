import React, { useEffect, useRef } from 'react';
import { Animated, StyleSheet, View } from 'react-native';
import type { TimerPhase, PowerBreathingPhase, KapalabhatiPhase } from '../types';

const SIZE = 180;
// Fixed border radius — cannot be animated with native driver.
// Visual softness is achieved via opacity layering instead.
const BORDER_RADIUS = 24;

interface Props {
  phase: TimerPhase | PowerBreathingPhase | KapalabhatiPhase;
  mode: string;
  color: string;
  phaseDuration?: number;
}

/**
 * Animated square for Box Breathing.
 * Uses only transform (scale, rotate) and opacity — all compatible with
 * useNativeDriver: true, keeping animation on the UI thread.
 *
 * Visual cues per phase:
 *   INHALE    — scale up (1.0 → 1.3), rotate 90°, inner glow fades in
 *   HOLD_IN   — hold at max scale, continue rotating
 *   EXHALE    — scale down (1.3 → 1.0), rotate another 90°, glow fades out
 *   HOLD_OUT  — hold at min scale, complete last rotation segment
 */
export function BreathingSquare({ phase, mode, color, phaseDuration }: Props) {
  const scaleAnim = useRef(new Animated.Value(1)).current;
  const rotateAnim = useRef(new Animated.Value(0)).current;
  const glowOpacity = useRef(new Animated.Value(0.3)).current;

  useEffect(() => {
    scaleAnim.stopAnimation();
    rotateAnim.stopAnimation();
    glowOpacity.stopAnimation();

    if (phase === 'PAUSED' || phase === 'DONE' || phase === 'READY') {
      Animated.timing(scaleAnim, { toValue: 1, duration: 300, useNativeDriver: true }).start();
      Animated.timing(glowOpacity, { toValue: 0.3, duration: 300, useNativeDriver: true }).start();
      return;
    }

    if (mode === 'standard') {
      const dur = (phaseDuration ?? 4) * 1000;
      if (phase === 'INHALE') {
        Animated.parallel([
          Animated.timing(scaleAnim,   { toValue: 1.3,  duration: dur, useNativeDriver: true }),
          Animated.timing(rotateAnim,  { toValue: 0.25, duration: dur, useNativeDriver: true }),
          Animated.timing(glowOpacity, { toValue: 0.7,  duration: dur, useNativeDriver: true }),
        ]).start();
      } else if (phase === 'HOLD_IN') {
        scaleAnim.setValue(1.3);
        glowOpacity.setValue(0.7);
        Animated.timing(rotateAnim, { toValue: 0.5, duration: dur, useNativeDriver: true }).start();
      } else if (phase === 'EXHALE') {
        Animated.parallel([
          Animated.timing(scaleAnim,   { toValue: 1.0,  duration: dur, useNativeDriver: true }),
          Animated.timing(rotateAnim,  { toValue: 0.75, duration: dur, useNativeDriver: true }),
          Animated.timing(glowOpacity, { toValue: 0.3,  duration: dur, useNativeDriver: true }),
        ]).start();
      } else if (phase === 'HOLD_OUT') {
        scaleAnim.setValue(1.0);
        glowOpacity.setValue(0.3);
        Animated.timing(rotateAnim, { toValue: 1.0, duration: dur, useNativeDriver: true }).start();
      }
    } else {
      // power / kapalabhati fallback — pulsing
      if (phase === 'BREATHING' || phase === 'RAPID_SET') {
        const pulse = Animated.loop(
          Animated.sequence([
            Animated.timing(scaleAnim,   { toValue: 1.2, duration: 350, useNativeDriver: true }),
            Animated.timing(scaleAnim,   { toValue: 1.0, duration: 350, useNativeDriver: true }),
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
  }, [phase, mode, phaseDuration, scaleAnim, rotateAnim, glowOpacity]);

  const rotate = rotateAnim.interpolate({
    inputRange: [0, 1],
    outputRange: ['0deg', '90deg'],
  });

  return (
    <View style={styles.container}>
      {/* Subtle glow layer — same shape, slightly larger, fades with phase */}
      <Animated.View
        style={[
          styles.glow,
          {
            backgroundColor: color,
            opacity: glowOpacity,
            transform: [{ scale: scaleAnim }, { rotate }],
          },
        ]}
      />
      {/* Main square */}
      <Animated.View
        style={[
          styles.shape,
          {
            backgroundColor: color,
            transform: [{ scale: scaleAnim }, { rotate }],
          },
        ]}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    width: SIZE,
    height: SIZE,
    justifyContent: 'center',
    alignItems: 'center',
  },
  glow: {
    position: 'absolute',
    width: SIZE * 1.15,
    height: SIZE * 1.15,
    borderRadius: BORDER_RADIUS + 6,
  },
  shape: {
    width: SIZE,
    height: SIZE,
    borderRadius: BORDER_RADIUS,
  },
});
