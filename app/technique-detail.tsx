import React, { useState } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  ScrollView,
  StyleSheet,
  ImageBackground,
  StatusBar,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { router, useLocalSearchParams } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useTranslation } from 'react-i18next';
import { useSettingsStore } from '../src/store';
import { getTechniqueById } from '../src/constants/techniques';
import { BreathingMandala } from '../src/components/BreathingMandala';
import { FONTS, BORDER_RADIUS, scale } from '../src/constants';
import type { TechniqueCategory } from '../src/types';

const BG_IMAGES: Record<TechniqueCategory | 'custom', ReturnType<typeof require>> = {
  calm:     require('../assets/bg_focus.jpg'),  // fallback — bg_calm not available
  sleep:    require('../assets/bg_sleep.jpg'),
  focus:    require('../assets/bg_focus.jpg'),
  energy:   require('../assets/bg_energy.jpg'),
  advanced: require('../assets/bg_advanced.jpg'),
  custom:   require('../assets/bg_focus.jpg'),
};

// ─── Duration options ──────────────────────────────────────────────────────

const DURATION_OPTIONS = [
  { label: '1 min', value: 60 },
  { label: '2 min', value: 120 },
  { label: '3 min', value: 180 },
  { label: '5 min', value: 300 },
  { label: '10 min', value: 600 },
];

// ─── Category background gradients ────────────────────────────────────────

const CATEGORY_GRADIENT: Record<TechniqueCategory | 'custom', [string, string, string]> = {
  calm:     ['#082010', '#0d3320', '#1a5c3a'],
  sleep:    ['#07101e', '#0d1a3a', '#1a2d5c'],
  focus:    ['#071018', '#0d1a30', '#1a3060'],
  energy:   ['#1e0e05', '#3a1800', '#5c2e00'],
  advanced: ['#0f0a1e', '#1a0d3a', '#2d1a5c'],
  custom:   ['#0a0a14', '#141428', '#1e1e3c'],
};

const CATEGORY_ACCENT: Record<TechniqueCategory | 'custom', string> = {
  calm:     '#7BC4A8',
  sleep:    '#7B68AE',
  focus:    '#4A90D9',
  energy:   '#F5A623',
  advanced: '#9B59B6',
  custom:   '#64748B',
};

// ─── Category chips (use-cases shown in the detail screen) ────────────────

const CATEGORY_CHIPS: Record<TechniqueCategory | 'custom', string[]> = {
  calm:     ['Stress', 'Anxiety', 'Tension', 'Worry', 'Overwhelm'],
  sleep:    ['Insomnia', 'Restlessness', 'Mind Racing', 'Tension', 'Fatigue'],
  focus:    ['Distraction', 'Brain Fog', 'Fatigue', 'Stress', 'Anxiety'],
  energy:   ['Low Energy', 'Brain Fog', 'Fatigue', 'Sluggishness', 'Sleepiness'],
  advanced: ['Stress', 'Low Energy', 'Anxiety', 'Fatigue', 'Tension'],
  custom:   ['Stress', 'Anxiety', 'Fatigue'],
};

// ─── Component ─────────────────────────────────────────────────────────────

