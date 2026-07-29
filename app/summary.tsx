import React, { useEffect, useRef, useState, useCallback } from 'react';
import {
  View,
  Text,
  Image,
  ImageBackground,
  TouchableOpacity,
  StyleSheet,
  Animated,
  ScrollView,
  Dimensions,
  AppState,
  Alert,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import { router, useLocalSearchParams } from 'expo-router';
import { useTranslation } from 'react-i18next';
import { Ionicons } from '@expo/vector-icons';
import { useSessionsStore, useSettingsStore, useBadgesStore } from '../src/store';
import { useThemeColors, useFontSize } from '../src/hooks/useColorScheme';
import { formatTotalTime } from '../src/utils/time';
import { writeMindfulSession, isHealthKitAvailable } from '../src/utils/healthKit';
import { SPACING, FONT_SIZE, BORDER_RADIUS, BADGE_DEFINITIONS, BADGE_CATEGORY_COLORS, FONTS, scale, COLORS } from '../src/constants';
import { MOOD_EMOJI_IMAGES } from '../src/constants/moodEmoji';
import { getTechniqueById } from '../src/constants/techniques';
import { BadgeUnlockModal } from '../src/components/BadgeUnlockModal';
import { getRandomQuoteKey } from '../src/constants/motivationalQuotes';
import { Mood } from '../src/types';
import { requestStoreReview } from '../src/utils/storeReview';

const SCREEN_WIDTH = Dimensions.get('window').width;
const SCREEN_HEIGHT = Dimensions.get('window').height;
const CONFETTI_COLORS = ['#4A90D9', '#7BC4A8', '#F5C542', '#7B68AE', '#E85D4A', '#5BA4C8'];
const CONFETTI_COUNT = 40;

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

const BG_IMAGES: Record<string, ReturnType<typeof require>> = {
  calm:   require('../assets/bg_calm.webp'),
  sleep:  require('../assets/bg_sleep.webp'),
  focus:  require('../assets/bg_focus.webp'),
  energy: require('../assets/bg_energy.webp'),
};

const MOOD_OPTIONS: { key: Mood; color: string; bg: string; labelKey: string }[] = [
  { key: 'sleepy', color: '#7B68AE', bg: '#7B68AE', labelKey: 'summary.moodSleepy' },
  { key: 'anxious', color: '#E85D4A', bg: '#E85D4A', labelKey: 'summary.moodAnxious' },
  { key: 'focused', color: '#F5C542', bg: '#F5C542', labelKey: 'summary.moodFocused' },
  { key: 'calm', color: '#4A90D9', bg: '#4A90D9', labelKey: 'summary.moodCalm' },
  { key: 'happy', color: '#7BC4A8', bg: '#7BC4A8', labelKey: 'summary.moodHappy' },
  { key: 'energized', color: '#F5A623', bg: '#F5A623', labelKey: 'summary.moodEnergized' },
];

function ConfettiAnimation() {
  const startXValues = useRef(
    Array.from({ length: CONFETTI_COUNT }, () => Math.random() * SCREEN_WIDTH),
  ).current;
  const pieces = useRef(
    startXValues.map((startX) => ({
      x: new Animated.Value(startX),
      y: new Animated.Value(-20 - Math.random() * 100),
      rotate: new Animated.Value(0),
      color: CONFETTI_COLORS[Math.floor(Math.random() * CONFETTI_COLORS.length)],
      size: 6 + Math.random() * 6,
      isCircle: Math.random() > 0.5,
    })),
  ).current;

  useEffect(() => {
    const animations = pieces.map((piece, idx) => {
      const duration = 2000 + Math.random() * 2000;
      const toX = startXValues[idx] + (Math.random() - 0.5) * 200;
      return Animated.parallel([
        Animated.timing(piece.y, {
          toValue: SCREEN_HEIGHT + 50,
          duration,
          useNativeDriver: true,
        }),
        Animated.timing(piece.x, {
          toValue: toX,
          duration,
          useNativeDriver: true,
        }),
        Animated.timing(piece.rotate, {
          toValue: 3 + Math.random() * 5,
          duration,
          useNativeDriver: true,
        }),
      ]);
    });

    Animated.stagger(30, animations).start();
  }, []);

  return (
    <View style={StyleSheet.absoluteFill} pointerEvents="none">
      {pieces.map((piece, i) => (
        <Animated.View
          key={i}
          style={{
            position: 'absolute',
            width: piece.size,
            height: piece.isCircle ? piece.size : piece.size * 2,
            borderRadius: piece.isCircle ? piece.size / 2 : 2,
            backgroundColor: piece.color,
            transform: [
              { translateX: piece.x },
              { translateY: piece.y },
              {
                rotate: piece.rotate.interpolate({
                  inputRange: [0, 1],
                  outputRange: ['0deg', '360deg'],
                }),
              },
            ],
          }}
        />
      ))}
    </View>
  );
}

function formatRetentionTime(seconds: number): string {
  const mins = Math.floor(seconds / 60);
  const secs = Math.round(seconds % 60);
  if (mins > 0) {
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  }
  return `${secs}s`;
}

export default function SummaryScreen() {
  const { t } = useTranslation();
  const theme = useThemeColors();
  const fontSize = useFontSize();

  const params = useLocalSearchParams<{ sessionId: string; fromOnboarding?: string; _dur?: string; _music?: string }>();

  const sessions = useSessionsStore((s) => s.sessions);
  const stats = useSessionsStore((s) => s.stats);
  const healthSyncEnabled = useSettingsStore((s) => s.healthSyncEnabled);
  const isPro = useSettingsStore((s) => s.isPro);
  const settings = useSettingsStore.getState();
  const checkAndUnlock = useBadgesStore((s) => s.checkAndUnlock);

  const healthSaved = useRef(false);
  const sessionId = params.sessionId ?? '';
  const session = sessions.find((s) => s.id === sessionId);
  const [selectedMood, setSelectedMood] = useState<Mood | null>(null);
  const [newBadgeIds, setNewBadgeIds] = useState<string[]>([]);
  const [currentBadgeIndex, setCurrentBadgeIndex] = useState(0);
  const [showBadgeModal, setShowBadgeModal] = useState(false);
  const badgeScale = useRef(new Animated.Value(0)).current;
  const badgeOpacity = useRef(new Animated.Value(0)).current;
  const [quoteKey] = useState(getRandomQuoteKey);
  const [confettiKey, setConfettiKey] = useState(0);

  const techniqueId = session?.techniqueId ?? '';
  const technique = getTechniqueById(techniqueId);
  const totalDuration = session?.totalDuration ?? 0;
  const cyclesCompleted = session?.cyclesCompleted ?? 0;
  const roundsCompleted = session?.roundsCompleted ?? 0;
  const completed = session?.completed ?? false;
  const retentionTimes = session?.retentionTimes ?? [];
  const bestRetention = session?.bestRetention ?? (retentionTimes.length > 0 ? Math.max(...retentionTimes) : 0);
  const avgRetention = retentionTimes.length > 0
    ? Math.round(retentionTimes.reduce((a, b) => a + b, 0) / retentionTimes.length)
    : 0;

  const isPowerBreathing = technique?.mode === 'power';
  const isPersonalBest = isPowerBreathing && bestRetention > 0 && bestRetention > stats.bestRetention;

  // Save to Apple Health (Mindful Minutes) — Pro-gated
  useEffect(() => {
    if (healthSaved.current || !healthSyncEnabled || !isPro || !isHealthKitAvailable() || !session) return;
    healthSaved.current = true;

    const startDate = new Date(session.startedAt);
    const endDate = new Date(session.completedAt);
    const durationMinutes = Math.ceil(session.totalDuration / 60);
    writeMindfulSession(startDate, endDate, durationMinutes);
  }, [healthSyncEnabled, isPro, session]);

  // Check badges after session is added
  useEffect(() => {
    if (!session) return;

    const unlocked = checkAndUnlock(stats, settings, sessions);
    if (unlocked.length > 0) {
      setNewBadgeIds(unlocked);
      setCurrentBadgeIndex(0);
      const timer = setTimeout(() => {
        setShowBadgeModal(true);
      }, 500);

      Animated.sequence([
        Animated.delay(400),
        Animated.parallel([
          Animated.spring(badgeScale, {
            toValue: 1,
            friction: 5,
            tension: 50,
            useNativeDriver: true,
          }),
          Animated.timing(badgeOpacity, {
            toValue: 1,
            duration: 300,
            useNativeDriver: true,
          }),
        ]),
      ]).start();

      return () => clearTimeout(timer);
    }
  }, [sessions.length, stats.totalSessions]);

  // Request App Store review after 3rd, 7th, 15th completed session.
  // 3rd: user has clearly returned (commitment signal); 7th and 15th
  // cover power users. Apple allows up to 3 prompts per year per app.
  const reviewRequested = useRef(false);
  useEffect(() => {
    if (reviewRequested.current) return;
    const total = stats.totalSessions;
    if (total === 3 || total === 7 || total === 15) {
      reviewRequested.current = true;
      const timer = setTimeout(() => {
        requestStoreReview();
      }, 2000);
      return () => clearTimeout(timer);
    }
  }, [stats.totalSessions]);

  // Replay confetti when returning from background
  useEffect(() => {
    const subscription = AppState.addEventListener('change', (nextState) => {
      if (nextState === 'active') {
        setConfettiKey((k) => k + 1);
      }
    });
    return () => {
      subscription.remove();
      setShowBadgeModal(false);
    };
  }, []);

  const handleBadgeModalClose = useCallback(() => {
    setShowBadgeModal(false);
    if (currentBadgeIndex < newBadgeIds.length - 1) {
      setTimeout(() => {
        setCurrentBadgeIndex((prev) => prev + 1);
        setShowBadgeModal(true);
      }, 300);
    } else {
      setConfettiKey((k) => k + 1);
    }
  }, [currentBadgeIndex, newBadgeIds.length]);

  const currentBadgeId = newBadgeIds[currentBadgeIndex];
  const currentBadgeDef = currentBadgeId
    ? BADGE_DEFINITIONS.find((d) => d.id === currentBadgeId)
    : null;
  const currentBadge: import('../src/types').Badge | null = currentBadgeDef
    ? {
        id: currentBadgeDef.id,
        nameKey: currentBadgeDef.nameKey,
        descriptionKey: currentBadgeDef.descriptionKey,
        icon: currentBadgeDef.icon,
        category: currentBadgeDef.category,
        condition: () => false,
        isPro: currentBadgeDef.isPro,
      }
    : null;

  const handleDone = useCallback(() => {
    setShowBadgeModal(false);
    setNewBadgeIds([]);
    router.replace('/(tabs)');
  }, []);

  const handleRepeat = useCallback(() => {
    router.replace({
      pathname: '/session',
      params: {
        techniqueId,
        ...(params._dur ? { duration: params._dur } : {}),
        ...(params._music ? { musicId: params._music } : {}),
      },
    });
  }, [techniqueId, params._dur, params._music]);

  const handleDiscard = useCallback(() => {
    Alert.alert(
      t('summary.discardTitle', { defaultValue: "Don't save this session?" }),
      t('summary.discardMessage', { defaultValue: 'This session will be removed and won’t count toward your stats or streak.' }),
      [
        { text: t('common.cancel'), style: 'cancel' },
        {
          text: t('summary.dontSave', { defaultValue: "Don't Save" }),
          style: 'destructive',
          onPress: () => {
            useSessionsStore.getState().deleteSession(sessionId);
            router.replace('/(tabs)');
          },
        },
      ],
    );
  }, [sessionId]);

  const handleMoodSelect = useCallback((mood: Mood) => {
    setSelectedMood(mood);

    // Defer store update so UI responds instantly
    setTimeout(() => {
      const { sessions: currentSessions } = useSessionsStore.getState();
      const idx = currentSessions.findIndex((s) => s.id === sessionId);
      if (idx !== -1) {
        const updated = { ...currentSessions[idx], moodAfter: mood };
        const newSessions = [...currentSessions];
        newSessions[idx] = updated;
        useSessionsStore.setState({ sessions: newSessions });
      }
    }, 0);
  }, [sessionId]);

  // Max retention bar width calculation
  const maxRetention = retentionTimes.length > 0 ? Math.max(...retentionTimes) : 1;

  const glassCard = {
    backgroundColor: theme.isDark ? 'rgba(255,255,255,0.08)' : 'rgba(0,0,0,0.06)',
    borderRadius: 22,
    borderWidth: 1,
    borderColor: theme.isDark ? 'rgba(255,255,255,0.12)' : 'rgba(0,0,0,0.08)',
    padding: 18,
    marginBottom: 14,
    width: '100%' as const,
    shadowColor: 'rgba(0,0,0,0.1)',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.15,
    shadowRadius: 24,
  };

  const techniqueColor = technique?.color ?? '#4A90D9';
  const bgImage = technique
    ? (TECHNIQUE_BG_IMAGES[technique.id] ?? BG_IMAGES[technique.category] ?? BG_IMAGES.calm)
    : BG_IMAGES.calm;

  if (!session) {
    return (
      <View style={styles.container}>
        <LinearGradient
          colors={[techniqueColor, theme.isDark ? '#0F1419' : '#F0F4F8']}
          locations={[0, 0.5]}
          style={StyleSheet.absoluteFill}
        />
        <SafeAreaView style={{ flex: 1, justifyContent: 'center', alignItems: 'center', padding: SPACING.lg }}>
          <Text style={[styles.title, { color: '#FFFFFF' }]}>{t('summary.sessionNotFound')}</Text>
          <TouchableOpacity style={[styles.doneButton, { backgroundColor: techniqueColor }]} onPress={handleDone}>
            <Text style={styles.doneButtonText}>{t('summary.goBack')}</Text>
          </TouchableOpacity>
        </SafeAreaView>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <ImageBackground source={bgImage} resizeMode="cover" style={StyleSheet.absoluteFill}>
        <LinearGradient
          colors={[`${techniqueColor}D9`, 'rgba(0,0,0,0.82)', theme.isDark ? '#0F1419' : '#F0F4F8']}
          locations={[0, 0.35, 0.75]}
          style={StyleSheet.absoluteFill}
        />
      </ImageBackground>

      {(isPersonalBest || completed) && <ConfettiAnimation key={confettiKey} />}

      <SafeAreaView style={{ flex: 1 }}>
        <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
          {/* Header — icon, title, technique name */}
          <View style={styles.headerSection}>
            {technique && (
              <View style={[styles.techniqueIconCircle, {
                shadowColor: technique?.color ?? '#4A90D9',
                shadowOpacity: 0.5,
                shadowRadius: 20,
                shadowOffset: { width: 0, height: 0 },
              }]}>
                <Ionicons name={technique.icon as never} size={34} color="#FFFFFF" />
              </View>
            )}
            <Text style={styles.headerTitle}>
              {completed ? t('summary.sessionComplete') : t('summary.sessionEnded')}
            </Text>
            <Text style={styles.headerSubtitle}>
              {technique ? t(technique.nameKey) : techniqueId}
            </Text>
          </View>

          {/* Stats row — glass card */}
          <View style={[styles.statsRow, glassCard]}>
            <View style={styles.statItem}>
              <Text style={[styles.statValue, { color: techniqueColor }]}>
                {formatTotalTime(totalDuration)}
              </Text>
              <Text style={[styles.statLabel, { color: theme.textSecondary }]}>
                {t('summary.duration')}
              </Text>
            </View>

            <View style={[styles.statDivider, { backgroundColor: theme.isDark ? 'rgba(255,255,255,0.15)' : 'rgba(0,0,0,0.1)' }]} />

            <View style={styles.statItem}>
              <Text style={[styles.statValue, { color: '#7BC4A8' }]}>
                {isPowerBreathing ? roundsCompleted : cyclesCompleted}
              </Text>
              <Text style={[styles.statLabel, { color: theme.textSecondary }]}>
                {isPowerBreathing ? t('summary.rounds') : t('summary.cycles')}
              </Text>
            </View>

            <View style={[styles.statDivider, { backgroundColor: theme.isDark ? 'rgba(255,255,255,0.15)' : 'rgba(0,0,0,0.1)' }]} />

            <View style={styles.statItem}>
              <Text style={[styles.statValue, { color: '#F5A623' }]}>
                {stats.currentStreak}
              </Text>
              <Text style={[styles.statLabel, { color: theme.textSecondary }]}>
                {t('summary.dayStreak')}
              </Text>
            </View>
          </View>

          {/* Power Breathing retention details — glass card */}
          {isPowerBreathing && retentionTimes.length > 0 && (
            <View style={[styles.retentionSection, glassCard]}>
              <Text style={[styles.retentionTitle, { fontSize: fontSize.md }]}>
                {t('summary.retentionTimes')}
              </Text>

              {retentionTimes.map((time, index) => (
                <View key={index} style={styles.retentionRow}>
                  <Text style={[styles.retentionRoundLabel, { fontSize: fontSize.sm }]}>
                    {t('summary.round', { number: index + 1 })}
                  </Text>
                  <View style={styles.retentionBarContainer}>
                    <View
                      style={[
                        styles.retentionBar,
                        {
                          width: `${(time / maxRetention) * 100}%`,
                          backgroundColor: time === bestRetention ? 'rgba(255,255,255,0.9)' : 'rgba(255,255,255,0.5)',
                        },
                      ]}
                    />
                  </View>
                  <Text style={[styles.retentionTimeText, { fontSize: fontSize.sm }]}>
                    {formatRetentionTime(time)}
                  </Text>
                </View>
              ))}

              <View style={styles.retentionSummary}>
                <View style={styles.retentionSummaryItem}>
                  <Text style={[styles.retentionSummaryLabel, { fontSize: fontSize.xs }]}>
                    {t('summary.bestRetention')}
                  </Text>
                  <Text style={[styles.retentionSummaryValue, { fontSize: fontSize.md }]}>
                    {formatRetentionTime(bestRetention)}
                  </Text>
                  {isPersonalBest && (
                    <Text style={[styles.personalBestBadge, { color: '#F5C542' }]}>
                      {t('summary.personalBest')}
                    </Text>
                  )}
                </View>
                <View style={styles.retentionSummaryItem}>
                  <Text style={[styles.retentionSummaryLabel, { fontSize: fontSize.xs }]}>
                    {t('summary.avgRetention')}
                  </Text>
                  <Text style={[styles.retentionSummaryValue, { fontSize: fontSize.md }]}>
                    {formatRetentionTime(avgRetention)}
                  </Text>
                </View>
              </View>
            </View>
          )}

          {/* Mood check — glass card */}
          <View style={[styles.moodSection, glassCard, { marginTop: SPACING.xs }]}>
            <Text style={[styles.moodTitle, { fontSize: fontSize.md, color: theme.text }]}>
              {t('summary.howDoYouFeel')}
            </Text>
            <View style={styles.moodRow}>
              {MOOD_OPTIONS.map((mood) => (
                <TouchableOpacity
                  key={mood.key}
                  style={[
                    styles.moodButton,
                    {
                      backgroundColor: selectedMood === mood.key ? 'rgba(255,255,255,0.25)' : 'transparent',
                      borderColor: selectedMood === mood.key ? 'rgba(255,255,255,0.4)' : 'transparent',
                      transform: [{ scale: selectedMood === mood.key ? 1.2 : 1 }],
                      opacity: selectedMood && selectedMood !== mood.key ? 0.6 : 1,
                    },
                  ]}
                  onPress={() => handleMoodSelect(mood.key)}
                  activeOpacity={0.7}
                >
                  <Image source={MOOD_EMOJI_IMAGES[mood.key]} style={styles.moodEmoji} resizeMode="contain" />
                </TouchableOpacity>
              ))}
            </View>
          </View>

          {/* New badges — glass card */}
          {newBadgeIds.length > 0 && (
            <Animated.View
              style={[
                styles.newBadgesContainer,
                glassCard,
                {
                  transform: [{ scale: badgeScale }],
                  opacity: badgeOpacity,
                },
              ]}
            >
              <View style={styles.newBadgeIconContainer}>
                <Ionicons name="ribbon" size={24} color="#FFFFFF" />
              </View>
              <Text style={styles.newBadgeTitle}>
                {t('summary.newBadge')}
              </Text>
              <View style={styles.badgeRevealRow}>
                {newBadgeIds.map((id) => {
                  const def = BADGE_DEFINITIONS.find((d) => d.id === id);
                  if (!def) return null;
                  const catColor = BADGE_CATEGORY_COLORS[def.category as keyof typeof BADGE_CATEGORY_COLORS];

                  return (
                    <View key={id} style={styles.badgeRevealItem}>
                      <View
                        style={[
                          styles.badgeRevealCircle,
                          {
                            backgroundColor: 'rgba(255,255,255,0.15)',
                            borderColor: 'rgba(255,255,255,0.3)',
                          },
                        ]}
                      >
                        <Ionicons
                          name={def.icon as keyof typeof Ionicons.glyphMap}
                          size={24}
                          color={catColor.color}
                        />
                      </View>
                      <Text
                        style={styles.badgeRevealName}
                        numberOfLines={2}
                      >
                        {t(def.nameKey)}
                      </Text>
                      <Text
                        style={styles.badgeRevealDesc}
                        numberOfLines={3}
                      >
                        {t(def.descriptionKey)}
                      </Text>
                    </View>
                  );
                })}
              </View>
            </Animated.View>
          )}

          {/* Health sync note */}
          {healthSyncEnabled && isHealthKitAvailable() && (
            <Text style={[styles.healthNote, { color: theme.textSecondary }]}>
              {t('summary.savedToHealth')}
            </Text>
          )}

          {/* Motivational quote — floating text */}
          <Text style={[styles.motivationalQuote, { fontSize: fontSize.sm, color: theme.textSecondary }]}>
            {t(quoteKey)}
          </Text>

          {/* Bottom buttons */}
          <View style={styles.bottomButtons}>
            <View style={styles.bottomRow}>
              {!completed && (
                <TouchableOpacity
                  style={[styles.discardButton, {
                    backgroundColor: theme.isDark ? `${COLORS.error}1A` : `${COLORS.error}12`,
                    borderColor: theme.isDark ? `${COLORS.error}55` : `${COLORS.error}40`,
                  }]}
                  onPress={handleDiscard}
                  activeOpacity={0.7}
                >
                  <Ionicons name="trash-outline" size={18} color={COLORS.error} />
                  <Text style={[styles.discardButtonText, { color: COLORS.error, fontSize: fontSize.md }]}>
                    {t('summary.dontSave', { defaultValue: "Don't Save" })}
                  </Text>
                </TouchableOpacity>
              )}

              <TouchableOpacity
                style={[styles.repeatButton, !completed && { flex: 1 }, {
                  backgroundColor: theme.isDark ? `${techniqueColor}14` : `${techniqueColor}14`,
                  borderColor: theme.isDark ? 'rgba(255,255,255,0.25)' : 'rgba(0,0,0,0.15)',
                }]}
                onPress={handleRepeat}
                activeOpacity={0.7}
              >
                <Ionicons name="repeat-outline" size={18} color={theme.text} />
                <Text style={[styles.repeatButtonText, { color: theme.text, fontSize: fontSize.md }]}>
                  {t('summary.repeat')}
                </Text>
              </TouchableOpacity>
            </View>

            <TouchableOpacity
              style={[styles.doneButton, {
                backgroundColor: techniqueColor,
                shadowColor: techniqueColor,
                shadowOpacity: 0.4,
                shadowRadius: 16,
                shadowOffset: { width: 0, height: 4 },
              }]}
              onPress={handleDone}
              activeOpacity={0.8}
            >
              <Text style={[styles.doneButtonText, { fontSize: fontSize.lg }]}>{t('summary.done')}</Text>
            </TouchableOpacity>
          </View>
        </ScrollView>
      </SafeAreaView>

      <BadgeUnlockModal
        badge={currentBadge}
        visible={showBadgeModal}
        onClose={handleBadgeModalClose}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  content: {
    flexGrow: 1,
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: SPACING.lg,
    paddingTop: SPACING.sm,
    paddingBottom: SPACING.lg,
  },

  // Header section (no gradient block, just content)
  headerSection: {
    alignItems: 'center',
    marginBottom: SPACING.md,
    paddingTop: SPACING.xs,
  },
  techniqueIconCircle: {
    width: scale(70),
    height: scale(70),
    borderRadius: scale(35),
    backgroundColor: 'rgba(255,255,255,0.15)',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: SPACING.xs,
  },
  headerTitle: {
    fontSize: 30,
    fontFamily: FONTS.heavy,
    color: '#FFFFFF',
    marginBottom: 6,
    textAlign: 'center',
  },
  headerSubtitle: {
    fontSize: FONT_SIZE.md,
    fontFamily: FONTS.medium,
    color: 'rgba(255,255,255,0.8)',
    textAlign: 'center',
  },
  // Legacy aliases kept for the "not found" state
  title: {
    fontSize: FONT_SIZE.xxl,
    fontFamily: FONTS.bold,
    marginBottom: 4,
    textAlign: 'center',
  },

  // Stats row (layout inside glass card)
  statsRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  statItem: {
    flex: 1,
    alignItems: 'center',
  },
  statDivider: {
    width: 1,
    height: 32,
    backgroundColor: 'rgba(255,255,255,0.15)',
  },
  statValue: {
    fontSize: 26,
    fontFamily: FONTS.heavy,
    color: '#FFFFFF',
    marginBottom: 2,
  },
  statLabel: {
    fontSize: FONT_SIZE.xs,
    fontFamily: FONTS.regular,
    color: 'rgba(255,255,255,0.6)',
  },

  // Power Breathing retention section (layout inside glass card)
  retentionSection: {
    // width and padding come from glassCard
  },
  retentionTitle: {
    fontSize: FONT_SIZE.md,
    fontFamily: FONTS.bold,
    color: '#FFFFFF',
    marginBottom: SPACING.sm,
  },
  retentionRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: SPACING.xs,
  },
  retentionRoundLabel: {
    width: scale(60),
    fontSize: FONT_SIZE.sm,
    color: 'rgba(255,255,255,0.6)',
  },
  retentionBarContainer: {
    flex: 1,
    height: scale(16),
    backgroundColor: 'rgba(255,255,255,0.1)',
    borderRadius: BORDER_RADIUS.sm,
    marginHorizontal: SPACING.xs,
    overflow: 'hidden',
  },
  retentionBar: {
    height: '100%',
    borderRadius: BORDER_RADIUS.sm,
    minWidth: 4,
  },
  retentionTimeText: {
    width: scale(48),
    textAlign: 'right',
    fontFamily: FONTS.semibold,
    fontSize: FONT_SIZE.sm,
    color: '#FFFFFF',
  },
  retentionSummary: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    marginTop: SPACING.sm,
    paddingTop: SPACING.sm,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: 'rgba(255,255,255,0.15)',
  },
  retentionSummaryItem: {
    alignItems: 'center',
  },
  retentionSummaryLabel: {
    fontSize: FONT_SIZE.xs,
    color: 'rgba(255,255,255,0.6)',
    marginBottom: 2,
  },
  retentionSummaryValue: {
    fontSize: FONT_SIZE.md,
    fontFamily: FONTS.heavy,
    color: '#FFFFFF',
  },
  personalBestBadge: {
    fontSize: FONT_SIZE.xs,
    fontFamily: FONTS.bold,
    marginTop: 2,
  },

  // Mood section (layout inside glass card)
  moodSection: {
    alignItems: 'center',
  },
  moodTitle: {
    fontSize: FONT_SIZE.md,
    fontFamily: FONTS.semibold,
    color: '#FFFFFF',
    marginBottom: SPACING.sm,
  },
  moodRow: {
    flexDirection: 'row',
    justifyContent: 'center',
    gap: 8,
  },
  moodButton: {
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 14,
    borderWidth: 1.5,
    width: 42,
    height: 42,
  },
  moodEmoji: {
    width: 28,
    height: 28,
  },

  // Badges (layout inside glass card)
  newBadgesContainer: {
    alignItems: 'center',
  },
  newBadgeIconContainer: {
    marginBottom: 4,
  },
  newBadgeTitle: {
    fontSize: FONT_SIZE.md,
    fontFamily: FONTS.bold,
    color: '#FFFFFF',
    marginBottom: SPACING.sm,
    textAlign: 'center',
  },
  badgeRevealRow: {
    flexDirection: 'row',
    justifyContent: 'center',
    gap: SPACING.lg,
    flexWrap: 'wrap',
  },
  badgeRevealItem: {
    alignItems: 'center',
    width: scale(120),
  },
  badgeRevealCircle: {
    width: scale(48),
    height: scale(48),
    borderRadius: scale(24),
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1.5,
    marginBottom: SPACING.xs,
  },
  badgeRevealName: {
    fontSize: FONT_SIZE.sm,
    fontFamily: FONTS.bold,
    textAlign: 'center',
    color: '#FFFFFF',
    marginBottom: 2,
  },
  badgeRevealDesc: {
    fontSize: FONT_SIZE.xs,
    fontFamily: FONTS.regular,
    textAlign: 'center',
    lineHeight: 16,
    color: 'rgba(255,255,255,0.6)',
  },

  // Health note
  healthNote: {
    fontSize: FONT_SIZE.sm,
    color: 'rgba(255,255,255,0.6)',
    marginTop: SPACING.sm,
  },

  // Quote — floating, no card
  motivationalQuote: {
    fontSize: FONT_SIZE.sm,
    fontStyle: 'italic',
    textAlign: 'center',
    paddingHorizontal: SPACING.xl,
    marginTop: SPACING.md,
    marginBottom: SPACING.md,
    color: 'rgba(255,255,255,0.5)',
  },

  // Bottom buttons
  bottomButtons: {
    width: '100%',
    paddingTop: SPACING.xl,
    paddingBottom: SPACING.lg,
  },
  bottomRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: SPACING.md,
    marginBottom: SPACING.lg,
  },
  discardButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: SPACING.sm,
    paddingHorizontal: SPACING.md,
    borderRadius: BORDER_RADIUS.xl,
    borderWidth: 1.5,
    gap: SPACING.xs,
  },
  discardButtonText: {
    fontSize: FONT_SIZE.md,
    fontFamily: FONTS.semibold,
  },
  repeatButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: SPACING.sm,
    paddingHorizontal: SPACING.lg,
    borderRadius: BORDER_RADIUS.xl,
    borderWidth: 1.5,
    gap: SPACING.xs,
  },
  repeatButtonText: {
    fontSize: FONT_SIZE.md,
    fontFamily: FONTS.semibold,
  },
  doneButton: {
    height: 50,
    justifyContent: 'center',
    borderRadius: 18,
    alignItems: 'center',
    shadowColor: 'rgba(0,0,0,0.3)',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 12,
  },
  doneButtonText: {
    color: '#FFFFFF',
    fontSize: FONT_SIZE.lg,
    fontFamily: FONTS.bold,
  },
});
