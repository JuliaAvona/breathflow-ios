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
import { getTechniqueById, TECHNIQUES } from '../src/constants/techniques';
import { BreathingMandala } from '../src/components/BreathingMandala';
import { FONTS, BORDER_RADIUS, scale } from '../src/constants';
import type { TechniqueCategory } from '../src/types';

const TECHNIQUE_BG_IMAGES: Record<string, ReturnType<typeof require>> = {
  box:            require('../assets/bg_box.jpg'),
  fourSevenEight: require('../assets/bg_478.jpg'),
  physioSigh:     require('../assets/bg_physio_sigh.jpg'),
  coherence:      require('../assets/bg_coherence.jpg'),
  triangle:       require('../assets/bg_triangle.jpg'),
  power:          require('../assets/bg_power.jpg'),
  fourFourSixTwo: require('../assets/bg_four_four_six_two.jpg'),
  kapalabhati:    require('../assets/bg_kapalabhati.jpg'),
  twoToOne:       require('../assets/bg_two_to_one.jpg'),
  cyclicSigh:     require('../assets/bg_cyclic_sigh.jpg'),
};

const BG_IMAGES: Record<TechniqueCategory, ReturnType<typeof require>> = {
  calm:   require('../assets/bg_calm.jpg'),
  sleep:  require('../assets/bg_sleep.jpg'),
  focus:  require('../assets/bg_focus.jpg'),
  energy: require('../assets/bg_energy.jpg'),
};

// ─── Duration options ──────────────────────────────────────────────────────

const DURATION_OPTIONS = [
  { label: '1 min', value: 60 },
  { label: '3 min', value: 180 },
  { label: '5 min', value: 300 },
  { label: '7 min', value: 420 },
  { label: '10 min', value: 600 },
];


const CATEGORY_ACCENT: Record<TechniqueCategory, string> = {
  calm:   '#7BC4A8',
  sleep:  '#7B68AE',
  focus:  '#4A90D9',
  energy: '#F5A623',
};

// ─── Category chips (use-cases shown in the detail screen) ────────────────

const CATEGORY_CHIPS: Record<TechniqueCategory, string[]> = {
  calm:   ['Stress', 'Anxiety', 'Tension'],
  sleep:  ['Insomnia', 'Mind Racing', 'Restlessness'],
  focus:  ['Distraction', 'Brain Fog', 'Fatigue'],
  energy: ['Low Energy', 'Brain Fog', 'Fatigue'],
};

// ─── Component ─────────────────────────────────────────────────────────────

