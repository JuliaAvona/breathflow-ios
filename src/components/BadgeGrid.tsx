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
  /** When false, every badge renders as Pro-locked regardless of earned progress. */
  isPro: boolean;
}

// Responsive grid configuration for 3 columns
const COLUMNS = 3;
const PARENT_MARGIN = SPACING.lg; // 24px - marginHorizontal from parent
const CONTAINER_PADDING = 8;
const GAP = 10;

const AVAILABLE_WIDTH = SCREEN.width - (PARENT_MARGIN * 2) - (CONTAINER_PADDING * 2);
const TOTAL_GAPS = GAP * (COLUMNS - 1);
const CARD_WIDTH = (AVAILABLE_WIDTH - TOTAL_GAPS) / COLUMNS;
const ICON_SIZE = CARD_WIDTH * 0.8;

export function BadgeGrid({ badges, unlockedBadges, isPro }: BadgeGridProps) {
  const { t } = useTranslation();
  const theme = useThemeColors();

  return (
    <View style={styles.grid}>
      {badges.map((badge, index) => {
        const earned = unlockedBadges.some((ub) => ub.badgeId === badge.id);
        const unlocked = isPro && earned;
        const needsPro = !isPro;
        const isLastInRow = (index + 1) % COLUMNS === 0;
        const catColors = BADGE_CATEGORY_COLORS[badge.category] ?? BADGE_CATEGORY_COLORS.sessions;
        const dimBg = theme.isDark ? 'rgba(255,255,255,0.04)' : 'rgba(0,0,0,0.03)';
        const tintBg = unlocked ? (theme.isDark ? catColors.cardTintDark : catColors.cardTint) : dimBg;

        return (
          <View
            key={badge.id}
            style={[
              styles.card,
              {
                marginRight: isLastInRow ? 0 : GAP,
                backgroundColor: tintBg,
                borderColor: unlocked ? catColors.color + '55' : theme.border,
              },
              unlocked && styles.cardUnlocked,
            ]}
          >
            {/* Icon */}
            <View style={styles.iconCircle}>
              {unlocked ? (
                <View
                  style={[
                    styles.iconCircleInner,
                    {
                      backgroundColor: theme.isDark ? catColors.cardTintDark : catColors.cardTint,
                      shadowColor: catColors.color,
                    },
                  ]}
                >
                  <Ionicons
                    name={badge.icon as keyof typeof Ionicons.glyphMap}
                    size={ICON_SIZE * 0.52}
                    color={catColors.color}
                  />
                </View>
              ) : (
                <View
                  style={[
                    styles.iconCircleInner,
                    { backgroundColor: theme.isDark ? 'rgba(255,255,255,0.06)' : 'rgba(0,0,0,0.05)' },
                  ]}
                >
                  <Ionicons
                    name={badge.icon as keyof typeof Ionicons.glyphMap}
                    size={ICON_SIZE * 0.48}
                    color={theme.textSecondary + '80'}
                  />
                </View>
              )}

              {/* Lock state indicator, docked to the bottom edge of the icon */}
              {!unlocked && (
                needsPro ? (
                  <View style={styles.proTag}>
                    <Ionicons name="diamond" size={8} color="#1A2332" />
                    <Text style={styles.proTagText}>PRO</Text>
                  </View>
                ) : (
                  <View style={[styles.lockTag, { backgroundColor: theme.isDark ? '#2A3444' : '#E2E8F0' }]}>
                    <Ionicons name="lock-closed" size={10} color={theme.textSecondary} />
                  </View>
                )
              )}
            </View>

            {/* Title */}
            <Text
              style={[
                styles.title,
                {
                  color: unlocked ? theme.text : theme.textSecondary,
                  opacity: unlocked ? 1 : 0.5,
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
                { color: theme.textSecondary, opacity: unlocked ? 0.7 : 0.35 },
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
    paddingVertical: SPACING.sm + 6,
    paddingHorizontal: SPACING.xs,
    overflow: 'visible',
    marginBottom: GAP,
    borderRadius: 16,
    borderWidth: 1,
  },
  cardUnlocked: {
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.08,
    shadowRadius: 8,
    elevation: 2,
  },
  iconCircle: {
    width: ICON_SIZE,
    height: ICON_SIZE,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: SPACING.sm + 2,
  },
  iconCircleInner: {
    width: ICON_SIZE - 4,
    height: ICON_SIZE - 4,
    borderRadius: (ICON_SIZE - 4) / 2,
    alignItems: 'center',
    justifyContent: 'center',
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.35,
    shadowRadius: 10,
    elevation: 4,
  },
  proTag: {
    position: 'absolute',
    bottom: -6,
    alignSelf: 'center',
    flexDirection: 'row',
    alignItems: 'center',
    gap: 2,
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 8,
    backgroundColor: '#FFC940',
    borderWidth: 1.5,
    borderColor: 'rgba(255,255,255,0.6)',
  },
  proTagText: {
    fontSize: 8,
    fontWeight: '800',
    color: '#1A2332',
    letterSpacing: 0.2,
  },
  lockTag: {
    position: 'absolute',
    bottom: -4,
    alignSelf: 'center',
    width: 20,
    height: 20,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
  },
  title: {
    fontSize: 11,
    fontWeight: '700',
    textAlign: 'center',
    lineHeight: 14,
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
