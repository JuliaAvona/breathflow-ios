import React, { useEffect, useRef } from 'react';
import { View, Animated, StyleSheet, Easing } from 'react-native';

interface Props {
  phase: string;
  color: string;
  size?: number;
}

const RING_COUNT = 4;

export function PulseRings({ phase, color, size = 240 }: Props) {
  const rings = useRef(
    Array.from({ length: RING_COUNT }, () => ({
      scale: new Animated.Value(0.3),
      opacity: new Animated.Value(0),
    })),
  ).current;

  const centerScale = useRef(new Animated.Value(0.8)).current;
  const centerOpacity = useRef(new Animated.Value(0.9)).current;

  const isActive = phase === 'BREATHING' || phase === 'RAPID_SET';
  const isRetention = phase === 'RETENTION';
  const isRest = phase === 'REST' || phase === 'RECOVERY';
  const isDone = phase === 'DONE' || phase === 'PAUSED';

  useEffect(() => {
    if (isActive) {
      // Center circle pulses
      const centerLoop = Animated.loop(
        Animated.sequence([
          Animated.parallel([
            Animated.timing(centerScale, { toValue: 0.9, duration: 800, easing: Easing.inOut(Easing.sin), useNativeDriver: true }),
            Animated.timing(centerOpacity, { toValue: 1, duration: 800, useNativeDriver: true }),
          ]),
          Animated.parallel([
            Animated.timing(centerScale, { toValue: 0.75, duration: 800, easing: Easing.inOut(Easing.sin), useNativeDriver: true }),
            Animated.timing(centerOpacity, { toValue: 0.7, duration: 800, useNativeDriver: true }),
          ]),
        ]),
      );
      centerLoop.start();

      // Staggered ring ripples
      const ringAnimations = rings.map((ring, i) => {
        const delay = i * 400;
        return Animated.loop(
          Animated.sequence([
            Animated.delay(delay),
            Animated.parallel([
              Animated.timing(ring.scale, { toValue: 1.0, duration: 1600, easing: Easing.out(Easing.quad), useNativeDriver: true }),
              Animated.sequence([
                Animated.timing(ring.opacity, { toValue: 0.6, duration: 400, useNativeDriver: true }),
                Animated.timing(ring.opacity, { toValue: 0, duration: 1200, easing: Easing.in(Easing.quad), useNativeDriver: true }),
              ]),
            ]),
            // Reset
            Animated.parallel([
              Animated.timing(ring.scale, { toValue: 0.3, duration: 0, useNativeDriver: true }),
              Animated.timing(ring.opacity, { toValue: 0, duration: 0, useNativeDriver: true }),
            ]),
          ]),
        );
      });

      ringAnimations.forEach((a) => a.start());

      return () => {
        centerLoop.stop();
        ringAnimations.forEach((a) => a.stop());
      };
    } else if (isRetention) {
      // Retention: slow steady glow, no rings
      rings.forEach((ring) => {
        ring.scale.setValue(0.3);
        ring.opacity.setValue(0);
      });

      const retentionLoop = Animated.loop(
        Animated.sequence([
          Animated.timing(centerScale, { toValue: 0.7, duration: 2000, easing: Easing.inOut(Easing.sin), useNativeDriver: true }),
          Animated.timing(centerScale, { toValue: 0.6, duration: 2000, easing: Easing.inOut(Easing.sin), useNativeDriver: true }),
        ]),
      );
      Animated.timing(centerOpacity, { toValue: 0.5, duration: 800, useNativeDriver: true }).start();
      retentionLoop.start();

      return () => retentionLoop.stop();
    } else if (isRest) {
      // Rest/Recovery: gentle breathing
      rings.forEach((ring) => {
        ring.scale.setValue(0.3);
        ring.opacity.setValue(0);
      });

      const restLoop = Animated.loop(
        Animated.sequence([
          Animated.parallel([
            Animated.timing(centerScale, { toValue: 0.85, duration: 1500, easing: Easing.inOut(Easing.sin), useNativeDriver: true }),
            Animated.timing(centerOpacity, { toValue: 0.9, duration: 1500, useNativeDriver: true }),
          ]),
          Animated.parallel([
            Animated.timing(centerScale, { toValue: 0.7, duration: 1500, easing: Easing.inOut(Easing.sin), useNativeDriver: true }),
            Animated.timing(centerOpacity, { toValue: 0.6, duration: 1500, useNativeDriver: true }),
          ]),
        ]),
      );
      restLoop.start();

      return () => restLoop.stop();
    } else if (isDone) {
      Animated.parallel([
        Animated.timing(centerScale, { toValue: 0.6, duration: 600, useNativeDriver: true }),
        Animated.timing(centerOpacity, { toValue: 0.4, duration: 600, useNativeDriver: true }),
      ]).start();
      rings.forEach((ring) => {
        Animated.timing(ring.opacity, { toValue: 0, duration: 400, useNativeDriver: true }).start();
      });
    }
  }, [phase]);

  const R = size / 2;

  return (
    <View style={[styles.container, { width: size, height: size }]}>
      {/* Ripple rings */}
      {rings.map((ring, i) => (
        <Animated.View
          key={i}
          style={[
            styles.ring,
            {
              width: size,
              height: size,
              borderRadius: R,
              borderColor: color,
              transform: [{ scale: ring.scale }],
              opacity: ring.opacity,
            },
          ]}
        />
      ))}

      {/* Center filled circle */}
      <Animated.View
        style={[
          styles.center,
          {
            width: size * 0.5,
            height: size * 0.5,
            borderRadius: size * 0.25,
            backgroundColor: color,
            transform: [{ scale: centerScale }],
            opacity: centerOpacity,
          },
        ]}
      />

      {/* Inner glow */}
      <Animated.View
        style={[
          styles.glow,
          {
            width: size * 0.7,
            height: size * 0.7,
            borderRadius: size * 0.35,
            backgroundColor: color,
            transform: [{ scale: centerScale }],
            opacity: Animated.multiply(centerOpacity, new Animated.Value(0.25)),
          },
        ]}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  ring: {
    position: 'absolute',
    borderWidth: 2,
  },
  center: {
    position: 'absolute',
  },
  glow: {
    position: 'absolute',
  },
});
