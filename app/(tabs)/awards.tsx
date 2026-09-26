import React, { useMemo } from 'react';
import { View, Text, ScrollView, StyleSheet, ImageBackground } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import { useTranslation } from 'react-i18next';
import { useBadgesStore, useSettingsStore } from '../../src/store';
import { BadgeGrid } from '../../src/components/BadgeGrid';
import { ProUpgradeBanner } from '../../src/components/ProUpgradeBanner';
import { useThemeColors } from '../../src/hooks/useColorScheme';
import { SPACING, FONT_SIZE, BADGE_DEFINITIONS, FONTS } from '../../src/constants';
import type { BadgeCategory } from '../../src/constants';

// Must match the same constant in history.tsx and settings.tsx — the three
// screens share bg_focus.webp as a hero background, and resizeMode="cover"
// crops differently per container height. Keeping this identical everywhere
// stops the photo from visibly "jumping" to a different crop when switching tabs.
const HERO_CONTENT_HEIGHT = 100;

export default function AwardsScreen() {
  const { t } = useTranslation();
  const theme = useThemeColors();
  const insets = useSafeAreaInsets();

  const unlockedBadges = useBadgesStore((s) => s.unlockedBadges);
  const isPro = useSettingsStore((s) => s.isPro);

  const allBadges = useMemo(
    () =>
      BADGE_DEFINITIONS.map((def) => ({
        id: def.id,
        nameKey: def.nameKey,
        descriptionKey: def.descriptionKey,
        icon: def.icon,
        category: def.category as BadgeCategory,
        isPro: def.isPro,
      })),
    [],
  );

  const totalCount = allBadges.length;
  const unlockedCount = useMemo(
    () => (isPro ? allBadges.filter((b) => unlockedBadges.some((u) => u.badgeId === b.id)).length : 0),
    [allBadges, unlockedBadges, isPro],
  );

  return (
    <View style={[styles.container, { backgroundColor: theme.background }]}>
      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.scrollContent}>
        {/* Hero — summit photo doubles as the "reaching the top" metaphor for awards */}
        <ImageBackground
          source={require('../../assets/bg_focus.webp')}
          resizeMode="cover"
          style={[styles.hero, { paddingTop: insets.top + SPACING.sm, height: insets.top + HERO_CONTENT_HEIGHT }]}
        >
          {/* 4 stops (vs. the default 3 evenly-spaced ones) so the fade to
              solid theme.background happens gradually across the hero's
              full height instead of mostly in its last 50% — that's what
              was reading as an abrupt cut against the image in light mode.
              Keep in sync with the same gradient in history.tsx/settings.tsx. */}
          <LinearGradient
            colors={
              theme.isDark
                ? ['#000000AA', '#00000055', `${theme.background}CC`, `${theme.background}FF`]
                : ['#00000077', '#00000033', `${theme.background}99`, `${theme.background}FF`]
            }
            locations={[0, 0.35, 0.7, 1]}
            start={{ x: 0.5, y: 0 }}
            end={{ x: 0.5, y: 1 }}
            style={StyleSheet.absoluteFill}
          />
          <Text style={styles.heroTitle}>{t('badges.title')}</Text>
          <Text style={styles.heroSubtitle}>
            {unlockedCount} / {totalCount} {t('badges.unlocked')}
          </Text>
        </ImageBackground>

        {/* PRO upsell — the whole feature is Pro-only */}
        {!isPro && <ProUpgradeBanner />}

        {/* All badges — one flat grid, no category sections */}
        <View style={[styles.badgesCard, { backgroundColor: theme.card }]}>
          <BadgeGrid badges={allBadges} unlockedBadges={unlockedBadges} isPro={isPro} />
        </View>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  scrollContent: { paddingBottom: SPACING.xxl + SPACING.lg },

  // Hero
  hero: {
    paddingHorizontal: SPACING.lg,
    paddingBottom: SPACING.xxl,
    marginBottom: SPACING.md,
    overflow: 'hidden',
  },
  heroTitle: {
    fontSize: 30,
    fontFamily: FONTS.heavy,
    color: '#FFFFFF',
    letterSpacing: -0.5,
  },
  heroSubtitle: {
    fontSize: FONT_SIZE.md,
    fontFamily: FONTS.medium,
    color: 'rgba(255,255,255,0.8)',
    marginTop: 2,
  },

  badgesCard: {
    marginHorizontal: SPACING.lg,
    paddingTop: SPACING.md,
    paddingBottom: SPACING.sm,
    borderRadius: 24,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.03,
    shadowRadius: 8,
    elevation: 2,
  },
});
