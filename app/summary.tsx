import React, { useEffect, useRef, useState } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, Animated, Image, ScrollView, Dimensions, AppState } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { router, useLocalSearchParams } from 'expo-router';
import { useTranslation } from 'react-i18next';
import { Ionicons } from '@expo/vector-icons';
import { captureRef } from 'react-native-view-shot';
import * as Sharing from 'expo-sharing';
import { useSessionsStore, useSettingsStore, useBadgesStore } from '../src/store';
import { useThemeColors, useFontSize } from '../src/hooks/useColorScheme';
import { formatTotalTime } from '../src/utils/time';
import { saveSessionToHealth, isHealthKitAvailable } from '../src/utils/healthKit';
import { COLORS, SPACING, FONT_SIZE, BORDER_RADIUS, BADGE_DEFINITIONS, BADGE_CATEGORY_COLORS, scale } from '../src/constants';
import { BadgeUnlockModal } from '../src/components/BadgeUnlockModal';
import { Badge } from '../src/types';
import { getCalorieEquivalent } from '../src/utils/foodEquivalents';
import { getRandomQuoteKey } from '../src/constants/motivationalQuotes';

const SCREEN_WIDTH = Dimensions.get('window').width;
const SCREEN_HEIGHT = Dimensions.get('window').height;
const CONFETTI_COLORS = ['#D85E43', '#5BA4C8', '#F5C542', '#7BC67E', '#E88B73', '#9DC8D9'];
const CONFETTI_COUNT = 40;

