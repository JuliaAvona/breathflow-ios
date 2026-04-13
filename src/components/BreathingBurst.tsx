import React, { useEffect, useMemo, useRef } from 'react';
import { Animated, StyleSheet, View } from 'react-native';
import type { TimerPhase, PowerBreathingPhase, KapalabhatiPhase } from '../types';

const SIZE = 200;
const DOT_COUNT = 8;

interface Props {
  phase: TimerPhase | PowerBreathingPhase | KapalabhatiPhase;
  mode: string;
  color: string;
  phaseDuration?: number;
}

/**
 * Animated burst shape for Power Breathing & Kapalabhati.
 * A central circle with 8 satellite dots that radiate outward.
 */
export function BreathingBurst({ phase, mode, color, phaseDuration }: Props) {
  const scaleAnim = useRef(new Animated.Value(1)).current;
  const burstAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    scaleAnim.stopAnimation();
    burstAnim.stopAnimation();

    if (phase === 'PAUSED' || phase === 'DONE' || phase === 'READY') {
      Animated.parallel([
        Animated.timing(scaleAnim, { toValue: 1, duration: 300, useNativeDriver: true }),
        Animated.timing(burstAnim, { toValue: 0, duration: 300, useNativeDriver: true }),
      ]).start();
      return;
    }

    if (phase === 'BREATHING' || phase === 'RAPID_SET') {
      const pulse = Animated.loop(
        Animated.sequence([
          Animated.parallel([
            Animated.timing(scaleAnim, { toValue: 1.25, duration: 300, useNativeDriver: true }),
            Animated.timing(burstAnim, { toValue: 1, duration: 300, useNativeDriver: true }),
          ]),
          Animated.parallel([
            Animated.timing(scaleAnim, { toValue: 1.0, duration: 300, useNativeDriver: true }),
            Animated.timing(burstAnim, { toValue: 0, duration: 300, useNativeDriver: true }),
          ]),
        ]),
      );
      pulse.start();
      return () => pulse.stop();
    } else if (phase === 'RETENTION') {
      Animated.parallel([
        Animated.timing(scaleAnim, { toValue: 0.8, duration: 800, useNativeDriver: true }),
        Animated.timing(burstAnim, { toValue: 0.3, duration: 800, useNativeDriver: true }),
      ]).start();
    } else if (phase === 'RECOVERY' || phase === 'REST') {
      Animated.parallel([
        Animated.timing(scaleAnim, { toValue: 1.2, duration: 1500, useNativeDriver: true }),
        Animated.timing(burstAnim, { toValue: 0.5, duration: 1500, useNativeDriver: true }),
      ]).start();
    } else if (mode === 'standard') {
      const dur = (phaseDuration ?? 4) * 1000;
      if (phase === 'INHALE') {
        Animated.parallel([
          Animated.timing(scaleAnim, { toValue: 1.3, duration: dur, useNativeDriver: true }),
          Animated.timing(burstAnim, { toValue: 1, duration: dur, useNativeDriver: true }),
        ]).start();
      } else if (phase === 'HOLD_IN') {
        scaleAnim.setValue(1.3);
        burstAnim.setValue(1);
      } else if (phase === 'EXHALE') {
        Animated.parallel([
          Animated.timing(scaleAnim, { toValue: 1.0, duration: dur, useNativeDriver: true }),
          Animated.timing(burstAnim, { toValue: 0, duration: dur, useNativeDriver: true }),
        ]).start();
      } else if (phase === 'HOLD_OUT') {
        scaleAnim.setValue(1.0);
        burstAnim.setValue(0);
      }
    }
  }, [phase, mode, phaseDuration, scaleAnim, burstAnim]);

  const dotInterpolations = useMemo(
    () =>
      Array.from({ length: DOT_COUNT }, (_, i) => {
        const angle = (i / DOT_COUNT) * 2 * Math.PI;
        const baseRadius = SIZE * 0.28;
        const expandRadius = SIZE * 0.12;

        const translateX = burstAnim.interpolate({
          inputRange: [0, 1],
          outputRange: [Math.cos(angle) * baseRadius, Math.cos(angle) * (baseRadius + expandRadius)],
        });
        const translateY = burstAnim.interpolate({
          inputRange: [0, 1],
          outputRange: [Math.sin(angle) * baseRadius, Math.sin(angle) * (baseRadius + expandRadius)],
        });

        return { translateX, translateY };
      }),
    [burstAnim],
  );

  const dots = dotInterpolations.map((interp, i) => (
    <Animated.View
      key={i}
      style={[
        styles.dot,
        {
          backgroundColor: color,
          transform: [{ translateX: interp.translateX }, { translateY: interp.translateY }],
        },
      ]}
    />
  ));

  return (
    <Animated.View style={[styles.container, { transform: [{ scale: scaleAnim }] }]}>
      <View style={[styles.core, { backgroundColor: color }]} />
      {dots}
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
  core: {
    width: SIZE * 0.4,
    height: SIZE * 0.4,
    borderRadius: SIZE * 0.2,
    opacity: 0.7,
  },
  dot: {
    position: 'absolute',
    width: SIZE * 0.12,
    height: SIZE * 0.12,
    borderRadius: SIZE * 0.06,
    opacity: 0.55,
  },
});
