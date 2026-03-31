import React, { useMemo } from 'react';
import { View, Text, ScrollView, StyleSheet, TouchableOpacity } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import { useTranslation } from 'react-i18next';
import { Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';
import Svg, { Circle } from 'react-native-svg';
import { useBadgesStore, useSessionsStore, useSettingsStore } from '../../src/store';
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

          {/* Progress ring — SVG with glow */}
          <View style={styles.progressRingContainer}>
            <View style={{
              alignItems: 'center',
              justifyContent: 'center',
              shadowColor: '#7BC4A8',
              shadowOpacity: 0.6,
              shadowRadius: 25,
              shadowOffset: { width: 0, height: 0 },
            }}>
              <Svg width={scale(140)} height={scale(140)}>
                {/* Track */}
                <Circle
                  cx={scale(70)}
                  cy={scale(70)}
                  r={scale(56)}
                  stroke="rgba(255,255,255,0.1)"
                  strokeWidth={10}
                  fill="none"
                />
                {/* Glow behind filled arc */}
                <Circle
                  cx={scale(70)}
                  cy={scale(70)}
                  r={scale(56)}
                  stroke="#7BC4A8"
                  strokeWidth={14}
                  fill="none"
                  strokeLinecap="round"
                  strokeDasharray={`${2 * Math.PI * scale(56)}`}
                  strokeDashoffset={`${2 * Math.PI * scale(56) * (1 - progress)}`}
                  transform={`rotate(-90 ${scale(70)} ${scale(70)})`}
                  opacity={0.2}
                />
                {/* Filled arc */}
                <Circle
                  cx={scale(70)}
                  cy={scale(70)}
                  r={scale(56)}
                  stroke="#7BC4A8"
                  strokeWidth={10}
                  fill="none"
                  strokeLinecap="round"
                  strokeDasharray={`${2 * Math.PI * scale(56)}`}
                  strokeDashoffset={`${2 * Math.PI * scale(56) * (1 - progress)}`}
                  transform={`rotate(-90 ${scale(70)} ${scale(70)})`}
                />
                {/* White highlight on top */}
                <Circle
                  cx={scale(70)}
                  cy={scale(70)}
                  r={scale(56)}
                  stroke="#FFFFFF"
                  strokeWidth={10}
                  fill="none"
                  strokeLinecap="round"
                  strokeDasharray={`${2 * Math.PI * scale(56)}`}
                  strokeDashoffset={`${2 * Math.PI * scale(56) * (1 - progress * 0.15)}`}
                  transform={`rotate(-90 ${scale(70)} ${scale(70)})`}
                  opacity={0.15}
                />
              </Svg>
              <View style={styles.progressRingInner}>
                <Text style={styles.progressPercent}>{progressPercent}</Text>
                <Text style={styles.progressPercentSign}>%</Text>
              </View>
            </View>
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
                <LinearGradient
                  colors={[catColors.color, catColors.color + 'AA']}
                  start={{ x: 0, y: 0 }}
                  end={{ x: 1, y: 0 }}
                  style={[
                    styles.progressBarFill,
                    { width: `${catProgress * 100}%` },
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
    shadowColor: '#FFFFFF',
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.3,
    shadowRadius: 20,
    elevation: 8,
  },
  progressRingTrack: {
    width: scale(100),
    height: scale(100),
    borderRadius: scale(50),
    borderWidth: 5,
    alignItems: 'center',
    justifyContent: 'center',
  },
  progressRingInner: {
    position: 'absolute',
    alignItems: 'center',
    justifyContent: 'center',
    flexDirection: 'row',
  },
  progressPercent: {
    fontSize: 36,
    fontFamily: FONTS.heavy,
    color: '#FFFFFF',
  },
  progressPercentSign: {
    fontSize: 18,
    fontFamily: FONTS.bold,
    color: 'rgba(255,255,255,0.6)',
    marginTop: 6,
    marginLeft: 1,
  },
  progressArc: {
    position: 'absolute',
    width: scale(100),
    height: scale(100),
    borderRadius: scale(50),
    borderWidth: 5,
  },

  // Hero stats
  heroStatsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(0,0,0,0.15)',
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
    color: 'rgba(255,255,255,0.85)',
  },
  statDivider: {
    width: 1,
    height: scale(30),
    backgroundColor: 'rgba(255,255,255,0.3)',
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
    width: scale(34),
    height: scale(34),
    borderRadius: scale(17),
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
    height: 6,
    borderRadius: 3,
    marginHorizontal: SPACING.lg,
    marginBottom: SPACING.sm,
    overflow: 'hidden',
  },
  progressBarFill: {
    height: 6,
    borderRadius: 3,
  },
  badgesCard: {
    marginHorizontal: SPACING.lg,
    paddingTop: SPACING.sm,
    paddingBottom: SPACING.xs,
    borderRadius: 24,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.03,
    shadowRadius: 8,
    elevation: 2,
  },
  proBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    marginHorizontal: SPACING.lg,
    marginBottom: SPACING.lg,
    paddingHorizontal: SPACING.md,
    paddingVertical: SPACING.md,
    borderRadius: BORDER_RADIUS.lg,
    borderWidth: 1,
    gap: 10,
  },
  proBannerTitle: {
    fontSize: FONT_SIZE.md,
    fontFamily: FONTS.semibold,
  },
  proBannerSub: {
    fontSize: FONT_SIZE.sm,
    fontFamily: FONTS.regular,
    marginTop: 2,
  },
});
