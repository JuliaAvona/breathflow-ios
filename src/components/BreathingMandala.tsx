import React, { useEffect, useRef } from 'react';
import { Animated, Easing, View } from 'react-native';
import Svg, { Circle } from 'react-native-svg';
import type { TimerPhase, PowerBreathingPhase, KapalabhatiPhase } from '../types';

// ─── Geometry ───────────────────────────────────────────────────────────────
// 8 equal circles, each of radius R, centers placed at distance ORBIT from
// the mandala center.  ORBIT < R so circles overlap heavily — like the
// screenshot.  On inhale the outer ring scales up (spread);
// on exhale it scales down to ~0, all circles collapse into one blob.

const N = 8;
const CIRCLES = Array.from({ length: N }, (_, i) => {
  const a = (i * (360 / N) * Math.PI) / 180;
  return { cos: Math.cos(a), sin: Math.sin(a) };
});

const BREATH_EASING = Easing.inOut(Easing.sin);

type AnyPhase = TimerPhase | PowerBreathingPhase | KapalabhatiPhase | 'IDLE';

interface Props {
  phase?: AnyPhase;
  mode?: string;
  color: string;
  size?: number;
  phaseDuration?: number;
}

export function BreathingMandala({
  phase = 'IDLE',
  mode = 'standard',
  color,
  size = 240,
  phaseDuration,
}: Props) {
  // --- Rotation: always spinning, never stops ---
  const rotateAnim = useRef(new Animated.Value(0)).current;
  const rotateLoop = useRef<Animated.CompositeAnimation | null>(null);

  // --- Scale of the whole mandala (inhale ↑, exhale ↓) ---
  const outerScale = useRef(new Animated.Value(0.82)).current;
  // --- Orbit spread: 1 = full spread, 0 = all circles at center ---
  const orbitSpread = useRef(new Animated.Value(0.72)).current;
  // --- Opacity ---
  const opacityAnim = useRef(new Animated.Value(0.82)).current;

  const rotateStr = rotateAnim.interpolate({
    inputRange: [0, 1],
    outputRange: ['0deg', '360deg'],
  });

  // Start rotation once, just change speed via restarting
  const startRotation = (durationMs: number) => {
    rotateLoop.current?.stop();
    rotateLoop.current = Animated.loop(
      Animated.timing(rotateAnim, {
        toValue: 1,
        duration: durationMs,
        easing: Easing.linear,
        useNativeDriver: true,
      }),
    );
    rotateLoop.current.start();
  };

  // Kick off slow rotation immediately on mount
  useEffect(() => {
    rotateAnim.setValue(0);
    startRotation(14000);
    return () => rotateLoop.current?.stop();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Phase-driven scale + orbit + opacity
  useEffect(() => {
    const dur = (phaseDuration ?? 4) * 1000;

    if (phase === 'IDLE' || phase === 'READY') {
      startRotation(14000);
      // Gentle idle pulse
      const loop = Animated.loop(
        Animated.sequence([
          Animated.parallel([
            Animated.timing(outerScale,  { toValue: 0.90, duration: 2800, easing: BREATH_EASING, useNativeDriver: true }),
            Animated.timing(orbitSpread, { toValue: 0.80, duration: 2800, easing: BREATH_EASING, useNativeDriver: false }),
            Animated.timing(opacityAnim, { toValue: 0.90, duration: 2800, useNativeDriver: true }),
          ]),
          Animated.parallel([
            Animated.timing(outerScale,  { toValue: 0.72, duration: 2800, easing: BREATH_EASING, useNativeDriver: true }),
            Animated.timing(orbitSpread, { toValue: 0.60, duration: 2800, easing: BREATH_EASING, useNativeDriver: false }),
            Animated.timing(opacityAnim, { toValue: 0.65, duration: 2800, useNativeDriver: true }),
          ]),
        ]),
      );
      loop.start();
      return () => loop.stop();
    }

    if (phase === 'PAUSED' || phase === 'DONE') {
      startRotation(18000);
      Animated.parallel([
        Animated.timing(outerScale,  { toValue: 0.82, duration: 600, easing: BREATH_EASING, useNativeDriver: true }),
        Animated.timing(orbitSpread, { toValue: 0.70, duration: 600, easing: BREATH_EASING, useNativeDriver: false }),
        Animated.timing(opacityAnim, { toValue: 0.75, duration: 600, useNativeDriver: true }),
      ]).start();
      return;
    }

    if (mode === 'standard') {
      if (phase === 'INHALE') {
        startRotation(9000); // faster on inhale
        Animated.parallel([
          Animated.timing(outerScale,  { toValue: 1.06, duration: dur, easing: BREATH_EASING, useNativeDriver: true }),
          Animated.timing(orbitSpread, { toValue: 1.0,  duration: dur, easing: BREATH_EASING, useNativeDriver: false }),
          Animated.timing(opacityAnim, { toValue: 1.0,  duration: dur, useNativeDriver: true }),
        ]).start();
      } else if (phase === 'HOLD_IN') {
        startRotation(11000);
        outerScale.setValue(1.06);
        orbitSpread.setValue(1.0);
        opacityAnim.setValue(1.0);
      } else if (phase === 'EXHALE') {
        startRotation(18000); // slow on exhale
        Animated.parallel([
          // scale only slightly (shape stays visible)
          Animated.timing(outerScale,  { toValue: 0.80, duration: dur, easing: BREATH_EASING, useNativeDriver: true }),
          // orbit collapses to 0 → all circles merge into one
          Animated.timing(orbitSpread, { toValue: 0.0,  duration: dur, easing: BREATH_EASING, useNativeDriver: false }),
          Animated.timing(opacityAnim, { toValue: 0.70, duration: dur, useNativeDriver: true }),
        ]).start();
      } else if (phase === 'HOLD_OUT') {
        startRotation(20000);
        outerScale.setValue(0.80);
        orbitSpread.setValue(0.0);
        opacityAnim.setValue(0.70);
      }
    } else if (mode === 'power') {
      if (phase === 'BREATHING') {
        startRotation(5000);
        const loop = Animated.loop(
          Animated.sequence([
            Animated.parallel([
              Animated.timing(outerScale,  { toValue: 1.1,  duration: 320, easing: Easing.inOut(Easing.quad), useNativeDriver: true }),
              Animated.timing(orbitSpread, { toValue: 1.0,  duration: 320, easing: Easing.inOut(Easing.quad), useNativeDriver: false }),
              Animated.timing(opacityAnim, { toValue: 1.0,  duration: 320, useNativeDriver: true }),
            ]),
            Animated.parallel([
              Animated.timing(outerScale,  { toValue: 0.70, duration: 320, easing: Easing.inOut(Easing.quad), useNativeDriver: true }),
              Animated.timing(orbitSpread, { toValue: 0.0,  duration: 320, easing: Easing.inOut(Easing.quad), useNativeDriver: false }),
              Animated.timing(opacityAnim, { toValue: 0.55, duration: 320, useNativeDriver: true }),
            ]),
          ]),
        );
        loop.start();
        return () => loop.stop();
      } else if (phase === 'RETENTION') {
        startRotation(22000);
        Animated.parallel([
          Animated.timing(outerScale,  { toValue: 0.65, duration: 900, easing: BREATH_EASING, useNativeDriver: true }),
          Animated.timing(orbitSpread, { toValue: 0.0,  duration: 900, easing: BREATH_EASING, useNativeDriver: false }),
          Animated.timing(opacityAnim, { toValue: 0.48, duration: 900, useNativeDriver: true }),
        ]).start();
      } else if (phase === 'RECOVERY') {
        startRotation(9000);
        Animated.parallel([
          Animated.timing(outerScale,  { toValue: 1.1,  duration: 1600, easing: BREATH_EASING, useNativeDriver: true }),
          Animated.timing(orbitSpread, { toValue: 1.0,  duration: 1600, easing: BREATH_EASING, useNativeDriver: false }),
          Animated.timing(opacityAnim, { toValue: 1.0,  duration: 1600, useNativeDriver: true }),
        ]).start();
      }
    } else if (mode === 'kapalabhati') {
      if (phase === 'RAPID_SET') {
        startRotation(4000);
        const loop = Animated.loop(
          Animated.sequence([
            Animated.parallel([
              Animated.timing(outerScale,  { toValue: 1.05, duration: 160, easing: Easing.out(Easing.quad), useNativeDriver: true }),
              Animated.timing(orbitSpread, { toValue: 1.0,  duration: 160, easing: Easing.out(Easing.quad), useNativeDriver: false }),
            ]),
            Animated.parallel([
              Animated.timing(outerScale,  { toValue: 0.75, duration: 160, easing: Easing.in(Easing.quad), useNativeDriver: true }),
              Animated.timing(orbitSpread, { toValue: 0.0,  duration: 160, easing: Easing.in(Easing.quad), useNativeDriver: false }),
            ]),
          ]),
        );
        loop.start();
        return () => loop.stop();
      } else if (phase === 'REST') {
        startRotation(16000);
        Animated.parallel([
          Animated.timing(outerScale,  { toValue: 0.82, duration: 600, easing: BREATH_EASING, useNativeDriver: true }),
          Animated.timing(orbitSpread, { toValue: 0.65, duration: 600, easing: BREATH_EASING, useNativeDriver: false }),
          Animated.timing(opacityAnim, { toValue: 0.75, duration: 600, useNativeDriver: true }),
        ]).start();
      }
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [phase, mode, phaseDuration]);

  // ── Render ─────────────────────────────────────────────────────────────────
  const cx = size / 2;
  const cy = size / 2;
  // Circle radius: each petal = ~30% of half-size
  const R = size * 0.30;
  // Orbit distance animated: 0 = at center, full = R (circles touch center)
  const orbitFull = size * 0.30;

  // We need orbitSpread as a JS value to pass to SVG cx/cy.
  // Since orbitSpread is JS-driven (useNativeDriver: false), we can use
  // Animated.View children with translateX/translateY instead of SVG.
  // Each petal is an Animated.View circle absolutely positioned.

  return (
    <Animated.View
      style={{
        width: size,
        height: size,
        transform: [{ scale: outerScale }, { rotate: rotateStr }],
        opacity: opacityAnim,
      }}
    >
      {/* Orbit petals — JS-driven position via translateX/translateY */}
      {CIRCLES.map((c, i) => {
        const tx = orbitSpread.interpolate({
          inputRange: [0, 1],
          outputRange: [0, c.cos * orbitFull],
        });
        const ty = orbitSpread.interpolate({
          inputRange: [0, 1],
          outputRange: [0, c.sin * orbitFull],
        });
        return (
          <Animated.View
            key={i}
            style={{
              position: 'absolute',
              width: R * 2,
              height: R * 2,
              borderRadius: R,
              backgroundColor: color,
              opacity: 0.38,
              borderWidth: 1.5,
              borderColor: color,
              left: cx - R,
              top: cy - R,
              transform: [{ translateX: tx }, { translateY: ty }],
            }}
          />
        );
      })}

      {/* Center circle — always visible, slightly brighter */}
      <View
        style={{
          position: 'absolute',
          width: R * 1.4,
          height: R * 1.4,
          borderRadius: R * 0.7,
          backgroundColor: color,
          opacity: 0.62,
          left: cx - R * 0.7,
          top: cy - R * 0.7,
        }}
      />
      {/* Bright core */}
      <View
        style={{
          position: 'absolute',
          width: R * 0.6,
          height: R * 0.6,
          borderRadius: R * 0.3,
          backgroundColor: color,
          opacity: 0.90,
          left: cx - R * 0.3,
          top: cy - R * 0.3,
        }}
      />
    </Animated.View>
  );
}