export default function TechniqueDetailScreen() {
  const { t } = useTranslation();
  const insets = useSafeAreaInsets();
  const { techniqueId } = useLocalSearchParams<{ techniqueId: string }>();
  const settingsStore = useSettingsStore();

  const technique = React.useMemo(() => {
    if (!techniqueId) return undefined;
    return getTechniqueById(techniqueId);
  }, [techniqueId]);

  const category = (technique?.category ?? 'calm') as TechniqueCategory;

  const accentColor = technique?.color ?? CATEGORY_ACCENT[category];
  const chips = CATEGORY_CHIPS[category];

  // Default duration: try to pick a DURATION_OPTIONS entry close to technique default
  const getDefaultDuration = () => {
    return 300;
  };

  const [selectedDuration, setSelectedDuration] = useState(getDefaultDuration);
  const [selectedChip, setSelectedChip] = useState(0);

  const allTechniques = TECHNIQUES;

  const currentIndex = allTechniques.findIndex(t => t.id === techniqueId);

  const navigateTo = (index: number) => {
    const wrapped = (index + allTechniques.length) % allTechniques.length;
    router.replace({ pathname: '/technique-detail', params: { techniqueId: allTechniques[wrapped].id } });
  };

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
  const bgImage = TECHNIQUE_BG_IMAGES[technique.id] ?? BG_IMAGES[category];

  return (
    <ImageBackground source={bgImage} style={styles.container} resizeMode="cover">
      {/* Vignette overlay: dark at top/bottom, transparent in mandala zone */}
      <LinearGradient
        colors={['#000000DD', '#00000055', '#00000022', '#000000BB', '#000000EE']}
        locations={[0, 0.2, 0.45, 0.72, 1]}
        style={StyleSheet.absoluteFill}
      />
      <StatusBar barStyle="light-content" />

      {/* ── Top bar: [spacer] [center: title + PRO] [close] ── */}
      <View style={[styles.topBar, { paddingTop: insets.top + 8 }]}>
        <View style={styles.topBarSide} />
        <View style={styles.topTitleRow}>
          <Text style={styles.topTitle} numberOfLines={1}>
            {t(technique.nameKey)}
          </Text>
          {isPro && (
            <View style={[styles.proBadge, { marginLeft: 6 }]}>
              <Ionicons name="diamond" size={12} color="#fff" />
              <Text style={styles.proText}>PRO</Text>
            </View>
          )}
        </View>
        <TouchableOpacity style={styles.topBarSide} onPress={() => router.back()}>
          <Ionicons name="close" size={18} color="rgba(255,255,255,0.6)" />
        </TouchableOpacity>
      </View>

      {/* ── Side nav arrows (vertically centered) ── */}
      <TouchableOpacity style={styles.navArrowLeft} onPress={() => navigateTo(currentIndex - 1)}>
        <Ionicons name="chevron-back" size={28} color="rgba(255,255,255,0.55)" />
      </TouchableOpacity>
      <TouchableOpacity style={styles.navArrowRight} onPress={() => navigateTo(currentIndex + 1)}>
        <Ionicons name="chevron-forward" size={28} color="rgba(255,255,255,0.55)" />
      </TouchableOpacity>

      {/* ── Mandala ── */}
      <View style={styles.mandalaArea}>
        <BreathingMandala
          phase="IDLE"
          color={accentColor}
          size={scale(310)}
        />
      </View>

      {/* ── Use-case chips ── */}
      <View style={styles.chipsRow}>
        {chips.map((chip, i) => (
          <TouchableOpacity
            key={chip}
            style={[
              styles.chip,
              {
                backgroundColor: i === selectedChip
                  ? 'rgba(255,255,255,0.95)'
                  : 'rgba(255,255,255,0.18)',
                borderColor: i === selectedChip
                  ? 'rgba(255,255,255,0.95)'
                  : 'rgba(255,255,255,0.35)',
              },
            ]}
            onPress={() => setSelectedChip(i)}
            activeOpacity={0.7}
          >
            <Text
              style={[
                styles.chipText,
                { color: i === selectedChip ? '#000' : 'rgba(255,255,255,0.95)' },
              ]}
            >
              {chip}
            </Text>
          </TouchableOpacity>
        ))}
      </View>

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
        <Text style={styles.descText}>
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
  topBarSide: {
    width: 44,
    alignItems: 'center',
    justifyContent: 'center',
  },
  topTitleRow: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
  },
  navArrow: {
    padding: 6,
  },
  navArrowLeft: {
    position: 'absolute',
    left: 8,
    top: '50%',
    zIndex: 10,
    padding: 8,
  },
  navArrowRight: {
    position: 'absolute',
    right: 8,
    top: '50%',
    zIndex: 10,
    padding: 8,
  },
  topTitle: {
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
  chipsRow: {
    flexDirection: 'row',
    justifyContent: 'center',
    gap: 8,
    marginBottom: 20,
    paddingHorizontal: 20,
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
    color: 'rgba(255,255,255,0.65)',
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
    color: 'rgba(255,255,255,0.70)',
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
  closeBtn: {
    width: 30,
    height: 30,
    borderRadius: 15,
    backgroundColor: 'rgba(255,255,255,0.15)',
    justifyContent: 'center',
    alignItems: 'center',
    marginLeft: 8,
  },
  closeBtnSpacer: {
    width: 30,
    height: 30,
    marginLeft: 8,
  },
});
