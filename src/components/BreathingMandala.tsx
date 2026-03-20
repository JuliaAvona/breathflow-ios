import React, { useEffect, useRef } from 'react';
import { Animated, Easing, View } from 'react-native';
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

// ─── Cosine lookup for perfectly smooth IDLE loop ───────────────────────────
// A linear 0→1 animation fed through these tables creates a cosine wave:
// derivative is 0 at both t=0 and t=1, so the loop restart is invisible.
const COS_STEPS = 32;
const COS_INPUT = Array.from({ length: COS_STEPS + 1 }, (_, i) => i / COS_STEPS);
function cosineRange(from: number, to: number) {
  return COS_INPUT.map(t => from + (to - from) * (1 - Math.cos(2 * Math.PI * t)) / 2);
}
const IDLE_SCALE_OUT   = cosineRange(0.72, 0.90);
const IDLE_OPACITY_OUT = cosineRange(0.65, 0.90);
const IDLE_ORBIT_OUT   = cosineRange(0.60, 0.80);

// Slow + full-collapse variant: orbit goes 0→0.88→0 (true circle ↔ flower)
const IDLE_ORBIT_SLOW  = cosineRange(0.0, 0.88);
const IDLE_SCALE_SLOW  = cosineRange(0.68, 0.95);

type AnyPhase = TimerPhase | PowerBreathingPhase | KapalabhatiPhase | 'IDLE';

interface Props {
  phase?: AnyPhase;
  mode?: string;
  color: string;
  size?: number;
  phaseDuration?: number;
  bright?: boolean;
  slow?: boolean;
}

