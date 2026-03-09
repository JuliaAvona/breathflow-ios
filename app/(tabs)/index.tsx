import React, { useMemo } from 'react';
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  StyleSheet,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { router } from 'expo-router';
import { useTranslation } from 'react-i18next';
import { Ionicons } from '@expo/vector-icons';
import { useThemeColors, useFontSize } from '../../src/hooks/useColorScheme';
import { useSettingsStore, useSessionsStore } from '../../src/store';
import { TECHNIQUES, getTechniquesByCategory } from '../../src/constants/techniques';
import { SPACING, FONT_SIZE, BORDER_RADIUS, scale } from '../../src/constants';
import type { BreathingTechnique, TechniqueCategory } from '../../src/types';

// ─── Category metadata ──────────────────────────────────────────────────────

interface CategoryInfo {
  key: TechniqueCategory;
  icon: string;
  labelKey: string;
}

const CATEGORIES: CategoryInfo[] = [
  { key: 'calm', icon: 'leaf-outline', labelKey: 'category.calm' },
  { key: 'sleep', icon: 'moon-outline', labelKey: 'category.sleep' },
  { key: 'focus', icon: 'eye-outline', labelKey: 'category.focus' },
  { key: 'energy', icon: 'sunny-outline', labelKey: 'category.energy' },
  { key: 'advanced', icon: 'flash-outline', labelKey: 'category.advanced' },
];

// ─── Helpers ─────────────────────────────────────────────────────────────────

function formatRetention(seconds: number): string {
  const m = Math.floor(seconds / 60);
  const s = seconds % 60;
  return `${m}:${s.toString().padStart(2, '0')}`;
}

function getPatternSummary(technique: BreathingTechnique): string {
  if (technique.mode === 'power') {
    return `${technique.breathCount} breaths × ${technique.roundCount}`;
  }
  if (technique.mode === 'kapalabhati') {
    return `${technique.setCount} × ${technique.setDuration}s`;
  }
  return technique.phases
    .map((p) => (p.duration % 1 === 0 ? String(p.duration) : p.duration.toFixed(1)))
    .join(' – ');
}

function getDurationLabel(technique: BreathingTechnique): string {
  if (technique.mode === 'power') {
    const mins = Math.round((technique.breathCount! * 2 * technique.roundCount! + technique.roundCount! * 90) / 60);
    return `~${mins} min`;
  }
  if (technique.mode === 'kapalabhati') {
    const total = technique.setCount! * technique.setDuration! + (technique.setCount! - 1) * technique.restDuration!;
    return `${Math.round(total / 60)} min`;
  }
  const cycleDur = technique.phases.reduce((sum, p) => sum + p.duration, 0);
  const totalSec = technique.defaultDuration ?? cycleDur * (technique.defaultCycles || 6);
  return `${Math.round(totalSec / 60)} min`;
}

// ─── TechniqueCard (minimal style) ──────────────────────────────────────────

interface TechniqueCardProps {
  technique: BreathingTechnique;
  isPro: boolean;
  theme: ReturnType<typeof useThemeColors>;
  t: (key: string) => string;
}

function TechniqueCard({ technique, isPro, theme, t }: TechniqueCardProps) {
  const locked = technique.isPro && !isPro;

  const handlePress = () => {
    router.push({ pathname: '/session', params: { techniqueId: technique.id } });
  };

  return (
    <TouchableOpacity
      style={[styles.card, { backgroundColor: theme.card, borderColor: theme.border }]}
      onPress={handlePress}
      activeOpacity={0.7}
      accessibilityLabel={t(technique.nameKey)}
      accessibilityRole="button"
    >
      {/* Color accent bar */}
      <View style={[styles.cardAccent, { backgroundColor: technique.color }]} />

      <View style={styles.cardContent}>
        <View style={styles.cardTop}>
          <View style={[styles.cardIcon, { backgroundColor: technique.color + '12' }]}>
            <Ionicons
              name={technique.icon as keyof typeof Ionicons.glyphMap}
              size={20}
              color={technique.color}
            />
          </View>
          {locked && (
            <View style={[styles.proPill, { backgroundColor: '#F5A62318' }]}>
              <Text style={styles.proPillText}>PRO</Text>
            </View>
          )}
        </View>

        <Text
          style={[styles.cardName, { color: theme.text }]}
          numberOfLines={2}
        >
          {t(technique.nameKey)}
        </Text>

        <Text style={[styles.cardPattern, { color: theme.textSecondary }]}>
          {getPatternSummary(technique)}
        </Text>

        <Text style={[styles.cardDuration, { color: technique.color }]}>
          {getDurationLabel(technique)}
        </Text>
      </View>
    </TouchableOpacity>
  );
}

// ─── CategorySection ─────────────────────────────────────────────────────────

interface CategorySectionProps {
  category: CategoryInfo;
  techniques: BreathingTechnique[];
  isPro: boolean;
  theme: ReturnType<typeof useThemeColors>;
  t: (key: string) => string;
}