export default function TechniqueDetailScreen() {
  const { t } = useTranslation();
  const insets = useSafeAreaInsets();
  const { techniqueId } = useLocalSearchParams<{ techniqueId: string }>();
  const settingsStore = useSettingsStore();

  const technique = React.useMemo(() => {
    if (!techniqueId) return undefined;
    const custom = settingsStore.customTechniques?.find((ct) => ct.id === techniqueId);
    return custom ?? getTechniqueById(techniqueId);
  }, [techniqueId, settingsStore.customTechniques]);

  const category = (technique?.category ?? 'calm') as TechniqueCategory | 'custom';
  const gradientColors = CATEGORY_GRADIENT[category];
  const accentColor = technique?.color ?? CATEGORY_ACCENT[category];
  const chips = CATEGORY_CHIPS[category];

  // Default duration: try to pick a DURATION_OPTIONS entry close to technique default
  const getDefaultDuration = () => {
    if (!technique) return 120;
    if (technique.defaultDuration) {
      const closest = DURATION_OPTIONS.reduce((prev, cur) =>
        Math.abs(cur.value - technique.defaultDuration!) < Math.abs(prev.value - technique.defaultDuration!) ? cur : prev
      );
      return closest.value;
    }
    return 120;
  };

  const [selectedDuration, setSelectedDuration] = useState(getDefaultDuration);
  const [selectedChip, setSelectedChip] = useState(0);

  const handleStart = () => {
    if (!technique) return;
    router.push({
      pathname: '/session',
      params: { techniqueId: technique.id, duration: String(selectedDuration) },
    });
  };

  if (!technique) {
    return (
      <View style={[styles.container, { backgroundColor: '#07101e' }]}>
        <TouchableOpacity style={[styles.backBtn, { top: insets.top + 12 }]} onPress={() => router.back()}>
          <Ionicons name="chevron-back" size={24} color="#fff" />
        </TouchableOpacity>
        <View style={styles.centerFull}>
          <Text style={styles.notFound}>{t('session.techniqueNotFound')}</Text>
        </View>
      </View>
    );
  }

  const isPro = technique.isPro && !settingsStore.isPro;
  const bgImage = BG_IMAGES[category];

  return (
    <ImageBackground source={bgImage} style={styles.container} resizeMode="cover">
      {/* Dark gradient overlay — keeps text readable */}
      <LinearGradient
        colors={[gradientColors[0] + 'E6', gradientColors[1] + 'CC', gradientColors[2] + '99']}
        style={StyleSheet.absoluteFill}
      />
      <StatusBar barStyle="light-content" />

      {/* ── Top bar ── */}
      <View style={[styles.topBar, { paddingTop: insets.top + 8 }]}>
        <TouchableOpacity style={styles.iconBtn} onPress={() => router.back()}>
          <Ionicons name="chevron-back" size={26} color="#fff" />
        </TouchableOpacity>
        <Text style={styles.topTitle} numberOfLines={1}>
          {t(technique.nameKey)}
        </Text>
        <View style={styles.iconBtn}>
          {isPro && (
            <View style={styles.proBadge}>
              <Ionicons name="diamond" size={12} color="#fff" />
              <Text style={styles.proText}>PRO</Text>
            </View>
          )}
        </View>
      </View>

      {/* ── Mandala ── */}
      <View style={styles.mandalaArea}>
        <BreathingMandala
          phase="IDLE"
          color={accentColor}
          size={scale(310)}
        />
      </View>

      {/* ── "Breathe to reduce" ── */}
      <View style={styles.subtitleRow}>
        <Text style={styles.breatheLabel}>Breathe to reduce</Text>
        <Text style={[styles.breatheTarget, { color: accentColor }]}>
          {chips[selectedChip]}
        </Text>
      </View>

      {/* ── Use-case chips ── */}
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.chipsContent}
        style={styles.chipsScroll}
      >
        {chips.map((chip, i) => (
          <TouchableOpacity
            key={chip}
            style={[
              styles.chip,
              {
                backgroundColor: i === selectedChip
                  ? 'rgba(255,255,255,0.95)'
                  : 'rgba(255,255,255,0.12)',
                borderColor: i === selectedChip
                  ? 'rgba(255,255,255,0.95)'
                  : 'rgba(255,255,255,0.2)',
              },
            ]}
            onPress={() => setSelectedChip(i)}
            activeOpacity={0.7}
          >
            <Text
              style={[
                styles.chipText,
                { color: i === selectedChip ? '#000' : 'rgba(255,255,255,0.8)' },
              ]}
            >
              {chip}
            </Text>
          </TouchableOpacity>
        ))}
      </ScrollView>

      {/* ── Duration picker ── */}
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.durationContent}
        style={styles.durationScroll}
      >
        {DURATION_OPTIONS.map((opt) => {
          const isActive = opt.value === selectedDuration;
          return (
            <TouchableOpacity
              key={opt.value}
              style={styles.durationItem}
              onPress={() => setSelectedDuration(opt.value)}
              activeOpacity={0.7}
            >
              <Text style={[styles.durationLabel, isActive ? styles.durationLabelActive : styles.durationLabelInactive]}>
                {opt.label}
              </Text>
              {isActive && <View style={[styles.durationDot, { backgroundColor: accentColor }]} />}
            </TouchableOpacity>
          );
        })}
      </ScrollView>

      {/* ── Description ── */}
      <View style={styles.descRow}>
        <Text style={styles.descText} numberOfLines={2}>
          {t(`techniques.${technique.id.replace('fourSevenEight', 'fourSevenEight').replace('physioSigh', 'physioSigh').replace('fourFourSixTwo', 'fourFourSixTwo').replace('cyclicSigh', 'cyclicSigh').replace('twoToOne', 'twoToOne').replace('kapalabhati', 'kapalabhati')}.detail` as never, { defaultValue: t(technique.descriptionKey) })}
        </Text>
      </View>

      {/* ── START button ── */}
      <View style={[styles.bottomArea, { paddingBottom: insets.bottom + 16 }]}>
        {isPro ? (
          <TouchableOpacity
            style={[styles.startBtn, { backgroundColor: 'rgba(255,255,255,0.15)' }]}
            onPress={() => router.push('/paywall')}
            activeOpacity={0.85}
          >
            <Ionicons name="diamond" size={18} color="#fff" style={{ marginRight: 8 }} />
            <Text style={styles.startBtnText}>Unlock Pro</Text>
          </TouchableOpacity>
        ) : (
          <LinearGradient
            colors={[accentColor, accentColor + 'CC']}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 0 }}
            style={styles.startBtnGradient}
          >
            <TouchableOpacity style={styles.startBtn} onPress={handleStart} activeOpacity={0.85}>
              <Text style={styles.startBtnText}>START</Text>
            </TouchableOpacity>
          </LinearGradient>
        )}
      </View>
    </ImageBackground>
  );
}

