import React, { useMemo } from 'react';
import { View, Text, ScrollView, StyleSheet } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import { useTranslation } from 'react-i18next';
import { useBadgesStore, useSettingsStore } from '../../src/store';
import { BadgeGrid } from '../../src/components/BadgeGrid';
import { ProUpgradeBanner } from '../../src/components/ProUpgradeBanner';
import { useThemeColors } from '../../src/hooks/useColorScheme';
import { SPACING, FONT_SIZE, BADGE_DEFINITIONS, FONTS } from '../../src/constants';
import type { BadgeCategory } from '../../src/constants';

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
        {/* Gradient Hero */}
        <LinearGradient
          colors={
            theme.isDark
              ? ['#2563EB', '#4A90D9', '#7FBFDF', theme.background]
              : ['#1E40AF', '#3B82F6', '#60A5FA', theme.background]
          }
          locations={[0, 0.3, 0.6, 1]}
          style={[styles.hero, { paddingTop: insets.top + SPACING.sm }]}
        >
          <Text style={styles.heroTitle}>{t('badges.title')}</Text>
          <Text style={styles.heroSubtitle}>
            {unlockedCount} / {totalCount} {t('badges.unlocked')}
          </Text>
        </LinearGradient>

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
    paddingBottom: SPACING.xl,
    marginBottom: SPACING.md,
  },
  heroTitle: {
    fontSize: 30,
    fontFamily: FONTS.bold,
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