export function BreathingMandala({
  phase = 'IDLE',
  mode = 'standard',
  size = 240,
  phaseDuration,
  bright = false,
  slow = false,
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
  // --- Single linear value for smooth cosine IDLE loop ---
  const breathCycle = useRef(new Animated.Value(0)).current;

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
      startRotation(slow ? 24000 : 14000);
      breathCycle.setValue(0);
      const loop = Animated.loop(
        Animated.timing(breathCycle, {
          toValue: 1,
          duration: slow ? 8800 : 5600,
          easing: Easing.linear,
          useNativeDriver: true,
        }),
      );
      loop.start();
      return () => loop.stop();
    }

    if (phase === 'PAUSED' || phase === 'DONE') {
      startRotation(18000);
      Animated.parallel([
        Animated.timing(outerScale,  { toValue: 0.82, duration: 600, easing: BREATH_EASING, useNativeDriver: true }),
        Animated.timing(orbitSpread, { toValue: 0.70, duration: 600, easing: BREATH_EASING, useNativeDriver: true }),
        Animated.timing(opacityAnim, { toValue: 0.75, duration: 600, useNativeDriver: true }),
      ]).start();
      return;
    }

    if (mode === 'standard') {
      if (phase === 'INHALE') {
        startRotation(9000); // faster on inhale
        Animated.parallel([
          Animated.timing(outerScale,  { toValue: 1.06, duration: dur, easing: BREATH_EASING, useNativeDriver: true }),
          Animated.timing(orbitSpread, { toValue: 1.0,  duration: dur, easing: BREATH_EASING, useNativeDriver: true }),
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
          Animated.timing(orbitSpread, { toValue: 0.0,  duration: dur, easing: BREATH_EASING, useNativeDriver: true }),
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
              Animated.timing(orbitSpread, { toValue: 1.0,  duration: 320, easing: Easing.inOut(Easing.quad), useNativeDriver: true }),
              Animated.timing(opacityAnim, { toValue: 1.0,  duration: 320, useNativeDriver: true }),
            ]),
            Animated.parallel([
              Animated.timing(outerScale,  { toValue: 0.70, duration: 320, easing: Easing.inOut(Easing.quad), useNativeDriver: true }),
              Animated.timing(orbitSpread, { toValue: 0.0,  duration: 320, easing: Easing.inOut(Easing.quad), useNativeDriver: true }),
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
          Animated.timing(orbitSpread, { toValue: 0.0,  duration: 900, easing: BREATH_EASING, useNativeDriver: true }),
          Animated.timing(opacityAnim, { toValue: 0.48, duration: 900, useNativeDriver: true }),
        ]).start();
      } else if (phase === 'RECOVERY') {
        startRotation(9000);
        Animated.parallel([
          Animated.timing(outerScale,  { toValue: 1.1,  duration: 1600, easing: BREATH_EASING, useNativeDriver: true }),
          Animated.timing(orbitSpread, { toValue: 1.0,  duration: 1600, easing: BREATH_EASING, useNativeDriver: true }),
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
              Animated.timing(orbitSpread, { toValue: 1.0,  duration: 160, easing: Easing.out(Easing.quad), useNativeDriver: true }),
            ]),
            Animated.parallel([
              Animated.timing(outerScale,  { toValue: 0.75, duration: 160, easing: Easing.in(Easing.quad), useNativeDriver: true }),
              Animated.timing(orbitSpread, { toValue: 0.0,  duration: 160, easing: Easing.in(Easing.quad), useNativeDriver: true }),
            ]),
          ]),
        );
        loop.start();
        return () => loop.stop();
      } else if (phase === 'REST') {
        startRotation(16000);
        Animated.parallel([
          Animated.timing(outerScale,  { toValue: 0.82, duration: 600, easing: BREATH_EASING, useNativeDriver: true }),
          Animated.timing(orbitSpread, { toValue: 0.65, duration: 600, easing: BREATH_EASING, useNativeDriver: true }),
          Animated.timing(opacityAnim, { toValue: 0.75, duration: 600, useNativeDriver: true }),
        ]).start();
      }
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [phase, mode, phaseDuration]);

  // ── Render ─────────────────────────────────────────────────────────────────
  const cx = size / 2;
  const cy = size / 2;
  const R = size * 0.30;
  const orbitFull = size * 0.30;

  const isIdle = phase === 'IDLE' || phase === 'READY';

  const idleOpacityOut = bright ? cosineRange(0.88, 1.0) : IDLE_OPACITY_OUT;
  const idleScaleOut   = slow ? IDLE_SCALE_SLOW : IDLE_SCALE_OUT;
  const idleOrbitOut   = slow ? IDLE_ORBIT_SLOW : IDLE_ORBIT_OUT;

  // For IDLE: derive all values from the single cosine-wave breathCycle.
  // For active phases: use the per-phase outerScale/orbitSpread/opacityAnim.
  const renderScale   = isIdle ? breathCycle.interpolate({ inputRange: COS_INPUT, outputRange: idleScaleOut }) : outerScale;
  const renderOpacity = isIdle ? breathCycle.interpolate({ inputRange: COS_INPUT, outputRange: idleOpacityOut }) : opacityAnim;

  return (
    <Animated.View
      style={{
        width: size,
        height: size,
        transform: [{ scale: renderScale }, { rotate: rotateStr }],
        opacity: renderOpacity,
      }}
    >
      {/* Orbit petals */}
      {CIRCLES.map((c, i) => {
        const tx = isIdle
          ? breathCycle.interpolate({ inputRange: COS_INPUT, outputRange: idleOrbitOut.map(v => v * c.cos * orbitFull) })
          : orbitSpread.interpolate({ inputRange: [0, 1], outputRange: [0, c.cos * orbitFull] });
        const ty = isIdle
          ? breathCycle.interpolate({ inputRange: COS_INPUT, outputRange: idleOrbitOut.map(v => v * c.sin * orbitFull) })
          : orbitSpread.interpolate({ inputRange: [0, 1], outputRange: [0, c.sin * orbitFull] });
        return (
          <Animated.View
            key={i}
            style={{
              position: 'absolute',
              width: R * 2,
              height: R * 2,
              borderRadius: R,
              backgroundColor: bright ? 'rgba(255, 255, 255, 0.42)' : 'rgba(255, 255, 255, 0.25)',
              opacity: bright ? 0.85 : 0.6,
              borderWidth: 0.2,
              borderColor: bright ? 'rgba(255,255,255,0.80)' : 'rgba(255,255,255,0.55)',
              left: cx - R,
              top: cy - R,
              transform: [{ translateX: tx }, { translateY: ty }],
            }}
          />
        );
      })}

      {/* Center circle */}
      <View
        style={{
          position: 'absolute',
          width: R * 1.4,
          height: R * 1.4,
          borderRadius: R * 0.7,
          backgroundColor: 'rgba(255,255,255,0.28)',
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
          backgroundColor: 'rgba(255,255,255,0.70)',
          left: cx - R * 0.3,
          top: cy - R * 0.3,
        }}
      />
    </Animated.View>
  );
}
