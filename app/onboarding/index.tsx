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
import { SafeAreaView } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { useTranslation } from 'react-i18next';
import { router } from 'expo-router';
import * as Notifications from 'expo-notifications';
import { useSettingsStore } from '../../src/store';
import { TechniqueCategory } from '../../src/types';
import { COLORS, SPACING, FONT_SIZE, BORDER_RADIUS, FONTS, scale } from '../../src/constants';
import { BreathingMandala } from '../../src/components/BreathingMandala';

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

const COMMIT_OPTIONS = [3, 5, 10, 15];

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

const SAFETY_ITEMS = ['onboarding.safety1', 'onboarding.safety2', 'onboarding.safety3', 'onboarding.safety4'];

// ── Shared glass colours ──────────────────────────────────────────────────────
const GLASS_BG       = 'rgba(255,255,255,0.09)';
const GLASS_BORDER   = 'rgba(255,255,255,0.18)';
const GLASS_SEL_BG   = 'rgba(255,255,255,0.20)';
const GLASS_SEL_BORDER = 'rgba(255,255,255,0.55)';
const DIVIDER        = 'rgba(255,255,255,0.10)';
const TEXT_PRIMARY   = '#FFFFFF';
const TEXT_SECONDARY = 'rgba(255,255,255,0.65)';

// ── Component ─────────────────────────────────────────────────────────────────

