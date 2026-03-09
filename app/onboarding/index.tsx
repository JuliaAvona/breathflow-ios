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
import { router } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useTranslation } from 'react-i18next';
import { useSettingsStore } from '../../src/store';
import { TechniqueCategory } from '../../src/types';
import { COLORS, SPACING, FONT_SIZE, BORDER_RADIUS, scale } from '../../src/constants';
import { useThemeColors, useFontSize } from '../../src/hooks/useColorScheme';

const { width } = Dimensions.get('window');

interface OnboardingPage {
  id: string;
  type: 'welcome' | 'goal' | 'safety' | 'ready';
}

const pages: OnboardingPage[] = [
  { id: '1', type: 'welcome' },
  { id: '2', type: 'goal' },
  { id: '3', type: 'safety' },
  { id: '4', type: 'ready' },
];

const GOAL_OPTIONS: { category: TechniqueCategory; emoji: string; labelKey: string }[] = [
  { category: 'calm', emoji: '\u{1F60C}', labelKey: 'category.calm' },
  { category: 'sleep', emoji: '\u{1F634}', labelKey: 'category.sleep' },
  { category: 'focus', emoji: '\u{1F3AF}', labelKey: 'category.focus' },
  { category: 'energy', emoji: '\u{26A1}', labelKey: 'category.energy' },
];

