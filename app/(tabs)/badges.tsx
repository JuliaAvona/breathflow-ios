import React, { useMemo } from 'react';
import { View, Text, ScrollView, StyleSheet } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useTranslation } from 'react-i18next';
import { Ionicons } from '@expo/vector-icons';
import { useBadgesStore, useSessionsStore } from '../../src/store';
import { BadgeGrid } from '../../src/components/BadgeGrid';
import { useThemeColors, useFontSize } from '../../src/hooks/useColorScheme';
import { SPACING, FONT_SIZE, BORDER_RADIUS, BADGE_CATEGORY_COLORS, BADGE_DEFINITIONS, scale } from '../../src/constants';
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
  const fontSize = useFontSize();

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
    <SafeAreaView style={[styles.container, { backgroundColor: theme.background }]}>
      <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
        {/* Header */}
        <View style={styles.header}>
          <Text style={[styles.title, { color: theme.text }]}>
            {t('badges.title')}
          </Text>
          <View style={[styles.countPill, { backgroundColor: theme.primary }]}>
            <Text style={styles.countPillText}>{unlockedCount}/{totalCount}</Text>
          </View>
        </View>

        {/* Category sections */}
        {CATEGORIES.map((cat) => {
          const badges = grouped[cat.key];
          if (!badges || badges.length === 0) return null;

          const catColors = BADGE_CATEGORY_COLORS[cat.key];
          const catUnlocked = badges.filter((b) => isUnlocked(b.id)).length;
          const catTotal = badges.length;
          const catProgress = catTotal > 0 ? catUnlocked / catTotal : 0;

          // Find next locked badge for milestone hint
          const nextLocked = badges.find((b) => !isUnlocked(b.id));
          const remaining = 0; // Condition functions don't expose numeric thresholds

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

              {/* Badge grid */}
              <View style={[styles.badgesCard, { backgroundColor: theme.card }]}>
                <BadgeGrid badges={badges} unlockedBadges={unlockedBadges} />
              </View>

              {/* Next milestone hint */}
              {nextLocked && remaining > 0 && (
                <Text style={[styles.milestoneHint, { color: catColors.color }]}>
                  {t('badges.nextMilestone', { count: remaining })}
                </Text>
              )}
            </View>
          );
        })}
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  scrollContent: { paddingBottom: SPACING.xxl + SPACING.lg },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: SPACING.lg,
    paddingTop: SPACING.sm,
    paddingBottom: SPACING.lg,
  },
  title: {
    fontSize: 30,
    fontWeight: '700',
    letterSpacing: -0.5,
  },
  countPill: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: SPACING.sm,
    paddingVertical: SPACING.xs,
    borderRadius: BORDER_RADIUS.full,
  },
  countPillText: {
    fontSize: 14,
    fontWeight: '700',
    color: '#FFFFFF',
  },
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
    fontWeight: '700',
  },
  sectionCount: {
    fontSize: FONT_SIZE.sm,
    fontWeight: '600',
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
    borderRadius: BORDER_RADIUS.xl,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.06,
    shadowRadius: 8,
    elevation: 2,
  },
  milestoneHint: {
    fontSize: FONT_SIZE.xs,
    fontWeight: '600',
    textAlign: 'center',
    marginTop: SPACING.sm,
  },
});
