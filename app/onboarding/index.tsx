import React, { useRef, useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  FlatList,
  TouchableOpacity,
  StyleSheet,
  Dimensions,
  ViewToken,
  TextInput,
  Animated,
  Easing,
  Linking,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { router } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useTranslation } from 'react-i18next';
import { useSettingsStore } from '../../src/store';
import { useProfileStore } from '../../src/store/profileStore';
import { COLORS, SPACING, FONT_SIZE, BORDER_RADIUS, scale } from '../../src/constants';
import { useThemeColors, useFontSize } from '../../src/hooks/useColorScheme';
import { isHealthKitAvailable, requestHealthPermissions } from '../../src/utils/healthKit';

const { width, height } = Dimensions.get('window');
const isCompact = height < 850; // iPhone 12/13/14 (non-Max) = 844pt

interface OnboardingPage {
  id: string;
  iconName?: keyof typeof Ionicons.glyphMap;
  titleKey?: string;
  descriptionKey?: string;
  type: 'info' | 'promise' | 'features' | 'profile' | 'health' | 'loading';
}

const pages: OnboardingPage[] = [
  {
    id: '1',
    type: 'info',
    iconName: 'footsteps-outline',
    titleKey: 'onboarding.page1Title',
    descriptionKey: 'onboarding.page1Description',
  },
  {
    id: '2',
    type: 'features',
  },
  {
    id: '3',
    type: 'profile',
    titleKey: 'onboarding.page4Title',
    descriptionKey: 'onboarding.page4Description',
  },
  {
    id: '4',
    type: 'health',
  },
  {
    id: '5',
    type: 'loading',
  },
];

const STEP_GOAL_OPTIONS = [5000, 8000, 10000, 15000] as const;

const FEATURES = [
  { icon: 'timer-outline', titleKey: 'onboarding.feature1Title', descKey: 'onboarding.feature1Desc' },
  { icon: 'bar-chart-outline', titleKey: 'onboarding.feature2Title', descKey: 'onboarding.feature2Desc' },
  { icon: 'notifications-outline', titleKey: 'onboarding.feature3Title', descKey: 'onboarding.feature3Desc' },
  { icon: 'ribbon-outline', titleKey: 'onboarding.feature4Title', descKey: 'onboarding.feature4Desc' },
] as const;

