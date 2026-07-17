import React, { useMemo, useRef } from 'react';
import { getToday } from '../utils/time';
import { View, Text, TouchableOpacity, Pressable, StyleSheet, PanResponder } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTranslation } from 'react-i18next';
import { COLORS, SPACING, FONT_SIZE, BORDER_RADIUS } from '../constants';
import { useThemeColors } from '../hooks/useColorScheme';
import { useHaptics } from '../hooks/useHaptics';

interface CalendarHeatmapProps {
  activeDays: Set<string>;
  monthSessionCount?: number;
  year: number;
  month: number; // 0-indexed
  onPrevMonth: () => void;
  onNextMonth: () => void;
  onDayPress?: (dateStr: string) => void;
  selectedDate?: string | null;
}


function CalendarHeatmapBase({
  activeDays,
  monthSessionCount,
  year,
  month,
  onPrevMonth,
  onNextMonth,
  onDayPress,
  selectedDate,
}: CalendarHeatmapProps) {
  const { t, i18n } = useTranslation();
  const theme = useThemeColors();
  const haptics = useHaptics();
  const locale = i18n.language;

  const now = new Date();
  const isCurrentMonth = year === now.getFullYear() && month === now.getMonth();

  const panResponder = useRef(
    PanResponder.create({
      onMoveShouldSetPanResponder: (_, gestureState) =>
        Math.abs(gestureState.dx) > 30 && Math.abs(gestureState.dy) < 40,
      onPanResponderRelease: (_, gestureState) => {
        if (gestureState.dx > 50) {
          onPrevMonth();
        } else if (gestureState.dx < -50) {
          onNextMonth();
        }
      },
    }),
  ).current;

  const dayHeaders = useMemo(() => {
    return Array.from({ length: 7 }, (_, i) => {
      const d = new Date(2024, 0, i + 1); // Jan 1, 2024 is Monday
      return d.toLocaleDateString(locale, { weekday: 'narrow' });
    });
  }, [locale]);

  const { weeks, monthName, activeDaysCount } = useMemo(() => {
    const firstDay = new Date(year, month, 1);
    const lastDay = new Date(year, month + 1, 0);
    const daysInMonth = lastDay.getDate();

    // Monday = 0, Sunday = 6
    let startDow = firstDay.getDay() - 1;
    if (startDow < 0) startDow = 6;

    const weeks: (number | null)[][] = [];
    let currentWeek: (number | null)[] = Array(startDow).fill(null);
    let count = 0;

    for (let day = 1; day <= daysInMonth; day++) {
      const dateStr = formatDateStr(year, month, day);
      if (activeDays.has(dateStr)) count++;
      currentWeek.push(day);
      if (currentWeek.length === 7) {
        weeks.push(currentWeek);
        currentWeek = [];
      }
    }
    if (currentWeek.length > 0) {
      while (currentWeek.length < 7) currentWeek.push(null);
      weeks.push(currentWeek);
    }

    const name = new Date(year, month).toLocaleDateString(locale, { month: 'long' });
    return { weeks, monthName: name, activeDaysCount: count };
  }, [year, month, activeDays, locale]);

  const todayStr = getToday();

  return (
    <View style={styles.container}>
      {/* Month header with navigation */}
      <View style={styles.monthHeader}>
        <TouchableOpacity onPress={() => { haptics.light(); onPrevMonth(); }} style={styles.navButton} activeOpacity={0.6}>
          <Text style={[styles.navText, { color: theme.primary }]}>{'\u{2039}'}</Text>
        </TouchableOpacity>
        <View style={styles.monthCenter}>
          <Text style={[styles.monthTitle, { color: theme.text }]}>
            {monthName} {year}
          </Text>
          {(monthSessionCount ?? activeDaysCount) > 0 && (
            <View style={[styles.sessionsBadge, { backgroundColor: `${theme.primary}15` }]}>
              <Text style={[styles.activeDaysCount, { color: theme.primary }]}>
                {t('calendar.sessions', { count: monthSessionCount ?? activeDaysCount })}
              </Text>
            </View>
          )}
        </View>
        <TouchableOpacity
          onPress={() => { if (!isCurrentMonth) haptics.light(); onNextMonth(); }}
          style={styles.navButton}
          disabled={isCurrentMonth}
          activeOpacity={0.6}
        >
          <Text
            style={[
              styles.navText,
              { color: isCurrentMonth ? theme.border : theme.primary },
            ]}
          >
            {'\u{203A}'}
          </Text>
        </TouchableOpacity>
      </View>

      {/* Day labels */}
      <View style={styles.headerRow}>
        {dayHeaders.map((d, i) => (
          <View key={i} style={styles.cell}>
            <Text style={[styles.dayLabel, { color: theme.textSecondary }]}>{d}</Text>
          </View>
        ))}
      </View>

      {/* Calendar grid (swipeable) */}
      <View {...panResponder.panHandlers}>
      {weeks.map((week, wi) => (
        <View key={wi} style={styles.row}>
          {week.map((day, di) => {
            const dateStr = day ? formatDateStr(year, month, day) : '';
            const isActive = day ? activeDays.has(dateStr) : false;
            const isToday = day !== null && dateStr === todayStr;
            const isSelected = day !== null && dateStr === selectedDate;

            return (
              <View key={di} style={styles.cell}>
                {day !== null ? (
                  <Pressable
                    onPress={() => { haptics.selection(); onDayPress?.(dateStr); }}
                    style={styles.dayCellContent}
                  >
                    <View
                      style={[
                        styles.dayCircle,
                        isActive && { backgroundColor: theme.primary, shadowColor: theme.primary, shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.3, shadowRadius: 4, elevation: 3 },
                        isToday && !isActive && { backgroundColor: `${theme.primary}18`, borderWidth: 2, borderColor: theme.primary },
                        isToday && isActive && { borderWidth: 2, borderColor: COLORS.white },
                        isSelected && !isActive && !isToday && { borderWidth: 1.5, borderColor: theme.textSecondary },
                        isSelected && isActive && !isToday && { borderWidth: 2, borderColor: '#04abd0' },
                        isSelected && !isActive && isToday && { borderWidth: 2, borderColor: theme.primary },
                      ]}
                    >
                      <Text
                        style={[
                          styles.dayText,
                          { color: isActive ? COLORS.white : theme.text },
                          isToday && !isActive && { color: theme.primary, fontWeight: '800' as const },
                          isSelected && !isActive && { fontWeight: '700' as const },
                        ]}
                      >
                        {day}
                      </Text>
                    </View>
                    {isActive ? (
                      <Ionicons name="flame" size={10} color={theme.primary} style={styles.dayFlame} />
                    ) : (
                      <View style={styles.dayFlameEmpty} />
                    )}
                  </Pressable>
                ) : (
                  <View style={styles.dayCircle} />
                )}
              </View>
            );
          })}
        </View>
      ))}
      </View>
    </View>
  );
}

