import React, { useState } from 'react';
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  StyleSheet,
  Dimensions,
  FlatList,
  NativeSyntheticEvent,
  NativeScrollEvent,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { SafeAreaView } from 'react-native-safe-area-context';
import { router } from 'expo-router';
import { useTranslation } from 'react-i18next';
import { Ionicons } from '@expo/vector-icons';
import { useThemeColors } from '../../src/hooks/useColorScheme';
import { useSettingsStore, useSessionsStore } from '../../src/store';
import { TECHNIQUES } from '../../src/constants/techniques';
import { SPACING, BORDER_RADIUS, scale } from '../../src/constants';
import type { BreathingTechnique } from '../../src/types';

// ─── Layout constants ────────────────────────────────────────────────────────

const DURATION_OPTIONS = [1, 2, 3, 5, 10, 15, 20];
const { width: SCREEN_WIDTH } = Dimensions.get('window');
const CARD_H_PADDING = SPACING.lg;
const CARD_WIDTH = SCREEN_WIDTH - CARD_H_PADDING * 2;
const CARD_HEIGHT = CARD_WIDTH * 0.65;
const SNAP_WIDTH = CARD_WIDTH + 16; // card + gap

// ─── Abstract art configs ────────────────────────────────────────────────────

interface BlobShape {
  color: string;
  w: number; h: number; x: number; y: number;
  borderRadius: string;
  rotate?: string;
  opacity?: number;
}

interface CardArt {
  bg: [string, string];
  shapes: BlobShape[];
}

function parseBorderRadius(br: string, w: number, h: number) {
  const parts = br.split(' ').map((p) => {
    const pct = parseFloat(p) / 100;
    return Math.round(Math.max(w, h) * pct);
  });
  if (parts.length === 1) {
    return {
      borderTopLeftRadius: parts[0], borderTopRightRadius: parts[0],
      borderBottomLeftRadius: parts[0], borderBottomRightRadius: parts[0],
    };
  }
  return {
    borderTopLeftRadius: parts[0],
    borderTopRightRadius: parts[1] ?? parts[0],
    borderBottomRightRadius: parts[2] ?? parts[0],
    borderBottomLeftRadius: parts[3] ?? parts[1] ?? parts[0],
  };
}