export default function OnboardingScreen() {
  const { t } = useTranslation();
  const theme = useThemeColors();
  const fontSize = useFontSize();
  const flatListRef = useRef<FlatList>(null);
  const [currentIndex, setCurrentIndex] = useState(0);
  const update = useSettingsStore((s) => s.update);
  const profileUpdate = useProfileStore((s) => s.update);

  const [stepGoal, setStepGoal] = useState(5000);
  const [weightUnit, setWeightUnit] = useState<'kg' | 'lbs'>('kg');
  const [weight, setWeight] = useState('');
  const [age, setAge] = useState('');
  const [weightError, setWeightError] = useState('');
  const [ageError, setAgeError] = useState('');
  const [loadingProgress, setLoadingProgress] = useState(0);
  const loadingStarted = useRef(false);
  const progressAnim = useRef(new Animated.Value(0)).current;

  const onViewableItemsChanged = useRef(
    ({ viewableItems }: { viewableItems: ViewToken[] }) => {
      if (viewableItems.length > 0 && viewableItems[0].index !== null) {
        setCurrentIndex(viewableItems[0].index);
      }
    },
  ).current;

  const viewabilityConfig = useRef({ viewAreaCoveragePercentThreshold: 50 }).current;

  const saveProfileAndFinish = useCallback(() => {
    let weightKg: number | undefined;
    if (weight) {
      const parsed = parseFloat(weight);
      weightKg = weightUnit === 'lbs' ? Math.round(parsed * 0.453592 * 10) / 10 : parsed;
    }
    profileUpdate({
      weight: weightKg,
      age: age ? parseInt(age, 10) : undefined,
    });
    update({ onboardingCompleted: true, dailyStepGoal: stepGoal });
    router.replace('/paywall');
  }, [weight, weightUnit, age, stepGoal, profileUpdate, update]);

  // Loading animation — starts when last page becomes visible
  useEffect(() => {
    if (currentIndex === pages.length - 1 && !loadingStarted.current) {
      loadingStarted.current = true;
      let progress = 0;
      const interval = setInterval(() => {
        progress += Math.random() * 6 + 2;
        if (progress >= 100) {
          progress = 100;
          clearInterval(interval);
          setTimeout(() => saveProfileAndFinish(), 400);
        }
        setLoadingProgress(Math.min(100, Math.round(progress)));
        Animated.timing(progressAnim, {
          toValue: Math.min(100, Math.round(progress)),
          duration: 180,
          easing: Easing.out(Easing.ease),
          useNativeDriver: false,
        }).start();
      }, 200);
      return () => clearInterval(interval);
    }
  }, [currentIndex, saveProfileAndFinish, progressAnim]);

  const handleNext = () => {
    if (currentIndex === 2) {
      // Profile page — validate before proceeding
      let hasError = false;
      if (weight) {
        const w = parseFloat(weight);
        const minW = weightUnit === 'lbs' ? 44 : 20;
        const maxW = weightUnit === 'lbs' ? 1100 : 500;
        if (isNaN(w) || w < minW || w > maxW) {
          setWeightError(t('onboarding.weightError'));
          hasError = true;
        }
      }
      if (age) {
        const a = parseInt(age, 10);
        if (isNaN(a) || a < 5 || a > 120) {
          setAgeError(t('onboarding.ageError'));
          hasError = true;
        }
      }
      if (hasError) return;
    }
    if (currentIndex < pages.length - 1) {
      flatListRef.current?.scrollToIndex({ index: currentIndex + 1 });
    }
  };

  const handleSkip = () => {
    update({ onboardingCompleted: true });
    router.replace('/(tabs)');
  };

  const handleConnectHealth = async () => {
    if (!isHealthKitAvailable()) {
      update({ healthIntegration: false });
      handleNext();
      return;
    }
    const granted = await requestHealthPermissions();
    update({ healthIntegration: granted });
    handleNext();
  };

  const renderInfoPage = (item: OnboardingPage) => (
    <View style={[styles.page, { width }]}>
      {item.iconName && (
        <Ionicons name={item.iconName} size={isCompact ? scale(60) : scale(80)} color={theme.primary} style={styles.icon} />
      )}
      <Text style={[styles.title, { color: theme.text, fontSize: fontSize.xxl }]}>{t(item.titleKey!)}</Text>
      <Text style={[styles.description, { color: theme.textSecondary, fontSize: fontSize.md }]}>
        {t(item.descriptionKey!)}
      </Text>
      {item.id === '1' && (
        <TouchableOpacity
          style={styles.studyLink}
          onPress={() => Linking.openURL('https://pubmed.ncbi.nlm.nih.gov/17605959/')}
          activeOpacity={0.7}
        >
          <Ionicons name="open-outline" size={14} color={theme.primary} />
          <Text style={[styles.studyLinkText, { color: theme.primary, fontSize: fontSize.sm }]}>
            {t('onboarding.studyLink')}
          </Text>
        </TouchableOpacity>
      )}
    </View>
  );

  const renderFeatures = () => (
    <View style={[styles.page, { width }]}>
      <View style={[styles.featuresBadge, { backgroundColor: theme.primary + '15' }]}>
        <Ionicons name="sparkles" size={16} color={theme.primary} />
        <Text style={[styles.featuresBadgeText, { color: theme.primary, fontSize: fontSize.sm }]}>{t('onboarding.featuresTitle')}</Text>
      </View>
      <Text style={[styles.featuresHeadline, { color: theme.text, fontSize: fontSize.xl, lineHeight: fontSize.xl * 1.3 }]} numberOfLines={3} adjustsFontSizeToFit minimumFontScale={0.8}>
        {t('onboarding.featuresHeadline')}
      </Text>
      <View style={[styles.featuresList, { marginTop: SPACING.sm, gap: SPACING.xs }]}>
        {FEATURES.map((f, i) => (
          <View key={i} style={[styles.featureRow, { backgroundColor: theme.surface, paddingVertical: SPACING.sm, paddingHorizontal: SPACING.md }]}>
            <View style={[styles.featureIconWrap, { backgroundColor: theme.primary + '20', width: scale(40), height: scale(40), borderRadius: BORDER_RADIUS.lg }]}>
              <Ionicons name={f.icon} size={20} color={theme.primary} />
            </View>
            <View style={styles.featureText}>
              <Text style={[styles.featureTitle, { color: theme.text, fontSize: fontSize.sm }]}>{t(f.titleKey)}</Text>
              <Text style={[styles.featureDesc, { color: theme.textSecondary, fontSize: fontSize.xs }]} numberOfLines={2}>{t(f.descKey)}</Text>
            </View>
          </View>
        ))}
      </View>
    </View>
  );

  const renderProfile = (item: OnboardingPage) => (
    <View style={[styles.page, { width }]}>
      <Ionicons name="person-circle-outline" size={isCompact ? 40 : 56} color={theme.primary} style={{ marginBottom: isCompact ? SPACING.sm : SPACING.md }} />
      <Text style={[styles.title, { color: theme.text, fontSize: isCompact ? fontSize.xxl : fontSize.xxl + 2 }]}>{t(item.titleKey!)}</Text>
      <Text style={[styles.description, { color: theme.textSecondary, marginBottom: isCompact ? SPACING.md : SPACING.xl, fontSize: isCompact ? fontSize.sm : fontSize.md }]}>
        {t(item.descriptionKey!)}
      </Text>

      <View style={styles.calibrationContainer}>
        <View style={styles.weightRow}>
          <TextInput
            style={[styles.inputLarge, styles.weightInput, { borderColor: weightError ? COLORS.error : theme.border, color: theme.text, backgroundColor: theme.surface }]}
            placeholder={t('onboarding.weightPlaceholder')}
            placeholderTextColor={theme.textSecondary}
            keyboardType="numeric"
            maxLength={5}
            value={weight}
            onChangeText={(v) => { const clean = v.replace(/[^0-9.]/g, ''); setWeight(clean); setWeightError(''); }}
          />
          <View style={[styles.unitToggle, { backgroundColor: theme.surface, borderColor: theme.border }]}>
            {(['kg', 'lbs'] as const).map((unit) => (
              <TouchableOpacity
                key={unit}
                style={[
                  styles.unitButton,
                  weightUnit === unit && { backgroundColor: theme.primary },
                ]}
                onPress={() => { setWeightUnit(unit); setWeight(''); setWeightError(''); }}
              >
                <Text style={[styles.unitText, { color: theme.text }, weightUnit === unit && { color: COLORS.white }]}>
                  {unit}
                </Text>
              </TouchableOpacity>
            ))}
          </View>
        </View>
        {!!weightError && (
          <Text style={[styles.fieldError, { fontSize: fontSize.xs }]}>{weightError}</Text>
        )}

        <TextInput
          style={[styles.inputLarge, styles.ageInput, { borderColor: ageError ? COLORS.error : theme.border, color: theme.text, backgroundColor: theme.surface }]}
          placeholder={t('onboarding.agePlaceholder')}
          placeholderTextColor={theme.textSecondary}
          keyboardType="number-pad"
          maxLength={3}
          value={age}
          onChangeText={(v) => { const clean = v.replace(/[^0-9]/g, ''); setAge(clean); setAgeError(''); }}
        />
        {!!ageError && (
          <Text style={[styles.fieldError, { fontSize: fontSize.xs, marginBottom: SPACING.sm }]}>{ageError}</Text>
        )}

        <Text style={[styles.sectionLabel, { color: theme.text, fontSize: fontSize.md, marginTop: isCompact ? SPACING.sm : SPACING.md }]}>
          {t('onboarding.stepGoalTitle')}
        </Text>
        <View style={styles.stepGoalRow}>
          {STEP_GOAL_OPTIONS.map((goal) => (
            <TouchableOpacity
              key={goal}
              style={[
                styles.stepGoalButton,
                { borderColor: theme.border, backgroundColor: theme.surface },
                stepGoal === goal && [styles.stepGoalButtonActive, { backgroundColor: theme.primary, borderColor: theme.primary }],
              ]}
              onPress={() => setStepGoal(goal)}
            >
              <Text style={[styles.stepGoalValue, { color: theme.text }, stepGoal === goal && { color: COLORS.white }]}>
                {goal >= 1000 ? `${goal / 1000}k` : goal}
              </Text>
              <Text style={[styles.stepGoalLabel, { color: theme.textSecondary }, stepGoal === goal && { color: 'rgba(255,255,255,0.7)' }]} numberOfLines={1} adjustsFontSizeToFit>
                {t('onboarding.stepsLabel')}
              </Text>
            </TouchableOpacity>
          ))}
        </View>
      </View>
    </View>
  );

  const renderHealth = () => (
    <View style={[styles.page, { width }]}>
      <Ionicons name="heart-circle-outline" size={isCompact ? scale(60) : scale(80)} color={theme.primary} style={styles.icon} />
      <Text style={[styles.title, { color: theme.text, fontSize: fontSize.xxl }]} numberOfLines={2} adjustsFontSizeToFit>{t('onboarding.healthTitle')}</Text>
      <Text style={[styles.description, { color: theme.textSecondary, marginBottom: SPACING.xl, fontSize: fontSize.md }]} numberOfLines={4} adjustsFontSizeToFit>
        {t('onboarding.healthDescription')}
      </Text>

      <TouchableOpacity style={[styles.connectHealthButton, { backgroundColor: theme.primary }]} onPress={handleConnectHealth} activeOpacity={0.8}>
        <Ionicons name="heart" size={20} color={COLORS.white} style={{ marginRight: SPACING.sm }} />
        <Text style={[styles.connectHealthText, { fontSize: fontSize.lg }]} numberOfLines={1} adjustsFontSizeToFit>{t('onboarding.connectHealth')}</Text>
      </TouchableOpacity>

      <TouchableOpacity style={styles.skipLink} onPress={handleNext}>
        <Text style={[styles.skipLinkText, { color: theme.textSecondary }]}>
          {t('onboarding.skipHealth')}
        </Text>
      </TouchableOpacity>
    </View>
  );

  const LOADING_STEPS = [
    { key: 'onboarding.loadingStep1', threshold: 0 },
    { key: 'onboarding.loadingStep2', threshold: 25 },
    { key: 'onboarding.loadingStep3', threshold: 50 },
    { key: 'onboarding.loadingStep4', threshold: 75 },
  ];

  const stepAnims = useRef(LOADING_STEPS.map(() => new Animated.Value(0))).current;

  useEffect(() => {
    LOADING_STEPS.forEach((step, i) => {
      if (loadingProgress >= step.threshold) {
        Animated.timing(stepAnims[i], {
          toValue: 1,
          duration: 400,
          easing: Easing.out(Easing.ease),
          useNativeDriver: true,
        }).start();
      }
    });
  }, [loadingProgress, stepAnims]);

  const renderLoading = () => {
    const progressWidth = progressAnim.interpolate({
      inputRange: [0, 100],
      outputRange: ['0%', '100%'],
    });

    return (
      <View style={[styles.page, { width, backgroundColor: theme.primary }]}>
        <Ionicons name="walk-outline" size={36} color="rgba(255,255,255,0.5)" style={styles.loadingWalkIcon} />
        <View style={[styles.loadingCircleOuter, isCompact && { width: scale(130), height: scale(130), borderRadius: scale(65) }]}>
          <View style={[styles.loadingCircle, isCompact && { width: scale(110), height: scale(110), borderRadius: scale(55) }]}>
            <Text style={styles.loadingPercent} numberOfLines={1} adjustsFontSizeToFit>{loadingProgress}%</Text>
          </View>
        </View>
        <Text style={[styles.loadingTitle, { fontSize: fontSize.xxl + 2 }]}>{t('onboarding.loadingTitle')}</Text>
        <Text style={[styles.loadingSubtitle, { fontSize: fontSize.md }]}>{t('onboarding.loadingSubtitle')}</Text>

        <View style={styles.loadingSteps}>
          {LOADING_STEPS.map((step, i) => {
            const done = loadingProgress >= (LOADING_STEPS[i + 1]?.threshold ?? 100);
            return (
              <Animated.View
                key={i}
                style={[
                  styles.loadingStepRow,
                  {
                    opacity: stepAnims[i],
                    transform: [{ translateY: stepAnims[i].interpolate({ inputRange: [0, 1], outputRange: [12, 0] }) }],
                  },
                ]}
              >
                <Ionicons
                  name={done ? 'checkmark-circle' : 'ellipse-outline'}
                  size={18}
                  color={done ? 'rgba(255,255,255,0.95)' : 'rgba(255,255,255,0.45)'}
                />
                <Text style={[styles.loadingStepText, done && styles.loadingStepTextDone]}>
                  {t(step.key)}
                </Text>
              </Animated.View>
            );
          })}
        </View>

        <View style={styles.loadingBarBg}>
          <Animated.View style={[styles.loadingBarFill, { width: progressWidth }]} />
        </View>
      </View>
    );
  };

  const renderItem = ({ item }: { item: OnboardingPage }) => {
    switch (item.type) {
      case 'info':
      case 'promise':
        return renderInfoPage(item);
      case 'features':
        return renderFeatures();
      case 'profile':
        return renderProfile(item);
      case 'health':
        return renderHealth();
      case 'loading':
        return renderLoading();
      default:
        return null;
    }
  };

  const isLoadingPage = currentIndex === pages.length - 1;
  const isHealthPage = currentIndex === pages.length - 2;
  const showSkip = currentIndex <= 1; // Show skip on pages 1-2

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: isLoadingPage ? theme.primary : theme.background }]}>
      <View style={styles.skipContainer}>
        {showSkip && (
          <TouchableOpacity onPress={handleSkip}>
            <Text style={[styles.skipText, { color: theme.textSecondary, fontSize: fontSize.md }]}>{t('onboarding.skip')}</Text>
          </TouchableOpacity>
        )}
      </View>

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
        scrollEnabled={!isLoadingPage}
      />

      {!isLoadingPage && !isHealthPage && (
        <View style={styles.footer}>
          <View style={styles.dots}>
            {pages.slice(0, -1).map((_, i) => (
              <View
                key={i}
                style={[
                  styles.dot,
                  {
                    backgroundColor:
                      i === currentIndex ? theme.primary : theme.border,
                  },
                ]}
              />
            ))}
          </View>

          <TouchableOpacity
            style={[styles.nextButton, { backgroundColor: theme.primary }]}
            onPress={handleNext}
            activeOpacity={0.8}
          >
            <Text style={[styles.nextButtonText, { fontSize: fontSize.lg }]} numberOfLines={1} adjustsFontSizeToFit>
              {t('onboarding.next')}
            </Text>
          </TouchableOpacity>
        </View>
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  skipContainer: {
    alignItems: 'flex-end',
    paddingHorizontal: SPACING.lg,
    paddingTop: SPACING.sm,
    height: 40,
  },
  skipText: {
    fontSize: FONT_SIZE.md,
    fontWeight: '500',
  },
  page: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: SPACING.xl,
    overflow: 'hidden',
  },
  icon: {
    marginBottom: SPACING.xl,
  },
  title: {
    fontSize: FONT_SIZE.xxl,
    fontWeight: '700',
    textAlign: 'center',
    marginBottom: SPACING.md,
  },
  description: {
    fontSize: FONT_SIZE.md,
    textAlign: 'center',
    lineHeight: 24,
  },
  studyLink: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING.xs,
    marginTop: SPACING.md,
  },
  studyLinkText: {
    fontSize: FONT_SIZE.sm,
    fontWeight: '600',
  },
  footer: {
    paddingHorizontal: SPACING.lg,
    paddingBottom: SPACING.xl,
  },
  dots: {
    flexDirection: 'row',
    justifyContent: 'center',
    gap: SPACING.sm,
    marginBottom: SPACING.lg,
  },
  dot: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  nextButton: {
    paddingVertical: SPACING.md,
    borderRadius: BORDER_RADIUS.xl,
    alignItems: 'center',
  },
  nextButtonText: {
    color: COLORS.white,
    fontSize: FONT_SIZE.lg,
    fontWeight: '700',
  },

  // Features
  featuresBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    paddingHorizontal: SPACING.sm + 2,
    paddingVertical: SPACING.xs,
    borderRadius: BORDER_RADIUS.full,
    marginBottom: SPACING.sm,
  },
  featuresBadgeText: {
    fontSize: FONT_SIZE.sm,
    fontWeight: '700',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  featuresHeadline: {
    fontWeight: '800',
    textAlign: 'center',
    marginBottom: SPACING.xs,
    lineHeight: 32,
  },
  featuresList: {
    alignSelf: 'stretch',
    marginTop: SPACING.xl,
    gap: SPACING.sm + 2,
  },
  featureRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING.sm + 2,
    paddingVertical: SPACING.sm,
    paddingHorizontal: SPACING.sm + 2,
    borderRadius: BORDER_RADIUS.lg,
  },
  featureIconWrap: {
    width: scale(40),
    height: scale(40),
    borderRadius: BORDER_RADIUS.md,
    alignItems: 'center',
    justifyContent: 'center',
  },
  featureText: {
    flex: 1,
  },
  featureTitle: {
    fontWeight: '700',
    marginBottom: 3,
  },
  featureDesc: {
    lineHeight: 18,
  },

  // Profile / Calibration
  calibrationContainer: {
    paddingHorizontal: SPACING.md,
    width: '100%',
    alignItems: 'center',
  },
  sectionLabel: {
    fontSize: FONT_SIZE.md,
    fontWeight: '700',
    marginBottom: SPACING.sm + 2,
    alignSelf: 'flex-start',
  },
  weightRow: {
    flexDirection: 'row',
    gap: SPACING.sm,
    width: '100%',
    alignItems: 'center',
    marginBottom: SPACING.xs,
  },
  weightInput: {
    flex: 1,
  },
  unitToggle: {
    flexDirection: 'row',
    borderWidth: 1.5,
    borderRadius: BORDER_RADIUS.lg,
    overflow: 'hidden',
  },
  unitButton: {
    paddingHorizontal: SPACING.md,
    paddingVertical: SPACING.md,
  },
  unitText: {
    fontSize: FONT_SIZE.sm,
    fontWeight: '700',
  },
  ageInput: {
    width: '100%',
    marginBottom: SPACING.xs,
  },
  inputLarge: {
    borderWidth: 1.5,
    borderRadius: BORDER_RADIUS.lg,
    padding: SPACING.md,
    fontSize: FONT_SIZE.lg,
    textAlign: 'center',
    fontWeight: '500',
  },
  fieldError: {
    color: COLORS.error,
    fontSize: FONT_SIZE.xs,
    marginTop: SPACING.xs,
    textAlign: 'center',
  },
  stepGoalRow: {
    flexDirection: 'row',
    gap: SPACING.sm,
    marginBottom: SPACING.lg,
  },
  stepGoalButton: {
    flex: 1,
    alignItems: 'center',
    paddingVertical: SPACING.md,
    borderRadius: BORDER_RADIUS.lg,
    borderWidth: 1.5,
  },
  stepGoalButtonActive: {},
  stepGoalValue: {
    fontSize: FONT_SIZE.xl,
    fontWeight: '800',
  },
  stepGoalLabel: {
    fontSize: FONT_SIZE.xs,
    marginTop: 2,
  },

  // Health
  connectHealthButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: SPACING.md,
    paddingHorizontal: SPACING.xl,
    borderRadius: BORDER_RADIUS.xl,
    marginBottom: SPACING.lg,
  },
  connectHealthText: {
    color: COLORS.white,
    fontSize: FONT_SIZE.lg,
    fontWeight: '700',
  },
  skipLink: {
    marginTop: SPACING.sm,
  },
  skipLinkText: {
    fontSize: FONT_SIZE.sm,
    textDecorationLine: 'underline',
  },

  // Loading
  loadingWalkIcon: {
    marginBottom: SPACING.lg,
  },
  loadingCircleOuter: {
    width: scale(160),
    height: scale(160),
    borderRadius: scale(80),
    backgroundColor: 'rgba(255,255,255,0.08)',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: SPACING.xl,
  },
  loadingCircle: {
    width: scale(136),
    height: scale(136),
    borderRadius: scale(68),
    borderWidth: 4,
    borderColor: 'rgba(255,255,255,0.3)',
    backgroundColor: 'rgba(255,255,255,0.06)',
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: SPACING.md,
  },
  loadingPercent: {
    fontSize: FONT_SIZE.xxxl + 4,
    fontWeight: '800',
    color: COLORS.white,
  },
  loadingTitle: {
    fontSize: FONT_SIZE.xxl,
    fontWeight: '800',
    color: COLORS.white,
    textAlign: 'center',
    marginBottom: SPACING.xs,
  },
  loadingSubtitle: {
    fontSize: FONT_SIZE.md,
    color: 'rgba(255,255,255,0.7)',
    textAlign: 'center',
    marginBottom: SPACING.lg,
  },
  loadingSteps: {
    alignSelf: 'stretch',
    paddingHorizontal: SPACING.xxl + SPACING.md,
    marginBottom: SPACING.xl,
    gap: SPACING.sm + 2,
  },
  loadingStepRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING.sm,
  },
  loadingStepText: {
    fontSize: FONT_SIZE.md,
    color: 'rgba(255,255,255,0.5)',
    fontWeight: '500',
  },
  loadingStepTextDone: {
    color: 'rgba(255,255,255,0.95)',
  },
  loadingBarBg: {
    width: '70%',
    height: 6,
    backgroundColor: 'rgba(255,255,255,0.2)',
    borderRadius: 3,
    overflow: 'hidden',
  },
  loadingBarFill: {
    height: '100%',
    backgroundColor: COLORS.white,
    borderRadius: 3,
  },
});
