import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTranslation } from 'react-i18next';
import { useThemeColors } from '../hooks/useColorScheme';
import { SPACING, SCREEN, BADGE_CATEGORY_COLORS } from '../constants';
import type { Badge, UnlockedBadge } from '../types';

interface BadgeGridProps {
  badges: Badge[];
  unlockedBadges: UnlockedBadge[];
}

// Responsive grid configuration for 3 columns
const COLUMNS = 3;
const PARENT_MARGIN = SPACING.lg; // 24px - marginHorizontal from parent
const CONTAINER_PADDING = 8;
const GAP = 6;

const AVAILABLE_WIDTH = SCREEN.width - (PARENT_MARGIN * 2) - (CONTAINER_PADDING * 2);
const TOTAL_GAPS = GAP * (COLUMNS - 1);
const CARD_WIDTH = (AVAILABLE_WIDTH - TOTAL_GAPS) / COLUMNS;
const ICON_SIZE = CARD_WIDTH * 0.85;

export function BadgeGrid({ badges, unlockedBadges }: BadgeGridProps) {
  const { t } = useTranslation();
  const theme = useThemeColors();

  return (
    <View style={styles.grid}>
      {badges.map((badge, index) => {
        const unlocked = unlockedBadges.some((ub) => ub.badgeId === badge.id);
        const isLastInRow = (index + 1) % COLUMNS === 0;
        const category = badge.category;
        const catColors = BADGE_CATEGORY_COLORS[category] ?? BADGE_CATEGORY_COLORS.sessions;
        const tintBg = unlocked
          ? (theme.isDark ? catColors.cardTintDark : catColors.cardTint)
          : undefined;

        return (
          <View
            key={badge.id}
            style={[
              styles.card,
              {
                marginRight: isLastInRow ? 0 : GAP,
                backgroundColor: tintBg ?? theme.card,
                borderColor: unlocked ? catColors.color + '30' : theme.border,
              },
            ]}
          >
            {/* Icon */}
            <View style={styles.iconCircle}>
              {unlocked ? (
                <View style={[styles.lockCircle, { backgroundColor: theme.isDark ? catColors.cardTintDark : catColors.cardTint }]}>
                  <Ionicons name={badge.icon as keyof typeof Ionicons.glyphMap} size={ICON_SIZE * 0.5} color={catColors.color} />
                </View>
              ) : (
                <View style={[styles.lockCircle, { backgroundColor: theme.isDark ? 'rgba(255,255,255,0.05)' : 'rgba(0,0,0,0.04)' }]}>
                  <Ionicons name="lock-closed" size={20} color={theme.textSecondary + '40'} />
                </View>
              )}
            </View>

            {/* Title */}
            <Text
              style={[
                styles.title,
                {
                  color: unlocked ? theme.text : theme.textSecondary,
                  opacity: unlocked ? 1 : 0.35,
                },
              ]}
              numberOfLines={2}
            >
              {t(badge.nameKey)}
            </Text>

            {/* Description */}
            <Text
              style={[
                styles.desc,
                {
                  color: theme.textSecondary,
                  opacity: unlocked ? 0.7 : 0.2,
                },
              ]}
              numberOfLines={2}
            >
              {t(badge.descriptionKey)}
            </Text>
          </View>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  grid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    paddingHorizontal: CONTAINER_PADDING,
    paddingBottom: SPACING.xs,
  },
  card: {
    width: CARD_WIDTH,
    alignItems: 'center',
    paddingVertical: SPACING.sm + 4,
    paddingHorizontal: SPACING.xs - 2,
    overflow: 'hidden',
    marginBottom: GAP,
    borderRadius: 10,
    borderWidth: 0.5,
  },
  iconCircle: {
    width: ICON_SIZE,
    height: ICON_SIZE,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: SPACING.sm - 2,
  },
  lockCircle: {
    width: ICON_SIZE - 4,
    height: ICON_SIZE - 4,
    borderRadius: (ICON_SIZE - 4) / 2,
    alignItems: 'center',
    justifyContent: 'center',
  },
  iconImage: {
    width: ICON_SIZE - 4,
    height: ICON_SIZE - 4,
  },
  title: {
    fontSize: 10,
    fontWeight: '700',
    textAlign: 'center',
    lineHeight: 13,
    paddingHorizontal: 2,
    marginBottom: 2,
  },
  desc: {
    fontSize: 8.5,
    fontWeight: '400',
    textAlign: 'center',
    lineHeight: 10,
    paddingHorizontal: 1,
    marginBottom: 2,
  },
});