const CARD_ARTS: Record<string, CardArt> = {
  box: {
    bg: ['#D6E8FF', '#A3C4F3'],
    shapes: [
      { color: '#4A90D9', w: 0.55, h: 0.55, x: -0.08, y: -0.1, borderRadius: '18%', rotate: '15deg', opacity: 0.35 },
      { color: '#7EB3F4', w: 0.45, h: 0.45, x: 0.5, y: 0.05, borderRadius: '18%', rotate: '-10deg', opacity: 0.3 },
      { color: '#3A73B0', w: 0.35, h: 0.35, x: 0.25, y: 0.45, borderRadius: '18%', rotate: '30deg', opacity: 0.25 },
      { color: '#B8D6F8', w: 0.5, h: 0.5, x: 0.45, y: 0.4, borderRadius: '18%', rotate: '5deg', opacity: 0.3 },
    ],
  },
  fourSevenEight: {
    bg: ['#E4D6F5', '#C5A8E3'],
    shapes: [
      { color: '#7B68AE', w: 0.8, h: 0.8, x: 0.3, y: -0.25, borderRadius: '50%', opacity: 0.25 },
      { color: '#C5A8E3', w: 0.7, h: 0.7, x: 0.45, y: -0.2, borderRadius: '50%', opacity: 0.4 },
      { color: '#A57DD1', w: 0.4, h: 0.4, x: -0.05, y: 0.55, borderRadius: '50%', opacity: 0.3 },
      { color: '#D4BFE8', w: 0.25, h: 0.25, x: 0.15, y: 0.35, borderRadius: '50%', opacity: 0.35 },
    ],
  },
  physioSigh: {
    bg: ['#D0F0E0', '#A3DFC0'],
    shapes: [
      { color: '#7BC4A8', w: 1.3, h: 0.25, x: -0.15, y: 0.05, borderRadius: '50%', rotate: '-8deg', opacity: 0.3 },
      { color: '#5DAF90', w: 1.2, h: 0.22, x: -0.1, y: 0.28, borderRadius: '50%', rotate: '5deg', opacity: 0.25 },
      { color: '#B5E8D0', w: 1.3, h: 0.28, x: -0.15, y: 0.5, borderRadius: '50%', rotate: '-3deg', opacity: 0.35 },
      { color: '#3D9B78', w: 1.1, h: 0.2, x: -0.05, y: 0.72, borderRadius: '50%', rotate: '6deg', opacity: 0.2 },
    ],
  },
  coherence: {
    bg: ['#CCE6F4', '#8FC5DF'],
    shapes: [
      { color: '#5BA4C8', w: 1.0, h: 1.0, x: 0.0, y: -0.1, borderRadius: '50%', opacity: 0.15 },
      { color: '#5BA4C8', w: 0.75, h: 0.75, x: 0.12, y: 0.02, borderRadius: '50%', opacity: 0.18 },
      { color: '#5BA4C8', w: 0.5, h: 0.5, x: 0.25, y: 0.15, borderRadius: '50%', opacity: 0.22 },
      { color: '#A8D8EC', w: 0.28, h: 0.28, x: 0.36, y: 0.26, borderRadius: '50%', opacity: 0.3 },
    ],
  },
  triangle: {
    bg: ['#C8F5F0', '#8AE6DC'],
    shapes: [
      { color: '#4ECDC4', w: 0.5, h: 1.2, x: -0.15, y: -0.1, borderRadius: '10%', rotate: '25deg', opacity: 0.25 },
      { color: '#3AB8AE', w: 0.35, h: 1.0, x: 0.3, y: -0.05, borderRadius: '10%', rotate: '25deg', opacity: 0.2 },
      { color: '#9AEDE6', w: 0.3, h: 0.9, x: 0.65, y: 0.0, borderRadius: '10%', rotate: '25deg', opacity: 0.25 },
    ],
  },
  power: {
    bg: ['#FDDCD6', '#F5A99C'],
    shapes: [
      { color: '#E85D4A', w: 0.5, h: 0.5, x: 0.25, y: 0.15, borderRadius: '50%', opacity: 0.35 },
      { color: '#F08070', w: 0.3, h: 0.7, x: 0.35, y: -0.15, borderRadius: '40%', opacity: 0.2 },
      { color: '#F08070', w: 0.7, h: 0.3, x: 0.15, y: 0.25, borderRadius: '40%', opacity: 0.2 },
      { color: '#F08070', w: 0.35, h: 0.6, x: 0.08, y: 0.0, borderRadius: '40%', rotate: '45deg', opacity: 0.15 },
      { color: '#F08070', w: 0.35, h: 0.6, x: 0.48, y: 0.1, borderRadius: '40%', rotate: '-45deg', opacity: 0.15 },
    ],
  },
  fourFourSixTwo: {
    bg: ['#D6E4F5', '#A3C0E3'],
    shapes: [
      { color: '#6B9BD2', w: 1.4, h: 0.4, x: -0.2, y: -0.05, borderRadius: '50%', rotate: '12deg', opacity: 0.25 },
      { color: '#89B3E0', w: 1.3, h: 0.35, x: -0.15, y: 0.25, borderRadius: '50%', rotate: '-8deg', opacity: 0.2 },
      { color: '#B8D3F0', w: 1.2, h: 0.3, x: -0.1, y: 0.55, borderRadius: '50%', rotate: '5deg', opacity: 0.3 },
    ],
  },
  kapalabhati: {
    bg: ['#FEF0D0', '#F5D58A'],
    shapes: [
      { color: '#F5A623', w: 0.22, h: 0.22, x: 0.1, y: 0.1, borderRadius: '50%', opacity: 0.4 },
      { color: '#E8B84A', w: 0.15, h: 0.15, x: 0.55, y: 0.05, borderRadius: '50%', opacity: 0.35 },
      { color: '#F5A623', w: 0.3, h: 0.3, x: 0.6, y: 0.35, borderRadius: '50%', opacity: 0.3 },
      { color: '#D4900A', w: 0.18, h: 0.18, x: 0.35, y: 0.55, borderRadius: '50%', opacity: 0.3 },
      { color: '#FBD98C', w: 0.12, h: 0.12, x: 0.08, y: 0.6, borderRadius: '50%', opacity: 0.45 },
      { color: '#F5A623', w: 0.25, h: 0.25, x: 0.3, y: 0.2, borderRadius: '50%', opacity: 0.2 },
      { color: '#E8B84A', w: 0.1, h: 0.1, x: 0.78, y: 0.65, borderRadius: '50%', opacity: 0.35 },
    ],
  },
  twoToOne: {
    bg: ['#E8D8F0', '#C9A8DF'],
    shapes: [
      { color: '#9B7FBD', w: 0.25, h: 0.9, x: -0.05, y: 0.05, borderRadius: '50%', opacity: 0.25 },
      { color: '#B498D0', w: 0.2, h: 0.75, x: 0.22, y: -0.1, borderRadius: '50%', opacity: 0.2 },
      { color: '#D8C4EA', w: 0.28, h: 0.85, x: 0.45, y: 0.1, borderRadius: '50%', opacity: 0.25 },
      { color: '#7B5AA0', w: 0.2, h: 0.7, x: 0.72, y: -0.05, borderRadius: '50%', opacity: 0.18 },
    ],
  },
  cyclicSigh: {
    bg: ['#D0EEDC', '#96D6AC'],
    shapes: [
      { color: '#5BAD7A', w: 0.7, h: 0.5, x: -0.15, y: 0.55, borderRadius: '50% 50% 0 0', opacity: 0.3 },
      { color: '#78C494', w: 0.6, h: 0.45, x: 0.25, y: 0.6, borderRadius: '50% 50% 0 0', opacity: 0.25 },
      { color: '#A8E0BC', w: 0.65, h: 0.4, x: 0.5, y: 0.65, borderRadius: '50% 50% 0 0', opacity: 0.3 },
      { color: '#3D8A58', w: 0.5, h: 0.3, x: 0.05, y: 0.15, borderRadius: '50%', opacity: 0.12 },
    ],
  },
};

