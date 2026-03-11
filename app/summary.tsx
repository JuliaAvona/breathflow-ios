import React, { useEffect, useRef, useState, useCallback } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  Animated,
  ScrollView,
  Dimensions,
  AppState,
  Share,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { router, useLocalSearchParams } from 'expo-router';
import { useTranslation } from 'react-i18next';
import { Ionicons } from '@expo/vector-icons';
import { useSessionsStore, useSettingsStore, useBadgesStore } from '../src/store';
import { useThemeColors, useFontSize } from '../src/hooks/useColorScheme';
import { formatTotalTime } from '../src/utils/time';
import { writeMindfulSession, isHealthKitAvailable } from '../src/utils/healthKit';
import { COLORS, SPACING, FONT_SIZE, BORDER_RADIUS, BADGE_DEFINITIONS, BADGE_CATEGORY_COLORS, FONTS, scale } from '../src/constants';
import { getTechniqueById } from '../src/constants/techniques';
import { BadgeUnlockModal } from '../src/components/BadgeUnlockModal';
import { getRandomQuoteKey } from '../src/constants/motivationalQuotes';
import { Mood } from '../src/types';

const SCREEN_WIDTH = Dimensions.get('window').width;
const SCREEN_HEIGHT = Dimensions.get('window').height;
const CONFETTI_COLORS = ['#4A90D9', '#7BC4A8', '#F5C542', '#7B68AE', '#E85D4A', '#5BA4C8'];
const CONFETTI_COUNT = 40;