function ConfettiAnimation() {
  const startXValues = useRef(Array.from({ length: CONFETTI_COUNT }, () => Math.random() * SCREEN_WIDTH)).current;
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

export default function SummaryScreen() {
  const { t } = useTranslation();
  const theme = useThemeColors();
  const fontSize = useFontSize();
  const { sessionId } = useLocalSearchParams<{ sessionId: string }>();
  const sessions = useSessionsStore((s) => s.sessions);
  const stats = useSessionsStore((s) => s.stats);
  const healthIntegration = useSettingsStore((s) => s.healthIntegration);
  const checkAndUnlock = useBadgesStore((s) => s.checkAndUnlock);
  const session = sessions.find((s) => s.id === sessionId);
  const healthSaved = useRef(false);
  const [newBadgeIds, setNewBadgeIds] = useState<string[]>([]);
  const [currentBadgeIndex, setCurrentBadgeIndex] = useState(0);
  const [showBadgeModal, setShowBadgeModal] = useState(false);
  const badgeScale = useRef(new Animated.Value(0)).current;
  const badgeOpacity = useRef(new Animated.Value(0)).current;
  const getBadge = useBadgesStore((s) => s.getBadge);
  const [quoteKey] = useState(getRandomQuoteKey);
  const [confettiKey, setConfettiKey] = useState(0);
  const foodEquiv = session ? getCalorieEquivalent(session.estimatedCalories) : null;
  const shareCardRef = useRef<View>(null);

  // Replay confetti when returning from background (animation may have finished while screen was locked)
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

  useEffect(() => {
    if (session && healthIntegration && isHealthKitAvailable() && !healthSaved.current) {
      healthSaved.current = true;
      saveSessionToHealth(session);
    }
  }, [session, healthIntegration]);

  useEffect(() => {
    if (session && stats) {
      const unlocked = checkAndUnlock(stats);
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
    }
  }, [session?.id, stats.totalSessions, stats.currentStreak, stats.totalMinutes, stats.totalCalories]);

  const handleBadgeModalClose = () => {
    setShowBadgeModal(false);
    if (currentBadgeIndex < newBadgeIds.length - 1) {
      setTimeout(() => {
        setCurrentBadgeIndex(currentBadgeIndex + 1);
        setShowBadgeModal(true);
      }, 300);
    } else {
      setConfettiKey((k) => k + 1);
    }
  };

  const currentBadge = newBadgeIds[currentBadgeIndex] ? (getBadge(newBadgeIds[currentBadgeIndex]) ?? null) : null;

  const handleDone = () => {
    setShowBadgeModal(false);
    setNewBadgeIds([]);
    router.replace('/(tabs)');
  };

  const handleShare = async () => {
    if (!session || !shareCardRef.current) return;
    try {
      const uri = await captureRef(shareCardRef, { format: 'png', quality: 1 });
      const canShare = await Sharing.isAvailableAsync();
      if (canShare) {
        await Sharing.shareAsync(uri, { mimeType: 'image/png', dialogTitle: 'Share your walk' });
      }
    } catch {
      // fallback — silent fail
    }
  };

  if (!session) {
    return (
      <SafeAreaView style={[styles.container, { backgroundColor: theme.background }]}>
        <Text style={[styles.title, { color: theme.text }]}>{t('summary.sessionNotFound')}</Text>
        <TouchableOpacity style={styles.doneButton} onPress={handleDone}>
          <Text style={styles.doneButtonText}>{t('summary.goBack')}</Text>
        </TouchableOpacity>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: theme.background }]}>
      <ConfettiAnimation key={confettiKey} />
      {/* Hidden share card rendered off-screen for captureRef */}
      <View
        ref={shareCardRef}
        collapsable={false}
        style={styles.shareCard}
      >
        {/* Header with app icon */}
        <View style={styles.shareCardHeader}>
          <Image source={require('../assets/icon.png')} style={styles.shareCardIcon} />
          <Text style={styles.shareCardAppName}>WalkPace</Text>
        </View>

        {/* Title */}
        <Text style={styles.shareCardTitle}>
          {session.completed ? t('summary.walkComplete') : t('summary.walkEnded')}
        </Text>

        {/* Stats grid */}
        <View style={styles.shareCardStatsGrid}>
          <View style={styles.shareCardStatBox}>
            <Text style={styles.shareCardStatValue}>{formatTotalTime(session.totalDuration)}</Text>
            <Text style={styles.shareCardStatLabel} numberOfLines={1} adjustsFontSizeToFit>{t('summary.duration')}</Text>
          </View>
          <View style={styles.shareCardStatBox}>
            <Text style={styles.shareCardStatValue}>{session.rounds}/{session.totalRounds}</Text>
            <Text style={styles.shareCardStatLabel} numberOfLines={1} adjustsFontSizeToFit>{t('summary.rounds')}</Text>
          </View>
          <View style={styles.shareCardStatBox}>
            <Text style={styles.shareCardStatValue}>{session.estimatedCalories}</Text>
            <Text style={styles.shareCardStatLabel} numberOfLines={1} adjustsFontSizeToFit>{t('summary.calories')}</Text>
          </View>
        </View>

        {/* Streak */}
        {stats.currentStreak > 0 && (
          <Text style={styles.shareCardStreak}>
            🔥 {stats.currentStreak} {t('summary.dayStreak').toLowerCase()}
          </Text>
        )}

        {/* Footer */}
        <Text style={styles.shareCardFooter}>Japanese Interval Walking</Text>
      </View>

      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        <Text style={[styles.title, { color: theme.text, fontSize: fontSize.xxl }]}>
          {session.completed ? t('summary.walkComplete') : t('summary.walkEnded')}
        </Text>
        <Text style={[styles.subtitle, { color: theme.textSecondary, fontSize: fontSize.sm }]}>
          {session.completed
            ? t('summary.greatJob')
            : t('summary.partialComplete', { rounds: session.rounds, total: session.totalRounds })}
        </Text>

        <View style={styles.statsGrid}>
          <View style={[styles.statCard, { backgroundColor: theme.card }]}>
            <Ionicons name="time-outline" size={18} color={theme.primary} style={styles.statIcon} />
            <Text style={[styles.statValue, { color: theme.primary, fontSize: fontSize.xl }]}>
              {formatTotalTime(session.totalDuration)}
            </Text>
            <Text style={[styles.statLabel, { color: theme.textSecondary, fontSize: fontSize.sm }]}>
              {t('summary.duration')}
            </Text>
          </View>

          <View style={[styles.statCard, { backgroundColor: theme.card }]}>
            <Ionicons name="repeat-outline" size={18} color={theme.accent} style={styles.statIcon} />
            <Text style={[styles.statValue, { color: theme.accent, fontSize: fontSize.xl }]}>
              {session.rounds}/{session.totalRounds}
            </Text>
            <Text style={[styles.statLabel, { color: theme.textSecondary, fontSize: fontSize.sm }]}>
              {t('summary.rounds')}
            </Text>
          </View>

          <View style={[styles.statCard, { backgroundColor: theme.card }]}>
            <Ionicons name="flame-outline" size={18} color={COLORS.error} style={styles.statIcon} />
            <Text style={[styles.statValue, { color: COLORS.error, fontSize: fontSize.xl }]}>
              {session.estimatedCalories}
            </Text>
            <Text style={[styles.statLabel, { color: theme.textSecondary, fontSize: fontSize.sm }]}>
              {t('summary.calories')}
            </Text>
          </View>

          <View style={[styles.statCard, { backgroundColor: theme.card }]}>
            <Ionicons name="trending-up-outline" size={18} color={theme.primary} style={styles.statIcon} />
            <Text style={[styles.statValue, { color: theme.primary, fontSize: fontSize.xl }]}>
              {stats.currentStreak}
            </Text>
            <Text style={[styles.statLabel, { color: theme.textSecondary, fontSize: fontSize.sm }]}>
              {t('summary.dayStreak')}
            </Text>
          </View>

        </View>

        {foodEquiv && (
          <Text style={[styles.foodEquivalent, { color: theme.textSecondary, fontSize: fontSize.sm }]}>
            {foodEquiv.emoji} {t('summary.foodEquivalentPrefix', { count: foodEquiv.count })} {t(foodEquiv.key)}
          </Text>
        )}

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
                const catColor = BADGE_CATEGORY_COLORS[def.condition.type as keyof typeof BADGE_CATEGORY_COLORS];

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
                      {typeof def.icon === 'string' ? (
                        <Text style={styles.badgeRevealIcon}>{def.icon}</Text>
                      ) : (
                        <Image source={def.icon} style={styles.badgeRevealImage} resizeMode="contain" />
                      )}
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

        {healthIntegration && isHealthKitAvailable() && (
          <Text style={[styles.healthNote, { color: theme.textSecondary }]}>
            {t('summary.savedToHealth')}
          </Text>
        )}

        <Text style={[styles.motivationalQuote, { color: theme.textSecondary, fontSize: fontSize.xs }]}>
          {t(quoteKey)}
        </Text>
      </ScrollView>

      <View style={styles.bottomButtons}>
        <TouchableOpacity style={styles.shareButton} onPress={handleShare} activeOpacity={0.7}>
          <Ionicons name="share-outline" size={20} color={theme.primary} />
          <Text style={[styles.shareButtonText, { color: theme.primary, fontSize: fontSize.md }]}>{t('summary.share')}</Text>
        </TouchableOpacity>

        <TouchableOpacity style={[styles.doneButton, { backgroundColor: theme.primary }]} onPress={handleDone} activeOpacity={0.8}>
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
    justifyContent: 'center',
    paddingHorizontal: SPACING.lg,
    paddingVertical: SPACING.lg,
  },
  title: {
    fontSize: FONT_SIZE.xxl,
    fontWeight: '700',
    marginBottom: 4,
  },
  subtitle: {
    fontSize: FONT_SIZE.sm,
    textAlign: 'center',
    marginBottom: SPACING.md,
  },
  statsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: SPACING.sm,
    justifyContent: 'center',
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
  statValue: {
    fontSize: FONT_SIZE.xxl,
    fontWeight: '800',
    marginBottom: 2,
  },
  statLabel: {
    fontSize: FONT_SIZE.xs,
  },
  healthNote: {
    fontSize: FONT_SIZE.sm,
    marginTop: SPACING.lg,
  },
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
    fontWeight: '700',
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
    fontWeight: '700',
    textAlign: 'center',
    marginBottom: 2,
  },
  badgeRevealDesc: {
    fontSize: FONT_SIZE.xs,
    fontWeight: '400',
    textAlign: 'center',
    lineHeight: 16,
  },
  statIcon: {
    marginBottom: 2,
  },
  foodEquivalent: {
    fontSize: FONT_SIZE.xs,
    textAlign: 'center',
    marginTop: SPACING.sm,
  },
  motivationalQuote: {
    fontSize: FONT_SIZE.xs,
    fontStyle: 'italic',
    textAlign: 'center',
    paddingHorizontal: SPACING.md,
    marginTop: SPACING.md,
  },
  bottomButtons: {
    paddingHorizontal: SPACING.lg,
    paddingBottom: SPACING.md,
  },
  shareButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: SPACING.sm,
    marginBottom: SPACING.sm,
    gap: SPACING.sm,
  },
  shareButtonText: {
    fontSize: FONT_SIZE.md,
    fontWeight: '600',
  },
  doneButton: {
    paddingVertical: SPACING.md,
    borderRadius: BORDER_RADIUS.xl,
    alignItems: 'center',
  },
  doneButtonText: {
    color: COLORS.white,
    fontSize: FONT_SIZE.lg,
    fontWeight: '700',
  },

  // Share card (rendered off-screen for capture)
  shareCard: {
    position: 'absolute',
    top: -2000,
    left: 0,
    width: 360,
    height: 360,
    backgroundColor: COLORS.primary,
    borderRadius: 24,
    padding: 28,
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  shareCardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  shareCardIcon: {
    width: 32,
    height: 32,
    borderRadius: 8,
  },
  shareCardAppName: {
    color: COLORS.white,
    fontSize: 18,
    fontWeight: '700',
    letterSpacing: 0.5,
  },
  shareCardTitle: {
    color: COLORS.white,
    fontSize: 22,
    fontWeight: '800',
    textAlign: 'center',
  },
  shareCardStatsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    width: '100%',
  },
  shareCardStatBox: {
    flex: 1,
    minWidth: '40%',
    backgroundColor: 'rgba(255,255,255,0.15)',
    borderRadius: 12,
    paddingVertical: 12,
    paddingHorizontal: 8,
    alignItems: 'center',
  },
  shareCardStatValue: {
    color: COLORS.white,
    fontSize: 20,
    fontWeight: '800',
    marginBottom: 2,
  },
  shareCardStatLabel: {
    color: 'rgba(255,255,255,0.7)',
    fontSize: 10,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    textAlign: 'center',
  },
  shareCardStreak: {
    color: COLORS.white,
    fontSize: 16,
    fontWeight: '700',
  },
  shareCardSteps: {
    color: 'rgba(255,255,255,0.85)',
    fontSize: 14,
    fontWeight: '600',
  },
  shareCardFooter: {
    color: 'rgba(255,255,255,0.5)',
    fontSize: 11,
    letterSpacing: 0.5,
  },
});