// ─── Helpers ─────────────────────────────────────────────────────────────────

function getDurationLabel(t: BreathingTechnique): string {
  if (t.mode === 'power') {
    return `~${Math.round((t.breathCount! * 2 * t.roundCount! + t.roundCount! * 90) / 60)} min`;
  }
  if (t.mode === 'kapalabhati') {
    return `${Math.round((t.setCount! * t.setDuration! + (t.setCount! - 1) * t.restDuration!) / 60)} min`;
  }
  const cycleDur = t.phases.reduce((s, p) => s + p.duration, 0);
  return `${Math.round((t.defaultDuration ?? cycleDur * (t.defaultCycles || 6)) / 60)} min`;
}

const PHASE_META: Record<string, { label: string; icon: keyof typeof Ionicons.glyphMap }> = {
  breatheIn: { label: 'Breathe in', icon: 'arrow-down-circle-outline' },
  breatheOut: { label: 'Breathe out', icon: 'arrow-up-circle-outline' },
  hold: { label: 'Hold', icon: 'ellipse-outline' },
  holdOut: { label: 'Hold', icon: 'ellipse-outline' },
  topUpInhale: { label: 'Top-up', icon: 'arrow-down-circle-outline' },
};

interface PhaseStep {
  icon: keyof typeof Ionicons.glyphMap;
  label: string;
  duration: string;
}

