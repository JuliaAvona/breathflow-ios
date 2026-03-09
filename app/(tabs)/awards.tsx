import React, { useMemo } from 'react';
import { View, Text, ScrollView, StyleSheet } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useTranslation } from 'react-i18next';
import { Ionicons } from '@expo/vector-icons';
import { useBadgesStore, useSessionsStore } from '../../src/store';
import { BadgeGrid } from '../../src/components/BadgeGrid';
import { ProgressRing } from '../../src/components/ProgressRing';
import { useThemeColors, useFontSize } from '../../src/hooks/useColorScheme';
import { SPACING, FONT_SIZE, BORDER_RADIUS, BADGE_CATEGORY_COLORS, scale } from '../../src/constants';

type CategoryKey = 'sessions' | 'streak' | 'minutes' | 'calories';

const CATEGORIES: {
  key: CategoryKey;
  labelKey: string;
  icon: keyof typeof Ionicons.glyphMap;
  statField: 'totalSessions' | 'currentStreak' | 'totalMinutes' | 'totalCalories';
}[] = [
  { key: 'sessions', labelKey: 'badges.categoryWalks', icon: 'walk-outline', statField: 'totalSessions' },
  { key: 'streak', labelKey: 'badges.categoryStreaks', icon: 'flame-outline', statField: 'currentStreak' },
  { key: 'minutes', labelKey: 'badges.categoryMinutes', icon: 'time-outline', statField: 'totalMinutes' },
  { key: 'calories', labelKey: 'badges.categoryCalories', icon: 'flash-outline', statField: 'totalCalories' },
];

export default function AwardsScreen() {
  const { t } = useTranslation();
  const theme = useThemeColors();
  const fontSize = useFontSize();

  const stats = useSessionsStore((s) => s.stats);
  const allBadges = useBadgesStore((s) => s.getAllBadges)();

  const mappedBadges = useMemo(
    () =>
      allBadges.map((b) => ({
        ...b,
        category: b.condition.type as CategoryKey,
      })),
    [allBadges],
  );

  const unlockedCount = allBadges.filter((b) => b.unlockedAt).length;
  const totalCount = allBadges.length;
  const progress = totalCount > 0 ? unlockedCount / totalCount : 0;

  // Group badges by category
  const grouped = useMemo(() => {
    const map: Record<CategoryKey, typeof mappedBadges> = {
      sessions: [],
      streak: [],
      minutes: [],
      calories: [],
    };
    for (const b of mappedBadges) {
      map[b.category]?.push(b);
    }
    return map;
  }, [mappedBadges]);

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: theme.background }]}>
      <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
        {/* Header with progress ring */}
        <View style={styles.header}>
          <Text style={[styles.title, { color: theme.text, fontSize: fontSize.xxl }]}>
            {t('history.badges')}
          </Text>
          <View style={styles.progressContainer}>
            <ProgressRing
              progress={progress}
              size={scale(100)}
              strokeWidth={8}
              color={theme.primary}
              bgColor={theme.isDark ? 'rgba(255,255,255,0.08)' : 'rgba(0,0,0,0.06)'}
            >
              <Text style={[styles.progressCount, { color: theme.text }]}>
                {unlockedCount}
              </Text>
              <Text style={[styles.progressTotal, { color: theme.textSecondary }]}>
                / {totalCount}
              </Text>
            </ProgressRing>
          </View>
        </View>

        {/* Category sections */}
        {CATEGORIES.map((cat) => {
          const badges = grouped[cat.key];
          if (!badges || badges.length === 0) return null;

          const catColors = BADGE_CATEGORY_COLORS[cat.key];
          const catUnlocked = badges.filter((b) => b.unlockedAt).length;
          const catTotal = badges.length;
          const catProgress = catTotal > 0 ? catUnlocked / catTotal : 0;

          // Find next locked badge for milestone hint
          const currentStat = stats[cat.statField];
          const nextLocked = badges.find((b) => !b.unlockedAt);
          const remaining = nextLocked ? nextLocked.condition.value - currentStat : 0;

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
                <BadgeGrid badges={badges} />
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
    alignItems: 'center',
    paddingTop: SPACING.lg,
    paddingBottom: SPACING.md,
  },
  title: {
    fontSize: FONT_SIZE.xxl,
    fontWeight: '700',
    marginBottom: SPACING.md,
  },
  progressContainer: {
    alignItems: 'center',
  },
  progressCount: {
    fontSize: FONT_SIZE.xxl,
    fontWeight: '800',
    lineHeight: 34,
  },
  progressTotal: {
    fontSize: FONT_SIZE.sm,
    fontWeight: '500',
    marginTop: -4,
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