export default function OnboardingScreen() {
  const { t } = useTranslation();
  const setSetting = useSettingsStore((s) => s.setSetting);
  const [page, setPage] = useState(0);
  const [selectedGoal, setSelectedGoal]     = useState<TechniqueCategory | undefined>(undefined);
  const [selectedMinutes, setSelectedMinutes] = useState<number | undefined>(undefined);
  const [safetyChecked, setSafetyChecked]   = useState(false);

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

  // Building auto-advance
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
    setTimeout(() => goNext(), 280);
  }, [setSetting, goNext]);

  const handleCommitSelect = useCallback((min: number) => {
    setSelectedMinutes(min);
    setSetting('dailyGoalMinutes', min);
    setTimeout(() => goNext(), 300);
  }, [setSetting, goNext]);

  const handleEnableNotifications = useCallback(() => {
    Notifications.requestPermissionsAsync().catch(() => {});
    goNext();
  }, [goNext]);

  const handleConnectHealth = useCallback(() => {
    setSetting('healthSyncEnabled', true);
    goNext();
  }, [setSetting, goNext]);

  const finishOnboarding = useCallback(() => {
    setSetting('onboardingCompleted', true);
    setSetting('safetyAccepted', true);
    router.replace({ pathname: '/paywall', params: { fromOnboarding: '1', goal: selectedGoal ?? 'focus', techniqueId: plan.techniqueId } });
  }, [setSetting, selectedGoal, plan]);

  const skipToApp = useCallback(() => {
    setSetting('onboardingCompleted', true);
    router.replace({ pathname: '/session', params: { techniqueId: plan.techniqueId, duration: '120', fromOnboarding: '1' } });
  }, [setSetting, plan]);

  // ── Progress ──────────────────────────────────────────────────────────────────
  const progressVisible = page > 0 && page !== 3;
  const progressStep    = page < 3 ? page : page - 1;
  const progressPct     = progressStep / 6;

  // ── Page 0 — Hook ─────────────────────────────────────────────────────────────

  const renderHook = () => (
    <View style={{ flex: 1 }}>
      {/* Bottom gradient for text readability */}
      <LinearGradient
        colors={['transparent', 'rgba(5,10,30,0.70)', 'rgba(5,10,30,0.92)']}
        style={StyleSheet.absoluteFillObject}
        start={{ x: 0.5, y: 0.35 }}
        end={{ x: 0.5, y: 1 }}
        pointerEvents="none"
      />

      {/* Mandala */}
      <View style={styles.hookCenter}>
        <BreathingMandala phase="IDLE" color="#4A90D9" size={scale(260)} bright slow />
        <Animated.Text style={[styles.hookBreathLabel, { opacity: hookLabelOpacity }]}>
          {hookBreathDir === 'in' ? t('phase.breatheIn') : t('phase.breatheOut')}
        </Animated.Text>
      </View>

      {/* Content */}
      <View style={styles.hookContent}>
        <Text style={styles.hookTitle}>{t('onboarding.hookTitle')}</Text>
        <Text style={styles.hookSub}>{t('onboarding.hookSub')}</Text>
        <View style={styles.pillsRow}>
          {([
            { icon: 'shield-checkmark-outline' as const, key: 'onboarding.socialProof1', color: '#7BC4A8' },
            { icon: 'flask-outline'             as const, key: 'onboarding.socialProof2', color: '#4A90D9' },
            { icon: 'heart-outline'             as const, key: 'onboarding.socialProof3', color: '#FF6B6B' },
          ]).map((p) => (
            <View key={p.key} style={[styles.pill, { backgroundColor: 'rgba(255,255,255,0.12)' }]}>
              <Ionicons name={p.icon} size={12} color={p.color} />
              <Text style={[styles.pillText, { color: '#FFFFFF' }]}>{t(p.key)}</Text>
            </View>
          ))}
        </View>
        <TouchableOpacity style={styles.primaryBtn} onPress={goNext} activeOpacity={0.85}>
          <Text style={styles.primaryBtnText}>{t('onboarding.getStarted')}</Text>
        </TouchableOpacity>
      </View>
    </View>
  );

  // ── Page 1 — Goal ─────────────────────────────────────────────────────────────

  const renderGoal = () => (
    <ScrollView style={{ flex: 1 }} contentContainerStyle={[styles.pageContent, { flexGrow: 1, justifyContent: 'center' }]} showsVerticalScrollIndicator={false}>
      <Text style={styles.pageTitle}>{t('onboarding.chooseGoal')}</Text>
      <Text style={styles.pageSub}>{t('onboarding.chooseGoalSub')}</Text>
      <View style={styles.optionList}>
        {GOAL_OPTIONS.map((g) => {
          const sel = selectedGoal === g.category;
          return (
            <TouchableOpacity
              key={g.category}
              style={[styles.optionRow, sel && styles.optionRowSelected]}
              onPress={() => handleGoalSelect(g.category)}
              activeOpacity={0.75}
            >
              <View style={[styles.optionIconCircle, { backgroundColor: g.color + '30' }]}>
                <Ionicons name={g.icon} size={22} color={g.color} />
              </View>
              <View style={styles.optionTexts}>
                <Text style={styles.optionLabel}>{t(g.labelKey)}</Text>
                <Text style={styles.optionSub}>{t(g.subKey)}</Text>
              </View>
              {sel
                ? <View style={[styles.checkCircle, { backgroundColor: g.color }]}><Ionicons name="checkmark" size={13} color="#FFF" /></View>
                : <Ionicons name="chevron-forward" size={17} color="rgba(255,255,255,0.4)" />}
            </TouchableOpacity>
          );
        })}
      </View>
    </ScrollView>
  );

  // ── Page 2 — Commit ───────────────────────────────────────────────────────────

  const renderCommit = () => (
    <ScrollView style={{ flex: 1 }} contentContainerStyle={[styles.pageContent, { flexGrow: 1, justifyContent: 'center' }]} showsVerticalScrollIndicator={false}>
      <Text style={styles.pageTitle}>{t('onboarding.commitTitle')}</Text>
      <Text style={styles.pageSub}>{t('onboarding.commitSub')}</Text>
      <View style={styles.optionList}>
        {COMMIT_OPTIONS.map((min) => {
          const sel = selectedMinutes != null && selectedMinutes === min;
          return (
            <TouchableOpacity
              key={min}
              style={[styles.optionRow, sel && styles.optionRowSelected]}
              onPress={() => handleCommitSelect(min)}
              activeOpacity={0.75}
            >
              <View style={[styles.optionIconCircle, { backgroundColor: (sel ? COLORS.primary : 'rgba(255,255,255,0.15)') }]}>
                <Text style={[styles.commitNum, { color: '#FFFFFF' }]}>{min}</Text>
              </View>
              <View style={styles.optionTexts}>
                <Text style={styles.optionLabel}>{min} {t('onboarding.commitMinUnit')}</Text>
              </View>
              {sel
                ? <View style={[styles.checkCircle, { backgroundColor: COLORS.primary }]}><Ionicons name="checkmark" size={13} color="#FFF" /></View>
                : <Ionicons name="chevron-forward" size={17} color="rgba(255,255,255,0.4)" />}
            </TouchableOpacity>
          );
        })}
      </View>
      {selectedMinutes != null && (
        <View style={styles.hintBox}>
          <Ionicons name="flame-outline" size={16} color="#F5A623" />
          <Text style={styles.hintText}>{t('onboarding.commitHint_' + selectedMinutes)}</Text>
        </View>
      )}
    </ScrollView>
  );

  // ── Page 3 — Building ─────────────────────────────────────────────────────────

  const renderBuilding = () => (
    <View style={[styles.pageContent, { justifyContent: 'center' }]}>
      <View style={{ alignItems: 'center', marginBottom: SPACING.lg }}>
        <View style={[styles.buildingOrb, { backgroundColor: plan.color }]}>
          <Ionicons name="sparkles-outline" size={scale(40)} color="#FFFFFF" />
        </View>
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
      <View style={[styles.planBadge, { backgroundColor: plan.color + '30' }]}>
        <Ionicons name="checkmark-circle" size={13} color={plan.color} />
        <Text style={[styles.planBadgeText, { color: plan.color }]}>{t('onboarding.planBadge')}</Text>
      </View>
      <Text style={styles.pageTitle}>{t(plan.titleKey)}</Text>

      {/* Technique card */}
      <View style={[styles.glassCard, styles.techniqueCard, { borderColor: plan.color + '60' }]}>
        <View style={[styles.techniqueIcon, { backgroundColor: plan.color }]}>
          <Ionicons name={plan.icon} size={20} color="#FFF" />
        </View>
        <View>
          <Text style={styles.techniqueLabel}>{t('onboarding.yourTechnique')}</Text>
          <Text style={styles.techniqueName}>{t(plan.techniqueNameKey)}</Text>
        </View>
      </View>

      {/* Bullets */}
      <View style={styles.glassCard}>
        {[plan.b1Key, plan.b2Key, plan.b3Key].map((key, i) => (
          <View key={i} style={[styles.bulletRow, i < 2 && { borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: DIVIDER }]}>
            <Ionicons name="checkmark-circle" size={18} color={plan.color} />
            <Text style={styles.bulletText}>{t(key)}</Text>
          </View>
        ))}
      </View>

      <TouchableOpacity style={styles.primaryBtn} onPress={goNext} activeOpacity={0.85}>
        <Text style={styles.primaryBtnText}>{t('onboarding.continue')}</Text>
      </TouchableOpacity>
    </ScrollView>
  );

  // ── Page 5 — Notifications ────────────────────────────────────────────────────

  const renderNotifications = () => (
    <View style={[styles.pageContent, { justifyContent: 'center' }]}>
      <View style={[styles.bigIconCircle, { backgroundColor: '#4A90D930' }]}>
        <Ionicons name="notifications-outline" size={scale(48)} color="#4A90D9" />
      </View>
      <Text style={styles.pageTitle}>{t('onboarding.notificationsTitle')}</Text>
      <Text style={styles.pageSub}>{t('onboarding.notificationsSub')}</Text>

      {/* Mock notification */}
      <View style={[styles.glassCard, { marginBottom: SPACING.lg }]}>
        <View style={styles.notifRow}>
          <View style={[styles.notifAppIcon, { backgroundColor: COLORS.primary }]}>
            <Ionicons name="body-outline" size={16} color="#FFF" />
          </View>
          <View style={{ flex: 1 }}>
            <Text style={[styles.optionLabel, { marginBottom: 2 }]}>BreathFlow</Text>
            <Text style={styles.optionSub}>Time for your daily breathing session 🌿</Text>
          </View>
          <Text style={styles.optionSub}>now</Text>
        </View>
      </View>

      <TouchableOpacity style={[styles.primaryBtn, { flexDirection: 'row', gap: 8 }]} onPress={handleEnableNotifications} activeOpacity={0.85}>
        <Ionicons name="notifications-outline" size={18} color="#FFF" />
        <Text style={styles.primaryBtnText}>{t('onboarding.notificationsEnable')}</Text>
      </TouchableOpacity>
      <TouchableOpacity style={styles.skipLink} onPress={goNext}>
        <Text style={styles.skipText}>{t('onboarding.maybeSkip')}</Text>
      </TouchableOpacity>
    </View>
  );

  // ── Page 6 — Apple Health ─────────────────────────────────────────────────────

  const renderAppleHealth = () => (
    <View style={[styles.pageContent, { justifyContent: 'center' }]}>
      <View style={[styles.bigIconCircle, { backgroundColor: '#FF3B3025' }]}>
        <Ionicons name="heart" size={scale(48)} color="#FF3B30" />
      </View>
      <Text style={styles.pageTitle}>{t('onboarding.appleHealthTitle')}</Text>
      <Text style={styles.pageSub}>{t('onboarding.appleHealthSub')}</Text>
      <View style={styles.glassCard}>
        {([
          { icon: 'sync-outline'        as const, key: 'onboarding.appleHealthBullet1' },
          { icon: 'trending-up-outline' as const, key: 'onboarding.appleHealthBullet2' },
          { icon: 'lock-closed-outline' as const, key: 'onboarding.appleHealthBullet3' },
        ]).map((b, i) => (
          <View key={i} style={[styles.bulletRow, i < 2 && { borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: DIVIDER }]}>
            <Ionicons name={b.icon} size={18} color="#FF3B30" />
            <Text style={styles.bulletText}>{t(b.key)}</Text>
          </View>
        ))}
      </View>
      <TouchableOpacity style={[styles.primaryBtn, { backgroundColor: '#FF3B30', flexDirection: 'row', gap: 8 }]} onPress={handleConnectHealth} activeOpacity={0.85}>
        <Ionicons name="heart" size={18} color="#FFF" />
        <Text style={styles.primaryBtnText}>{t('onboarding.appleHealthConnect')}</Text>
      </TouchableOpacity>
      <TouchableOpacity style={styles.skipLink} onPress={goNext}>
        <Text style={styles.skipText}>{t('onboarding.maybeSkip')}</Text>
      </TouchableOpacity>
    </View>
  );

  // ── Page 7 — Safety ───────────────────────────────────────────────────────────

  const renderSafety = () => (
    <View style={styles.pageContent}>
      <View style={[styles.bigIconCircle, { backgroundColor: '#7BC4A820' }]}>
        <Ionicons name="shield-checkmark-outline" size={scale(48)} color="#7BC4A8" />
      </View>
      <Text style={styles.pageTitle}>{t('onboarding.safety')}</Text>
      <View style={styles.glassCard}>
        {SAFETY_ITEMS.map((key, i) => (
          <View key={i} style={[styles.bulletRow, i < SAFETY_ITEMS.length - 1 && { borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: DIVIDER }]}>
            <Ionicons name="checkmark-circle-outline" size={18} color="#7BC4A8" />
            <Text style={styles.bulletText}>{t(key)}</Text>
          </View>
        ))}
      </View>
      <TouchableOpacity style={styles.checkboxRow} onPress={() => setSafetyChecked((v) => !v)} activeOpacity={0.7}>
        <Ionicons name={safetyChecked ? 'checkbox' : 'square-outline'} size={24} color={safetyChecked ? COLORS.primary : 'rgba(255,255,255,0.5)'} />
        <Text style={styles.checkboxLabel}>{t('onboarding.understand')}</Text>
      </TouchableOpacity>
      <View style={styles.bottomArea}>
        <TouchableOpacity
          style={[styles.primaryBtn, !safetyChecked && { backgroundColor: 'rgba(255,255,255,0.15)' }]}
          onPress={finishOnboarding}
          disabled={!safetyChecked}
          activeOpacity={0.85}
        >
          <Text style={[styles.primaryBtnText, { opacity: safetyChecked ? 1 : 0.45 }]}>{t('onboarding.startBreathing')}</Text>
        </TouchableOpacity>
        <TouchableOpacity style={styles.skipLink} onPress={skipToApp}>
          <Text style={styles.skipText}>{t('onboarding.skipToApp')}</Text>
        </TouchableOpacity>
      </View>
    </View>
  );

  const renderPage = () => {
    switch (page) {
      case 0: return renderHook();
      case 1: return renderGoal();
      case 2: return renderCommit();
      case 3: return renderBuilding();
      case 4: return renderPlan();
      case 5: return renderNotifications();
      case 6: return renderAppleHealth();
      case 7: return renderSafety();
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
        {/* Back + Forward buttons */}
        {page > 0 && page !== 3 && (
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
  hookCenter: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: SPACING.lg },
  hookContent: { paddingHorizontal: SPACING.lg, paddingBottom: SPACING.lg },
  hookTitle: { fontFamily: FONTS.heavy, fontSize: FONT_SIZE.xxl + 2, textAlign: 'center', letterSpacing: -0.5, color: TEXT_PRIMARY, marginBottom: 6 },
  hookSub: { fontFamily: FONTS.medium, fontSize: FONT_SIZE.sm, textAlign: 'center', lineHeight: 20, color: TEXT_SECONDARY, marginBottom: SPACING.md },
  hookBreathLabel: { fontFamily: FONTS.medium, fontSize: FONT_SIZE.lg, color: 'rgba(255,255,255,0.75)', letterSpacing: 1.5, textTransform: 'uppercase' },
  pillsRow: { flexDirection: 'row', gap: 6, justifyContent: 'center', flexWrap: 'wrap', marginBottom: SPACING.md },
  pill: { flexDirection: 'row', alignItems: 'center', gap: 4, paddingHorizontal: 10, paddingVertical: 6, borderRadius: BORDER_RADIUS.full },
  pillText: { fontSize: FONT_SIZE.xs, fontFamily: FONTS.bold },

  // Option rows
  optionList: { gap: SPACING.sm, marginBottom: SPACING.md },
  optionRow: {
    flexDirection: 'row', alignItems: 'center',
    paddingVertical: 13, paddingHorizontal: SPACING.md,
    borderRadius: 14, gap: SPACING.md,
    backgroundColor: GLASS_BG,
    borderWidth: 1, borderColor: GLASS_BORDER,
  },
  optionRowSelected: { backgroundColor: GLASS_SEL_BG, borderColor: GLASS_SEL_BORDER },
  optionIconCircle: { width: 44, height: 44, borderRadius: 12, alignItems: 'center', justifyContent: 'center' },
  optionTexts: { flex: 1 },
  optionLabel: { fontFamily: FONTS.semibold, fontSize: FONT_SIZE.md, color: TEXT_PRIMARY },
  optionSub: { fontFamily: FONTS.regular, fontSize: FONT_SIZE.xs, color: TEXT_SECONDARY, marginTop: 1 },
  checkCircle: { width: 22, height: 22, borderRadius: 11, alignItems: 'center', justifyContent: 'center' },
  commitNum: { fontFamily: FONTS.heavy, fontSize: 20 },

  // Hint
  hintBox: {
    flexDirection: 'row', alignItems: 'center', gap: 10,
    padding: SPACING.md, borderRadius: 12, borderWidth: 1,
    backgroundColor: 'rgba(245,166,35,0.10)',
    borderColor: 'rgba(245,166,35,0.25)',
    marginBottom: SPACING.sm,
  },
  hintText: { fontFamily: FONTS.medium, fontSize: FONT_SIZE.xs, flex: 1, lineHeight: 18, color: 'rgba(255,255,255,0.85)' },

  // Glass card
  glassCard: {
    backgroundColor: GLASS_BG,
    borderWidth: 1,
    borderColor: GLASS_BORDER,
    borderRadius: 16,
    overflow: 'hidden',
    marginBottom: SPACING.md,
  },

  // Bullet rows
  bulletRow: { flexDirection: 'row', alignItems: 'center', gap: 12, padding: SPACING.md },
  bulletText: { fontFamily: FONTS.medium, fontSize: FONT_SIZE.lg, flex: 1, lineHeight: 24, color: TEXT_PRIMARY },

  // Building
  buildingOrb: { width: scale(90), height: scale(90), borderRadius: scale(45), alignItems: 'center', justifyContent: 'center' },
  stepDot: { width: 22, height: 22, borderRadius: 11, alignItems: 'center', justifyContent: 'center' },

  // Plan
  planBadge: { flexDirection: 'row', alignItems: 'center', gap: 5, paddingHorizontal: 10, paddingVertical: 5, borderRadius: BORDER_RADIUS.full, alignSelf: 'flex-start', marginBottom: SPACING.sm },
  planBadgeText: { fontFamily: FONTS.bold, fontSize: FONT_SIZE.xs, textTransform: 'uppercase', letterSpacing: 0.5 },
  techniqueCard: { flexDirection: 'row', alignItems: 'center', gap: SPACING.md, padding: SPACING.md, borderWidth: 1.5 },
  techniqueIcon: { width: 42, height: 42, borderRadius: 11, alignItems: 'center', justifyContent: 'center' },
  techniqueLabel: { fontFamily: FONTS.semibold, fontSize: FONT_SIZE.xs, textTransform: 'uppercase', letterSpacing: 0.3, color: TEXT_SECONDARY, marginBottom: 2 },
  techniqueName: { fontFamily: FONTS.bold, fontSize: FONT_SIZE.md, color: TEXT_PRIMARY },

  // Notifications
  notifRow: { flexDirection: 'row', alignItems: 'center', gap: SPACING.sm, padding: SPACING.md },
  notifAppIcon: { width: 36, height: 36, borderRadius: 9, alignItems: 'center', justifyContent: 'center' },

  // Big icon circle
  bigIconCircle: { width: scale(96), height: scale(96), borderRadius: scale(48), alignItems: 'center', justifyContent: 'center', alignSelf: 'center', marginBottom: SPACING.lg, marginTop: SPACING.sm },

  // Checkbox
  checkboxRow: { flexDirection: 'row', alignItems: 'center', gap: SPACING.sm, marginBottom: SPACING.sm, paddingHorizontal: 2 },
  checkboxLabel: { fontFamily: FONTS.semibold, fontSize: FONT_SIZE.sm, flex: 1, lineHeight: 20, color: TEXT_PRIMARY },
});