function getPhaseSteps(technique: BreathingTechnique): PhaseStep[] {
  if (technique.mode === 'power') {
    return [
      { icon: 'sync-outline', label: 'Breaths', duration: `${technique.breathCount}` },
      { icon: 'repeat-outline', label: 'Rounds', duration: `${technique.roundCount}` },
    ];
  }
  if (technique.mode === 'kapalabhati') {
    return [
      { icon: 'flash-outline', label: 'Rapid sets', duration: `${technique.setCount} × ${technique.setDuration}s` },
    ];
  }
  return technique.phases.map((p) => {
    const meta = PHASE_META[p.instructionKey] ?? { label: p.instructionKey, icon: 'radio-button-off-outline' as keyof typeof Ionicons.glyphMap };
    return {
      icon: meta.icon,
      label: meta.label,
      duration: p.duration % 1 === 0 ? `${p.duration}s` : `${p.duration.toFixed(1)}s`,
    };
  });
}

// ─── TechniqueCard (full-width carousel card) ────────────────────────────────

interface TechniqueCardProps {
  technique: BreathingTechnique;
  isPro: boolean;
  t: (key: string) => string;
}

function TechniqueCard({ technique, isPro, t }: TechniqueCardProps) {
  const locked = technique.isPro && !isPro;
  const art = CARD_ARTS[technique.id] ?? { bg: [technique.color + '40', technique.color], shapes: [] };

  const handlePress = () => {
    router.push({ pathname: '/session', params: { techniqueId: technique.id } });
  };

  return (
    <TouchableOpacity
      style={styles.card}
      onPress={handlePress}
      activeOpacity={0.9}
      accessibilityLabel={t(technique.nameKey)}
      accessibilityRole="button"
    >
      <LinearGradient
        colors={art.bg}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={styles.cardGradient}
      >
        {/* Abstract shapes */}
        {art.shapes.map((shape, i) => {
          const sw = CARD_WIDTH * shape.w;
          const sh = CARD_HEIGHT * shape.h;
          const radii = parseBorderRadius(shape.borderRadius, sw, sh);
          return (
            <View
              key={i}
              style={{
                position: 'absolute',
                width: sw, height: sh,
                ...radii,
                backgroundColor: shape.color,
                opacity: shape.opacity ?? 0.3,
                left: CARD_WIDTH * shape.x,
                top: CARD_HEIGHT * shape.y,
                transform: shape.rotate ? [{ rotate: shape.rotate }] : [],
              }}
            />
          );
        })}

        {/* Content overlay */}
        <View style={styles.cardContent}>
          {/* Left side: name + description + phases */}
          <View style={styles.cardLeft}>
            <Text style={styles.cardName} numberOfLines={1}>
              {t(technique.nameKey)}
            </Text>
            <Text style={styles.cardDescription} numberOfLines={2}>
              {t(technique.descriptionKey)}
            </Text>

            <View style={styles.phaseSteps}>
              {getPhaseSteps(technique).map((step, i) => (
                <View key={i} style={styles.phaseStepRow}>
                  <Ionicons name={step.icon} size={13} color="rgba(0,0,0,0.35)" />
                  <Text style={styles.phaseStepLabel}>{step.label}:</Text>
                  <Text style={styles.phaseStepValue}>{step.duration}</Text>
                </View>
              ))}
            </View>
          </View>

          {/* Right side: duration */}
          <View style={styles.cardRight}>
            <View style={styles.durationPillCard}>
              <Text style={styles.durationPillCardText}>
                {getDurationLabel(technique)}
              </Text>
            </View>
          </View>
        </View>

        {/* PRO lock */}
        {locked && (
          <View style={styles.proBadge}>
            <Ionicons name="lock-closed" size={12} color="rgba(255,255,255,0.9)" />
          </View>
        )}
      </LinearGradient>
    </TouchableOpacity>
  );
}

