import React from 'react';
import { StyleSheet, View } from 'react-native';
import type { BreathingShape } from '../types';

/**
 * Lightweight static shape previews for the home-screen technique cards.
 *
 * These render plain View elements with no Animated values, useEffect hooks,
 * or animation loops — eliminating the performance cost of running 10+
 * concurrent animations on the home screen.
 *
 * Each shape mirrors the resting-state visual of its animated counterpart
 * (scale = 1, default opacity) so the appearance is consistent.
 */

interface Props {
  shape: BreathingShape;
  color: string;
  size?: number;
}

// ─── Circle ──────────────────────────────────────────────────────────────────
const CIRCLE_SIZE = 220;

function StaticCircle({ color }: { color: string }) {
  return (
    <View style={circleStyles.wrapper}>
      <View style={[circleStyles.circle, { backgroundColor: color }]} />
    </View>
  );
}

const circleStyles = StyleSheet.create({
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
    opacity: 0.75,
  },
});

// ─── Square ──────────────────────────────────────────────────────────────────
const SQUARE_SIZE = 180;
const SQUARE_BR = 24;

function StaticSquare({ color }: { color: string }) {
  return (
    <View style={squareStyles.container}>
      <View style={[squareStyles.glow, { backgroundColor: color }]} />
      <View style={[squareStyles.shape, { backgroundColor: color }]} />
    </View>
  );
}

const squareStyles = StyleSheet.create({
  container: {
    width: SQUARE_SIZE,
    height: SQUARE_SIZE,
    justifyContent: 'center',
    alignItems: 'center',
  },
  glow: {
    position: 'absolute',
    width: SQUARE_SIZE * 0.85,
    height: SQUARE_SIZE * 0.85,
    borderRadius: SQUARE_BR + 4,
    opacity: 0.3,
  },
  shape: {
    width: SQUARE_SIZE * 0.75,
    height: SQUARE_SIZE * 0.75,
    borderRadius: SQUARE_BR,
    opacity: 0.85,
  },
});

// ─── Triangle ────────────────────────────────────────────────────────────────
const TRI_SIZE = 200;

function StaticTriangle({ color }: { color: string }) {
  return (
    <View style={triStyles.container}>
      <View style={[triStyles.petal, { backgroundColor: color, transform: [{ rotate: '0deg' }] }]} />
      <View style={[triStyles.petal, { backgroundColor: color, transform: [{ rotate: '120deg' }] }]} />
      <View style={[triStyles.petal, { backgroundColor: color, transform: [{ rotate: '240deg' }] }]} />
    </View>
  );
}

const triStyles = StyleSheet.create({
  container: {
    width: TRI_SIZE,
    height: TRI_SIZE,
    alignItems: 'center',
    justifyContent: 'center',
  },
  petal: {
    position: 'absolute',
    width: TRI_SIZE * 0.58,
    height: TRI_SIZE * 0.58,
    borderRadius: TRI_SIZE * 0.12,
    top: TRI_SIZE * 0.06,
    alignSelf: 'center',
    opacity: 0.8,
  },
});

// ─── Wave ────────────────────────────────────────────────────────────────────
const WAVE_SIZE = 200;

function StaticWave({ color }: { color: string }) {
  return (
    <View style={waveStyles.container}>
      <View style={[waveStyles.blob1, { backgroundColor: color }]} />
      <View style={[waveStyles.blob2, { backgroundColor: color }]} />
      <View style={[waveStyles.blob3, { backgroundColor: color }]} />
    </View>
  );
}

const waveStyles = StyleSheet.create({
  container: {
    width: WAVE_SIZE,
    height: WAVE_SIZE,
    alignItems: 'center',
    justifyContent: 'center',
  },
  blob1: {
    position: 'absolute',
    width: WAVE_SIZE * 0.85,
    height: WAVE_SIZE * 0.65,
    borderRadius: 999,
    opacity: 0.45,
  },
  blob2: {
    position: 'absolute',
    width: WAVE_SIZE * 0.7,
    height: WAVE_SIZE * 0.7,
    borderRadius: 999,
    opacity: 0.6,
  },
  blob3: {
    position: 'absolute',
    width: WAVE_SIZE * 0.55,
    height: WAVE_SIZE * 0.55,
    borderRadius: 999,
    opacity: 0.85,
  },
});

// ─── Burst ───────────────────────────────────────────────────────────────────
const BURST_SIZE = 200;
const DOT_COUNT = 8;

function StaticBurst({ color }: { color: string }) {
  const baseRadius = BURST_SIZE * 0.28;
  const dots = Array.from({ length: DOT_COUNT }, (_, i) => {
    const angle = (i / DOT_COUNT) * 2 * Math.PI;
    const x = Math.cos(angle) * baseRadius;
    const y = Math.sin(angle) * baseRadius;
    return (
      <View
        key={i}
        style={[
          burstStyles.dot,
          {
            backgroundColor: color,
            transform: [{ translateX: x }, { translateY: y }],
          },
        ]}
      />
    );
  });

  return (
    <View style={burstStyles.container}>
      <View style={[burstStyles.core, { backgroundColor: color }]} />
      {dots}
    </View>
  );
}

const burstStyles = StyleSheet.create({
  container: {
    width: BURST_SIZE,
    height: BURST_SIZE,
    alignItems: 'center',
    justifyContent: 'center',
  },
  core: {
    width: BURST_SIZE * 0.4,
    height: BURST_SIZE * 0.4,
    borderRadius: BURST_SIZE * 0.2,
    opacity: 0.7,
  },
  dot: {
    position: 'absolute',
    width: BURST_SIZE * 0.12,
    height: BURST_SIZE * 0.12,
    borderRadius: BURST_SIZE * 0.06,
    opacity: 0.55,
  },
});

// ─── Oval ────────────────────────────────────────────────────────────────────
const OVAL_W = 160;
const OVAL_H = 210;

function StaticOval({ color }: { color: string }) {
  return <View style={[ovalStyles.shape, { backgroundColor: color }]} />;
}

const ovalStyles = StyleSheet.create({
  shape: {
    width: OVAL_W,
    height: OVAL_H,
    borderRadius: OVAL_W / 2,
    opacity: 0.8,
  },
});

// ─── Exported composite component ────────────────────────────────────────────

export const StaticShapePreview = React.memo(function StaticShapePreview({
  shape,
  color,
}: Props) {
  switch (shape) {
    case 'square':
      return <StaticSquare color={color} />;
    case 'triangle':
      return <StaticTriangle color={color} />;
    case 'wave':
      return <StaticWave color={color} />;
    case 'burst':
      return <StaticBurst color={color} />;
    case 'oval':
      return <StaticOval color={color} />;
    case 'circle':
    default:
      return <StaticCircle color={color} />;
  }
});
