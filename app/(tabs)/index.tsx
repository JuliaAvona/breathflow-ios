import React, { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  StyleSheet,
  Dimensions,
  Animated,
  Modal,
  Pressable,
  PanResponder,
  ImageBackground,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { router } from 'expo-router';
import { useTranslation } from 'react-i18next';
import { Ionicons } from '@expo/vector-icons';
import { useThemeColors } from '../../src/hooks/useColorScheme';
import { useSettingsStore, useSessionsStore } from '../../src/store';
import { TECHNIQUES } from '../../src/constants/techniques';
import { SPACING, BORDER_RADIUS, FONTS, scale } from '../../src/constants';
import type { BreathingTechnique, TechniqueCategory } from '../../src/types';
import { BreathingCircle } from '../../src/components/BreathingCircle';
import { BreathingSquare } from '../../src/components/BreathingSquare';
import { BreathingTriangle } from '../../src/components/BreathingTriangle';
import { BreathingWave } from '../../src/components/BreathingWave';
import { BreathingBurst } from '../../src/components/BreathingBurst';
import { BreathingOval } from '../../src/components/BreathingOval';
import { BreathingMandala } from '../../src/components/BreathingMandala';

// Per-technique images (most specific)
const TECHNIQUE_BG_IMAGES: Record<string, ReturnType<typeof require>> = {
  box:            require('../../assets/bg_box.webp'),
  fourSevenEight: require('../../assets/bg_478.webp'),
  physioSigh:     require('../../assets/bg_physio_sigh.webp'),
  coherence:      require('../../assets/bg_coherence.webp'),
  triangle:       require('../../assets/bg_triangle.webp'),
  power:          require('../../assets/bg_power.webp'),
  fourFourSixTwo: require('../../assets/bg_four_four_six_two.webp'),
  kapalabhati:    require('../../assets/bg_kapalabhati.webp'),
  twoToOne:       require('../../assets/bg_two_to_one.webp'),
  cyclicSigh:     require('../../assets/bg_cyclic_sigh.webp'),
};

// Category fallbacks
const BG_IMAGES: Record<TechniqueCategory | 'all', ReturnType<typeof require>> = {
  all:    require('../../assets/bg_focus.webp'),
  calm:   require('../../assets/bg_calm.webp'),
  sleep:  require('../../assets/bg_sleep.webp'),
  focus:  require('../../assets/bg_focus.webp'),
  energy: require('../../assets/bg_energy.webp'),
};

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
];

// ─── Helpers ─────────────────────────────────────────────────────────────────

// Maps instructionKey (short or full i18n key) to a display label
const PHASE_LABELS: Record<string, string> = {
  breatheIn: 'In',            'session.breatheIn': 'In',
  breatheOut: 'Out',          'session.breatheOut': 'Out',
  hold: 'Hold',               'session.hold': 'Hold',
  holdOut: 'Hold',            'session.holdOut': 'Hold',
  topUpInhale: 'Sip',
};

// Maps shape to a fallback icon for custom technique cards
const SHAPE_ICONS: Record<string, keyof typeof Ionicons.glyphMap> = {
  circle:   'ellipse-outline',
  square:   'square-outline',
  triangle: 'triangle-outline',
  wave:     'water-outline',
  oval:     'ellipse-outline',
  burst:    'flash-outline',
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
  onPress: (technique: BreathingTechnique) => void;
}