const GOAL_RECOMMENDATIONS: Record<string, string> = {
  calm: 'onboarding.recommendCalm',
  sleep: 'onboarding.recommendSleep',
  focus: 'onboarding.recommendFocus',
  energy: 'onboarding.recommendEnergy',
};

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

  const finishOnboarding = useCallback(() => {
    setSetting('onboardingCompleted', true);
    router.replace('/(tabs)');
  }, [setSetting]);

  const handleGoalSelect = useCallback((category: TechniqueCategory) => {
    setSelectedGoal(category);
    setSetting('selectedGoal', category);
  }, [setSetting]);

  const handleSafetyContinue = useCallback(() => {
    setSetting('safetyAccepted', true);
    goToNext();
  }, [setSetting, goToNext]);

  // Page 1 — Welcome
  const renderWelcome = () => (
    <View style={[styles.page, { width }]}>
      <View style={[styles.iconCircle, { backgroundColor: theme.primary + '15' }]}>
        <Ionicons name="fitness-outline" size={scale(64)} color={theme.primary} />
      </View>
      <Text style={[styles.title, { color: theme.text, fontSize: fontSize.xxl + 4 }]}>
        BreathFlow
      </Text>
      <Text style={[styles.subtitle, { color: theme.textSecondary, fontSize: fontSize.md }]}>
        {t('onboarding.welcome')}
      </Text>
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

  // Page 2 — Choose Your Goal
  const renderGoal = () => (
    <View style={[styles.page, { width }]}>
      <Text style={[styles.title, { color: theme.text, fontSize: fontSize.xxl }]}>
        {t('onboarding.chooseGoal')}
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
                  backgroundColor: theme.surface,
                  borderColor: isSelected ? theme.primary : theme.border,
                  borderWidth: isSelected ? 2.5 : 1.5,
                },
              ]}
              onPress={() => handleGoalSelect(goal.category)}
              activeOpacity={0.7}
            >
              <Text style={styles.goalEmoji}>{goal.emoji}</Text>
              <Text
                style={[
                  styles.goalLabel,
                  { color: isSelected ? theme.primary : theme.text, fontSize: fontSize.md },
                ]}
              >
                {t(goal.labelKey)}
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

  // Page 3 — Safety Warning
  const renderSafety = () => (
    <View style={[styles.page, { width }]}>
      <Ionicons
        name="warning-outline"
        size={scale(48)}
        color={theme.primary}
        style={styles.safetyIcon}
      />
      <Text style={[styles.title, { color: theme.text, fontSize: fontSize.xxl }]}>
        {t('onboarding.safety')}
      </Text>
      <View style={styles.safetyList}>
        {SAFETY_ITEMS.map((key, i) => (
          <View key={i} style={[styles.safetyRow, { backgroundColor: theme.surface }]}>
            <Ionicons name="alert-circle-outline" size={20} color={theme.primary} />
            <Text
              style={[styles.safetyText, { color: theme.text, fontSize: fontSize.sm }]}
              numberOfLines={2}
            >
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
        <Text
          style={[
            styles.primaryButtonText,
            { fontSize: fontSize.lg, opacity: safetyChecked ? 1 : 0.5 },
          ]}
        >
          {t('onboarding.continue')}
        </Text>
      </TouchableOpacity>
    </View>
  );

  // Page 4 — Ready!
  const renderReady = () => {
    const recommendKey = selectedGoal
      ? GOAL_RECOMMENDATIONS[selectedGoal]
      : 'onboarding.recommendDefault';

    return (
      <View style={[styles.page, { width }]}>
        <Ionicons
          name="checkmark-circle-outline"
          size={scale(72)}
          color={theme.primary}
          style={styles.readyIcon}
        />
        <Text style={[styles.title, { color: theme.text, fontSize: fontSize.xxl + 2 }]}>
          {t('onboarding.ready')}
        </Text>
        <Text style={[styles.subtitle, { color: theme.textSecondary, fontSize: fontSize.md }]}>
          {t(recommendKey)}
        </Text>
        <TouchableOpacity
          style={[styles.primaryButton, { backgroundColor: theme.primary }]}
          onPress={finishOnboarding}
          activeOpacity={0.8}
        >
          <Text style={[styles.primaryButtonText, { fontSize: fontSize.lg }]}>
            {t('onboarding.startBreathing')}
          </Text>
        </TouchableOpacity>
        <TouchableOpacity style={styles.skipLink} onPress={finishOnboarding}>
          <Text
            style={[styles.skipLinkText, { color: theme.textSecondary, fontSize: fontSize.sm }]}
          >
            {t('onboarding.skipToApp')}
          </Text>
        </TouchableOpacity>
      </View>
    );
  };

  const renderItem = ({ item }: { item: OnboardingPage }) => {
    switch (item.type) {
      case 'welcome':
        return renderWelcome();
      case 'goal':
        return renderGoal();
      case 'safety':
        return renderSafety();
      case 'ready':
        return renderReady();
      default:
        return null;
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

      <View style={styles.dotsContainer}>
        {pages.map((_, i) => (
          <View
            key={i}
            style={[
              styles.dot,
              {
                backgroundColor: i === currentIndex ? theme.primary : theme.border,
              },
            ]}
          />
        ))}
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  page: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: SPACING.xl,
  },

  // Welcome
  iconCircle: {
    width: scale(120),
    height: scale(120),
    borderRadius: scale(60),
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: SPACING.xl,
  },
  title: {
    fontSize: FONT_SIZE.xxl,
    fontWeight: '700',
    textAlign: 'center',
    marginBottom: SPACING.md,
  },
  subtitle: {
    fontSize: FONT_SIZE.md,
    textAlign: 'center',
    lineHeight: 24,
    marginBottom: SPACING.xl,
    paddingHorizontal: SPACING.md,
  },
  primaryButton: {
    width: '100%',
    paddingVertical: SPACING.md + 2,
    borderRadius: BORDER_RADIUS.xl,
    alignItems: 'center',
    marginTop: SPACING.md,
  },
  primaryButtonText: {
    color: COLORS.white,
    fontSize: FONT_SIZE.lg,
    fontWeight: '700',
  },

  // Goal
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
    paddingVertical: SPACING.lg,
    borderRadius: BORDER_RADIUS.lg,
  },
  goalEmoji: {
    fontSize: 32,
    marginBottom: SPACING.sm,
  },
  goalLabel: {
    fontWeight: '600',
  },

  // Safety
  safetyIcon: {
    marginBottom: SPACING.lg,
  },
  safetyList: {
    width: '100%',
    gap: SPACING.sm,
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
    fontWeight: '500',
  },

  // Ready
  readyIcon: {
    marginBottom: SPACING.lg,
  },

  // Skip link
  skipLink: {
    marginTop: SPACING.md,
    paddingVertical: SPACING.sm,
  },
  skipLinkText: {
    textDecorationLine: 'underline',
  },

  // Dots
  dotsContainer: {
    flexDirection: 'row',
    justifyContent: 'center',
    gap: SPACING.sm,
    paddingBottom: SPACING.xl,
  },
  dot: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
});
