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
import { useSettingsStore } from '../../src/store';
import { TECHNIQUES, getTechniquesByCategory } from '../../src/constants/techniques';
import { SPACING, FONT_SIZE, FONT_WEIGHT, BORDER_RADIUS, COLORS } from '../../src/constants';
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

function getGreetingKey(): string {
  const hour = new Date().getHours();
  if (hour < 12) return 'home.goodMorning';
  if (hour < 18) return 'home.goodAfternoon';
  return 'home.goodEvening';
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
    .join('-');
}

// ─── TechniqueCard ───────────────────────────────────────────────────────────

interface TechniqueCardProps {
  technique: BreathingTechnique;
  isPro: boolean;
  theme: ReturnType<typeof useThemeColors>;
  fontSize: ReturnType<typeof useFontSize>;
  t: (key: string) => string;
}

function TechniqueCard({ technique, isPro, theme, fontSize, t }: TechniqueCardProps) {
  const locked = technique.isPro && !isPro;

  const handlePress = () => {
    router.push({ pathname: '/session', params: { techniqueId: technique.id } });
  };

  return (
    <TouchableOpacity
      style={[
        styles.card,
        {
          backgroundColor: technique.color + '18',
          borderColor: technique.color + '30',
        },
      ]}
      onPress={handlePress}
      activeOpacity={0.7}
      accessibilityLabel={t(technique.nameKey)}
      accessibilityRole="button"
    >
      {locked && (
        <View style={styles.lockBadge}>
          <Ionicons name="lock-closed" size={12} color={COLORS.proGradientEnd} />
        </View>
      )}

      <View style={[styles.cardIconCircle, { backgroundColor: technique.color + '25' }]}>
        <Ionicons
          name={technique.icon as keyof typeof Ionicons.glyphMap}
          size={28}
          color={technique.color}
        />
      </View>

      <Text
        style={[styles.cardName, { color: theme.text, fontSize: fontSize.md }]}
        numberOfLines={2}
      >
        {t(technique.nameKey)}
      </Text>

      <Text style={[styles.cardPattern, { color: technique.color }]}>
        {getPatternSummary(technique)}
      </Text>
    </TouchableOpacity>
  );
}

// ─── CategorySection ─────────────────────────────────────────────────────────

interface CategorySectionProps {
  category: CategoryInfo;
  techniques: BreathingTechnique[];
  isPro: boolean;
  theme: ReturnType<typeof useThemeColors>;
  fontSize: ReturnType<typeof useFontSize>;
  t: (key: string) => string;
}

function CategorySection({ category, techniques, isPro, theme, fontSize, t }: CategorySectionProps) {
  if (techniques.length === 0) return null;

  return (
    <View style={styles.categorySection}>
      <View style={styles.categoryHeader}>
        <Ionicons
          name={category.icon as keyof typeof Ionicons.glyphMap}
          size={20}
          color={theme.primary}
        />
        <Text style={[styles.categoryTitle, { color: theme.text, fontSize: fontSize.lg }]}>
          {t(category.labelKey)}
        </Text>
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
            fontSize={fontSize}
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
  const fontSize = useFontSize();
  const isPro = useSettingsStore((s) => s.isPro);

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
        {/* Header */}
        <View style={styles.header}>
          <Text style={[styles.appTitle, { color: theme.primary }]}>
            BreathFlow
          </Text>
          <Text style={[styles.greeting, { color: theme.textSecondary, fontSize: fontSize.md }]}>
            {t(getGreetingKey())}
          </Text>
        </View>

        {/* Category sections */}
        {categorizedTechniques.map(({ category, techniques }) => (
          <CategorySection
            key={category.key}
            category={category}
            techniques={techniques}
            isPro={isPro}
            theme={theme}
            fontSize={fontSize}
            t={t}
          />
        ))}
      </ScrollView>
    </SafeAreaView>
  );
}

// ─── Styles ──────────────────────────────────────────────────────────────────

const CARD_WIDTH = 150;
const CARD_HEIGHT = 180;

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  scrollContent: {
    paddingBottom: SPACING.xxl,
  },
  header: {
    paddingHorizontal: SPACING.lg,
    paddingTop: SPACING.md,
    paddingBottom: SPACING.lg,
  },
  appTitle: {
    fontSize: FONT_SIZE.xxl,
    fontWeight: FONT_WEIGHT.bold,
    letterSpacing: 1,
  },
  greeting: {
    fontSize: FONT_SIZE.md,
    marginTop: SPACING.xs,
  },

  // Category
  categorySection: {
    marginBottom: SPACING.lg,
  },
  categoryHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING.sm,
    paddingHorizontal: SPACING.lg,
    marginBottom: SPACING.md,
  },
  categoryTitle: {
    fontSize: FONT_SIZE.lg,
    fontWeight: FONT_WEIGHT.semibold,
  },
  horizontalList: {
    paddingHorizontal: SPACING.lg,
    gap: SPACING.md,
  },

  // Card
  card: {
    width: CARD_WIDTH,
    height: CARD_HEIGHT,
    borderRadius: BORDER_RADIUS.lg,
    borderWidth: 1,
    padding: SPACING.md,
    justifyContent: 'space-between',
  },
  lockBadge: {
    position: 'absolute',
    top: SPACING.sm,
    right: SPACING.sm,
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: COLORS.proGradientStart + '30',
    alignItems: 'center',
    justifyContent: 'center',
  },
  cardIconCircle: {
    width: 48,
    height: 48,
    borderRadius: 24,
    alignItems: 'center',
    justifyContent: 'center',
  },
  cardName: {
    fontSize: FONT_SIZE.md,
    fontWeight: FONT_WEIGHT.semibold,
    marginTop: SPACING.sm,
  },
  cardPattern: {
    fontSize: FONT_SIZE.sm,
    fontWeight: FONT_WEIGHT.medium,
    marginTop: SPACING.xs,
  },
});
