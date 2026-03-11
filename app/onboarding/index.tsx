import React, { useRef, useState, useCallback } from 'react';
import {
  View,
  Text,
  FlatList,
  TouchableOpacity,
  StyleSheet,
  Dimensions,
  ViewToken,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import { router } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useTranslation } from 'react-i18next';
import { useSettingsStore } from '../../src/store';
import { TechniqueCategory } from '../../src/types';
import { COLORS, SPACING, FONT_SIZE, BORDER_RADIUS, FONTS, scale } from '../../src/constants';
import { useThemeColors, useFontSize } from '../../src/hooks/useColorScheme';

const { width } = Dimensions.get('window');

interface OnboardingPage {
  id: string;
  type: 'hook' | 'goal' | 'value' | 'safety';
}

const pages: OnboardingPage[] = [
  { id: '1', type: 'hook' },
  { id: '2', type: 'goal' },
  { id: '3', type: 'value' },
  { id: '4', type: 'safety' },
];

const GOAL_OPTIONS: {
  category: TechniqueCategory;
  icon: keyof typeof Ionicons.glyphMap;
  color: string;
  labelKey: string;
  subKey: string;
}[] = [
  { category: 'calm',   icon: 'leaf-outline',  color: '#7BC4A8', labelKey: 'onboarding.goalCalmLabel',   subKey: 'onboarding.goalCalmSub' },
  { category: 'sleep',  icon: 'moon-outline',  color: '#7B68AE', labelKey: 'onboarding.goalSleepLabel',  subKey: 'onboarding.goalSleepSub' },
  { category: 'focus',  icon: 'eye-outline',   color: '#4A90D9', labelKey: 'onboarding.goalFocusLabel',  subKey: 'onboarding.goalFocusSub' },
  { category: 'energy', icon: 'flash-outline', color: '#F5A623', labelKey: 'onboarding.goalEnergyLabel', subKey: 'onboarding.goalEnergySub' },
];

// Personalized value page content per goal
const PLAN_CONTENT: Record<string, {
  titleKey: string;
  benefits: string[];
  techniqueId: string;
  techniqueName: string;
  color: string;
}> = {
  calm: {
    titleKey: 'onboarding.planTitleCalm',
    benefits: ['onboarding.planCalmB1', 'onboarding.planCalmB2', 'onboarding.planCalmB3'],
    techniqueId: 'coherence',
    techniqueName: 'Coherence Breathing',
    color: '#7FBFDF',
  },
  sleep: {
    titleKey: 'onboarding.planTitleSleep',
    benefits: ['onboarding.planSleepB1', 'onboarding.planSleepB2', 'onboarding.planSleepB3'],
    techniqueId: 'fourSevenEight',
    techniqueName: '4-7-8 Breathing',
    color: '#7B68AE',
  },
  focus: {
    titleKey: 'onboarding.planTitleFocus',
    benefits: ['onboarding.planFocusB1', 'onboarding.planFocusB2', 'onboarding.planFocusB3'],
    techniqueId: 'box',
    techniqueName: 'Box Breathing',
    color: '#4A90D9',
  },
  energy: {
    titleKey: 'onboarding.planTitleEnergy',
    benefits: ['onboarding.planEnergyB1', 'onboarding.planEnergyB2', 'onboarding.planEnergyB3'],
    techniqueId: 'box',
    techniqueName: 'Box Breathing',
    color: '#F5A623',
  },
};

const DEFAULT_PLAN = PLAN_CONTENT.focus;

const SAFETY_ITEMS = [
  'onboarding.safety1',
  'onboarding.safety2',
  'onboarding.safety3',
  'onboarding.safety4',
];

