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
 * Animated triangle for 4-7-8 and Triangle breathing.
 * Uses 3 layered rotated views to form a triangle shape that scales.
 */
export function BreathingTriangle({ phase, mode, color, phaseDuration }: Props) {
  const scaleAnim = useRef(new Animated.Value(1)).current;
  const rotateAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    scaleAnim.stopAnimation();
    rotateAnim.stopAnimation();

    if (phase === 'PAUSED' || phase === 'DONE' || phase === 'READY') {
      Animated.timing(scaleAnim, { toValue: 1, duration: 300, useNativeDriver: true }).start();
      return;
    }

    if (mode === 'standard') {
      const dur = (phaseDuration ?? 4) * 1000;
      if (phase === 'INHALE') {
        Animated.parallel([
          Animated.timing(scaleAnim, { toValue: 1.3, duration: dur, useNativeDriver: true }),
          Animated.timing(rotateAnim, { toValue: 0.33, duration: dur, useNativeDriver: true }),
        ]).start();
      } else if (phase === 'HOLD_IN') {
        scaleAnim.setValue(1.3);
        Animated.timing(rotateAnim, { toValue: 0.66, duration: dur, useNativeDriver: true }).start();
      } else if (phase === 'EXHALE') {
        Animated.parallel([
          Animated.timing(scaleAnim, { toValue: 1.0, duration: dur, useNativeDriver: true }),
          Animated.timing(rotateAnim, { toValue: 1.0, duration: dur, useNativeDriver: true }),
        ]).start();
      } else if (phase === 'HOLD_OUT') {
        scaleAnim.setValue(1.0);
      }
    } else {
      if (phase === 'BREATHING' || phase === 'RAPID_SET') {
        const pulse = Animated.loop(
          Animated.sequence([
            Animated.timing(scaleAnim, { toValue: 1.2, duration: 350, useNativeDriver: true }),
            Animated.timing(scaleAnim, { toValue: 1.0, duration: 350, useNativeDriver: true }),
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
  }, [phase, mode, phaseDuration, scaleAnim, rotateAnim]);

  const rotate = useMemo(
    () => rotateAnim.interpolate({ inputRange: [0, 1], outputRange: ['0deg', '120deg'] }),
    [rotateAnim],
  );

  return (
    <Animated.View
      style={[
        styles.container,
        { transform: [{ scale: scaleAnim }, { rotate }] },
      ]}
    >
      {/* Build triangle from 3 overlapping rotated rounded-rects */}
      <View style={[styles.petal, { backgroundColor: color, transform: [{ rotate: '0deg' }] }]} />
      <View style={[styles.petal, { backgroundColor: color, transform: [{ rotate: '120deg' }] }]} />
      <View style={[styles.petal, { backgroundColor: color, transform: [{ rotate: '240deg' }] }]} />
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
  petal: {
    position: 'absolute',
    width: SIZE * 0.58,
    height: SIZE * 0.58,
    borderRadius: SIZE * 0.12,
    top: SIZE * 0.06,
    alignSelf: 'center',
  },
});
