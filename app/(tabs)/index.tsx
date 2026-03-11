import React, { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  StyleSheet,
  Dimensions,
  Animated,
  Easing,
  Modal,
  Pressable,
  PanResponder,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { router } from 'expo-router';
import { useTranslation } from 'react-i18next';
import { Ionicons } from '@expo/vector-icons';
import Svg, { Path } from 'react-native-svg';
import { useThemeColors } from '../../src/hooks/useColorScheme';
import { useSettingsStore, useSessionsStore } from '../../src/store';
import { TECHNIQUES } from '../../src/constants/techniques';
import { SPACING, BORDER_RADIUS, FONTS, COLORS } from '../../src/constants';
import type { BreathingTechnique, TechniqueCategory } from '../../src/types';
import { BreathingCircle } from '../../src/components/BreathingCircle';
import { BreathingSquare } from '../../src/components/BreathingSquare';
import { BreathingTriangle } from '../../src/components/BreathingTriangle';
import { BreathingWave } from '../../src/components/BreathingWave';
import { BreathingBurst } from '../../src/components/BreathingBurst';
import { BreathingOval } from '../../src/components/BreathingOval';

// ─── Layout constants ────────────────────────────────────────────────────────

const DURATION_OPTIONS = [1, 2, 3, 5, 10, 15, 20];
const { width: SCREEN_WIDTH } = Dimensions.get('window');
const GRID_H_PADDING = 20;
const GRID_GAP = 12;
const CARD_WIDTH = (SCREEN_WIDTH - GRID_H_PADDING * 2 - GRID_GAP) / 2;

// ─── Card gradient configs ───────────────────────────────────────────────────

interface CardTheme {
  bg: [string, string];
  icon: keyof typeof Ionicons.glyphMap;
}

const CARD_THEMES: Record<string, CardTheme> = {
  box:            { bg: ['#C2DEFF', '#8BB8F5'], icon: 'grid-outline' },
  fourSevenEight: { bg: ['#D8C4F0', '#B896E0'], icon: 'moon-outline' },
  physioSigh:     { bg: ['#B8E8D0', '#8AD4B0'], icon: 'leaf-outline' },
  coherence:      { bg: ['#B8DAF0', '#7FBFDF'], icon: 'radio-outline' },
  triangle:       { bg: ['#A8F0E8', '#70E0D4'], icon: 'triangle-outline' },
  power:          { bg: ['#F5C4BC', '#F09888'], icon: 'flash-outline' },
  fourFourSixTwo: { bg: ['#B8D0F0', '#88B0E0'], icon: 'water-outline' },
  kapalabhati:    { bg: ['#FCE4A8', '#F5C85A'], icon: 'sunny-outline' },
  twoToOne:       { bg: ['#D8C0F0', '#B890E0'], icon: 'cloudy-night-outline' },
  cyclicSigh:     { bg: ['#B0E8C8', '#78D4A0'], icon: 'pulse-outline' },
};

// ─── Category tabs ──────────────────────────────────────────────────────────

type FilterCategory = 'all' | TechniqueCategory;

const CATEGORY_FILTERS: { key: FilterCategory; labelKey: string }[] = [
  { key: 'all', labelKey: 'home.categoryAll' },
  { key: 'calm', labelKey: 'home.categoryCalm' },
  { key: 'sleep', labelKey: 'home.categorySleep' },
  { key: 'focus', labelKey: 'home.categoryFocus' },
  { key: 'energy', labelKey: 'home.categoryEnergy' },
  { key: 'advanced', labelKey: 'home.categoryAdvanced' },
];

// ─── Helpers ─────────────────────────────────────────────────────────────────

const PHASE_LABELS: Record<string, string> = {
  breatheIn: 'In',
  breatheOut: 'Out',
  hold: 'Hold',
  holdOut: 'Hold',
  topUpInhale: 'Sip',
};

function formatDuration(totalSeconds: number): string {
  const mins = Math.floor(totalSeconds / 60);
  const secs = totalSeconds % 60;
  if (mins === 0) return `${secs}s`;
  if (secs === 0) return `${mins} min`;
  return `${mins}:${String(secs).padStart(2, '0')}`;
}

function getDurationLabel(t: BreathingTechnique): string {
  if (t.mode === 'power') {
    const total = t.breathCount! * 2 * t.roundCount! + t.roundCount! * 90;
    return `~${Math.round(total / 60)} min`;
  }
  if (t.mode === 'kapalabhati') {
    const total = t.setCount! * t.setDuration! + (t.setCount! - 1) * t.restDuration!;
    return formatDuration(total);
  }
  const cycleDur = t.phases.reduce((s, p) => s + p.duration, 0);
  const total = t.defaultDuration ?? cycleDur * (t.defaultCycles || 6);
  return formatDuration(total);
}

function getPatternString(technique: BreathingTechnique): string {
  if (technique.mode === 'power') {
    return `${technique.breathCount} breaths + hold × ${technique.roundCount} rounds`;
  }
  if (technique.mode === 'kapalabhati') {
    return `${technique.setCount} × ${technique.setDuration}s rapid sets`;
  }
  return technique.phases
    .map((p) => {
      const label = PHASE_LABELS[p.instructionKey] ?? p.instructionKey;
      const dur = p.duration % 1 === 0 ? `${p.duration}` : `${p.duration.toFixed(1)}`;
      return `${label} ${dur}s`;
    })
    .join('  ·  ');
}

// ─── TechniqueCard (grid card) ──────────────────────────────────────────────

interface TechniqueCardProps {
  technique: BreathingTechnique;
  isPro: boolean;
  t: (key: string) => string;
  theme: ReturnType<typeof useThemeColors>;
  onPress: (technique: BreathingTechnique) => void;
}

function TechniqueCard({ technique, isPro, t, theme, onPress }: TechniqueCardProps) {
  const locked = technique.isPro && !isPro;
  const cardTheme = CARD_THEMES[technique.id] ?? {
    bg: [technique.color + '40', technique.color] as [string, string],
    icon: 'ellipse-outline' as keyof typeof Ionicons.glyphMap,
  };

  return (
    <TouchableOpacity
      style={[styles.gridCard, { backgroundColor: theme.card }]}
      onPress={() => onPress(technique)}
      activeOpacity={0.85}
      accessibilityLabel={t(technique.nameKey)}
      accessibilityRole="button"
    >
      {/* Gradient art area */}
      <LinearGradient
        colors={cardTheme.bg}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={styles.gridCardArt}
      >
        <Ionicons name={cardTheme.icon} size={36} color="rgba(255,255,255,0.4)" />

        {/* PRO lock */}
        {locked && (
          <View style={styles.proBadge}>
            <Ionicons name="lock-closed" size={10} color="rgba(255,255,255,0.9)" />
          </View>
        )}
      </LinearGradient>

      {/* Info */}
      <View style={styles.gridCardInfo}>
        <Text style={[styles.gridCardName, { color: theme.text }]} numberOfLines={1}>
          {t(technique.nameKey)}
        </Text>
        <Text style={[styles.gridCardDuration, { color: theme.textSecondary }]}>
          {getDurationLabel(technique)}
        </Text>
      </View>
    </TouchableOpacity>
  );
}

// ─── Shape preview helper ────────────────────────────────────────────────────

/**
 * Renders the technique's breathing shape as a live animated preview inside
 * the detail sheet header gradient.
 *
 * Design notes:
 * - Always uses mode='standard' + phase='INHALE' so every shape component
 *   runs its expand animation regardless of the technique's real timer mode.
 *   (Power/Kapalabhati shapes only animate on BREATHING/RAPID_SET in their
 *   own mode, so passing 'standard' ensures a visible preview for all shapes.)
 * - The outer View is fixed at PREVIEW_BOX × PREVIEW_BOX with overflow hidden
 *   so the inner shape (which may be 180–220px) is clipped and scaled without
 *   affecting the header's layout height.
 */
const PREVIEW_BOX = 100;

function TechniqueShapePreview({ technique }: { technique: BreathingTechnique }) {
  const shapeProps = {
    phase: 'INHALE' as const,
    mode: 'standard',           // always standard so INHALE path runs in every component
    color: 'rgba(255,255,255,0.75)',
    phaseDuration: 3,
  };

  let shape: React.ReactElement;
  switch (technique.shape) {
    case 'square':   shape = <BreathingSquare   {...shapeProps} />; break;
    case 'triangle': shape = <BreathingTriangle  {...shapeProps} />; break;
    case 'wave':     shape = <BreathingWave      {...shapeProps} />; break;
    case 'burst':    shape = <BreathingBurst     {...shapeProps} />; break;
    case 'oval':     shape = <BreathingOval      {...shapeProps} />; break;
    case 'circle':
    default:         shape = <BreathingCircle    {...shapeProps} />; break;
  }

  return (
    // Fixed-size clipping box — prevents the shape's layout dimensions from
    // expanding the header gradient height.
    <View style={shapePreviewBoxStyle}>
      {/* Scale down and center the shape absolutely so it doesn't affect layout */}
      <View style={shapePreviewInnerStyle} pointerEvents="none">
        {shape}
      </View>
    </View>
  );
}

const shapePreviewBoxStyle: import('react-native').ViewStyle = {
  width: PREVIEW_BOX,
  height: PREVIEW_BOX,
  overflow: 'hidden',
  alignItems: 'center',
  justifyContent: 'center',
};

const shapePreviewInnerStyle: import('react-native').ViewStyle = {
  position: 'absolute',
  transform: [{ scale: 0.42 }],
  alignItems: 'center',
  justifyContent: 'center',
};

// ─── Technique Detail Sheet ─────────────────────────────────────────────────

interface DetailSheetProps {
  technique: BreathingTechnique | null;
  visible: boolean;
  onClose: () => void;
  onStart: (technique: BreathingTechnique) => void;
  isPro: boolean;
  t: (key: string) => string;
  theme: ReturnType<typeof useThemeColors>;
}

const DISMISS_THRESHOLD = 120;

function TechniqueDetailSheet({ technique, visible, onClose, onStart, isPro, t, theme }: DetailSheetProps) {
  const insets = useSafeAreaInsets();
  const dragY = useRef(new Animated.Value(0)).current;
  const slideAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    if (visible) {
      dragY.setValue(0);
      Animated.spring(slideAnim, { toValue: 1, useNativeDriver: true, damping: 20, stiffness: 200 }).start();
    } else {
      slideAnim.setValue(0);
    }
  }, [visible, slideAnim, dragY]);

  const dismissSheet = useCallback(() => {
    Animated.timing(dragY, { toValue: 600, duration: 250, useNativeDriver: true }).start(() => {
      onClose();
    });
  }, [dragY, onClose]);

  const panResponder = useMemo(() =>
    PanResponder.create({
      onStartShouldSetPanResponder: () => false,
      onMoveShouldSetPanResponder: (_, g) => g.dy > 8,
      onPanResponderMove: (_, g) => {
        if (g.dy > 0) dragY.setValue(g.dy);
      },
      onPanResponderRelease: (_, g) => {
        if (g.dy > DISMISS_THRESHOLD || g.vy > 0.5) {
          dismissSheet();
        } else {
          Animated.spring(dragY, { toValue: 0, useNativeDriver: true, damping: 20, stiffness: 300 }).start();
        }
      },
    }),
  [dragY, dismissSheet]);

  if (!technique) return null;

  const cardTheme = CARD_THEMES[technique.id] ?? {
    bg: [technique.color + '40', technique.color] as [string, string],
    icon: 'ellipse-outline' as keyof typeof Ionicons.glyphMap,
  };
  const locked = technique.isPro && !isPro;
  const detailKey = `techniques.${technique.id}.detail`;
  const categoryLabel = t(`home.category${technique.category.charAt(0).toUpperCase() + technique.category.slice(1)}`);

  const translateY = Animated.add(
    slideAnim.interpolate({ inputRange: [0, 1], outputRange: [600, 0] }),
    dragY,
  );

  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onClose}>
      <View style={sheetStyles.overlay}>
        {/* Tapping the backdrop closes the sheet */}
        <Pressable style={StyleSheet.absoluteFill} onPress={dismissSheet} />
        <Animated.View
          {...panResponder.panHandlers}
          style={[
            sheetStyles.sheet,
            { backgroundColor: theme.surface, paddingBottom: insets.bottom + 16, transform: [{ translateY }] },
          ]}
        >
          {/* Handle bar */}
          <View style={sheetStyles.handleBar} />

          {/* Header with gradient */}
          <LinearGradient
            colors={cardTheme.bg}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
            style={sheetStyles.headerGradient}
          >
            <TechniqueShapePreview technique={technique} />
            {locked && (
              <View style={sheetStyles.proBadgeSheet}>
                <Ionicons name="lock-closed" size={12} color="rgba(255,255,255,0.9)" />
                <Text style={sheetStyles.proBadgeText}>{t('techniqueDetail.pro')}</Text>
              </View>
            )}
          </LinearGradient>

          {/* Content */}
          <View style={sheetStyles.content}>
            <Text style={[sheetStyles.name, { color: theme.text }]}>
              {t(technique.nameKey)}
            </Text>
            <Text style={[sheetStyles.description, { color: theme.textSecondary }]}>
              {t(technique.descriptionKey)}
            </Text>

            {/* Info pills */}
            <View style={sheetStyles.pillsRow}>
              <View style={[sheetStyles.infoPill, { backgroundColor: theme.background }]}>
                <Ionicons name="time-outline" size={14} color={theme.textSecondary} />
                <Text style={[sheetStyles.infoPillText, { color: theme.text }]}>
                  {getDurationLabel(technique)}
                </Text>
              </View>
              <View style={[sheetStyles.infoPill, { backgroundColor: theme.background }]}>
                <Ionicons name="apps-outline" size={14} color={theme.textSecondary} />
                <Text style={[sheetStyles.infoPillText, { color: theme.text }]}>
                  {categoryLabel}
                </Text>
              </View>
            </View>

            {/* Pattern */}
            <View style={[sheetStyles.patternBox, { backgroundColor: theme.background }]}>
              <Text style={[sheetStyles.patternLabel, { color: theme.textSecondary }]}>
                {t('techniqueDetail.pattern')}
              </Text>
              <Text style={[sheetStyles.patternValue, { color: theme.text }]}>
                {getPatternString(technique)}
              </Text>
            </View>

            {/* Detailed description */}
            <Text style={[sheetStyles.detail, { color: theme.textSecondary }]}>
              {t(detailKey)}
            </Text>

            {/* Start / Unlock button */}
            {locked ? (
              <TouchableOpacity
                style={[sheetStyles.startBtn, { backgroundColor: '#F5A623' }]}
                onPress={() => { onClose(); router.push('/paywall'); }}
                activeOpacity={0.85}
              >
                <Ionicons name="lock-open-outline" size={20} color="#FFFFFF" />
                <Text style={sheetStyles.startBtnText}>
                  {t('paywall.unlockPro')}
                </Text>
              </TouchableOpacity>
            ) : (
              <TouchableOpacity
                style={[sheetStyles.startBtn, { backgroundColor: technique.color }]}
                onPress={() => onStart(technique)}
                activeOpacity={0.85}
              >
                <Ionicons name="play" size={20} color="#FFFFFF" />
                <Text style={sheetStyles.startBtnText}>
                  {t('techniqueDetail.start')}
                </Text>
              </TouchableOpacity>
            )}
          </View>
        </Animated.View>
      </View>
    </Modal>
  );
}

