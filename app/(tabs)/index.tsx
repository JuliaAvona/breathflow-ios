import React, { useState, useEffect, useRef } from 'react';
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  StyleSheet,
  Dimensions,
  FlatList,
  Animated,
  Easing,
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
import { SPACING, BORDER_RADIUS, FONTS } from '../../src/constants';
import type { BreathingTechnique } from '../../src/types';

// ─── Layout constants ────────────────────────────────────────────────────────

const DURATION_OPTIONS = [1, 2, 3, 5, 10, 15, 20];
const { width: SCREEN_WIDTH, height: SCREEN_HEIGHT } = Dimensions.get('window');
const CARD_H_PADDING = 20;
const CARD_GAP = 12;
const CARD_WIDTH = SCREEN_WIDTH - CARD_H_PADDING * 2;
const CARD_ART_HEIGHT = CARD_WIDTH * 0.38;
const SNAP_WIDTH = CARD_WIDTH + CARD_GAP;

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

// ─── Helpers ─────────────────────────────────────────────────────────────────

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

const PHASE_LABELS: Record<string, string> = {
  breatheIn: 'In',
  breatheOut: 'Out',
  hold: 'Hold',
  holdOut: 'Hold',
  topUpInhale: 'Top-up',
};

interface PhaseStep {
  label: string;
  duration: string;
}

