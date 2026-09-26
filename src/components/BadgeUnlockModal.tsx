import React, { useEffect, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Modal,
  Animated,
  Dimensions,
  Pressable,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTranslation } from 'react-i18next';
import { useThemeColors } from '../hooks/useColorScheme';
import { useHaptics } from '../hooks/useHaptics';
import { useReducedMotion } from '../hooks/useReducedMotion';
import { SPACING, FONT_SIZE, BORDER_RADIUS, BADGE_CATEGORY_COLORS } from '../constants';
import { Badge } from '../types';
import { ConfettiOverlay } from './ConfettiOverlay';

interface BadgeUnlockModalProps {
  badge: Badge | null;
  visible: boolean;
  onClose: () => void;
}

const { width: SCREEN_WIDTH } = Dimensions.get('window');
const BADGE_SIZE = SCREEN_WIDTH * 0.38;
const GLOW_SIZE = BADGE_SIZE + 40;

export function BadgeUnlockModal({ badge, visible, onClose }: BadgeUnlockModalProps) {
  const { t } = useTranslation();
  const theme = useThemeColors();
  const { success } = useHaptics();
  const reduceMotion = useReducedMotion();
  // AccessibilityInfo.isReduceMotionEnabled() resolves asynchronously; reading
  // it via a ref (instead of putting it in the entrance effect's deps) means a
  // late resolution doesn't re-run the whole one-shot entrance sequence below
  // — which would replay the unlock haptic and restart every animation mid-flight.
  const reduceMotionRef = useRef(reduceMotion);
  useEffect(() => { reduceMotionRef.current = reduceMotion; }, [reduceMotion]);

  const overlayFade = useRef(new Animated.Value(0)).current;
  const badgeScale = useRef(new Animated.Value(0)).current;
  const glowPulse = useRef(new Animated.Value(0.4)).current;
  const titleFade = useRef(new Animated.Value(0)).current;
  const titleSlide = useRef(new Animated.Value(20)).current;
  const nameFade = useRef(new Animated.Value(0)).current;
  const nameSlide = useRef(new Animated.Value(15)).current;
  const descFade = useRef(new Animated.Value(0)).current;
  const tapFade = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    if (visible && badge) {
      success();

      // Reset all values
      overlayFade.setValue(0);
      badgeScale.setValue(0);
      glowPulse.setValue(0.4);
      titleFade.setValue(0);
      titleSlide.setValue(20);
      nameFade.setValue(0);
      nameSlide.setValue(15);
      descFade.setValue(0);
      tapFade.setValue(0);

      // Staggered entrance
      Animated.sequence([
        // 1. Overlay fade in
        Animated.timing(overlayFade, {
          toValue: 1,
          duration: 250,
          useNativeDriver: true,
        }),
        // 2. Badge bounce in
        Animated.spring(badgeScale, {
          toValue: 1,
          tension: 65,
          friction: 7,
          useNativeDriver: true,
        }),
        // 3. Title appears
        Animated.parallel([
          Animated.timing(titleFade, { toValue: 1, duration: 250, useNativeDriver: true }),
          Animated.timing(titleSlide, { toValue: 0, duration: 250, useNativeDriver: true }),
        ]),
        // 4. Name appears
        Animated.parallel([
          Animated.timing(nameFade, { toValue: 1, duration: 200, useNativeDriver: true }),
          Animated.timing(nameSlide, { toValue: 0, duration: 200, useNativeDriver: true }),
        ]),
        // 5. Description + tap hint
        Animated.parallel([
          Animated.timing(descFade, { toValue: 1, duration: 200, useNativeDriver: true }),
          Animated.timing(tapFade, { toValue: 1, duration: 300, useNativeDriver: true }),
        ]),
      ]).start();

      // Glow pulse loop — purely decorative, so skip it for Reduce Motion users
      // and hold the ring at a fixed, still-visible opacity instead.
      if (reduceMotionRef.current) {
        glowPulse.setValue(0.6);
        return;
      }

      const pulseLoop = Animated.loop(
        Animated.sequence([
          Animated.timing(glowPulse, {
            toValue: 0.8,
            duration: 1200,
            useNativeDriver: true,
          }),
          Animated.timing(glowPulse, {
            toValue: 0.4,
            duration: 1200,
            useNativeDriver: true,
          }),
        ]),
      );
      pulseLoop.start();

      return () => pulseLoop.stop();
    }
    // reduceMotion intentionally excluded — see reduceMotionRef comment above.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [visible, badge]);

  const handleClose = () => {
    Animated.parallel([
      Animated.timing(badgeScale, { toValue: 0.8, duration: 150, useNativeDriver: true }),
      Animated.timing(overlayFade, { toValue: 0, duration: 200, useNativeDriver: true }),
    ]).start(() => {
      onClose();
    });
  };

  if (!badge) return null;

  const category = badge.category;
  const catColors = BADGE_CATEGORY_COLORS[category] ?? BADGE_CATEGORY_COLORS.sessions;
  const glowColor = catColors.color;

  return (
    <Modal
      visible={visible}
      transparent
      animationType="none"
      onRequestClose={handleClose}
    >
      <Pressable style={styles.pressableOverlay} onPress={handleClose}>
        <Animated.View
          accessibilityViewIsModal
          style={[styles.overlay, { opacity: overlayFade }]}
        >
          {/* Confetti */}
          <ConfettiOverlay visible={visible} />

          {/* Card */}
          <Animated.View
            style={[
              styles.container,
              {
                backgroundColor: theme.card,
                transform: [{ scale: badgeScale }],
              },
            ]}
          >
            {/* Headline */}
            <Animated.View style={{ opacity: titleFade, transform: [{ translateY: titleSlide }] }}>
              <Text style={[styles.headline, { color: theme.primary }]} numberOfLines={1} adjustsFontSizeToFit>
                {t('badges.unlocked')}
              </Text>
            </Animated.View>

            {/* Badge with glow ring */}
            <View style={styles.badgeWrapper}>
              <Animated.View
                style={[
                  styles.glowRing,
                  {
                    borderColor: glowColor,
                    opacity: glowPulse,
                    shadowColor: glowColor,
                  },
                ]}
              />
              <Ionicons
                name={badge.icon as keyof typeof Ionicons.glyphMap}
                size={BADGE_SIZE * 0.6}
                color={glowColor}
              />
            </View>

            {/* Badge name */}
            <Animated.View style={{ opacity: nameFade, transform: [{ translateY: nameSlide }] }}>
              <Text style={[styles.badgeName, { color: theme.text }]} numberOfLines={2} adjustsFontSizeToFit minimumFontScale={0.7}>
                {t(badge.nameKey)}
              </Text>
            </Animated.View>

            {/* Description */}
            <Animated.View style={{ opacity: descFade }}>
              <Text style={[styles.description, { color: theme.textSecondary }]} numberOfLines={3} adjustsFontSizeToFit minimumFontScale={0.75}>
                {t(badge.descriptionKey)}
              </Text>
            </Animated.View>
          </Animated.View>

          {/* Tap to continue */}
          <Animated.View style={{ opacity: tapFade }}>
            <Text style={styles.tapHint} numberOfLines={1} adjustsFontSizeToFit>
              {t('badges.tapToContinue')}
            </Text>
          </Animated.View>
        </Animated.View>
      </Pressable>
    </Modal>
  );
}

