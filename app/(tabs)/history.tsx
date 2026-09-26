import React, { useState, useMemo, useCallback, useRef } from 'react';
import { View, Text, Image, ScrollView, StyleSheet, Animated, RefreshControl, TouchableOpacity, ImageBackground } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { useTranslation } from 'react-i18next';
import { router } from 'expo-router';
import { useSessionsStore } from '../../src/store';
import { useThemeColors } from '../../src/hooks/useColorScheme';
import { CalendarHeatmap } from '../../src/components/CalendarHeatmap';
import { getTechniqueById } from '../../src/constants/techniques';
import { formatTime, getToday } from '../../src/utils/time';
import { COLORS, SPACING, FONT_SIZE, BORDER_RADIUS, FONTS } from '../../src/constants';
import { MOOD_EMOJI_IMAGES } from '../../src/constants/moodEmoji';
import type { BreathingSession } from '../../src/types';

// Must match the same constant in awards.tsx and settings.tsx — see the note there.
const HERO_CONTENT_HEIGHT = 100;

// Fixed display order for the mood distribution pills — most-logged first is
// handled at render time via sorting, this just sets a stable tie-break order.
const MOOD_ORDER = ['happy', 'calm', 'energized', 'focused', 'anxious', 'sleepy'] as const;

const MOOD_META: Record<string, { color: string; labelKey: string }> = {
  happy: { color: '#F5A623', labelKey: 'summary.moodHappy' },
  calm: { color: '#7BC4A8', labelKey: 'summary.moodCalm' },
  energized: { color: '#FF6B6B', labelKey: 'summary.moodEnergized' },
  focused: { color: '#4A90D9', labelKey: 'summary.moodFocused' },
  anxious: { color: '#E85D4A', labelKey: 'summary.moodAnxious' },
  sleepy: { color: '#7B68AE', labelKey: 'summary.moodSleepy' },
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

  // Progress is fully free — no history window restriction.
  const sessions = allSessions;

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

  const monthSessions = useMemo(() => {
    const monthStr = `${year}-${String(month + 1).padStart(2, '0')}`;
    return sessions.filter(s => s.date.startsWith(monthStr)).length;
  }, [sessions, year, month]);


  const todayStr = useMemo(() => getToday(), []);
  const hadSessionToday = useMemo(() => allSessions.some(s => s.date === todayStr), [allSessions, todayStr]);

  const selectedDaySessions = useMemo(() => {
    if (!selectedDate) return [];
    return sessions.filter((s) => s.date === selectedDate);
  }, [sessions, selectedDate]);


  // Technique distribution
  const techniqueDistribution = useMemo(() => {
    const counts: Record<string, number> = {};
    for (const s of sessions) {
      counts[s.techniqueId] = (counts[s.techniqueId] || 0) + 1;
    }
    const sorted = Object.entries(counts)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 4)
      .map(([id, count]) => {
        const tech = getTechniqueById(id);
        return {
          id,
          name: tech ? t(tech.nameKey) : id,
          color: tech?.color ?? COLORS.primary,
          count,
        };
      });
    const total = sorted.reduce((sum, item) => sum + item.count, 0);
    return { items: sorted, total };
  }, [sessions, t]);

  // Personal bests
  const personalBests = useMemo(() => {
    if (sessions.length === 0) return null;
    const longestSession = Math.max(...sessions.map((s) => s.totalDuration));
    return { longestSession };
  }, [sessions]);

  // Mood distribution — share of logged moods per emotion, across all sessions
  const moodDistribution = useMemo(() => {
    const counts: Record<string, number> = {};
    let total = 0;
    for (const s of sessions) {
      if (s.moodAfter) {
        counts[s.moodAfter] = (counts[s.moodAfter] || 0) + 1;
        total++;
      }
    }
    const items = MOOD_ORDER
      .filter((mood) => counts[mood] > 0)
      .map((mood) => ({ mood, count: counts[mood], percent: total > 0 ? counts[mood] / total : 0 }))
      .sort((a, b) => b.count - a.count);
    return { items, total };
  }, [sessions]);

  // Daily sessions data for week chart (last 7 days, uses allSessions to match calendar)
  const weeklyData = useMemo(() => {
    const days: { label: string; count: number; dateStr: string }[] = [];
    const today = new Date();
    for (let d = 6; d >= 0; d--) {
      const day = new Date(today.getFullYear(), today.getMonth(), today.getDate() - d);
      const dateStr = `${day.getFullYear()}-${String(day.getMonth() + 1).padStart(2, '0')}-${String(day.getDate()).padStart(2, '0')}`;
      const count = allSessions.filter((s) => s.date === dateStr).length;
      const label = day.toLocaleDateString(i18n.language, { weekday: 'narrow' });
      days.push({ label, count, dateStr });
    }
    return days;
  }, [allSessions, i18n.language]);

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

  // stats.totalSessions only counts completed sessions (see computeStats in
  // sessionsStore) — gating the whole screen on it meant a user whose first
  // session(s) were stopped early (completed: false) saw the "no sessions
  // yet" empty state forever, even though those sessions were saved and
  // should still show up in the calendar / day list below.
  const isEmpty = allSessions.length === 0;

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
    const moodEmojiSrc = session.moodAfter ? MOOD_EMOJI_IMAGES[session.moodAfter] : null;

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
          {moodEmojiSrc && <Image source={moodEmojiSrc} style={{ width: 16, height: 16 }} resizeMode="contain" />}
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
        {/* ── Hero header ── */}
        <ImageBackground
          source={require('../../assets/bg_focus.webp')}
          resizeMode="cover"
          style={[styles.heroArea, { paddingTop: insets.top + SPACING.sm, height: insets.top + HERO_CONTENT_HEIGHT }]}
        >
          {/* 4 stops (vs. the default 3 evenly-spaced ones) so the fade to
              solid theme.background happens gradually across the hero's
              full height instead of mostly in its last 50% — that's what
              was reading as an abrupt cut against the image in light mode. */}
          <LinearGradient
            colors={
              theme.isDark
                ? ['#000000AA', '#00000055', `${theme.background}CC`, `${theme.background}FF`]
                : ['#00000077', '#00000033', `${theme.background}99`, `${theme.background}FF`]
            }
            locations={[0, 0.35, 0.7, 1]}
            start={{ x: 0.5, y: 0 }}
            end={{ x: 0.5, y: 1 }}
            style={StyleSheet.absoluteFill}
          />

          {/* Title — streak/session totals already live in the banner and
              Personal Bests below, so the hero doesn't repeat them. */}
          <Text style={styles.heroTitle}>{t('history.title')}</Text>
        </ImageBackground>

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
            {/* 1. Streak / Motivation Banner — same dark-card + tinted-icon
                language as Personal Bests/Mood below, instead of a standalone
                saturated gradient that didn't match the rest of the screen. */}
            <TouchableOpacity
              activeOpacity={0.85}
              onPress={() => router.push('/(tabs)')}
              style={[styles.streakBanner, { backgroundColor: theme.card }]}
            >
              {hadSessionToday ? (
                <>
                  <View style={[styles.streakIconCircle, { backgroundColor: theme.isDark ? 'rgba(123,196,168,0.15)' : 'rgba(123,196,168,0.12)' }]}>
                    <Ionicons name="checkmark" size={22} color="#7BC4A8" />
                  </View>
                  <View style={{ flex: 1 }}>
                    <Text style={[styles.streakBannerTitle, { color: theme.text }]}>
                      {stats.currentStreak > 1
                        ? t('progress.streakBanner', { count: stats.currentStreak })
                        : t('progress.doneToday', { defaultValue: 'Done for today!' })}
                    </Text>
                    <Text style={[styles.streakBannerSub, { color: theme.textSecondary }]}>
                      {stats.longestStreak > stats.currentStreak
                        ? t('progress.bestStreakWas', { count: stats.longestStreak })
                        : t('progress.streakNewRecord', { defaultValue: 'New personal record!' })}
                    </Text>
                  </View>
                  {stats.currentStreak > 0 && (
                    <View style={[styles.streakCountBubble, { backgroundColor: theme.isDark ? 'rgba(245,166,35,0.15)' : 'rgba(245,166,35,0.12)' }]}>
                      <Ionicons name="flame" size={16} color="#F5A623" />
                      <Text style={[styles.streakBannerCount, { color: '#F5A623' }]}>{stats.currentStreak}</Text>
                    </View>
                  )}
                </>
              ) : (
                <>
                  <View style={[styles.streakIconCircle, { backgroundColor: theme.isDark ? 'rgba(245,166,35,0.15)' : 'rgba(245,166,35,0.12)' }]}>
                    <Ionicons name="flame" size={22} color="#F5A623" />
                  </View>
                  <View style={{ flex: 1 }}>
                    <Text style={[styles.streakBannerTitle, { color: theme.text }]}>
                      {stats.currentStreak > 0
                        ? t('progress.streakBanner', { count: stats.currentStreak })
                        : t('progress.startStreak', { defaultValue: 'Start your streak today!' })}
                    </Text>
                    <Text style={[styles.streakBannerSub, { color: theme.textSecondary }]}>
                      {t('progress.streakKeepGoing', { defaultValue: 'Keep your streak alive!' })}
                    </Text>
                  </View>
                  <Ionicons name="chevron-forward" size={22} color={theme.textSecondary} />
                </>
              )}
            </TouchableOpacity>

            {/* 2. Personal Bests */}
            {personalBests && (
              <View style={[styles.newCard, { backgroundColor: theme.card }]}>
                <Text style={[styles.newCardTitle, { color: theme.text }]}>
                  {t('progress.personalBests', { defaultValue: 'Personal Bests' })}
                </Text>
                <View style={styles.bestsGrid}>
                  <View style={[styles.bestItem, { backgroundColor: theme.isDark ? 'rgba(74,144,217,0.1)' : 'rgba(74,144,217,0.08)' }]}>
                    <Ionicons name="timer" size={22} color="#4A90D9" />
                    <Text style={[styles.bestValue, { color: theme.text }]}>
                      {formatTime(personalBests.longestSession)}
                    </Text>
                    <Text style={[styles.bestLabel, { color: theme.textSecondary }]}>
                      {t('progress.longestSession', { defaultValue: 'Longest Session' })}
                    </Text>
                  </View>
                  <View style={[styles.bestItem, { backgroundColor: theme.isDark ? 'rgba(245,166,35,0.1)' : 'rgba(245,166,35,0.08)' }]}>
                    <Ionicons name="flame" size={22} color="#F5A623" />
                    <Text style={[styles.bestValue, { color: theme.text }]}>
                      {stats.longestStreak}
                    </Text>
                    <Text style={[styles.bestLabel, { color: theme.textSecondary }]}>
                      {t('progress.bestStreak', { defaultValue: 'Best Streak' })}
                    </Text>
                  </View>
                  <View style={[styles.bestItem, { backgroundColor: theme.isDark ? 'rgba(123,196,168,0.1)' : 'rgba(123,196,168,0.08)' }]}>
                    <Ionicons name="time" size={22} color="#7BC4A8" />
                    <Text style={[styles.bestValue, { color: theme.text }]}>
                      {stats.totalMinutes}
                    </Text>
                    <Text style={[styles.bestLabel, { color: theme.textSecondary }]}>
                      {t('progress.totalMinutes', { defaultValue: 'Total Minutes' })}
                    </Text>
                  </View>
                  <View style={[styles.bestItem, { backgroundColor: theme.isDark ? 'rgba(123,104,174,0.1)' : 'rgba(123,104,174,0.08)' }]}>
                    <Ionicons name="leaf" size={22} color="#7B68AE" />
                    <Text style={[styles.bestValue, { color: theme.text }]}>
                      {stats.totalSessions}
                    </Text>
                    <Text style={[styles.bestLabel, { color: theme.textSecondary }]}>
                      {t('progress.totalSessions', { defaultValue: 'Total Sessions' })}
                    </Text>
                  </View>
                </View>
              </View>
            )}

            {/* 3. Mood distribution — one pill per emotion, filled to its share of logged moods */}
            {moodDistribution.items.length > 0 && (
              <View style={[styles.newCard, { backgroundColor: theme.card }]}>
                <Text style={[styles.newCardTitle, { color: theme.text }]}>
                  {t('progress.moodHistory', { defaultValue: 'Your Mood' })}
                </Text>
                <View style={styles.moodPillsRow}>
                  {moodDistribution.items.map((item) => {
                    const meta = MOOD_META[item.mood];
                    const pct = Math.round(item.percent * 100);
                    return (
                      <View key={item.mood} style={styles.moodPillCol}>
                        <Image source={MOOD_EMOJI_IMAGES[item.mood]} style={styles.moodPillEmoji} resizeMode="contain" />
                        <View
                          style={[
                            styles.moodPillTrack,
                            { backgroundColor: theme.isDark ? 'rgba(255,255,255,0.06)' : 'rgba(0,0,0,0.05)' },
                          ]}
                        >
                          <View
                            style={[
                              styles.moodPillFill,
                              { height: `${pct}%`, backgroundColor: meta.color },
                            ]}
                          >
                            <Text style={styles.moodPillPercent}>{pct}%</Text>
                          </View>
                        </View>
                        <Text style={[styles.moodPillLabel, { color: theme.text }]} numberOfLines={1}>
                          {t(meta.labelKey)}
                        </Text>
                      </View>
                    );
                  })}
                </View>
              </View>
            )}

            {/* 4. Technique Distribution */}
            {techniqueDistribution.items.length > 0 && (
              <View style={[styles.newCard, { backgroundColor: theme.card }]}>
                <Text style={[styles.newCardTitle, { color: theme.text }]}>
                  {t('progress.techniqueBreakdown', { defaultValue: 'Your Practice' })}
                </Text>
                <View style={styles.distBarContainer}>
                  {techniqueDistribution.items.map((item, idx) => (
                    <View
                      key={item.id}
                      style={[
                        styles.distBarSegment,
                        {
                          backgroundColor: item.color,
                          flex: item.count / techniqueDistribution.total,
                          borderTopLeftRadius: idx === 0 ? 8 : 0,
                          borderBottomLeftRadius: idx === 0 ? 8 : 0,
                          borderTopRightRadius: idx === techniqueDistribution.items.length - 1 ? 8 : 0,
                          borderBottomRightRadius: idx === techniqueDistribution.items.length - 1 ? 8 : 0,
                        },
                      ]}
                    />
                  ))}
                </View>
                <View style={styles.distLegend}>
                  {techniqueDistribution.items.map((item) => (
                    <View key={item.id} style={styles.distLegendItem}>
                      <View style={[styles.distLegendDot, { backgroundColor: item.color }]} />
                      <Text style={[styles.distLegendName, { color: theme.text }]} numberOfLines={1}>
                        {item.name}
                      </Text>
                      <Text style={[styles.distLegendCount, { color: theme.textSecondary }]}>
                        {item.count}
                      </Text>
                    </View>
                  ))}
                </View>
              </View>
            )}

            {/* 5. Weekly activity */}
            {sessions.length > 0 && (
              <View style={styles.section}>
                <Text style={[styles.sectionTitle, { color: theme.text }]}>{t('history.weeklyActivity')}</Text>
                <View style={[styles.chartCard, { backgroundColor: theme.card }]}>
                  <View style={styles.weekRow}>
                    {weeklyData.map((day, idx) => {
                      const isToday = idx === 6;
                      const hasActivity = day.count > 0;
                      return (
                        <View key={idx} style={styles.weekDayCol}>
                          <View style={styles.weekDayLetterWrap}>
                            {isToday ? (
                              <View style={[styles.weekDayCircle, { borderColor: theme.primary }]}>
                                <Text style={[styles.weekDayLetter, { color: theme.primary }]}>{day.label}</Text>
                              </View>
                            ) : (
                              <Text style={[styles.weekDayLetter, { color: hasActivity ? theme.text : theme.textSecondary }]}>{day.label}</Text>
                            )}
                          </View>
                          <Ionicons
                            name={hasActivity ? 'flame' : 'flame-outline'}
                            size={18}
                            color={hasActivity ? '#F5A623' : (theme.isDark ? 'rgba(255,255,255,0.15)' : 'rgba(0,0,0,0.12)')}
                          />
                        </View>
                      );
                    })}
                  </View>
                </View>
              </View>
            )}

            {/* 6. Calendar */}
            <Animated.View style={{ opacity: calendarOpacity }}>
              <View style={[styles.calendarCard, { backgroundColor: theme.card }]}>
                <CalendarHeatmap
                  activeDays={activeDays}
                  monthSessionCount={monthSessions}
                  year={year}
                  month={month}
                  onPrevMonth={handlePrevMonth}
                  onNextMonth={handleNextMonth}
                  onDayPress={handleDayPress}
                  selectedDate={selectedDate}
                />
              </View>
            </Animated.View>

            {/* 7. Selected day sessions */}
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
    overflow: 'hidden',
  },
  heroTitle: {
    fontSize: 30,
    fontFamily: FONTS.heavy,
    color: '#FFFFFF',
    letterSpacing: -0.5,
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
  weekRow: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    alignItems: 'center',
    paddingVertical: 8,
  },
  weekDayCol: {
    alignItems: 'center',
    gap: 6,
    flex: 1,
  },
  weekDayLetterWrap: {
    height: 36,
    justifyContent: 'center',
    alignItems: 'center',
  },
  weekDayLetter: {
    fontSize: 16,
    fontFamily: FONTS.bold,
  },
  weekDayCircle: {
    width: 36,
    height: 36,
    borderRadius: 18,
    borderWidth: 2,
    alignItems: 'center',
    justifyContent: 'center',
  },
  weekDayDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
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

  // ── Streak Motivation Banner — same dark-card look as newCard below ──
  streakBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    marginHorizontal: SPACING.lg,
    marginBottom: SPACING.md,
    borderRadius: 20,
    padding: SPACING.lg,
    gap: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.06,
    shadowRadius: 8,
    elevation: 2,
  },
  streakBannerTitle: {
    fontSize: 18,
    fontFamily: FONTS.bold,
    letterSpacing: -0.3,
  },
  streakBannerSub: {
    fontSize: 14,
    fontFamily: FONTS.medium,
    marginTop: 2,
  },
  streakBannerCount: {
    fontSize: 16,
    fontFamily: FONTS.heavy,
  },
  streakIconCircle: {
    width: 44,
    height: 44,
    borderRadius: 22,
    alignItems: 'center',
    justifyContent: 'center',
  },
  streakCountBubble: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 16,
  },

  // ── New Card (shared for new sections) ──
  newCard: {
    marginHorizontal: SPACING.lg,
    marginBottom: SPACING.md,
    borderRadius: 20,
    padding: SPACING.lg,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.06,
    shadowRadius: 8,
    elevation: 2,
  },
  newCardTitle: {
    fontSize: 18,
    fontFamily: FONTS.bold,
    marginBottom: SPACING.sm,
  },

  // ── Last 30 Days Streak Dots ──
  streakDotsRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 6,
    marginTop: 4,
  },
  streakDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  streakDotToday: {
    width: 12,
    height: 12,
    borderRadius: 6,
    borderWidth: 2,
  },

  // ── Technique Distribution ──
  distBarContainer: {
    flexDirection: 'row',
    height: 16,
    borderRadius: 8,
    overflow: 'hidden',
    marginBottom: SPACING.md,
    gap: 2,
  },
  distBarSegment: {
    height: '100%',
  },
  distLegend: {
    gap: 8,
  },
  distLegendItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  distLegendDot: {
    width: 10,
    height: 10,
    borderRadius: 5,
  },
  distLegendName: {
    flex: 1,
    fontSize: 14,
    fontFamily: FONTS.medium,
  },
  distLegendCount: {
    fontSize: 14,
    fontFamily: FONTS.bold,
  },

  // ── Personal Bests ──
  bestsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: SPACING.sm,
  },
  bestItem: {
    width: '48%',
    flexGrow: 1,
    alignItems: 'center',
    gap: 6,
    paddingVertical: SPACING.md,
    borderRadius: 16,
  },
  bestIconBg: {
    marginBottom: 0,
  },
  bestValue: {
    fontSize: 22,
    fontFamily: FONTS.heavy,
    textAlign: 'center',
  },
  bestLabel: {
    fontSize: 11,
    fontFamily: FONTS.medium,
    textAlign: 'center',
  },

  // Mood distribution pills
  moodPillsRow: {
    flexDirection: 'row',
    gap: 24,
    marginTop: 8,
  },
  moodPillCol: {
    alignItems: 'center',
  },
  moodPillEmoji: {
    width: 30,
    height: 30,
    marginBottom: 8,
  },
  moodPillTrack: {
    width: 44,
    height: 150,
    borderRadius: 14,
    overflow: 'hidden',
    justifyContent: 'flex-end',
  },
  moodPillFill: {
    width: '100%',
    minHeight: 28,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'flex-start',
    paddingTop: 8,
  },
  moodPillPercent: {
    fontSize: 12,
    fontFamily: FONTS.bold,
    color: '#FFFFFF',
  },
  moodPillLabel: {
    fontSize: 11,
    fontFamily: FONTS.medium,
    marginTop: 8,
    textAlign: 'center',
  },
});
