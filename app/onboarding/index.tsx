import React, { useRef, useState, useCallback, useEffect } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  Animated,
  ScrollView,
  ImageBackground,
} from 'react-native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { useTranslation } from 'react-i18next';
import { router } from 'expo-router';
import { useSettingsStore } from '../../src/store';
import { TechniqueCategory } from '../../src/types';
import { COLORS, SPACING, FONT_SIZE, BORDER_RADIUS, FONTS, scale } from '../../src/constants';
import { BreathingMandala } from '../../src/components/BreathingMandala';
import { logCompletedRegistration, requestAttPermission } from '../../src/utils/facebookEvents';

// ── Data ──────────────────────────────────────────────────────────────────────

type GoalOption = {
  category: TechniqueCategory;
  icon: keyof typeof Ionicons.glyphMap;
  color: string;
  labelKey: string;
  subKey: string;
};

const GOAL_OPTIONS: GoalOption[] = [
  { category: 'calm',   icon: 'leaf-outline',  color: '#7BC4A8', labelKey: 'onboarding.goalCalmLabel',   subKey: 'onboarding.goalCalmSub' },
  { category: 'sleep',  icon: 'moon-outline',  color: '#7B68AE', labelKey: 'onboarding.goalSleepLabel',  subKey: 'onboarding.goalSleepSub' },
  { category: 'focus',  icon: 'eye-outline',   color: '#4A90D9', labelKey: 'onboarding.goalFocusLabel',  subKey: 'onboarding.goalFocusSub' },
  { category: 'energy', icon: 'flash-outline', color: '#F5A623', labelKey: 'onboarding.goalEnergyLabel', subKey: 'onboarding.goalEnergySub' },
];

type PlanEntry = {
  titleKey: string;
  techniqueId: string;
  techniqueNameKey: string;
  color: string;
  icon: keyof typeof Ionicons.glyphMap;
  b1Key: string; b2Key: string; b3Key: string;
};

const PLAN_CONTENT: Record<string, PlanEntry> = {
  calm:   { titleKey: 'onboarding.planTitleCalm',   techniqueId: 'coherence',      techniqueNameKey: 'techniques.coherence.name',      color: '#7BC4A8', icon: 'radio-outline',  b1Key: 'onboarding.planCalmB1',   b2Key: 'onboarding.planCalmB2',   b3Key: 'onboarding.planCalmB3'   },
  sleep:  { titleKey: 'onboarding.planTitleSleep',  techniqueId: 'fourSevenEight', techniqueNameKey: 'techniques.fourSevenEight.name', color: '#7B68AE', icon: 'moon-outline',   b1Key: 'onboarding.planSleepB1',  b2Key: 'onboarding.planSleepB2',  b3Key: 'onboarding.planSleepB3'  },
  focus:  { titleKey: 'onboarding.planTitleFocus',  techniqueId: 'box',            techniqueNameKey: 'techniques.box.name',            color: '#4A90D9', icon: 'cube-outline',   b1Key: 'onboarding.planFocusB1',  b2Key: 'onboarding.planFocusB2',  b3Key: 'onboarding.planFocusB3'  },
  energy: { titleKey: 'onboarding.planTitleEnergy', techniqueId: 'triangle',       techniqueNameKey: 'techniques.triangle.name',       color: '#F5A623', icon: 'flash-outline',  b1Key: 'onboarding.planEnergyB1', b2Key: 'onboarding.planEnergyB2', b3Key: 'onboarding.planEnergyB3' },
};
const DEFAULT_PLAN = PLAN_CONTENT.focus;

const TESTIMONIALS: { nameKey: string; tagKey: string; textKey: string; color: string }[] = [
  { nameKey: 'onboarding.t1Name', tagKey: 'onboarding.t1Tag', textKey: 'onboarding.t1Text', color: '#7B68AE' },
  { nameKey: 'onboarding.t2Name', tagKey: 'onboarding.t2Tag', textKey: 'onboarding.t2Text', color: '#4A90D9' },
  { nameKey: 'onboarding.t3Name', tagKey: 'onboarding.t3Tag', textKey: 'onboarding.t3Text', color: '#7BC4A8' },
];

// ── Shared glass colours ──────────────────────────────────────────────────────
const GLASS_BG       = 'rgba(255,255,255,0.09)';
const GLASS_BORDER   = 'rgba(255,255,255,0.18)';
const GLASS_SEL_BG   = 'rgba(255,255,255,0.20)';
const TEXT_PRIMARY   = '#FFFFFF';
const TEXT_SECONDARY = 'rgba(255,255,255,0.65)';

