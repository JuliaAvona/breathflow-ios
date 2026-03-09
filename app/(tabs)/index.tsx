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
import { useThemeColors } from '../../src/hooks/useColorScheme';
import { useSettingsStore, useSessionsStore } from '../../src/store';
import { getTechniquesByCategory } from '../../src/constants/techniques';
import { SPACING, BORDER_RADIUS, scale } from '../../src/constants';
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
        {/* Header with streak pill */}
        <View style={styles.header}>
          <Text style={[styles.appTitle, { color: theme.text }]}>
            {t('home.title')}
          </Text>
          {stats.currentStreak > 0 && (
            <View style={[styles.streakPill, { backgroundColor: theme.primary }]}>
              <Ionicons name="flame" size={16} color="#FFFFFF" />
              <Text style={styles.streakPillText}>{stats.currentStreak}</Text>
            </View>
          )}
        </View>

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
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: SPACING.lg,
    paddingTop: SPACING.sm,
    paddingBottom: SPACING.lg,
  },
  appTitle: {
    fontSize: 30,
    fontWeight: '700',
    letterSpacing: -0.5,
  },
  streakPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: SPACING.sm,
    paddingVertical: SPACING.xs,
    borderRadius: BORDER_RADIUS.full,
  },
  streakPillText: {
    fontSize: 14,
    fontWeight: '700',
    color: '#FFFFFF',
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
