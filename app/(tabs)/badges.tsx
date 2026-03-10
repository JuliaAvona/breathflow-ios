import React, { useMemo } from 'react';
import { View, Text, ScrollView, StyleSheet } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import { useTranslation } from 'react-i18next';
import { Ionicons } from '@expo/vector-icons';
import { useBadgesStore, useSessionsStore } from '../../src/store';
import { BadgeGrid } from '../../src/components/BadgeGrid';
import { useThemeColors } from '../../src/hooks/useColorScheme';
import { SPACING, FONT_SIZE, BORDER_RADIUS, BADGE_CATEGORY_COLORS, BADGE_DEFINITIONS, FONTS, scale, COLORS } from '../../src/constants';
import type { BadgeCategory } from '../../src/constants';

const CATEGORIES: {
  key: BadgeCategory;
  labelKey: string;
  icon: keyof typeof Ionicons.glyphMap;
}[] = [
  { key: 'sessions', labelKey: 'badges.categorySessions', icon: 'leaf-outline' },
  { key: 'streak', labelKey: 'badges.categoryStreaks', icon: 'flame-outline' },
  { key: 'minutes', labelKey: 'badges.categoryMinutes', icon: 'time-outline' },
  { key: 'retention', labelKey: 'badges.categoryRetention', icon: 'fitness-outline' },
  { key: 'exploration', labelKey: 'badges.categoryExploration', icon: 'compass-outline' },
  { key: 'special', labelKey: 'badges.categorySpecial', icon: 'star-outline' },
];