function TechniqueCard({ technique, isPro, t, onPress }: TechniqueCardProps) {
  const theme = useThemeColors();
  const locked = technique.isPro && !isPro;
  const cardTheme = CARD_THEMES[technique.id] ?? {
    bg: [technique.color + '40', technique.color] as [string, string],
    icon: (technique.icon ?? SHAPE_ICONS[technique.shape] ?? 'ellipse-outline') as keyof typeof Ionicons.glyphMap,
  };

  const bgImage = TECHNIQUE_BG_IMAGES[technique.id] ?? BG_IMAGES[technique.category ?? 'calm'];

  return (
    <TouchableOpacity
      style={[styles.gridCard, { backgroundColor: theme.card }]}
      onPress={() => onPress(technique)}
      activeOpacity={0.85}
      accessibilityLabel={t(technique.nameKey)}
      accessibilityRole="button"
    >
      {/* Nature photo art area */}
      <ImageBackground source={bgImage} style={styles.gridCardArt} resizeMode="cover">
        <LinearGradient
          colors={['rgba(0,0,0,0.30)', 'rgba(0,0,0,0.60)']}
          style={StyleSheet.absoluteFill}
        />
        <Ionicons name={cardTheme.icon} size={36} color="rgba(255,255,255,0.75)" />

        {/* PRO lock */}
        {locked && (
          <View style={styles.proBadge}>
            <Ionicons name="lock-closed" size={10} color="rgba(255,255,255,0.9)" />
          </View>
        )}
      </ImageBackground>

      {/* Info */}
      <View style={styles.gridCardInfo}>
        <Text style={[styles.gridCardName, { color: theme.text }]} numberOfLines={1}>
          {t(technique.nameKey)}
        </Text>
        <Text style={[styles.gridCardDuration, { color: theme.textSecondary }]}>
          {getPatternString(technique)}
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
    bg: [technique.color + '55', technique.color] as [string, string],
    icon: (SHAPE_ICONS[technique.shape] ?? 'ellipse-outline') as keyof typeof Ionicons.glyphMap,
  };
  const locked = technique.isPro && !isPro;
  const detailKey = `techniques.${technique.id}.detail`;
  const hasDetail = !technique.id.startsWith('custom_');
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

            {/* Detailed description — only for built-in techniques */}
            {hasDetail && (
              <Text style={[sheetStyles.detail, { color: theme.textSecondary }]}>
                {t(detailKey)}
              </Text>
            )}

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

// ─── (BreathingSphere removed — replaced by BreathingMandala in hero) ───────

// ─── HomeScreen ──────────────────────────────────────────────────────────────

export default function HomeScreen() {
  const { t } = useTranslation();
  const theme = useThemeColors();
  const insets = useSafeAreaInsets();
  const isPro = useSettingsStore((s) => s.isPro);
  const selectedGoal = useSettingsStore((s) => s.selectedGoal);
  const stats = useSessionsStore((s) => s.stats);

  const [selectedMinutes, setSelectedMinutes] = useState(5);
  const [activeCategory, setActiveCategory] = useState<FilterCategory>(
    selectedGoal ?? 'all',
  );
  const [selectedTechnique, setSelectedTechnique] = useState<BreathingTechnique | null>(null);

  const filteredTechniques = useMemo(() => {
    if (activeCategory === 'all') return TECHNIQUES;
    return TECHNIQUES.filter((tech) => tech.category === activeCategory);
  }, [activeCategory]);

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
    router.push({ pathname: '/technique-detail', params: { techniqueId: technique.id } });
  }, []);

  const handleStartFromSheet = useCallback((technique: BreathingTechnique) => {
    setSelectedTechnique(null);
    router.push({ pathname: '/session', params: { techniqueId: technique.id } });
  }, []);

  const gridRows: BreathingTechnique[][] = [];
  for (let i = 0; i < filteredTechniques.length; i += 2) {
    gridRows.push(filteredTechniques.slice(i, i + 2));
  }

  const heroBg = BG_IMAGES[activeCategory];

  return (
    <View style={[styles.container, { backgroundColor: theme.background }]}>
      <ScrollView
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        {/* ── Hero area with image background ── */}
        <ImageBackground
          source={heroBg}
          resizeMode="cover"
          style={[styles.heroArea, { paddingTop: insets.top + 12 }]}
        >
          <LinearGradient
            colors={
              theme.isDark
                ? ['#000000AA', '#00000055', `${theme.background}FF`]
                : ['#00000066', '#00000044', `${theme.background}FF`]
            }
            start={{ x: 0.5, y: 0 }}
            end={{ x: 0.5, y: 1 }}
            style={StyleSheet.absoluteFill}
          />

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

          {/* Mandala — tap to start quick session */}
          <TouchableOpacity style={styles.orbWrapper} onPress={handleQuickStart} activeOpacity={0.85}>
            <BreathingMandala phase="IDLE" color="#4A90D9" size={scale(220)} />
          </TouchableOpacity>

          {/* Start button */}
          <TouchableOpacity
            style={[styles.startButton, { backgroundColor: 'rgba(0,0,0,0.35)' }]}
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
        </ImageBackground>

        {/* ── Category filter tabs ── */}
        <View style={styles.categoryRow}>
          {CATEGORY_FILTERS.map((cat) => {
            const isActive = cat.key === activeCategory;
            return (
              <TouchableOpacity
                key={cat.key}
                style={[
                  styles.categoryPill,
                  isActive
                    ? { backgroundColor: theme.primary, borderColor: theme.primary }
                    : {
                        backgroundColor: theme.isDark ? 'rgba(255,255,255,0.08)' : theme.card,
                        borderColor: theme.isDark ? 'rgba(255,255,255,0.12)' : theme.border,
                      },
                ]}
                onPress={() => setActiveCategory(cat.key)}
                activeOpacity={0.7}
              >
                <Text
                  style={[
                    styles.categoryPillText,
                    { color: isActive ? '#FFFFFF' : theme.isDark ? 'rgba(255,255,255,0.6)' : theme.textSecondary },
                    isActive && { fontFamily: FONTS.bold },
                  ]}
                >
                  {t(cat.labelKey)}
                </Text>
              </TouchableOpacity>
            );
          })}
        </View>

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
                  onPress={handleCardPress}
                />
              ))}
              {/* Spacer if odd number of cards */}
              {row.length === 1 && <View style={{ width: CARD_WIDTH }} />}
            </View>
          ))}
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
    backgroundColor: 'rgba(0,0,0,0.3)',
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
    backgroundColor: 'rgba(255,255,255,0.2)',
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
    backgroundColor: 'rgba(0,0,0,0.35)',
  },
  durationPillText: {
    fontSize: 14,
    fontFamily: FONTS.semibold,
    color: 'rgba(255,255,255,0.7)',
  },
  durationPillTextActive: {
    color: '#FFFFFF',
    fontFamily: FONTS.heavy,
  },

  // Category filter
  categoryRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'center',
    gap: 6,
    marginTop: 8,
    marginBottom: 16,
    paddingHorizontal: GRID_H_PADDING,
  },
  categoryPill: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: BORDER_RADIUS.full,
    borderWidth: 1,
    borderColor: 'transparent',
  },
  categoryPillText: {
    fontSize: 12,
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
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 12,
    elevation: 6,
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

});
