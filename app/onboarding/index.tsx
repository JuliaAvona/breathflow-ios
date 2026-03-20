import React, { useRef, useState, useCallback, useEffect } from 'react';
import {
  View,
  Text,
  FlatList,
  TouchableOpacity,
  StyleSheet,
  Dimensions,
  Animated,
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
  type: 'hook' | 'goal' | 'commit' | 'building' | 'value' | 'safety';
}

const pages: OnboardingPage[] = [
  { id: '1', type: 'hook' },
  { id: '2', type: 'goal' },
  { id: '3', type: 'commit' },
  { id: '4', type: 'building' },
  { id: '5', type: 'value' },
  { id: '6', type: 'safety' },
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

const PLAN_CONTENT: Record<string, {
  titleKey: string;
  techniqueId: string;
  techniqueName: string;
  techniqueNameKey: string;
  color: string;
  icon: keyof typeof Ionicons.glyphMap;
}> = {
  calm: {
    titleKey: 'onboarding.planTitleCalm',
    techniqueId: 'coherence',
    techniqueName: 'Coherence Breathing',
    techniqueNameKey: 'techniques.coherence.name',
    color: '#7BC4A8',
    icon: 'radio-outline',
  },
  sleep: {
    titleKey: 'onboarding.planTitleSleep',
    techniqueId: 'fourSevenEight',
    techniqueName: '4-7-8 Breathing',
    techniqueNameKey: 'techniques.fourSevenEight.name',
    color: '#7B68AE',
    icon: 'moon-outline',
  },
  focus: {
    titleKey: 'onboarding.planTitleFocus',
    techniqueId: 'box',
    techniqueName: 'Box Breathing',
    techniqueNameKey: 'techniques.box.name',
    color: '#4A90D9',
    icon: 'cube-outline',
  },
  energy: {
    titleKey: 'onboarding.planTitleEnergy',
    techniqueId: 'triangle',
    techniqueName: 'Triangle Breathing',
    techniqueNameKey: 'techniques.triangle.name',
    color: '#F5A623',
    icon: 'flash-outline',
  },
};

const DEFAULT_PLAN = PLAN_CONTENT.focus;

const COMMIT_OPTIONS = [3, 5, 10, 15];

const SAFETY_ITEMS = [
  'onboarding.safety1',
  'onboarding.safety2',
  'onboarding.safety3',
  'onboarding.safety4',
];

// ─── Value bullets shown on "your plan ready" screen ─────────────────────────
const VALUE_BULLETS: {
  icon: keyof typeof Ionicons.glyphMap;
  color: string;
  key: string;
}[] = [
  { icon: 'bar-chart-outline',        color: '#4A90D9', key: 'onboarding.valueProgress' },
  { icon: 'trophy-outline',           color: '#F5A623', key: 'onboarding.valueBadges' },
  { icon: 'heart-outline',            color: '#FF6B6B', key: 'onboarding.valueHealth' },
  { icon: 'layers-outline',           color: '#7BC4A8', key: 'onboarding.valueTechniques' },
  { icon: 'checkmark-circle-outline', color: '#7B68AE', key: 'onboarding.valueFree' },
];

export default function OnboardingScreen() {
  const { t } = useTranslation();
  const theme = useThemeColors();
  const fontSize = useFontSize();
  const flatListRef = useRef<FlatList>(null);
  const [currentIndex, setCurrentIndex] = useState(0);
  const setSetting = useSettingsStore((s) => s.setSetting);

  const [selectedGoal, setSelectedGoal] = useState<TechniqueCategory | undefined>(undefined);
  const [selectedMinutes, setSelectedMinutes] = useState(5);
  const [safetyChecked, setSafetyChecked] = useState(false);

  // Building screen animation values
  const buildingProgress = useRef(new Animated.Value(0)).current;
  const step1Opacity = useRef(new Animated.Value(0)).current;
  const step2Opacity = useRef(new Animated.Value(0)).current;
  const step3Opacity = useRef(new Animated.Value(0)).current;

  const onViewableItemsChanged = useRef(
    ({ viewableItems }: { viewableItems: ViewToken[] }) => {
      if (viewableItems.length > 0 && viewableItems[0].index !== null) {
        setCurrentIndex(viewableItems[0].index);
      }
    },
  ).current;

  const viewabilityConfig = useRef({ viewAreaCoveragePercentThreshold: 50 }).current;

  const goToNext = useCallback(() => {
    const nextIndex = currentIndex + 1;
    if (nextIndex < pages.length) {
      flatListRef.current?.scrollToIndex({ index: nextIndex });
    }
  }, [currentIndex]);

  // Auto-advance from "building" screen after animation completes
  useEffect(() => {
    if (currentIndex !== 3) return; // page index 3 = building

    // Reset
    step1Opacity.setValue(0);
    step2Opacity.setValue(0);
    step3Opacity.setValue(0);

    const seq = Animated.sequence([
      Animated.delay(400),
      Animated.timing(step1Opacity, { toValue: 1, duration: 350, useNativeDriver: true }),
      Animated.delay(550),
      Animated.timing(step2Opacity, { toValue: 1, duration: 350, useNativeDriver: true }),
      Animated.delay(550),
      Animated.timing(step3Opacity, { toValue: 1, duration: 350, useNativeDriver: true }),
      Animated.delay(700),
    ]);

    seq.start(() => {
      flatListRef.current?.scrollToIndex({ index: 4 });
    });

    return () => seq.stop();
  }, [currentIndex]);

  const finishOnboarding = useCallback(() => {
    setSetting('onboardingCompleted', true);
    setSetting('safetyAccepted', true);
    const plan = selectedGoal ? (PLAN_CONTENT[selectedGoal] ?? DEFAULT_PLAN) : DEFAULT_PLAN;
    router.replace({
      pathname: '/paywall',
      params: {
        fromOnboarding: '1',
        goal: selectedGoal ?? 'focus',
        techniqueId: plan.techniqueId,
      },
    });
  }, [setSetting, selectedGoal]);

  const skipToApp = useCallback(() => {
    setSetting('onboardingCompleted', true);
    const plan = selectedGoal ? (PLAN_CONTENT[selectedGoal] ?? DEFAULT_PLAN) : DEFAULT_PLAN;
    router.replace({
      pathname: '/session',
      params: { techniqueId: plan.techniqueId, duration: '120', fromOnboarding: '1' },
    });
  }, [setSetting, selectedGoal]);

  const handleGoalSelect = useCallback((category: TechniqueCategory) => {
    setSelectedGoal(category);
    setSetting('selectedGoal', category);
  }, [setSetting]);

  const handleCommitSelect = useCallback((min: number) => {
    setSelectedMinutes(min);
    setSetting('dailyGoalMinutes', min);
  }, [setSetting]);

  // ─── Page 1 — Hook ──────────────────────────────────────────────────────────

  const renderHook = () => (
    <View style={[styles.page, { width }]}>
      {/* Hero gradient orb */}
      <View style={styles.heroOrbWrapper}>
        <LinearGradient
          colors={['#4A90D9', '#7BC4A8', '#7B68AE']}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={styles.heroOrb}
        >
          <Ionicons name="body-outline" size={scale(52)} color="rgba(255,255,255,0.95)" />
        </LinearGradient>
        {/* Glow ring */}
        <View style={[styles.heroOrbRing, { borderColor: '#4A90D9' + '30' }]} />
      </View>

      <Text style={[styles.hookTitle, { color: theme.text }]}>
        {t('onboarding.hookTitle')}
      </Text>
      <Text style={[styles.subtitle, { color: theme.textSecondary, fontSize: fontSize.md }]}>
        {t('onboarding.hookSub')}
      </Text>

      {/* Social proof pills */}
      <View style={styles.socialProofRow}>
        {([
          { icon: 'shield-checkmark-outline' as const, key: 'onboarding.socialProof1', color: '#7BC4A8' },
          { icon: 'flask-outline'             as const, key: 'onboarding.socialProof2', color: '#4A90D9' },
          { icon: 'heart-outline'             as const, key: 'onboarding.socialProof3', color: '#FF6B6B' },
        ] as const).map((b) => (
          <View key={b.key} style={[styles.socialPill, { backgroundColor: b.color + '18' }]}>
            <Ionicons name={b.icon} size={13} color={b.color} />
            <Text style={[styles.socialPillText, { color: b.color }]}>{t(b.key)}</Text>
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

      <Text style={[styles.fineprint, { color: theme.textSecondary }]}>
        {t('onboarding.noCardRequired')}
      </Text>
    </View>
  );

  // ─── Page 2 — Goal ──────────────────────────────────────────────────────────

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
              {isSelected && (
                <View style={[styles.goalCheck, { backgroundColor: goal.color }]}>
                  <Ionicons name="checkmark" size={12} color="#fff" />
                </View>
              )}
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

  // ─── Page 3 — Daily Commitment ──────────────────────────────────────────────

  const renderCommit = () => (
    <View style={[styles.page, { width }]}>
      {/* Icon */}
      <View style={[styles.commitIconCircle, { backgroundColor: COLORS.primary + '18' }]}>
        <Ionicons name="calendar-outline" size={scale(42)} color={COLORS.primary} />
      </View>

      <Text style={[styles.title, { color: theme.text, fontSize: fontSize.xxl }]}>
        {t('onboarding.commitTitle')}
      </Text>
      <Text style={[styles.subtitle, { color: theme.textSecondary, fontSize: fontSize.md }]}>
        {t('onboarding.commitSub')}
      </Text>

      {/* Time option cards */}
      <View style={styles.commitGrid}>
        {COMMIT_OPTIONS.map((min) => {
          const isSelected = selectedMinutes === min;
          return (
            <TouchableOpacity
              key={min}
              style={[
                styles.commitCard,
                {
                  backgroundColor: isSelected ? COLORS.primary + '18' : theme.surface,
                  borderColor: isSelected ? COLORS.primary : theme.border,
                  borderWidth: isSelected ? 2 : 1.5,
                },
              ]}
              onPress={() => handleCommitSelect(min)}
              activeOpacity={0.7}
            >
              <Text style={[styles.commitMinutes, { color: isSelected ? COLORS.primary : theme.text }]}>
                {min}
              </Text>
              <Text style={[styles.commitMinLabel, { color: theme.textSecondary }]}>
                {t('onboarding.commitMinUnit')}
              </Text>
              {isSelected && (
                <View style={[styles.goalCheck, { backgroundColor: COLORS.primary }]}>
                  <Ionicons name="checkmark" size={12} color="#fff" />
                </View>
              )}
            </TouchableOpacity>
          );
        })}
      </View>

      {/* Motivational hint based on selected minutes */}
      <View style={[styles.commitHint, { backgroundColor: '#F5A623' + '15', borderColor: '#F5A623' + '40' }]}>
        <Ionicons name="flame-outline" size={18} color="#F5A623" />
        <Text style={[styles.commitHintText, { color: theme.text, fontSize: fontSize.sm }]}>
          {t('onboarding.commitHint_' + selectedMinutes)}
        </Text>
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
    </View>
  );

  // ─── Page 4 — Building Plan (auto-advance) ──────────────────────────────────

  const renderBuilding = () => {
    const plan = selectedGoal ? (PLAN_CONTENT[selectedGoal] ?? DEFAULT_PLAN) : DEFAULT_PLAN;

    return (
      <View style={[styles.page, { width }]}>
        {/* Animated gradient orb */}
        <LinearGradient
          colors={[plan.color + 'AA', plan.color]}
          style={styles.buildingOrb}
        >
          <Ionicons name="sparkles-outline" size={scale(44)} color="#FFFFFF" />
        </LinearGradient>

        <Text style={[styles.title, { color: theme.text, fontSize: fontSize.xxl }]}>
          {t('onboarding.buildingTitle')}
        </Text>

        <View style={styles.buildingSteps}>
          {([
            { opacity: step1Opacity, key: 'onboarding.buildingStep1' },
            { opacity: step2Opacity, key: 'onboarding.buildingStep2' },
            { opacity: step3Opacity, key: 'onboarding.buildingStep3' },
          ] as const).map((step, i) => (
            <Animated.View
              key={i}
              style={[styles.buildingStep, { opacity: step.opacity, backgroundColor: theme.surface }]}
            >
              <View style={[styles.buildingStepCheck, { backgroundColor: plan.color }]}>
                <Ionicons name="checkmark" size={14} color="#FFFFFF" />
              </View>
              <Text style={[styles.buildingStepText, { color: theme.text, fontSize: fontSize.sm }]}>
                {t(step.key)}
              </Text>
            </Animated.View>
          ))}
        </View>
      </View>
    );
  };

  // ─── Page 5 — Your Plan Ready ──────────────────────────────────────────────

  const renderValue = () => {
    const plan = selectedGoal ? (PLAN_CONTENT[selectedGoal] ?? DEFAULT_PLAN) : DEFAULT_PLAN;

    return (
      <View style={[styles.page, { width }]}>
        {/* Badge */}
        <View style={[styles.planBadge, { backgroundColor: plan.color + '20' }]}>
          <Ionicons name="checkmark-circle" size={14} color={plan.color} />
          <Text style={[styles.planBadgeText, { color: plan.color }]}>
            {t('onboarding.planBadge')}
          </Text>
        </View>

        <Text style={[styles.title, { color: theme.text, fontSize: fontSize.xxl }]}>
          {t(plan.titleKey)}
        </Text>

        {/* Recommended technique */}
        <View style={[styles.techniqueCard, { backgroundColor: theme.surface, borderColor: plan.color + '40' }]}>
          <Text style={[styles.techniqueCardLabel, { color: theme.textSecondary, fontSize: fontSize.xs }]}>
            {t('onboarding.yourTechnique')}
          </Text>
          <View style={styles.techniqueCardRow}>
            <LinearGradient colors={[plan.color + '80', plan.color]} style={styles.techniqueCardIcon}>
              <Ionicons name={plan.icon} size={20} color="#FFFFFF" />
            </LinearGradient>
            <Text style={[styles.techniqueCardName, { color: theme.text, fontSize: fontSize.md }]}>
              {t(plan.techniqueNameKey)}
            </Text>
          </View>
        </View>

        {/* Value bullets */}
        <View style={styles.valueBullets}>
          {VALUE_BULLETS.map((b) => (
            <View key={b.key} style={[styles.valueBulletRow, { backgroundColor: theme.surface }]}>
              <View style={[styles.valueBulletIcon, { backgroundColor: b.color + '20' }]}>
                <Ionicons name={b.icon} size={18} color={b.color} />
              </View>
              <Text style={[styles.valueBulletText, { color: theme.text, fontSize: fontSize.sm }]}>
                {t(b.key)}
              </Text>
            </View>
          ))}
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
      </View>
    );
  };

  // ─── Page 6 — Safety ────────────────────────────────────────────────────────

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
        onPress={finishOnboarding}
        activeOpacity={0.8}
        disabled={!safetyChecked}
      >
        <Text style={[styles.primaryButtonText, { fontSize: fontSize.lg, opacity: safetyChecked ? 1 : 0.5 }]}>
          {t('onboarding.startBreathing')}
        </Text>
      </TouchableOpacity>

      <TouchableOpacity style={styles.skipLink} onPress={skipToApp}>
        <Text style={[styles.skipLinkText, { color: theme.textSecondary, fontSize: fontSize.sm }]}>
          {t('onboarding.skipToApp')}
        </Text>
      </TouchableOpacity>
    </View>
  );

  const renderItem = ({ item }: { item: OnboardingPage }) => {
    switch (item.type) {
      case 'hook':     return renderHook();
      case 'goal':     return renderGoal();
      case 'commit':   return renderCommit();
      case 'building': return renderBuilding();
      case 'value':    return renderValue();
      case 'safety':   return renderSafety();
      default:         return null;
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

      {/* Progress dots — hidden on building screen */}
      {currentIndex !== 3 && (
        <View style={styles.dotsContainer}>
          {pages.filter((_, i) => i !== 3).map((_, i) => {
            // Map visual dot index to actual page index (skip building=3)
            const actualIndex = i >= 3 ? i + 1 : i;
            const isActive = currentIndex === actualIndex;
            return (
              <View
                key={i}
                style={[
                  styles.dot,
                  isActive
                    ? { backgroundColor: theme.primary, width: 20 }
                    : { backgroundColor: theme.border },
                ]}
              />
            );
          })}
        </View>
      )}
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

  // ── Hook ──────────────────────────────────────────────────────────────────
  heroOrbWrapper: {
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: SPACING.xl,
  },
  heroOrb: {
    width: scale(110),
    height: scale(110),
    borderRadius: scale(55),
    alignItems: 'center',
    justifyContent: 'center',
  },
  heroOrbRing: {
    position: 'absolute',
    width: scale(130),
    height: scale(130),
    borderRadius: scale(65),
    borderWidth: 1.5,
  },
  hookTitle: {
    fontFamily: FONTS.heavy,
    fontSize: FONT_SIZE.xxl + 6,
    textAlign: 'center',
    marginBottom: SPACING.sm,
    letterSpacing: -0.5,
  },
  socialProofRow: {
    flexDirection: 'row',
    gap: 6,
    marginBottom: SPACING.xl,
    flexWrap: 'wrap',
    justifyContent: 'center',
  },
  socialPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: BORDER_RADIUS.full,
  },
  socialPillText: {
    fontSize: FONT_SIZE.xs,
    fontFamily: FONTS.bold,
  },
  fineprint: {
    fontSize: FONT_SIZE.xs,
    fontFamily: FONTS.medium,
    marginTop: SPACING.sm,
    opacity: 0.7,
  },

  // ── Shared ─────────────────────────────────────────────────────────────────
  title: {
    fontFamily: FONTS.bold,
    textAlign: 'center',
    marginBottom: SPACING.sm,
  },
  subtitle: {
    textAlign: 'center',
    fontFamily: FONTS.medium,
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
    fontFamily: FONTS.bold,
  },
  skipLink: {
    marginTop: SPACING.md,
    paddingVertical: SPACING.sm,
  },
  skipLinkText: {
    textDecorationLine: 'underline',
    fontFamily: FONTS.medium,
  },

  // ── Goal ────────────────────────────────────────────────────────────────────
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
    position: 'relative',
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
  goalCheck: {
    position: 'absolute',
    top: 8,
    right: 8,
    width: 20,
    height: 20,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
  },

  // ── Commit ─────────────────────────────────────────────────────────────────
  commitIconCircle: {
    width: scale(90),
    height: scale(90),
    borderRadius: scale(45),
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: SPACING.lg,
  },
  commitGrid: {
    flexDirection: 'row',
    gap: SPACING.sm,
    justifyContent: 'center',
    marginBottom: SPACING.lg,
  },
  commitCard: {
    width: 70,
    paddingVertical: SPACING.md,
    borderRadius: BORDER_RADIUS.lg,
    alignItems: 'center',
    position: 'relative',
  },
  commitMinutes: {
    fontSize: 26,
    fontFamily: FONTS.heavy,
    letterSpacing: -0.5,
  },
  commitMinLabel: {
    fontSize: FONT_SIZE.xs,
    fontFamily: FONTS.medium,
    marginTop: 2,
  },
  commitHint: {
    width: '100%',
    borderRadius: BORDER_RADIUS.lg,
    borderWidth: 1,
    paddingHorizontal: SPACING.md,
    paddingVertical: SPACING.sm + 4,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    marginBottom: SPACING.sm,
  },
  commitHintText: {
    fontFamily: FONTS.medium,
    flex: 1,
    lineHeight: 20,
  },

  // ── Building ───────────────────────────────────────────────────────────────
  buildingOrb: {
    width: scale(110),
    height: scale(110),
    borderRadius: scale(55),
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: SPACING.xl,
  },
  buildingSteps: {
    width: '100%',
    gap: SPACING.sm,
    marginTop: SPACING.lg,
  },
  buildingStep: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING.sm,
    paddingVertical: SPACING.sm + 2,
    paddingHorizontal: SPACING.md,
    borderRadius: BORDER_RADIUS.md,
  },
  buildingStepCheck: {
    width: 24,
    height: 24,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  buildingStepText: {
    fontFamily: FONTS.semibold,
  },

  // ── Value / Plan Ready ─────────────────────────────────────────────────────
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
  techniqueCard: {
    width: '100%',
    padding: SPACING.md,
    borderRadius: BORDER_RADIUS.lg,
    borderWidth: 1.5,
    marginBottom: SPACING.md,
  },
  techniqueCardLabel: {
    fontFamily: FONTS.semibold,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    marginBottom: 8,
  },
  techniqueCardRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  techniqueCardIcon: {
    width: 36,
    height: 36,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
  },
  techniqueCardName: {
    fontFamily: FONTS.bold,
  },
  valueBullets: {
    width: '100%',
    gap: SPACING.xs + 2,
    marginBottom: SPACING.sm,
  },
  valueBulletRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    paddingVertical: SPACING.sm + 2,
    paddingHorizontal: SPACING.md,
    borderRadius: BORDER_RADIUS.md,
  },
  valueBulletIcon: {
    width: 34,
    height: 34,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
  },
  valueBulletText: {
    fontFamily: FONTS.medium,
    flex: 1,
  },

  // ── Safety ──────────────────────────────────────────────────────────────────
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

  // ── Dots ────────────────────────────────────────────────────────────────────
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
