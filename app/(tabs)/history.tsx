import React, { useState, useMemo, useCallback, useEffect, useRef } from 'react';
import { View, Text, ScrollView, StyleSheet, Animated, RefreshControl, TouchableOpacity } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useTranslation } from 'react-i18next';
import { router } from 'expo-router';
import { useSessionsStore } from '../../src/store';
import { useThemeColors, useFontSize } from '../../src/hooks/useColorScheme';
import { CalendarHeatmap } from '../../src/components/CalendarHeatmap';
import { getTechniqueById } from '../../src/constants/techniques';
import { formatTime, formatTotalTime, getToday } from '../../src/utils/time';
import { COLORS, SPACING, FONT_SIZE, BORDER_RADIUS, FONTS } from '../../src/constants';
import type { BreathingSession } from '../../src/types';

const MOOD_EMOJI: Record<string, string> = {
  calm: '\u{1F60C}',
  energized: '\u{26A1}',
  focused: '\u{1F3AF}',
  sleepy: '\u{1F634}',
};

function useStaggeredEntrance(count: number, delay = 80) {
  const anims = useRef(Array.from({ length: count }, () => new Animated.Value(0))).current;

  useEffect(() => {
    const animations = anims.map((anim, i) =>
      Animated.timing(anim, {
        toValue: 1,
        duration: 350,
        delay: i * delay,
        useNativeDriver: true,
      }),
    );
    Animated.stagger(delay, animations).start();
  }, []);

  return anims;
}

function formatTimeOfDay(isoString: string): string {
  const d = new Date(isoString);
  return d.toLocaleTimeString(undefined, { hour: 'numeric', minute: '2-digit' });
}