const sheetStyles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.4)',
    justifyContent: 'flex-end',
  },
  sheet: {
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    overflow: 'hidden',
  },
  handleBar: {
    width: 36,
    height: 4,
    borderRadius: 2,
    backgroundColor: 'rgba(128,128,128,0.3)',
    alignSelf: 'center',
    marginTop: 10,
    marginBottom: 8,
  },
  headerGradient: {
    height: 140,
    justifyContent: 'center',
    alignItems: 'center',
    marginHorizontal: 16,
    borderRadius: 16,
    overflow: 'hidden',
  },
  proBadgeSheet: {
    position: 'absolute',
    top: 10,
    right: 12,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: 'rgba(0,0,0,0.2)',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
  },
  proBadgeText: {
    fontSize: 11,
    fontFamily: FONTS.bold,
    color: '#FFFFFF',
  },
  content: {
    paddingHorizontal: 20,
    paddingTop: 16,
  },
  name: {
    fontSize: 22,
    fontFamily: FONTS.heavy,
    letterSpacing: -0.4,
    marginBottom: 4,
  },
  description: {
    fontSize: 15,
    fontFamily: FONTS.medium,
    lineHeight: 21,
    marginBottom: 14,
  },
  pillsRow: {
    flexDirection: 'row',
    gap: 8,
    marginBottom: 14,
  },
  infoPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 10,
  },
  infoPillText: {
    fontSize: 13,
    fontFamily: FONTS.semibold,
  },
  patternBox: {
    padding: 14,
    borderRadius: 12,
    marginBottom: 14,
  },
  patternLabel: {
    fontSize: 11,
    fontFamily: FONTS.bold,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    marginBottom: 6,
  },
  patternValue: {
    fontSize: 15,
    fontFamily: FONTS.semibold,
    letterSpacing: -0.2,
  },
  detail: {
    fontSize: 14,
    fontFamily: FONTS.regular,
    lineHeight: 21,
    marginBottom: 20,
  },
  startBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    paddingVertical: 16,
    borderRadius: 16,
  },
  startBtnText: {
    fontSize: 17,
    fontFamily: FONTS.bold,
    color: '#FFFFFF',
  },
});