function getPhaseSteps(technique: BreathingTechnique): PhaseStep[] {
  if (technique.mode === 'power') {
    return [
      { label: 'Breaths', duration: `${technique.breathCount}` },
      { label: 'Rounds', duration: `${technique.roundCount}` },
    ];
  }
  if (technique.mode === 'kapalabhati') {
    return [
      { label: 'Rapid sets', duration: `${technique.setCount} × ${technique.setDuration}s` },
    ];
  }
  return technique.phases.map((p) => {
    const label = PHASE_LABELS[p.instructionKey] ?? p.instructionKey;
    return {
      label,
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
  const theme = CARD_THEMES[technique.id] ?? { bg: [technique.color + '40', technique.color], icon: 'ellipse-outline' as keyof typeof Ionicons.glyphMap };

  const handlePress = () => {
    router.push({ pathname: '/session', params: { techniqueId: technique.id } });
  };

  return (
    <TouchableOpacity
      style={styles.card}
      onPress={handlePress}
      activeOpacity={0.92}
      accessibilityLabel={t(technique.nameKey)}
      accessibilityRole="button"
    >
      {/* ── Art zone (top) — clean gradient + centered icon ── */}
      <LinearGradient
        colors={theme.bg}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={styles.cardArtZone}
      >
        <Ionicons name={theme.icon} size={52} color="rgba(255,255,255,0.35)" />

        {/* Duration pill */}
        <View style={styles.durationPillCard}>
          <Text style={styles.durationPillCardText}>
            {getDurationLabel(technique)}
          </Text>
        </View>

        {/* PRO lock */}
        {locked && (
          <View style={styles.proBadge}>
            <Ionicons name="lock-closed" size={11} color="rgba(255,255,255,0.9)" />
          </View>
        )}
      </LinearGradient>

      {/* ── Content zone (bottom) ── */}
      <View style={styles.cardContent}>
        <Text style={styles.cardName} numberOfLines={1}>
          {t(technique.nameKey)}
        </Text>
        <Text style={styles.cardDescription} numberOfLines={2}>
          {t(technique.descriptionKey)}
        </Text>

        <View style={styles.phaseSteps}>
          {getPhaseSteps(technique).map((step, i) => (
            <View key={i} style={styles.phaseStepRow}>
              <Text style={styles.phaseStepLabel}>{step.label}</Text>
              <Text style={styles.phaseStepValue}>{step.duration}</Text>
            </View>
          ))}
        </View>
      </View>
    </TouchableOpacity>
  );
}

// ─── Breathing Sphere (single orb with icon) ─────────────────────────────────

const SPHERE_SIZE = SCREEN_WIDTH * 0.36;

function BreathingSphere({ onPress, label }: { onPress: () => void; label: string }) {
  const scaleAnim = useRef(new Animated.Value(1)).current;
  const glowAnim = useRef(new Animated.Value(0.15)).current;

  useEffect(() => {
    // Gentle breathing pulse
    Animated.loop(
      Animated.sequence([
        Animated.timing(scaleAnim, { toValue: 1.06, duration: 3500, easing: Easing.inOut(Easing.sin), useNativeDriver: true }),
        Animated.timing(scaleAnim, { toValue: 1, duration: 3500, easing: Easing.inOut(Easing.sin), useNativeDriver: true }),
      ]),
    ).start();

    // Glow pulse
    Animated.loop(
      Animated.sequence([
        Animated.timing(glowAnim, { toValue: 0.3, duration: 3500, easing: Easing.inOut(Easing.sin), useNativeDriver: true }),
        Animated.timing(glowAnim, { toValue: 0.15, duration: 3500, easing: Easing.inOut(Easing.sin), useNativeDriver: true }),
      ]),
    ).start();
  }, [scaleAnim, glowAnim]);

  return (
    <TouchableOpacity onPress={onPress} activeOpacity={0.9} style={sphereStyles.wrapper}>
      {/* Outer glow */}
      <Animated.View style={[sphereStyles.glow, { opacity: glowAnim, transform: [{ scale: scaleAnim }] }]} />
      {/* Main sphere */}
      <Animated.View style={[sphereStyles.sphere, { transform: [{ scale: scaleAnim }] }]}>
        <View style={sphereStyles.solidBg}>
          {/* Breeze icon */}
          <Svg width={32} height={32} viewBox="0 0 24 24" fill="none">
            <Path d="M3 8H16C17.6569 8 19 6.65685 19 5C19 3.34315 17.6569 2 16 2C14.3431 2 13 3.34315 13 5" stroke="rgba(255,255,255,0.85)" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" />
            <Path d="M3 12H20C21.1046 12 22 11.1046 22 10C22 8.89543 21.1046 8 20 8" stroke="rgba(255,255,255,0.85)" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" />
            <Path d="M3 16H14C15.6569 16 17 17.3431 17 19C17 20.6569 15.6569 22 14 22C12.3431 22 11 20.6569 11 19" stroke="rgba(255,255,255,0.85)" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" />
          </Svg>
          <Text style={sphereStyles.label}>{label}</Text>
        </View>
      </Animated.View>
    </TouchableOpacity>
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
  label: {
    fontSize: 13,
    fontFamily: FONTS.bold,
    color: 'rgba(255,255,255,0.9)',
    marginTop: 4,
    letterSpacing: 0.2,
  },
});

// ─── HomeScreen ──────────────────────────────────────────────────────────────

const HERO_HEIGHT = SCREEN_HEIGHT * 0.52;

export default function HomeScreen() {
  const { t } = useTranslation();
  const theme = useThemeColors();
  const insets = useSafeAreaInsets();
  const isPro = useSettingsStore((s) => s.isPro);
  const stats = useSessionsStore((s) => s.stats);

  const [selectedMinutes, setSelectedMinutes] = useState(5);

  const handleQuickStart = () => {
    router.push({
      pathname: '/session',
      params: {
        techniqueId: 'coherence',
        duration: String(selectedMinutes * 60),
      },
    });
  };

  return (
    <View style={[styles.container, { backgroundColor: theme.background }]}>
      <ScrollView
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        {/* ── Hero area ── */}
        <View style={[styles.heroArea, { paddingTop: insets.top + 16 }]}>
          {/* Top bar: streak */}
          {stats.currentStreak > 0 && (
            <View style={styles.heroTopBar}>
              <View />
              <View style={styles.streakBadge}>
                <Ionicons name="flame" size={14} color="#FFFFFF" />
                <Text style={styles.streakText}>
                  {stats.currentStreak}
                </Text>
              </View>
            </View>
          )}

          {/* Sphere */}
          <View style={styles.orbWrapper}>
            <BreathingSphere onPress={handleQuickStart} label={`${selectedMinutes} min`} />
          </View>

          {/* Duration selector */}
          <View style={styles.heroControls}>
            <View style={styles.durationRow}>
              {DURATION_OPTIONS.map((min) => {
                const isActive = min === selectedMinutes;
                return (
                  <TouchableOpacity
                    key={min}
                    style={[
                      styles.durationPill,
                      isActive && [styles.durationPillActive, { backgroundColor: theme.text + '0F', borderColor: theme.text + '20' }],
                      !isActive && { borderColor: 'transparent' },
                    ]}
                    onPress={() => setSelectedMinutes(min)}
                    activeOpacity={0.7}
                  >
                    <Text
                      style={[
                        styles.durationPillText,
                        { color: isActive ? theme.text : theme.textSecondary },
                        isActive && { fontFamily: FONTS.heavy },
                      ]}
                    >
                      {min}
                    </Text>
                  </TouchableOpacity>
                );
              })}
            </View>
          </View>
        </View>

        {/* ── Section label ── */}
        <Text style={[styles.sectionLabel, { color: theme.text }]}>
          {t('home.programs')}
        </Text>

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
          scrollEventThrottle={16}
          renderItem={({ item }) => (
            <TechniqueCard
              technique={item}
              isPro={isPro}
              t={t}
            />
          )}
        />
      </ScrollView>
    </View>
  );
}

// ─── Styles ──────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  container: { flex: 1 },
  scrollContent: { paddingBottom: SPACING.xxl + SPACING.lg },

  // Hero area — edge-to-edge, no rounded corners
  heroArea: {
    height: HERO_HEIGHT,
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 28,
  },
  heroTopBar: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    width: '100%',
    paddingHorizontal: 24,
  },
  streakBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: BORDER_RADIUS.full,
    backgroundColor: '#4A90D9',
  },
  streakText: { fontSize: 14, fontFamily: FONTS.bold, color: '#FFFFFF' },

  // Orb wrapper — vertically centered in hero
  orbWrapper: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },

  // Quick start controls
  heroControls: {
    width: '100%',
    paddingHorizontal: 24,
    alignItems: 'center',
    paddingBottom: 8,
    marginTop: -8,
  },
  durationRow: {
    flexDirection: 'row',
    gap: 6,
    justifyContent: 'center',
  },
  durationPill: {
    width: 40,
    height: 36,
    borderRadius: 18,
    borderWidth: 1.5,
    borderColor: 'transparent',
    justifyContent: 'center',
    alignItems: 'center',
  },
  durationPillActive: {
    borderWidth: 1.5,
  },
  durationPillText: { fontSize: 15, fontFamily: FONTS.semibold },

  // Section label
  sectionLabel: {
    fontSize: 16,
    fontFamily: FONTS.heavy,
    letterSpacing: -0.2,
    paddingHorizontal: CARD_H_PADDING,
    marginBottom: 14,
  },

  // Carousel
  carousel: {
    paddingLeft: CARD_H_PADDING,
    paddingRight: CARD_H_PADDING,
    gap: CARD_GAP,
  },

  // Card
  card: {
    width: CARD_WIDTH,
    borderRadius: 20,
    overflow: 'hidden',
    backgroundColor: '#FFFFFF',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.06,
    shadowRadius: 8,
    elevation: 3,
  },
  cardArtZone: {
    height: CARD_ART_HEIGHT,
    overflow: 'hidden',
    justifyContent: 'center',
    alignItems: 'center',
  },
  cardContent: {
    flex: 1,
    padding: 16,
    paddingTop: 14,
  },
  cardName: {
    fontSize: 19,
    fontFamily: FONTS.heavy,
    color: '#1A1A1A',
    letterSpacing: -0.3,
    marginBottom: 3,
  },
  cardDescription: {
    fontSize: 13,
    fontFamily: FONTS.medium,
    color: '#8E8E93',
    lineHeight: 18,
    marginBottom: 10,
  },
  phaseSteps: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 4,
  },
  phaseStepRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 3,
    backgroundColor: '#F2F2F7',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 8,
  },
  phaseStepLabel: {
    fontSize: 12,
    fontFamily: FONTS.medium,
    color: '#8E8E93',
  },
  phaseStepValue: {
    fontSize: 12,
    fontFamily: FONTS.bold,
    color: '#48484A',
  },

  // Duration pill on card (overlays art zone)
  durationPillCard: {
    position: 'absolute',
    bottom: 10,
    right: 12,
    backgroundColor: 'rgba(255,255,255,0.75)',
    paddingHorizontal: 12,
    paddingVertical: 5,
    borderRadius: 12,
  },
  durationPillCardText: {
    fontSize: 12,
    fontFamily: FONTS.bold,
    color: 'rgba(0,0,0,0.6)',
  },

  // PRO badge
  proBadge: {
    position: 'absolute',
    top: 10,
    right: 12,
    width: 26,
    height: 26,
    borderRadius: 13,
    backgroundColor: 'rgba(0,0,0,0.15)',
    justifyContent: 'center',
    alignItems: 'center',
  },
});