function CategorySection({ category, techniques, isPro, theme, t }: CategorySectionProps) {
  if (techniques.length === 0) return null;

  return (
    <View style={styles.categorySection}>
      {/* Section label with line */}
      <View style={styles.sectionLabelRow}>
        <Text style={[styles.sectionLabel, { color: theme.textSecondary }]}>
          {t(category.labelKey)}
        </Text>
        <View style={[styles.sectionLine, { backgroundColor: theme.border }]} />
      </View>

      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.horizontalList}
      >
        {techniques.map((technique) => (
          <TechniqueCard
            key={technique.id}
            technique={technique}
            isPro={isPro}
            theme={theme}
            t={t}
          />
        ))}
      </ScrollView>
    </View>
  );
}

// ─── HomeScreen ──────────────────────────────────────────────────────────────

export default function HomeScreen() {
  const { t } = useTranslation();
  const theme = useThemeColors();
  const isPro = useSettingsStore((s) => s.isPro);
  const stats = useSessionsStore((s) => s.stats);

  const categorizedTechniques = useMemo(() => {
    return CATEGORIES.map((cat) => ({
      category: cat,
      techniques: getTechniquesByCategory(cat.key),
    }));
  }, []);

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: theme.background }]}>
      <ScrollView
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        {/* Minimal header */}
        <View style={styles.header}>
          <Text style={[styles.appTitle, { color: theme.text }]}>
            BreathFlow
          </Text>
        </View>

        {/* Stats row — only show if user has sessions */}
        {stats.totalSessions > 0 && (
          <View style={styles.statsRow}>
            {/* Best hold */}
            {stats.bestRetention > 0 && (
              <View style={[styles.statCard, { backgroundColor: theme.card, borderColor: theme.border }]}>
                <Text style={[styles.statLabel, { color: theme.textSecondary }]}>
                  {t('history.bestRetention')}
                </Text>
                <Text style={[styles.statValue, { color: theme.primary }]}>
                  {formatRetention(stats.bestRetention)}
                </Text>
              </View>
            )}

            {/* Streak */}
            {stats.currentStreak > 0 && (
              <View style={[styles.statCard, { backgroundColor: theme.card, borderColor: theme.border }]}>
                <View style={styles.streakRow}>
                  <Ionicons name="flame-outline" size={16} color="#F5A623" />
                  <Text style={[styles.statValueSmall, { color: theme.text }]}>
                    {stats.currentStreak} {t('history.days')}
                  </Text>
                </View>
                <Text style={[styles.statLabel, { color: theme.textSecondary }]}>
                  {t('history.currentStreak').toLowerCase()}
                </Text>
              </View>
            )}
          </View>
        )}

        {/* Category sections */}
        {categorizedTechniques.map(({ category, techniques }) => (
          <CategorySection
            key={category.key}
            category={category}
            techniques={techniques}
            isPro={isPro}
            theme={theme}
            t={t}
          />
        ))}
      </ScrollView>
    </SafeAreaView>
  );
}

// ─── Styles (minimal kit) ───────────────────────────────────────────────────

const CARD_WIDTH = scale(148);

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  scrollContent: {
    paddingBottom: SPACING.xxl + SPACING.lg,
  },

  // Header — light, airy
  header: {
    paddingHorizontal: SPACING.lg,
    paddingTop: SPACING.xl,
    paddingBottom: SPACING.md,
  },
  appTitle: {
    fontSize: 28,
    fontWeight: '300',
    letterSpacing: -0.5,
  },

  // Stats
  statsRow: {
    flexDirection: 'row',
    paddingHorizontal: SPACING.lg,
    gap: SPACING.sm,
    marginBottom: SPACING.lg,
  },
  statCard: {
    flex: 1,
    borderRadius: BORDER_RADIUS.md,
    borderWidth: 1,
    padding: SPACING.md,
  },
  statLabel: {
    fontSize: 10,
    letterSpacing: 0.5,
    textTransform: 'uppercase',
    marginBottom: 2,
  },
  statValue: {
    fontSize: 22,
    fontWeight: '200',
    letterSpacing: -0.5,
  },
  statValueSmall: {
    fontSize: 16,
    fontWeight: '300',
  },
  streakRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginBottom: 2,
  },

  // Category section
  categorySection: {
    marginBottom: SPACING.lg,
  },
  sectionLabelRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: SPACING.lg,
    marginBottom: SPACING.md,
    gap: 12,
  },
  sectionLabel: {
    fontSize: 9,
    letterSpacing: 2,
    textTransform: 'uppercase',
    fontWeight: '400',
  },
  sectionLine: {
    flex: 1,
    height: 1,
  },
  horizontalList: {
    paddingHorizontal: SPACING.lg,
    gap: SPACING.sm,
  },

  // Card — clean, minimal
  card: {
    width: CARD_WIDTH,
    borderRadius: 20,
    borderWidth: 1,
    overflow: 'hidden',
  },
  cardAccent: {
    height: 3,
    borderRadius: 2,
  },
  cardContent: {
    padding: 14,
  },
  cardTop: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 10,
  },
  cardIcon: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
  },
  proPill: {
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 20,
  },
  proPillText: {
    fontSize: 8,
    fontWeight: '500',
    color: '#B06030',
    letterSpacing: 0.5,
  },
  cardName: {
    fontSize: 13,
    fontWeight: '500',
    letterSpacing: -0.2,
    marginBottom: 4,
  },
  cardPattern: {
    fontSize: 11,
    fontWeight: '300',
    marginBottom: 6,
  },
  cardDuration: {
    fontSize: 10,
    fontWeight: '400',
    letterSpacing: 0.3,
  },
});
