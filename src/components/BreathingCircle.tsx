import React, { useEffect, useRef } from 'react';
import { Animated, Easing, StyleSheet, View } from 'react-native';
import { scale } from '../constants';
import type { TimerPhase, PowerBreathingPhase, KapalabhatiPhase } from '../types';

const CIRCLE_SIZE = scale(220);

// Scale targets
const INHALE_SCALE = 1.6;
const EXHALE_SCALE = 0.85;
// Easing curve — matches natural breath S-curve
const BREATH_EASING = Easing.inOut(Easing.sin);

interface Props {
  phase: TimerPhase | PowerBreathingPhase | KapalabhatiPhase;
  mode: string;
  color: string;
  phaseDuration?: number;
}

export function BreathingCircle({ phase, mode, color, phaseDuration }: Props) {
  const scaleAnim = useRef(new Animated.Value(1)).current;
  const opacityAnim = useRef(new Animated.Value(0.75)).current;
  const rippleScale = useRef(new Animated.Value(1)).current;
  const rippleOpacity = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    scaleAnim.stopAnimation();
    opacityAnim.stopAnimation();
    rippleScale.stopAnimation();
    rippleOpacity.stopAnimation();

    if (phase === 'PAUSED' || phase === 'DONE' || phase === 'READY') {
      Animated.parallel([
        Animated.timing(scaleAnim, { toValue: 1, duration: 400, easing: BREATH_EASING, useNativeDriver: true }),
        Animated.timing(opacityAnim, { toValue: 0.75, duration: 400, useNativeDriver: true }),
      ]).start();
      rippleOpacity.setValue(0);
      return;
    }

    if (mode === 'standard') {
      const dur = (phaseDuration ?? 3) * 1000;

      if (phase === 'INHALE') {
        Animated.parallel([
          Animated.timing(scaleAnim, { toValue: INHALE_SCALE, duration: dur, easing: BREATH_EASING, useNativeDriver: true }),
          Animated.timing(opacityAnim, { toValue: 1.0, duration: dur, useNativeDriver: true }),
        ]).start();

        // Ripple ring
        rippleScale.setValue(1);
        rippleOpacity.setValue(0.35);
        Animated.parallel([
          Animated.timing(rippleScale, { toValue: 1.9, duration: dur, easing: BREATH_EASING, useNativeDriver: true }),
          Animated.timing(rippleOpacity, { toValue: 0, duration: dur, useNativeDriver: true }),
        ]).start();

      } else if (phase === 'HOLD_IN') {
        scaleAnim.setValue(INHALE_SCALE);
        opacityAnim.setValue(1.0);

      } else if (phase === 'EXHALE') {
        Animated.parallel([
          Animated.timing(scaleAnim, { toValue: EXHALE_SCALE, duration: dur, easing: BREATH_EASING, useNativeDriver: true }),
          Animated.timing(opacityAnim, { toValue: 0.65, duration: dur, useNativeDriver: true }),
        ]).start();
        rippleOpacity.setValue(0);

      } else if (phase === 'HOLD_OUT') {
        scaleAnim.setValue(EXHALE_SCALE);
        opacityAnim.setValue(0.65);
      }

    } else if (mode === 'power') {
      if (phase === 'BREATHING') {
        const pulse = Animated.loop(
          Animated.sequence([
            Animated.parallel([
              Animated.timing(scaleAnim, { toValue: 1.4, duration: 350, easing: Easing.inOut(Easing.quad), useNativeDriver: true }),
              Animated.timing(opacityAnim, { toValue: 1.0, duration: 350, useNativeDriver: true }),
            ]),
            Animated.parallel([
              Animated.timing(scaleAnim, { toValue: 0.9, duration: 350, easing: Easing.inOut(Easing.quad), useNativeDriver: true }),
              Animated.timing(opacityAnim, { toValue: 0.6, duration: 350, useNativeDriver: true }),
            ]),
          ]),
        );
        pulse.start();
        return () => pulse.stop();
      } else if (phase === 'RETENTION') {
        Animated.parallel([
          Animated.timing(scaleAnim, { toValue: 0.7, duration: 800, easing: BREATH_EASING, useNativeDriver: true }),
          Animated.timing(opacityAnim, { toValue: 0.5, duration: 800, useNativeDriver: true }),
        ]).start();
      } else if (phase === 'RECOVERY') {
        Animated.parallel([
          Animated.timing(scaleAnim, { toValue: 1.5, duration: 1500, easing: BREATH_EASING, useNativeDriver: true }),
          Animated.timing(opacityAnim, { toValue: 1.0, duration: 1500, useNativeDriver: true }),
        ]).start();
      }

    } else if (mode === 'kapalabhati') {
      if (phase === 'RAPID_SET') {
        const pulse = Animated.loop(
          Animated.sequence([
            Animated.timing(scaleAnim, { toValue: 1.25, duration: 200, easing: Easing.out(Easing.quad), useNativeDriver: true }),
            Animated.timing(scaleAnim, { toValue: 0.9, duration: 200, easing: Easing.in(Easing.quad), useNativeDriver: true }),
          ]),
        );
        pulse.start();
        return () => pulse.stop();
      } else if (phase === 'REST') {
        Animated.parallel([
          Animated.timing(scaleAnim, { toValue: 1.0, duration: 500, easing: BREATH_EASING, useNativeDriver: true }),
          Animated.timing(opacityAnim, { toValue: 0.75, duration: 500, useNativeDriver: true }),
        ]).start();
      }
    }
  }, [phase, mode, phaseDuration, scaleAnim, opacityAnim, rippleScale, rippleOpacity]);

  return (
    <View style={styles.wrapper}>
      {/* Ripple ring */}
      <Animated.View
        style={[
          styles.ripple,
          {
            borderColor: color,
            opacity: rippleOpacity,
            transform: [{ scale: rippleScale }],
          },
        ]}
      />
      {/* Main circle */}
      <Animated.View
        style={[
          styles.circle,
          {
            backgroundColor: color,
            opacity: opacityAnim,
            transform: [{ scale: scaleAnim }],
          },
        ]}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  wrapper: {
    width: CIRCLE_SIZE,
    height: CIRCLE_SIZE,
    alignItems: 'center',
    justifyContent: 'center',
  },
  circle: {
    width: CIRCLE_SIZE,
    height: CIRCLE_SIZE,
    borderRadius: CIRCLE_SIZE / 2,
  },
  ripple: {
    position: 'absolute',
    width: CIRCLE_SIZE,
    height: CIRCLE_SIZE,
    borderRadius: CIRCLE_SIZE / 2,
    borderWidth: 2,
    backgroundColor: 'transparent',
  },
});