// ─── Breathing Sphere ───────────────────────────────────────────────────────

const SPHERE_SIZE = SCREEN_WIDTH * 0.32;

function BreathingSphere() {
  const scaleAnim = useRef(new Animated.Value(1)).current;
  const glowAnim = useRef(new Animated.Value(0.15)).current;

  useEffect(() => {
    Animated.loop(
      Animated.sequence([
        Animated.timing(scaleAnim, { toValue: 1.06, duration: 3500, easing: Easing.inOut(Easing.sin), useNativeDriver: true }),
        Animated.timing(scaleAnim, { toValue: 1, duration: 3500, easing: Easing.inOut(Easing.sin), useNativeDriver: true }),
      ]),
    ).start();

    Animated.loop(
      Animated.sequence([
        Animated.timing(glowAnim, { toValue: 0.3, duration: 3500, easing: Easing.inOut(Easing.sin), useNativeDriver: true }),
        Animated.timing(glowAnim, { toValue: 0.15, duration: 3500, easing: Easing.inOut(Easing.sin), useNativeDriver: true }),
      ]),
    ).start();
  }, [scaleAnim, glowAnim]);

  return (
    <View style={sphereStyles.wrapper}>
      <Animated.View style={[sphereStyles.glow, { opacity: glowAnim, transform: [{ scale: scaleAnim }] }]} />
      <Animated.View style={[sphereStyles.sphere, { transform: [{ scale: scaleAnim }] }]}>
        <View style={sphereStyles.solidBg}>
          <Svg width={28} height={28} viewBox="0 0 24 24" fill="none">
            <Path d="M3 8H16C17.6569 8 19 6.65685 19 5C19 3.34315 17.6569 2 16 2C14.3431 2 13 3.34315 13 5" stroke="rgba(255,255,255,0.85)" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" />
            <Path d="M3 12H20C21.1046 12 22 11.1046 22 10C22 8.89543 21.1046 8 20 8" stroke="rgba(255,255,255,0.85)" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" />
            <Path d="M3 16H14C15.6569 16 17 17.3431 17 19C17 20.6569 15.6569 22 14 22C12.3431 22 11 20.6569 11 19" stroke="rgba(255,255,255,0.85)" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" />
          </Svg>
        </View>
      </Animated.View>
    </View>
  );
}

