import React, { useEffect, useRef, useMemo } from 'react';
import { Animated, StyleSheet, Dimensions, View } from 'react-native';
import { useReducedMotion } from '../hooks/useReducedMotion';

const { width: SCREEN_WIDTH, height: SCREEN_HEIGHT } = Dimensions.get('window');
const CONFETTI_COUNT = 40;
const CONFETTI_COLORS = ['#D85E43', '#5BA4C8', '#F0C040', '#7BC97F', '#E88B73', '#B07FD0'];

interface ConfettiOverlayProps {
  visible: boolean;
  onComplete?: () => void;
}

interface Piece {
  x: number;
  color: string;
  size: number;
  rotation: number;
}

export function ConfettiOverlay({ visible, onComplete }: ConfettiOverlayProps) {
  const reduceMotion = useReducedMotion();
  const animValue = useRef(new Animated.Value(0)).current;

  const pieces: Piece[] = useMemo(
    () =>
      Array.from({ length: CONFETTI_COUNT }, () => ({
        x: Math.random() * SCREEN_WIDTH,
        color: CONFETTI_COLORS[Math.floor(Math.random() * CONFETTI_COLORS.length)],
        size: 6 + Math.random() * 6,
        rotation: Math.random() * 360,
      })),
    [],
  );

  useEffect(() => {
    if (!visible) return;
    if (reduceMotion) {
      // Skip the falling-confetti animation for Reduce Motion users; still
      // fire onComplete so callers relying on it (e.g. dismiss flows) proceed.
      onComplete?.();
      return;
    }
    animValue.setValue(0);
    Animated.timing(animValue, {
      toValue: 1,
      duration: 2200,
      useNativeDriver: true,
    }).start(() => onComplete?.());
  }, [visible, reduceMotion]);

  const interpolations = useMemo(
    () =>
      pieces.map((piece) => {
        const drift = (Math.random() - 0.5) * 80;
        const delay = Math.random() * 0.3;

        const translateY = animValue.interpolate({
          inputRange: [delay, Math.min(delay + 0.7, 1)],
          outputRange: [-20, SCREEN_HEIGHT + 20],
          extrapolate: 'clamp',
        });

        const translateX = animValue.interpolate({
          inputRange: [0, 1],
          outputRange: [0, drift],
        });

        const opacity = animValue.interpolate({
          inputRange: [0.7, 1],
          outputRange: [1, 0],
          extrapolate: 'clamp',
        });

        const rotate = animValue.interpolate({
          inputRange: [0, 1],
          outputRange: [`${piece.rotation}deg`, `${piece.rotation + 360}deg`],
        });

        return { translateY, translateX, opacity, rotate };
      }),
    [animValue, pieces],
  );

  if (!visible || reduceMotion) return null;

  return (
    <View style={styles.container} pointerEvents="none">
      {pieces.map((piece, i) => {
        const { translateY, translateX, opacity, rotate } = interpolations[i];

        return (
          <Animated.View
            key={i}
            style={[
              styles.piece,
              {
                left: piece.x,
                width: piece.size,
                height: piece.size * 1.4,
                backgroundColor: piece.color,
                borderRadius: piece.size * 0.2,
                opacity,
                transform: [{ translateY }, { translateX }, { rotate }],
              },
            ]}
          />
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    ...StyleSheet.absoluteFillObject,
    zIndex: 999,
  },
  piece: {
    position: 'absolute',
    top: -10,
  },
});