export default function AwardsScreen() {
  const { t } = useTranslation();
  const theme = useThemeColors();
  const insets = useSafeAreaInsets();

  const stats = useSessionsStore((s) => s.stats);
  const unlockedBadges = useBadgesStore((s) => s.unlockedBadges);

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

  const isUnlocked = (badgeId: string) =>
    unlockedBadges.some((u) => u.badgeId === badgeId);

  const unlockedCount = allBadges.filter((b) => isUnlocked(b.id)).length;
  const totalCount = allBadges.length;
  const progress = totalCount > 0 ? unlockedCount / totalCount : 0;
  const progressPercent = Math.round(progress * 100);

  // Group badges by category
  const grouped = useMemo(() => {
    const map: Record<BadgeCategory, typeof allBadges> = {
      sessions: [],
      streak: [],
      minutes: [],
      retention: [],
      exploration: [],
      special: [],
    };
    for (const b of allBadges) {
      map[b.category]?.push(b);
    }
    return map;
  }, [allBadges]);

  return (
    <View style={[styles.container, { backgroundColor: theme.background }]}>
      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.scrollContent}>
        {/* Gradient Hero */}
        <LinearGradient
          colors={[COLORS.primary, '#5BA0E8', theme.background]}
          locations={[0, 0.6, 1]}
          style={[styles.hero, { paddingTop: insets.top + SPACING.sm }]}
        >
          <Text style={styles.heroTitle}>{t('badges.title')}</Text>
          <Text style={styles.heroSubtitle}>
            {unlockedCount} / {totalCount} {t('badges.unlocked')}
          </Text>

          {/* Progress ring area */}
          <View style={styles.progressRingContainer}>
            <View style={styles.progressRingOuter}>
              <View style={[styles.progressRingTrack, { borderColor: 'rgba(255,255,255,0.2)' }]}>
                <View style={styles.progressRingInner}>
                  <Text style={styles.progressPercent}>{progressPercent}%</Text>
                </View>
              </View>
              {/* Filled arc overlay — simplified as a filled border segment */}
              <View
                style={[
                  styles.progressArc,
                  {
                    borderColor: '#FFFFFF',
                    borderTopColor: progress >= 0.25 ? '#FFFFFF' : 'transparent',
                    borderRightColor: progress >= 0.5 ? '#FFFFFF' : 'transparent',
                    borderBottomColor: progress >= 0.75 ? '#FFFFFF' : 'transparent',
                    borderLeftColor: progress >= 1 ? '#FFFFFF' : 'transparent',
                    transform: [{ rotate: '-90deg' }],
                  },
                ]}
              />
            </View>
          </View>

          {/* Stats row */}
          <View style={styles.heroStatsRow}>
            {CATEGORIES.slice(0, 3).map((cat, idx) => {
              const badges = grouped[cat.key];
              const catUnlocked = badges?.filter((b) => isUnlocked(b.id)).length ?? 0;
              const catTotal = badges?.length ?? 0;
              return (
                <React.Fragment key={cat.key}>
                  {idx > 0 && <View style={styles.statDivider} />}
                  <View style={styles.heroStat}>
                    <Ionicons name={cat.icon} size={scale(16)} color="rgba(255,255,255,0.8)" />
                    <Text style={styles.heroStatValue}>{catUnlocked}/{catTotal}</Text>
                    <Text style={styles.heroStatLabel}>{t(cat.labelKey)}</Text>
                  </View>
                </React.Fragment>
              );
            })}
          </View>
        </LinearGradient>

        {/* Category sections */}
        {CATEGORIES.map((cat) => {
          const badges = grouped[cat.key];
          if (!badges || badges.length === 0) return null;

          const catColors = BADGE_CATEGORY_COLORS[cat.key];
          const catUnlocked = badges.filter((b) => isUnlocked(b.id)).length;
          const catTotal = badges.length;
          const catProgress = catTotal > 0 ? catUnlocked / catTotal : 0;

          return (
            <View key={cat.key} style={styles.section}>
              {/* Section header */}
              <View style={styles.sectionHeader}>
                <View style={styles.sectionHeaderLeft}>
                  <View style={[styles.categoryIcon, { backgroundColor: catColors.iconBg }]}>
                    <Ionicons name={cat.icon} size={scale(16)} color={catColors.color} />
                  </View>
                  <Text style={[styles.sectionTitle, { color: theme.text }]}>
                    {t(cat.labelKey)}
                  </Text>
                </View>
                <Text style={[styles.sectionCount, { color: theme.textSecondary }]}>
                  {catUnlocked}/{catTotal}
                </Text>
              </View>

              {/* Progress bar */}
              <View style={[styles.progressBar, { backgroundColor: theme.isDark ? 'rgba(255,255,255,0.06)' : 'rgba(0,0,0,0.04)' }]}>
                <View
                  style={[
                    styles.progressBarFill,
                    {
                      width: `${catProgress * 100}%`,
                      backgroundColor: catColors.color,
                    },
                  ]}
                />
              </View>

              {/* Badge grid card */}
              <View style={[styles.badgesCard, { backgroundColor: theme.card }]}>
                <BadgeGrid badges={badges} unlockedBadges={unlockedBadges} />
              </View>
            </View>
          );
        })}
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

  // Progress ring
  progressRingContainer: {
    alignItems: 'center',
    marginTop: SPACING.lg,
    marginBottom: SPACING.lg,
  },
  progressRingOuter: {
    width: scale(100),
    height: scale(100),
    alignItems: 'center',
    justifyContent: 'center',
  },
  progressRingTrack: {
    width: scale(100),
    height: scale(100),
    borderRadius: scale(50),
    borderWidth: 4,
    alignItems: 'center',
    justifyContent: 'center',
  },
  progressRingInner: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  progressPercent: {
    fontSize: 28,
    fontFamily: FONTS.bold,
    color: '#FFFFFF',
  },
  progressArc: {
    position: 'absolute',
    width: scale(100),
    height: scale(100),
    borderRadius: scale(50),
    borderWidth: 4,
  },

  // Hero stats
  heroStatsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(255,255,255,0.15)',
    borderRadius: BORDER_RADIUS.xl,
    paddingVertical: SPACING.sm,
    paddingHorizontal: SPACING.md,
  },
  heroStat: {
    flex: 1,
    alignItems: 'center',
    gap: 2,
  },
  heroStatValue: {
    fontSize: FONT_SIZE.md,
    fontFamily: FONTS.bold,
    color: '#FFFFFF',
  },
  heroStatLabel: {
    fontSize: 11,
    fontFamily: FONTS.medium,
    color: 'rgba(255,255,255,0.7)',
  },
  statDivider: {
    width: 1,
    height: scale(30),
    backgroundColor: 'rgba(255,255,255,0.2)',
  },

  // Category sections
  section: {
    marginBottom: SPACING.lg,
  },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: SPACING.lg,
    marginBottom: SPACING.sm,
  },
  sectionHeaderLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING.sm,
  },
  categoryIcon: {
    width: scale(30),
    height: scale(30),
    borderRadius: scale(15),
    alignItems: 'center',
    justifyContent: 'center',
  },
  sectionTitle: {
    fontSize: FONT_SIZE.lg,
    fontFamily: FONTS.bold,
  },
  sectionCount: {
    fontSize: FONT_SIZE.sm,
    fontFamily: FONTS.semibold,
  },
  progressBar: {
    height: 4,
    borderRadius: 2,
    marginHorizontal: SPACING.lg,
    marginBottom: SPACING.sm,
    overflow: 'hidden',
  },
  progressBarFill: {
    height: 4,
    borderRadius: 2,
  },
  badgesCard: {
    marginHorizontal: SPACING.lg,
    paddingTop: SPACING.sm,
    paddingBottom: SPACING.xs,
    borderRadius: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.06,
    shadowRadius: 8,
    elevation: 2,
  },
});