const sphereStyles = StyleSheet.create({
  wrapper: {
    width: SPHERE_SIZE * 1.4,
    height: SPHERE_SIZE * 1.4,
    justifyContent: 'center',
    alignItems: 'center',
  },
  glow: {
    position: 'absolute',
    width: SPHERE_SIZE * 1.3,
    height: SPHERE_SIZE * 1.3,
    borderRadius: SPHERE_SIZE * 0.65,
    backgroundColor: '#4A90D9',
  },
  sphere: {
    width: SPHERE_SIZE,
    height: SPHERE_SIZE,
    borderRadius: SPHERE_SIZE / 2,
    overflow: 'hidden',
    shadowColor: '#4A90D9',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.35,
    shadowRadius: 24,
    elevation: 12,
  },
  solidBg: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#4A90D9',
  },
});

// ─── HomeScreen ──────────────────────────────────────────────────────────────

export default function HomeScreen() {
  const { t } = useTranslation();
  const theme = useThemeColors();
  const insets = useSafeAreaInsets();
  const isPro = useSettingsStore((s) => s.isPro);
  const stats = useSessionsStore((s) => s.stats);

  const [selectedMinutes, setSelectedMinutes] = useState(5);
  const [activeCategory, setActiveCategory] = useState<FilterCategory>('all');
  const [selectedTechnique, setSelectedTechnique] = useState<BreathingTechnique | null>(null);

  const filteredTechniques = activeCategory === 'all'
    ? TECHNIQUES
    : TECHNIQUES.filter((tech) => tech.category === activeCategory);

  const handleQuickStart = () => {
    router.push({
      pathname: '/session',
      params: {
        techniqueId: 'coherence',
        duration: String(selectedMinutes * 60),
      },
    });
  };

  const handleCardPress = useCallback((technique: BreathingTechnique) => {
    setSelectedTechnique(technique);
  }, []);

  const handleStartFromSheet = useCallback((technique: BreathingTechnique) => {
    setSelectedTechnique(null);
    router.push({ pathname: '/session', params: { techniqueId: technique.id } });
  }, []);

  // Build grid rows (pairs)
  const gridRows: BreathingTechnique[][] = [];
  for (let i = 0; i < filteredTechniques.length; i += 2) {
    gridRows.push(filteredTechniques.slice(i, i + 2));
  }

  return (
    <View style={[styles.container, { backgroundColor: theme.background }]}>
      <ScrollView
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        {/* ── Hero area with gradient ── */}
        <LinearGradient
          colors={['#4A90D9', '#7FBFDF', theme.background]}
          start={{ x: 0.5, y: 0 }}
          end={{ x: 0.5, y: 1 }}
          style={[styles.heroArea, { paddingTop: insets.top + 12 }]}
        >
          {/* Streak badge (top right) */}
          {stats.currentStreak > 0 && (
            <View style={styles.heroTopBar}>
              <View />
              <View style={styles.streakBadge}>
                <Ionicons name="flame" size={14} color="#FFFFFF" />
                <Text style={styles.streakText}>{stats.currentStreak}</Text>
              </View>
            </View>
          )}

          {/* Sphere — tap to start quick session */}
          <TouchableOpacity style={styles.orbWrapper} onPress={handleQuickStart} activeOpacity={0.85}>
            <BreathingSphere />
          </TouchableOpacity>

          {/* Start button */}
          <TouchableOpacity
            style={styles.startButton}
            onPress={handleQuickStart}
            activeOpacity={0.85}
          >
            <View style={styles.startButtonMinutes}>
              <Text style={styles.startButtonMinutesText}>{selectedMinutes}</Text>
            </View>
            <Text style={styles.startButtonLabel}>
              {t('home.breathe')} {selectedMinutes} min
            </Text>
          </TouchableOpacity>

          {/* Duration pills */}
          <View style={styles.durationRow}>
            {DURATION_OPTIONS.map((min) => {
              const isActive = min === selectedMinutes;
              return (
                <TouchableOpacity
                  key={min}
                  style={[
                    styles.durationPill,
                    isActive && styles.durationPillActive,
                  ]}
                  onPress={() => setSelectedMinutes(min)}
                  activeOpacity={0.7}
                >
                  <Text
                    style={[
                      styles.durationPillText,
                      isActive && styles.durationPillTextActive,
                    ]}
                  >
                    {min}
                  </Text>
                </TouchableOpacity>
              );
            })}
          </View>
        </LinearGradient>

        {/* ── Category filter tabs ── */}
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.categoryRow}
          style={styles.categoryScroll}
        >
          {CATEGORY_FILTERS.map((cat) => {
            const isActive = cat.key === activeCategory;
            return (
              <TouchableOpacity
                key={cat.key}
                style={[
                  styles.categoryPill,
                  isActive && { backgroundColor: theme.primary },
                  !isActive && { backgroundColor: theme.card },
                ]}
                onPress={() => setActiveCategory(cat.key)}
                activeOpacity={0.7}
              >
                <Text
                  style={[
                    styles.categoryPillText,
                    { color: isActive ? '#FFFFFF' : theme.textSecondary },
                    isActive && { fontFamily: FONTS.bold },
                  ]}
                >
                  {t(cat.labelKey)}
                </Text>
              </TouchableOpacity>
            );
          })}
        </ScrollView>

        {/* ── Technique grid ── */}
        <View style={styles.grid}>
          {gridRows.map((row, rowIndex) => (
            <View key={rowIndex} style={styles.gridRow}>
              {row.map((tech) => (
                <TechniqueCard
                  key={tech.id}
                  technique={tech}
                  isPro={isPro}
                  t={t}
                  theme={theme}
                  onPress={handleCardPress}
                />
              ))}
              {/* Spacer if odd number of cards */}
              {row.length === 1 && <View style={{ width: CARD_WIDTH }} />}
            </View>
          ))}

          {/* Create custom technique button */}
          <TouchableOpacity
            style={[styles.createCustomBtn, { borderColor: theme.border }]}
            onPress={() => {
              if (!isPro) {
                router.push('/paywall');
              } else {
                router.push('/custom-technique');
              }
            }}
            activeOpacity={0.7}
          >
            <Ionicons name="add-circle-outline" size={22} color={COLORS.primary} />
            <Text style={[styles.createCustomText, { color: COLORS.primary }]}>
              {t('home.createCustom')}
            </Text>
            {!isPro && (
              <View style={styles.createCustomProBadge}>
                <Text style={styles.createCustomProText}>PRO</Text>
              </View>
            )}
          </TouchableOpacity>
        </View>
      </ScrollView>

      {/* ── Technique detail bottom sheet ── */}
      <TechniqueDetailSheet
        technique={selectedTechnique}
        visible={selectedTechnique !== null}
        onClose={() => setSelectedTechnique(null)}
        onStart={handleStartFromSheet}
        isPro={isPro}
        t={t}
        theme={theme}
      />
    </View>
  );
}