export default function OnboardingScreen() {
  const { t } = useTranslation();
  const theme = useThemeColors();
  const fontSize = useFontSize();
  const flatListRef = useRef<FlatList>(null);
  const [currentIndex, setCurrentIndex] = useState(0);
  const setSetting = useSettingsStore((s) => s.setSetting);

  const [selectedGoal, setSelectedGoal] = useState<TechniqueCategory | undefined>(undefined);
  const [safetyChecked, setSafetyChecked] = useState(false);

  const onViewableItemsChanged = useRef(
    ({ viewableItems }: { viewableItems: ViewToken[] }) => {
      if (viewableItems.length > 0 && viewableItems[0].index !== null) {
        setCurrentIndex(viewableItems[0].index);
      }
    },
  ).current;

  const viewabilityConfig = useRef({ viewAreaCoveragePercentThreshold: 50 }).current;

  const goToNext = useCallback(() => {
    if (currentIndex < pages.length - 1) {
      flatListRef.current?.scrollToIndex({ index: currentIndex + 1 });
    }
  }, [currentIndex]);

  // After onboarding complete → paywall with goal context, then session
  const finishOnboarding = useCallback((showPaywall = true) => {
    setSetting('onboardingCompleted', true);
    const plan = selectedGoal ? (PLAN_CONTENT[selectedGoal] ?? DEFAULT_PLAN) : DEFAULT_PLAN;
    if (showPaywall) {
      router.replace({
        pathname: '/paywall',
        params: {
          fromOnboarding: '1',
          goal: selectedGoal ?? 'focus',
          techniqueId: plan.techniqueId,
        },
      });
    } else {
      router.replace({
        pathname: '/session',
        params: { techniqueId: plan.techniqueId, duration: '120', fromOnboarding: '1' },
      });
    }
  }, [setSetting, selectedGoal]);

  const handleGoalSelect = useCallback((category: TechniqueCategory) => {
    setSelectedGoal(category);
    setSetting('selectedGoal', category);
  }, [setSetting]);

  const handleSafetyContinue = useCallback(() => {
    setSetting('safetyAccepted', true);
    finishOnboarding(true);
  }, [setSetting, finishOnboarding]);

  // ─── Page 1 — Hook ────────────────────────────────────────────────────────

  const renderHook = () => (
    <View style={[styles.page, { width }]}>
      {/* Animated-looking hero gradient circle */}
      <LinearGradient
        colors={['#4A90D9', '#7BC4A8']}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={styles.heroCircle}
      >
        <Ionicons name="body-outline" size={scale(52)} color="rgba(255,255,255,0.9)" />
      </LinearGradient>

      <Text style={[styles.hookTitle, { color: theme.text, fontSize: fontSize.xxl + 6 }]}>
        {t('onboarding.hookTitle')}
      </Text>
      <Text style={[styles.subtitle, { color: theme.textSecondary, fontSize: fontSize.md }]}>
        {t('onboarding.hookSub')}
      </Text>

      {/* Benefit pills */}
      <View style={styles.benefitRow}>
        {([
          { icon: 'leaf-outline' as const, key: 'onboarding.benefitStress', color: '#7BC4A8' },
          { icon: 'moon-outline' as const, key: 'onboarding.benefitSleep', color: '#7B68AE' },
          { icon: 'flash-outline' as const, key: 'onboarding.benefitFocus', color: '#4A90D9' },
        ] as const).map((b) => (
          <View key={b.key} style={[styles.benefitPill, { backgroundColor: b.color + '18' }]}>
            <Ionicons name={b.icon} size={16} color={b.color} />
            <Text style={[styles.benefitPillText, { color: b.color }]}>{t(b.key)}</Text>
          </View>
        ))}
      </View>

      <TouchableOpacity
        style={[styles.primaryButton, { backgroundColor: theme.primary }]}
        onPress={goToNext}
        activeOpacity={0.8}
      >
        <Text style={[styles.primaryButtonText, { fontSize: fontSize.lg }]}>
          {t('onboarding.getStarted')}
        </Text>
      </TouchableOpacity>
    </View>
  );

  // ─── Page 2 — Goal selection ──────────────────────────────────────────────

  const renderGoal = () => (
    <View style={[styles.page, { width }]}>
      <Text style={[styles.title, { color: theme.text, fontSize: fontSize.xxl }]}>
        {t('onboarding.chooseGoal')}
      </Text>
      <Text style={[styles.subtitle, { color: theme.textSecondary, fontSize: fontSize.md }]}>
        {t('onboarding.chooseGoalSub')}
      </Text>

      <View style={styles.goalGrid}>
        {GOAL_OPTIONS.map((goal) => {
          const isSelected = selectedGoal === goal.category;
          return (
            <TouchableOpacity
              key={goal.category}
              style={[
                styles.goalCard,
                {
                  backgroundColor: isSelected ? goal.color + '18' : theme.surface,
                  borderColor: isSelected ? goal.color : theme.border,
                  borderWidth: isSelected ? 2 : 1.5,
                },
              ]}
              onPress={() => handleGoalSelect(goal.category)}
              activeOpacity={0.7}
            >
              <View style={[styles.goalIconCircle, { backgroundColor: goal.color + '20' }]}>
                <Ionicons name={goal.icon} size={28} color={goal.color} />
              </View>
              <Text style={[styles.goalLabel, { color: isSelected ? goal.color : theme.text, fontSize: fontSize.md }]}>
                {t(goal.labelKey)}
              </Text>
              <Text style={[styles.goalSub, { color: theme.textSecondary, fontSize: fontSize.xs }]}>
                {t(goal.subKey)}
              </Text>
            </TouchableOpacity>
          );
        })}
      </View>

      <TouchableOpacity
        style={[styles.primaryButton, { backgroundColor: theme.primary }]}
        onPress={goToNext}
        activeOpacity={0.8}
      >
        <Text style={[styles.primaryButtonText, { fontSize: fontSize.lg }]}>
          {t('onboarding.continue')}
        </Text>
      </TouchableOpacity>
      <TouchableOpacity style={styles.skipLink} onPress={goToNext}>
        <Text style={[styles.skipLinkText, { color: theme.textSecondary, fontSize: fontSize.sm }]}>
          {t('onboarding.skip')}
        </Text>
      </TouchableOpacity>
    </View>
  );

  // ─── Page 3 — Value Proof (personalized) ──────────────────────────────────

  const renderValue = () => {
    const plan = selectedGoal ? (PLAN_CONTENT[selectedGoal] ?? DEFAULT_PLAN) : DEFAULT_PLAN;

    return (
      <View style={[styles.page, { width }]}>
        {/* Personalized badge */}
        <View style={[styles.planBadge, { backgroundColor: plan.color + '18' }]}>
          <Ionicons name="checkmark-circle" size={14} color={plan.color} />
          <Text style={[styles.planBadgeText, { color: plan.color }]}>
            {t('onboarding.planBadge')}
          </Text>
        </View>

        <Text style={[styles.title, { color: theme.text, fontSize: fontSize.xxl }]}>
          {t(plan.titleKey)}
        </Text>

        {/* Benefit list */}
        <View style={styles.benefitList}>
          {plan.benefits.map((key) => (
            <View key={key} style={[styles.benefitListRow, { backgroundColor: theme.surface }]}>
              <View style={[styles.benefitDot, { backgroundColor: plan.color }]} />
              <Text style={[styles.benefitListText, { color: theme.text, fontSize: fontSize.sm }]}>
                {t(key)}
              </Text>
            </View>
          ))}
        </View>

        {/* Technique preview card */}
        <View style={[styles.techniquePreview, { backgroundColor: theme.surface, borderColor: plan.color + '40' }]}>
          <Text style={[styles.techniquePreviewLabel, { color: theme.textSecondary, fontSize: fontSize.xs }]}>
            {t('onboarding.yourTechnique')}
          </Text>
          <View style={styles.techniquePreviewRow}>
            <LinearGradient
              colors={[plan.color + '60', plan.color]}
              style={styles.techniquePreviewIcon}
            >
              <Ionicons name="radio-outline" size={20} color="#FFFFFF" />
            </LinearGradient>
            <Text style={[styles.techniquePreviewName, { color: theme.text, fontSize: fontSize.md }]}>
              {plan.techniqueName}
            </Text>
          </View>
        </View>

        <Text style={[styles.scienceBadge, { color: theme.textSecondary, fontSize: fontSize.xs }]}>
          {t('onboarding.scienceBacked')}
        </Text>

        <TouchableOpacity
          style={[styles.primaryButton, { backgroundColor: theme.primary }]}
          onPress={goToNext}
          activeOpacity={0.8}
        >
          <Text style={[styles.primaryButtonText, { fontSize: fontSize.lg }]}>
            {t('onboarding.continue')}
          </Text>
        </TouchableOpacity>
      </View>
    );
  };

  // ─── Page 4 — Safety ──────────────────────────────────────────────────────

  const renderSafety = () => (
    <View style={[styles.page, { width }]}>
      <View style={[styles.safetyIconCircle, { backgroundColor: COLORS.accent + '20' }]}>
        <Ionicons name="shield-checkmark-outline" size={scale(44)} color={COLORS.accent} />
      </View>
      <Text style={[styles.title, { color: theme.text, fontSize: fontSize.xxl }]}>
        {t('onboarding.safety')}
      </Text>

      <View style={styles.safetyList}>
        {SAFETY_ITEMS.map((key, i) => (
          <View key={i} style={[styles.safetyRow, { backgroundColor: theme.surface }]}>
            <Ionicons name="checkmark-circle-outline" size={18} color={COLORS.accent} />
            <Text style={[styles.safetyText, { color: theme.text, fontSize: fontSize.sm }]} numberOfLines={2}>
              {t(key)}
            </Text>
          </View>
        ))}
      </View>

      <TouchableOpacity
        style={styles.checkboxRow}
        onPress={() => setSafetyChecked((prev) => !prev)}
        activeOpacity={0.7}
      >
        <Ionicons
          name={safetyChecked ? 'checkbox' : 'square-outline'}
          size={24}
          color={safetyChecked ? theme.primary : theme.textSecondary}
        />
        <Text style={[styles.checkboxLabel, { color: theme.text, fontSize: fontSize.sm }]}>
          {t('onboarding.understand')}
        </Text>
      </TouchableOpacity>

      <TouchableOpacity
        style={[
          styles.primaryButton,
          { backgroundColor: safetyChecked ? theme.primary : theme.border },
        ]}
        onPress={handleSafetyContinue}
        activeOpacity={0.8}
        disabled={!safetyChecked}
      >
        <Text style={[styles.primaryButtonText, { fontSize: fontSize.lg, opacity: safetyChecked ? 1 : 0.5 }]}>
          {t('onboarding.startBreathing')}
        </Text>
      </TouchableOpacity>

      <TouchableOpacity style={styles.skipLink} onPress={() => finishOnboarding(false)}>
        <Text style={[styles.skipLinkText, { color: theme.textSecondary, fontSize: fontSize.sm }]}>
          {t('onboarding.skipToApp')}
        </Text>
      </TouchableOpacity>
    </View>
  );

  const renderItem = ({ item }: { item: OnboardingPage }) => {
    switch (item.type) {
      case 'hook':   return renderHook();
      case 'goal':   return renderGoal();
      case 'value':  return renderValue();
      case 'safety': return renderSafety();
      default:       return null;
    }
  };

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: theme.background }]}>
      <FlatList
        ref={flatListRef}
        data={pages}
        renderItem={renderItem}
        keyExtractor={(item) => item.id}
        horizontal
        pagingEnabled
        showsHorizontalScrollIndicator={false}
        onViewableItemsChanged={onViewableItemsChanged}
        viewabilityConfig={viewabilityConfig}
        scrollEnabled={false}
      />

      {/* Dot indicator */}
      <View style={styles.dotsContainer}>
        {pages.map((_, i) => (
          <View
            key={i}
            style={[
              styles.dot,
              i === currentIndex
                ? { backgroundColor: theme.primary, width: 20 }
                : { backgroundColor: theme.border },
            ]}
          />
        ))}
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  page: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: SPACING.xl,
  },

  // Hook page
  heroCircle: {
    width: scale(110),
    height: scale(110),
    borderRadius: scale(55),
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: SPACING.xl,
  },
  hookTitle: {
    fontFamily: FONTS.heavy,
    textAlign: 'center',
    marginBottom: SPACING.sm,
    letterSpacing: -0.5,
  },
  benefitRow: {
    flexDirection: 'row',
    gap: 8,
    marginBottom: SPACING.xl,
    flexWrap: 'wrap',
    justifyContent: 'center',
  },
  benefitPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    paddingHorizontal: 12,
    paddingVertical: 7,
    borderRadius: BORDER_RADIUS.full,
  },
  benefitPillText: {
    fontSize: FONT_SIZE.xs,
    fontFamily: FONTS.bold,
  },

  // Shared
  title: {
    fontSize: FONT_SIZE.xxl,
    fontFamily: FONTS.bold,
    textAlign: 'center',
    marginBottom: SPACING.sm,
  },
  subtitle: {
    textAlign: 'center',
    lineHeight: 22,
    marginBottom: SPACING.xl,
    paddingHorizontal: SPACING.xs,
  },
  primaryButton: {
    width: '100%',
    paddingVertical: SPACING.md + 2,
    borderRadius: BORDER_RADIUS.xl,
    alignItems: 'center',
    marginTop: SPACING.md,
  },
  primaryButtonText: {
    color: '#FFFFFF',
    fontSize: FONT_SIZE.lg,
    fontFamily: FONTS.bold,
  },
  skipLink: {
    marginTop: SPACING.md,
    paddingVertical: SPACING.sm,
  },
  skipLinkText: {
    textDecorationLine: 'underline',
  },

  // Goal page
  goalGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: SPACING.sm + 2,
    justifyContent: 'center',
    marginBottom: SPACING.lg,
    width: '100%',
  },
  goalCard: {
    width: '46%',
    alignItems: 'center',
    paddingVertical: SPACING.md,
    paddingHorizontal: SPACING.sm,
    borderRadius: BORDER_RADIUS.lg,
  },
  goalIconCircle: {
    width: 52,
    height: 52,
    borderRadius: 26,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: SPACING.sm,
  },
  goalLabel: {
    fontFamily: FONTS.bold,
    textAlign: 'center',
    marginBottom: 2,
  },
  goalSub: {
    fontFamily: FONTS.regular,
    textAlign: 'center',
  },

  // Value proof page
  planBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: BORDER_RADIUS.full,
    marginBottom: SPACING.md,
  },
  planBadgeText: {
    fontSize: FONT_SIZE.xs,
    fontFamily: FONTS.bold,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  benefitList: {
    width: '100%',
    gap: SPACING.xs + 2,
    marginBottom: SPACING.md,
  },
  benefitListRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 10,
    paddingVertical: SPACING.sm,
    paddingHorizontal: SPACING.md,
    borderRadius: BORDER_RADIUS.md,
  },
  benefitDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    marginTop: 5,
  },
  benefitListText: {
    flex: 1,
    lineHeight: 20,
    fontFamily: FONTS.medium,
  },
  techniquePreview: {
    width: '100%',
    padding: SPACING.md,
    borderRadius: BORDER_RADIUS.lg,
    borderWidth: 1.5,
    marginBottom: SPACING.sm,
  },
  techniquePreviewLabel: {
    fontFamily: FONTS.semibold,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    marginBottom: 8,
  },
  techniquePreviewRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  techniquePreviewIcon: {
    width: 36,
    height: 36,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
  },
  techniquePreviewName: {
    fontFamily: FONTS.bold,
  },
  scienceBadge: {
    fontFamily: FONTS.medium,
    marginBottom: SPACING.sm,
    textAlign: 'center',
  },

  // Safety page
  safetyIconCircle: {
    width: scale(90),
    height: scale(90),
    borderRadius: scale(45),
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: SPACING.lg,
  },
  safetyList: {
    width: '100%',
    gap: SPACING.xs + 2,
    marginBottom: SPACING.lg,
  },
  safetyRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING.sm,
    paddingVertical: SPACING.sm + 2,
    paddingHorizontal: SPACING.md,
    borderRadius: BORDER_RADIUS.md,
  },
  safetyText: {
    flex: 1,
    lineHeight: 20,
    fontFamily: FONTS.medium,
  },
  checkboxRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING.sm,
    marginBottom: SPACING.sm,
    alignSelf: 'flex-start',
    paddingHorizontal: SPACING.xs,
  },
  checkboxLabel: {
    fontFamily: FONTS.semibold,
  },

  // Dots
  dotsContainer: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    gap: 6,
    paddingBottom: SPACING.xl,
  },
  dot: {
    height: 8,
    width: 8,
    borderRadius: 4,
  },
});
