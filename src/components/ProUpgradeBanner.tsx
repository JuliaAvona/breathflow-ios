import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet, StyleProp, ViewStyle } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';
import { useTranslation } from 'react-i18next';
import { COLORS, SPACING, FONT_SIZE, BORDER_RADIUS, FONTS } from '../constants';

interface ProUpgradeBannerProps {
  /** Defaults to the shared "Upgrade to Pro" copy — override only if a screen genuinely needs different wording. */
  title?: string;
  subtitle?: string;
  icon?: keyof typeof Ionicons.glyphMap;
  onPress?: () => void;
  style?: StyleProp<ViewStyle>;
}

/**
 * The single "Upgrade to Pro" banner used everywhere in the app — same gold
 * gradient, breathing-ring motif, glossy highlight, icon + chevron badges,
 * AND the same title/subtitle copy by default. Reuse this instead of
 * hand-rolling another Pro upsell card or writing new marketing copy.
 */
export function ProUpgradeBanner({
  title,
  subtitle,
  icon = 'diamond',
  onPress,
  style,
}: ProUpgradeBannerProps) {
  const { t } = useTranslation();
  const resolvedTitle = title ?? t('settings.upgradePro');
  const resolvedSubtitle = subtitle ?? t('settings.proSubtitle');

  return (
    <TouchableOpacity
      style={[styles.wrapper, style]}
      activeOpacity={0.88}
      onPress={onPress ?? (() => router.push('/paywall'))}
      accessibilityLabel={resolvedTitle}
      accessibilityRole="button"
    >
      <LinearGradient
        colors={['#FFE066', '#FFC940', '#F5A623']}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={styles.card}
      >
        {/* Breathing rings — the app's own bloom motif, not a generic blur glow */}
        <View style={styles.rings} pointerEvents="none">
          <View style={styles.ring1} />
          <View style={styles.ring2} />
        </View>

        {/* Glossy top highlight */}
        <LinearGradient
          colors={['rgba(255,255,255,0.4)', 'rgba(255,255,255,0)']}
          start={{ x: 0, y: 0 }}
          end={{ x: 0, y: 1 }}
          style={styles.shine}
          pointerEvents="none"
        />

        <View style={styles.iconBadge}>
          <Ionicons name={icon} size={20} color={COLORS.black} />
        </View>

        <View style={styles.textContainer}>
          <Text style={styles.title}>{resolvedTitle}</Text>
          <Text style={styles.subtitle}>{resolvedSubtitle}</Text>
        </View>

        <View style={styles.chevronBadge}>
          <Ionicons name="chevron-forward" size={16} color={COLORS.black} />
        </View>
      </LinearGradient>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  wrapper: {
    marginHorizontal: SPACING.lg,
    marginBottom: SPACING.lg,
    borderRadius: BORDER_RADIUS.lg,
    shadowColor: '#E0940B',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.35,
    shadowRadius: 12,
    elevation: 6,
  },
  card: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: SPACING.md,
    borderRadius: BORDER_RADIUS.lg,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.5)',
  },
  shine: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    height: '55%',
  },
  rings: {
    position: 'absolute',
    top: -50,
    right: -50,
    width: 160,
    height: 160,
  },
  ring1: {
    position: 'absolute',
    top: 0,
    left: 0,
    width: 160,
    height: 160,
    borderRadius: 80,
    borderWidth: 1.5,
    borderColor: 'rgba(255,255,255,0.3)',
  },
  ring2: {
    position: 'absolute',
    top: 26,
    left: 26,
    width: 108,
    height: 108,
    borderRadius: 54,
    borderWidth: 1.5,
    borderColor: 'rgba(26,35,50,0.12)',
  },
  iconBadge: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: 'rgba(26,35,50,0.12)',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: SPACING.md,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.5)',
  },
  textContainer: {
    flex: 1,
  },
  title: {
    fontSize: FONT_SIZE.lg,
    fontFamily: FONTS.bold,
    color: COLORS.black,
    marginBottom: 2,
    letterSpacing: 0.2,
  },
  subtitle: {
    fontSize: FONT_SIZE.sm,
    color: 'rgba(26,35,50,0.72)',
  },
  chevronBadge: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: 'rgba(26,35,50,0.1)',
    alignItems: 'center',
    justifyContent: 'center',
    marginLeft: SPACING.sm,
  },
});