// ── Component ─────────────────────────────────────────────────────────────────

export default function OnboardingScreen() {
  const { t } = useTranslation();
  const setSetting = useSettingsStore((s) => s.setSetting);
  const insets = useSafeAreaInsets();
  const [page, setPage] = useState(0);
  const [selectedGoal, setSelectedGoal]     = useState<TechniqueCategory | undefined>(undefined);

  const fadeAnim  = useRef(new Animated.Value(1)).current;
  const slideAnim = useRef(new Animated.Value(0)).current;

  // Hook animation
  const hookLabelOpacity = useRef(new Animated.Value(1)).current;
  const [hookBreathDir, setHookBreathDir] = useState<'in' | 'out'>('in');

  // Building steps
  const step1Opacity = useRef(new Animated.Value(0)).current;
  const step2Opacity = useRef(new Animated.Value(0)).current;
  const step3Opacity = useRef(new Animated.Value(0)).current;

  const plan: PlanEntry = selectedGoal ? (PLAN_CONTENT[selectedGoal] ?? DEFAULT_PLAN) : DEFAULT_PLAN;

  // ── Navigation ───────────────────────────────────────────────────────────────

  const goToPage = useCallback((nextPage: number, direction = 1) => {
    Animated.parallel([
      Animated.timing(fadeAnim,  { toValue: 0,   duration: 130, useNativeDriver: true }),
      Animated.timing(slideAnim, { toValue: -28 * direction, duration: 130, useNativeDriver: true }),
    ]).start(() => {
      setPage(nextPage);
      slideAnim.setValue(28 * direction);
      Animated.parallel([
        Animated.timing(fadeAnim,  { toValue: 1, duration: 200, useNativeDriver: true }),
        Animated.timing(slideAnim, { toValue: 0, duration: 200, useNativeDriver: true }),
      ]).start();
    });
  }, [fadeAnim, slideAnim]);

  const goNext = useCallback(() => goToPage(page + 1, 1),  [page, goToPage]);
  const goBack = useCallback(() => goToPage(page - 1, -1), [page, goToPage]);

  // Hook breath cycle — matches mandala slow cycle (8800ms)
  useEffect(() => {
    if (page !== 0) return;
    const HALF = 4400;
    hookLabelOpacity.setValue(1);
    setHookBreathDir('in');
    const loop = Animated.loop(Animated.sequence([
      Animated.timing(hookLabelOpacity, { toValue: 0.35, duration: HALF, useNativeDriver: true }),
      Animated.timing(hookLabelOpacity, { toValue: 1,    duration: HALF, useNativeDriver: true }),
    ]));
    loop.start();
    const interval = setInterval(() => setHookBreathDir((d) => d === 'in' ? 'out' : 'in'), HALF);
    return () => { loop.stop(); clearInterval(interval); };
  }, [page]); // eslint-disable-line react-hooks/exhaustive-deps


  // Building auto-advance (page 3)
  useEffect(() => {
    if (page !== 3) return;
    step1Opacity.setValue(0); step2Opacity.setValue(0); step3Opacity.setValue(0);
    const seq = Animated.sequence([
      Animated.delay(400),
      Animated.timing(step1Opacity, { toValue: 1, duration: 350, useNativeDriver: true }),
      Animated.delay(600),
      Animated.timing(step2Opacity, { toValue: 1, duration: 350, useNativeDriver: true }),
      Animated.delay(600),
      Animated.timing(step3Opacity, { toValue: 1, duration: 350, useNativeDriver: true }),
      Animated.delay(800),
    ]);
    seq.start(() => goToPage(4, 1));
    return () => seq.stop();
  }, [page]); // eslint-disable-line react-hooks/exhaustive-deps

  // ── Handlers ─────────────────────────────────────────────────────────────────

  const handleGoalSelect = useCallback((category: TechniqueCategory) => {
    setSelectedGoal(category);
    setSetting('selectedGoal', category);
  }, [setSetting]);

  const finishOnboarding = useCallback(async () => {
    setSetting('onboardingCompleted', true);
    setSetting('recommendedTechniqueId', plan.techniqueId);
    logCompletedRegistration('onboarding');
    await requestAttPermission();
    router.replace({ pathname: '/paywall', params: { fromOnboarding: '1' } });
  }, [setSetting, plan]);

  // ── Progress ──────────────────────────────────────────────────────────────────
  // Pages: 0 Hook, 1 Goal, 2 Social, 3 Building (hidden), 4 Plan
  const progressVisible = page === 1 || page === 2 || page === 4;
  const progressPct     = page / 4;

  // ── Page 0 — Hook ─────────────────────────────────────────────────────────────

  const renderHook = () => (
    <View style={{ flex: 1 }}>
      <LinearGradient
        colors={['transparent', 'rgba(5,10,30,0.70)', 'rgba(5,10,30,0.92)']}
        style={StyleSheet.absoluteFillObject}
        start={{ x: 0.5, y: 0.35 }}
        end={{ x: 0.5, y: 1 }}
        pointerEvents="none"
      />

      {/* Title at top */}
      <View style={[styles.hookTop, { paddingTop: insets.top + SPACING.xl }]}>
        <Text style={styles.hookTitle}>{t('onboarding.hookTitle')}</Text>
      </View>

      {/* Mandala centered */}
      <View style={styles.hookCenter}>
        <BreathingMandala phase="IDLE" color="#4A90D9" size={scale(260)} bright slow />
        <Animated.Text style={[styles.hookBreathLabel, { opacity: hookLabelOpacity, marginTop: SPACING.md }]}>
          {hookBreathDir === 'in' ? t('phase.breatheIn') : t('phase.breatheOut')}
        </Animated.Text>
      </View>

      {/* Button at bottom */}
      <View style={styles.hookContent}>
        <TouchableOpacity style={styles.primaryBtn} onPress={goNext} activeOpacity={0.85}>
          <Text style={styles.primaryBtnText}>{t('onboarding.getStarted')}</Text>
        </TouchableOpacity>
      </View>
    </View>
  );

  // ── Page 1 — Goal ─────────────────────────────────────────────────────────────

  const renderGoal = () => (
    <View style={[styles.pageContent, { justifyContent: 'space-between' }]}>
      <ScrollView style={{ flex: 1 }} contentContainerStyle={styles.goalScroll} showsVerticalScrollIndicator={false}>
        <Text style={styles.pageTitle}>{t('onboarding.chooseGoal')}</Text>
        <Text style={[styles.pageSub, { marginBottom: SPACING.lg }]}>{t('onboarding.chooseGoalSub')}</Text>
        <View style={styles.optionList}>
          {GOAL_OPTIONS.map((g) => {
            const sel = selectedGoal === g.category;
            return (
              <TouchableOpacity
                key={g.category}
                style={[styles.optionRow, sel && styles.optionRowSelected, sel && { borderColor: g.color }]}
                onPress={() => handleGoalSelect(g.category)}
                activeOpacity={0.8}
              >
                <View style={[styles.optionIconCircle, { backgroundColor: g.color + (sel ? '40' : '24') }]}>
                  <Ionicons name={g.icon} size={23} color={g.color} />
                </View>
                <View style={styles.optionTexts}>
                  <Text style={styles.optionLabel}>{t(g.labelKey)}</Text>
                  <Text style={styles.optionSub}>{t(g.subKey)}</Text>
                </View>
                {sel
                  ? <View style={[styles.checkCircle, { backgroundColor: g.color }]}><Ionicons name="checkmark" size={14} color="#FFF" /></View>
                  : <Ionicons name="chevron-forward" size={18} color="rgba(255,255,255,0.35)" />}
              </TouchableOpacity>
            );
          })}
        </View>
      </ScrollView>

      <TouchableOpacity
        style={[styles.primaryBtn, !selectedGoal && { opacity: 0.4 }]}
        onPress={goNext}
        activeOpacity={0.85}
        disabled={!selectedGoal}
      >
        <Text style={styles.primaryBtnText}>{t('onboarding.continue')}</Text>
      </TouchableOpacity>
    </View>
  );

  // ── Page 3 — Building (hidden) ───────────────────────────────────────────────

  const renderBuilding = () => (
    <View style={[styles.pageContent, { justifyContent: 'center' }]}>
      <View style={{ alignItems: 'center', marginBottom: SPACING.lg }}>
        <BreathingMandala phase="IDLE" color={plan.color} size={scale(160)} bright slow />
      </View>
      <Text style={[styles.pageTitle, { textAlign: 'center', marginBottom: SPACING.xl }]}>{t('onboarding.buildingTitle')}</Text>
      <View style={{ gap: SPACING.md }}>
        {([
          { opacity: step1Opacity, key: 'onboarding.buildingStep1' },
          { opacity: step2Opacity, key: 'onboarding.buildingStep2' },
          { opacity: step3Opacity, key: 'onboarding.buildingStep3' },
        ] as const).map((s, i) => (
          <Animated.View key={i} style={[styles.bulletRow, { opacity: s.opacity }]}>
            <View style={[styles.stepDot, { backgroundColor: plan.color }]}><Ionicons name="checkmark" size={12} color="#FFF" /></View>
            <Text style={styles.bulletText}>{t(s.key)}</Text>
          </Animated.View>
        ))}
      </View>
    </View>
  );

  // ── Page 4 — Plan ─────────────────────────────────────────────────────────────

  const renderPlan = () => (
    <ScrollView style={{ flex: 1 }} contentContainerStyle={[styles.pageContent, { flexGrow: 1, justifyContent: 'center', paddingBottom: 32 }]} showsVerticalScrollIndicator={false}>
      {/* Badge */}
      <View style={[styles.planBadge, { backgroundColor: plan.color, borderColor: 'transparent' }]}>
        <Ionicons name="sparkles" size={14} color="#FFFFFF" />
        <Text style={[styles.planBadgeText, { color: '#FFFFFF' }]}>{t('onboarding.planBadge')}</Text>
      </View>

      {/* Title */}
      <Text style={styles.pageTitle}>{t(plan.titleKey)}</Text>

      {/* Technique inline */}
      <View style={[styles.techniquePill, { backgroundColor: plan.color + '20', borderColor: plan.color + '40' }]}>
        <Ionicons name={plan.icon} size={15} color={plan.color} />
        <Text style={[styles.techniquePillText, { color: plan.color }]}>{t(plan.techniqueNameKey)}</Text>
      </View>

      {/* Bullets */}
      <View style={{ gap: SPACING.lg, marginTop: SPACING.xl, marginBottom: SPACING.xl }}>
        {[plan.b1Key, plan.b2Key, plan.b3Key].map((key, i) => (
          <View key={i} style={styles.bulletRow}>
            <Ionicons name="checkmark-circle" size={20} color={plan.color} />
            <Text style={styles.bulletText}>{t(key)}</Text>
          </View>
        ))}
      </View>

      <TouchableOpacity style={styles.primaryBtn} onPress={finishOnboarding} activeOpacity={0.85}>
        <Text style={styles.primaryBtnText}>{t('onboarding.continue')}</Text>
      </TouchableOpacity>
    </ScrollView>
  );

  // ── Page 2 — Social Proof (testimonials) ─────────────────────────────────────

  const renderSocialProof = () => (
    <View style={[styles.pageContent, { justifyContent: 'space-between' }]}>
      <View style={{ flex: 1 }}>
        <Text style={styles.pageTitle}>{t('onboarding.socialProofTitle')}</Text>
        <Text style={styles.pageSub}>{t('onboarding.socialProofSub')}</Text>
        {/* flex:1 on the list + flex:1 on every card means the 3 cards always
            divide whatever height is actually available, on any screen size
            — that's what guarantees they can never get clipped against the
            button below, the way a fixed/scrolling layout could. */}
        <View style={styles.testimonialList}>
          {TESTIMONIALS.map((tm, i) => (
            <View key={i} style={[styles.testimonialCard, { borderColor: tm.color + '40', borderLeftColor: tm.color }]}>
              <Text style={[styles.testimonialQuoteMark, { color: tm.color + '4D' }]}>{'“'}</Text>
              <View style={styles.testimonialHeader}>
                <View style={[styles.testimonialAvatar, { backgroundColor: tm.color }]}>
                  <Text style={styles.testimonialAvatarLetter}>{t(tm.nameKey).charAt(0)}</Text>
                </View>
                <View style={{ flex: 1 }}>
                  <View style={styles.testimonialNameRow}>
                    <Text style={styles.testimonialName}>{t(tm.nameKey)}</Text>
                    <Ionicons name="checkmark-circle" size={13} color={tm.color} />
                  </View>
                  <Text style={styles.testimonialTag}>{t(tm.tagKey)}</Text>
                </View>
                <View style={styles.testimonialStars}>
                  {[0,1,2,3,4].map((s) => <Ionicons key={s} name="star" size={11} color="#F5C542" />)}
                </View>
              </View>
              {/* Capped at 2 lines — the longest quote (Priya's) was the one
                  spilling past the card and getting clipped by the button. */}
              <Text style={styles.testimonialText} numberOfLines={2} ellipsizeMode="tail">
                {t(tm.textKey)}
              </Text>
            </View>
          ))}
        </View>
      </View>

      <TouchableOpacity style={styles.primaryBtn} onPress={goNext} activeOpacity={0.85}>
        <Text style={styles.primaryBtnText}>{t('onboarding.continue')}</Text>
      </TouchableOpacity>
    </View>
  );

  const renderPage = () => {
    switch (page) {
      case 0: return renderHook();
      case 1: return renderGoal();
      case 2: return renderSocialProof();
      case 3: return renderBuilding();
      case 4: return renderPlan();
      default: return null;
    }
  };

  // ── Root ──────────────────────────────────────────────────────────────────────

  return (
    <ImageBackground
      source={require('../../assets/bg_sleep.webp')}
      style={{ flex: 1 }}
      resizeMode="cover"
    >
      {/* Global dark overlay */}
      <View style={styles.overlay} />

      <SafeAreaView
        style={{ flex: 1, backgroundColor: 'transparent' }}
        edges={page === 0 ? ['left', 'right', 'bottom'] : ['top', 'left', 'right', 'bottom']}
      >
        {/* Back + Skip buttons — Goal, Demo, Social Proof */}
        {(page >= 1 && page <= 3) && (
          <View style={styles.header}>
            <TouchableOpacity style={styles.backBtn} onPress={goBack} activeOpacity={0.7}>
              <Ionicons name="chevron-back" size={22} color="#FFFFFF" />
              <Text style={styles.backText}>{t('onboarding.back')}</Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.forwardBtn} onPress={goNext} activeOpacity={0.7}>
              <Text style={styles.backText}>{t('onboarding.skip')}</Text>
              <Ionicons name="chevron-forward" size={22} color="#FFFFFF" />
            </TouchableOpacity>
          </View>
        )}

        {/* Progress bar */}
        {progressVisible && (
          <View style={styles.progressTrack}>
            <View style={[styles.progressFill, { width: `${progressPct * 100}%` }]} />
          </View>
        )}

        {/* Page */}
        <Animated.View style={[{ flex: 1 }, { opacity: fadeAnim, transform: [{ translateX: slideAnim }] }]}>
          {renderPage()}
        </Animated.View>
      </SafeAreaView>
    </ImageBackground>
  );
}

