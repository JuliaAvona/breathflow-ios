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
const CARD_HEIGHT = CARD_ART_HEIGHT + 130; // art + content area
const SNAP_WIDTH = CARD_WIDTH + CARD_GAP;

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
      activeOpacity={0.92}
      accessibilityLabel={t(technique.nameKey)}
      accessibilityRole="button"
    >
      {/* ── Art zone (top) ── */}
      <LinearGradient
        colors={art.bg}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={styles.cardArtZone}
      >
        {art.shapes.map((shape, i) => {
          const sw = CARD_WIDTH * shape.w;
          const sh = CARD_ART_HEIGHT * shape.h;
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
                top: CARD_ART_HEIGHT * shape.y,
                transform: shape.rotate ? [{ rotate: shape.rotate }] : [],
              }}
            />
          );
        })}

        {/* Duration pill overlaying art */}
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
              <Ionicons name={step.icon} size={14} color="rgba(0,0,0,0.3)" />
              <Text style={styles.phaseStepLabel}>{step.label}:</Text>
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

function BreathingSphere({ onPress }: { onPress: () => void }) {
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
        <LinearGradient
          colors={['#A8D8F0', '#4A90D9', '#3A73B0']}
          start={{ x: 0.3, y: 0 }}
          end={{ x: 0.7, y: 1 }}
          style={sphereStyles.gradient}
        >
          {/* Highlight */}
          <View style={sphereStyles.highlight} />
          {/* Breeze icon */}
          <Svg width={40} height={40} viewBox="0 0 24 24" fill="none">
            <Path d="M3 8H16C17.6569 8 19 6.65685 19 5C19 3.34315 17.6569 2 16 2C14.3431 2 13 3.34315 13 5" stroke="rgba(255,255,255,0.85)" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" />
            <Path d="M3 12H20C21.1046 12 22 11.1046 22 10C22 8.89543 21.1046 8 20 8" stroke="rgba(255,255,255,0.85)" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" />
            <Path d="M3 16H14C15.6569 16 17 17.3431 17 19C17 20.6569 15.6569 22 14 22C12.3431 22 11 20.6569 11 19" stroke="rgba(255,255,255,0.85)" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" />
          </Svg>
        </LinearGradient>
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
  gradient: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  highlight: {
    position: 'absolute',
    top: SPHERE_SIZE * 0.08,
    left: SPHERE_SIZE * 0.15,
    width: SPHERE_SIZE * 0.35,
    height: SPHERE_SIZE * 0.2,
    borderRadius: SPHERE_SIZE * 0.15,
    backgroundColor: 'rgba(255,255,255,0.2)',
    transform: [{ rotate: '-15deg' }],
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
              <View style={[styles.streakBadge, { backgroundColor: theme.surface }]}>
                <Ionicons name="flame" size={13} color="#FF9500" />
                <Text style={[styles.streakText, { color: theme.text }]}>
                  {stats.currentStreak}
                </Text>
              </View>
            </View>
          )}

          {/* Sphere */}
          <View style={styles.orbWrapper}>
            <BreathingSphere onPress={handleQuickStart} />
          </View>

          {/* Quick start controls */}
          <View style={styles.heroControls}>
            <TouchableOpacity
              style={[styles.breatheButton, { shadowColor: '#4A90D9' }]}
              onPress={handleQuickStart}
              activeOpacity={0.85}
            >
              <Text style={styles.breatheButtonText}>
                {t('home.breathe')} · {selectedMinutes} min
              </Text>
            </TouchableOpacity>

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
                        { color: isActive ? theme.text : theme.textSecondary + '90' },
                        isActive && { fontFamily: FONTS.bold },
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
  },
  streakText: { fontSize: 14, fontFamily: FONTS.bold },

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
  },
  breatheButton: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 15,
    borderRadius: BORDER_RADIUS.full,
    backgroundColor: '#4A90D9',
    width: '100%',
    marginBottom: 14,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.25,
    shadowRadius: 12,
    elevation: 6,
  },
  breatheButtonText: {
    fontSize: 18,
    fontFamily: FONTS.heavy,
    color: '#FFFFFF',
    letterSpacing: 0.2,
  },
  durationRow: {
    flexDirection: 'row',
    gap: 4,
    justifyContent: 'center',
  },
  durationPill: {
    width: 38,
    height: 34,
    borderRadius: 17,
    borderWidth: 1.5,
    borderColor: 'transparent',
    justifyContent: 'center',
    alignItems: 'center',
  },
  durationPillActive: {
    borderWidth: 1.5,
  },
  durationPillText: { fontSize: 14, fontFamily: FONTS.bold },

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
    height: CARD_HEIGHT,
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
    gap: 4,
    backgroundColor: '#F2F2F7',
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 10,
  },
  phaseStepLabel: {
    fontSize: 13,
    fontFamily: FONTS.semibold,
    color: '#636366',
  },
  phaseStepValue: {
    fontSize: 13,
    fontFamily: FONTS.heavy,
    color: '#3A3A3C',
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
