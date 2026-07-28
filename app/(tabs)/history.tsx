import React, { useState, useMemo, useCallback, useRef } from 'react';
import { View, Text, ScrollView, StyleSheet, Animated, RefreshControl, TouchableOpacity, ImageBackground } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { useTranslation } from 'react-i18next';
import { router } from 'expo-router';
import { useSessionsStore, useSettingsStore } from '../../src/store';
import { useThemeColors } from '../../src/hooks/useColorScheme';
import { CalendarHeatmap } from '../../src/components/CalendarHeatmap';
import { ProUpgradeBanner } from '../../src/components/ProUpgradeBanner';
import { getTechniqueById } from '../../src/constants/techniques';
import { formatTime, getToday } from '../../src/utils/time';
import { COLORS, SPACING, FONT_SIZE, BORDER_RADIUS, FONTS } from '../../src/constants';
import type { BreathingSession } from '../../src/types';

// Must match the same constant in awards.tsx and settings.tsx — see the note there.
const HERO_CONTENT_HEIGHT = 100;

const MOOD_EMOJI: Record<string, string> = {
  energized: '\u{1F929}',
  happy: '\u{1F642}',
  calm: '\u{1F610}',
  focused: '\u{1F61E}',
  anxious: '\u{1F62D}',
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

  // Free users: last 7 days only; Pro: all sessions
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

  // Mood scores for graph Y position (higher = better mood)
  const MOOD_SCORE: Record<string, number> = {
    energized: 5, happy: 4, calm: 3, focused: 2, anxious: 1, sleepy: 0,
  };
  const MOOD_GRAPH_HEIGHT = 140;

  // Mood history — last 7 days with mood emoji + score
  const moodHistory = useMemo(() => {
    const today = new Date();
    const days: { label: string; emoji: string | null; score: number | null; dateStr: string }[] = [];
    for (let d = 6; d >= 0; d--) {
      const day = new Date(today.getFullYear(), today.getMonth(), today.getDate() - d);
      const dateStr = `${day.getFullYear()}-${String(day.getMonth() + 1).padStart(2, '0')}-${String(day.getDate()).padStart(2, '0')}`;
      const label = day.toLocaleDateString(i18n.language, { weekday: 'short' }).slice(0, 3).toUpperCase();
      const daySessions = allSessions.filter(s => s.date === dateStr && s.moodAfter);
      let topMood: string | null = null;
      if (daySessions.length > 0) {
        const counts: Record<string, number> = {};
        for (const s of daySessions) {
          if (s.moodAfter) counts[s.moodAfter] = (counts[s.moodAfter] || 0) + 1;
        }
        topMood = Object.entries(counts).sort((a, b) => b[1] - a[1])[0]?.[0] ?? null;
      }
      days.push({
        label,
        emoji: topMood ? MOOD_EMOJI[topMood] ?? null : null,
        score: topMood ? MOOD_SCORE[topMood] ?? null : null,
        dateStr,
      });
    }
    return days;
  }, [allSessions, i18n.language]);

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
        {/* ── Hero header ── */}
        <ImageBackground
          source={require('../../assets/bg_focus.webp')}
          resizeMode="cover"
          style={[styles.heroArea, { paddingTop: insets.top + SPACING.sm, height: insets.top + HERO_CONTENT_HEIGHT }]}
        >
          <LinearGradient
            colors={
              theme.isDark
                ? ['#000000AA', '#00000055', `${theme.background}FF`]
                : ['#00000077', '#00000044', `${theme.background}FF`]
            }
            start={{ x: 0.5, y: 0 }}
            end={{ x: 0.5, y: 1 }}
            style={StyleSheet.absoluteFill}
          />

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
        </ImageBackground>

        {/* All-time stats — floats over the hero/background transition, same
            treatment as the "today" card on the Breathe tab */}
        <View style={styles.heroStatsRow}>
          <View style={styles.heroStat}>
            <Ionicons name="leaf-outline" size={16} color="rgba(255,255,255,0.85)" />
            <Text style={styles.heroStatValue}>{stats.totalSessions}</Text>
            <Text style={styles.heroStatLabel}>{t('home.totalSessions')}</Text>
          </View>
          <View style={styles.heroStatDivider} />
          <View style={styles.heroStat}>
            <Ionicons name="time-outline" size={16} color="#95f5fb" />
            <Text style={styles.heroStatValue}>{stats.totalMinutes}</Text>
            <Text style={styles.heroStatLabel}>{t('home.totalMin')}</Text>
          </View>
          <View style={styles.heroStatDivider} />
          <View style={styles.heroStat}>
            <Ionicons name="flame-outline" size={16} color="#F5A623" />
            <Text style={styles.heroStatValue}>{stats.currentStreak}</Text>
            <Text style={styles.heroStatLabel}>{t('home.streak')}</Text>
          </View>
        </View>

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
            {/* 1. Streak / Motivation Banner */}
            <TouchableOpacity activeOpacity={0.85} onPress={() => router.push('/(tabs)')}>
              {hadSessionToday ? (
                <LinearGradient
                  colors={['#56AB91', '#36D1A0', '#7BC4A8']}
                  start={{ x: 0, y: 0 }}
                  end={{ x: 1, y: 1 }}
                  style={styles.streakBanner}
                >
                  <View style={styles.streakBannerDecoCircle} />
                  <View style={styles.streakBannerDecoCircle2} />
                  <View style={styles.streakBannerLeft}>
                    <View style={styles.streakIconCircle}>
                      <Ionicons name="checkmark" size={22} color="#FFF" />
                    </View>
                  </View>
                  <View style={{ flex: 1 }}>
                    <Text style={styles.streakBannerTitle}>
                      {stats.currentStreak > 1
                        ? t('progress.streakBanner', { count: stats.currentStreak })
                        : t('progress.doneToday', { defaultValue: 'Done for today!' })}
                    </Text>
                    <Text style={styles.streakBannerSub}>
                      {stats.longestStreak > stats.currentStreak
                        ? t('progress.bestStreakWas', { count: stats.longestStreak })
                        : t('progress.streakNewRecord', { defaultValue: 'New personal record!' })}
                    </Text>
                  </View>
                  {stats.currentStreak > 0 && (
                    <View style={styles.streakCountBubble}>
                      <Ionicons name="flame" size={16} color="#FFF" />
                      <Text style={styles.streakBannerCount}>{stats.currentStreak}</Text>
                    </View>
                  )}
                </LinearGradient>
              ) : (
                <LinearGradient
                  colors={['#F7971E', '#F5A623', '#E85D4A']}
                  start={{ x: 0, y: 0 }}
                  end={{ x: 1, y: 1 }}
                  style={styles.streakBanner}
                >
                  <View style={styles.streakBannerDecoCircle} />
                  <View style={styles.streakBannerDecoCircle2} />
                  <View style={styles.streakBannerLeft}>
                    <View style={styles.streakIconCircle}>
                      <Ionicons name="flame" size={22} color="#FFF" />
                    </View>
                  </View>
                  <View style={{ flex: 1 }}>
                    <Text style={styles.streakBannerTitle}>
                      {stats.currentStreak > 0
                        ? t('progress.streakBanner', { count: stats.currentStreak })
                        : t('progress.startStreak', { defaultValue: 'Start your streak today!' })}
                    </Text>
                    <Text style={styles.streakBannerSub}>
                      {t('progress.streakKeepGoing', { defaultValue: 'Keep your streak alive!' })}
                    </Text>
                  </View>
                  <Ionicons name="chevron-forward" size={22} color="rgba(255,255,255,0.7)" />
                </LinearGradient>
              )}
            </TouchableOpacity>

            {/* 2. Weekly activity */}
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

            {/* 3. Calendar */}
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

            {/* 4. Selected day sessions */}
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

            {/* 5. Technique Distribution (Pro only) */}
            {isPro && techniqueDistribution.items.length > 0 && (
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

            {/* 6. Personal Bests */}
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

            {/* Mood History — graph style (Pro only) */}
            {isPro && moodHistory.some(d => d.emoji) && (
              <View style={[styles.newCard, { backgroundColor: theme.card }]}>
                <Text style={[styles.newCardTitle, { color: theme.text }]}>
                  {t('progress.moodHistory', { defaultValue: 'Your Mood' })}
                </Text>
                <View style={styles.moodGraphContainer}>
                  <View style={{ flexDirection: 'row' }}>
                  {/* Y-axis emoji scale */}
                  <View style={styles.moodYAxis}>
                    <Text style={styles.moodYEmoji}>{MOOD_EMOJI.energized}</Text>
                    <Text style={styles.moodYEmoji}>{MOOD_EMOJI.happy}</Text>
                    <Text style={styles.moodYEmoji}>{MOOD_EMOJI.calm}</Text>
                    <Text style={styles.moodYEmoji}>{MOOD_EMOJI.focused}</Text>
                    <Text style={styles.moodYEmoji}>{MOOD_EMOJI.anxious}</Text>
                    <Text style={styles.moodYEmoji}>{MOOD_EMOJI.sleepy}</Text>
                  </View>
                  {/* Graph area */}
                  <View style={[styles.moodGraphArea, { flex: 1 }]}>
                    {/* Horizontal grid lines */}
                    {[0, 1, 2, 3, 4].map(i => (
                      <View key={i} style={[styles.moodGridLine, {
                        bottom: (i + 0.5) * (MOOD_GRAPH_HEIGHT / 5),
                        backgroundColor: theme.isDark ? 'rgba(255,255,255,0.05)' : 'rgba(0,0,0,0.04)',
                      }]} />
                    ))}
                    {/* Mood emoji dots */}
                    {moodHistory.map((day, idx) => {
                      const colW = 100 / 7;
                      const x = idx * colW + colW / 2;
                      const padding = 16;
                      const graphH = MOOD_GRAPH_HEIGHT - padding * 2;
                      const y = day.score != null
                        ? padding + graphH - (day.score / 5) * graphH - 14
                        : MOOD_GRAPH_HEIGHT / 2 - 6;
                      return day.emoji ? (
                        <View key={`dot-${idx}`} style={{
                          position: 'absolute',
                          left: `${x - 5}%`,
                          top: y,
                        }}>
                          <Text style={{ fontSize: 28 }}>{day.emoji}</Text>
                        </View>
                      ) : (
                        <View key={`dot-${idx}`} style={{
                          position: 'absolute',
                          left: `${x - 1.5}%`,
                          top: MOOD_GRAPH_HEIGHT / 2 - 6,
                          width: 12,
                          height: 12,
                          borderRadius: 6,
                          borderWidth: 2,
                          borderColor: theme.isDark ? 'rgba(255,255,255,0.15)' : 'rgba(0,0,0,0.1)',
                          backgroundColor: theme.isDark ? 'rgba(255,255,255,0.05)' : 'rgba(0,0,0,0.03)',
                        }} />
                      );
                    })}
                  </View>
                  </View>
                  {/* Day labels */}
                  <View style={[styles.moodGraphLabels, { marginLeft: 30 }]}>
                    {moodHistory.map((day, idx) => (
                      <Text key={idx} style={[styles.moodGraphLabel, {
                        color: idx === 6 ? theme.primary : theme.textSecondary,
                        fontFamily: idx === 6 ? FONTS.bold : FONTS.medium,
                      }]}>{day.label}</Text>
                    ))}
                  </View>
                </View>
              </View>
            )}

            {/* All-time stats */}
            {!isPro && sessions.length > 0 && (
              <ProUpgradeBanner />
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
  heroTitleRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 20,
  },
  heroTitle: {
    fontSize: 30,
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
    backgroundColor: 'rgba(0,0,0,0.3)',
    borderRadius: 20,
    paddingVertical: 16,
    paddingHorizontal: 8,
    marginHorizontal: SPACING.lg,
    marginTop: -24,
    marginBottom: SPACING.md,
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

  // ── Streak Motivation Banner ──
  streakBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    marginHorizontal: SPACING.lg,
    marginBottom: SPACING.md,
    borderRadius: 20,
    padding: SPACING.lg,
    gap: 12,
    overflow: 'hidden',
    shadowColor: '#E85D4A',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.25,
    shadowRadius: 12,
    elevation: 4,
  },
  streakBannerEmoji: {
    fontSize: 32,
  },
  streakBannerTitle: {
    fontSize: 20,
    fontFamily: FONTS.heavy,
    color: '#FFFFFF',
    letterSpacing: -0.3,
  },
  streakBannerSub: {
    fontSize: 14,
    fontFamily: FONTS.medium,
    color: 'rgba(255,255,255,0.85)',
    marginTop: 2,
  },
  streakBannerCount: {
    fontSize: 18,
    fontFamily: FONTS.heavy,
    color: '#FFFFFF',
  },
  streakBannerDecoCircle: {
    position: 'absolute',
    top: -30,
    right: -20,
    width: 100,
    height: 100,
    borderRadius: 50,
    backgroundColor: 'rgba(255,255,255,0.1)',
  },
  streakBannerDecoCircle2: {
    position: 'absolute',
    bottom: -20,
    left: -15,
    width: 70,
    height: 70,
    borderRadius: 35,
    backgroundColor: 'rgba(255,255,255,0.08)',
  },
  streakBannerLeft: {
    marginRight: 4,
  },
  streakIconCircle: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: 'rgba(255,255,255,0.25)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  streakCountBubble: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: 'rgba(255,255,255,0.2)',
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

  // Mood Graph
  moodGraphContainer: {
    marginTop: 4,
  },
  moodYAxis: {
    width: 30,
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 8,
  },
  moodYEmoji: {
    fontSize: 14,
  },
  moodGraphArea: {
    height: 140,
    position: 'relative',
  },
  moodGridLine: {
    position: 'absolute',
    left: 0,
    right: 0,
    height: 1,
  },
  moodGraphLabels: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    marginTop: 8,
  },
  moodGraphLabel: {
    fontSize: 11,
    flex: 1,
    textAlign: 'center',
  },
});