export default function HistoryScreen() {
  const { t, i18n } = useTranslation();
  const theme = useThemeColors();
  const fontSize = useFontSize();
  const stats = useSessionsStore((s) => s.stats);
  const sessions = useSessionsStore((s) => s.sessions);
  const deleteSession = useSessionsStore((s) => s.deleteSession);
  const hydrate = useSessionsStore((s) => s.hydrate);

  const now = new Date();
  const [year, setYear] = useState(now.getFullYear());
  const [month, setMonth] = useState(now.getMonth());
  const [selectedDate, setSelectedDate] = useState<string | null>(getToday());
  const [refreshing, setRefreshing] = useState(false);

  const entranceAnims = useStaggeredEntrance(5);
  const calendarOpacity = useRef(new Animated.Value(1)).current;

  // Compute active days set from sessions
  const activeDays = useMemo(() => {
    const days = new Set<string>();
    for (const s of sessions) {
      days.add(s.date);
    }
    return days;
  }, [sessions]);

  // Today's data
  const todayStr = useMemo(() => getToday(), []);
  const todaySessions = useMemo(() => sessions.filter((s) => s.date === todayStr), [sessions, todayStr]);
  const todayMinutes = useMemo(
    () => todaySessions.reduce((sum, s) => sum + Math.round(s.totalDuration / 60), 0),
    [todaySessions],
  );

  // Selected day sessions
  const selectedDaySessions = useMemo(() => {
    if (!selectedDate) return [];
    return sessions.filter((s) => s.date === selectedDate);
  }, [sessions, selectedDate]);

  // All-time favorite technique
  const favoriteTechnique = useMemo(() => {
    if (!stats.favoriteTechniqueId) return null;
    return getTechniqueById(stats.favoriteTechniqueId) ?? null;
  }, [stats.favoriteTechniqueId]);

  const animateMonthChange = useCallback((changeFn: () => void) => {
    Animated.timing(calendarOpacity, {
      toValue: 0.3,
      duration: 120,
      useNativeDriver: true,
    }).start(() => {
      changeFn();
      Animated.timing(calendarOpacity, {
        toValue: 1,
        duration: 200,
        useNativeDriver: true,
      }).start();
    });
  }, []);

  const handlePrevMonth = useCallback(() => {
    animateMonthChange(() => {
      if (month === 0) {
        setMonth(11);
        setYear((y) => y - 1);
      } else {
        setMonth((m) => m - 1);
      }
    });
  }, [month, animateMonthChange]);

  const handleNextMonth = useCallback(() => {
    const isCurrentMonth = year === now.getFullYear() && month === now.getMonth();
    if (isCurrentMonth) return;
    animateMonthChange(() => {
      if (month === 11) {
        setMonth(0);
        setYear((y) => y + 1);
      } else {
        setMonth((m) => m + 1);
      }
    });
  }, [month, year, animateMonthChange]);

  const handleDayPress = useCallback((dateStr: string) => {
    setSelectedDate((prev) => (prev === dateStr ? null : dateStr));
  }, []);

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    try {
      await hydrate();
      const { pullAndMerge } = await import('../../src/services/syncService');
      await pullAndMerge();
    } catch {
      // Sync may fail offline
    }
    setRefreshing(false);
  }, [hydrate]);

  const isEmpty = stats.totalSessions === 0;

  const getEntranceStyle = (index: number) => ({
    opacity: entranceAnims[index],
    transform: [{
      translateY: entranceAnims[index].interpolate({
        inputRange: [0, 1],
        outputRange: [20, 0],
      }),
    }],
  });

  const renderSessionCard = (session: BreathingSession) => {
    const technique = getTechniqueById(session.techniqueId);
    const techniqueName = technique ? t(technique.nameKey) : session.techniqueId;
    const techniqueColor = technique?.color ?? theme.primary;
    const techniqueIcon = (technique?.icon ?? 'ellipse-outline') as keyof typeof Ionicons.glyphMap;

    const durationStr = formatTime(session.totalDuration);
    const cyclesLabel = session.roundsCompleted != null
      ? `${session.roundsCompleted} ${t('history.rounds')}`
      : `${session.cyclesCompleted} ${t('history.cycles')}`;
    const timeOfDay = formatTimeOfDay(session.startedAt);
    const moodEmoji = session.moodAfter ? MOOD_EMOJI[session.moodAfter] : null;

    return (
      <View
        key={session.id}
        style={[styles.sessionCard, { backgroundColor: theme.card }]}
      >
        <View style={styles.sessionCardHeader}>
          <View style={styles.sessionTechniqueRow}>
            <View style={[styles.techniqueDot, { backgroundColor: techniqueColor }]} />
            <Ionicons name={techniqueIcon} size={18} color={techniqueColor} style={styles.techniqueIcon} />
            <Text style={[styles.techniqueName, { color: theme.text }]} numberOfLines={1}>
              {techniqueName}
            </Text>
          </View>
          <Text style={[styles.sessionTime, { color: theme.textSecondary }]}>{timeOfDay}</Text>
        </View>

        <View style={styles.sessionDetails}>
          <View style={styles.sessionStat}>
            <Ionicons name="timer-outline" size={14} color={theme.textSecondary} />
            <Text style={[styles.sessionStatText, { color: theme.textSecondary }]}>{durationStr}</Text>
          </View>
          <View style={styles.sessionStat}>
            <Ionicons name="repeat-outline" size={14} color={theme.textSecondary} />
            <Text style={[styles.sessionStatText, { color: theme.textSecondary }]}>{cyclesLabel}</Text>
          </View>
          {session.bestRetention != null && session.bestRetention > 0 && (
            <View style={styles.sessionStat}>
              <Ionicons name="stopwatch-outline" size={14} color={theme.textSecondary} />
              <Text style={[styles.sessionStatText, { color: theme.textSecondary }]}>
                {formatTime(session.bestRetention)}
              </Text>
            </View>
          )}
          {moodEmoji && (
            <Text style={styles.moodEmoji}>{moodEmoji}</Text>
          )}
        </View>

        {!session.completed && (
          <View style={[styles.incompleteBadge, { backgroundColor: `${theme.textSecondary}18` }]}>
            <Text style={[styles.incompleteBadgeText, { color: theme.textSecondary }]}>
              {t('history.incomplete')}
            </Text>
          </View>
        )}
      </View>
    );
  };

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: theme.background }]}>
      <ScrollView
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={onRefresh}
            tintColor={theme.primary}
            colors={[theme.primary]}
          />
        }
      >
        {/* Header */}
        <View style={styles.headerRow}>
          <Text style={[styles.screenTitle, { color: theme.text }]}>
            {t('history.title')}
          </Text>
          {stats.currentStreak > 0 && (
            <View style={[styles.streakPill, { backgroundColor: theme.primary }]}>
              <Ionicons name="flame" size={16} color={COLORS.white} />
              <Text style={styles.streakPillText}>{stats.currentStreak}</Text>
            </View>
          )}
        </View>

        {isEmpty ? (
          <View style={styles.emptyContainer}>
            <View style={[styles.emptyIconCircle, { backgroundColor: theme.card }]}>
              <Ionicons name="leaf-outline" size={48} color={theme.primary} />
            </View>
            <Text style={[styles.emptyTitle, { color: theme.text }]} numberOfLines={1} adjustsFontSizeToFit>
              {t('history.noSessionsYet')}
            </Text>
            <Text style={[styles.emptySubtitle, { color: theme.textSecondary }]} numberOfLines={2} adjustsFontSizeToFit>
              {t('history.noSessionsSubtitle')}
            </Text>
            <TouchableOpacity
              style={[styles.ctaCard, { backgroundColor: theme.primary, shadowColor: theme.primary, marginTop: SPACING.xl }]}
              activeOpacity={0.8}
              onPress={() => router.push('/(tabs)')}
              accessibilityLabel={t('history.startSession')}
              accessibilityRole="button"
            >
              <Ionicons name="play-circle" size={28} color={COLORS.white} />
              <View style={styles.ctaTextContainer}>
                <Text style={styles.ctaTitle} numberOfLines={1} adjustsFontSizeToFit>{t('history.startSession')}</Text>
                <Text style={styles.ctaSubtitle} numberOfLines={2}>{t('history.ctaSubtitle')}</Text>
              </View>
              <Ionicons name="chevron-forward" size={20} color="rgba(255,255,255,0.7)" />
            </TouchableOpacity>
          </View>
        ) : (
          <>
            {/* Today Stats Row */}
            <Animated.View style={getEntranceStyle(0)}>
              <View style={styles.sectionHeader}>
                <Text style={[styles.sectionTitle, { color: theme.text }]}>{t('history.today')}</Text>
              </View>
              <View style={styles.todayStatsRow}>
                <View style={[styles.todayStatCard, { backgroundColor: theme.card }]}>
                  <Ionicons name="timer-outline" size={20} color={theme.primary} />
                  <Text style={[styles.todayStatValue, { color: theme.text }]}>{todayMinutes}</Text>
                  <Text style={[styles.todayStatLabel, { color: theme.textSecondary }]} numberOfLines={1} adjustsFontSizeToFit>
                    {t('history.minutesToday')}
                  </Text>
                </View>
                <View style={[styles.todayStatCard, { backgroundColor: theme.card }]}>
                  <Ionicons name="leaf-outline" size={20} color={theme.accent} />
                  <Text style={[styles.todayStatValue, { color: theme.text }]}>{todaySessions.length}</Text>
                  <Text style={[styles.todayStatLabel, { color: theme.textSecondary }]} numberOfLines={1} adjustsFontSizeToFit>
                    {t('history.sessionsToday')}
                  </Text>
                </View>
                <View style={[styles.todayStatCard, { backgroundColor: theme.card }]}>
                  <Ionicons name="flame" size={20} color={theme.primary} />
                  <Text style={[styles.todayStatValue, { color: theme.text }]}>{stats.currentStreak}</Text>
                  <Text style={[styles.todayStatLabel, { color: theme.textSecondary }]} numberOfLines={1} adjustsFontSizeToFit>
                    {t('history.streakDays')}
                  </Text>
                </View>
              </View>
            </Animated.View>

            {/* Calendar Heatmap */}
            <Animated.View style={[{ opacity: calendarOpacity }, getEntranceStyle(1)]}>
              <View style={[styles.calendarCard, { backgroundColor: theme.card }]}>
                <CalendarHeatmap
                  activeDays={activeDays}
                  year={year}
                  month={month}
                  onPrevMonth={handlePrevMonth}
                  onNextMonth={handleNextMonth}
                  onDayPress={handleDayPress}
                  selectedDate={selectedDate}
                />
              </View>
            </Animated.View>

            {/* Selected Day Sessions */}
            {selectedDate && (
              <Animated.View style={[styles.sessionsSection, getEntranceStyle(2)]}>
                <View style={styles.sectionHeader}>
                  <Text style={[styles.sectionTitle, { color: theme.text }]}>
                    {new Date(selectedDate + 'T00:00:00').toLocaleDateString(i18n.language, {
                      month: 'short',
                      day: 'numeric',
                    })}
                  </Text>
                </View>
                {selectedDaySessions.length > 0 ? (
                  selectedDaySessions.map(renderSessionCard)
                ) : (
                  <Text style={[styles.noSessionsOnDay, { color: theme.textSecondary }]}>
                    {t('history.noSessionsOnDay')}
                  </Text>
                )}
              </Animated.View>
            )}

            {/* All-Time Stats */}
            <Animated.View style={getEntranceStyle(3)}>
              <View style={styles.sectionHeader}>
                <Text style={[styles.sectionTitle, { color: theme.text }]}>{t('history.allTimeStats')}</Text>
              </View>
              <View style={[styles.allTimeCard, { backgroundColor: theme.card }]}>
                <View style={styles.allTimeRow}>
                  <View style={styles.allTimeStat}>
                    <Text style={[styles.allTimeValue, { color: theme.text }]}>{stats.totalSessions}</Text>
                    <Text style={[styles.allTimeLabel, { color: theme.textSecondary }]}>
                      {t('history.totalSessions')}
                    </Text>
                  </View>
                  <View style={styles.allTimeStat}>
                    <Text style={[styles.allTimeValue, { color: theme.text }]}>{stats.totalMinutes}</Text>
                    <Text style={[styles.allTimeLabel, { color: theme.textSecondary }]}>
                      {t('history.totalMinutes')}
                    </Text>
                  </View>
                </View>
                <View style={styles.allTimeRow}>
                  <View style={styles.allTimeStat}>
                    <Text style={[styles.allTimeValue, { color: theme.text }]}>{stats.longestStreak}</Text>
                    <Text style={[styles.allTimeLabel, { color: theme.textSecondary }]}>
                      {t('history.longestStreak')}
                    </Text>
                  </View>
                  <View style={styles.allTimeStat}>
                    {favoriteTechnique ? (
                      <>
                        <Ionicons
                          name={favoriteTechnique.icon as keyof typeof Ionicons.glyphMap}
                          size={22}
                          color={favoriteTechnique.color}
                        />
                        <Text style={[styles.allTimeLabel, { color: theme.textSecondary }]} numberOfLines={1}>
                          {t(favoriteTechnique.nameKey)}
                        </Text>
                      </>
                    ) : (
                      <>
                        <Text style={[styles.allTimeValue, { color: theme.text }]}>-</Text>
                        <Text style={[styles.allTimeLabel, { color: theme.textSecondary }]}>
                          {t('history.favoriteTechnique')}
                        </Text>
                      </>
                    )}
                  </View>
                </View>
                {stats.bestRetention > 0 && (
                  <View style={styles.allTimeRow}>
                    <View style={styles.allTimeStat}>
                      <Text style={[styles.allTimeValue, { color: theme.text }]}>
                        {formatTime(stats.bestRetention)}
                      </Text>
                      <Text style={[styles.allTimeLabel, { color: theme.textSecondary }]}>
                        {t('history.bestRetention')}
                      </Text>
                    </View>
                    <View style={styles.allTimeStat}>
                      <Text style={[styles.allTimeValue, { color: theme.text }]}>
                        {formatTime(stats.avgRetention)}
                      </Text>
                      <Text style={[styles.allTimeLabel, { color: theme.textSecondary }]}>
                        {t('history.avgRetention')}
                      </Text>
                    </View>
                  </View>
                )}
              </View>
            </Animated.View>
          </>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  scrollContent: { paddingBottom: SPACING.xxl + SPACING.lg },

  // Header
  headerRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: SPACING.lg,
    paddingTop: SPACING.sm,
    paddingBottom: SPACING.lg,
  },
  screenTitle: {
    fontSize: 30,
    fontFamily: FONTS.bold,
    letterSpacing: -0.5,
  },
  streakPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: SPACING.sm,
    paddingVertical: SPACING.xs,
    borderRadius: BORDER_RADIUS.full,
  },
  streakPillText: {
    fontSize: FONT_SIZE.sm,
    fontFamily: FONTS.bold,
    color: COLORS.white,
  },

  // Empty state
  emptyContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingTop: 100,
    paddingHorizontal: SPACING.xl,
  },
  emptyIconCircle: {
    width: 100,
    height: 100,
    borderRadius: 50,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: SPACING.lg,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.08,
    shadowRadius: 12,
    elevation: 4,
  },
  emptyTitle: { fontSize: FONT_SIZE.xl, fontFamily: FONTS.bold, marginBottom: SPACING.sm },
  emptySubtitle: { fontSize: FONT_SIZE.md, textAlign: 'center', lineHeight: 22 },

  // CTA
  ctaCard: {
    flexDirection: 'row',
    alignItems: 'center',
    marginHorizontal: SPACING.lg,
    padding: SPACING.md,
    borderRadius: BORDER_RADIUS.xl,
    gap: SPACING.md,
    marginBottom: SPACING.lg,
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.25,
    shadowRadius: 12,
    elevation: 6,
  },
  ctaTextContainer: { flex: 1 },
  ctaTitle: {
    fontSize: FONT_SIZE.md,
    fontFamily: FONTS.bold,
    color: COLORS.white,
  },
  ctaSubtitle: {
    fontSize: FONT_SIZE.xs,
    color: 'rgba(255,255,255,0.8)',
    marginTop: 2,
  },

  // Section headers
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'baseline',
    paddingHorizontal: SPACING.lg,
    marginBottom: SPACING.sm,
  },
  sectionTitle: { fontSize: FONT_SIZE.lg, fontFamily: FONTS.bold },

  // Today stats row
  todayStatsRow: {
    flexDirection: 'row',
    paddingHorizontal: SPACING.lg,
    gap: SPACING.sm,
    marginBottom: SPACING.lg,
  },
  todayStatCard: {
    flex: 1,
    alignItems: 'center',
    paddingVertical: SPACING.md,
    borderRadius: BORDER_RADIUS.xl,
    gap: 4,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.06,
    shadowRadius: 8,
    elevation: 2,
  },
  todayStatValue: {
    fontSize: FONT_SIZE.xl,
    fontFamily: FONTS.heavy,
  },
  todayStatLabel: {
    fontSize: FONT_SIZE.xs,
    fontFamily: FONTS.medium,
    textAlign: 'center',
  },

  // Calendar
  calendarCard: {
    marginHorizontal: SPACING.lg,
    paddingVertical: SPACING.lg,
    borderRadius: BORDER_RADIUS.xl,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.06,
    shadowRadius: 8,
    elevation: 2,
    marginBottom: SPACING.lg,
  },

  // Sessions list
  sessionsSection: { marginBottom: SPACING.lg },
  noSessionsOnDay: {
    fontSize: FONT_SIZE.sm,
    textAlign: 'center',
    paddingVertical: SPACING.lg,
    paddingHorizontal: SPACING.lg,
  },

  // Session card
  sessionCard: {
    marginHorizontal: SPACING.lg,
    padding: SPACING.md,
    borderRadius: BORDER_RADIUS.xl,
    marginBottom: SPACING.sm,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.06,
    shadowRadius: 8,
    elevation: 2,
  },
  sessionCardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: SPACING.xs,
  },
  sessionTechniqueRow: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  techniqueDot: {
    width: 10,
    height: 10,
    borderRadius: 5,
    marginRight: 6,
  },
  techniqueIcon: {
    marginRight: 6,
  },
  techniqueName: {
    fontSize: FONT_SIZE.md,
    fontFamily: FONTS.semibold,
    flex: 1,
  },
  sessionTime: {
    fontSize: FONT_SIZE.sm,
    fontFamily: FONTS.medium,
    marginLeft: SPACING.sm,
  },
  sessionDetails: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING.md,
    marginTop: SPACING.xs,
  },
  sessionStat: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  sessionStatText: {
    fontSize: FONT_SIZE.sm,
    fontFamily: FONTS.medium,
  },
  moodEmoji: {
    fontSize: FONT_SIZE.md,
  },
  incompleteBadge: {
    alignSelf: 'flex-start',
    paddingHorizontal: SPACING.sm,
    paddingVertical: 2,
    borderRadius: BORDER_RADIUS.full,
    marginTop: SPACING.xs,
  },
  incompleteBadgeText: {
    fontSize: FONT_SIZE.xs,
    fontFamily: FONTS.semibold,
  },

  // All-time stats
  allTimeCard: {
    marginHorizontal: SPACING.lg,
    padding: SPACING.lg,
    borderRadius: BORDER_RADIUS.xl,
    gap: SPACING.md,
    marginBottom: SPACING.lg,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.06,
    shadowRadius: 8,
    elevation: 2,
  },
  allTimeRow: {
    flexDirection: 'row',
    gap: SPACING.md,
  },
  allTimeStat: {
    flex: 1,
    alignItems: 'center',
    gap: 4,
  },
  allTimeValue: {
    fontSize: FONT_SIZE.xl,
    fontFamily: FONTS.heavy,
  },
  allTimeLabel: {
    fontSize: FONT_SIZE.xs,
    fontFamily: FONTS.medium,
    textAlign: 'center',
  },
});
