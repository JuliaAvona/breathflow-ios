import React, { useState, useEffect, useMemo } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  ScrollView,
  StyleSheet,
  ImageBackground,
  StatusBar,
  PanResponder,
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
import { MUSIC_TRACKS, startMusic, stopMusic } from '../src/utils/sessionMusic';
import type { TechniqueCategory } from '../src/types';

const TECHNIQUE_BG_IMAGES: Record<string, ReturnType<typeof require>> = {
  box:            require('../assets/bg_box.webp'),
  fourSevenEight: require('../assets/bg_478.webp'),
  physioSigh:     require('../assets/bg_physio_sigh.webp'),
  coherence:      require('../assets/bg_coherence.webp'),
  triangle:       require('../assets/bg_triangle.webp'),
  power:          require('../assets/bg_power.webp'),
  fourFourSixTwo: require('../assets/bg_four_four_six_two.webp'),
  kapalabhati:    require('../assets/bg_kapalabhati.webp'),
  twoToOne:       require('../assets/bg_two_to_one.webp'),
  cyclicSigh:     require('../assets/bg_cyclic_sigh.webp'),
};

const BG_IMAGES: Record<TechniqueCategory, ReturnType<typeof require>> = {
  calm:   require('../assets/bg_calm.webp'),
  sleep:  require('../assets/bg_sleep.webp'),
  focus:  require('../assets/bg_focus.webp'),
  energy: require('../assets/bg_energy.webp'),
};

// ─── Duration options ──────────────────────────────────────────────────────

const DURATION_OPTIONS = [
  { label: '1', value: 60 },
  { label: '3', value: 180 },
  { label: '5', value: 300 },
  { label: '7', value: 420 },
  { label: '10', value: 600 },
  { label: '15', value: 900 },
  { label: '20', value: 1200 },
];


const CATEGORY_ACCENT: Record<TechniqueCategory, string> = {
  calm:   '#7BC4A8',
  sleep:  '#7B68AE',
  focus:  '#4A90D9',
  energy: '#F5A623',
};


// ─── Component ─────────────────────────────────────────────────────────────