// ── Styles ────────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  // Root
  overlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(5, 10, 30, 0.72)',
  },

  // Header
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: SPACING.md,
    paddingTop: SPACING.md,
    paddingBottom: 2,
    minHeight: 44,
  },
  backBtn: {
    flexDirection: 'row', alignItems: 'center', gap: 2,
    paddingRight: 12, paddingVertical: 4,
  },
  forwardBtn: {
    flexDirection: 'row', alignItems: 'center', gap: 2,
    paddingLeft: 12, paddingVertical: 4,
  },
  backText: { fontSize: FONT_SIZE.md, fontFamily: FONTS.medium, color: '#FFFFFF' },

  // Progress
  progressTrack: {
    height: 3,
    marginHorizontal: SPACING.lg,
    borderRadius: 2,
    marginBottom: SPACING.sm,
    backgroundColor: 'rgba(255,255,255,0.15)',
    overflow: 'hidden',
  },
  progressFill: { height: 3, borderRadius: 2, backgroundColor: '#FFFFFF' },

  // Page content
  pageContent: {
    flex: 1,
    paddingHorizontal: SPACING.lg,
    paddingTop: SPACING.md,
    paddingBottom: SPACING.md,
  },

  // Shared text
  pageTitle: {
    fontFamily: FONTS.heavy,
    fontSize: FONT_SIZE.xxl + 2,
    letterSpacing: -0.4,
    marginBottom: 6,
    color: TEXT_PRIMARY,
  },
  pageSub: {
    fontFamily: FONTS.medium,
    fontSize: FONT_SIZE.sm,
    lineHeight: 20,
    marginBottom: SPACING.lg,
    color: TEXT_SECONDARY,
  },

  // Bottom area
  bottomArea: { marginTop: 'auto', paddingTop: SPACING.md },

  // Buttons
  primaryBtn: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 16,
    borderRadius: 14,
    backgroundColor: COLORS.primary,
    marginTop: SPACING.sm,
  },
  primaryBtnText: { color: '#FFFFFF', fontFamily: FONTS.bold, fontSize: FONT_SIZE.md + 1 },
  skipLink: { alignItems: 'center', paddingVertical: SPACING.md },
  skipText: { fontFamily: FONTS.medium, fontSize: FONT_SIZE.sm, color: TEXT_SECONDARY, textDecorationLine: 'underline' },

  // Hook page
  hookTop: { paddingHorizontal: SPACING.lg, alignItems: 'center' },
  hookCenter: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: SPACING.lg },
  hookContent: { paddingHorizontal: SPACING.lg, paddingBottom: SPACING.lg },
  hookTitle: { fontFamily: FONTS.heavy, fontSize: FONT_SIZE.xxl + 4, textAlign: 'center', letterSpacing: -0.5, color: TEXT_PRIMARY, marginBottom: 6 },
  hookSub: { fontFamily: FONTS.medium, fontSize: FONT_SIZE.sm, textAlign: 'center', lineHeight: 20, color: TEXT_SECONDARY, marginBottom: SPACING.md },
  hookBreathLabel: { fontFamily: FONTS.medium, fontSize: FONT_SIZE.lg, color: 'rgba(255,255,255,0.75)', letterSpacing: 1.5, textTransform: 'uppercase' },
  pillsRow: { flexDirection: 'row', gap: 6, justifyContent: 'center', flexWrap: 'wrap', marginBottom: SPACING.md },
  pill: { flexDirection: 'row', alignItems: 'center', gap: 4, paddingHorizontal: 10, paddingVertical: 6, borderRadius: BORDER_RADIUS.full },
  pillText: { fontSize: FONT_SIZE.xs, fontFamily: FONTS.bold },

  // Option rows
  goalScroll: { flexGrow: 1, justifyContent: 'center', paddingBottom: SPACING.xl },
  optionList: { gap: 10, marginBottom: SPACING.xl },
  optionRow: {
    flexDirection: 'row', alignItems: 'center',
    paddingVertical: 14, paddingHorizontal: SPACING.md,
    borderRadius: 16, gap: SPACING.md,
    backgroundColor: GLASS_BG,
    borderWidth: 1, borderColor: GLASS_BORDER,
  },
  optionRowSelected: { backgroundColor: GLASS_SEL_BG },
  optionIconCircle: { width: 44, height: 44, borderRadius: 12, alignItems: 'center', justifyContent: 'center' },
  optionTexts: { flex: 1 },
  optionLabel: { fontFamily: FONTS.bold, fontSize: FONT_SIZE.md, color: TEXT_PRIMARY },
  optionSub: { fontFamily: FONTS.regular, fontSize: FONT_SIZE.xs, color: TEXT_SECONDARY, marginTop: 2 },
  checkCircle: { width: 24, height: 24, borderRadius: 12, alignItems: 'center', justifyContent: 'center' },

  // Hint
  hintBox: {
    flexDirection: 'row', alignItems: 'center', gap: 10,
    padding: SPACING.md, borderRadius: 12, borderWidth: 1,
    backgroundColor: 'rgba(245,166,35,0.10)',
    borderColor: 'rgba(245,166,35,0.25)',
    marginBottom: SPACING.sm,
  },
  hintText: { fontFamily: FONTS.medium, fontSize: FONT_SIZE.xs, flex: 1, lineHeight: 18, color: 'rgba(255,255,255,0.85)' },


  // Bullet rows
  bulletRow: { flexDirection: 'row', alignItems: 'center', gap: 12, padding: SPACING.md },
  bulletText: { fontFamily: FONTS.medium, fontSize: FONT_SIZE.lg, flex: 1, lineHeight: 24, color: TEXT_PRIMARY },

  // Building
  buildingOrb: { width: scale(90), height: scale(90), borderRadius: scale(45), alignItems: 'center', justifyContent: 'center' },
  stepDot: { width: 22, height: 22, borderRadius: 11, alignItems: 'center', justifyContent: 'center' },

  // Plan
  planBadge: { flexDirection: 'row', alignItems: 'center', gap: 5, paddingHorizontal: 10, paddingVertical: 5, borderRadius: BORDER_RADIUS.full, alignSelf: 'flex-start', marginBottom: SPACING.sm },
  planBadgeText: { fontFamily: FONTS.bold, fontSize: FONT_SIZE.xs, textTransform: 'uppercase', letterSpacing: 0.5 },
  techniqueCard: { flexDirection: 'row', alignItems: 'center', gap: SPACING.md, paddingVertical: SPACING.md, paddingRight: SPACING.md },
  techniqueAccent: { width: 4, alignSelf: 'stretch', borderRadius: 2 },
  techniqueIcon: { width: 42, height: 42, borderRadius: 11, alignItems: 'center', justifyContent: 'center' },
  techniqueLabel: { fontFamily: FONTS.semibold, fontSize: FONT_SIZE.xs, textTransform: 'uppercase', letterSpacing: 0.3, color: TEXT_SECONDARY, marginBottom: 2 },
  techniqueName: { fontFamily: FONTS.bold, fontSize: FONT_SIZE.md, color: TEXT_PRIMARY },
  techniquePill: { flexDirection: 'row', alignItems: 'center', gap: 6, alignSelf: 'flex-start', paddingHorizontal: 12, paddingVertical: 6, borderRadius: BORDER_RADIUS.full, borderWidth: 1, marginTop: 6, marginBottom: 4 },
  techniquePillText: { fontFamily: FONTS.semibold, fontSize: FONT_SIZE.sm },
  freeBadge: { paddingHorizontal: 8, paddingVertical: 4, borderRadius: BORDER_RADIUS.full, backgroundColor: '#7BC4A820', borderWidth: 1, borderColor: '#7BC4A840' },
  freeBadgeText: { fontFamily: FONTS.bold, fontSize: 10, color: '#7BC4A8', letterSpacing: 0.5 },

  // Notifications
  notifIconWrap: { alignSelf: 'center', alignItems: 'center', justifyContent: 'center', marginBottom: 4 },
  notifIconGlow: {
    position: 'absolute',
    width: scale(100), height: scale(100), borderRadius: scale(50),
    backgroundColor: '#4A90D9',
    opacity: 0.12,
  },
  notifIconCircle: {
    width: scale(72), height: scale(72), borderRadius: scale(36),
    backgroundColor: '#4A90D920',
    borderWidth: 1, borderColor: '#4A90D940',
    alignItems: 'center', justifyContent: 'center',
  },
  notifBadgeIcon: { width: 44, height: 44, borderRadius: 12, borderWidth: 1, alignItems: 'center', justifyContent: 'center', marginBottom: 4 },
  notifBubbleRow: { flexDirection: 'row', alignItems: 'center', gap: SPACING.sm },
  notifBubbleIcon: { width: 42, height: 42, borderRadius: 21, alignItems: 'center', justifyContent: 'center' },
  notifHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 2 },
  notifAppIconRow: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  notifAppIcon: { width: 18, height: 18, borderRadius: 4, alignItems: 'center', justifyContent: 'center' },
  notifAppName: { fontFamily: FONTS.bold, fontSize: 10, color: TEXT_SECONDARY, letterSpacing: 0.5 },
  notifTime: { fontFamily: FONTS.regular, fontSize: 11, color: TEXT_SECONDARY },
  notifBody: { paddingHorizontal: SPACING.md, paddingBottom: SPACING.sm },
  notifTitle: { fontFamily: FONTS.semibold, fontSize: FONT_SIZE.sm, color: TEXT_PRIMARY, marginBottom: 2 },
  notifMessage: { fontFamily: FONTS.regular, fontSize: FONT_SIZE.xs, color: TEXT_SECONDARY, lineHeight: 17 },
  notifRow: { flexDirection: 'row', alignItems: 'flex-start', gap: SPACING.sm, padding: SPACING.md },
  glowBtn: {
    shadowColor: COLORS.primary,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.5,
    shadowRadius: 12,
    elevation: 8,
  },

  // Big icon circle
  bigIconCircle: { width: scale(96), height: scale(96), borderRadius: scale(48), alignItems: 'center', justifyContent: 'center', alignSelf: 'center', marginBottom: SPACING.lg, marginTop: SPACING.sm },

  // Apple Health ripple
  healthRippleWrap: { alignItems: 'center', justifyContent: 'center', alignSelf: 'center' },
  healthRing: { position: 'absolute', backgroundColor: '#FF3B30' },
  healthIconCircle: { width: scale(88), height: scale(88), borderRadius: scale(44), backgroundColor: '#FF3B30', alignItems: 'center', justifyContent: 'center' },

  // Safety screen
  safetyIconRow: { flexDirection: 'row', alignItems: 'center', gap: SPACING.sm, marginTop: SPACING.sm, marginBottom: 6 },
  safetyIconCircle: { width: 44, height: 44, borderRadius: 12, backgroundColor: '#7BC4A820', borderWidth: 1, borderColor: '#7BC4A840', alignItems: 'center', justifyContent: 'center' },
  safetyDot: { width: 26, height: 26, borderRadius: 13, backgroundColor: '#7BC4A820', borderWidth: 1, borderColor: '#7BC4A840', alignItems: 'center', justifyContent: 'center' },
  safetyDotNum: { fontFamily: FONTS.bold, fontSize: 12, color: '#7BC4A8' },
  safetyCheckRow: { flexDirection: 'row', alignItems: 'center', gap: SPACING.sm, padding: SPACING.md, borderRadius: 14, borderWidth: 1, borderColor: GLASS_BORDER, backgroundColor: GLASS_BG },
  safetyCheckBox: { width: 22, height: 22, borderRadius: 6, borderWidth: 2, borderColor: 'rgba(255,255,255,0.4)', alignItems: 'center', justifyContent: 'center' },

  // Checkbox
  checkboxRow: { flexDirection: 'row', alignItems: 'center', gap: SPACING.sm, marginBottom: SPACING.sm, paddingHorizontal: 2 },
  checkboxLabel: { fontFamily: FONTS.semibold, fontSize: FONT_SIZE.sm, flex: 1, lineHeight: 20, color: TEXT_PRIMARY },

  // Testimonials — flex:1 on the list and on every card, so the 3 cards
  // always divide whatever vertical space is actually available instead of
  // using a fixed/natural size that can overflow on shorter screens.
  testimonialList: { flex: 1, gap: SPACING.sm, marginTop: SPACING.sm },
  testimonialCard: {
    flex: 1,
    backgroundColor: GLASS_BG,
    borderWidth: 1,
    borderColor: GLASS_BORDER,
    borderLeftWidth: 3,
    borderRadius: 14,
    paddingHorizontal: SPACING.sm + 2,
    paddingVertical: SPACING.xs,
    justifyContent: 'center',
    overflow: 'hidden',
  },
  testimonialQuoteMark:    { position: 'absolute', top: -6, right: 10, fontSize: 48, fontFamily: FONTS.heavy, lineHeight: 56 },
  testimonialHeader:       { flexDirection: 'row', alignItems: 'center', gap: SPACING.sm, marginBottom: 6 },
  testimonialAvatar:       { width: 36, height: 36, borderRadius: 18, alignItems: 'center', justifyContent: 'center', borderWidth: 2, borderColor: 'rgba(255,255,255,0.22)' },
  testimonialAvatarLetter: { fontFamily: FONTS.heavy, fontSize: 15, color: '#FFF' },
  testimonialNameRow:      { flexDirection: 'row', alignItems: 'center', gap: 5 },
  testimonialName:         { fontFamily: FONTS.bold, fontSize: FONT_SIZE.sm, color: TEXT_PRIMARY },
  testimonialTag:          { fontFamily: FONTS.regular, fontSize: FONT_SIZE.xs, color: TEXT_SECONDARY, marginTop: 1 },
  testimonialStars:        { flexDirection: 'row', gap: 1, alignSelf: 'flex-start', marginTop: 2 },
  testimonialText:         { fontFamily: FONTS.medium, fontSize: FONT_SIZE.sm, color: 'rgba(255,255,255,0.95)', lineHeight: 19 },

  // Rating screen
  ratingHalo: {
    position: 'absolute',
    width: scale(280),
    height: scale(280),
    borderRadius: scale(140),
    backgroundColor: '#F5C542',
  },
  ratingStarsRow: { flexDirection: 'row', gap: 6, alignItems: 'center', justifyContent: 'center' },
  ratingBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: BORDER_RADIUS.full,
    backgroundColor: 'rgba(0,0,0,0.55)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.18)',
  },
  ratingBadgeText: {
    fontFamily: FONTS.bold,
    fontSize: FONT_SIZE.xs,
    color: '#FFFFFF',
    letterSpacing: 0.3,
  },
});
