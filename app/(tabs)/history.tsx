import React, { useState, useMemo, useCallback, useEffect, useRef } from 'react';
import { View, Text, ScrollView, StyleSheet, Animated, RefreshControl, TouchableOpacity } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { useTranslation } from 'react-i18next';
import { router } from 'expo-router';
import { useSessionsStore, useSettingsStore } from '../../src/store';
import { useThemeColors } from '../../src/hooks/useColorScheme';
import { CalendarHeatmap } from '../../src/components/CalendarHeatmap';
import { getTechniqueById } from '../../src/constants/techniques';
import { formatTime, getToday } from '../../src/utils/time';
import { COLORS, SPACING, FONT_SIZE, BORDER_RADIUS, FONTS } from '../../src/constants';
import type { BreathingSession } from '../../src/types';

const MOOD_EMOJI: Record<string, string> = {
  calm: '\u{1F60C}',
  energized: '\u{26A1}',
  focused: '\u{1F3AF}',
  sleepy: '\u{1F634}',
};

function formatTimeOfDay(isoString: string): string {
  const d = new Date(isoString);
  return d.toLocaleTimeString(undefined, { hour: 'numeric', minute: '2-digit' });
}

export default function HistoryScreen() {
  const { t, i18n } = useTranslation();
  const theme = useThemeColors();
  const insets = useSafeAreaInsets();
  const stats = useSessionsStore((s) => s.stats);
  const allSessions = useSessionsStore((s) => s.sessions);
  const hydrate = useSessionsStore((s) => s.hydrate);
  const isPro = useSettingsStore((s) => s.isPro);

  // Free users see last 7 days only
  const sessions = useMemo(() => {
    if (isPro) return allSessions;
    const cutoff = new Date();
    cutoff.setDate(cutoff.getDate() - 7);
    const cutoffStr = cutoff.toISOString().split('T')[0];
    return allSessions.filter((s) => s.date >= cutoffStr);
  }, [allSessions, isPro]);

  const now = new Date();
  const [year, setYear] = useState(now.getFullYear());
  const [month, setMonth] = useState(now.getMonth());
  const [selectedDate, setSelectedDate] = useState<string | null>(getToday());
  const [refreshing, setRefreshing] = useState(false);

  const calendarOpacity = useRef(new Animated.Value(1)).current;

  const activeDays = useMemo(() => {
    const days = new Set<string>();
    for (const s of sessions) days.add(s.date);
    return days;
  }, [sessions]);

  const todayStr = useMemo(() => getToday(), []);
  const todaySessions = useMemo(() => sessions.filter((s) => s.date === todayStr), [sessions, todayStr]);
  const todayMinutes = useMemo(
    () => todaySessions.reduce((sum, s) => sum + Math.round(s.totalDuration / 60), 0),
    [todaySessions],
  );

  const selectedDaySessions = useMemo(() => {
    if (!selectedDate) return [];
    return sessions.filter((s) => s.date === selectedDate);
  }, [sessions, selectedDate]);

  const favoriteTechnique = useMemo(() => {
    if (!stats.favoriteTechniqueId) return null;
    return getTechniqueById(stats.favoriteTechniqueId) ?? null;
  }, [stats.favoriteTechniqueId]);

  // Weekly sessions data for bar chart (last 7 weeks)
  const weeklyData = useMemo(() => {
    const weeks: { label: string; count: number }[] = [];
    const today = new Date();
    for (let w = 6; w >= 0; w--) {
      const weekStart = new Date(today);
      weekStart.setDate(today.getDate() - (w * 7 + today.getDay()));
      const weekEnd = new Date(weekStart);
      weekEnd.setDate(weekStart.getDate() + 6);
      const startStr = weekStart.toISOString().split('T')[0];
      const endStr = weekEnd.toISOString().split('T')[0];
      const count = sessions.filter((s) => s.date >= startStr && s.date <= endStr).length;
      const label = `${weekStart.getMonth() + 1}/${weekStart.getDate()}`;
      weeks.push({ label, count });
    }
    return weeks;
  }, [sessions]);

  const animateMonthChange = useCallback((changeFn: () => void) => {
    Animated.timing(calendarOpacity, { toValue: 0.3, duration: 120, useNativeDriver: true }).start(() => {
      changeFn();
      Animated.timing(calendarOpacity, { toValue: 1, duration: 200, useNativeDriver: true }).start();
    });
  }, [calendarOpacity]);

  const handlePrevMonth = useCallback(() => {
    animateMonthChange(() => {
      if (month === 0) { setMonth(11); setYear((y) => y - 1); }
      else setMonth((m) => m - 1);
    });
  }, [month, animateMonthChange]);

  const handleNextMonth = useCallback(() => {
    const isCurrentMonth = year === now.getFullYear() && month === now.getMonth();
    if (isCurrentMonth) return;
    animateMonthChange(() => {
      if (month === 11) { setMonth(0); setYear((y) => y + 1); }
      else setMonth((m) => m + 1);
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
    } catch { /* offline */ }
    setRefreshing(false);
  }, [hydrate]);

  const isEmpty = stats.totalSessions === 0;

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
      <View key={session.id} style={[styles.sessionCard, { backgroundColor: theme.card }]}>
        <View style={styles.sessionCardHeader}>
          <View style={styles.sessionTechniqueRow}>
            <View style={[styles.techniqueDot, { backgroundColor: techniqueColor }]} />
            <Ionicons name={techniqueIcon} size={16} color={techniqueColor} style={{ marginRight: 6 }} />
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
          {moodEmoji && <Text style={{ fontSize: 14 }}>{moodEmoji}</Text>}
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
    <View style={[styles.container, { backgroundColor: theme.background }]}>
      <ScrollView
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={theme.primary} colors={[theme.primary]} />
        }
      >
        {/* ── Hero gradient header ── */}
        <LinearGradient
          colors={
            theme.isDark
              ? ['#4A90D9', '#7FBFDF', theme.background]
              : ['#3A73B0', '#4A90D9', theme.background]
          }
          start={{ x: 0.5, y: 0 }}
          end={{ x: 0.5, y: 1 }}
          style={[styles.heroArea, { paddingTop: insets.top + 12 }]}
        >
          {/* Title + streak */}
          <View style={styles.heroTitleRow}>
            <Text style={styles.heroTitle}>{t('history.title')}</Text>
            {stats.currentStreak > 0 && (
              <View style={styles.streakBadge}>
                <Ionicons name="flame" size={14} color="#FFFFFF" />
                <Text style={styles.streakText}>{stats.currentStreak}</Text>
              </View>
            )}
          </View>

          {/* Today stats */}
          <View style={styles.heroStatsRow}>
            <View style={styles.heroStat}>
              <Text style={styles.heroStatValue}>{todayMinutes}</Text>
              <Text style={styles.heroStatLabel}>{t('history.minutesToday')}</Text>
            </View>
            <View style={styles.heroStatDivider} />
            <View style={styles.heroStat}>
              <Text style={styles.heroStatValue}>{todaySessions.length}</Text>
              <Text style={styles.heroStatLabel}>{t('history.sessionsToday')}</Text>
            </View>
            <View style={styles.heroStatDivider} />
            <View style={styles.heroStat}>
              <Text style={styles.heroStatValue}>{stats.currentStreak}</Text>
              <Text style={styles.heroStatLabel}>{t('history.streakDays')}</Text>
            </View>
          </View>
        </LinearGradient>

        {isEmpty ? (
          <View style={styles.emptyContainer}>
            <View style={[styles.emptyIconCircle, { backgroundColor: theme.card }]}>
              <Ionicons name="leaf-outline" size={48} color={theme.primary} />
            </View>
            <Text style={[styles.emptyTitle, { color: theme.text }]}>{t('history.noSessionsYet')}</Text>
            <Text style={[styles.emptySubtitle, { color: theme.textSecondary }]}>{t('history.noSessionsSubtitle')}</Text>
            <TouchableOpacity
              style={[styles.ctaBtn, { backgroundColor: theme.primary }]}
              activeOpacity={0.85}
              onPress={() => router.push('/(tabs)')}
            >
              <Ionicons name="play" size={20} color="#FFFFFF" />
              <Text style={styles.ctaBtnText}>{t('history.startSession')}</Text>
            </TouchableOpacity>
          </View>
        ) : (
          <>
            {/* Calendar */}
            <Animated.View style={{ opacity: calendarOpacity }}>
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
              <View style={styles.section}>
                <Text style={[styles.sectionTitle, { color: theme.text }]}>
                  {new Date(selectedDate + 'T00:00:00').toLocaleDateString(i18n.language, {
                    month: 'short',
                    day: 'numeric',
                  })}
                </Text>
                {selectedDaySessions.length > 0 ? (
                  selectedDaySessions.map(renderSessionCard)
                ) : (
                  <Text style={[styles.noSessionsOnDay, { color: theme.textSecondary }]}>
                    {t('history.noSessionsOnDay')}
                  </Text>
                )}
              </View>
            )}

            {/* Weekly sessions chart (Pro) */}
            {isPro && sessions.length > 0 && (
              <View style={styles.section}>
                <Text style={[styles.sectionTitle, { color: theme.text }]}>{t('history.weeklyActivity')}</Text>
                <View style={[styles.chartCard, { backgroundColor: theme.card }]}>
                  <View style={styles.barChartRow}>
                    {weeklyData.map((week, idx) => {
                      const maxCount = Math.max(...weeklyData.map((w) => w.count), 1);
                      const barHeight = Math.max(4, (week.count / maxCount) * 80);
                      return (
                        <View key={idx} style={styles.barCol}>
                          <View
                            style={[
                              styles.bar,
                              {
                                height: barHeight,
                                backgroundColor: week.count > 0 ? COLORS.primary : (theme.isDark ? 'rgba(255,255,255,0.08)' : 'rgba(0,0,0,0.06)'),
                              },
                            ]}
                          />
                          <Text style={[styles.barLabel, { color: theme.textSecondary }]}>
                            {week.label}
                          </Text>
                          {week.count > 0 && (
                            <Text style={[styles.barValue, { color: theme.text }]}>
                              {week.count}
                            </Text>
                          )}
                        </View>
                      );
                    })}
                  </View>
                </View>
              </View>
            )}

            {/* Pro upsell for full history */}
            {!isPro && (
              <TouchableOpacity
                style={[styles.proUpsell, { backgroundColor: COLORS.primary + '12' }]}
                onPress={() => router.push('/paywall')}
                activeOpacity={0.8}
              >
                <Ionicons name="lock-closed" size={16} color={COLORS.primary} />
                <Text style={[styles.proUpsellText, { color: COLORS.primary }]}>
                  {t('history.unlockFullHistory')}
                </Text>
                <Ionicons name="chevron-forward" size={16} color={COLORS.primary} />
              </TouchableOpacity>
            )}

            {/* All-time stats */}
            <View style={styles.section}>
              <Text style={[styles.sectionTitle, { color: theme.text }]}>{t('history.allTimeStats')}</Text>
              <View style={[styles.allTimeCard, { backgroundColor: theme.card }]}>
                <View style={styles.allTimeRow}>
                  <View style={styles.allTimeStat}>
                    <Text style={[styles.allTimeValue, { color: theme.text }]}>{stats.totalSessions}</Text>
                    <Text style={[styles.allTimeLabel, { color: theme.textSecondary }]}>{t('history.totalSessions')}</Text>
                  </View>
                  <View style={styles.allTimeStat}>
                    <Text style={[styles.allTimeValue, { color: theme.text }]}>{stats.totalMinutes}</Text>
                    <Text style={[styles.allTimeLabel, { color: theme.textSecondary }]}>{t('history.totalMinutes')}</Text>
                  </View>
                </View>
                <View style={styles.allTimeRow}>
                  <View style={styles.allTimeStat}>
                    <Text style={[styles.allTimeValue, { color: theme.text }]}>{stats.longestStreak}</Text>
                    <Text style={[styles.allTimeLabel, { color: theme.textSecondary }]}>{t('history.longestStreak')}</Text>
                  </View>
                  <View style={styles.allTimeStat}>
                    {favoriteTechnique ? (
                      <>
                        <Ionicons name={favoriteTechnique.icon as keyof typeof Ionicons.glyphMap} size={22} color={favoriteTechnique.color} />
                        <Text style={[styles.allTimeValue, { color: theme.text, fontSize: 15 }]} numberOfLines={1}>
                          {t(favoriteTechnique.nameKey)}
                        </Text>
                        <Text style={[styles.allTimeLabel, { color: theme.textSecondary }]}>{t('history.favoriteTechnique')}</Text>
                      </>
                    ) : (
                      <>
                        <Text style={[styles.allTimeValue, { color: theme.text }]}>-</Text>
                        <Text style={[styles.allTimeLabel, { color: theme.textSecondary }]}>{t('history.favoriteTechnique')}</Text>
                      </>
                    )}
                  </View>
                </View>
                {stats.bestRetention > 0 && (
                  <View style={styles.allTimeRow}>
                    <View style={styles.allTimeStat}>
                      <Text style={[styles.allTimeValue, { color: theme.text }]}>{formatTime(stats.bestRetention)}</Text>
                      <Text style={[styles.allTimeLabel, { color: theme.textSecondary }]}>{t('history.bestRetention')}</Text>
                    </View>
                    <View style={styles.allTimeStat}>
                      <Text style={[styles.allTimeValue, { color: theme.text }]}>{formatTime(stats.avgRetention)}</Text>
                      <Text style={[styles.allTimeLabel, { color: theme.textSecondary }]}>{t('history.avgRetention')}</Text>
                    </View>
                  </View>
                )}
              </View>
            </View>
          </>
        )}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  scrollContent: { paddingBottom: SPACING.xxl + SPACING.lg },

  // Hero gradient
  heroArea: {
    paddingBottom: 28,
    paddingHorizontal: 24,
  },
  heroTitleRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 20,
  },
  heroTitle: {
    fontSize: 28,
    fontFamily: FONTS.heavy,
    color: '#FFFFFF',
    letterSpacing: -0.5,
  },
  streakBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: BORDER_RADIUS.full,
    backgroundColor: 'rgba(255,255,255,0.25)',
  },
  streakText: { fontSize: 14, fontFamily: FONTS.bold, color: '#FFFFFF' },

  // Hero stats
  heroStatsRow: {
    flexDirection: 'row',
    backgroundColor: 'rgba(0,0,0,0.15)',
    borderRadius: 20,
    paddingVertical: 16,
    paddingHorizontal: 8,
  },
  heroStat: {
    flex: 1,
    alignItems: 'center',
  },
  heroStatValue: {
    fontSize: 26,
    fontFamily: FONTS.heavy,
    color: '#FFFFFF',
    marginBottom: 2,
  },
  heroStatLabel: {
    fontSize: 11,
    fontFamily: FONTS.medium,
    color: 'rgba(255,255,255,0.85)',
    textAlign: 'center',
  },
  heroStatDivider: {
    width: 1,
    backgroundColor: 'rgba(255,255,255,0.3)',
    marginVertical: 4,
  },

  // Empty state
  emptyContainer: {
    alignItems: 'center',
    paddingTop: 60,
    paddingHorizontal: SPACING.xl,
  },
  emptyIconCircle: {
    width: 100,
    height: 100,
    borderRadius: 50,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: SPACING.lg,
  },
  emptyTitle: { fontSize: 20, fontFamily: FONTS.bold, marginBottom: SPACING.sm },
  emptySubtitle: { fontSize: 15, textAlign: 'center', lineHeight: 22, marginBottom: 24 },
  ctaBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    paddingVertical: 14,
    paddingHorizontal: 32,
    borderRadius: BORDER_RADIUS.full,
  },
  ctaBtnText: {
    fontSize: 16,
    fontFamily: FONTS.bold,
    color: '#FFFFFF',
  },

  // Sections
  section: {
    marginBottom: SPACING.lg,
  },
  sectionTitle: {
    fontSize: 17,
    fontFamily: FONTS.bold,
    paddingHorizontal: SPACING.lg,
    marginBottom: SPACING.sm,
  },

  // Calendar
  calendarCard: {
    marginHorizontal: SPACING.lg,
    paddingVertical: SPACING.lg,
    borderRadius: 20,
    marginBottom: SPACING.lg,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.06,
    shadowRadius: 8,
    elevation: 2,
  },

  // Session cards
  noSessionsOnDay: {
    fontSize: 14,
    textAlign: 'center',
    paddingVertical: SPACING.lg,
  },
  sessionCard: {
    marginHorizontal: SPACING.lg,
    padding: 14,
    borderRadius: 16,
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
    marginBottom: 6,
  },
  sessionTechniqueRow: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  techniqueDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    marginRight: 6,
  },
  techniqueName: {
    fontSize: 15,
    fontFamily: FONTS.semibold,
    flex: 1,
  },
  sessionTime: {
    fontSize: 13,
    fontFamily: FONTS.medium,
    marginLeft: SPACING.sm,
  },
  sessionDetails: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING.md,
  },
  sessionStat: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  sessionStatText: {
    fontSize: 13,
    fontFamily: FONTS.medium,
  },
  incompleteBadge: {
    alignSelf: 'flex-start',
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: BORDER_RADIUS.full,
    marginTop: 6,
  },
  incompleteBadgeText: {
    fontSize: 11,
    fontFamily: FONTS.semibold,
  },

  // All-time stats
  allTimeCard: {
    marginHorizontal: SPACING.lg,
    padding: SPACING.lg,
    borderRadius: 20,
    gap: SPACING.md,
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
    fontSize: 22,
    fontFamily: FONTS.heavy,
  },
  allTimeLabel: {
    fontSize: 11,
    fontFamily: FONTS.medium,
    textAlign: 'center',
  },
  // Charts
  chartCard: {
    marginHorizontal: SPACING.lg,
    padding: SPACING.md,
    borderRadius: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.06,
    shadowRadius: 8,
    elevation: 2,
  },
  barChartRow: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    justifyContent: 'space-between',
    height: 110,
    gap: 4,
  },
  barCol: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'flex-end',
  },
  bar: {
    width: '70%',
    borderRadius: 4,
    minHeight: 4,
    marginBottom: 4,
  },
  barLabel: {
    fontSize: 9,
    fontFamily: FONTS.medium,
  },
  barValue: {
    fontSize: 10,
    fontFamily: FONTS.bold,
    position: 'absolute',
    top: -2,
  },

  proUpsell: {
    flexDirection: 'row',
    alignItems: 'center',
    marginHorizontal: SPACING.lg,
    marginBottom: SPACING.md,
    paddingHorizontal: SPACING.md,
    paddingVertical: SPACING.sm + 2,
    borderRadius: BORDER_RADIUS.lg,
    gap: 8,
  },
  proUpsellText: {
    flex: 1,
    fontSize: FONT_SIZE.sm,
    fontFamily: FONTS.semibold,
  },
});