// history.tsx already passes stable props (useMemo'd activeDays, useCallback'd
// handlers) — memo lets month-navigation/day-selection state changes in the
// parent skip re-rendering this grid (up to 42 cells with inline styles/closures)
// when none of this component's own props actually changed.
export const CalendarHeatmap = React.memo(CalendarHeatmapBase);

function formatDateStr(year: number, month: number, day: number): string {
  const m = String(month + 1).padStart(2, '0');
  const d = String(day).padStart(2, '0');
  return `${year}-${m}-${d}`;
}

const styles = StyleSheet.create({
  container: {
    paddingHorizontal: SPACING.md,
  },
  monthHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: SPACING.md,
  },
  navButton: {
    width: 44,
    height: 44,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 22,
  },
  navText: {
    fontSize: 32,
    fontWeight: '300',
    marginTop: -2,
  },
  monthCenter: {
    alignItems: 'center',
    gap: SPACING.xs,
  },
  monthTitle: {
    fontSize: FONT_SIZE.lg,
    fontWeight: '700',
  },
  sessionsBadge: {
    paddingHorizontal: SPACING.sm,
    paddingVertical: 2,
    borderRadius: BORDER_RADIUS.full,
  },
  activeDaysCount: {
    fontSize: FONT_SIZE.xs,
    fontWeight: '600',
  },
  headerRow: {
    flexDirection: 'row',
    marginBottom: SPACING.xs,
    paddingBottom: SPACING.xs,
  },
  row: {
    flexDirection: 'row',
  },
  cell: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    height: 48,
  },
  dayLabel: {
    fontSize: FONT_SIZE.xs,
    fontWeight: '600',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  dayCircle: {
    width: 34,
    height: 34,
    borderRadius: 17,
    alignItems: 'center',
    justifyContent: 'center',
  },
  dayText: {
    fontSize: FONT_SIZE.sm,
    fontWeight: '500',
  },
  dayCellContent: {
    alignItems: 'center',
  },
  dayFlame: {
    marginTop: 1,
  },
  dayFlameEmpty: {
    height: 11,
  },
});