// ─── Styles ──────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  container: { flex: 1 },
  scrollContent: { paddingBottom: SPACING.xxl + SPACING.lg },

  // Hero
  heroArea: {
    alignItems: 'center',
    paddingBottom: 24,
  },
  heroTopBar: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    width: '100%',
    paddingHorizontal: 24,
    marginBottom: 4,
  },
  streakBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: BORDER_RADIUS.full,
    backgroundColor: 'rgba(255,255,255,0.25)',
  },
  streakText: { fontSize: 14, fontFamily: FONTS.bold, color: '#FFFFFF' },

  orbWrapper: {
    marginVertical: 20,
    justifyContent: 'center',
    alignItems: 'center',
  },

  // Start button
  startButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(255,255,255,0.25)',
    borderRadius: BORDER_RADIUS.full,
    paddingVertical: 14,
    paddingHorizontal: 24,
    paddingLeft: 14,
    gap: 10,
    marginBottom: 16,
    minWidth: SCREEN_WIDTH * 0.6,
    justifyContent: 'center',
  },
  startButtonMinutes: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 2,
    backgroundColor: 'rgba(255,255,255,0.25)',
    borderRadius: BORDER_RADIUS.full,
    paddingHorizontal: 10,
    paddingVertical: 4,
  },
  startButtonMinutesText: {
    fontSize: 14,
    fontFamily: FONTS.bold,
    color: '#FFFFFF',
  },
  startButtonLabel: {
    fontSize: 18,
    fontFamily: FONTS.bold,
    color: '#FFFFFF',
    letterSpacing: -0.3,
  },

  // Duration row
  durationRow: {
    flexDirection: 'row',
    gap: 6,
    justifyContent: 'center',
  },
  durationPill: {
    width: 38,
    height: 32,
    borderRadius: 16,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: 'transparent',
  },
  durationPillActive: {
    backgroundColor: 'rgba(255,255,255,0.3)',
  },
  durationPillText: {
    fontSize: 14,
    fontFamily: FONTS.semibold,
    color: 'rgba(255,255,255,0.6)',
  },
  durationPillTextActive: {
    color: '#FFFFFF',
    fontFamily: FONTS.heavy,
  },

  // Category filter
  categoryScroll: {
    marginTop: 8,
    marginBottom: 16,
  },
  categoryRow: {
    paddingHorizontal: GRID_H_PADDING,
    gap: 8,
  },
  categoryPill: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: BORDER_RADIUS.full,
  },
  categoryPillText: {
    fontSize: 14,
    fontFamily: FONTS.semibold,
  },

  // Grid
  grid: {
    paddingHorizontal: GRID_H_PADDING,
    gap: GRID_GAP,
  },
  gridRow: {
    flexDirection: 'row',
    gap: GRID_GAP,
  },

  // Grid card
  gridCard: {
    width: CARD_WIDTH,
    borderRadius: 16,
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.06,
    shadowRadius: 8,
    elevation: 3,
  },
  gridCardArt: {
    height: CARD_WIDTH * 0.65,
    justifyContent: 'center',
    alignItems: 'center',
  },
  gridCardInfo: {
    padding: 12,
    paddingTop: 10,
  },
  gridCardName: {
    fontSize: 14,
    fontFamily: FONTS.bold,
    letterSpacing: -0.2,
    marginBottom: 2,
  },
  gridCardDuration: {
    fontSize: 12,
    fontFamily: FONTS.medium,
  },

  // PRO badge
  proBadge: {
    position: 'absolute',
    top: 8,
    right: 8,
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: 'rgba(0,0,0,0.15)',
    justifyContent: 'center',
    alignItems: 'center',
  },

  // Create custom button
  createCustomBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    paddingVertical: SPACING.sm + 4,
    borderRadius: BORDER_RADIUS.lg,
    borderWidth: 1,
    borderStyle: 'dashed',
    marginTop: SPACING.xs,
  },
  createCustomText: {
    fontSize: 15,
    fontFamily: FONTS.semibold,
  },
  createCustomProBadge: {
    backgroundColor: COLORS.primary,
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 6,
  },
  createCustomProText: {
    fontSize: 10,
    fontFamily: FONTS.bold,
    color: '#FFFFFF',
    letterSpacing: 0.5,
  },
});