export default function TechniqueDetailScreen() {
  const { t } = useTranslation();
  const insets = useSafeAreaInsets();
  const { techniqueId, _dur, _music } = useLocalSearchParams<{ techniqueId: string; _dur?: string; _music?: string }>();
  const settingsStore = useSettingsStore();

  const technique = React.useMemo(() => {
    if (!techniqueId) return undefined;
    return getTechniqueById(techniqueId);
  }, [techniqueId]);

  const category = (technique?.category ?? 'calm') as TechniqueCategory;

  const accentColor = technique?.color ?? CATEGORY_ACCENT[category];
  // Default duration: try to pick a DURATION_OPTIONS entry close to technique default
  const getDefaultDuration = () => {
    return 300;
  };

  const [selectedDuration, setSelectedDuration] = useState(() => _dur ? Number(_dur) : getDefaultDuration());
  const [selectedMusic, setSelectedMusic] = useState<string | null>(_music ?? null);
  const [descExpanded, setDescExpanded] = useState(false);

  const handleMusicSelect = (trackId: string | null) => {
    setSelectedMusic(trackId);
    if (trackId) {
      startMusic(trackId, 0.4, 10);
    } else {
      stopMusic();
    }
  };

  // Auto-play music if carried from previous technique
  useEffect(() => {
    if (_music) {
      startMusic(_music, 0.4, 10);
    }
    return () => { stopMusic(); };
  }, [_music]);

  const allTechniques = TECHNIQUES;

  const currentIndex = allTechniques.findIndex(t => t.id === techniqueId);

  const swipePanResponder = useMemo(() =>
    PanResponder.create({
      onMoveShouldSetPanResponder: (_, g) =>
        Math.abs(g.dx) > 30 && Math.abs(g.dy) < 40,
      onPanResponderRelease: (_, g) => {
        if (g.dx < -50) navigateTo(currentIndex + 1);
        else if (g.dx > 50) navigateTo(currentIndex - 1);
      },
    }),
  [currentIndex]);

  const navigateTo = (index: number) => {
    const wrapped = (index + allTechniques.length) % allTechniques.length;
    router.replace({
      pathname: '/technique-detail',
      params: {
        techniqueId: allTechniques[wrapped].id,
        _dur: String(selectedDuration),
        ...(selectedMusic ? { _music: selectedMusic } : {}),
      },
    });
  };

  const handleStart = () => {
    if (!technique) return;
    router.push({
      pathname: '/session',
      params: {
        techniqueId: technique.id,
        duration: String(selectedDuration),
        ...(selectedMusic ? { musicId: selectedMusic } : {}),
      },
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
    <ImageBackground source={bgImage} style={styles.container} resizeMode="cover" {...swipePanResponder.panHandlers}>
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
        <TouchableOpacity style={styles.closeBtn} onPress={() => router.back()}>
          <Ionicons name="close" size={22} color="rgba(255,255,255,0.85)" />
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
          bright
        />
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

      {/* ── Music picker ── */}
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.musicContent}
        style={styles.musicScroll}
      >
        {/* No music option */}
        <TouchableOpacity
          style={[
            styles.musicPill,
            !selectedMusic && styles.musicPillActive,
          ]}
          onPress={() => handleMusicSelect(null)}
          activeOpacity={0.7}
        >
          <Ionicons
            name="volume-mute-outline"
            size={14}
            color={!selectedMusic ? '#000' : 'rgba(255,255,255,0.8)'}
          />
          <Text style={[styles.musicPillText, !selectedMusic && styles.musicPillTextActive]}>
            {t('techniqueDetail.noMusic')}
          </Text>
        </TouchableOpacity>

        {MUSIC_TRACKS.map((track) => {
          const isActive = selectedMusic === track.id;
          const locked = track.isPro && !settingsStore.isPro;
          return (
            <TouchableOpacity
              key={track.id}
              style={[styles.musicPill, isActive && styles.musicPillActive, locked && { opacity: 0.5 }]}
              onPress={() => locked ? router.push('/paywall') : handleMusicSelect(track.id)}
              activeOpacity={0.7}
            >
              <Ionicons
                name={locked ? 'lock-closed' : 'musical-note'}
                size={14}
                color={isActive ? '#000' : 'rgba(255,255,255,0.8)'}
              />
              <Text style={[styles.musicPillText, isActive && styles.musicPillTextActive]}>
                {track.name}
              </Text>
            </TouchableOpacity>
          );
        })}
      </ScrollView>

      {/* ── Description ── */}
      <TouchableOpacity
        style={styles.descRow}
        onPress={() => setDescExpanded(v => !v)}
        activeOpacity={0.7}
      >
        <Text style={styles.descText} numberOfLines={descExpanded ? undefined : 2}>
          {t(`techniques.${technique.id}.detail` as never, { defaultValue: t(technique.descriptionKey) })}
        </Text>
        <Ionicons
          name={descExpanded ? 'chevron-up' : 'chevron-down'}
          size={16}
          color="rgba(255,255,255,0.5)"
          style={{ marginTop: 4, alignSelf: 'center' }}
        />
      </TouchableOpacity>

      {/* ── Phase intervals ── */}
      <View style={styles.phasesRow}>
        {technique.mode === 'power' ? (
          <>
            <View style={styles.phasePill}>
              <Text style={styles.phasePillLabel}>{t('techniqueDetail.breaths')}</Text>
              <Text style={styles.phasePillValue}>{technique.breathCount}</Text>
            </View>
            <View style={styles.phasePill}>
              <Text style={styles.phasePillLabel}>{t('techniqueDetail.rounds')}</Text>
              <Text style={styles.phasePillValue}>{technique.roundCount}</Text>
            </View>
          </>
        ) : technique.mode === 'kapalabhati' ? (
          <>
            <View style={styles.phasePill}>
              <Text style={styles.phasePillLabel}>{t('techniqueDetail.sets')}</Text>
              <Text style={styles.phasePillValue}>{technique.setCount}</Text>
            </View>
            <View style={styles.phasePill}>
              <Text style={styles.phasePillLabel}>{t('techniqueDetail.duration')}</Text>
              <Text style={styles.phasePillValue}>{technique.setDuration}{t('common.sec')}</Text>
            </View>
          </>
        ) : (
          technique.phases.map((phase, i) => {
            const PHASE_KEYS: Record<string, string> = {
              breatheIn: 'techniqueDetail.inhale',
              topUpInhale: 'techniqueDetail.inhale',
              hold: 'techniqueDetail.hold',
              holdOut: 'techniqueDetail.hold',
              breatheOut: 'techniqueDetail.exhale',
            };
            const label = t(PHASE_KEYS[phase.instructionKey] ?? phase.instructionKey);
            const dur = phase.duration % 1 === 0 ? `${phase.duration}${t('common.sec')}` : `${phase.duration.toFixed(1)}${t('common.sec')}`;
            return (
              <React.Fragment key={i}>
                <View style={styles.phasePill}>
                  <Text style={styles.phasePillLabel}>{label}</Text>
                  <Text style={styles.phasePillValue}>{dur}</Text>
                </View>
              </React.Fragment>
            );
          })
        )}
      </View>

      {/* ── START button ── */}
      <View style={[styles.bottomArea, { paddingBottom: insets.bottom + 16 }]}>
        {isPro ? (
          <LinearGradient
            colors={['#9B59B6', '#7B68AE']}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 0 }}
            style={styles.startBtnGradient}
          >
            <TouchableOpacity
              style={styles.startBtn}
              onPress={() => router.push('/paywall')}
              activeOpacity={0.85}
            >
              <Ionicons name="diamond" size={18} color="#fff" style={{ marginRight: 8 }} />
              <Text style={styles.startBtnText}>{t('paywall.unlockPro')}</Text>
            </TouchableOpacity>
          </LinearGradient>
        ) : (
          <LinearGradient
            colors={[accentColor, accentColor + 'CC']}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 0 }}
            style={styles.startBtnGradient}
          >
            <TouchableOpacity style={styles.startBtn} onPress={handleStart} activeOpacity={0.85}>
              <Text style={styles.startBtnText}>{t('techniqueDetail.start')}</Text>
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
    flexGrow: 1,
    justifyContent: 'center',
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
  // Phase intervals
  phasesRow: {
    flexDirection: 'row',
    justifyContent: 'space-evenly',
    alignItems: 'center',
    paddingHorizontal: 20,
    marginTop: 1,
    marginBottom: 20,
  },
  phaseSep: {
    color: 'rgba(255,255,255,0.4)',
    fontSize: 16,
    marginHorizontal: 4,
  },
  phasePill: {
    alignItems: 'center',
    gap: 1,
  },
  phasePillLabel: {
    fontSize: 11,
    fontFamily: FONTS.medium,
    color: 'rgba(255,255,255,0.55)',
  },
  phasePillValue: {
    fontSize: 18,
    fontFamily: FONTS.heavy,
    color: '#fff',
  },

  // Music picker
  musicScroll: {
    flexGrow: 0,
    marginBottom: 16,
  },
  musicContent: {
    paddingHorizontal: 20,
    gap: 8,
  },
  musicPill: {
    flexDirection: 'row' as const,
    alignItems: 'center' as const,
    gap: 6,
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: BORDER_RADIUS.full,
    backgroundColor: 'rgba(255,255,255,0.15)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.25)',
  },
  musicPillActive: {
    backgroundColor: 'rgba(255,255,255,0.92)',
    borderColor: 'rgba(255,255,255,0.92)',
  },
  musicPillText: {
    fontSize: 13,
    fontFamily: FONTS.medium,
    color: 'rgba(255,255,255,0.85)',
  },
  musicPillTextActive: {
    color: '#000',
    fontFamily: FONTS.bold,
  },
  descRow: {
    paddingHorizontal: 28,
    marginBottom: 20,
  },
  descText: {
    fontSize: 15,
    fontFamily: FONTS.regular,
    color: 'rgba(255,255,255,0.75)',
    textAlign: 'center',
    lineHeight: 22,
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
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: 'rgba(255,255,255,0.2)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  closeBtnSpacer: {
    width: 30,
    height: 30,
    marginLeft: 8,
  },
});