// ─── Styles ────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  topBar: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingBottom: 8,
  },
  iconBtn: {
    width: 40,
    height: 40,
    justifyContent: 'center',
    alignItems: 'center',
  },
  topTitle: {
    flex: 1,
    textAlign: 'center',
    fontSize: 18,
    fontFamily: FONTS.bold,
    color: '#fff',
    letterSpacing: -0.3,
  },
  proBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: 'rgba(155,89,182,0.8)',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: BORDER_RADIUS.full,
  },
  proText: {
    fontSize: 10,
    fontFamily: FONTS.bold,
    color: '#fff',
  },
  mandalaArea: {
    alignItems: 'center',
    justifyContent: 'center',
    flex: 1,
    marginVertical: 8,
  },
  subtitleRow: {
    alignItems: 'center',
    marginBottom: 18,
    gap: 4,
  },
  breatheLabel: {
    fontSize: 15,
    fontFamily: FONTS.medium,
    color: 'rgba(255,255,255,0.6)',
  },
  breatheTarget: {
    fontSize: 22,
    fontFamily: FONTS.heavy,
    letterSpacing: -0.5,
  },
  chipsScroll: {
    flexGrow: 0,
    marginBottom: 20,
  },
  chipsContent: {
    paddingHorizontal: 20,
    gap: 8,
    flexDirection: 'row',
  },
  chip: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: BORDER_RADIUS.full,
    borderWidth: 1,
  },
  chipText: {
    fontSize: 14,
    fontFamily: FONTS.medium,
  },
  durationScroll: {
    flexGrow: 0,
    marginBottom: 16,
  },
  durationContent: {
    paddingHorizontal: 20,
    gap: 0,
    flexDirection: 'row',
    alignItems: 'center',
  },
  durationItem: {
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 4,
    gap: 6,
  },
  durationLabel: {
    fontSize: 15,
    fontFamily: FONTS.medium,
  },
  durationLabelActive: {
    fontSize: 22,
    fontFamily: FONTS.heavy,
    color: '#fff',
  },
  durationLabelInactive: {
    color: 'rgba(255,255,255,0.4)',
  },
  durationDot: {
    width: 5,
    height: 5,
    borderRadius: 2.5,
  },
  descRow: {
    paddingHorizontal: 28,
    marginBottom: 20,
  },
  descText: {
    fontSize: 13,
    fontFamily: FONTS.regular,
    color: 'rgba(255,255,255,0.45)',
    textAlign: 'center',
    lineHeight: 19,
  },
  bottomArea: {
    paddingHorizontal: 24,
  },
  startBtnGradient: {
    borderRadius: BORDER_RADIUS.lg,
    overflow: 'hidden',
  },
  startBtn: {
    height: 56,
    borderRadius: BORDER_RADIUS.lg,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
  },
  startBtnText: {
    fontSize: 17,
    fontFamily: FONTS.heavy,
    color: '#fff',
    letterSpacing: 1.5,
  },
  centerFull: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  notFound: {
    fontSize: 16,
    fontFamily: FONTS.regular,
    color: 'rgba(255,255,255,0.7)',
  },
  backBtn: {
    position: 'absolute',
    left: 16,
    zIndex: 10,
    width: 40,
    height: 40,
    justifyContent: 'center',
    alignItems: 'center',
  },
});