const styles = StyleSheet.create({
  pressableOverlay: {
    flex: 1,
  },
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.75)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  container: {
    width: SCREEN_WIDTH * 0.85,
    paddingTop: SPACING.xl,
    paddingBottom: SPACING.xxl,
    paddingHorizontal: SPACING.xl,
    borderRadius: BORDER_RADIUS.xl,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.3,
    shadowRadius: 20,
    elevation: 10,
  },
  headline: {
    fontSize: FONT_SIZE.sm,
    fontWeight: '700',
    textTransform: 'uppercase',
    letterSpacing: 2,
    marginBottom: SPACING.lg,
  },
  badgeWrapper: {
    width: GLOW_SIZE,
    height: GLOW_SIZE,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: SPACING.lg,
  },
  glowRing: {
    position: 'absolute',
    width: GLOW_SIZE,
    height: GLOW_SIZE,
    borderRadius: GLOW_SIZE / 2,
    borderWidth: 3,
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.6,
    shadowRadius: 20,
    elevation: 8,
  },
  badgeImage: {
    width: BADGE_SIZE,
    height: BADGE_SIZE,
  },
  badgeName: {
    fontSize: FONT_SIZE.xl,
    fontWeight: '800',
    textAlign: 'center',
    marginBottom: SPACING.sm,
  },
  description: {
    fontSize: FONT_SIZE.md,
    textAlign: 'center',
    lineHeight: 22,
  },
  tapHint: {
    fontSize: FONT_SIZE.sm,
    color: 'rgba(255,255,255,0.5)',
    marginTop: SPACING.xl,
    fontWeight: '500',
  },
});