// ─── HomeScreen ──────────────────────────────────────────────────────────────

export default function HomeScreen() {
  const { t } = useTranslation();
  const theme = useThemeColors();
  const isPro = useSettingsStore((s) => s.isPro);
  const stats = useSessionsStore((s) => s.stats);

  const [selectedMinutes, setSelectedMinutes] = useState(5);
  const [activeIndex, setActiveIndex] = useState(0);

  const handleQuickStart = () => {
    router.push({
      pathname: '/session',
      params: {
        techniqueId: 'coherence',
        duration: String(selectedMinutes * 60),
      },
    });
  };

  const onScroll = (e: NativeSyntheticEvent<NativeScrollEvent>) => {
    const idx = Math.round(e.nativeEvent.contentOffset.x / SNAP_WIDTH);
    setActiveIndex(idx);
  };

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: theme.background }]}>
      <ScrollView
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        {/* ── Header ── */}
        <View style={styles.header}>
          <Text style={[styles.title, { color: theme.text }]}>
            {t('home.title')}
          </Text>
          {stats.currentStreak > 0 && (
            <View style={[styles.streakPill, { backgroundColor: theme.primary + '15' }]}>
              <Ionicons name="flame" size={14} color={theme.primary} />
              <Text style={[styles.streakText, { color: theme.primary }]}>
                {stats.currentStreak}
              </Text>
            </View>
          )}
        </View>

        {/* ── Quick Start section ── */}
        <View style={styles.quickStartSection}>
          <TouchableOpacity
            style={[styles.breatheButton, { backgroundColor: theme.primary }]}
            onPress={handleQuickStart}
            activeOpacity={0.8}
          >
            <Text style={styles.breatheButtonText}>
              Breathe {selectedMinutes} min
            </Text>
            <Ionicons name="play" size={18} color="#FFFFFF" style={{ marginLeft: 6 }} />
          </TouchableOpacity>

          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={styles.durationRow}
          >
            {DURATION_OPTIONS.map((min) => {
              const isActive = min === selectedMinutes;
              return (
                <TouchableOpacity
                  key={min}
                  style={[
                    styles.durationPill,
                    {
                      backgroundColor: isActive ? theme.primary + '18' : 'transparent',
                      borderColor: isActive ? theme.primary + '40' : theme.border,
                    },
                  ]}
                  onPress={() => setSelectedMinutes(min)}
                  activeOpacity={0.7}
                >
                  <Text
                    style={[
                      styles.durationPillText,
                      { color: isActive ? theme.primary : theme.textSecondary },
                    ]}
                  >
                    {min}
                  </Text>
                </TouchableOpacity>
              );
            })}
          </ScrollView>
        </View>

        {/* ── Divider ── */}
        <View style={styles.dividerRow}>
          <View style={[styles.dividerLine, { backgroundColor: theme.border }]} />
          <Text style={[styles.dividerLabel, { color: theme.textSecondary }]}>
            PROGRAMS
          </Text>
          <View style={[styles.dividerLine, { backgroundColor: theme.border }]} />
        </View>

        {/* ── Horizontal carousel ── */}
        <FlatList
          data={TECHNIQUES}
          keyExtractor={(item) => item.id}
          horizontal
          pagingEnabled={false}
          snapToInterval={SNAP_WIDTH}
          snapToAlignment="start"
          decelerationRate="fast"
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.carousel}
          onScroll={onScroll}
          scrollEventThrottle={16}
          renderItem={({ item }) => (
            <TechniqueCard
              technique={item}
              isPro={isPro}
              t={t}
            />
          )}
        />

        {/* ── Page dots ── */}
        <View style={styles.dots}>
          {TECHNIQUES.map((_, i) => (
            <View
              key={i}
              style={[
                styles.dot,
                {
                  backgroundColor: i === activeIndex
                    ? theme.primary
                    : theme.textSecondary + '30',
                },
                i === activeIndex && styles.dotActive,
              ]}
            />
          ))}
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

