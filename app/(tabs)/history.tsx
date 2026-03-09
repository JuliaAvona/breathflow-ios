import React, { useState, useMemo, useCallback, useEffect, useRef } from 'react';
import { View, Text, ScrollView, StyleSheet, Animated, RefreshControl, TouchableOpacity } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useTranslation } from 'react-i18next';
import { router } from 'expo-router';
import { useSessionsStore, useSettingsStore } from '../../src/store';
import { ProgressRing } from '../../src/components/ProgressRing';
import { useThemeColors, useFontSize } from '../../src/hooks/useColorScheme';
import { useStepCount } from '../../src/hooks/useStepCount';
import { CalendarHeatmap } from '../../src/components/CalendarHeatmap';
import { SessionCard } from '../../src/components/SessionCard';
import { isHealthKitAvailable } from '../../src/utils/healthKit';
import { formatTotalTime, getToday } from '../../src/utils/time';
import { COLORS, SPACING, FONT_SIZE, BORDER_RADIUS } from '../../src/constants';

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

export default function HistoryScreen() {
  const { t, i18n } = useTranslation();
  const theme = useThemeColors();
  const fontSize = useFontSize();
  const stats = useSessionsStore((s) => s.stats);
  const sessions = useSessionsStore((s) => s.sessions);
  const getActiveDays = useSessionsStore((s) => s.getActiveDays);
  const hydrate = useSessionsStore((s) => s.hydrate);

  const settings = useSettingsStore();

  // Step count
  const healthEnabled = settings.healthIntegration && isHealthKitAvailable();
  const todaySteps = useStepCount(healthEnabled);
  const dailyStepGoal = settings.dailyStepGoal;
  const stepProgress = dailyStepGoal > 0 ? Math.min(todaySteps / dailyStepGoal, 1) : 0;

  const now = new Date();
  const [year, setYear] = useState(now.getFullYear());
  const [month, setMonth] = useState(now.getMonth());
  const [selectedDate, setSelectedDate] = useState<string | null>(getToday());
  const [refreshing, setRefreshing] = useState(false);
  // Entrance animations for 6 sections
  const entranceAnims = useStaggeredEntrance(6);

  // Calendar month transition
  const calendarOpacity = useRef(new Animated.Value(1)).current;

  const activeDays = useMemo(() => getActiveDays(), [getActiveDays, sessions]);

  // Today's sessions
  const todayStr = useMemo(() => {
    const d = new Date();
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
  }, []);
  const todaySessions = useMemo(() => sessions.filter((s) => s.date === todayStr), [sessions, todayStr]);
  const todayCalories = useMemo(() => todaySessions.reduce((sum, s) => sum + s.estimatedCalories, 0), [todaySessions]);
  const todayMinutes = useMemo(() => todaySessions.reduce((sum, s) => sum + Math.round(s.totalDuration / 60), 0), [todaySessions]);

  // Last workout
  const lastWorkout = sessions.length > 0 ? sessions[0] : null;

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

  const selectedDaySessions = useMemo(() => {
    if (!selectedDate) return [];
    return sessions.filter((s) => s.date === selectedDate);
  }, [sessions, selectedDate]);

  const dayLabels = useMemo(() => {
    const formatter = new Intl.DateTimeFormat(i18n.language, { weekday: 'narrow' });
    // Generate labels starting from Monday (Jan 1 2024 is a Monday)
    return Array.from({ length: 7 }, (_, i) => {
      const date = new Date(2024, 0, i + 1);
      return formatter.format(date);
    });
  }, [i18n.language]);

  // Last 7 days activity (Mon–Sun)
  const last7Days = useMemo(() => {
    const today = new Date();
    const dayOfWeek = today.getDay(); // 0=Sun
    const mondayOffset = dayOfWeek === 0 ? 6 : dayOfWeek - 1;
    const monday = new Date(today);
    monday.setDate(today.getDate() - mondayOffset);
    monday.setHours(0, 0, 0, 0);

    const todayDateStr = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}-${String(today.getDate()).padStart(2, '0')}`;

    return dayLabels.map((label, i) => {
      const d = new Date(monday);
      d.setDate(monday.getDate() + i);
      const dateStr = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
      const hasActivity = sessions.some((s) => s.date === dateStr);
      const isToday = dateStr === todayDateStr;
      const isPast = dateStr < todayDateStr;
      return { label, hasActivity, isToday, isPast };
    });
  }, [sessions, dayLabels]);

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

  const handleLastWorkoutPress = useCallback(() => {
    if (lastWorkout) {
      setSelectedDate(lastWorkout.date);
    }
  }, [lastWorkout]);

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
        {/* Header with streak pill */}
        <View style={styles.headerRow}>
          <Text style={[styles.screenTitle, { color: theme.text, fontSize: 34 * (fontSize.md / FONT_SIZE.md) }]}>
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
              <Ionicons name="walk-outline" size={48} color={theme.primary} />
            </View>
            <Text style={[styles.emptyTitle, { color: theme.text }]} numberOfLines={1} adjustsFontSizeToFit>
              {t('history.noWalksYet')}
            </Text>
            <Text style={[styles.emptySubtitle, { color: theme.textSecondary }]} numberOfLines={2} adjustsFontSizeToFit>
              {t('history.noWalksSubtitle')}
            </Text>
            <TouchableOpacity
              style={[styles.ctaCard, { backgroundColor: theme.primary, shadowColor: theme.primary, marginTop: SPACING.xl }]}
              activeOpacity={0.8}
              onPress={() => router.push('/(tabs)')}
              accessibilityLabel={t('history.startWorkout')}
              accessibilityRole="button"
            >
              <Ionicons name="play-circle" size={28} color={COLORS.white} />
              <View style={styles.ctaTextContainer}>
                <Text style={styles.ctaTitle} numberOfLines={1} adjustsFontSizeToFit>{t('history.startWorkout')}</Text>
                <Text style={styles.ctaSubtitle} numberOfLines={2}>{t('history.ctaSubtitle')}</Text>
              </View>
              <Ionicons name="chevron-forward" size={20} color="rgba(255,255,255,0.7)" />
            </TouchableOpacity>
          </View>
        ) : (
          <>
            {/* Start Workout CTA */}
            <Animated.View style={getEntranceStyle(0)}>
              <TouchableOpacity
                style={[styles.ctaCard, { backgroundColor: theme.primary, shadowColor: theme.primary }]}
                activeOpacity={0.8}
                onPress={() => router.push('/(tabs)')}
                accessibilityLabel={t('history.startWorkout')}
                accessibilityRole="button"
              >
                <Ionicons name="play-circle" size={28} color={COLORS.white} />
                <View style={styles.ctaTextContainer}>
                  <Text style={styles.ctaTitle}>{t('history.startWorkout')}</Text>
                  <Text style={styles.ctaSubtitle}>{t('history.ctaSubtitle')}</Text>
                </View>
                <Ionicons name="chevron-forward" size={20} color="rgba(255,255,255,0.7)" />
              </TouchableOpacity>
            </Animated.View>

            {/* Today section */}
            <Animated.View style={getEntranceStyle(1)}>
              <View style={styles.sectionHeader}>
                <Text style={[styles.sectionTitle, { color: theme.text }]}>{t('history.today')}</Text>
              </View>
              <View style={[styles.todayCard, { backgroundColor: theme.card }]}>
                <ProgressRing
                  progress={stepProgress}
                  size={130}
                  strokeWidth={10}
                  color={theme.primary}
                  bgColor={`${theme.primary}20`}
                >
                  <Text style={[styles.ringSteps, { color: theme.text }]}>
                    {todaySteps >= 1000 ? `${(todaySteps / 1000).toFixed(1)}k` : todaySteps}
                  </Text>
                  <Text style={[styles.ringGoal, { color: theme.textSecondary }]}>
                    / {dailyStepGoal >= 1000 ? `${(dailyStepGoal / 1000).toFixed(0)}k` : dailyStepGoal}
                  </Text>
                  <Text style={[styles.ringLabel, { color: theme.textSecondary }]}>
                    {t('history.stepsProgress')}
                  </Text>
                </ProgressRing>
                <View style={styles.todayStats}>
                  <View style={styles.todayStatsGrid}>
                    <View style={styles.todayStatCell}>
                      <Ionicons name="footsteps-outline" size={18} color={theme.accent} />
                      <Text style={[styles.todayStatValue, { color: theme.text }]}>
                        {todaySteps >= 1000 ? `${(todaySteps / 1000).toFixed(1)}k` : todaySteps}
                      </Text>
                      <Text style={[styles.todayStatLabel, { color: theme.textSecondary }]} numberOfLines={1} adjustsFontSizeToFit>{t('history.stepsProgress')}</Text>
                    </View>
                    <View style={styles.todayStatCell}>
                      <Ionicons name="flame" size={18} color={theme.primary} />
                      <Text style={[styles.todayStatValue, { color: theme.text }]}>{todayCalories}</Text>
                      <Text style={[styles.todayStatLabel, { color: theme.textSecondary }]} numberOfLines={1} adjustsFontSizeToFit>{t('history.todayCalories')}</Text>
                    </View>
                  </View>
                  <View style={styles.todayStatsGrid}>
                    <View style={styles.todayStatCell}>
                      <Ionicons name="timer-outline" size={18} color={theme.primary} />
                      <Text style={[styles.todayStatValue, { color: theme.text }]}>{todayMinutes}m</Text>
                      <Text style={[styles.todayStatLabel, { color: theme.textSecondary }]} numberOfLines={1} adjustsFontSizeToFit>{t('history.time')}</Text>
                    </View>
                    <View style={styles.todayStatCell}>
                      <Ionicons name="walk-outline" size={18} color={theme.accent} />
                      <Text style={[styles.todayStatValue, { color: theme.text }]}>{todaySessions.length}</Text>
                      <Text style={[styles.todayStatLabel, { color: theme.textSecondary }]} numberOfLines={1} adjustsFontSizeToFit>{t('history.todayWalks')}</Text>
                    </View>
                  </View>
                </View>
              </View>
              {healthEnabled ? (
                <View style={styles.healthSource}>
                  <Ionicons name="heart" size={11} color={theme.textSecondary} />
                  <Text style={[styles.healthSourceText, { color: theme.textSecondary }]} numberOfLines={1} adjustsFontSizeToFit>{t('history.stepsViaHealth')}</Text>
                </View>
              ) : (
                <View style={[styles.healthSource, { marginTop: SPACING.xs, marginBottom: SPACING.md }]}>
                  <Ionicons name="heart-outline" size={11} color={theme.textSecondary} />
                  <Text style={[styles.healthSourceText, { color: theme.textSecondary }]} numberOfLines={2} adjustsFontSizeToFit>
                    {t('history.connectHealthForSteps')}
                  </Text>
                </View>
              )}
            </Animated.View>

            {/* Last 7 Days */}
            <Animated.View style={getEntranceStyle(2)}>
              <View style={styles.sectionHeader}>
                <Text style={[styles.sectionTitle, { color: theme.text }]}>{t('history.last7Days')}</Text>
              </View>
              <View style={[styles.weekCard, { backgroundColor: theme.card }]}>
                <View style={styles.weekDotsRow}>
                  {last7Days.map((day, i) => (
                    <View key={i} style={styles.dayColumn}>
                      <View style={[
                        styles.dayCircle,
                        { backgroundColor: day.isToday ? `${theme.primary}15` : 'transparent' },
                        day.isToday && { borderColor: theme.primary, borderWidth: 1.5 },
                      ]}>
                        <Text style={[
                          styles.dayLetter,
                          { color: day.isToday ? theme.primary : theme.textSecondary },
                        ]}>
                          {day.label}
                        </Text>
                      </View>
                      {day.hasActivity ? (
                        <Ionicons name="flame" size={14} color={theme.primary} />
                      ) : (
                        <View style={[styles.dayDot, { backgroundColor: `${theme.textSecondary}30` }]} />
                      )}
                    </View>
                  ))}
                </View>
              </View>
            </Animated.View>

            {/* Last Workout */}
            {lastWorkout && (
              <Animated.View style={getEntranceStyle(3)}>
                <View style={styles.sectionHeader}>
                  <Text style={[styles.sectionTitle, { color: theme.text }]}>{t('history.lastWorkout')}</Text>
                </View>
                <TouchableOpacity
                  style={[styles.lastWorkoutCard, { backgroundColor: theme.card }]}
                  activeOpacity={0.7}
                  onPress={handleLastWorkoutPress}
                >
                  <View style={styles.lastWorkoutMain}>
                    <View style={styles.lastWorkoutInfo}>
                      <Text style={[styles.lastWorkoutDate, { color: theme.text }]}>
                        {new Date(lastWorkout.date + 'T00:00:00').toLocaleDateString(i18n.language, { month: 'short', day: 'numeric' })}
                      </Text>
                      <View style={styles.lastWorkoutStats}>
                        <View style={styles.lastWorkoutStat}>
                          <Ionicons name="timer-outline" size={14} color={theme.textSecondary} />
                          <Text style={[styles.lastWorkoutStatText, { color: theme.textSecondary }]}>
                            {formatTotalTime(lastWorkout.totalDuration)}
                          </Text>
                        </View>
                        <View style={styles.lastWorkoutStat}>
                          <Ionicons name="repeat" size={14} color={theme.textSecondary} />
                          <Text style={[styles.lastWorkoutStatText, { color: theme.textSecondary }]}>
                            {lastWorkout.rounds}/{lastWorkout.totalRounds}
                          </Text>
                        </View>
                        <View style={styles.lastWorkoutStat}>
                          <Ionicons name="flame" size={14} color={theme.textSecondary} />
                          <Text style={[styles.lastWorkoutStatText, { color: theme.textSecondary }]}>
                            {lastWorkout.estimatedCalories}
                          </Text>
                        </View>
                      </View>
                    </View>
                    <View style={[
                      styles.completedBadge,
                      { backgroundColor: lastWorkout.completed ? `${theme.primary}18` : `${theme.textSecondary}18` },
                    ]}>
                      <Text style={[
                        styles.completedBadgeText,
                        { color: lastWorkout.completed ? theme.primary : theme.textSecondary },
                      ]}>
                        {lastWorkout.completed ? t('history.completed') : t('history.incomplete')}
                      </Text>
                    </View>
                  </View>
                </TouchableOpacity>
              </Animated.View>
            )}

            {/* Calendar */}
            <Animated.View style={[{ opacity: calendarOpacity }, getEntranceStyle(4)]}>
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

            {/* Selected day sessions */}
            {selectedDate && (
              <View style={styles.sessionsSection}>
                <View style={styles.sectionHeader}>
                  <Text style={[styles.sectionTitle, { color: theme.text }]}>
                    {new Date(selectedDate + 'T00:00:00').toLocaleDateString(undefined, { month: 'short', day: 'numeric' })}
                  </Text>
                </View>
                {selectedDaySessions.length > 0 ? (
                  selectedDaySessions.map((session) => (
                    <SessionCard key={session.id} session={session} />
                  ))
                ) : (
                  <Text style={[styles.noWalksOnDay, { color: theme.textSecondary }]}>
                    {t('history.noWalksOnDay')}
                  </Text>
                )}
              </View>
            )}

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
    fontSize: 34,
    fontWeight: '800',
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
    fontWeight: '700',
    color: COLORS.white,
  },

  // Empty state
  emptyContainer: { alignItems: 'center', justifyContent: 'center', paddingTop: 100, paddingHorizontal: SPACING.xl },
  emptyIconCircle: { width: 100, height: 100, borderRadius: 50, alignItems: 'center', justifyContent: 'center', marginBottom: SPACING.lg, shadowColor: '#000', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.08, shadowRadius: 12, elevation: 4 },
  emptyTitle: { fontSize: FONT_SIZE.xl, fontWeight: '700', marginBottom: SPACING.sm },
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
    fontWeight: '700',
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
  sectionTitle: { fontSize: FONT_SIZE.lg, fontWeight: '700' },

  // Today card
  todayCard: {
    flexDirection: 'row',
    alignItems: 'center',
    marginHorizontal: SPACING.lg,
    padding: SPACING.lg,
    borderRadius: BORDER_RADIUS.xl,
    gap: SPACING.lg,
    marginBottom: SPACING.lg,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.06,
    shadowRadius: 8,
    elevation: 2,
  },
  ringSteps: {
    fontSize: FONT_SIZE.xl,
    fontWeight: '800',
  },
  ringGoal: {
    fontSize: FONT_SIZE.sm,
    fontWeight: '500',
    marginTop: -2,
  },
  ringLabel: {
    fontSize: FONT_SIZE.xs,
    fontWeight: '500',
    marginTop: 2,
  },
  todayStats: {
    flex: 1,
    gap: SPACING.sm,
  },
  todayStatsGrid: {
    flexDirection: 'row',
    gap: SPACING.sm,
  },
  todayStatCell: {
    flex: 1,
    alignItems: 'center',
    gap: 3,
    paddingVertical: SPACING.sm,
  },
  todayStatValue: {
    fontSize: FONT_SIZE.lg,
    fontWeight: '700',
  },
  todayStatLabel: {
    fontSize: FONT_SIZE.xs,
    fontWeight: '500',
  },

  // Week dots
  weekCard: {
    marginHorizontal: SPACING.lg,
    paddingVertical: SPACING.md,
    paddingHorizontal: SPACING.sm,
    borderRadius: BORDER_RADIUS.xl,
    marginBottom: SPACING.lg,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.06,
    shadowRadius: 8,
    elevation: 2,
  },
  weekDotsRow: {
    flexDirection: 'row',
    justifyContent: 'space-around',
  },
  dayColumn: {
    alignItems: 'center',
    gap: 6,
  },
  dayCircle: {
    width: 32,
    height: 32,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
  },
  dayLetter: {
    fontSize: FONT_SIZE.xs,
    fontWeight: '600',
  },
  dayDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
  },

  // Last workout
  lastWorkoutCard: {
    marginHorizontal: SPACING.lg,
    padding: SPACING.md,
    borderRadius: BORDER_RADIUS.xl,
    marginBottom: SPACING.lg,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.06,
    shadowRadius: 8,
    elevation: 2,
  },
  lastWorkoutMain: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  lastWorkoutInfo: {
    flex: 1,
    gap: SPACING.xs,
  },
  lastWorkoutDate: {
    fontSize: FONT_SIZE.md,
    fontWeight: '700',
  },
  lastWorkoutStats: {
    flexDirection: 'row',
    gap: SPACING.md,
  },
  lastWorkoutStat: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  lastWorkoutStatText: {
    fontSize: FONT_SIZE.sm,
    fontWeight: '500',
  },
  completedBadge: {
    paddingHorizontal: SPACING.sm,
    paddingVertical: SPACING.xs,
    borderRadius: BORDER_RADIUS.full,
  },
  completedBadgeText: {
    fontSize: FONT_SIZE.xs,
    fontWeight: '600',
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

  // Sessions
  sessionsSection: { paddingHorizontal: SPACING.lg },
  noWalksOnDay: { fontSize: FONT_SIZE.sm, textAlign: 'center', paddingVertical: SPACING.lg },

  // Health attribution
  healthSource: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 4,
    marginTop: SPACING.xs,
    paddingBottom: SPACING.sm,
  },
  healthSourceText: {
    fontSize: FONT_SIZE.xs,
  },
});