const MOOD_OPTIONS: { key: Mood; emoji: string; labelKey: string }[] = [
  { key: 'calm', emoji: '\u{1F60C}', labelKey: 'summary.moodCalm' },
  { key: 'energized', emoji: '\u{26A1}', labelKey: 'summary.moodEnergized' },
  { key: 'focused', emoji: '\u{1F3AF}', labelKey: 'summary.moodFocused' },
  { key: 'sleepy', emoji: '\u{1F634}', labelKey: 'summary.moodSleepy' },
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

  const params = useLocalSearchParams<{ sessionId: string }>();

  const sessions = useSessionsStore((s) => s.sessions);
  const stats = useSessionsStore((s) => s.stats);
  const healthSyncEnabled = useSettingsStore((s) => s.healthSyncEnabled);
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

  // Save to Apple Health (Mindful Minutes)
  useEffect(() => {
    if (healthSaved.current || !healthSyncEnabled || !isHealthKitAvailable() || !session) return;
    healthSaved.current = true;

    const startDate = new Date(session.startedAt);
    const endDate = new Date(session.completedAt);
    const durationMinutes = Math.ceil(session.totalDuration / 60);
    writeMindfulSession(startDate, endDate, durationMinutes);
  }, [healthSyncEnabled, session]);

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
    router.replace({ pathname: '/session', params: { techniqueId } });
  }, [techniqueId]);

  const handleShare = useCallback(async () => {
    const techniqueName = technique ? t(technique.nameKey) : techniqueId;
    const minutes = Math.ceil(totalDuration / 60);
    const message = t('summary.shareMessage', {
      minutes,
      technique: techniqueName,
      defaultValue: `I just completed a ${minutes}-minute ${techniqueName} breathing session with BreathFlow`,
    });

    try {
      await Share.share({ message });
    } catch {
      // silent fail
    }
  }, [technique, techniqueId, totalDuration, t]);

  const handleMoodSelect = useCallback((mood: Mood) => {
    setSelectedMood(mood);

    // Update the session in the store
    const { sessions: currentSessions } = useSessionsStore.getState();
    const idx = currentSessions.findIndex((s) => s.id === sessionId);
    if (idx !== -1) {
      const updated = { ...currentSessions[idx], moodAfter: mood };
      const newSessions = [...currentSessions];
      newSessions[idx] = updated;
      useSessionsStore.setState({ sessions: newSessions });
    }
  }, [sessionId]);

  // Max retention bar width calculation
  const maxRetention = retentionTimes.length > 0 ? Math.max(...retentionTimes) : 1;

  if (!session) {
    return (
      <SafeAreaView style={[styles.container, { backgroundColor: theme.background }]}>
        <Text style={[styles.title, { color: theme.text }]}>{t('summary.sessionNotFound')}</Text>
        <TouchableOpacity style={[styles.doneButton, { backgroundColor: theme.primary }]} onPress={handleDone}>
          <Text style={styles.doneButtonText}>{t('summary.goBack')}</Text>
        </TouchableOpacity>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: theme.background }]}>
      {(isPersonalBest || completed) && <ConfettiAnimation key={confettiKey} />}

      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        {/* Header */}
        <View style={styles.headerSection}>
          {technique && (
            <View style={[styles.techniqueIconCircle, { backgroundColor: technique.color + '20' }]}>
              <Ionicons name={technique.icon as never} size={32} color={technique.color} />
            </View>
          )}
          <Text style={[styles.title, { color: theme.text, fontSize: fontSize.xxl }]}>
            {completed ? t('summary.sessionComplete') : t('summary.sessionEnded')}
          </Text>
          <Text style={[styles.subtitle, { color: theme.textSecondary, fontSize: fontSize.sm }]}>
            {completed
              ? t('summary.greatJob')
              : t('summary.partialComplete', {
                  cycles: isPowerBreathing ? roundsCompleted : cyclesCompleted,
                })}
          </Text>
        </View>

        {/* Stats cards */}
        <View style={styles.statsGrid}>
          {/* Technique */}
          <View style={[styles.statCard, styles.statCardWide, { backgroundColor: theme.card }]}>
            {technique && (
              <Ionicons name={technique.icon as never} size={18} color={technique.color} style={styles.statIcon} />
            )}
            <Text style={[styles.statValue, { color: technique?.color ?? theme.primary, fontSize: fontSize.lg }]} numberOfLines={1}>
              {technique ? t(technique.nameKey) : techniqueId}
            </Text>
            <Text style={[styles.statLabel, { color: theme.textSecondary, fontSize: fontSize.sm }]}>
              {t('summary.technique')}
            </Text>
          </View>

          {/* Duration */}
          <View style={[styles.statCard, { backgroundColor: theme.card }]}>
            <Ionicons name="time-outline" size={18} color={theme.primary} style={styles.statIcon} />
            <Text style={[styles.statValue, { color: theme.primary, fontSize: fontSize.xl }]}>
              {formatTotalTime(totalDuration)}
            </Text>
            <Text style={[styles.statLabel, { color: theme.textSecondary, fontSize: fontSize.sm }]}>
              {t('summary.duration')}
            </Text>
          </View>

          {/* Cycles or Rounds */}
          <View style={[styles.statCard, { backgroundColor: theme.card }]}>
            <Ionicons
              name={isPowerBreathing ? 'layers-outline' : 'repeat-outline'}
              size={18}
              color={theme.accent}
              style={styles.statIcon}
            />
            <Text style={[styles.statValue, { color: theme.accent, fontSize: fontSize.xl }]}>
              {isPowerBreathing ? roundsCompleted : cyclesCompleted}
            </Text>
            <Text style={[styles.statLabel, { color: theme.textSecondary, fontSize: fontSize.sm }]}>
              {isPowerBreathing ? t('summary.rounds') : t('summary.cycles')}
            </Text>
          </View>

          {/* Streak */}
          <View style={[styles.statCard, { backgroundColor: theme.card }]}>
            <Ionicons name="trending-up-outline" size={18} color={COLORS.warning} style={styles.statIcon} />
            <Text style={[styles.statValue, { color: COLORS.warning, fontSize: fontSize.xl }]}>
              {stats.currentStreak}
            </Text>
            <Text style={[styles.statLabel, { color: theme.textSecondary, fontSize: fontSize.sm }]}>
              {t('summary.dayStreak')}
            </Text>
          </View>
        </View>

        {/* Power Breathing retention details */}
        {isPowerBreathing && retentionTimes.length > 0 && (
          <View style={[styles.retentionSection, { backgroundColor: theme.card }]}>
            <Text style={[styles.retentionTitle, { color: theme.text, fontSize: fontSize.md }]}>
              {t('summary.retentionTimes')}
            </Text>

            {retentionTimes.map((time, index) => (
              <View key={index} style={styles.retentionRow}>
                <Text style={[styles.retentionRoundLabel, { color: theme.textSecondary, fontSize: fontSize.sm }]}>
                  {t('summary.round', { number: index + 1 })}
                </Text>
                <View style={styles.retentionBarContainer}>
                  <View
                    style={[
                      styles.retentionBar,
                      {
                        width: `${(time / maxRetention) * 100}%`,
                        backgroundColor: time === bestRetention ? COLORS.primary : COLORS.accent,
                      },
                    ]}
                  />
                </View>
                <Text style={[styles.retentionTimeText, { color: theme.text, fontSize: fontSize.sm }]}>
                  {formatRetentionTime(time)}
                </Text>
              </View>
            ))}

            <View style={styles.retentionSummary}>
              <View style={styles.retentionSummaryItem}>
                <Text style={[styles.retentionSummaryLabel, { color: theme.textSecondary, fontSize: fontSize.xs }]}>
                  {t('summary.bestRetention')}
                </Text>
                <Text style={[styles.retentionSummaryValue, { color: theme.primary, fontSize: fontSize.md }]}>
                  {formatRetentionTime(bestRetention)}
                </Text>
                {isPersonalBest && (
                  <Text style={[styles.personalBestBadge, { color: COLORS.warning }]}>
                    {t('summary.personalBest')}
                  </Text>
                )}
              </View>
              <View style={styles.retentionSummaryItem}>
                <Text style={[styles.retentionSummaryLabel, { color: theme.textSecondary, fontSize: fontSize.xs }]}>
                  {t('summary.avgRetention')}
                </Text>
                <Text style={[styles.retentionSummaryValue, { color: theme.accent, fontSize: fontSize.md }]}>
                  {formatRetentionTime(avgRetention)}
                </Text>
              </View>
            </View>
          </View>
        )}

        {/* Mood check */}
        <View style={styles.moodSection}>
          <Text style={[styles.moodTitle, { color: theme.text, fontSize: fontSize.md }]}>
            {t('summary.howDoYouFeel')}
          </Text>
          <View style={styles.moodRow}>
            {MOOD_OPTIONS.map((mood) => (
              <TouchableOpacity
                key={mood.key}
                style={[
                  styles.moodButton,
                  {
                    backgroundColor: selectedMood === mood.key ? theme.primary + '20' : theme.card,
                    borderColor: selectedMood === mood.key ? theme.primary : 'transparent',
                  },
                ]}
                onPress={() => handleMoodSelect(mood.key)}
                activeOpacity={0.7}
              >
                <Text style={styles.moodEmoji}>{mood.emoji}</Text>
                <Text
                  style={[
                    styles.moodLabel,
                    {
                      color: selectedMood === mood.key ? theme.primary : theme.textSecondary,
                      fontSize: fontSize.xs,
                    },
                  ]}
                  numberOfLines={1}
                >
                  {t(mood.labelKey)}
                </Text>
              </TouchableOpacity>
            ))}
          </View>
        </View>

        {/* New badges */}
        {newBadgeIds.length > 0 && (
          <Animated.View
            style={[
              styles.newBadgesContainer,
              {
                borderColor: `${theme.primary}20`,
                transform: [{ scale: badgeScale }],
                opacity: badgeOpacity,
              },
            ]}
          >
            <View style={styles.newBadgeIconContainer}>
              <Ionicons name="ribbon" size={24} color={theme.primary} />
            </View>
            <Text style={[styles.newBadgeTitle, { color: theme.text }]}>
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
                          backgroundColor: theme.isDark ? catColor.iconBgDark : catColor.iconBg,
                          borderColor: catColor.color + '40',
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
                      style={[styles.badgeRevealName, { color: theme.text }]}
                      numberOfLines={2}
                    >
                      {t(`badges.badge_${id}_title`)}
                    </Text>
                    <Text
                      style={[styles.badgeRevealDesc, { color: theme.textSecondary }]}
                      numberOfLines={3}
                    >
                      {t(`badges.badge_${id}_desc`)}
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

        {/* Motivational quote */}
        <Text style={[styles.motivationalQuote, { color: theme.textSecondary, fontSize: fontSize.xs }]}>
          {t(quoteKey)}
        </Text>
      </ScrollView>

      {/* Bottom buttons */}
      <View style={styles.bottomButtons}>
        <View style={styles.bottomRow}>
          <TouchableOpacity style={styles.shareButton} onPress={handleShare} activeOpacity={0.7}>
            <Ionicons name="share-outline" size={20} color={theme.primary} />
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.repeatButton, { borderColor: theme.primary }]}
            onPress={handleRepeat}
            activeOpacity={0.7}
          >
            <Ionicons name="repeat-outline" size={18} color={theme.primary} />
            <Text style={[styles.repeatButtonText, { color: theme.primary, fontSize: fontSize.md }]}>
              {t('summary.repeat')}
            </Text>
          </TouchableOpacity>
        </View>

        <TouchableOpacity
          style={[styles.doneButton, { backgroundColor: theme.primary }]}
          onPress={handleDone}
          activeOpacity={0.8}
        >
          <Text style={[styles.doneButtonText, { fontSize: fontSize.lg }]}>{t('summary.done')}</Text>
        </TouchableOpacity>
      </View>

      <BadgeUnlockModal
        badge={currentBadge}
        visible={showBadgeModal}
        onClose={handleBadgeModalClose}
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  content: {
    flexGrow: 1,
    alignItems: 'center',
    paddingHorizontal: SPACING.lg,
    paddingVertical: SPACING.lg,
  },

  // Header
  headerSection: {
    alignItems: 'center',
    marginBottom: SPACING.lg,
  },
  techniqueIconCircle: {
    width: scale(64),
    height: scale(64),
    borderRadius: scale(32),
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: SPACING.sm,
  },
  title: {
    fontSize: FONT_SIZE.xxl,
    fontFamily: FONTS.bold,
    marginBottom: 4,
    textAlign: 'center',
  },
  subtitle: {
    fontSize: FONT_SIZE.sm,
    textAlign: 'center',
    marginBottom: SPACING.xs,
  },

  // Stats grid
  statsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: SPACING.sm,
    justifyContent: 'center',
    width: '100%',
  },
  statCard: {
    width: '45%',
    paddingVertical: SPACING.md,
    paddingHorizontal: SPACING.sm,
    borderRadius: BORDER_RADIUS.lg,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 8,
    elevation: 2,
  },
  statCardWide: {
    width: '94%',
    paddingVertical: SPACING.sm,
  },
  statIcon: {
    marginBottom: 2,
  },
  statValue: {
    fontSize: FONT_SIZE.xxl,
    fontFamily: FONTS.heavy,
    marginBottom: 2,
  },
  statLabel: {
    fontSize: FONT_SIZE.xs,
  },

  // Power Breathing retention section
  retentionSection: {
    width: '100%',
    marginTop: SPACING.md,
    padding: SPACING.md,
    borderRadius: BORDER_RADIUS.lg,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 8,
    elevation: 2,
  },
  retentionTitle: {
    fontSize: FONT_SIZE.md,
    fontFamily: FONTS.bold,
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
  },
  retentionBarContainer: {
    flex: 1,
    height: scale(16),
    backgroundColor: 'rgba(0,0,0,0.05)',
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
  },
  retentionSummary: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    marginTop: SPACING.sm,
    paddingTop: SPACING.sm,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: 'rgba(0,0,0,0.1)',
  },
  retentionSummaryItem: {
    alignItems: 'center',
  },
  retentionSummaryLabel: {
    fontSize: FONT_SIZE.xs,
    marginBottom: 2,
  },
  retentionSummaryValue: {
    fontSize: FONT_SIZE.md,
    fontFamily: FONTS.heavy,
  },
  personalBestBadge: {
    fontSize: FONT_SIZE.xs,
    fontFamily: FONTS.bold,
    marginTop: 2,
  },

  // Mood section
  moodSection: {
    width: '100%',
    marginTop: SPACING.lg,
    alignItems: 'center',
  },
  moodTitle: {
    fontSize: FONT_SIZE.md,
    fontFamily: FONTS.semibold,
    marginBottom: SPACING.sm,
  },
  moodRow: {
    flexDirection: 'row',
    gap: SPACING.sm,
  },
  moodButton: {
    alignItems: 'center',
    paddingVertical: SPACING.sm,
    paddingHorizontal: SPACING.sm,
    borderRadius: BORDER_RADIUS.lg,
    borderWidth: 2,
    minWidth: scale(70),
  },
  moodEmoji: {
    fontSize: 24,
    marginBottom: 4,
  },
  moodLabel: {
    fontSize: FONT_SIZE.xs,
    fontFamily: FONTS.semibold,
  },

  // Badges
  newBadgesContainer: {
    alignItems: 'center',
    marginTop: SPACING.md,
    paddingVertical: SPACING.sm,
    paddingHorizontal: SPACING.md,
    borderRadius: BORDER_RADIUS.xl,
    width: '90%',
    borderWidth: 1,
  },
  newBadgeIconContainer: {
    marginBottom: 2,
  },
  newBadgeTitle: {
    fontSize: FONT_SIZE.md,
    fontFamily: FONTS.bold,
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
    borderWidth: 2,
    marginBottom: SPACING.xs,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 4,
  },
  badgeRevealIcon: {
    fontSize: 24,
  },
  badgeRevealImage: {
    width: scale(36),
    height: scale(36),
  },
  badgeRevealName: {
    fontSize: FONT_SIZE.sm,
    fontFamily: FONTS.bold,
    textAlign: 'center',
    marginBottom: 2,
  },
  badgeRevealDesc: {
    fontSize: FONT_SIZE.xs,
    fontFamily: FONTS.regular,
    textAlign: 'center',
    lineHeight: 16,
  },

  // Health note
  healthNote: {
    fontSize: FONT_SIZE.sm,
    marginTop: SPACING.lg,
  },

  // Quote
  motivationalQuote: {
    fontSize: FONT_SIZE.xs,
    fontStyle: 'italic',
    textAlign: 'center',
    paddingHorizontal: SPACING.md,
    marginTop: SPACING.md,
  },

  // Bottom buttons
  bottomButtons: {
    paddingHorizontal: SPACING.lg,
    paddingBottom: SPACING.md,
  },
  bottomRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: SPACING.md,
    marginBottom: SPACING.sm,
  },
  shareButton: {
    width: scale(44),
    height: scale(44),
    borderRadius: scale(22),
    alignItems: 'center',
    justifyContent: 'center',
  },
  repeatButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: SPACING.sm,
    paddingHorizontal: SPACING.lg,
    borderRadius: BORDER_RADIUS.xl,
    borderWidth: 2,
    gap: SPACING.xs,
  },
  repeatButtonText: {
    fontSize: FONT_SIZE.md,
    fontFamily: FONTS.semibold,
  },
  doneButton: {
    paddingVertical: SPACING.md,
    borderRadius: BORDER_RADIUS.xl,
    alignItems: 'center',
  },
  doneButtonText: {
    color: COLORS.white,
    fontSize: FONT_SIZE.lg,
    fontFamily: FONTS.bold,
  },
});