// ─── Styles ──────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  container: { flex: 1 },
  scrollContent: { paddingBottom: SPACING.xxl + SPACING.lg },

  // Header
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: SPACING.lg,
    paddingTop: SPACING.sm,
    paddingBottom: SPACING.md,
  },
  title: {
    fontSize: scale(34),
    fontWeight: '800',
    letterSpacing: -1,
  },
  streakPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: BORDER_RADIUS.full,
  },
  streakText: { fontSize: 14, fontWeight: '700' },

  // Quick start
  quickStartSection: {
    paddingHorizontal: SPACING.lg,
    marginBottom: SPACING.lg,
  },
  breatheButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 18,
    borderRadius: BORDER_RADIUS.full,
    marginBottom: SPACING.md,
  },
  breatheButtonText: {
    fontSize: 20,
    fontWeight: '600',
    color: '#FFFFFF',
    letterSpacing: -0.3,
  },
  durationRow: {
    flexDirection: 'row',
    gap: SPACING.sm,
    justifyContent: 'center',
    paddingHorizontal: 2,
  },
  durationPill: {
    width: 44, height: 44, borderRadius: 22,
    borderWidth: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  durationPillText: { fontSize: 15, fontWeight: '600' },

  // Divider
  dividerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: SPACING.lg,
    marginTop: SPACING.sm,
    marginBottom: SPACING.lg,
    gap: 12,
  },
  dividerLine: { flex: 1, height: StyleSheet.hairlineWidth },
  dividerLabel: { fontSize: 10, fontWeight: '500', letterSpacing: 2 },

  // Carousel
  carousel: {
    paddingLeft: CARD_H_PADDING,
    paddingRight: CARD_H_PADDING,
    gap: 16,
  },

  // Card
  card: {
    width: CARD_WIDTH,
    height: CARD_HEIGHT,
    borderRadius: 24,
    overflow: 'hidden',
  },
  cardGradient: {
    flex: 1,
    overflow: 'hidden',
  },
  cardContent: {
    flex: 1,
    flexDirection: 'row',
    padding: 20,
    justifyContent: 'space-between',
  },
  cardLeft: {
    flex: 1,
    justifyContent: 'flex-end',
    paddingRight: 12,
  },
  cardRight: {
    justifyContent: 'flex-end',
    alignItems: 'flex-end',
  },
  cardName: {
    fontSize: 22,
    fontWeight: '700',
    color: 'rgba(0,0,0,0.7)',
    letterSpacing: -0.5,
    marginBottom: 4,
  },
  cardDescription: {
    fontSize: 13,
    fontWeight: '400',
    color: 'rgba(0,0,0,0.4)',
    lineHeight: 18,
    marginBottom: 12,
  },
  phaseSteps: { gap: 4 },
  phaseStepRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  phaseStepLabel: {
    fontSize: 13,
    fontWeight: '600',
    color: 'rgba(0,0,0,0.45)',
  },
  phaseStepValue: {
    fontSize: 13,
    fontWeight: '700',
    color: 'rgba(0,0,0,0.6)',
  },

  // Duration pill on card
  durationPillCard: {
    backgroundColor: 'rgba(255,255,255,0.45)',
    paddingHorizontal: 14,
    paddingVertical: 6,
    borderRadius: 14,
  },
  durationPillCardText: {
    fontSize: 13,
    fontWeight: '700',
    color: 'rgba(0,0,0,0.5)',
  },

  // PRO badge
  proBadge: {
    position: 'absolute',
    top: 16,
    right: 16,
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: 'rgba(0,0,0,0.12)',
    justifyContent: 'center',
    alignItems: 'center',
  },

  // Page dots
  dots: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: 16,
    gap: 6,
  },
  dot: {
    width: 6,
    height: 6,
    borderRadius: 3,
  },
  dotActive: {
    width: 20,
    borderRadius: 4,
  },
});
